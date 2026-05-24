import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      default: 'text-base',
      h1: 'text-4xl font-extrabold',
      h2: 'text-2xl font-bold',
      h3: 'text-xl font-semibold',
      h4: 'text-lg font-semibold',
      body: 'text-base',
      sm: 'text-sm',
      xs: 'text-xs',
      muted: 'text-sm text-muted-foreground',
      label: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type TextComponentProps = TextProps &
  VariantProps<typeof textVariants> & {
    className?: string;
  };

export function Text({ variant, className, ...props }: TextComponentProps) {
  return (
    <RNText
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  );
}
