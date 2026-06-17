'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { BalinaInput, type BalinaInputProps } from './balina-input';

/* Balina TextField — HeroUI v3 `TextField + Label + Input + Description +
 * FieldError` kompozisyonunun tek-component karşılığı. value-bazlı onChange
 * (HeroUI ergonomisi) verir; altında BalinaInput render eder. */

export interface BalinaTextFieldProps
  extends Omit<BalinaInputProps, 'onChange'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  containerClassName?: string;
}

export const BalinaTextField = React.forwardRef<
  HTMLInputElement,
  BalinaTextFieldProps
>(function BalinaTextField(
  {
    label,
    description,
    error,
    value,
    onChange,
    containerClassName,
    id,
    wrapperClassName,
    ...rest
  },
  ref,
) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-body-small-one-liner-medium px-1 text-[var(--balina-text-strong)]"
        >
          {label}
        </label>
      )}
      <BalinaInput
        ref={ref}
        id={inputId}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={error ? true : undefined}
        wrapperClassName={cn(
          error && 'ring-1 ring-[var(--accent-red)]',
          wrapperClassName,
        )}
        {...rest}
      />
      {description && !error && (
        <p className="text-body-tiny-regular px-1 text-[var(--balina-text-muted)]">
          {description}
        </p>
      )}
      {error && (
        <p className="text-body-tiny-regular px-1 text-[var(--accent-red)]">
          {error}
        </p>
      )}
    </div>
  );
});
