'use client';

import * as React from 'react';
import {
  BarsDescendingAlignCenter,
  ChevronLeft,
  ChevronRight,
  Plus,
} from '@gravity-ui/icons';
import { BalinaCalendar, BalinaPopover } from '@/components/balina';
import { FilterDef, isFilterActive } from './filter-types';
import { type DateRange } from '../date-range-input';

interface FilterPopoverProps {
  filters: FilterDef[];
  className?: string;
  /** Opsiyonel custom trigger içeriği — verilirse default bars ikonu yerine
   *  bu render edilir (örn. ActiveFilterChips içindeki "+" butonu). */
  trigger?: React.ReactNode;
  /** Custom trigger için aria-label override. */
  triggerAriaLabel?: string;
  /** Custom trigger className override — default 32×32 #EBEBEC pill yerine
   *  başka bir görünüm vermek için. */
  triggerClassName?: string;
}

/**
 * Linear-vari submenu-tabanlı filter popover.
 *   - Ana popover: tüm filtre kategorileri + search input
 *   - Her kategori `Dropdown.SubmenuTrigger` — üzerine gelince yanına ikinci
 *     popover açılır ve o filtrenin opsiyonlarını gösterir.
 *
 * `FilterDetailPanel` (chip-direct kullanımı için) ayrı bırakıldı; submenu
 * Popover'ı içinde aynı panel tekrar kullanılır (`onBack` verilmez).
 *
 * Container shell: 206px wide, 12px radius, white/95 + 1px #F3F4F6 border,
 * three-layer shadow, backdrop-blur 4px.
 */
export function FilterPopover({
  filters,
  className,
  trigger,
  triggerAriaLabel,
  triggerClassName,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setSearch('');
  };

  const q = search.trim().toLowerCase();
  const list = q
    ? filters.filter((f) => f.label.toLowerCase().includes(q))
    : filters;

  const hasCustomTrigger = !!trigger;

  return (
    <BalinaPopover
      open={isOpen}
      onOpenChange={handleOpenChange}
      className="w-[206px] max-w-none overflow-hidden p-0"
      trigger={
        hasCustomTrigger ? (
          <button
            type="button"
            aria-label={triggerAriaLabel ?? 'Filtreler'}
            className={[triggerClassName ?? '', className ?? ''].join(' ')}
          >
            {trigger}
          </button>
        ) : (
          // Entegrasyonlar sayfasındaki pill button stiline birebir.
          <button
            type="button"
            aria-label={triggerAriaLabel ?? 'Filtreler'}
            className={[
              'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-foreground/[0.06] text-foreground transition-colors hover:bg-foreground/[0.10]',
              className ?? '',
            ].join(' ')}
          >
            <BarsDescendingAlignCenter />
          </button>
        )
      }
    >
      <div className="flex flex-col">
        <PopoverHeader
          value={search}
          onChange={setSearch}
          placeholder="Yeni filtre..."
        />
        {list.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted">
            Sonuç bulunamadı
          </div>
        ) : (
          <div
            aria-label="Filtreler"
            className="flex max-h-[360px] flex-col gap-0 overflow-auto py-1 outline-none"
          >
            {list.map((f) => {
              // Aktif filtre: icon accent rengiyle vurgulanır (eskiden
              // ayrı bir dot vardı, sol padding'i artırıyordu).
              const isActive = isFilterActive(f);
              return (
                <BalinaPopover
                  key={f.id}
                  side="right"
                  align="start"
                  className={[
                    // Date-range widget — popover içeriğe göre büyüsün.
                    f.type === 'text' && f.widget === 'date-range'
                      ? 'w-fit'
                      : 'w-[206px]',
                    'max-w-none overflow-hidden p-0',
                  ].join(' ')}
                  trigger={
                    <button
                      type="button"
                      aria-label={f.label}
                      className={MENU_ITEM_CLASS}
                    >
                      {f.icon ? (
                        <f.icon
                          className={[
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-accent' : 'text-foreground',
                          ].join(' ')}
                        />
                      ) : null}
                      <span className="flex-1 truncate">{f.label}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </button>
                  }
                >
                  <FilterDetailPanel
                    def={f}
                    onCommit={() => setIsOpen(false)}
                    autoFocus={false}
                  />
                </BalinaPopover>
              );
            })}
          </div>
        )}
      </div>
    </BalinaPopover>
  );
}

// ---- Detail view (per-dimension popover) ---------------------------------

