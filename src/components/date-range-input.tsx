'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from '@gravity-ui/icons';
import { BalinaCalendar } from '@/components/balina';
import { cn } from '@/components/ui/cn';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeInputProps {
  value?: DateRange;
  onChange?: (range: DateRange | null) => void;
  isDisabled?: boolean;
  className?: string;
  placeholder?: string;
  maxDate?: Date;
  /** Popover'da yan yana görünecek ay sayısı (1 veya 2). */
  visibleMonths?: 1 | 2;
  /** Görsel ton — default beyaz/border'lı; muted gri zemin. */
  tone?: 'default' | 'muted';
}

export function DateRangeInput({
  value,
  onChange,
  isDisabled,
  className,
  placeholder = 'Tarih aralığı',
  maxDate,
  visibleMonths = 1,
  tone = 'default',
}: DateRangeInputProps) {
  const [open, setOpen] = React.useState(false);
  const groupClassName =
    tone === 'muted'
      ? 'border-transparent bg-black/[0.04] hover:bg-black/[0.06]'
      : 'border-field-border bg-field shadow-field';
  const label = value
    ? `${format(value.from, 'd MMM yyyy', { locale: tr })} – ${format(
        value.to,
        'd MMM yyyy',
        { locale: tr },
      )}`
    : placeholder;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={isDisabled}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-xl border px-3 text-sm text-field-foreground outline-none transition-colors disabled:opacity-50',
            !value && 'text-field-placeholder',
            groupClassName,
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted" />
          <span className="flex-1 truncate text-left">{label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="select__popover z-50 outline-none"
        >
          <BalinaCalendar
            mode="range"
            numberOfMonths={visibleMonths}
            defaultMonth={value?.from}
            selected={value ? { from: value.from, to: value.to } : undefined}
            disabled={maxDate ? { after: maxDate } : undefined}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onChange?.({ from: range.from, to: range.to });
                setOpen(false);
              }
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
