'use client';

import * as React from 'react';
import {
  Funnel,
  CaretRight,
  ChevronLeft,
  Check,
} from '@gravity-ui/icons';
import { Dropdown, Checkbox, Input, TextField } from '@heroui/react';
import {
  FilterDef,
  isFilterActive,
} from './filter-types';

interface FilterPopoverProps {
  filters: FilterDef[];
  /** Aktif filtre sayısı 0'dan büyükse trigger üzerinde küçük bir nokta. */
  className?: string;
}

/**
 * Tek bir popover — Linear-vari iki-görünümlü:
 *   - Liste: tüm filtre kategorileri (search + tıkla → detay)
 *   - Detay: tek filtreye dair seçenekler (select/multi-select/text)
 *
 * Trigger: filter ikonlu yuvarlak buton; aktif filtre varsa köşede mavi nokta.
 */
export function FilterPopover({ filters, className }: FilterPopoverProps) {
  const [view, setView] = React.useState<'list' | string>('list');
  const [search, setSearch] = React.useState('');

  const activeCount = filters.filter(isFilterActive).length;
  const selectedFilter =
    view !== 'list' ? filters.find((f) => f.id === view) ?? null : null;

  const filteredList = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filters;
    return filters.filter((f) => f.label.toLowerCase().includes(q));
  }, [filters, search]);

  // Popover her açıldığında listeye dön + search temizle.
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setView('list');
      setSearch('');
    }
  };

  return (
    <Dropdown onOpenChange={handleOpenChange}>
      <Dropdown.Trigger
        aria-label="Filtreler"
        className={[
          'relative inline-flex h-8 w-8 min-w-8 items-center justify-center gap-1 overflow-hidden rounded-2xl bg-foreground/[0.06] px-3 py-1.5 text-foreground transition-colors hover:bg-foreground/[0.10]',
          className ?? '',
        ].join(' ')}
      >
        <Funnel className="h-4 w-4" />
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent"
          />
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover
        className="w-[206px] overflow-hidden rounded-xl bg-white/95 backdrop-blur-[4px]"
        style={{
          border: '1px solid #F3F4F6',
          boxShadow:
            '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
        }}
      >
        {selectedFilter ? (
          <FilterDetail
            def={selectedFilter}
            onBack={() => setView('list')}
          />
        ) : (
          <FilterList
            filters={filteredList}
            search={search}
            onSearch={setSearch}
            onSelect={setView}
          />
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}

// ---- List view ------------------------------------------------------------

function FilterList({
  filters,
  search,
  onSearch,
  onSelect,
}: {
  filters: FilterDef[];
  search: string;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Header: search input — height 36px, border-bottom 0.5px */}
      <div
        className="flex h-9 items-center px-3.5 pr-3"
        style={{ borderBottom: '0.5px solid #E8E8E8' }}
      >
        <TextField value={search} onChange={onSearch} aria-label="Filtre ara">
          <Input
            placeholder="Yeni filtre..."
            className="h-9 w-full border-transparent bg-transparent p-0 text-[13px] font-normal text-foreground shadow-none placeholder:text-[#71717A] focus:border-transparent focus:shadow-none"
            autoFocus
          />
        </TextField>
      </div>
      <div className="flex max-h-[360px] flex-col overflow-auto">
        {filters.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted">
            Sonuç bulunamadı
          </div>
        ) : (
          filters.map((f) => {
            const active = isFilterActive(f);
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelect(f.id)}
                className="flex h-8 items-center gap-2 px-[14px] pr-[18px] text-left text-[13px] font-medium leading-[1.193] text-[#18181B] transition-colors hover:bg-foreground/[0.04]"
              >
                {Icon ? (
                  <Icon className="h-4 w-4 shrink-0 text-[#18181B]" />
                ) : (
                  <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span className="flex-1 truncate">{f.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                )}
                <CaretRight className="h-3 w-3 shrink-0 text-[#18181B]/70" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---- Detail view ----------------------------------------------------------

function FilterDetail({ def, onBack }: { def: FilterDef; onBack: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">{def.label}</span>
      </div>
      <div className="max-h-[360px] overflow-auto p-1">
        {def.type === 'select' && <SelectBody def={def} />}
        {def.type === 'multi-select' && <MultiSelectBody def={def} />}
        {def.type === 'text' && <TextBody def={def} />}
      </div>
    </div>
  );
}

function SelectBody({ def }: { def: Extract<FilterDef, { type: 'select' }> }) {
  return (
    <div className="flex flex-col">
      {def.options.map((opt) => {
        const isSelected = def.value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => def.onChange(opt.value)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-secondary"
          >
            <span className="flex-1 truncate">{opt.label}</span>
            {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}

function MultiSelectBody({
  def,
}: {
  def: Extract<FilterDef, { type: 'multi-select' }>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => def.onChange(new Set(def.options.map((o) => o.value)))}
          className="text-xs font-medium text-foreground/70 hover:text-foreground"
        >
          Tümü
        </button>
        <button
          type="button"
          onClick={() => def.onChange(new Set())}
          className="text-xs font-medium text-foreground/70 hover:text-foreground"
        >
          Temizle
        </button>
      </div>
      <div className="flex flex-col">
        {def.options.length === 0 ? (
          <span className="px-3 py-3 text-xs text-muted">Seçenek yok</span>
        ) : (
          def.options.map((opt) => {
            const isOn = def.value.has(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-secondary"
              >
                <Checkbox
                  isSelected={isOn}
                  onChange={(next) => {
                    const updated = new Set(def.value);
                    if (next) updated.add(opt.value);
                    else updated.delete(opt.value);
                    def.onChange(updated);
                  }}
                />
                <span className="flex-1 truncate text-foreground">{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function TextBody({ def }: { def: Extract<FilterDef, { type: 'text' }> }) {
  return (
    <div className="px-3 py-2">
      <TextField value={def.value} onChange={def.onChange} aria-label={def.label}>
        <Input
          placeholder={def.placeholder ?? def.label}
          className="h-9 rounded-md border-border bg-surface px-3 text-sm"
          autoFocus
        />
      </TextField>
    </div>
  );
}
