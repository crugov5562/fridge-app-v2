import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, AlertTriangle } from 'lucide-react-native';
import type { UserResponse } from '@/lib/api';

interface Props {
  user: UserResponse | null;
  fridgeName: string;
  itemCount: number;
  expiringCount: number;
  onFridgePress?: () => void;
}

export function HeroBlock({ user, fridgeName, itemCount, expiringCount, onFridgePress }: Props) {
  const name = user?.display_name ?? user?.email?.split('@')[0] ?? 'РџСЂРёРІРµС‚';

  return (
    <View className="rounded-b-[40px] bg-[#6366F1] px-6 pb-8 pt-14">
      {/* РІРµСЂС…РЅСЏСЏ СЃС‚СЂРѕРєР°: РїСЂРёРІРµС‚СЃС‚РІРёРµ + РїРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ */}
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-white/80">
          РџСЂРёРІРµС‚, {name}!
        </Text>
        <Pressable
          onPress={onFridgePress}
          className="active:opacity-70 flex-row items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5"
          accessibilityRole="button"
          accessibilityLabel="Р’С‹Р±СЂР°С‚СЊ С…РѕР»РѕРґРёР»СЊРЅРёРє"
        >
          <Text className="text-sm font-semibold text-white">{fridgeName}</Text>
          <ChevronDown size={14} color="white" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Р±РѕР»СЊС€Р°СЏ С†РёС„СЂР° */}
      <Text className="text-8xl font-black leading-none text-white">{itemCount}</Text>
      <Text className="mb-5 mt-1 text-lg font-semibold text-white/80">
        {itemCount === 1 ? 'РїСЂРѕРґСѓРєС‚ РІ С…РѕР»РѕРґРёР»СЊРЅРёРєРµ' : 'РїСЂРѕРґСѓРєС‚РѕРІ РІ С…РѕР»РѕРґРёР»СЊРЅРёРєРµ'}
      </Text>

      {/* Р±РµР№РґР¶ РёСЃС‚РµРєР°СЋС‰РёС… */}
      {expiringCount > 0 ? (
        <View className="self-start flex-row items-center gap-2 rounded-full bg-amber-400 px-4 py-2">
          <AlertTriangle size={14} color="#78350f" strokeWidth={2} />
          <Text className="text-sm font-bold text-amber-900">
            {expiringCount} {expiringCount === 1 ? 'РїСЂРѕРґСѓРєС‚ РёСЃС‚РµРєР°РµС‚' : 'РёСЃС‚РµРєР°СЋС‚ СЃРєРѕСЂРѕ'}
          </Text>
        </View>
      ) : (
        <View className="self-start rounded-full bg-white/20 px-4 py-2">
          <Text className="text-sm font-semibold text-white">Р’СЃС‘ СЃРІРµР¶РµРµ</Text>
        </View>
      )}
    </View>
  );
}
