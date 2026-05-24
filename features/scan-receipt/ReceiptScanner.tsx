import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, AlertCircle, Trash2, Check, ChevronDown, Flashlight, FlashlightOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scan, inventory, classify } from '@/lib/api';
import { useFridgeStore } from '@/lib/fridge-store';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface EnrichedItem {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
  selected: boolean;
  // заполняется classify в фоне
  category_name: string | null;
  category_id: string | null;
  zone_name: string | null;
  zone_type_id: string | null;
  expiry_date: string | null;
  isClassifying: boolean;
}

type Phase = 'camera' | 'processing' | 'confirm';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

function expiryFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d.toISOString().split('T')[0];
}

function formatDaysLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (days <= 0) return 'просрочен';
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дн.`;
}

const QUICK_DAYS = [
  { label: '+2 дня',  days: 2 },
  { label: '+5 дней', days: 5 },
  { label: '+1 нед.', days: 7 },
];

export function ReceiptScanner({ onDone, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const qc = useQueryClient();
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);

  const [phase, setPhase] = useState<Phase>('camera');
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [expandedExpiry, setExpandedExpiry] = useState<number | null>(null);
  const [torch, setTorch] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (selected: EnrichedItem[]) => {
      if (!activeFridgeId) throw new Error('no fridge');
      await Promise.all(
        selected.map((item) =>
          inventory.create({
            fridge_id: activeFridgeId,
            name: item.name,
            quantity: item.quantity,
            category_id: item.category_id ?? undefined,
            zone_type_id: item.zone_type_id ?? undefined,
            expiry_date: item.expiry_date ?? undefined,
          })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', activeFridgeId] });
      qc.invalidateQueries({ queryKey: ['expiring'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone();
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось сохранить товары'),
  });

  // classify одного товара, обновляет items[idx] когда ответ готов
  const classifyItemAt = useCallback(async (name: string, idx: number) => {
    try {
      const result = await classify.product(name);
      const days = result.expiry_days > 0 ? result.expiry_days : 7;
      setItems(prev => prev.map((it, i) =>
        i !== idx ? it : {
          ...it,
          category_name: result.category,
          category_id: result.category_id,
          zone_name: result.zone_name,
          zone_type_id: result.zone_type_id,
          expiry_date: expiryFromDays(days),
          isClassifying: false,
        }
      ));
    } catch {
      setItems(prev => prev.map((it, i) =>
        i !== idx ? it : { ...it, isClassifying: false }
      ));
    }
  }, []);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('processing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (!photo?.base64) throw new Error('no photo');
      const result = await scan.receipt(photo.base64);
      if (!result.items.length) {
        Alert.alert('Не распознано', 'Попробуйте сфотографировать чётче', [
          { text: 'Повторить', onPress: () => setPhase('camera') },
        ]);
        return;
      }
      const enriched: EnrichedItem[] = result.items.map(i => ({
        ...i,
        selected: true,
        category_name: null,
        category_id: null,
        zone_name: null,
        zone_type_id: null,
        expiry_date: null,
        isClassifying: true,
      }));
      setItems(enriched);
      setPurchaseDate(result.purchase_date);
      setPhase('confirm');
      // запускаем все classify параллельно, каждый апдейтит свою строку
      enriched.forEach((item, idx) => classifyItemAt(item.name, idx));
    } catch {
      Alert.alert('Ошибка', 'Не удалось обработать фото', [
        { text: 'Повторить', onPress: () => setPhase('camera') },
      ]);
    }
  }, [classifyItemAt]);

  const toggleItem = useCallback((idx: number) => {
    setItems(prev => prev.map((it, i) =>
      i !== idx ? it : { ...it, selected: !it.selected }
    ));
  }, []);

  const adjustExpiry = useCallback((idx: number, addDays: number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx || !it.expiry_date) return it;
      const d = new Date(it.expiry_date + 'T12:00:00');
      d.setDate(d.getDate() + addDays);
      return { ...it, expiry_date: d.toISOString().split('T')[0] };
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSave = useCallback(() => {
    const selected = items.filter(i => i.selected);
    if (!selected.length) {
      Alert.alert('Ничего не выбрано', 'Отметьте хотя бы один товар');
      return;
    }
    saveMutation.mutate(selected);
  }, [items, saveMutation]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <AlertCircle size={48} color="#10b981" strokeWidth={1.5} />
        <Text className="text-center text-lg font-semibold text-foreground">
          Нужен доступ к камере
        </Text>
        <Button variant="primary" onPress={requestPermission}>Разрешить доступ</Button>
        <Pressable onPress={onCancel}>
          <Text className="text-sm text-muted-foreground">Отмена</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'processing') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-base text-muted-foreground">Читаем чек...</Text>
      </View>
    );
  }

  if (phase === 'confirm') {
    const selectedCount = items.filter(i => i.selected).length;
    const classifyingCount = items.filter(i => i.isClassifying).length;

    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border px-4 pb-3 pt-14">
          <Text className="text-lg font-bold text-foreground">Товары из чека</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            {purchaseDate && (
              <Text className="text-xs text-muted-foreground">Дата покупки: {purchaseDate}</Text>
            )}
            {classifyingCount > 0 && (
              <Text className="text-xs text-muted-foreground">
                · Определяем категории...
              </Text>
            )}
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-2 px-4 py-3">
            {items.map((item, idx) => {
              const expiryOpen = expandedExpiry === idx;
              return (
                <View key={idx} className="overflow-hidden rounded-2xl border border-border">
                  <Pressable
                    onPress={() => toggleItem(idx)}
                    className={`px-4 py-3 ${item.selected ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-card'}`}
                  >
                    <View className="flex-row items-start gap-3">
                      {/* чекбокс */}
                      <View className={`mt-0.5 h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                        item.selected ? 'border-accent bg-accent' : 'border-border'
                      }`}>
                        {item.selected && <Check size={11} color="white" strokeWidth={3} />}
                      </View>

                      <View className="flex-1 gap-1.5">
                        {/* название + корзина */}
                        <View className="flex-row items-start justify-between">
                          <Text className="flex-1 pr-2 text-sm font-medium text-foreground">
                            {item.name}
                          </Text>
                          <Pressable
                            onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                            hitSlop={10}
                          >
                            <Trash2 size={14} color="#a1a1aa" strokeWidth={1.5} />
                          </Pressable>
                        </View>

                        {/* мета-пиллы */}
                        <View className="flex-row flex-wrap items-center gap-1.5">
                          <Text className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit}
                          </Text>
                          {item.isClassifying ? (
                            <>
                              <Skeleton className="h-4 w-16 rounded-full" />
                              <Skeleton className="h-4 w-20 rounded-full" />
                            </>
                          ) : (
                            <>
                              {item.category_name && (
                                <View className="rounded-full bg-muted px-2 py-0.5">
                                  <Text className="text-xs text-muted-foreground">
                                    {item.category_name}
                                  </Text>
                                </View>
                              )}
                              {item.zone_name && (
                                <View className="rounded-full bg-muted px-2 py-0.5">
                                  <Text className="text-xs text-muted-foreground">
                                    {item.zone_name}
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                        </View>

                        {/* срок годности — тап открывает корректировку */}
                        {item.isClassifying ? (
                          <Skeleton className="h-5 w-16 rounded-full" />
                        ) : item.expiry_date ? (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              setExpandedExpiry(expiryOpen ? null : idx);
                            }}
                            className="flex-row items-center gap-1 self-start active:opacity-70"
                          >
                            <View className="rounded-full bg-accent/10 px-2.5 py-0.5">
                              <Text className="text-xs font-semibold text-accent">
                                {formatDaysLabel(item.expiry_date)}
                              </Text>
                            </View>
                            <ChevronDown
                              size={12}
                              color="#10b981"
                              strokeWidth={2.5}
                              style={{ transform: [{ rotate: expiryOpen ? '180deg' : '0deg' }] }}
                            />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>

                    {/* быстрые кнопки корректировки срока */}
                    {expiryOpen && item.expiry_date && (
                      <View className="mt-3 flex-row gap-2 pl-8">
                        {QUICK_DAYS.map(btn => (
                          <Pressable
                            key={btn.days}
                            onPress={(e) => {
                              e.stopPropagation();
                              adjustExpiry(idx, btn.days);
                            }}
                            className="active:opacity-70 flex-1 items-center rounded-xl border border-border bg-background py-1.5"
                          >
                            <Text className="text-xs font-medium text-muted-foreground">
                              {btn.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View className="gap-3 border-t border-border px-4 py-4 pb-8">
          <Button
            variant="primary"
            size="lg"
            isLoading={saveMutation.isPending}
            onPress={handleSave}
          >
            {`Добавить ${selectedCount} товар${selectedCount === 1 ? '' : selectedCount < 5 ? 'а' : 'ов'}`}
          </Button>
          <Button variant="outline" size="lg" onPress={() => setPhase('camera')}>
            Сканировать снова
          </Button>
        </View>
      </View>
    );
  }

  // камера
  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" enableTorch={torch} />

      <View className="absolute inset-x-0 top-14 items-center">
        <View className="rounded-2xl bg-black/60 px-4 py-2">
          <Text className="text-sm font-medium text-white">
            Наведите на чек и нажмите кнопку
          </Text>
        </View>
      </View>

      <View className="absolute inset-x-8 top-32 h-64 rounded-2xl border-2 border-white/40" />

      {/* фонарик */}
      <Pressable
        onPress={() => setTorch((v) => !v)}
        className="absolute left-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-black/50"
        accessibilityRole="button"
        accessibilityLabel={torch ? 'Выключить фонарик' : 'Включить фонарик'}
      >
        {torch
          ? <Flashlight size={20} color="#fbbf24" strokeWidth={1.5} />
          : <FlashlightOff size={20} color="white" strokeWidth={1.5} />
        }
      </Pressable>

      <Pressable
        onPress={onCancel}
        className="absolute right-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-black/50"
      >
        <Text className="text-sm font-bold text-white">✕</Text>
      </Pressable>

      <View className="absolute inset-x-0 bottom-12 items-center">
        <Pressable
          onPress={capture}
          className="active:opacity-80 h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10"
          accessibilityRole="button"
          accessibilityLabel="Сфотографировать чек"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <Camera size={24} color="#111827" strokeWidth={1.5} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
