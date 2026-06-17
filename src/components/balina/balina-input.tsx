'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Input — kaynak .Input_* spec'inin portu (balina token'larıyla). */

export type BalinaInputVariant = 'default' | 'ghost';
export type BalinaInputFieldSize = 'small' | 'default' | 'large';

export interface BalinaInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: BalinaInputVariant;
  fieldSize?: BalinaInputFieldSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

const wrapperBase =
  'flex items-center gap-0.5 relative ' +
  'transition-all duration-[var(--transition-duration)] ease-[var(--transition-timing-function)]';

const wrapperSize: Record<BalinaInputFieldSize, string> = {
  small: 'p-0.5 rounded-md',
  default: 'p-1 rounded-lg',
  large: 'p-1.5 rounded-[0.625rem]',
};

// Dolu (placeholder gizli) ya da focus → aynı dolgu stili.
const filledFocus =
  'focus-within:bg-[var(--balina-background-dark-default)] ' +
  'has-[:not(:placeholder-shown)]:bg-[var(--balina-background-dark-default)]';

const wrapperVariant: Record<BalinaInputVariant, string> = {
  default:
    'bg-[var(--balina-background-dark-muted)] hover:bg-[var(--balina-background-dark-default)] ' +
    filledFocus,
  // Ghost: dingin halde şeffaf; hover/focus/dolu'da normal input gibi renk dolgusu alır.
  ghost:
    'bg-transparent text-[var(--balina-text-strong)] ' +
    'hover:bg-[var(--balina-background-dark-default)] ' +
    filledFocus,
};

const iconWrapper =
  'flex shrink-0 items-center justify-center p-0.5 text-[var(--balina-icon-default)]';

export const BalinaInput = React.forwardRef<HTMLInputElement, BalinaInputProps>(
  function BalinaInput(
    {
      variant = 'default',
      fieldSize = 'default',
      leftIcon,
      rightIcon,
      disabled,
      className,
      wrapperClassName,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        className={cn(
          wrapperBase,
          wrapperSize[fieldSize],
          wrapperVariant[variant],
          disabled &&
            'pointer-events-none cursor-not-allowed bg-[var(--balina-background-dark-faint)] text-[var(--balina-text-faint)]',
          wrapperClassName,
        )}
      >
        {leftIcon && <span className={iconWrapper}>{leftIcon}</span>}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'h-5 min-w-0 flex-1 border-none bg-transparent px-1 text-[0.8125rem] outline-none',
            'text-[var(--balina-text-loud)] placeholder:text-[var(--balina-text-muted)]',
            'disabled:cursor-not-allowed disabled:text-[var(--balina-text-faint)]',
            className,
          )}
          {...rest}
        />
        {rightIcon && <span className={iconWrapper}>{rightIcon}</span>}
      </div>
    );
  },
);
