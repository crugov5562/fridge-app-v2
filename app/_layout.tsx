import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import '../global.css';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/lib/auth-store';
import { lightVars, darkVars } from '@/lib/theme';

export default function RootLayout() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <GestureHandlerRootView
      style={[{ flex: 1 }, colorScheme === 'dark' ? darkVars : lightVars]}
    >
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(modal)" options={{ presentation: 'modal' }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
