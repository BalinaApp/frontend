import type * as React from 'react';

/**
 * Linear-vari filter popover'da kullanılan, kullanıcıya sunulacak filtre
 * tanımları. Her filtre kendi tipi (select/multi-select/text) ile gelir;
 * popover ona göre uygun input'u render eder.
 */

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDefBase {
  id: string;
  label: string;
  /** Aktif filtreyi chip olarak gösterirken kullanılacak ikon kelimesi
   *  (örn. "is" / "ile"). */
  preposition?: string;
  /** Sol başta gösterilecek 16×16 ikon (FilterPopover liste view'ında). */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Detay popover'ının arama input'unda gösterilecek placeholder
   *  ("Durumu değiştir...", "KDV değiştir..." gibi). */
  searchPlaceholder?: string;
}

export interface SelectFilterDef extends FilterDefBase {
  type: 'select';
  options: FilterOption[];
  /** "all" gibi default değer — bu değerdeyken filtre aktif sayılmaz. */
  defaultValue: string;
  value: string;
  onChange: (next: string) => void;
  /** Opsiyonel: her seçeneğin yanında 16×16 avatar (örn. mağaza logosu). */
  optionIconUrl?: (value: string) => string | null;
  /** Opsiyonel: listenin en altına "Yeni ekle" benzeri bir aksiyon satırı. */
  addNewLabel?: string;
  onAddNew?: () => void;
}

export interface MultiSelectFilterDef extends FilterDefBase {
  type: 'multi-select';
  options: FilterOption[];
  value: Set<string>;
  onChange: (next: Set<string>) => void;
}

export interface TextFilterDef extends FilterDefBase {
  type: 'text';
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
}

export type FilterDef =
  | SelectFilterDef
  | MultiSelectFilterDef
  | TextFilterDef;

/** Bir filtrenin "aktif" olup olmadığını belirler (default değil). */
export function isFilterActive(def: FilterDef): boolean {
  switch (def.type) {
    case 'select':
      return def.value !== def.defaultValue;
    case 'multi-select':
      return def.value.size > 0;
    case 'text':
      return def.value.trim().length > 0;
  }
}

/** Aktif filtreyi reset (default'a çevir). */
export function resetFilter(def: FilterDef): void {
  switch (def.type) {
    case 'select':
      def.onChange(def.defaultValue);
      return;
    case 'multi-select':
      def.onChange(new Set());
      return;
    case 'text':
      def.onChange('');
      return;
  }
}

/**
 * Saved filter olarak diske/backend'e yazılacak payload tipi.
 *   - select / text → string
 *   - multi-select → string[]
 *
 * Tüm filtreler aynı serializable formata indirilir; uygulama
 * tarafında `applyFilterPayload` ile geri yüklenir.
 */
export type FilterPayload = Record<string, string | string[]>;

/** Mevcut filtre değerlerini serializable bir payload'a dönüştürür. */
export function captureFilterPayload(defs: FilterDef[]): FilterPayload {
  const out: FilterPayload = {};
  for (const f of defs) {
    if (f.type === 'select') out[f.id] = f.value;
    else if (f.type === 'text') out[f.id] = f.value;
    else if (f.type === 'multi-select') out[f.id] = Array.from(f.value);
  }
  return out;
}

/** Verilen payload'ı filtrelere uygula. Eksik anahtarlar default'a çekilir. */
export function applyFilterPayload(defs: FilterDef[], payload: FilterPayload): void {
  for (const f of defs) {
    const raw = payload[f.id];
    if (f.type === 'select') {
      f.onChange(typeof raw === 'string' ? raw : f.defaultValue);
    } else if (f.type === 'text') {
      f.onChange(typeof raw === 'string' ? raw : '');
    } else if (f.type === 'multi-select') {
      f.onChange(new Set(Array.isArray(raw) ? raw : []));
    }
  }
}

/** Payload'ı default değerlere sıfırla (Tümü tab'ı için). */
export function clearFilters(defs: FilterDef[]): void {
  for (const f of defs) resetFilter(f);
}

/** İki payload aynı içeriğe mi sahip? Saved tab "kirli mi" kontrolü için. */
export function arePayloadsEqual(a: FilterPayload, b: FilterPayload): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      const setA = new Set(av);
      for (const v of bv) if (!setA.has(v)) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
}

/** Chip üzerinde gösterilecek özet etiket. */
export function summarizeFilterValue(def: FilterDef): string {
  switch (def.type) {
    case 'select': {
      const opt = def.options.find((o) => o.value === def.value);
      return opt?.label ?? def.value;
    }
    case 'multi-select': {
      if (def.value.size === 0) return '';
      if (def.value.size === 1) {
        const k = Array.from(def.value)[0];
        const opt = def.options.find((o) => o.value === k);
        return opt?.label ?? k;
      }
      return `${def.value.size} seçili`;
    }
    case 'text':
      return def.value;
  }
}
