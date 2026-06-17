'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Matcher } from 'react-day-picker';
import { cn } from '@/components/ui/cn';
import { BalinaCalendar } from './balina-calendar';
import { BalinaPopover } from './balina-popover';
import { BalinaCalendarIcon } from './icons';

/* Balina Date Picker — buton tetikleyici + popover içinde BalinaCalendar (tek
 * tarih). Native <input type="date"> yerine. Değer 'yyyy-MM-dd' string. */

export interface BalinaDatePickerProps {
  value?: string; // 'yyyy-MM-dd'
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Takvimde kapatılacak tarihler (örn. { after: new Date() }). */
  disabledDates?: Matcher | Matcher[];
  className?: string;
}

function parseYmd(v?: string): Date | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function BalinaDatePicker({
  value,
  onChange,
  placeholder = 'gg.aa.yyyy',
  disabled,
  disabledDates,
  className,
}: BalinaDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseYmd(value);
  const label = selected
    ? format(selected, 'd MMM yyyy', { locale: tr })
    : placeholder;

  return (
    <BalinaPopover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="start"
      noAutoFocus
      className="w-fit max-w-none overflow-hidden p-1"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'text-body-small-medium flex h-9 w-full items-center gap-2 rounded-[0.625rem] bg-[var(--balina-background-dark-muted)] px-3 text-left outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <BalinaCalendarIcon className="h-4 w-4 shrink-0 text-[var(--balina-icon-strong)]" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected
                ? 'text-[var(--balina-text-strong)]'
                : 'text-[var(--balina-text-faint)]',
            )}
          >
            {label}
          </span>
        </button>
      }
    >
      <BalinaCalendar
        mode="single"
        selected={selected}
        onSelect={(d: Date | undefined) => {
          onChange?.(d ? format(d, 'yyyy-MM-dd') : '');
          if (d) setOpen(false);
        }}
        disabled={disabledDates}
      />
    </BalinaPopover>
  );
}
