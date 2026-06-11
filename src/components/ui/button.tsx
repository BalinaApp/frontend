'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from './cn';
import { useDialogClose } from './dialog-context';

/* HeroUI v3 Button drop-in — Radix Slot + app tema token'ları ile birebir görünüm.
 * onPress/isDisabled/isIconOnly/isPending/fullWidth/slot="close" HeroUI prop'ları
 * desteklenir, böylece çağıran dosyalarda yalnızca import yolu değişir. */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'danger-soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'relative isolate inline-flex h-10 md:h-9 w-fit origin-center items-center justify-center gap-2 ' +
  'rounded-3xl px-4 text-sm font-medium whitespace-nowrap outline-none select-none ' +
  'transition-[transform,background-color,box-shadow] duration-100 ' +
  'active:scale-[0.97] data-[pressed=true]:scale-[0.97] ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/40 ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'aria-disabled:opacity-50 aria-disabled:pointer-events-none ' +
  "[&_svg:not([data-slot=spinner]_svg)]:size-5 sm:[&_svg:not([data-slot=spinner]_svg)]:size-4 [&_svg]:shrink-0";

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent-hover',
  secondary: 'bg-default text-accent-soft-foreground hover:bg-default-hover',
  tertiary: 'bg-default text-foreground hover:bg-default-hover',
  ghost: 'bg-transparent text-default-foreground hover:bg-default',
  outline:
    'border border-border bg-transparent text-default-foreground hover:bg-default/60',
  danger: 'bg-danger text-danger-foreground hover:bg-danger-hover',
  'danger-soft':
    'bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft-hover',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 md:h-8 px-3 active:scale-[0.98]',
  md: '',
  lg: 'h-11 md:h-10 text-base active:scale-[0.96]',
};

const iconOnlySize: Record<ButtonSize, string> = {
  sm: 'w-9 md:w-8 px-0',
  md: 'w-10 md:w-9 px-0',
  lg: 'w-11 md:w-10 px-0',
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isIconOnly?: boolean;
  isDisabled?: boolean;
  isPending?: boolean;
  fullWidth?: boolean;
  /** HeroUI uyumu — slot="close" ise parent dialog'u kapatır. */
  slot?: string;
  /** Radix Slot — child element'i button gibi davrandırır. */
  asChild?: boolean;
  onPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'tertiary',
      size = 'md',
      isIconOnly = false,
      isDisabled,
      isPending,
      fullWidth,
      slot,
      asChild,
      className,
      onPress,
      onClick,
      type,
      disabled,
      children,
      ...rest
    },
    ref,
  ) {
    const close = useDialogClose();
    const Comp = asChild ? Slot : 'button';

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onPress?.(e);
      if (slot === 'close' && !e.defaultPrevented) close?.();
    };

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        disabled={asChild ? undefined : (disabled ?? isDisabled)}
        aria-disabled={isDisabled || undefined}
        data-pending={isPending || undefined}
        onClick={handleClick}
        className={cn(
          base,
          variantClasses[variant],
          isIconOnly ? iconOnlySize[size] : sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
