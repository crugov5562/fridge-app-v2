import React, { forwardRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { QrCode, Camera, PenLine } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const ACTIONS = [
  {
    icon: QrCode,
    title: 'Сканировать чек',
    subtitle: 'Добавить все товары с чека сразу',
    href: '/(modal)/scan-receipt' as const,
  },
  {
    icon: Camera,
    title: 'Сфотографировать продукт',
    subtitle: 'ИИ определит название и срок годности',
    href: '/(modal)/scan-photo' as const,
  },
  {
    icon: PenLine,
    title: 'Добавить вручную',
    subtitle: 'Ввести данные самостоятельно',
    href: '/(modal)/add-item' as const,
  },
];

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
);

export const FABSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const handleAction = useCallback(
    (href: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      setTimeout(() => router.push(href as never), 200);
    },
    [ref]
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView className="px-5 pb-10 pt-2">
        <Text className="mb-5 text-lg font-bold text-white">Добавить продукт</Text>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Pressable
              key={action.href}
              onPress={() => handleAction(action.href)}
              className="active:opacity-70 mb-1 flex-row items-center gap-4 rounded-2xl py-3"
              accessibilityRole="button"
              accessibilityLabel={action.title}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
                <Icon size={22} color="#10b981" strokeWidth={1.5} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-white">{action.title}</Text>
                <Text className="mt-0.5 text-sm text-white/50">{action.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

FABSheet.displayName = 'FABSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#18181b' },
  handle:  { backgroundColor: '#52525b' },
});
