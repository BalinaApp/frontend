'use client';

import * as React from 'react';
import { cn } from './cn';

/* HeroUI v3 Chip drop-in — küçük etiket/rozet. variant + size. */

type ChipVariant = 'primary' | 'secondary' | 'tertiary' | 'soft';
type ChipSize = 'sm' | 'md';

const variantClasses: Record<ChipVariant, string> = {
  primary: 'bg-accent text-accent-foreground',
  secondary: 'bg-default text-foreground',
  tertiary: 'bg-transparent text-muted ring-1 ring-inset ring-border',
  soft: 'bg-accent-soft text-accent-soft-foreground',
};

const sizeClasses: Record<ChipSize, string> = {
  sm: 'h-5 px-2 text-[11px]',
  md: 'h-6 px-2.5 text-xs',
};

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: ChipSize;
}

export function Chip({
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
}
