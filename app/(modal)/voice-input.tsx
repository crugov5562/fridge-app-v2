import React from 'react';
import { Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';

export default function VoiceInputModal() {
  return (
    <Screen className="px-4 pt-4">
      <Text className="text-xl font-semibold text-foreground">Голосовой ввод</Text>
    </Screen>
  );
}
