import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChefHat, Search } from 'lucide-react-native';
import { recipes as recipesApi } from '@/lib/api';
import { useFridgeStore } from '@/lib/fridge-store';
import { RecipeCard } from '@/features/recipes/RecipeCard';
import { RecipeDetailSheet } from '@/features/recipes/RecipeDetailSheet';
import { Screen } from '@/components/ui/Screen';
import type { RecipeRecommendation } from '@/lib/api';

type Mode = 'fridge' | 'search';

export default function RecipesScreen() {
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);
  const sheetRef = useRef<BottomSheetModal>(null);

  const [mode, setMode] = useState<Mode>('fridge');
  const [query, setQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRecommendation | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['recipes', activeFridgeId, mode === 'search' ? query : ''],
    queryFn: () =>
      recipesApi.recommend(activeFridgeId!, mode === 'search' ? query : ''),
    enabled: !!activeFridgeId && (mode === 'fridge' || query.length >= 2),
    staleTime: 5 * 60 * 1000,
  });

  const handleSelect = useCallback((recipe: RecipeRecommendation) => {
    setSelectedRecipe(recipe);
    sheetRef.current?.present();
  }, []);

  const handleSearch = useCallback(() => {
    if (query.length >= 2) refetch();
  }, [query, refetch]);

  const recipeList = data?.recipes ?? [];

  return (
    <Screen safe scroll={false}>
      <RecipeDetailSheet ref={sheetRef} recipe={selectedRecipe} fridgeId={activeFridgeId} />

      {/* заголовок */}
      <View className="px-4 pb-3 pt-4">
        <Text className="text-2xl font-bold text-foreground">Рецепты</Text>

        {/* переключатель режимов */}
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => setMode('fridge')}
            className={`flex-1 items-center rounded-full py-2.5 ${
              mode === 'fridge' ? 'bg-accent' : 'border border-border bg-card'
            }`}
          >
            <Text className={`text-sm font-semibold ${mode === 'fridge' ? 'text-white' : 'text-muted-foreground'}`}>
              Из холодильника
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('search')}
            className={`flex-1 items-center rounded-full py-2.5 ${
              mode === 'search' ? 'bg-accent' : 'border border-border bg-card'
            }`}
          >
            <Text className={`text-sm font-semibold ${mode === 'search' ? 'text-white' : 'text-muted-foreground'}`}>
              По запросу
            </Text>
          </Pressable>
        </View>

        {/* поисковая строка — только в режиме «По запросу» */}
        {mode === 'search' && (
          <View className="mt-3 flex-row items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card px-4">
            <Search size={16} color="#9ca3af" strokeWidth={1.5} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder="Например: лёгкое с курицей..."
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              className="flex-1 py-3 text-sm text-foreground"
            />
          </View>
        )}
      </View>

      {/* контент */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="mt-3 text-sm text-muted-foreground">Подбираем рецепты...</Text>
        </View>
      ) : recipeList.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <ChefHat size={56} color="#A1A1AA" strokeWidth={1} />
          <Text className="text-center text-lg font-semibold text-foreground">
            {mode === 'search' && query.length < 2
              ? 'Напишите что хотите приготовить'
              : 'Рецепты не найдены'}
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {mode === 'fridge'
              ? 'Добавьте продукты в холодильник, и ИИ подберёт блюда'
              : 'Попробуйте другой запрос'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={recipeList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecipeCard recipe={item} onPress={handleSelect} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <Text className="mb-3 mt-1 text-xs text-muted-foreground">
              {recipeList.length} рецептов · сортировка по совпадению
            </Text>
          }
        />
      )}
    </Screen>
  );
}
