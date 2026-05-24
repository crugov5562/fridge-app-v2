import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Flame, ChevronRight, CheckCircle2, ShoppingBasket } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SmartProposalResponse } from '@/lib/api';

interface Props {
  proposal: SmartProposalResponse;
}

export function SmartProposalCard({ proposal }: Props) {
  const {
    tagline,
    recipe_title,
    expiring_products,
    missing_ingredients,
    cost_rub,
  } = proposal;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/recipes');
  }, []);

  return (
    <View className="mx-4 mb-3 mt-2 overflow-hidden rounded-3xl bg-emerald-950">
      {/* ── заголовок ── */}
      <View className="flex-row items-center gap-2 px-5 pb-1 pt-5">
        <Flame size={16} color="#fbbf24" strokeWidth={2} />
        <Text className="text-xs font-semibold uppercase tracking-wide text-amber-400">
          {tagline}
        </Text>
      </View>
      <Text className="px-5 pb-4 text-lg font-bold text-white">{recipe_title}</Text>

      <View className="mx-5 border-t border-white/10" />

      {/* ── «Уже в холодильнике» ── */}
      <View className="px-5 pb-3 pt-4">
        <View className="mb-2 flex-row items-center gap-1.5">
          <CheckCircle2 size={12} color="#34d399" strokeWidth={2} />
          <Text className="text-xs font-medium text-emerald-400">Уже есть</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {expiring_products.map((p) => (
            <View key={p.name} className="rounded-full border border-emerald-700/50 bg-emerald-900/50 px-3 py-1">
              <Text className="text-xs text-emerald-200">{p.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── «Докупить» — только информация ── */}
      {missing_ingredients.length > 0 && (
        <View className="mx-5 mb-4 rounded-2xl bg-white/5 px-4 py-3">
          <View className="mb-2 flex-row items-center gap-1.5">
            <ShoppingBasket size={12} color="#fbbf24" strokeWidth={2} />
            <Text className="text-xs font-medium text-amber-400">
              Нужно докупить ~{cost_rub}₽
            </Text>
          </View>
          <Text className="text-sm text-white/70">
            {missing_ingredients.map((i) => i.name).join(', ')}
          </Text>
        </View>
      )}

      {/* ── CTA ── */}
      <Pressable
        onPress={handlePress}
        className="active:opacity-80 mx-5 mb-5 flex-row items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5"
        accessibilityRole="button"
        accessibilityLabel="Открыть рецепт"
      >
        <Text className="text-sm font-semibold text-white">Посмотреть рецепт</Text>
        <ChevronRight size={16} color="white" strokeWidth={2} />
      </Pressable>
    </View>
  );
}
