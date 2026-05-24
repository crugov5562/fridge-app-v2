import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Refrigerator, QrCode, Camera, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { inventory, catalog } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useFridgeStore } from '@/lib/fridge-store';
import { HeroBlock } from '@/features/inventory/hero-block';
import { ItemRow } from '@/features/inventory/item-row';
import { InventorySkeleton } from '@/features/inventory/inventory-skeleton';
import { ItemEditModal } from '@/features/inventory';
import { SmartProposalCard } from '@/features/inventory/SmartProposalCard';
import { Screen } from '@/components/ui/Screen';
import { useSmartProposal } from '@/hooks/useSmartProposal';
import type { InventoryItem } from '@/lib/api';

type ListEntry =
  | { type: 'header'; key: string; label: string; count: number }
  | { type: 'item'; data: InventoryItem };

function buildListData(items: InventoryItem[], categoryMap: Map<string, string>): ListEntry[] {
  const groups = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const key = item.category_id ?? '__none__';
    const g = groups.get(key);
    if (g) g.push(item);
    else groups.set(key, [item]);
  }
  const result: ListEntry[] = [];
  for (const [catId, catItems] of groups) {
    const label = catId === '__none__' ? 'Без категории' : (categoryMap.get(catId) ?? 'Другое');
    result.push({ type: 'header', key: catId, label, count: catItems.length });
    for (const item of catItems) result.push({ type: 'item', data: item });
  }
  return result;
}

export default function InventoryScreen() {
  const user = useAuthStore((s) => s.user);
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);
  const qc = useQueryClient();
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const { data: smartProposal } = useSmartProposal(activeFridgeId);

  const { data: items, isLoading: isLoadingItems } = useQuery({
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

  const removeMutation = useMutation({
    mutationFn: inventory.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', activeFridgeId] });
      qc.invalidateQueries({ queryKey: ['expiring'] });
    },
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

  // категории которые реально есть в инвентаре
  const availableCategories = useMemo(() => {
    const ids = new Set((items ?? []).map((i) => i.category_id).filter(Boolean) as string[]);
    return (categories ?? []).filter((c) => ids.has(c.id));
  }, [items, categories]);

  const filteredItems = useMemo(
    () =>
      filterCategoryId
        ? (items ?? []).filter((i) => i.category_id === filterCategoryId)
        : (items ?? []),
    [items, filterCategoryId]
  );

  const listData = useMemo(
    () => buildListData(filteredItems, categoryMap),
    [filteredItems, categoryMap]
  );

  const handleUse = useCallback(
    (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      removeMutation.mutate(id);
    },
    [removeMutation]
  );

  const handleDiscard = useCallback(
    (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeMutation.mutate(id);
    },
    [removeMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      if (item.type === 'header') {
        return (
          <View className="bg-background px-4 pb-1 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label} · {item.count}
            </Text>
          </View>
        );
      }
      return (
        <ItemRow
          item={item.data}
          categoryName={categoryMap.get(item.data.category_id ?? '') ?? ''}
          unitAbbr={unitMap.get(item.data.unit_id ?? '') ?? ''}
          onUse={handleUse}
          onDiscard={handleDiscard}
          onPress={setEditingItem}
        />
      );
    },
    [categoryMap, unitMap, handleUse, handleDiscard]
  );

  const filterBar = useMemo(() => {
    if (availableCategories.length < 2) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-border"
        contentContainerClassName="px-4 py-2 gap-2 flex-row"
      >
        <Pressable
          onPress={() => setFilterCategoryId(null)}
          className={`rounded-full border px-3.5 py-1.5 ${
            filterCategoryId === null ? 'border-accent bg-accent' : 'border-border bg-card'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filterCategoryId === null ? 'text-white' : 'text-muted-foreground'
            }`}
          >
            Все
          </Text>
        </Pressable>
        {availableCategories.map((cat) => {
          const active = filterCategoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setFilterCategoryId(active ? null : cat.id)}
              className={`rounded-full border px-3.5 py-1.5 ${
                active ? 'border-accent bg-accent' : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-white' : 'text-muted-foreground'
                }`}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }, [availableCategories, filterCategoryId]);

  if (!activeFridgeId || isLoadingItems) {
    return <InventorySkeleton />;
  }

  if (!items || items.length === 0) {
    return (
      <Screen safe>
        <HeroBlock
          user={user}
          fridgeName="Мой холодильник"
          itemCount={0}
          expiringCount={0}
        />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Refrigerator size={64} color="#A1A1AA" strokeWidth={1} />
          <Text className="text-xl font-bold text-foreground">Холодильник пуст</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Добавьте первый продукт, чтобы начать отслеживать сроки
          </Text>
          <View className="mt-2 w-full gap-3">
            <Pressable
              onPress={() => router.push('/(modal)/scan-receipt')}
              className="active:opacity-80 flex-row items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4"
              accessibilityRole="button"
            >
              <QrCode size={18} color="#fff" strokeWidth={1.5} />
              <Text className="font-semibold text-background">Сканировать чек</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(modal)/scan-photo')}
              className="active:opacity-80 flex-row items-center justify-center gap-2 rounded-full bg-accent px-6 py-4"
              accessibilityRole="button"
            >
              <Camera size={18} color="#fff" strokeWidth={1.5} />
              <Text className="font-semibold text-white">Сфотографировать продукт</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(modal)/add-item')}
              className="active:opacity-80 flex-row items-center justify-center gap-2 rounded-full border border-border px-6 py-4"
              accessibilityRole="button"
            >
              <Plus size={18} color="#10b981" strokeWidth={1.5} />
              <Text className="font-semibold text-accent">Добавить вручную</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safe scroll={false}>
      <ItemEditModal
        item={editingItem}
        units={units ?? []}
        onClose={() => setEditingItem(null)}
        onSave={(patch) => updateMutation.mutate({ id: editingItem!.id, patch })}
        onDelete={() => deleteMutation.mutate(editingItem!.id)}
        isSaving={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
      <FlashList
        data={listData}
        keyExtractor={(item, i) =>
          item.type === 'header' ? `h-${item.key}` : item.data.id ?? String(i)
        }
        renderItem={renderItem}
        getItemType={(item) => item.type}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <HeroBlock
              user={user}
              fridgeName="Мой холодильник"
              itemCount={items.length}
              expiringCount={expiringItems?.length ?? 0}
            />
            {smartProposal && <SmartProposalCard proposal={smartProposal} />}
            {filterBar}
          </>
        }
      />
    </Screen>
  );
}
