'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Chip — küçük etiket/rozet. Oval DEĞİL (rounded-md), balina token'lı.
 * HeroUI v3 Chip yerine; variant + size. */

export type BalinaChipVariant =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';
export type BalinaChipSize = 'sm' | 'md';

const variantClasses: Record<BalinaChipVariant, string> = {
  neutral:
    'bg-[var(--balina-background-dark-default)] text-[var(--balina-text-strong)]',
  accent:
    'bg-[color-mix(in_oklch,var(--accent-blue)_12%,transparent)] text-[var(--accent-blue)]',
  success:
    'bg-[var(--color-success-soft)] text-[var(--color-success-soft-foreground)]',
  warning:
    'bg-[var(--color-warning-soft)] text-[var(--color-warning-soft-foreground)]',
  danger:
    'bg-[color-mix(in_oklch,var(--accent-red)_12%,transparent)] text-[var(--accent-red)]',
};

const sizeClasses: Record<BalinaChipSize, string> = {
  sm: 'h-5 px-1.5 text-body-tiny-medium',
  md: 'h-6 px-2 text-body-small-one-liner-medium',
};

export interface BalinaChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BalinaChipVariant;
  size?: BalinaChipSize;
}

export function BalinaChip({
  variant = 'neutral',
  size = 'md',
  className,
  ...rest
}: BalinaChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
}
