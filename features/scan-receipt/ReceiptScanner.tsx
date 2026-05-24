import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, AlertCircle, Flashlight, FlashlightOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { scan, classify } from '@/lib/api';
import { useScanStore } from '@/lib/scan-store';

export interface EnrichedItem {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
  selected: boolean;
  category_name: string | null;
  category_id: string | null;
  zone_name: string | null;
  zone_type_id: string | null;
  expiry_date: string | null;
  photo_uri: string | null;
  isClassifying: boolean;
}

export function formatDaysLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (days <= 0) return 'просрочен';
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дн.`;
}

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

function expiryFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d.toISOString().split('T')[0];
}

export function ReceiptScanner({ onDone, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { setPending, updateItem, shouldClose, clear } = useScanStore();

  const [processing, setProcessing] = useState(false);
  const [torch, setTorch] = useState(false);

  // when receipt-confirm signals done, close this modal too
  useEffect(() => {
    if (shouldClose) {
      clear();
      onDone();
    }
  }, [shouldClose, clear, onDone]);

  const classifyItemAt = useCallback(async (name: string, idx: number) => {
    try {
      const result = await classify.product(name);
      const days = result.expiry_days > 0 ? result.expiry_days : 7;
      updateItem(idx, {
        category_name: result.category,
        category_id: result.category_id,
        zone_name: result.zone_name,
        zone_type_id: result.zone_type_id,
        expiry_date: expiryFromDays(days),
        isClassifying: false,
      });
    } catch {
      updateItem(idx, { isClassifying: false });
    }
  }, [updateItem]);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (!photo?.base64) throw new Error('no photo');
      const result = await scan.receipt(photo.base64);
      if (!result.items.length) {
        setProcessing(false);
        Alert.alert('Не распознано', 'Попробуйте сфотографировать чётче');
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
        photo_uri: null,
        isClassifying: true,
      }));
      setPending(enriched, result.purchase_date);
      setProcessing(false); // reset before navigation so camera shows if user goes back
      router.push('/(modal)/receipt-confirm');
      // classify runs in background, updates store which receipt-confirm reads live
      enriched.forEach((item, idx) => classifyItemAt(item.name, idx));
    } catch {
      setProcessing(false);
      Alert.alert('Ошибка', 'Не удалось обработать фото');
    }
  }, [classifyItemAt, setPending]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <AlertCircle size={48} color="#6366F1" strokeWidth={1.5} />
        <Text className="text-center text-lg font-semibold text-foreground">
          Нужен доступ к камере
        </Text>
        <Pressable onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Разрешить доступ</Text>
        </Pressable>
        <Pressable onPress={onCancel}>
          <Text className="text-sm text-muted-foreground">Отмена</Text>
        </Pressable>
      </View>
    );
  }

  if (processing) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ color: '#6366F1', fontSize: 15, fontWeight: '600' }}>Читаем чек...</Text>
      </View>
    );
  }

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
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
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

const styles = StyleSheet.create({
  permBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
