'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Radio — kontrollü radyo grubu (balina token'larıyla). Seçili dot
 * scale animasyonuyla belirir. */

export interface BalinaRadioOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface BalinaRadioGroupProps {
  options: BalinaRadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function BalinaRadioGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: BalinaRadioGroupProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  const set = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <div role="radiogroup" className={cn('flex flex-col gap-2', className)}>
      {options.map((opt) => {
        const selected = current === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              'inline-flex select-none items-center gap-2',
              opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={opt.disabled}
              onClick={() => set(opt.value)}
              className={cn(
                'flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border outline-none',
                'transition-colors duration-[var(--transition-duration)]',
                selected
                  ? 'border-[var(--balina-neutral-dark-100)]'
                  : 'border-[var(--balina-border-strong)] enabled:hover:bg-[var(--balina-background-dark-default)]',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full bg-[var(--balina-neutral-dark-100)]',
                  'transition-transform duration-[var(--transition-duration)] ease-[cubic-bezier(0.4,0,0.2,1)]',
                  selected ? 'scale-100' : 'scale-0',
                )}
              />
            </button>
            <span className="text-body-small-medium text-[var(--balina-text-strong)]">
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