/**
 * Tek bir filtre dimension'ına ait popover içeriği. Hem FilterPopover'ın
 * detay view'ı olarak, hem de active-filter-chips chip'i tıklandığında
 * doğrudan açılacak şekilde re-kullanılır.
 */
export function FilterDetailPanel({
  def,
  onBack,
  onCommit,
  autoFocus = true,
}: {
  def: FilterDef;
  /** Sol üstte chevron-left gösterilsin mi? FilterPopover içinden açıldıysa true. */
  onBack?: () => void;
  /** Bir option seçilince popover'ı kapatmak için. */
  onCommit?: () => void;
  /** Submenu içinde kapanır; parent menu focus tracking'i için. */
  autoFocus?: boolean;
}) {
  const [search, setSearch] = React.useState('');
  const placeholder = def.searchPlaceholder ?? `${def.label} değiştir...`;

  // Text-type filtrelerde search header anlamlı değil (filtrelenecek option
  // listesi yok). Widget'ın kendi input'u zaten yeterli — header'ı atla.
  const showSearchHeader = def.type !== 'text';

  return (
    <div className="flex flex-col">
      {showSearchHeader && (
        <PopoverHeader
          value={search}
          onChange={setSearch}
          placeholder={placeholder}
          autoFocus={autoFocus}
          leading={
            onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Geri"
                className="-ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null
          }
        />
      )}
      {def.type === 'select' && (
        <SelectBody def={def} search={search} onCommit={onCommit} />
      )}
      {def.type === 'multi-select' && (
        <MultiSelectBody def={def} search={search} />
      )}
      {def.type === 'text' && (
        <TextBody def={def} onCommit={onCommit} autoFocus={autoFocus} />
      )}
    </div>
  );
}

// ---- Shared header (search input, 36px) ----------------------------------

