import React, { forwardRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, CheckCircle2, XCircle, ChefHat } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { recipes as recipesApi } from '@/lib/api';
import type { RecipeRecommendation } from '@/lib/api';

interface Props {
  recipe: RecipeRecommendation | null;
  fridgeId: string | null;
}

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
);

export const RecipeDetailSheet = forwardRef<BottomSheetModal, Props>(
  ({ recipe, fridgeId }, ref) => {
    const { data: detail, isLoading } = useQuery({
      queryKey: ['recipe-detail', recipe?.id, fridgeId],
      queryFn: () => recipesApi.detail(recipe!.id, fridgeId ?? undefined),
      enabled: !!recipe?.id,
      staleTime: 15 * 60 * 1000,
    });

    const handleCooked = useCallback(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      // TODO: списание ингредиентов из инвентаря
    }, [ref]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['75%', '95%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        {isLoading || !detail ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            {/* фото-заглушка */}
            <View className="h-48 items-center justify-center bg-emerald-950">
              <ChefHat size={48} color="#10b981" strokeWidth={1} />
            </View>

            <View className="px-5 pb-10 pt-4">
              {/* мета */}
              <View className="mb-1 flex-row items-center gap-3">
                {detail.cooking_time_minutes && (
                  <View className="flex-row items-center gap-1">
                    <Clock size={14} color="#9ca3af" strokeWidth={1.5} />
                    <Text className="text-sm text-muted-foreground">{detail.cooking_time_minutes} мин</Text>
                  </View>
                )}
                {detail.servings && (
                  <View className="flex-row items-center gap-1">
                    <Users size={14} color="#9ca3af" strokeWidth={1.5} />
                    <Text className="text-sm text-muted-foreground">{detail.servings} порции</Text>
                  </View>
                )}
              </View>

              <Text className="mb-2 text-2xl font-bold text-foreground">{detail.title}</Text>

              {detail.description && (
                <Text className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </Text>
              )}

              {/* ── ингредиенты ── */}
              <Text className="mb-3 text-base font-bold text-foreground">Ингредиенты</Text>
              <View className="mb-5 gap-2">
                {detail.ingredients.map((ing) => (
                  <View key={ing.name} className="flex-row items-center gap-3">
                    {ing.have ? (
                      <CheckCircle2 size={18} color="#10b981" strokeWidth={1.5} />
                    ) : (
                      <XCircle size={18} color={ing.is_optional ? '#9ca3af' : '#f59e0b'} strokeWidth={1.5} />
                    )}
                    <Text
                      className={`flex-1 text-sm ${ing.have ? 'text-foreground' : ing.is_optional ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}
                    >
                      {ing.name}
                      {ing.quantity ? ` — ${ing.quantity}` : ''}
                      {ing.is_optional ? ' (по желанию)' : ''}
                    </Text>
                  </View>
                ))}
              </View>

              {/* ── приготовление ── */}
              <Text className="mb-3 text-base font-bold text-foreground">Приготовление</Text>
              <Text className="mb-6 text-sm leading-relaxed text-foreground">
                {detail.instructions}
              </Text>

              {/* CTA */}
              <Pressable
                onPress={handleCooked}
                className="active:opacity-80 items-center rounded-full bg-accent py-4"
                accessibilityRole="button"
              >
                <Text className="text-base font-bold text-white">Приготовил!</Text>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  }
);

RecipeDetailSheet.displayName = 'RecipeDetailSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#ffffff' },
  handle:  { backgroundColor: '#d1d5db' },
});
