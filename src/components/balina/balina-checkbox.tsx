'use client';

import * as React from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { cn } from '@/components/ui/cn';

/* Balina Checkbox — Radix Checkbox üzerine, balina token'larıyla.
 * İşaretlenince check ikonu çizim (stroke-draw) animasyonuyla belirir. */

export interface BalinaCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** Yanında etiket. */
  children?: React.ReactNode;
  className?: string;
}

export function BalinaCheckbox({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  children,
  className,
}: BalinaCheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex select-none items-center gap-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <Checkbox.Root
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        disabled={disabled}
        className={cn(
          'flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-[0.375rem] border outline-none',
          'transition-colors duration-[var(--transition-duration)]',
          'border-[var(--balina-border-strong)] bg-[var(--balina-background-dark-muted)]',
          // hover yalnızca işaretsizken (checked'i soluklaştırmasın)
          'data-[state=unchecked]:hover:bg-[var(--balina-background-dark-default)]',
          'data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--balina-neutral-dark-100)]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
        )}
      >
        <Checkbox.Indicator className="flex items-center justify-center text-[var(--balina-background-light-shout)]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              className="balina-check-path"
              d="M3.625 8.8851L6.25 11.5413L12.375 4.45801"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {children && (
        <span className="text-body-small-medium text-[var(--balina-text-strong)]">{children}</span>
      )}
    </label>
  );
}
