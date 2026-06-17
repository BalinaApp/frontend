'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Button — kaynak "define" tasarım sistemindeki .Button_* spec'inin
 * birebir portu (balina token'larıyla, "define" ismi olmadan). */

export type BalinaButtonVariant =
  | 'primary'
  | 'ghost'
  | 'plain'
  | 'danger'
  | 'soft';
export type BalinaButtonSize = 'small' | 'default' | 'large';

export interface BalinaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BalinaButtonVariant;
  size?: BalinaButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Tam genişlik + öğeler arası boşluk (kaynak newEmailButton deseni). */
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center border-none cursor-pointer select-none whitespace-nowrap ' +
  'no-underline ' +
  'transition-all duration-[var(--transition-duration)] ease-[var(--transition-timing-function)] ' +
  '[&>svg]:text-[var(--balina-icon-strong)] ' +
  'disabled:bg-[var(--balina-background-dark-faint)] disabled:text-[var(--balina-text-faint)] ' +
  'disabled:cursor-not-allowed disabled:pointer-events-none';

const sizeClasses: Record<BalinaButtonSize, string> = {
  small: 'p-0.5 rounded-md',
  default: 'p-1 rounded-lg',
  large: 'p-1.5 rounded-[0.625rem]',
};

const variantClasses: Record<BalinaButtonVariant, string> = {
  primary:
    'bg-[var(--balina-neutral-dark-90)] text-[var(--balina-neutral-light-100)] ' +
    'hover:enabled:bg-[var(--balina-neutral-dark-100)] active:enabled:scale-[0.99]',
  ghost:
    'bg-transparent text-[var(--balina-text-strong)] ' +
    'hover:enabled:bg-[var(--balina-background-dark-default)] hover:enabled:text-[var(--balina-text-loud)] ' +
    'active:enabled:scale-[0.99]',
  plain:
    'bg-transparent text-[var(--balina-text-strong)] ' +
    'hover:enabled:bg-[var(--balina-background-dark-default)] hover:enabled:text-[var(--balina-text-loud)] ' +
    'active:enabled:scale-[0.99]',
  danger:
    'bg-[var(--accent-red)] text-[var(--balina-neutral-light-100)] ' +
    'hover:enabled:bg-[color-mix(in_oklch,var(--accent-red)_96%,black)] active:enabled:scale-[0.99]',
  // newEmailButton deseni — yumuşak dolgulu aksiyon butonu.
  soft:
    'bg-[var(--balina-background-dark-default)] text-[var(--balina-text-strong)] ' +
    'hover:enabled:bg-[var(--balina-background-dark-strong)] hover:enabled:text-[var(--balina-text-loud)] ' +
    'active:enabled:scale-[0.99]',
};

export const BalinaButton = React.forwardRef<HTMLButtonElement, BalinaButtonProps>(
  function BalinaButton(
    { variant = 'plain', size = 'default', leftIcon, rightIcon, className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(base, sizeClasses[size], variantClasses[variant], className)}
        {...rest}
      >
        {leftIcon && (
          <span className="flex shrink-0 items-center justify-center">{leftIcon}</span>
        )}
        {children != null && children !== '' && (
          <span className="text-body-small-one-liner-medium flex-1 px-1">{children}</span>
        )}
        {rightIcon && (
          <span className="flex shrink-0 items-center justify-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);
