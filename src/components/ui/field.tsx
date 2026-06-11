'use client';

import * as React from 'react';
import { cn } from './cn';
import { useTextField } from './text-field';

/* HeroUI v3 FieldError + Description + InputGroup drop-in. */

export function FieldError({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  if (!children) return null;
  return (
    <span className={cn('field-error text-xs text-danger', className)} {...rest}>
      {children}
    </span>
  );
}

export function Description({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('field-description text-xs text-muted', className)} {...rest}>
      {children}
    </span>
  );
}

/** HeroUI InputGroup — input + yan eklentiler (suffix/prefix). Compound. */
function InputGroupRoot({
  variant,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'primary' | 'secondary' }) {
  return (
    <div
      className={cn(
        'input-group flex h-10 items-center overflow-hidden rounded-field border border-field-border bg-field text-sm shadow-field md:h-9',
        'focus-within:ring-2 focus-within:ring-[var(--color-focus)]/30',
        variant === 'secondary' && 'input-group--secondary',
        className,
      )}
      {...rest}
    />
  );
}

const GroupInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function GroupInput({ className, onChange, value, ...rest }, ref) {
    const tf = useTextField();
    return (
      <input
        ref={ref}
        id={tf?.id}
        value={tf ? (tf.value ?? value) : value}
        disabled={tf?.isDisabled ?? rest.disabled}
        onChange={(e) => {
          tf?.onChange?.(e.target.value);
          onChange?.(e);
        }}
        className={cn(
          'w-full bg-transparent px-3 py-2 text-field-foreground outline-none placeholder:text-field-placeholder',
          className,
        )}
        {...rest}
      />
    );
  },
);

function Suffix({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('shrink-0 px-3 text-muted', className)} {...rest} />
  );
}

function Prefix({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('shrink-0 pl-3 text-muted', className)} {...rest} />
  );
}

export const InputGroup = Object.assign(InputGroupRoot, {
  Input: GroupInput,
  Suffix,
  Prefix,
});
