'use client';

import * as React from 'react';
import * as Switch from '@radix-ui/react-switch';
import { cn } from '@/components/ui/cn';

/* Balina Switch — Radix Switch üzerine, balina token'larıyla. Thumb animasyonlu
 * (transition-transform, cubic). */

export interface BalinaSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BalinaSwitch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  children,
  className,
}: BalinaSwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex select-none items-center gap-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <Switch.Root
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-[var(--transition-duration)]',
          'bg-[var(--balina-background-dark-loud)]',
          'data-[state=checked]:bg-[var(--balina-neutral-dark-100)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Switch.Thumb
          className={cn(
            'block h-4 w-4 translate-x-0.5 rounded-full bg-[var(--balina-neutral-light-1000)] shadow-elevation-small',
            'transition-transform duration-[var(--transition-duration)] ease-[cubic-bezier(0.4,0,0.2,1)]',
            'data-[state=checked]:translate-x-[1.125rem]',
          )}
        />
      </Switch.Root>
      {children && (
        <span className="text-body-small-medium text-[var(--balina-text-strong)]">{children}</span>
      )}
    </label>
  );
}
