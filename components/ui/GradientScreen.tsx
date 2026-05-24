import React from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface Props extends ViewProps {
  children: React.ReactNode;
  safe?: boolean;
}

export function GradientScreen({ children, safe = true, style, ...props }: Props) {
  const Container = safe ? SafeAreaView : View;
  return (
    <LinearGradient
      colors={['#FFF8F0', '#F5EFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Container style={[{ flex: 1, backgroundColor: 'transparent' }, style]} {...props}>
        {children}
      </Container>
    </LinearGradient>
  );
}
