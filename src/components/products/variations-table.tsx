'use client';

import { Plus } from '@gravity-ui/icons';
import { Checkbox, Dropdown, Input, TextField } from '@/components/ui';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

/**
 * Tek bir varyasyon satırı (sub-row).
 * `key` benzersiz olmalı (combo key veya variation id).
 */
export interface VariationRow {
  key: string;
  label: string;
  stock: number | string;
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
            <Checkbox
              isSelected={allSelected(group)}
              onChange={() => onToggleGroupSelect(group)}
              aria-label={`${group.label} grubunu seç`}
            />
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
              <Checkbox
                isSelected={selectedKeys.has(row.key)}
                onChange={() => onToggleSelect(row.key)}
                aria-label={`${row.label} seç`}
              />
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
              <div className="w-[180px]">
                <TextField
                  value={String(row.stock ?? '')}
                  onChange={(v) => onStockChange(row.key, v)}
                  aria-label={`${row.label} stoğu`}
                >
                  {/* Alış Fiyatı stiliyle aynı — base bg saydam, hover/focus'ta
                      hafif gri tonu. HeroUI secondary variant focus bg'sini
                      override etmiyoruz; bg-transparent ile base'i bastırıyoruz. */}
                  <Input
                    fullWidth
                    variant="secondary"
                    type="text"
                    inputMode="numeric"
                    placeholder="Stok"
                    className="bg-transparent placeholder:text-zinc-500"
                  />
                </TextField>
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
      <Dropdown>
        <Dropdown.Trigger
          aria-label="Görsel ekle"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-black/[0.08] text-zinc-500 transition-colors hover:bg-foreground/[0.04]"
        >
          <Plus className="h-5 w-5" />
        </Dropdown.Trigger>
        <Dropdown.Popover
          className="w-[180px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
          style={{
            border: '1px solid var(--border)',
            boxShadow:
              '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
          }}
        >
          <Dropdown.Menu
            aria-label="Görsel kaynağı"
            onAction={(key) => {
              if (key === 'ai') onAi?.();
              else if (key === 'file') onFile?.();
            }}
            className="flex flex-col gap-0 py-1 outline-none"
          >
            <Dropdown.Item
              id="ai"
              textValue="AI ile üret"
              className="flex h-9 cursor-pointer items-center gap-2.5 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
            >
              <BalinaOsMark className="h-3.5 w-3.5 shrink-0 text-foreground" />
              <span className="flex-1">AI ile üret</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="file"
              textValue="Dosyalardan seç"
              className="flex h-9 cursor-pointer items-center gap-2.5 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
              <span className="flex-1">Dosyalardan seç</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-black/[0.08] text-zinc-500">
      <Plus className="h-5 w-5" />
    </div>
  );
}
