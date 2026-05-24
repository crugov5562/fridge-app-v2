import React from 'react';
import { ScrollView, View, type ViewProps, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/utils/cn';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  className?: string;
  safe?: boolean;
};

export function Screen({ scroll, scrollProps, className, safe = true, children, ...props }: ScreenProps) {
  const Container = safe ? SafeAreaView : View;

  if (scroll) {
    return (
      <Container className="flex-1 bg-background" {...(props as ViewProps)}>
        <ScrollView
          className={cn('flex-1', className)}
          contentContainerClassName="flex-grow"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container
      className={cn('flex-1 bg-background', className)}
      {...(props as ViewProps)}
    >
      {children}
    </Container>
  );
}
