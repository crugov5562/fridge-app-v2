import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, Search, QrCode, Camera, Refrigerator } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { inventory, catalog } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useFridgeStore } from '@/lib/fridge-store';
import { getCategoryColor } from '@/utils/category-color';
import { GradientScreen } from '@/components/ui/GradientScreen';
import { FridgeProductCard } from '@/features/inventory/FridgeProductCard';
import { ItemEditModal } from '@/features/inventory';
import { SmartProposalCard } from '@/features/inventory/SmartProposalCard';
import { useSmartProposal } from '@/hooks/useSmartProposal';
import type { InventoryItem } from '@/lib/api';

// ── типы данных списка ────────────────────────────────────────────────────
type HeaderEntry = { type: 'header'; key: string; label: string; count: number };
type PairEntry   = { type: 'pair';   key: string; left: InventoryItem; right: InventoryItem | null };
type ListEntry   = HeaderEntry | PairEntry;

function matchScore(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  return 2;
}

function buildGridData(
  items: InventoryItem[],
  categoryMap: Map<string, string>,
  searchQuery: string,
): ListEntry[] {
  const q = searchQuery.trim().toLowerCase();

  if (q) {
    const sorted = [...items].sort((a, b) => matchScore(a.name, q) - matchScore(b.name, q));
    const result: ListEntry[] = [];
    for (let i = 0; i < sorted.length; i += 2) {
      result.push({
        type: 'pair',
        key: `${sorted[i].id}-${sorted[i + 1]?.id ?? 'r'}`,
        left: sorted[i],
        right: sorted[i + 1] ?? null,
      });
    }
    return result;
  }

  const groups = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const k = item.category_id ?? '__none__';
    const g = groups.get(k);
    if (g) g.push(item);
    else groups.set(k, [item]);
  }
  const result: ListEntry[] = [];
  for (const [catId, catItems] of groups) {
    const label = catId === '__none__' ? 'Без категории' : (categoryMap.get(catId) ?? 'Другое');
    result.push({ type: 'header', key: catId, label, count: catItems.length });
    for (let i = 0; i < catItems.length; i += 2) {
      result.push({
        type: 'pair',
        key: `${catItems[i].id}-${catItems[i + 1]?.id ?? 'r'}`,
        left: catItems[i],
        right: catItems[i + 1] ?? null,
      });
    }
  }
  return result;
}

