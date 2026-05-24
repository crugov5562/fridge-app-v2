import { Redirect } from 'expo-router';

// never rendered — FAB tab opens bottom sheet instead of navigating here
export default function ScanPlaceholder() {
  return <Redirect href="/(tabs)" />;
}
