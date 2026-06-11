'use client';

import * as React from 'react';
import * as RSwitch from '@radix-ui/react-switch';
import { cn } from './cn';

/* HeroUI v3 Switch drop-in — Radix Switch. Compound: Switch.Control (track wrapper)
 * + Switch.Thumb (knob). Root track stilini taşır; Control şeffaf geçiş. */

interface SwitchProps {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  isDisabled?: boolean;
  className?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
  children?: React.ReactNode;
}

function SwitchRoot({
  isSelected,
  defaultSelected,
  onChange,
  isDisabled,
  className,
  children,
  ...rest
}: SwitchProps) {
  return (
    <RSwitch.Root
      checked={isSelected}
      defaultChecked={defaultSelected}
      onCheckedChange={onChange}
      disabled={isDisabled}
      className={cn(
        'group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none transition-colors',
        'bg-default data-[state=checked]:bg-accent',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </RSwitch.Root>
  );
}

function Control({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function Thumb({ className }: { className?: string }) {
  return (
    <RSwitch.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
        'translate-x-0 data-[state=checked]:translate-x-5',
        className,
      )}
    />
  );
}

export const Switch = Object.assign(SwitchRoot, { Control, Thumb });
