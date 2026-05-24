import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="scan-receipt" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-item" options={{ presentation: 'modal' }} />
      <Stack.Screen name="scan-photo" options={{ presentation: 'modal' }} />
      <Stack.Screen name="voice-input" options={{ presentation: 'modal' }} />
      {/* receipt-confirm is a full page push (not modal), so it has a proper back button */}
      <Stack.Screen name="receipt-confirm" options={{ presentation: 'card' }} />
    </Stack>
  );
}
