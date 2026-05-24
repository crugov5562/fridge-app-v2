import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Bell, Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { auth } from '@/lib/api';

const NOTIFY_OPTIONS = [1, 2, 3, 5] as const;

const PREFERENCES = [
  'Вегетарианец',
  'Веган',
  'Без глютена',
  'Без лактозы',
  'Халяль',
  'Кошерное',
  'Кето',
  'Без сахара',
  'Без орехов',
];

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      {icon}
      <Text className="flex-1 font-semibold text-foreground">{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: auth.me,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (userData) {
      setSelectedPrefs(userData.preferences ?? []);
    }
  }, [userData?.id]);

  const prefMutation = useMutation({
    mutationFn: auth.setPreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const togglePref = (pref: string) => {
    Haptics.selectionAsync();
    const next = selectedPrefs.includes(pref)
      ? selectedPrefs.filter((p) => p !== pref)
      : [...selectedPrefs, pref];
    setSelectedPrefs(next);
    prefMutation.mutate(next);
  };

  const handleLogout = () => {
    Alert.alert('Выйти из аккаунта', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
        },
      },
    ]);
  };

  const initials = (user?.display_name ?? user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* аватар + имя */}
      <View className="mb-8 items-center gap-3 px-4">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
          <Text className="text-3xl font-bold text-white">{initials}</Text>
        </View>
        {user?.display_name && (
          <Text className="text-xl font-bold text-foreground">{user.display_name}</Text>
        )}
        <Text className="text-sm text-muted-foreground">{user?.email}</Text>
      </View>

      {/* уведомления */}
      <View className="mx-4 mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          icon={<Bell size={18} color="#6366F1" strokeWidth={1.5} />}
          title="Уведомления"
        />
        <View className="mx-4 h-px bg-separator" />
        <View className="px-4 py-3">
          <Text className="mb-3 text-sm text-muted-foreground">
            Уведомлять за N дней до истечения срока
          </Text>
          <View className="flex-row gap-2">
            {NOTIFY_OPTIONS.map((days) => {
              const active = user?.notify_days_before === days;
              return (
                <View
                  key={days}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    active ? 'bg-accent' : 'border border-border bg-card'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted-foreground'}`}>
                    {days}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* предпочтения */}
      <View className="mx-4 mb-6 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          icon={<Utensils size={18} color="#6366F1" strokeWidth={1.5} />}
          title="Пищевые предпочтения"
        />
        <View className="mx-4 h-px bg-separator" />
        <View className="px-4 py-4">
          <Text className="mb-3 text-xs text-muted-foreground">
            Используются для фильтрации рецептов
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PREFERENCES.map((pref) => {
              const active = selectedPrefs.includes(pref);
              return (
                <Pressable
                  key={pref}
                  onPress={() => togglePref(pref)}
                  className={`active:opacity-70 rounded-full border px-4 py-2 ${
                    active ? 'border-accent bg-accent/10' : 'border-border bg-muted'
                  }`}
                  accessibilityRole="checkbox"
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? 'text-accent' : 'text-muted-foreground'
                    }`}
                  >
                    {pref}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedPrefs.length > 0 && (
            <Text className="mt-3 text-xs text-muted-foreground">
              Выбрано: {selectedPrefs.length}
            </Text>
          )}
        </View>
      </View>

      {/* выход */}
      <Pressable
        onPress={handleLogout}
        className="active:opacity-70 mx-4 flex-row items-center gap-3 rounded-2xl border border-error/30 px-4 py-3"
        accessibilityRole="button"
        accessibilityLabel="Выйти из аккаунта"
      >
        <LogOut size={18} color="#EF4444" strokeWidth={1.5} />
        <Text className="font-medium text-error">Выйти из аккаунта</Text>
      </Pressable>
    </ScrollView>
  );
}
