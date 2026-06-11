'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from '@gravity-ui/icons';
import { tr } from 'react-day-picker/locale';
import { cn } from './cn';

/* react-day-picker (v10) tabanlı takvim — HeroUI Calendar/RangeCalendar yerine.
 * JS Date ile çalışır; range ve single modlarını destekler. Türkçe locale. */

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={tr}
      showOutsideDays
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-center items-center h-8 relative',
        caption_label: 'text-sm font-medium text-foreground',
        nav: 'flex items-center gap-1 absolute inset-x-0 top-0 justify-between px-0',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-default outline-none',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-default outline-none',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[11px] font-normal text-muted',
        week: 'flex w-full mt-1',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-lg outline-none hover:bg-default aria-selected:opacity-100',
        selected:
          '[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:hover:bg-accent',
        today: '[&>button]:font-semibold [&>button]:text-accent',
        outside: 'text-muted/50',
        disabled: 'text-muted/40 pointer-events-none',
        range_start:
          '[&>button]:bg-accent [&>button]:text-accent-foreground rounded-l-lg bg-accent/15',
        range_end:
          '[&>button]:bg-accent [&>button]:text-accent-foreground rounded-r-lg bg-accent/15',
        range_middle:
          'bg-accent/15 [&>button]:bg-transparent [&>button]:text-foreground [&>button]:rounded-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
