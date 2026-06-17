'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { tr } from 'react-day-picker/locale';
import { ChevronLeft, ChevronRight } from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';

/* Balina Calendar — kaynak .Calendar_* spec'inin portu (rdp v10 + balina token).
 * single/range/multiple. Ay geçişinde cubic slide (tüm blok; kayarken seçim gizli).
 * Başlığa tıklayınca ay seçimi, tekrar tıklayınca yıl seçimi açılır. */

export type BalinaCalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTHS_SHORT = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

const gridBtn =
  'flex h-9 items-center justify-center rounded-[10px] border-none bg-transparent cursor-pointer ' +
  'text-body-small-medium text-[var(--balina-text-strong)] transition-colors ' +
  'hover:bg-[var(--balina-background-dark-default)]';
const gridBtnActive =
  'bg-[var(--balina-neutral-dark-100)] text-[var(--balina-background-light-shout)] ' +
  'hover:bg-[var(--balina-neutral-dark-90)]';
const navBtn =
  'pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg ' +
  'text-[var(--balina-icon-strong)] cursor-pointer transition-colors ' +
  'hover:bg-[var(--balina-background-dark-default)]';
const captionBtn =
  'text-body-default-medium rounded-lg px-2 py-0.5 text-[var(--balina-text-loud)] cursor-pointer ' +
  'transition-colors hover:bg-[var(--balina-background-dark-default)]';