// ── компонент ────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);
  const qc = useQueryClient();
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listKey, setListKey] = useState(0);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    if (!text.trim() && searchQuery.trim()) setListKey((k) => k + 1);
    setSearchQuery(text);
  }, [searchQuery]);

  const handleFilterAll = useCallback(() => {
    if (filterCategoryId !== null) setListKey((k) => k + 1);
    setFilterCategoryId(null);
  }, [filterCategoryId]);

  const { data: smartProposal } = useSmartProposal(activeFridgeId);

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', activeFridgeId],
    queryFn: () => inventory.list(activeFridgeId!),
    enabled: !!activeFridgeId,
  });

  const { data: expiringItems } = useQuery({
    queryKey: ['expiring', 5],
    queryFn: () => inventory.expiring(5),
    enabled: !!activeFridgeId,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: catalog.categories,
    staleTime: Infinity,
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: catalog.units,
    staleTime: Infinity,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name: string; expiry_date?: string; quantity: number; unit_id?: string } }) =>
      inventory.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', activeFridgeId] });
      qc.invalidateQueries({ queryKey: ['expiring'] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventory.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', activeFridgeId] });
      qc.invalidateQueries({ queryKey: ['expiring'] });
      setEditingItem(null);
    },
  });

  const categoryMap = useMemo(
    () => new Map(categories?.map((c) => [c.id, c.name]) ?? []),
    [categories]
  );

  const unitMap = useMemo(
    () => new Map(units?.map((u) => [u.id, u.abbreviation]) ?? []),
    [units]
  );

  const availableCategories = useMemo(() => {
    const ids = new Set((items ?? []).map((i) => i.category_id).filter(Boolean) as string[]);
    return (categories ?? []).filter((c) => ids.has(c.id));
  }, [items, categories]);

  const filteredItems = useMemo(() => {
    let result = items ?? [];
    if (filterCategoryId) result = result.filter((i) => i.category_id === filterCategoryId);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    return result;
  }, [items, filterCategoryId, searchQuery]);

  const listData = useMemo(
    () => buildGridData(filteredItems, categoryMap, searchQuery),
    [filteredItems, categoryMap, searchQuery]
  );

  const handlePress = useCallback((item: InventoryItem) => {
    Haptics.selectionAsync();
    setEditingItem(item);
  }, []);

  const renderItem = useCallback(({ item }: { item: ListEntry }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{item.label}</Text>
        </View>
      );
    }
    // pair
    return (
      <View style={styles.pairRow}>
        <View style={styles.cardSlot}>
          <FridgeProductCard
            item={item.left}
            categoryName={categoryMap.get(item.left.category_id ?? '') ?? ''}
            unitAbbr={unitMap.get(item.left.unit_id ?? '') ?? ''}
            onPress={handlePress}
          />
        </View>
        <View style={styles.cardSlot}>
          {item.right ? (
            <FridgeProductCard
              item={item.right}
              categoryName={categoryMap.get(item.right.category_id ?? '') ?? ''}
              unitAbbr={unitMap.get(item.right.unit_id ?? '') ?? ''}
              onPress={handlePress}
            />
          ) : (
            <View style={styles.emptySlot} />
          )}
        </View>
      </View>
    );
  }, [categoryMap, unitMap, handlePress]);

  const name = user?.display_name ?? user?.email?.split('@')[0] ?? 'Привет';
  const expiringCount = expiringItems?.length ?? 0;

  // ── пустой холодильник ────────────────────────────────────────────
  if (!activeFridgeId || (isLoading && !items)) {
    return (
      <GradientScreen>
        <View style={styles.emptyContainer}>
          <Refrigerator size={64} color="#C4B5FD" strokeWidth={1} />
          <Text style={styles.emptyTitle}>Загружаем...</Text>
        </View>
      </GradientScreen>
    );
  }

  if (!items || items.length === 0) {
    return (
      <GradientScreen>
        <View style={styles.emptyContainer}>
          <Refrigerator size={64} color="#C4B5FD" strokeWidth={1} />
          <Text style={styles.emptyTitle}>Холодильник пуст</Text>
          <Text style={styles.emptySubtitle}>Добавьте первый продукт</Text>
          <View style={styles.emptyActions}>
            <Pressable
              onPress={() => router.push('/(modal)/scan-receipt')}
              style={styles.emptyBtn}
              accessibilityRole="button"
            >
              <QrCode size={18} color="white" strokeWidth={1.5} />
              <Text style={styles.emptyBtnText}>Сканировать чек</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(modal)/scan-photo')}
              style={[styles.emptyBtn, styles.emptyBtnSecondary]}
              accessibilityRole="button"
            >
              <Camera size={18} color="#6366F1" strokeWidth={1.5} />
              <Text style={[styles.emptyBtnText, { color: '#6366F1' }]}>Фото продукта</Text>
            </Pressable>
          </View>
        </View>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen safe={false}>
      <ItemEditModal
        item={editingItem}
        units={units ?? []}
        onClose={() => setEditingItem(null)}
        onSave={(patch) => updateMutation.mutate({ id: editingItem!.id, patch })}
        onDelete={() => deleteMutation.mutate(editingItem!.id)}
        isSaving={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />

      {/* фиксированный заголовок — не скроллится, TextInput не улетает */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>Мой холодильник</Text>
            {expiringCount > 0 && (
              <Text style={styles.headerExpiring}>
                {expiringCount} продукт{expiringCount === 1 ? '' : 'а'} истекает скоро
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => {}}
            style={styles.searchBtn}
            accessibilityRole="button"
            accessibilityLabel="Уведомления"
          >
            <Bell size={20} color="#6366F1" strokeWidth={2} />
          </Pressable>
        </View>

        {availableCategories.length >= 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
          >
            <Pressable
              onPress={handleFilterAll}
              style={[styles.filterChip, filterCategoryId === null && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filterCategoryId === null && styles.filterChipTextActive]}>
                Все
              </Text>
            </Pressable>
            {availableCategories.map((cat) => {
              const active = filterCategoryId === cat.id;
              const color = getCategoryColor(cat.name);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setFilterCategoryId(active ? null : cat.id)}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: color + '20', borderColor: color },
                  ]}
                >
                  <Text style={[styles.filterChipText, active && { color }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.searchBar}>
          <Search size={16} color="#9E9E9E" strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Поиск по названию..."
            placeholderTextColor="#C4C4D0"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlashList
        key={listKey}
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemType={(item) => item.type}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={smartProposal ? <SmartProposalCard proposal={smartProposal} /> : null}
        ListFooterComponent={<View style={{ height: 120 }} />}
        automaticallyAdjustKeyboardInsets
      />

    </GradientScreen>
  );
}

// ── стили ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // fixed header
  fixedHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerTitle:   { fontSize: 28, fontWeight: '800', color: '#1A1A2E', lineHeight: 34 },
  headerExpiring:{ fontSize: 12, color: '#D97706', fontWeight: '500', marginTop: 4 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // category headers
  sectionHeader: {
    paddingHorizontal: 8,
    paddingTop: 32,
    paddingBottom: 12,
  },
  sectionLabel: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },

  // grid
  pairRow:  { flexDirection: 'row', gap: 12, paddingBottom: 12 },
  cardSlot: { flex: 1 },
  emptySlot:{ flex: 1 },

  // filter bar
  filterBar: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  filterChipActive: { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' },
  filterChipText:   { fontSize: 12, fontWeight: '500', color: '#9E9E9E' },
  filterChipTextActive: { color: '#FFFFFF' },
  filterDot: { width: 6, height: 6, borderRadius: 3 },

  // search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
    paddingVertical: 0,
  },

  // empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle:    { fontSize: 22, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#9E9E9E', textAlign: 'center' },
  emptyActions:  { gap: 10, width: '100%', marginTop: 8 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A2E',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  emptyBtnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E8F0' },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // floating CTA
  ctaWrap: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A2E',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
