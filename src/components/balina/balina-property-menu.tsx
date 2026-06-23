'use client';

import * as React from 'react';
import { Check, Magnifier } from '@gravity-ui/icons';
import { BalinaPopover } from './balina-popover';

/* Balina Property Menu — Notion "Filter by…/Sort by…" dropdown'u: üstte arama,
 * altta ikonlu property listesi. Generic: items + value + onSelect. */

export interface BalinaPropertyItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BalinaPropertyMenuProps {
  trigger: React.ReactNode;
  items: BalinaPropertyItem[];
  /** Seçili property key'i (✓ gösterilir). */
  value?: string;
  onSelect: (key: string) => void;
  searchPlaceholder?: string;
  /** Seçili/her satırın sağında ek içerik (ör. asc/desc göstergesi). */
  trailing?: (key: string) => React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
}

export function BalinaPropertyMenu({
  trigger,
  items,
  value,
  onSelect,
  searchPlaceholder = 'Ara…',
  trailing,
  open,
  onOpenChange,
  align = 'end',
}: BalinaPropertyMenuProps) {
  const [q, setQ] = React.useState('');
  const filtered = items.filter((i) =>
    i.label.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')),
  );
  return (
    <BalinaPopover
      open={open}
      onOpenChange={(o) => {
        if (!o) setQ('');
        onOpenChange?.(o);
      }}
      align={align}
      className="w-[18rem] max-w-none overflow-hidden p-0"
      trigger={trigger}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--balina-border-muted)] px-3 py-2">
          <Magnifier className="h-4 w-4 shrink-0 text-[var(--balina-icon-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="h-6 w-full bg-transparent text-xs text-[var(--balina-text-loud)] outline-none placeholder:text-[var(--balina-text-muted)]"
          />
        </div>
        <div className="balina-scrollbar max-h-[18rem] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--balina-text-muted)]">
              Sonuç yok
            </div>
          ) : (
            filtered.map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => onSelect(i.key)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[0.625rem] p-1.5 text-left outline-none transition-colors hover:bg-[var(--balina-background-dark-muted)]"
              >
                {i.icon != null && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--balina-icon-muted)]">
                    {i.icon}
                  </span>
                )}
                <span className="text-body-small-one-liner-medium min-w-0 flex-1 truncate text-[var(--balina-text-strong)]">
                  {i.label}
                </span>
                {trailing?.(i.key)}
                {value === i.key && (
                  <Check className="h-4 w-4 shrink-0 text-[var(--balina-icon-strong)]" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </BalinaPopover>
  );
}
