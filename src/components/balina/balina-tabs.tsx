'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Tabs (segmented control) — kaynak .PaneHeader_paneSegmentedControl*
 * spec'inin portu. */

export interface BalinaTabItem {
  id: string;
  label: React.ReactNode;
}

export interface BalinaTabsProps {
  items: BalinaTabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function BalinaTabs({ items, value, onChange, className }: BalinaTabsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          data-state={value === it.id ? 'on' : undefined}
          onClick={() => onChange(it.id)}
          className={cn(
            'inline-flex cursor-pointer items-center justify-center rounded-lg px-2 py-1',
            'text-[var(--balina-text-default)] transition-colors duration-100',
            'hover:bg-[var(--balina-background-dark-muted)] hover:text-[var(--balina-text-strong)]',
            'data-[state=on]:bg-[var(--balina-background-dark-default)] data-[state=on]:text-[var(--balina-text-loud)]',
          )}
        >
          <span className="text-body-small-medium">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
