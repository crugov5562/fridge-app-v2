import React, { forwardRef, useState } from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { cn } from '@/utils/cn';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  containerClassName?: string;
};

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, className, containerClassName, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={cn('gap-1.5', containerClassName)}>
        {label && (
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        )}
        <TextInput
          ref={ref}
          className={cn(
            'h-11 rounded-xl border bg-card px-4 text-base text-foreground',
            isFocused ? 'border-ring' : 'border-input',
            error && 'border-destructive',
            className
          )}
          placeholderTextColor="#71717A"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <Text className="text-sm text-destructive">{error}</Text>
        )}
        {hint && !error && (
          <Text className="text-sm text-muted-foreground">{hint}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
