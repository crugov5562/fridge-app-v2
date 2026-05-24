import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, ChefHat } from 'lucide-react-native';
import type { RecipeRecommendation } from '@/lib/api';

interface Props {
  recipe: RecipeRecommendation;
  onPress: (recipe: RecipeRecommendation) => void;
}

export function RecipeCard({ recipe, onPress }: Props) {
  const { title, description, cooking_time_minutes, match_percent, have_count, total_count, missing_ingredients } = recipe;

  const canCook  = match_percent === 100;
  const missing  = missing_ingredients.slice(0, 2);
  const extraMissing = missing_ingredients.length - 2;

  return (
    <Pressable
      onPress={() => onPress(recipe)}
      className="active:opacity-80 mb-3 overflow-hidden rounded-2xl border border-border bg-card"
      accessibilityRole="button"
      accessibilityLabel={`Рецепт: ${title}`}
    >
      {/* фото-заглушка */}
      <View className="h-40 items-center justify-center bg-emerald-50 dark:bg-emerald-950">
        <ChefHat size={36} color="#10b981" strokeWidth={1} />
      </View>

      <View className="px-4 pb-4 pt-3">
        {/* название + время */}
        <View className="mb-1 flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={2}>
            {title}
          </Text>
          {cooking_time_minutes && (
            <View className="flex-row items-center gap-1 pt-0.5">
              <Clock size={12} color="#9ca3af" strokeWidth={1.5} />
              <Text className="text-xs text-muted-foreground">{cooking_time_minutes} мин</Text>
            </View>
          )}
        </View>

        {/* описание */}
        {description && (
          <Text className="mb-3 text-xs text-muted-foreground" numberOfLines={1}>
            {description}
          </Text>
        )}

        {/* прогресс ингредиентов */}
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-xs font-medium text-foreground">
            {have_count} из {total_count} ингредиентов
          </Text>
          <Text className={`text-xs font-semibold ${canCook ? 'text-accent' : 'text-muted-foreground'}`}>
            {match_percent}%
          </Text>
        </View>
        <View className="mb-3 h-1.5 flex-row overflow-hidden rounded-full bg-muted">
          <View
            className={`h-full rounded-full ${canCook ? 'bg-accent' : 'bg-emerald-400'}`}
            style={{ flex: match_percent }}
          />
          <View style={{ flex: Math.max(0, 100 - match_percent) }} />
        </View>

        {/* недостающие */}
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
          <View className="flex-row items-center gap-1.5">
            <View className="rounded-full bg-emerald-100 px-2.5 py-0.5 dark:bg-emerald-900/30">
              <Text className="text-xs font-semibold text-accent">Можно готовить!</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}
