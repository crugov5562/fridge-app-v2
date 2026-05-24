import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Страница не найдена' }} />
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="mb-2 text-2xl font-bold text-foreground">
          Страница не найдена
        </Text>
        <Link href="/(tabs)" className="mt-4 text-accent">
          На главную
        </Link>
      </View>
    </>
  );
}
