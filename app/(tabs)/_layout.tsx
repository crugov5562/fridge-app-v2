import React, { useCallback, useRef } from 'react';
import { View, Pressable } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Home, UtensilsCrossed, ScanLine, Clock, User } from 'lucide-react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/lib/auth-store';
import { FABSheet } from '@/features/inventory/fab-sheet';

function FABButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        onPress={onPress}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#6366F1',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          shadowColor: '#6366F1',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel="Добавить продукт"
      >
        <ScanLine size={26} color="#fff" strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const fabRef = useRef<BottomSheetModal>(null);

  const openFAB = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fabRef.current?.present();
  }, []);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;

  const activeColor = '#6366F1';
  const inactiveColor = '#A1A1AA';
  const bgColor = '#FFFFFF';
  const borderColor = '#E4E4E7';

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopColor: borderColor,
            borderTopWidth: 1,
            overflow: 'visible' as const,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Главная',
            tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={1.5} />,
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Рецепты',
            tabBarIcon: ({ color }) => (
              <UtensilsCrossed size={22} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarButton: () => <FABButton onPress={openFAB} />,
          }}
        />
        <Tabs.Screen
          name="expiring"
          options={{
            title: 'Сроки',
            tabBarIcon: ({ color }) => <Clock size={22} color={color} strokeWidth={1.5} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Профиль',
            tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={1.5} />,
          }}
        />
        <Tabs.Screen name="stats" options={{ href: null }} />
      </Tabs>

      <FABSheet ref={fabRef} />
    </>
  );
}
