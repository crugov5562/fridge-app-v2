import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, X, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TwoFrameScanner } from '@/features/scan-photo';
import { inventory, catalog, classify, type ScanPhotoResponse, type ClassifyProductResponse } from '@/lib/api';
import { useFridgeStore } from '@/lib/fridge-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Phase = 'scanning' | 'confirming';
type Ripeness = 'green' | 'ripe' | 'overripe';

const RIPENESS_CHIPS: { id: Ripeness; label: string; dot: string; multiplier: number }[] = [
  { id: 'green',    label: 'Зеленый',    dot: '#A3E635', multiplier: 2.0  },
  { id: 'ripe',     label: 'Спелый',     dot: '#F59E0B', multiplier: 1.0  },
  { id: 'overripe', label: 'Перезрелый', dot: '#F97316', multiplier: 0.35 },
];

function expiryFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d.toISOString().split('T')[0];
}

export default function ScanPhotoModal() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);

  const [phase, setPhase] = useState<Phase>('scanning');
  const [scanResult, setScanResult] = useState<ScanPhotoResponse | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedExpiry, setEditedExpiry] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState<string | undefined>(undefined);
  const [classifyResult, setClassifyResult] = useState<ClassifyProductResponse | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [ripeness, setRipeness] = useState<Ripeness | null>(null);

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: catalog.units,
    staleTime: Infinity,
  });

  const baseDays = classifyResult?.expiry_days ?? 7;

  const applyRipeness = useCallback((r: Ripeness, base: number) => {
    const chip = RIPENESS_CHIPS.find(c => c.id === r)!;
    const days = Math.max(1, Math.round(base * chip.multiplier));
    setEditedExpiry(expiryFromDays(days));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    if (classifyResult?.expiry_days && ripeness) {
      applyRipeness(ripeness, classifyResult.expiry_days);
    }
  }, [classifyResult]);

  // автоклассификация с debounce
  useEffect(() => {
    if (phase !== 'confirming') return;
    const name = editedName.trim();
    if (name.length < 2) {
      setClassifyResult(null);
      return;
    }
    if (scanResult?.category_id && editedName === scanResult.name) return;

    const timer = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const result = await classify.product(name);
        setClassifyResult(result);
        if (result.expiry_days > 0 && scanResult?.expiry_auto && !ripeness) {
          setEditedExpiry(expiryFromDays(result.expiry_days));
        }
        if (!unitId && result.unit_suggestion && units) {
          const u = units.find(u => u.abbreviation.toLowerCase() === result.unit_suggestion!.toLowerCase());
          if (u) setUnitId(u.id);
        }
      } catch {
        // silent
      } finally {
        setIsClassifying(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [editedName, phase]);

  const saveMutation = useMutation({
    mutationFn: inventory.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', activeFridgeId] });
      qc.invalidateQueries({ queryKey: ['expiring'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Alert.alert('Ошибка', 'Не удалось сохранить продукт');
    },
  });

  const handleScanResult = useCallback((data: ScanPhotoResponse) => {
    setScanResult(data);
    setEditedName(data.name);
    setEditedExpiry(data.expiry_date ?? '');
    if (data.quantity) setQuantity(String(data.quantity));
    if (data.unit_suggestion && units) {
      const matched = units.find(u => u.abbreviation === data.unit_suggestion);
      if (matched) setUnitId(matched.id);
    }
    setPhase('confirming');
  }, [units]);

  const handleSave = useCallback(() => {
    if (!activeFridgeId) {
      Alert.alert('Ошибка', 'Холодильник не выбран');
      return;
    }
    if (!editedName.trim()) {
      Alert.alert('Ошибка', 'Введите название продукта');
      return;
    }
    const categoryId  = classifyResult?.category_id  ?? scanResult?.category_id  ?? undefined;
    const zoneTypeId  = classifyResult?.zone_type_id ?? scanResult?.zone_type_id ?? undefined;
    const qty = parseFloat(quantity);
    saveMutation.mutate({
      fridge_id: activeFridgeId,
      name: editedName.trim(),
      category_id: categoryId,
      zone_type_id: zoneTypeId,
      expiry_date: editedExpiry || undefined,
      photo_url: scanResult?.photo_url ?? undefined,
      quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
      unit_id: unitId,
    });
  }, [activeFridgeId, editedName, editedExpiry, quantity, unitId, scanResult, classifyResult, saveMutation]);

  const adjustExpiry = useCallback((days: number) => {
    const base = editedExpiry ? new Date(editedExpiry + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + days);
    setEditedExpiry(base.toISOString().split('T')[0]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [editedExpiry]);

  if (phase === 'scanning') {
    return (
      <TwoFrameScanner
        onResult={handleScanResult}
        onCancel={() => router.back()}
      />
    );
  }

  const displayZoneName   = classifyResult?.zone_name   ?? scanResult?.zone_name;
  const displayStorageTip = classifyResult?.storage_tip ?? scanResult?.storage_tip;
  const isAutoExpiry      = !!scanResult?.expiry_auto;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        className="flex-row items-center justify-between border-b border-border px-4 py-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-lg font-bold text-foreground">Подтвердите продукт</Text>
        <Pressable
          onPress={() => router.back()}
          className="active:opacity-60 h-9 w-9 items-center justify-center rounded-full bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        >
          <X size={18} color="#71717A" strokeWidth={2} />
        </Pressable>
      </View>

      <View className="gap-4 px-4 py-5">
        {scanResult?.photo_url && (
          <Image
            source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}${scanResult.photo_url}` }}
            className="h-48 w-full rounded-2xl"
            resizeMode="cover"
          />
        )}

        {/* статус распознавания */}
        {!editedName.trim() ? (
          <View className="flex-row items-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
            <AlertCircle size={16} color="#6366F1" strokeWidth={2} />
            <Text className="flex-1 text-sm text-accent">
              Введите название — категория и срок заполнятся автоматически
            </Text>
          </View>
        ) : (
          <View
            className={`flex-row items-center gap-2 rounded-2xl border px-4 py-3 ${
              scanResult?.confidence && scanResult.confidence >= 0.7
                ? 'border-border bg-card'
                : 'border-warning bg-warning/10'
            }`}
          >
            {isClassifying ? (
              <AlertCircle size={16} color="#71717A" strokeWidth={2} />
            ) : scanResult?.confidence && scanResult.confidence >= 0.7 ? (
              <CheckCircle2 size={16} color="#6366F1" strokeWidth={2} />
            ) : (
              <AlertCircle size={16} color="#f59e0b" strokeWidth={2} />
            )}
            <Text className="text-sm text-muted-foreground">
              {isClassifying
                ? 'Определяем категорию...'
                : scanResult?.confidence && scanResult.confidence >= 0.7
                  ? 'Продукт распознан успешно'
                  : 'Проверьте данные — уверенность низкая'}
            </Text>
          </View>
        )}

        <Input
          label="Название"
          value={editedName}
          onChangeText={setEditedName}
          autoFocus
          placeholder="Введите название продукта"
        />

        {/* зона хранения */}
        {displayZoneName && (
          <View className="flex-row items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-[#EDEFFD]">
              <MapPin size={16} color="#6366F1" strokeWidth={1.5} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Рекомендуемая зона</Text>
              <Text className="text-sm text-accent">{displayZoneName}</Text>
              {!!displayStorageTip && (
                <Text className="mt-0.5 text-xs text-muted-foreground">{displayStorageTip}</Text>
              )}
            </View>
          </View>
        )}

        {scanResult?.brand && (
          <View className="rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="text-xs font-medium text-muted-foreground">Бренд</Text>
            <Text className="mt-0.5 text-sm text-foreground">{scanResult.brand}</Text>
          </View>
        )}

        {scanResult?.category && (
          <View className="rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="text-xs font-medium text-muted-foreground">Категория</Text>
            <Text className="mt-0.5 text-sm text-foreground">{scanResult.category}</Text>
          </View>
        )}

        {/* количество + единица */}
        <View className="flex-row gap-3">
          <View className="w-24">
            <Input
              label="Кол-во"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-medium text-foreground">Единица</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {units?.map((u) => {
                  const active = unitId === u.id;
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => setUnitId(active ? undefined : u.id)}
                      className={`active:opacity-70 rounded-full border px-3 py-2 ${
                        active ? 'border-accent bg-accent' : 'border-border bg-card'
                      }`}
                      accessibilityRole="button"
                    >
                      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-muted-foreground'}`}>
                        {u.abbreviation}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* срок годности */}
        {isAutoExpiry ? (
          <View className="gap-3">
            <Text className="text-sm font-medium text-foreground">Срок годности</Text>

            {/* чипы спелости */}
            <View className="flex-row gap-2">
              {RIPENESS_CHIPS.map((chip) => {
                const active = ripeness === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => {
                      setRipeness(chip.id);
                      applyRipeness(chip.id, baseDays);
                    }}
                    className={`active:opacity-70 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border py-3 ${
                      active ? 'border-accent bg-accent/10' : 'border-border bg-card'
                    }`}
                    accessibilityRole="button"
                  >
                    <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chip.dot }} />
                    <Text className={`text-sm font-medium ${active ? 'text-accent' : 'text-muted-foreground'}`}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* поле даты + быстрые кнопки */}
            {ripeness ? (
              <View className="gap-2 rounded-2xl border border-border bg-card px-4 py-3">
                <Input
                  label="Годен до (ГГГГ-ММ-ДД)"
                  value={editedExpiry}
                  onChangeText={setEditedExpiry}
                  placeholder="ГГГГ-ММ-ДД"
                  keyboardType="numbers-and-punctuation"
                  hint="Можно скорректировать вручную"
                />
                <View className="flex-row gap-2 pt-1">
                  {[
                    { label: '+2 дня',  days: 2 },
                    { label: '+5 дней', days: 5 },
                    { label: '+1 нед.', days: 7 },
                  ].map((btn) => (
                    <Pressable
                      key={btn.days}
                      onPress={() => adjustExpiry(btn.days)}
                      className="active:opacity-70 flex-1 items-center rounded-xl border border-border bg-background py-2"
                    >
                      <Text className="text-xs font-medium text-muted-foreground">{btn.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <Text className="text-xs text-muted-foreground">
                Выберите состояние — срок подставится автоматически
              </Text>
            )}
          </View>
        ) : (
          <Input
            label="Срок годности (ГГГГ-ММ-ДД)"
            value={editedExpiry}
            onChangeText={setEditedExpiry}
            placeholder="2025-12-31"
            keyboardType="numbers-and-punctuation"
          />
        )}

        <View className="mt-2 gap-3">
          <Button
            variant="primary"
            size="lg"
            isLoading={saveMutation.isPending}
            onPress={handleSave}
          >
            Сохранить
          </Button>
          <Button
            variant="outline"
            size="lg"
            onPress={() => setPhase('scanning')}
          >
            Сканировать снова
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
