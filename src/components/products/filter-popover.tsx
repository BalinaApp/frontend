'use client';

import * as React from 'react';
import { BarsDescendingAlignCenter, ChevronLeft, Plus } from '@gravity-ui/icons';
import { Dropdown, Input, TextField } from '@heroui/react';
import { FilterDef, isFilterActive } from './filter-types';

interface FilterPopoverProps {
  filters: FilterDef[];
  /** Aktif filtre sayısı 0'dan büyükse trigger üzerinde küçük bir nokta. */
  className?: string;
}

/**
 * Linear-vari iki-görünümlü filter popover (Figma 12249:4728, 12249:4962…):
 *   - Liste: tüm filtre kategorileri (search + tıkla → detay)
 *   - Detay: tek filtreye dair seçenekler (select/multi-select/text)
 *
 * Container shell: 206px wide, 12px radius, white/95 + 1px #F3F4F6 border,
 * three-layer shadow, backdrop-blur 4px.
 */
export function FilterPopover({ filters, className }: FilterPopoverProps) {
  const [view, setView] = React.useState<'list' | string>('list');
  const [search, setSearch] = React.useState('');

  const activeCount = filters.filter(isFilterActive).length;
  const selectedFilter =
    view !== 'list' ? filters.find((f) => f.id === view) ?? null : null;

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
          // Figma 12232:12832: 32×32, padding 6px 12px, gap 4px, radius 16,
          // bg #EBEBEC, icon bars-descending-align-center.
          'relative inline-flex h-8 w-8 min-w-8 items-center justify-center gap-1 overflow-hidden rounded-2xl px-3 py-1.5 text-[#18181B] transition-colors hover:bg-foreground/[0.10]',
          className ?? '',
        ].join(' ')}
        style={{ backgroundColor: '#EBEBEC' }}
      >
        <BarsDescendingAlignCenter className="h-4 w-4" />
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent"
          />
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover
        className="w-[206px] overflow-hidden rounded-xl bg-white/95 p-0 backdrop-blur-[4px]"
        style={{
          border: '1px solid #F3F4F6',
          boxShadow:
            '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
        }}
      >
        {selectedFilter ? (
          <FilterDetailPanel
            def={selectedFilter}
            onBack={() => setView('list')}
          />
        ) : (
          <FilterListView
            filters={filters}
            search={search}
            onSearch={setSearch}
            onSelect={setView}
          />
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}

// ---- List view (add-filter dropdown, 12249:4728) -------------------------

function FilterListView({
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
  const q = search.trim().toLowerCase();
  const list = q
    ? filters.filter((f) => f.label.toLowerCase().includes(q))
    : filters;

  return (
    <div className="flex flex-col">
      <PopoverHeader
        value={search}
        onChange={onSearch}
        placeholder="Yeni filtre..."
      />
      <div className="flex max-h-[360px] flex-col overflow-auto py-1">
        {list.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted">
            Sonuç bulunamadı
          </div>
        ) : (
          list.map((f) => (
            <OptionRow
              key={f.id}
              IconComponent={f.icon}
              label={f.label}
              onClick={() => onSelect(f.id)}
              trailingSpacer
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---- Detail view (per-dimension popover, 12249:4962/6235/6078) -----------

/**
 * Tek bir filtre dimension'ına ait popover içeriği. Hem FilterPopover'ın
 * detay view'ı olarak, hem de active-filter-chips chip'i tıklandığında
 * doğrudan açılacak şekilde re-kullanılır.
 */
export function FilterDetailPanel({
  def,
  onBack,
  onCommit,
}: {
  def: FilterDef;
  /** Sol üstte chevron-left gösterilsin mi? FilterPopover içinden açıldıysa true. */
  onBack?: () => void;
  /** Bir option seçilince popover'ı kapatmak için (chip-doğrudan kullanımda). */
  onCommit?: () => void;
}) {
  const [search, setSearch] = React.useState('');
  const placeholder =
    def.searchPlaceholder ?? `${def.label} değiştir...`;

  return (
    <div className="flex flex-col">
      <PopoverHeader
        value={search}
        onChange={setSearch}
        placeholder={placeholder}
        leading={
          onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Geri"
              className="-ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#71717A] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null
        }
      />
      <div className="flex max-h-[360px] flex-col overflow-auto py-1">
        {def.type === 'select' && (
          <SelectBody def={def} search={search} onCommit={onCommit} />
        )}
        {def.type === 'multi-select' && (
          <MultiSelectBody def={def} search={search} />
        )}
        {def.type === 'text' && <TextBody def={def} onCommit={onCommit} />}
      </div>
    </div>
  );
}

// ---- Shared header (search input, 36px) ----------------------------------

function PopoverHeader({
  value,
  onChange,
  placeholder,
  leading,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  leading?: React.ReactNode;
}) {
  return (
    <div
      className="flex h-9 items-center gap-2 px-3.5 pr-3"
      style={{ borderBottom: '0.5px solid #E8E8E8' }}
    >
      {leading}
      <TextField value={value} onChange={onChange} aria-label={placeholder}>
        <Input
          placeholder={placeholder}
          className="h-9 w-full border-transparent bg-transparent p-0 text-[13px] font-normal text-foreground shadow-none placeholder:text-[#71717A] focus:border-transparent focus:shadow-none"
          autoFocus
        />
      </TextField>
    </div>
  );
}

// ---- Option row (32×206 px) ----------------------------------------------
// Figma'ya birebir: icon slot opsiyonel — iconUrl/IconComponent yoksa hiç
// render edilmez (KDV value satırları gibi). trailingSpacer prop'u add-filter
// dropdown'ında her satırın sağında 16×16 boş slot bırakır.

function OptionRow({
  iconUrl,
  IconComponent,
  label,
  onClick,
  trailingSpacer,
}: {
  iconUrl?: string | null;
  IconComponent?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
  trailingSpacer?: boolean;
}) {
  const hasLeading = !!iconUrl || !!IconComponent;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-2 px-[14px] text-left text-[13px] font-medium leading-[1.193] text-[#18181B] transition-colors hover:bg-foreground/[0.04]"
    >
      {hasLeading &&
        (iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 rounded-full bg-white object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ) : IconComponent ? (
          <IconComponent className="h-4 w-4 shrink-0 text-[#18181B]" />
        ) : null)}
      <span className="flex-1 truncate">{label}</span>
      {trailingSpacer && <span className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </button>
  );
}

// ---- Select body ---------------------------------------------------------

function SelectBody({
  def,
  search,
  onCommit,
}: {
  def: Extract<FilterDef, { type: 'select' }>;
  search: string;
  onCommit?: () => void;
}) {
  const q = search.trim().toLowerCase();
  const options = q
    ? def.options.filter((o) => o.label.toLowerCase().includes(q))
    : def.options;

  return (
    <div className="flex flex-col">
      {options.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted">
          Sonuç bulunamadı
        </div>
      ) : (
        options.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            iconUrl={def.optionIconUrl ? def.optionIconUrl(opt.value) : null}
            onClick={() => {
              def.onChange(opt.value);
              onCommit?.();
            }}
          />
        ))
      )}
      {def.addNewLabel && def.onAddNew && (
        <OptionRow
          IconComponent={Plus}
          label={def.addNewLabel}
          onClick={() => {
            def.onAddNew?.();
            onCommit?.();
          }}
        />
      )}
    </div>
  );
}

// ---- Multi-select body ---------------------------------------------------

function MultiSelectBody({
  def,
  search,
}: {
  def: Extract<FilterDef, { type: 'multi-select' }>;
  search: string;
}) {
  const q = search.trim().toLowerCase();
  const options = q
    ? def.options.filter((o) => o.label.toLowerCase().includes(q))
    : def.options;

  return (
    <div className="flex flex-col">
      {options.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted">
          Sonuç bulunamadı
        </div>
      ) : (
        options.map((opt) => {
          const isOn = def.value.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const updated = new Set(def.value);
                if (isOn) updated.delete(opt.value);
                else updated.add(opt.value);
                def.onChange(updated);
              }}
              className={[
                'flex h-8 items-center gap-2 px-[14px] text-left text-[13px] font-medium leading-[1.193] transition-colors hover:bg-foreground/[0.04]',
                isOn ? 'text-[#18181B]' : 'text-[#71717A]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                  isOn ? 'border-[#18181B] bg-[#18181B]' : 'border-[#D4D4D8] bg-white',
                ].join(' ')}
                aria-hidden="true"
              >
                {isOn && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
                    <path
                      d="M3 6.5l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="flex-1 truncate">{opt.label}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

// ---- Text body -----------------------------------------------------------

function TextBody({
  def,
  onCommit,
}: {
  def: Extract<FilterDef, { type: 'text' }>;
  onCommit?: () => void;
}) {
  return (
    <div className="px-3.5 py-2">
      <TextField value={def.value} onChange={def.onChange} aria-label={def.label}>
        <Input
          placeholder={def.placeholder ?? def.label}
          className="h-8 rounded-md border-border bg-white px-2 text-[13px]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommit?.();
            }
          }}
        />
      </TextField>
    </div>
  );
}
