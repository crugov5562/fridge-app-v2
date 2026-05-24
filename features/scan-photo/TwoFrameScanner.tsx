import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, RefreshCw, AlertCircle, CalendarClock, ChevronRight, Flashlight, FlashlightOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { scan, type ScanPhotoResponse } from '@/lib/api';

type Step = 'front' | 'choice' | 'label' | 'processing' | 'error';

interface Props {
  onResult: (data: ScanPhotoResponse) => void;
  onCancel: () => void;
}

export function TwoFrameScanner({ onResult, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [step, setStep] = useState<Step>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [torch, setTorch] = useState(false);

  const submit = useCallback(async (labelBase64: string) => {
    setStep('processing');
    try {
      const result = await scan.photo(frontBase64!, labelBase64);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onResult(result);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('Не удалось распознать продукт. Попробуйте ещё раз.');
      setStep('error');
    }
  }, [frontBase64, onResult]);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
    if (!photo) return;

    if (step === 'front') {
      setFrontUri(photo.uri);
      setFrontBase64(photo.base64 ?? '');
      setStep('choice');
    } else if (step === 'label') {
      await submit(photo.base64 ?? '');
    }
  }, [step, submit]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <AlertCircle size={48} color="#10b981" strokeWidth={1.5} />
        <Text className="text-center text-lg font-semibold text-foreground">
          Нужен доступ к камере
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Разрешите доступ, чтобы сканировать продукты
        </Text>
        <Button variant="primary" onPress={requestPermission}>
          Разрешить доступ
        </Button>
        <Pressable onPress={onCancel}>
          <Text className="text-sm text-muted-foreground">Отмена</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'processing') {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-base text-muted-foreground">Анализируем продукт...</Text>
      </View>
    );
  }

  if (step === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <AlertCircle size={48} color="#ef4444" strokeWidth={1.5} />
        <Text className="text-center text-base font-semibold text-foreground">
          {errorMessage}
        </Text>
        <Button
          variant="primary"
          onPress={() => {
            setStep('front');
            setFrontUri(null);
            setFrontBase64(null);
          }}
        >
          Начать заново
        </Button>
        <Pressable onPress={onCancel}>
          <Text className="text-sm text-muted-foreground">Отмена</Text>
        </Pressable>
      </View>
    );
  }

  // выбор после первого фото
  if (step === 'choice' && frontUri) {
    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: frontUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

        {/* закрыть */}
        <Pressable
          onPress={onCancel}
          className="absolute right-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-black/50"
        >
          <Text className="text-sm font-bold text-white">✕</Text>
        </Pressable>

        {/* тёмный блок снизу с кнопками */}
        <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-black/85 px-6 pb-12 pt-8">
          <Text className="mb-1 text-center text-xl font-bold text-white">Фото готово</Text>
          <Text className="mb-8 text-center text-sm text-white/60">
            Есть этикетка с датой годности?
          </Text>

          <View className="gap-3">
            <Pressable
              onPress={() => setStep('label')}
              className="active:opacity-75 flex-row items-center justify-center gap-3 rounded-2xl bg-accent py-4"
            >
              <CalendarClock size={22} color="white" strokeWidth={1.5} />
              <Text className="text-base font-bold text-white">Добавить срок годности</Text>
            </Pressable>

            <Pressable
              onPress={() => submit('')}
              className="active:opacity-75 flex-row items-center justify-center gap-3 rounded-2xl border border-white/25 bg-white/10 py-4"
            >
              <ChevronRight size={22} color="white" strokeWidth={2} />
              <Text className="text-base font-semibold text-white">Продолжить</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setStep('front')} className="mt-5 items-center">
            <View className="flex-row items-center gap-1.5">
              <RefreshCw size={13} color="rgba(255,255,255,0.4)" strokeWidth={2} />
              <Text className="text-sm text-white/40">Переснять</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  // камера (первое фото или этикетка)
  const isLabel = step === 'label';

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" enableTorch={torch} />

      <View className="absolute inset-x-0 top-14 items-center">
        <View className="rounded-2xl bg-black/60 px-4 py-2">
          <Text className="text-sm font-medium text-white">
            {isLabel ? 'Наведите на дату годности' : 'Наведите на продукт'}
          </Text>
        </View>
      </View>

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

      <View className="absolute inset-x-0 bottom-12 items-center gap-4">
        {isLabel && (
          <Pressable onPress={() => submit('')}>
            <Text className="text-sm text-white/60">Пропустить</Text>
          </Pressable>
        )}
        <Pressable
          onPress={capture}
          className="active:opacity-80 h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/10"
          accessibilityRole="button"
          accessibilityLabel={isLabel ? 'Снять этикетку' : 'Снять продукт'}
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <Camera size={24} color="#111827" strokeWidth={1.5} />
          </View>
        </Pressable>
        <Text className="text-xs text-white/60">
          {isLabel ? 'Шаг 2 — дата годности' : 'Сфотографируйте продукт'}
        </Text>
      </View>
    </View>
  );
}
