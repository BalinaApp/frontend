'use client';

import * as React from 'react';
import * as RCheckbox from '@radix-ui/react-checkbox';
import { Check } from '@gravity-ui/icons';
import { cn } from './cn';

/* HeroUI v3 Checkbox drop-in — Radix Checkbox. Hem basit (label child) hem
 * compound (<Checkbox.Control><Checkbox.Indicator/></Checkbox.Control>) kullanım. */

export interface CheckboxProps {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  isDisabled?: boolean;
  className?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
  value?: string;
  children?: React.ReactNode;
}

function Control({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-field text-accent-foreground transition-colors',
        'group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent',
        className,
      )}
    >
      {children}
    </span>
  );
}

function Indicator({ className }: { className?: string }) {
  return (
    <RCheckbox.Indicator className={className}>
      <Check className="h-3 w-3" />
    </RCheckbox.Indicator>
  );
}

function CheckboxRoot({
  isSelected,
  defaultSelected,
  onChange,
  isDisabled,
  className,
  children,
  id,
  ...rest
}: CheckboxProps) {
  const reactId = React.useId();
  const cid = id ?? reactId;
  const hasControl = React.Children.toArray(children).some(
    (c) => React.isValidElement(c) && c.type === Control,
  );

  const root = (
    <RCheckbox.Root
      id={cid}
      checked={isSelected}
      defaultChecked={defaultSelected}
      onCheckedChange={(c) => onChange?.(c === true)}
      disabled={isDisabled}
      className={cn(
        'group inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/40 disabled:cursor-not-allowed disabled:opacity-50',
        hasControl ? className : undefined,
      )}
      {...rest}
    >
      {hasControl ? (
        children
      ) : (
        <Control>
          <Indicator />
        </Control>
      )}
    </RCheckbox.Root>
  );

  // Compound kullanım: Root içine Control/Indicator gelir.
  if (hasControl) return root;
  // Basit kullanım: kutu + label.
  if (!children) return root;
  return (
    <label htmlFor={cid} className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', className)}>
      {root}
      {children}
    </label>
  );
}

export const Checkbox = Object.assign(CheckboxRoot, { Control, Indicator });
