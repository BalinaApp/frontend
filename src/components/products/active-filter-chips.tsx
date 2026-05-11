'use client';

import * as React from 'react';
import { Xmark } from '@gravity-ui/icons';
import {
  FilterDef,
  isFilterActive,
  resetFilter,
  summarizeFilterValue,
} from './filter-types';

interface ActiveFilterChipsProps {
  filters: FilterDef[];
  /** Tümünü temizle ek butonu (chip'lerin sağında). Boş ise gizlenir. */
  onClearAll?: () => void;
  /** Sağ aksiyon (örn. "Save" butonu). */
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Aktif filtreleri Linear-vari chip dizisi olarak gösterir:
 *   [ Aktif · Evet × ]  [ Stok · 0'dan fazla × ]  …
 *
 * Hiç aktif filtre yoksa tamamı gizlenir (rightSlot da gizli).
 */
export function ActiveFilterChips({
  filters,
  onClearAll,
  rightSlot,
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
        <Chip key={f.id} def={f} />
      ))}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          Temizle
        </button>
      )}
      {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}

function Chip({ def }: { def: FilterDef }) {
  const summary = summarizeFilterValue(def);
  const preposition = def.preposition ?? (def.type === 'text' ? 'ile' : 'is');

  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-2 text-xs">
      <span className="font-medium text-foreground">{def.label}</span>
      <span className="text-muted">{preposition}</span>
      <span className="font-medium text-foreground">{summary}</span>
      <button
        type="button"
        onClick={() => resetFilter(def)}
        aria-label={`${def.label} filtresini kaldır`}
        className="-mr-0.5 ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        <Xmark className="h-3 w-3" />
      </button>
    </span>
  );
}
