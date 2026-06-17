'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina InputOTP — N haneli doğrulama kodu (balina token'larıyla).
 * Auto-advance + backspace + paste; yalnızca rakam. */

export interface BalinaInputOTPProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function BalinaInputOTP({
  length = 6,
  value,
  onChange,
  disabled,
  className,
}: BalinaInputOTPProps) {
  const [internal, setInternal] = React.useState<string[]>(() => Array(length).fill(''));
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  const arr =
    value !== undefined ? Array.from({ length }, (_, i) => value[i] ?? '') : internal;

  const emit = (next: string[]) => {
    if (value === undefined) setInternal(next);
    onChange?.(next.join(''));
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...arr];
    next[i] = digit;
    emit(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const next = [...arr];
      if (next[i]) {
        next[i] = '';
        emit(next);
      } else if (i > 0) {
        next[i - 1] = '';
        emit(next);
        refs.current[i - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    emit(Array.from({ length }, (_, i) => text[i] ?? ''));
    e.preventDefault();
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={arr[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Hane ${i + 1}`}
          className={cn(
            // BalinaInput ile birebir: border yok, bg-muted (dolu/hover/focus → default).
            'h-11 w-9 rounded-lg border-none text-center text-[0.8125rem] outline-none',
            'text-[var(--balina-text-loud)] transition-colors duration-[var(--transition-duration)]',
            arr[i]
              ? 'bg-[var(--balina-background-dark-default)]'
              : 'bg-[var(--balina-background-dark-muted)]',
            'hover:bg-[var(--balina-background-dark-default)] focus:bg-[var(--balina-background-dark-default)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ))}
    </div>
  );
}
