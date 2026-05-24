import React from 'react';
import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Haptics from 'expo-haptics';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-full active:opacity-80',
  {
    variants: {
      variant: {
        primary: 'bg-primary',
        emerald: 'bg-accent',
        secondary: 'bg-secondary border border-border',
        ghost: 'bg-transparent',
        destructive: 'bg-destructive',
        outline: 'bg-transparent border border-border',
      },
      size: {
        sm: 'h-9 px-4 gap-1.5',
        md: 'h-11 px-5 gap-2',
        lg: 'h-14 px-6 gap-2.5',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      emerald: 'text-accent-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-accent',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-base',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
    isLoading?: boolean;
    className?: string;
    textClassName?: string;
  };

export function Button({
  children,
  variant,
  size,
  isLoading,
  className,
  textClassName,
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
      onPress={handlePress}
      disabled={disabled || isLoading}
      accessibilityRole="button"
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'emerald' || variant === 'destructive'
              ? '#fff'
              : '#6366F1'
          }
        />
      ) : typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
