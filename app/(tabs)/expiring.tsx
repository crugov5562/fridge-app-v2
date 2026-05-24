import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Clock, AlertCircle, AlertTriangle } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { inventory } from '@/lib/api';
import { getExpiryInfo } from '@/utils/expiry';
import type { InventoryItem } from '@/lib/api';

function ExpiringItemRow({ item }: { item: InventoryItem }) {
  const { status, label } = getExpiryInfo(item.expiry_date);

  const iconProps =
    status === 'danger'
      ? { Icon: AlertCircle, color: '#EF4444', bg: 'bg-error-subtle' }
      : { Icon: AlertTriangle, color: '#F59E0B', bg: 'bg-warning-subtle' };

  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${iconProps.bg}`}
      >
        <iconProps.Icon size={20} color={iconProps.color} strokeWidth={1.5} />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">{label}</Text>
      </View>
    </View>
  );
}

export default function ExpiringScreen() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['expiring', 7],
    queryFn: () => inventory.expiring(7),
  });

  return (
    <Screen safe>
      <View className="px-4 pb-2 pt-4">
        <Text className="text-2xl font-bold text-foreground">Истекает скоро</Text>
        <Text className="mt-1 text-sm text-muted-foreground">Ближайшие 7 дней</Text>
      </View>

      {isLoading && (
        <View className="mt-4 gap-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <View className="flex-1 gap-1.5">
                <Skeleton className="h-4 w-2/5 rounded-lg" />
                <Skeleton className="h-3 w-1/4 rounded-lg" />
              </View>
            </View>
          ))}
        </View>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <View className="flex-1 items-center justify-center gap-3">
          <Clock size={52} color="#A1A1AA" strokeWidth={1} />
          <Text className="text-lg font-semibold text-foreground">Всё в порядке</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Нет продуктов с истекающим сроком годности
          </Text>
        </View>
      )}

      {!isLoading && items && items.length > 0 && (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpiringItemRow item={item} />}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="mx-4 h-px bg-separator" />}
        />
      )}
    </Screen>
  );
}
