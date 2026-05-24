import React from 'react';
import * as ProgressPrimitive from '@rn-primitives/progress';
import { cn } from '@/utils/cn';

type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  className?: string;
  indicatorClassName?: string;
};

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full bg-accent', indicatorClassName)}
        style={{ width: `${value ?? 0}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
