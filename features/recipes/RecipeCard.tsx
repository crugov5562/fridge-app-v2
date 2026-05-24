import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock } from 'lucide-react-native';
import type { RecipeRecommendation } from '@/lib/api';

interface Props {
  recipe: RecipeRecommendation;
  onPress: (recipe: RecipeRecommendation) => void;
}

const CARD_COLORS = [
  { bg: '#6366F1', text: '#EDEFFD' },
  { bg: '#f97316', text: '#fff7ed' },
  { bg: '#3b82f6', text: '#eff6ff' },
  { bg: '#8b5cf6', text: '#f5f3ff' },
  { bg: '#ec4899', text: '#fdf2f8' },
  { bg: '#06b6d4', text: '#ecfeff' },
];

function titleColor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return CARD_COLORS[h % CARD_COLORS.length];
}

export function RecipeCard({ recipe, onPress }: Props) {
  const { title, description, cooking_time_minutes, match_percent, have_count, total_count, missing_ingredients } = recipe;

  const canCook = match_percent === 100;
  const { bg } = titleColor(title);
  const missing = missing_ingredients.slice(0, 2);
  const extraMissing = missing_ingredients.length - 2;
  const firstLetter = title.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={() => onPress(recipe)}
      className="active:opacity-80 mb-3 overflow-hidden rounded-2xl border border-border bg-card"
      accessibilityRole="button"
      accessibilityLabel={`Рецепт: ${title}`}
    >
      {/* цветной заголовок карточки */}
      <View style={{ backgroundColor: bg }} className="h-36 items-center justify-center">
        <Text style={{ color: 'white' }} className="text-8xl font-black opacity-20">
          {firstLetter}
        </Text>
        {cooking_time_minutes && (
          <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-full bg-black/20 px-2.5 py-1">
            <Clock size={11} color="white" strokeWidth={2} />
            <Text className="text-xs font-semibold text-white">{cooking_time_minutes} мин</Text>
          </View>
        )}
        {canCook && (
          <View className="absolute left-3 top-3 rounded-full bg-white/25 px-3 py-1">
            <Text className="text-xs font-bold text-white">Можно готовить!</Text>
          </View>
        )}
      </View>

      <View className="px-4 pb-4 pt-3">
        <Text className="mb-1 text-base font-bold text-foreground" numberOfLines={2}>
          {title}
        </Text>

        {description && (
          <Text className="mb-3 text-xs text-muted-foreground" numberOfLines={1}>
            {description}
          </Text>
        )}

        {/* прогресс ингредиентов */}
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-xs font-medium text-muted-foreground">
            {have_count} из {total_count} ингредиентов
          </Text>
          <Text style={canCook ? { color: bg } : undefined} className={`text-xs font-bold ${canCook ? '' : 'text-muted-foreground'}`}>
            {match_percent}%
          </Text>
        </View>
        <View className="mb-3 h-1.5 flex-row overflow-hidden rounded-full bg-muted">
          <View style={{ flex: match_percent, backgroundColor: bg }} className="h-full rounded-full" />
          <View style={{ flex: Math.max(0, 100 - match_percent) }} />
        </View>

        {/* недостающие или «всё есть» */}
        {missing_ingredients.length > 0 ? (
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text className="text-xs text-muted-foreground">Нужно:</Text>
            {missing.map((ing) => (
              <View key={ing} className="rounded-full bg-amber-100 px-2.5 py-0.5 dark:bg-amber-900/30">
                <Text className="text-xs font-medium text-amber-700 dark:text-amber-300">{ing}</Text>
              </View>
            ))}
            {extraMissing > 0 && (
              <Text className="text-xs text-muted-foreground">+{extraMissing} ещё</Text>
            )}
          </View>
        ) : (
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: bg + '22' }}>
            <Text style={{ color: bg }} className="text-xs font-bold">Все ингредиенты есть</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
