import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react-native';
import type { UserResponse } from '@/lib/api';

interface Props {
  user: UserResponse | null;
  fridgeName: string;
  itemCount: number;
  expiringCount: number;
  onFridgePress?: () => void;
}

export function HeroBlock({ user, fridgeName, itemCount, expiringCount, onFridgePress }: Props) {
  const name = user?.display_name ?? user?.email?.split('@')[0] ?? 'Привет';

  return (
    <View className="rounded-b-3xl bg-emerald-100 px-5 pb-6 pt-4 dark:bg-emerald-900">
      <Text className="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-200">
        Привет, {name} 👋
      </Text>

      <Pressable
        onPress={onFridgePress}
        className="active:opacity-70 mb-4 flex-row items-center gap-1"
        accessibilityRole="button"
        accessibilityLabel="Выбрать холодильник"
      >
        <Text className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">
          {fridgeName}
        </Text>
        <ChevronDown size={20} color="#065f46" strokeWidth={2} />
      </Pressable>

      <View className="flex-row gap-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 dark:bg-black/30">
          <Package size={13} color="#065f46" strokeWidth={2} />
          <Text className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
            {itemCount} продуктов
          </Text>
        </View>

        {expiringCount > 0 && (
          <View className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900/50">
            <AlertTriangle size={13} color="#92400e" strokeWidth={2} />
            <Text className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              {expiringCount} истекают
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
