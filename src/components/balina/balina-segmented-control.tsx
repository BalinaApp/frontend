'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Segmented Control — kaynak .PaneHeader_paneSegmentedControl spec'inin
 * portu (Messages / Files / People tarzı görünüm seçici). */

export interface BalinaSegment {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

export interface BalinaSegmentedControlProps {
  segments: BalinaSegment[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function BalinaSegmentedControl({
  segments,
  value,
  onChange,
  className,
}: BalinaSegmentedControlProps) {
  return (
    <div role="radiogroup" className={cn('flex items-center gap-1', className)}>
      {segments.map((seg) => {
        const selected = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={seg.disabled}
            onClick={() => onChange?.(seg.value)}
            className={cn(
              'text-body-small-medium inline-flex cursor-pointer items-center justify-center rounded-lg px-2 py-1 outline-none transition-colors focus-visible:outline-none disabled:cursor-default',
              selected
                ? 'bg-[var(--balina-background-dark-default)] text-[var(--balina-text-loud)]'
                : 'text-[var(--balina-text-default)] hover:bg-[var(--balina-background-dark-muted)] hover:text-[var(--balina-text-strong)]',
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

/** PaneHeader bölüm ayracı — 1px × .825rem, yuvarlatılmış, border-strong. */
export function BalinaPaneSeparator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mx-1 h-[0.825rem] w-px shrink-0 rounded-full bg-[var(--balina-border-strong)]',
        className,
      )}
    />
  );
}
