'use client';

import * as React from 'react';
import { ChevronDown, Xmark } from '@gravity-ui/icons';
import { Dropdown } from '@heroui/react';
import {
  FilterDef,
  isFilterActive,
  resetFilter,
  summarizeFilterValue,
} from './filter-types';
import { FilterDetailPanel } from './filter-popover';

interface ActiveFilterChipsProps {
  filters: FilterDef[];
  className?: string;
}

/**
 * Aktif filtreler — Figma 12249:4043: saved-filter tab'larıyla aynı stilde
 * pill chip'ler. Her chip'in label'ı "Durumu: Aktif" gibi özet bir
 * gösterim; tıklayınca o dimension'ın detail popover'ı açılır. Sağda
 * X butonu chip'i siler (filtreyi default'a çevirir).
 */
export function ActiveFilterChips({
  filters,
  className,
}: ActiveFilterChipsProps) {
  const active = filters.filter(isFilterActive);
  if (active.length === 0) return null;

  return (
    <div
      className={[
        'flex flex-wrap items-center gap-2',
        className ?? '',
      ].join(' ')}
    >
      {active.map((f) => (
        <ActiveFilterChip key={f.id} def={f} />
      ))}
    </div>
  );
}

function ActiveFilterChip({ def }: { def: FilterDef }) {
  const summary = summarizeFilterValue(def);
  const [open, setOpen] = React.useState(false);

  return (
    <div className="inline-flex h-8 items-center rounded-2xl bg-foreground/[0.06] text-sm font-medium leading-5 text-foreground transition-colors">
      <Dropdown isOpen={open} onOpenChange={setOpen}>
        <Dropdown.Trigger
          aria-label={`${def.label} filtresini düzenle`}
          className="inline-flex h-full items-center gap-1 rounded-l-2xl px-3 py-1.5 transition-colors hover:bg-foreground/[0.04]"
        >
          <span className="text-foreground">{def.label}</span>
          {summary && (
            <>
              <span className="text-muted">:</span>
              <span className="text-foreground">{summary}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 text-foreground/60" />
        </Dropdown.Trigger>
        <Dropdown.Popover
          className="w-[206px] overflow-hidden rounded-xl bg-white/95 p-0 backdrop-blur-[4px]"
          style={{
            border: '1px solid #F3F4F6',
            boxShadow:
              '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
          }}
        >
          <FilterDetailPanel def={def} onCommit={() => setOpen(false)} />
        </Dropdown.Popover>
      </Dropdown>
      <button
        type="button"
        onClick={() => resetFilter(def)}
        aria-label={`${def.label} filtresini kaldır`}
        className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-foreground/60 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
      >
        <Xmark className="h-3 w-3" />
      </button>
    </div>
  );
}
