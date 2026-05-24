import React from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';

export default function RecipeDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen className="px-4 pt-4">
      <Text className="text-xl font-semibold text-foreground">Рецепт</Text>
      <Text className="text-muted-foreground">ID: {id}</Text>
    </Screen>
  );
}
