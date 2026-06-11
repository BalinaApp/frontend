'use client';

import * as React from 'react';
import { cn } from './cn';
import { useTextField } from './text-field';

/* HeroUI v3 Input drop-in — TextField context'i varsa value/onChange(string)/id/
 * disabled oradan; yoksa standalone native props. `.input` sınıfı + birebir taban
 * görünüm (rounded-field/bg-field/shadow-field). */

export type InputVariant = 'primary' | 'secondary';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  isDisabled?: boolean;
  fullWidth?: boolean;
}

const base =
  'input w-full rounded-field border border-field-border bg-field px-3 py-2 ' +
  'text-base text-field-foreground shadow-field outline-none ' +
  'placeholder:text-field-placeholder sm:text-sm transition-colors ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/30 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { variant, isDisabled, fullWidth, className, onChange, type, value, ...rest },
    ref,
  ) {
    void fullWidth;
    const tf = useTextField();
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (tf?.onChange) tf.onChange(e.target.value);
      onChange?.(e);
    };
    return (
      <input
        ref={ref}
        id={tf?.id}
        name={tf?.name ?? rest.name}
        type={type ?? tf?.type ?? 'text'}
        value={tf ? (tf.value ?? value) : value}
        defaultValue={tf?.defaultValue}
        disabled={isDisabled ?? tf?.isDisabled ?? rest.disabled}
        required={tf?.isRequired}
        readOnly={tf?.isReadOnly ?? rest.readOnly}
        aria-invalid={tf?.isInvalid || undefined}
        onChange={handleChange}
        className={cn(
          base,
          variant === 'secondary' && 'input--secondary',
          variant === 'primary' && 'input--primary',
          className,
        )}
        {...rest}
      />
    );
  },
);
