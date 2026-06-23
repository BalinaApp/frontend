'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Select Tag — Notion-tarzı renkli soft etiket (select/multi-select
 * property değerleri için). Renkler design-system accent token'larından
 * color-mix ile türetilir (yumuşak zemin + okunur koyu metin). */

export type BalinaTagTone =
  | 'gray'
  | 'red'
  | 'amber'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink';

const TONES: Record<BalinaTagTone, string> = {
  gray: 'bg-[var(--balina-background-dark-default)] text-[var(--balina-text-strong)]',
  red: 'bg-[color-mix(in_oklch,var(--accent-red)_15%,transparent)] text-[color-mix(in_oklch,var(--accent-red)_70%,black)]',
  amber: 'bg-[color-mix(in_oklch,var(--accent-amber)_24%,transparent)] text-[color-mix(in_oklch,var(--accent-amber)_50%,black)]',
  green: 'bg-[color-mix(in_oklch,var(--accent-green)_16%,transparent)] text-[color-mix(in_oklch,var(--accent-green)_55%,black)]',
  blue: 'bg-[color-mix(in_oklch,var(--accent-blue)_16%,transparent)] text-[color-mix(in_oklch,var(--accent-blue)_68%,black)]',
  purple: 'bg-[color-mix(in_oklch,oklch(0.55_0.18_300)_15%,transparent)] text-[color-mix(in_oklch,oklch(0.55_0.18_300)_72%,black)]',
  pink: 'bg-[color-mix(in_oklch,oklch(0.62_0.2_350)_15%,transparent)] text-[color-mix(in_oklch,oklch(0.62_0.2_350)_72%,black)]',
};

export interface BalinaSelectTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BalinaTagTone;
  /** Sağda ufak bir nokta göster (Notion status tarzı). */
  dot?: boolean;
}

export function BalinaSelectTag({
  tone = 'gray',
  dot = false,
  className,
  children,
  ...rest
}: BalinaSelectTagProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-[0.3125rem] px-1.5 py-0.5 text-xs font-medium leading-4',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
