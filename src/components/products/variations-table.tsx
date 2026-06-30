'use client';

import { Plus } from '@gravity-ui/icons';
import {
  BalinaCheckbox,
  BalinaDropdown,
  BalinaDropdownItem,
  BalinaTextField,
} from '@/components/balina';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

/**
 * Tek bir varyasyon satırı (sub-row).
 * `key` benzersiz olmalı (combo key veya variation id).
 */
export interface VariationRow {
  key: string;
  label: string;
  stock: number | string;
  /** Fiyat — yeni ürün akışında henüz değer yok; opsiyonel. */
  price?: number | string;
  imageUrl?: string | null;
}

export interface VariationGroup {
  key: string;
  label: string;
  items: VariationRow[];
}

interface Props {
  groups: VariationGroup[];
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onToggleGroupSelect: (group: VariationGroup) => void;
  onStockChange: (key: string, value: string) => void;
  onPriceChange?: (key: string, value: string) => void;
  onPriceCommit?: (key: string) => void;
  onImageAi?: (key: string) => void;
  onImageFile?: (key: string) => void;
}

/**
 * Figma node 12300:13264 birebir uygulaması.
 * - Üst başlık + "Varyasyon Ekle" butonu parent tarafından sağlanır (Section'da).
 * - Bu component sadece master + sub-row listesini render eder.
 * - Master: checkbox + 56x56 dashed image + label + "N varyasyon"
 * - Sub: indent (16x44 padding), checkbox + dashed image + label + Stok input
 */
export function VariationsTable({
  groups,
  selectedKeys,
  onToggleSelect,
  onToggleGroupSelect,
  onStockChange,
  onPriceChange,
  onPriceCommit,
  onImageAi,
  onImageFile,
}: Props) {
  const allSelected = (group: VariationGroup): boolean =>
    group.items.length > 0 &&
    group.items.every((it) => selectedKeys.has(it.key));

  return (
    <div className="w-full">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col">
          {/* Master row */}
          <div className="flex items-center gap-3 border-b border-black/[0.04] p-4">
            <BalinaCheckbox
              checked={allSelected(group)}
              onCheckedChange={() => onToggleGroupSelect(group)}
            >
              <span className="sr-only">{`${group.label} grubunu seç`}</span>
            </BalinaCheckbox>
            <ImagePlaceholder
              onAi={onImageAi ? () => onImageAi(group.key) : undefined}
              onFile={onImageFile ? () => onImageFile(group.key) : undefined}
            />
            <div className="flex flex-1 flex-col justify-center gap-1">
              <span className="text-sm font-medium text-foreground">
                {group.label}
              </span>
              <span className="text-xs text-zinc-500">
                {group.items.length} varyasyon
              </span>
            </div>
          </div>

          {/* Sub-rows — indent (px-11 ≈ 44px) */}
          {group.items.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-3 border-b border-black/[0.04] py-4 pl-11 pr-4 last:border-b-0"
            >
              <BalinaCheckbox
                checked={selectedKeys.has(row.key)}
                onCheckedChange={() => onToggleSelect(row.key)}
              >
                <span className="sr-only">{`${row.label} seç`}</span>
              </BalinaCheckbox>
              <ImagePlaceholder
                imageUrl={row.imageUrl}
                onAi={onImageAi ? () => onImageAi(row.key) : undefined}
                onFile={onImageFile ? () => onImageFile(row.key) : undefined}
              />
              <div className="flex flex-1 flex-col justify-center">
                <span className="text-sm font-medium text-foreground">
                  {row.label}
                </span>
              </div>
              {onPriceChange && (
                <div className="w-[140px]">
                  {/* Stok input'uyla aynı ghost stil. */}
                  <BalinaTextField
                    value={String(row.price ?? '')}
                    onChange={(v) => onPriceChange(row.key, v)}
                    onBlur={() => onPriceCommit?.(row.key)}
                    aria-label={`${row.label} fiyatı`}
                    variant="ghost"
                    type="text"
                    inputMode="decimal"
                    placeholder="Fiyat"
                    className="placeholder:text-zinc-500"
                  />
                </div>
              )}
              <div className="w-[180px]">
                {/* Alış Fiyatı stiliyle aynı — base bg saydam, hover/focus'ta
                    hafif gri tonu. */}
                <BalinaTextField
                  value={String(row.stock ?? '')}
                  onChange={(v) => onStockChange(row.key, v)}
                  aria-label={`${row.label} stoğu`}
                  variant="ghost"
                  type="text"
                  inputMode="numeric"
                  placeholder="Stok"
                  className="placeholder:text-zinc-500"
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ImagePlaceholder({
  imageUrl,
  onAi,
  onFile,
}: {
  imageUrl?: string | null;
  onAi?: () => void;
  onFile?: () => void;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-md border border-black/[0.06] object-cover"
      />
    );
  }
  if (onAi || onFile) {
    return (
      <BalinaDropdown
        align="start"
        trigger={
          <button
            type="button"
            aria-label="Görsel ekle"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-black/[0.08] text-zinc-500 transition-colors hover:bg-foreground/[0.04]"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      >
        <BalinaDropdownItem
          icon={<BalinaOsMark className="h-3.5 w-3.5" />}
          onSelect={() => onAi?.()}
        >
          AI ile üret
        </BalinaDropdownItem>
        <BalinaDropdownItem
          icon={<Plus className="h-3.5 w-3.5" />}
          onSelect={() => onFile?.()}
        >
          Dosyalardan seç
        </BalinaDropdownItem>
      </BalinaDropdown>
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-black/[0.08] text-zinc-500">
      <Plus className="h-5 w-5" />
    </div>
  );
}
