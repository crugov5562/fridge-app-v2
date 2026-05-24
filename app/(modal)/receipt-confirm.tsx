import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { inventory } from '@/lib/api';
import { useScanStore } from '@/lib/scan-store';
import { useFridgeStore } from '@/lib/fridge-store';
import { SwipeCardDeck, type SwipeCardDeckHandle } from '@/features/scan-receipt/SwipeCardDeck';
import type { EnrichedItem } from '@/features/scan-receipt/ReceiptScanner';

export default function ReceiptConfirmScreen() {
  const { items, purchaseDate, updateItem, requestClose } = useScanStore();
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);
  const qc = useQueryClient();
  const deckRef = useRef<SwipeCardDeckHandle>(null);

  const saveMutation = useMutation({
    mutationFn: async (selected: EnrichedItem[]) => {
      if (!activeFridgeId) throw new Error('no fridge');
      if (!selected.length) return;
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
      requestClose(); // signals ReceiptScanner to call onDone() → closes modal stack
      router.back();  // close this page → ReceiptScanner reacts to shouldClose
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось сохранить товары'),
  });

  const handleBack = () => {
    if (saveMutation.isPending) return;
    const selected = deckRef.current?.getAddedItems() ?? [];
    if (selected.length > 0) {
      saveMutation.mutate(selected);
    } else {
      router.back();
    }
  };

  const handleAddAll = () => {
    Alert.alert('Добавить всё?', `Добавить все ${items.length} товаров в холодильник?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Добавить', onPress: () => saveMutation.mutate(items) },
    ]);
  };

  return (
    <LinearGradient colors={['#FFF8F0', '#F5EFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── header ── */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Назад">
            <ChevronLeft size={22} color="#1A1A2E" strokeWidth={2.5} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Товары из чека</Text>
            {purchaseDate && <Text style={styles.headerSub}>от {purchaseDate}</Text>}
          </View>

          <Pressable
            onPress={handleAddAll}
            disabled={saveMutation.isPending}
            style={styles.addAllBtn}
            accessibilityRole="button"
            accessibilityLabel="Добавить всё"
          >
            <Text style={styles.addAllText}>Добавить всё</Text>
          </Pressable>
        </View>

        {/* ── card deck ── */}
        <SwipeCardDeck
          ref={deckRef}
          items={items}
          onUpdate={updateItem}
          onAllDone={(added) => saveMutation.mutate(added)}
        />

        {saveMutation.isPending && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.overlayText}>Сохраняем...</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  headerSub: { fontSize: 11, color: '#9E9E9E' },
  addAllBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addAllText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: { fontSize: 15, fontWeight: '600', color: '#6366F1' },
});
