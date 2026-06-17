'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Textarea — BalinaInput hissiyatında çok satırlı alan. Aynı wrapper
 * stili; dolu (placeholder gizli) ya da focus durumunda dolgu uygular. */

export type BalinaTextareaVariant = 'default' | 'ghost';
export type BalinaTextareaFieldSize = 'small' | 'default' | 'large';

export interface BalinaTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  variant?: BalinaTextareaVariant;
  fieldSize?: BalinaTextareaFieldSize;
  wrapperClassName?: string;
}

const wrapperBase =
  'flex items-start gap-0.5 relative ' +
  'transition-all duration-[var(--transition-duration)] ease-[var(--transition-timing-function)]';

const wrapperSize: Record<BalinaTextareaFieldSize, string> = {
  small: 'p-0.5 rounded-md',
  default: 'p-1 rounded-lg',
  large: 'p-1.5 rounded-[0.625rem]',
};

// Dolu (placeholder gizli) ya da focus → aynı dolgu stili (BalinaInput ile birebir).
const filledFocus =
  'focus-within:bg-[var(--balina-background-dark-default)] ' +
  'has-[:not(:placeholder-shown)]:bg-[var(--balina-background-dark-default)]';

const wrapperVariant: Record<BalinaTextareaVariant, string> = {
  default:
    'bg-[var(--balina-background-dark-muted)] hover:bg-[var(--balina-background-dark-default)] ' +
    filledFocus,
  ghost:
    'bg-transparent text-[var(--balina-text-strong)] ' +
    'hover:bg-[var(--balina-background-dark-default)] ' +
    filledFocus,
};

export const BalinaTextarea = React.forwardRef<HTMLTextAreaElement, BalinaTextareaProps>(
  function BalinaTextarea(
    {
      variant = 'default',
      fieldSize = 'default',
      disabled,
      rows = 3,
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
        <textarea
          ref={ref}
          disabled={disabled}
          rows={rows}
          className={cn(
            'min-h-16 w-full flex-1 resize-none border-none bg-transparent px-1 py-0.5 text-[0.8125rem] outline-none',
            'text-[var(--balina-text-loud)] placeholder:text-[var(--balina-text-muted)]',
            'disabled:cursor-not-allowed disabled:text-[var(--balina-text-faint)]',
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);
