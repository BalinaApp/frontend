'use client';

import * as React from 'react';
import { Magnifier } from '@gravity-ui/icons';
import { cn } from './cn';

/* HeroUI v3 SearchField drop-in — value/onChange(string). Compound:
 * SearchField.Group + SearchField.SearchIcon + SearchField.Input.
 * `.search-field__group` + `.search-field--secondary` sınıfları korunur. */

interface SearchCtx {
  value?: string;
  onChange?: (v: string) => void;
  isDisabled?: boolean;
}
const Ctx = React.createContext<SearchCtx | null>(null);

interface SearchFieldProps {
  variant?: 'primary' | 'secondary';
  value?: string;
  onChange?: (v: string) => void;
  isDisabled?: boolean;
  className?: string;
  'aria-label'?: string;
  children?: React.ReactNode;
}

function SearchFieldRoot({
  variant,
  value,
  onChange,
  isDisabled,
  className,
  children,
  ...rest
}: SearchFieldProps) {
  return (
    <Ctx.Provider value={{ value, onChange, isDisabled }}>
      <div
        className={cn(
          'search-field flex flex-col gap-1.5',
          variant === 'secondary' && 'search-field--secondary',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

function Group({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'search-field__group flex h-9 items-center gap-2 rounded-field border border-field-border bg-field px-3 text-sm shadow-field',
        className,
      )}
      {...rest}
    />
  );
}

function SearchIcon({ className }: { className?: string }) {
  return <Magnifier className={cn('h-4 w-4 shrink-0 text-muted', className)} />;
}

const SInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function SearchInput({ className, onChange, ...rest }, ref) {
    const ctx = React.useContext(Ctx);
    return (
      <input
        ref={ref}
        type="search"
        value={ctx?.value ?? rest.value}
        disabled={ctx?.isDisabled ?? rest.disabled}
        onChange={(e) => {
          ctx?.onChange?.(e.target.value);
          onChange?.(e);
        }}
        className={cn(
          'w-full bg-transparent text-field-foreground placeholder:text-field-placeholder outline-none [&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const SearchField = Object.assign(SearchFieldRoot, {
  Group,
  SearchIcon,
  Input: SInput,
});
