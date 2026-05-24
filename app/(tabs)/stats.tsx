import React from 'react';
import { View, Text } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';

export default function StatsScreen() {
  return (
    <Screen className="px-4 pt-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-foreground">Статистика</Text>
        <Text className="mt-1 text-muted-foreground">
          Сколько продуктов сохранено и использовано
        </Text>
      </View>

      <View className="flex-1 items-center justify-center gap-3">
        <BarChart3 size={48} color="#A1A1AA" />
        <Text className="text-lg font-semibold text-foreground">Данных пока нет</Text>
        <Text className="text-center text-muted-foreground">
          Статистика появится после добавления и использования продуктов
        </Text>
      </View>
    </Screen>
  );
}