export function BalinaCalendar({
  className,
  classNames,
  month: monthProp,
  defaultMonth,
  onMonthChange,
  ...props
}: BalinaCalendarProps) {
  const [month, setMonth] = React.useState<Date | undefined>(monthProp ?? defaultMonth);
  const [view, setView] = React.useState<'days' | 'months' | 'years'>('days');
  const [dir, setDir] = React.useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (monthProp) setMonth(monthProp);
  }, [monthProp]);
  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const base = month ?? new Date();
  const year = base.getFullYear();
  const setMonthValue = (d: Date) => {
    setMonth(d);
    onMonthChange?.(d);
  };

  const handleMonthChange = (m: Date) => {
    setDir(month && m.getTime() < month.getTime() ? 'prev' : 'next');
    setMonth(m);
    setAnimating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAnimating(false), 320);
    onMonthChange?.(m);
  };

  // ----- Ay seçimi görünümü -----
  if (view === 'months') {
    return (
      <div className="w-full p-2">
        <div className="relative mb-4 flex h-8 items-center justify-center">
          <button type="button" className={captionBtn} onClick={() => setView('years')}>
            {year}
          </button>
          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-between">
            <button type="button" aria-label="Önceki yıl" className={navBtn}
              onClick={() => setMonthValue(new Date(year - 1, base.getMonth(), 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Sonraki yıl" className={navBtn}
              onClick={() => setMonthValue(new Date(year + 1, base.getMonth(), 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_SHORT.map((name, m) => (
            <button
              key={m}
              type="button"
              className={cn(gridBtn, m === base.getMonth() && gridBtnActive)}
              onClick={() => {
                setMonthValue(new Date(year, m, 1));
                setView('days');
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ----- Yıl seçimi görünümü -----
  if (view === 'years') {
    const blockStart = year - (((year % 12) + 12) % 12);
    const years = Array.from({ length: 12 }, (_, i) => blockStart + i);
    return (
      <div className="w-full p-2">
        <div className="relative mb-4 flex h-8 items-center justify-center">
          <span className="text-body-default-medium px-2 text-[var(--balina-text-loud)]">
            {blockStart}–{blockStart + 11}
          </span>
          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-between">
            <button type="button" aria-label="Önceki" className={navBtn}
              onClick={() => setMonthValue(new Date(year - 12, base.getMonth(), 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Sonraki" className={navBtn}
              onClick={() => setMonthValue(new Date(year + 12, base.getMonth(), 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={cn(gridBtn, y === year && gridBtnActive)}
              onClick={() => {
                setMonthValue(new Date(y, base.getMonth(), 1));
                setView('months');
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ----- Gün görünümü -----
  const monthKey = month ? `${month.getFullYear()}-${month.getMonth()}` : 'init';
  const surfaceVars = {
    '--cal-band': animating ? 'transparent' : 'var(--balina-background-dark-default)',
    '--cal-sel': animating ? 'transparent' : 'var(--balina-neutral-dark-100)',
    '--cal-sel-fg': animating
      ? 'var(--balina-text-strong)'
      : 'var(--balina-background-light-shout)',
  } as React.CSSProperties;

  return (
    <div className="relative w-full overflow-hidden p-2" style={surfaceVars}>
      <div
        key={monthKey}
        className={cn(
          'animate-in fade-in-0 duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          dir === 'next' ? 'slide-in-from-right-5' : 'slide-in-from-left-5',
        )}
      >
        <DayPicker
          locale={tr}
          showOutsideDays
          month={month}
          onMonthChange={handleMonthChange}
          className={cn('w-full', className)}
          classNames={{
            months: 'relative flex flex-col',
            month: 'flex flex-col',
            month_caption: 'flex items-center justify-center h-8 mb-4',
            caption_label: 'text-body-default-medium text-[var(--balina-text-loud)]',
            nav: 'absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between',
            button_previous:
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent ' +
              'text-[var(--balina-icon-strong)] cursor-pointer transition-colors outline-none ' +
              'hover:bg-[var(--balina-background-dark-default)] disabled:opacity-40 disabled:pointer-events-none',
            button_next:
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent ' +
              'text-[var(--balina-icon-strong)] cursor-pointer transition-colors outline-none ' +
              'hover:bg-[var(--balina-background-dark-default)] disabled:opacity-40 disabled:pointer-events-none',
            month_grid: 'w-full border-collapse',
            weekdays: 'flex',
            weekday:
              'w-8 pt-2.5 pb-2 text-center text-body-small-medium text-[var(--balina-text-muted)]',
            week: 'flex w-full',
            day: 'h-8 w-8 p-0 text-center',
            day_button:
              'mx-auto grid h-8 w-8 place-items-center rounded-[10px] border-none bg-transparent cursor-pointer ' +
              'text-body-small-medium text-[var(--balina-text-strong)] ' +
              'hover:not-disabled:bg-[var(--balina-background-dark-default)]',
            selected:
              '[&>button]:!rounded-[10px] [&>button]:bg-[var(--cal-sel)] [&>button]:text-[var(--cal-sel-fg)] ' +
              '[&>button]:hover:not-disabled:bg-[var(--balina-neutral-dark-90)]',
            today: '[&>button]:font-semibold',
            outside:
              '[&>button]:text-[var(--balina-text-faint)] [&>button]:opacity-50 [&>button]:pointer-events-none',
            disabled: '[&>button]:text-[var(--balina-text-faint)] [&>button]:opacity-50 [&>button]:pointer-events-none',
            range_start:
              '[&>button]:!rounded-[10px] [&>button]:bg-[var(--cal-sel)] [&>button]:text-[var(--cal-sel-fg)] ' +
              'rounded-l-[10px] bg-[var(--cal-band)]',
            range_end:
              '[&>button]:!rounded-[10px] [&>button]:bg-[var(--cal-sel)] [&>button]:text-[var(--cal-sel-fg)] ' +
              'rounded-r-[10px] bg-[var(--cal-band)]',
            range_middle:
              'bg-[var(--cal-band)] [&>button]:!bg-transparent ' +
              '[&>button]:!text-[var(--balina-text-strong)] [&>button]:!rounded-none [&>button]:!font-normal',
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
            CaptionLabel: ({ children }) => (
              <button type="button" className={captionBtn} onClick={() => setView('months')}>
                {children}
              </button>
            ),
          }}
          {...props}
        />
      </div>
    </div>
  );
}
