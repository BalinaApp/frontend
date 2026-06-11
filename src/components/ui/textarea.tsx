'use client';

import * as React from 'react';
import { cn } from './cn';
import { useTextField } from './text-field';

/* HeroUI v3 TextArea drop-in — TextField context'inden value/onChange(string). */

export type TextAreaVariant = 'primary' | 'secondary';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextAreaVariant;
  isDisabled?: boolean;
  fullWidth?: boolean;
}

const base =
  'textarea w-full rounded-field border border-field-border bg-field px-3 py-2 ' +
  'text-base text-field-foreground shadow-field outline-none ' +
  'placeholder:text-field-placeholder sm:text-sm transition-colors ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/30 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ variant, isDisabled, fullWidth, className, onChange, value, ...rest }, ref) {
    void fullWidth;
    const tf = useTextField();
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (tf?.onChange) tf.onChange(e.target.value);
      onChange?.(e);
    };
    return (
      <textarea
        ref={ref}
        id={tf?.id}
        name={tf?.name ?? rest.name}
        value={tf ? (tf.value ?? value) : value}
        defaultValue={tf?.defaultValue}
        disabled={isDisabled ?? tf?.isDisabled ?? rest.disabled}
        required={tf?.isRequired}
        readOnly={tf?.isReadOnly ?? rest.readOnly}
        aria-invalid={tf?.isInvalid || undefined}
        onChange={handleChange}
        className={cn(
          base,
          variant === 'secondary' && 'textarea--secondary',
          variant === 'primary' && 'textarea--primary',
          className,
        )}
        {...rest}
      />
    );
  },
);