function PopoverHeader({
  value,
  onChange,
  placeholder,
  leading,
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  leading?: React.ReactNode;
  /** Submenu içinde focus race'i önlemek için kapatılır. */
  autoFocus?: boolean;
}) {
  return (
    <div
      className="flex h-9 items-center gap-2 px-3.5 pr-3"
      style={{ borderBottom: '0.5px solid var(--border)' }}
    >
      {leading}
      {/* HeroUI Input/TextField focus ring'ini bastırmak yerine plain native
          input kullanıyoruz — popover içi search satırı için zaten label /
          description / validation gibi feature'lara ihtiyaç yok. */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="h-9 w-full border-0 bg-transparent p-0 text-[13px] font-normal text-foreground shadow-none outline-none ring-0 placeholder:text-muted focus:outline-none focus:ring-0"
      />
    </div>
  );
}

// ---- Select body (single-select; popover kapanır) -----------------------

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

  const hasAddNew = !!(def.addNewLabel && def.onAddNew);

  // "Yeni ekle" tıklandığında dropdown içinde inline input modu açılır.
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [newValue, setNewValue] = React.useState('');

  const submitNew = () => {
    const v = newValue.trim();
    if (!v) return;
    def.onAddNew?.(v);
    setIsAddingNew(false);
    setNewValue('');
    onCommit?.();
  };

  if (isAddingNew) {
    return (
      <div className="flex flex-col py-1">
        <div className="flex h-8 items-center px-[14px]">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitNew();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsAddingNew(false);
                setNewValue('');
              }
            }}
            placeholder={def.addNewPlaceholder ?? 'Yeni değer girin'}
            aria-label={def.addNewLabel ?? 'Yeni değer'}
            autoFocus
            className="h-8 w-full border-0 bg-transparent p-0 text-[13px] font-medium leading-[1.193] text-foreground outline-none ring-0 placeholder:text-muted focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    );
  }

  // Select view: tıklayınca filter uygulanıp popover kapansın.
  // FilterDetailPanel `onCommit` ile dış state'i de senkronize ediyor.
  // __add_new__ ise inline input moduna geçer (popover kapanmaz).
  const handleAction = (key: string) => {
    if (key === '__add_new__') {
      setIsAddingNew(true);
      return;
    }
    def.onChange(key);
    onCommit?.();
  };

  return options.length === 0 && !hasAddNew ? (
    <div className="px-3 py-4 text-center text-xs text-muted">
      Sonuç bulunamadı
    </div>
  ) : (
    <div
      aria-label={def.label}
      className="flex max-h-[360px] flex-col gap-0 overflow-auto py-1 outline-none"
    >
      {options.map((opt) => {
        // Figma 12249:4962 — her seçeneğin solunda 16×16 ikon; gap 8.
        // Option.icon (komponent) > def.optionIconUrl (string URL — mağaza
        // favicon'u gibi).
        const OptionIcon = opt.icon;
        const iconUrl = def.optionIconUrl ? def.optionIconUrl(opt.value) : null;
        return (
          <button
            key={opt.value}
            type="button"
            aria-label={opt.label}
            onClick={() => handleAction(opt.value)}
            className={MENU_ITEM_CLASS}
          >
            {OptionIcon ? (
              <OptionIcon className="h-4 w-4 shrink-0 text-foreground" />
            ) : iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 shrink-0 rounded-full bg-surface object-cover"
              />
            ) : null}
            <span className="flex-1 truncate">{opt.label}</span>
          </button>
        );
      })}
      {hasAddNew ? (
        <button
          type="button"
          aria-label={def.addNewLabel}
          onClick={() => handleAction('__add_new__')}
          className={MENU_ITEM_CLASS}
        >
          <Plus className="h-4 w-4 shrink-0 text-foreground" />
          <span className="flex-1 truncate">{def.addNewLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

// ---- Multi-select body (popover açık kalır) -----------------------------

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

  const toggle = (value: string) => {
    const next = new Set(def.value);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    def.onChange(next);
  };

  return options.length === 0 ? (
    <div className="px-3 py-4 text-center text-xs text-muted">
      Sonuç bulunamadı
    </div>
  ) : (
    <div
      aria-label={def.label}
      className="flex max-h-[360px] flex-col gap-0 overflow-auto py-1 outline-none"
    >
      {options.map((opt) => {
        const isOn = def.value.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-label={opt.label}
            aria-pressed={isOn}
            onClick={() => toggle(opt.value)}
            className={[
              MENU_ITEM_CLASS,
              isOn ? 'text-foreground' : 'text-muted',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                isOn ? 'border-foreground bg-foreground' : 'border-border bg-surface',
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
      })}
    </div>
  );
}

// ---- Text body (free text input, Enter ile commit) -----------------------

function TextBody({
  def,
  onCommit,
  autoFocus = true,
}: {
  def: Extract<FilterDef, { type: 'text' }>;
  onCommit?: () => void;
  autoFocus?: boolean;
}) {
  // Date-range widget — submenu açıldığı anda calendar inline görünür.
  // String formatı "YYYY-MM-DD..YYYY-MM-DD" (backend dateFrom/dateTo'ya
  // parse eder).
  if (def.widget === 'date-range') {
    const parsed = parseDateRangeString(def.value);
    return (
      <div className="p-2">
        <BalinaCalendar
          mode="range"
          numberOfMonths={1}
          className="w-56"
          defaultMonth={parsed?.from}
          selected={parsed ? { from: parsed.from, to: parsed.to } : undefined}
          disabled={{ after: new Date() }}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              def.onChange(
                `${range.from.toISOString().slice(0, 10)}..${range.to
                  .toISOString()
                  .slice(0, 10)}`,
              );
              onCommit?.();
            }
          }}
        />
      </div>
    );
  }

  // Plain text — outline'sız native input. Submenu içinde search header
  // gösterilmiyor, dolayısıyla bu doğrudan tek satırlık serbest input olur.
  return (
    <div className="flex h-9 items-center px-[14px]">
      <input
        type="text"
        value={def.value}
        onChange={(e) => def.onChange(e.target.value)}
        placeholder={def.placeholder ?? def.label}
        aria-label={def.label}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit?.();
          }
        }}
        className="h-9 w-full border-0 bg-transparent p-0 text-[13px] font-normal text-foreground outline-none ring-0 placeholder:text-muted focus:outline-none focus:ring-0"
      />
    </div>
  );
}

/** "YYYY-MM-DD..YYYY-MM-DD" → DateRange | null */
function parseDateRangeString(s: string): DateRange | null {
  if (!s.trim()) return null;
  const [fromStr, toStr] = s.split('..').map((x) => x.trim());
  if (!fromStr) return null;
  const from = new Date(fromStr);
  if (Number.isNaN(from.getTime())) return null;
  const to = toStr ? new Date(toStr) : from;
  if (Number.isNaN(to.getTime())) return null;
  return { from, to };
}

// ---- Shared Dropdown.Item styling ----------------------------------------
// HeroUI'ın native MenuItem'ı kullanılırken Figma'daki 32×206 satır görünümü
// (Inter 500 13px, padding 14px, gap 8px, hover bg) için ortak className.
const MENU_ITEM_CLASS =
  'flex h-8 w-full cursor-pointer items-center gap-2 px-[14px] text-left text-[13px] font-medium leading-[1.193] text-foreground outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04]';
