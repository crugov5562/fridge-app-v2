import React, { useEffect, useRef } from 'react';
import { Animated, type ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

type SkeletonProps = ViewProps & {
  className?: string;
};

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={cn('rounded-xl bg-muted', className)}
      {...props}
    />
  );
}
