import React from 'react';
import { View, Text, type ViewProps, type TextProps } from 'react-native';
import { cn } from '@/utils/cn';

type CardProps = ViewProps & { className?: string };

export function Card({ className, children, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-2xl border border-border bg-card', className)}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('flex-col gap-1.5 p-4', className)} {...props}>
      {children}
    </View>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('p-4 pt-0', className)} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('flex-row items-center p-4 pt-0', className)} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-lg font-semibold text-card-foreground', className)} {...props}>
      {children}
    </Text>
  );
}

export function CardDescription({ className, children, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </Text>
  );
}
