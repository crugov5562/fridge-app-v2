import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import { Clock, AlertTriangle, AlertCircle, HelpCircle, CheckCircle, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getExpiryInfo, type ExpiryStatus } from '@/utils/expiry';
import { getCategoryColor } from '@/utils/category-color';
import type { InventoryItem } from '@/lib/api';

const BADGE_CONFIG: Record<ExpiryStatus, { bg: string; textColor: string; Icon: typeof Clock }> = {
  safe: { bg: 'bg-[#EDEFFD]', textColor: 'text-[#6366F1]', Icon: CheckCircle },
  warning: { bg: 'bg-warning-subtle', textColor: 'text-warning', Icon: AlertTriangle },
  danger: { bg: 'bg-error-subtle', textColor: 'text-error', Icon: AlertCircle },
  unknown: { bg: 'bg-muted', textColor: 'text-muted-foreground', Icon: HelpCircle },
};

const BADGE_ICON_COLOR: Record<ExpiryStatus, string> = {
  safe: '#6366F1',
  warning: '#F59E0B',
  danger: '#EF4444',
  unknown: '#71717A',
};

function ExpiryBadge({ date }: { date: string | null }) {
  const { status, label } = getExpiryInfo(date);
  const { bg, textColor, Icon } = BADGE_CONFIG[status];
  const iconColor = BADGE_ICON_COLOR[status];

  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${bg}`}>
      <Icon size={11} color={iconColor} strokeWidth={1.5} />
      <Text className={`text-xs font-medium ${textColor}`}>{label}</Text>
    </View>
  );
}

interface Props {
  item: InventoryItem;
  categoryName: string;
  unitAbbr: string;
  onUse: (id: string) => void;
  onDiscard: (id: string) => void;
  onPress: (item: InventoryItem) => void;
}

function renderRightActions(onUse: () => void, onDiscard: () => void) {
  return (
    <View className="flex-row">
      <Pressable
        onPress={onUse}
        className="w-24 items-center justify-center bg-[#6366F1]"
        accessibilityRole="button"
        accessibilityLabel="Использовал"
      >
        <CheckCircle size={20} color="#fff" strokeWidth={1.5} />
        <Text className="mt-1 text-xs font-semibold text-white">Использовал</Text>
      </Pressable>
      <Pressable
        onPress={onDiscard}
        className="w-24 items-center justify-center bg-error"
        accessibilityRole="button"
        accessibilityLabel="Выбросил"
      >
        <Trash2 size={20} color="#fff" strokeWidth={1.5} />
        <Text className="mt-1 text-xs font-semibold text-white">Выбросил</Text>
      </Pressable>
    </View>
  );
}

export const ItemRow = React.memo(function ItemRow({ item, categoryName, unitAbbr, onUse, onDiscard, onPress }: Props) {
  const handleUse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUse(item.id);
  }, [item.id, onUse]);

  const handleDiscard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDiscard(item.id);
  }, [item.id, onDiscard]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress(item);
  }, [item, onPress]);

  const firstLetter = item.name.charAt(0).toUpperCase();
  const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
  const photoUri = item.photo_url
    ? item.photo_url.startsWith('http') ? item.photo_url : `${BASE}${item.photo_url}`
    : null;

  const catColor = getCategoryColor(categoryName || item.name);

  return (
    <Swipeable
      renderRightActions={() => renderRightActions(handleUse, handleDiscard)}
      overshootRight={false}
    >
      <Pressable onPress={handlePress} className="active:opacity-70 flex-row items-center bg-background">
        {/* цветной акцент категории */}
        <View style={{ width: 4, backgroundColor: catColor }} className="self-stretch rounded-r" />

        <View className="flex-1 flex-row items-center gap-3 px-4 py-3">
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: 48, height: 48, borderRadius: 14 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{ backgroundColor: catColor + '22', width: 48, height: 48, borderRadius: 14 }}
              className="items-center justify-center"
            >
              <Text style={{ color: catColor }} className="text-lg font-black">{firstLetter}</Text>
            </View>
          )}

          <View className="flex-1">
            <Text className="font-semibold text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {categoryName}
              {item.quantity !== 1 || unitAbbr
                ? ` · ${item.quantity} ${unitAbbr}`.trim()
                : ''}
            </Text>
          </View>

          <ExpiryBadge date={item.expiry_date} />
        </View>
      </Pressable>

      <View className="ml-14 h-px bg-separator" />
    </Swipeable>
  );
});
