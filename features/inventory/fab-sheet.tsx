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
    color: '#6366F1',
  },
  {
    icon: Camera,
    title: 'Сфотографировать продукт',
    subtitle: 'ИИ определит название и срок годности',
    href: '/(modal)/scan-photo' as const,
    color: '#F97316',
  },
  {
    icon: PenLine,
    title: 'Добавить вручную',
    subtitle: 'Ввести данные самостоятельно',
    href: '/(modal)/add-item' as const,
    color: '#6366F1',
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
    [ref],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['42%']}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Pressable
              key={action.href}
              onPress={() => handleAction(action.href)}
              accessibilityRole="button"
              accessibilityLabel={action.title}
            >
              {({ pressed }) => (
                <View style={[styles.row, pressed && styles.rowPressed]}>
                  <View style={[styles.iconWrap, { backgroundColor: action.color + '18' }]}>
                    <Icon size={22} color={action.color} strokeWidth={1.5} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{action.title}</Text>
                    <Text style={styles.rowSub}>{action.subtitle}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

FABSheet.displayName = 'FABSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#FFFFFF' },
  handle:  { backgroundColor: '#E0E0E8' },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  rowPressed: { opacity: 0.65 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  rowSub:   { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
});
