'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { BalinaPopover } from './balina-popover';

/* Balina View Settings — Linear "Display" gear-popover'ı. Üstte List/Board/
 * Timeline segment sekmeleri, altta "Display properties" pill toggle'ları
 * (kolon göster/gizle). Renkler tamamen balina design-system token'larından. */

export type BalinaViewLayout = 'list' | 'board' | 'timeline';

export interface BalinaViewProperty {
  key: string;
  label: string;
}

export interface BalinaViewSettingsProps {
  /** Gear butonu (page'den gelir). */
  trigger: React.ReactNode;
  /** Seçili layout (kontrollü). */
  layout: BalinaViewLayout;
  onLayoutChange: (layout: BalinaViewLayout) => void;
  /** Display properties listesi. */
  properties: BalinaViewProperty[];
  /** Her property'nin görünürlük durumu. */
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const LAYOUT_SEGMENTS: { value: BalinaViewLayout; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
  { value: 'timeline', label: 'Timeline' },
];

export function BalinaViewSettings({
  trigger,
  layout,
  onLayoutChange,
  properties,
  visible,
  onToggle,
  open,
  onOpenChange,
}: BalinaViewSettingsProps) {
  return (
    <BalinaPopover
      trigger={trigger}
      align="end"
      open={open}
      onOpenChange={onOpenChange}
      className="w-[20rem] p-3"
    >
      <div className="flex flex-col gap-3">
        {/* Layout segment — List / Board / Timeline (Linear pill segment) */}
        <div
          role="radiogroup"
          aria-label="Görünüm türü"
          className="flex items-center gap-1 rounded-xl bg-[var(--balina-background-dark-muted)] p-1"
        >
          {LAYOUT_SEGMENTS.map((seg) => {
            const selected = seg.value === layout;
            return (
              <button
                key={seg.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onLayoutChange(seg.value)}
                className={cn(
                  'text-body-small-medium flex-1 cursor-pointer rounded-lg px-2 py-1 text-center outline-none transition-colors focus-visible:outline-none',
                  selected
                    ? 'bg-[var(--balina-background-light-shout)] text-[var(--balina-text-loud)] shadow-elevation-low'
                    : 'text-[var(--balina-text-default)] hover:text-[var(--balina-text-strong)]',
                )}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* Display properties */}
        <div className="flex flex-col gap-2">
          <span className="text-body-small-medium px-0.5 text-[var(--balina-text-muted)]">
            Display properties
          </span>
          <div className="flex flex-wrap gap-1.5">
            {properties.map((prop) => {
              const active = visible[prop.key];
              return (
                <button
                  key={prop.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(prop.key)}
                  className={cn(
                    'text-body-small-medium inline-flex cursor-pointer items-center rounded-lg px-2 py-1 outline-none transition-colors focus-visible:outline-none',
                    active
                      ? 'bg-[var(--balina-background-dark-strong)] text-[var(--balina-text-loud)]'
                      : 'border border-[var(--balina-border-strong)] text-[var(--balina-text-muted)] hover:text-[var(--balina-text-strong)]',
                  )}
                >
                  {prop.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BalinaPopover>
  );
}
