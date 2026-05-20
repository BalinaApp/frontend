'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { Plus, TrashBin } from '@gravity-ui/icons';
import {
  type BlockStyle,
  type MailBlock,
} from './mail-blocks';
import { ProductPickerModal } from './product-picker-modal';

type RightTab = 'details' | 'style';

interface EmailRightRailProps {
  tab: RightTab;
  onTabChange: (tab: RightTab) => void;
  hasSelection: boolean;
  children: React.ReactNode;
}

/** Sağ panel shell — Detaylar / Stil tabs. İçerik parent tarafından
 *  composed; bu component sadece chrome + tab switch sağlar. */
export function EmailRightRail({
  tab,
  onTabChange,
  hasSelection,
  children,
}: EmailRightRailProps) {
  return (
    <aside className="hidden w-[340px] shrink-0 flex-col border-l border-foreground/[0.06] lg:flex">
      <div className="flex shrink-0 items-center gap-0.5 border-b border-foreground/[0.06] px-3 py-2">
        <button
          type="button"
          onClick={() => onTabChange('details')}
          className={[
            'inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors',
            tab === 'details'
              ? 'bg-foreground/[0.08] text-foreground'
              : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground',
          ].join(' ')}
        >
          Detaylar
        </button>
        <button
          type="button"
          onClick={() => onTabChange('style')}
          disabled={!hasSelection}
          className={[
            'inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors',
            tab === 'style'
              ? 'bg-foreground/[0.08] text-foreground'
              : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground',
            !hasSelection ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          Stil
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  );
}

// ============================================================================
// Style panel — block-specific inspector
// ============================================================================

interface StylePanelProps {
  block: MailBlock;
  onChange: (patch: Partial<MailBlock>) => void;
  disabled?: boolean;
}

export function StylePanel({ block, onChange, disabled }: StylePanelProps) {
  const style: BlockStyle = block.style ?? {};
  const patchStyle = (s: Partial<BlockStyle>) =>
    onChange({ style: { ...style, ...s } } as Partial<MailBlock>);

  const hasAlign = block.type === 'heading' || block.type === 'text' || block.type === 'button';
  const isText = block.type === 'heading' || block.type === 'text' || block.type === 'button';
  const hasFill = block.type === 'button';
  const hasStroke =
    block.type === 'divider' ||
    block.type === 'button' ||
    block.type === 'image' ||
    block.type === 'product' ||
    block.type === 'product-grid';
  const hasRadius =
    block.type === 'button' || block.type === 'image' || block.type === 'product';

  return (
    <div className="flex flex-col gap-3">
      {/* Block-specific essential fields */}
      <BlockEssentials block={block} onChange={onChange} disabled={disabled} />

      {/* Position */}
      {hasAlign && (
        <Section title="Konum">
          <Row label="Hizalama">
            <AlignToggle
              value={
                (block as { align?: 'left' | 'center' | 'right' }).align ??
                'left'
              }
              onChange={(a) =>
                onChange({ align: a } as Partial<MailBlock>)
              }
              disabled={disabled}
            />
          </Row>
        </Section>
      )}

      {/* Typography */}
      {isText && (
        <Section title="Tipografi">
          <Row label="Boyut">
            <NumberInput
              value={style.fontSize ?? defaultFontSize(block)}
              onChange={(v) => patchStyle({ fontSize: v })}
              min={10}
              max={48}
              suffix="px"
              disabled={disabled}
            />
          </Row>
          <Row label="Kalınlık">
            <WeightToggle
              value={style.fontWeight ?? defaultWeight(block)}
              onChange={(w) => patchStyle({ fontWeight: w })}
              disabled={disabled}
            />
          </Row>
          <Row label="Renk">
            <ColorInput
              value={style.textColor ?? '#111827'}
              onChange={(c) => patchStyle({ textColor: c })}
              disabled={disabled}
            />
          </Row>
          {block.type !== 'button' && (
            <Row label="Satır arası">
              <NumberInput
                value={style.lineHeight ?? (block.type === 'heading' ? 1.3 : 1.6)}
                onChange={(v) => patchStyle({ lineHeight: v })}
                min={1}
                max={3}
                step={0.1}
                disabled={disabled}
              />
            </Row>
          )}
        </Section>
      )}

      {/* Color */}
      {(hasFill || hasStroke) && (
        <Section title="Renk">
          {hasFill && (
            <Row label="Dolgu">
              <ColorInput
                value={style.fillColor ?? '#111827'}
                onChange={(c) => patchStyle({ fillColor: c })}
                disabled={disabled}
              />
            </Row>
          )}
          {hasStroke && (
            <>
              <Row label="Çerçeve">
                <ColorInput
                  value={style.strokeColor ?? '#e5e7eb'}
                  onChange={(c) => patchStyle({ strokeColor: c })}
                  disabled={disabled}
                />
              </Row>
              <Row label="Kalınlık">
                <NumberInput
                  value={style.strokeWidth ?? (block.type === 'divider' ? 1 : 0)}
                  onChange={(v) => patchStyle({ strokeWidth: v })}
                  min={0}
                  max={4}
                  suffix="px"
                  disabled={disabled}
                />
              </Row>
            </>
          )}
        </Section>
      )}

      {/* Layout */}
      <Section title="Yerleşim">
        <Row label="Üst">
          <NumberInput
            value={style.paddingTop ?? 0}
            onChange={(v) => patchStyle({ paddingTop: v })}
            min={0}
            max={64}
            suffix="px"
            disabled={disabled}
          />
        </Row>
        <Row label="Sağ">
          <NumberInput
            value={style.paddingRight ?? 0}
            onChange={(v) => patchStyle({ paddingRight: v })}
            min={0}
            max={64}
            suffix="px"
            disabled={disabled}
          />
        </Row>
        <Row label="Alt">
          <NumberInput
            value={style.paddingBottom ?? 0}
            onChange={(v) => patchStyle({ paddingBottom: v })}
            min={0}
            max={64}
            suffix="px"
            disabled={disabled}
          />
        </Row>
        <Row label="Sol">
          <NumberInput
            value={style.paddingLeft ?? 0}
            onChange={(v) => patchStyle({ paddingLeft: v })}
            min={0}
            max={64}
            suffix="px"
            disabled={disabled}
          />
        </Row>
      </Section>

      {/* Appearance */}
      <Section title="Görünüm">
        <Row label="Saydamlık">
          <NumberInput
            value={style.opacity ?? 100}
            onChange={(v) => patchStyle({ opacity: v })}
            min={0}
            max={100}
            suffix="%"
            disabled={disabled}
          />
        </Row>
        {hasRadius && (
          <Row label="Köşe">
            <NumberInput
              value={style.cornerRadius ?? defaultRadius(block)}
              onChange={(v) => patchStyle({ cornerRadius: v })}
              min={0}
              max={9999}
              suffix="px"
              disabled={disabled}
            />
          </Row>
        )}
      </Section>
    </div>
  );
}

// ----- Block-specific essential fields ----------------------------------

function BlockEssentials({
  block,
  onChange,
  disabled,
}: {
  block: MailBlock;
  onChange: (patch: Partial<MailBlock>) => void;
  disabled?: boolean;
}) {
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  switch (block.type) {
    case 'heading':
      return (
        <Section title="Başlık">
          <Row label="Seviye">
            <div className="inline-flex items-center gap-0.5 rounded-md bg-foreground/[0.04] p-0.5">
              {(['h1', 'h2', 'h3'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() =>
                    onChange({ level: l } as Partial<MailBlock>)
                  }
                  disabled={disabled}
                  className={[
                    'inline-flex h-6 w-7 items-center justify-center rounded text-[10px] font-semibold transition-colors',
                    block.level === l
                      ? 'bg-foreground/[0.10] text-foreground'
                      : 'text-muted hover:bg-foreground/[0.06] hover:text-foreground',
                  ].join(' ')}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </Section>
      );
    case 'image':
      // Görsel AI ile canvas'ta üretilir; sağda manuel URL + alt + href.
      return (
        <Section title="Görsel">
          <TextField
            value={block.url}
            onChange={(v) => onChange({ url: v } as Partial<MailBlock>)}
            isDisabled={disabled}
          >
            <Label>URL (manuel)</Label>
            <Input placeholder="https://..." />
          </TextField>
          <TextField
            value={block.alt}
            onChange={(v) => onChange({ alt: v } as Partial<MailBlock>)}
            isDisabled={disabled}
          >
            <Label>Alt metin</Label>
            <Input placeholder="Erişilebilirlik için" />
          </TextField>
          <TextField
            value={block.href ?? ''}
            onChange={(v) =>
              onChange({ href: v || null } as Partial<MailBlock>)
            }
            isDisabled={disabled}
          >
            <Label>Tıklama linki</Label>
            <Input placeholder="https://..." />
          </TextField>
        </Section>
      );
    case 'logo':
      // Logo AI ile canvas'ta üretilir; sağda manuel URL + href.
      return (
        <Section title="Logo">
          <TextField
            value={block.url}
            onChange={(v) => onChange({ url: v } as Partial<MailBlock>)}
            isDisabled={disabled}
          >
            <Label>URL (manuel)</Label>
            <Input placeholder="https://..." />
          </TextField>
          <TextField
            value={block.href ?? ''}
            onChange={(v) =>
              onChange({ href: v || null } as Partial<MailBlock>)
            }
            isDisabled={disabled}
          >
            <Label>Tıklama linki</Label>
            <Input placeholder="https://..." />
          </TextField>
        </Section>
      );
    case 'button':
      return (
        <Section title="Buton">
          {/* Buton metni canvas'ta inline + AI assist ile düzenlenir */}
          <TextField
            value={block.href}
            onChange={(v) => onChange({ href: v } as Partial<MailBlock>)}
            isDisabled={disabled}
          >
            <Label>Link</Label>
            <Input placeholder="https://..." />
          </TextField>
        </Section>
      );
    case 'product':
      return (
        <Section title="Ürün">
          <Button
            variant="tertiary"
            size="sm"
            onPress={() => setProductPickerOpen(true)}
            isDisabled={disabled}
            className="w-full rounded-lg"
          >
            {block.productId ? 'Ürünü değiştir' : 'Ürün seç'}
          </Button>
          <ProductPickerModal
            isOpen={productPickerOpen}
            onClose={() => setProductPickerOpen(false)}
            onPick={(productId) => {
              onChange({ productId } as Partial<MailBlock>);
              setProductPickerOpen(false);
            }}
          />
        </Section>
      );
    case 'product-grid':
      return (
        <Section title="Ürün gridi">
          <Row label="Kolon">
            <div className="inline-flex items-center gap-0.5 rounded-md bg-foreground/[0.04] p-0.5">
              {([2, 3] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    onChange({ columns: c } as Partial<MailBlock>)
                  }
                  disabled={disabled}
                  className={[
                    'inline-flex h-6 w-7 items-center justify-center rounded text-xs font-medium transition-colors',
                    block.columns === c
                      ? 'bg-foreground/[0.10] text-foreground'
                      : 'text-muted hover:bg-foreground/[0.06]',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
          </Row>
          <div className="flex flex-col gap-1">
            {block.productIds.map((pid, idx) => (
              <div
                key={`${pid}-${idx}`}
                className="flex items-center gap-2 rounded-lg bg-foreground/[0.04] p-2 text-xs"
              >
                <span className="flex-1 truncate text-muted">
                  Ürün #{pid.slice(0, 8)}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  isIconOnly
                  onPress={() =>
                    onChange({
                      productIds: block.productIds.filter((_, i) => i !== idx),
                    } as Partial<MailBlock>)
                  }
                  isDisabled={disabled}
                  aria-label="Çıkar"
                  className="h-6 w-6 rounded-md text-danger"
                >
                  <TrashBin className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="tertiary"
            size="sm"
            onPress={() => setProductPickerOpen(true)}
            isDisabled={disabled}
            className="w-full rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Ürün ekle
          </Button>
          <ProductPickerModal
            isOpen={productPickerOpen}
            onClose={() => setProductPickerOpen(false)}
            onPick={(productId) => {
              if (!block.productIds.includes(productId)) {
                onChange({
                  productIds: [...block.productIds, productId],
                } as Partial<MailBlock>);
              }
              setProductPickerOpen(false);
            }}
          />
        </Section>
      );
    case 'spacer':
      return (
        <Section title="Boşluk">
          <Row label="Yükseklik">
            <NumberInput
              value={block.height}
              onChange={(v) => onChange({ height: v } as Partial<MailBlock>)}
              min={0}
              max={120}
              suffix="px"
              disabled={disabled}
            />
          </Row>
        </Section>
      );
    // Text/heading/button içeriği canvas'ta inline düzenleniyor + alttaki
    // AI assist panel ile üretiliyor. Sağ panelde text editörü yok.
    case 'text':
      return null;
    case 'divider':
      return null;
  }
}

// ----- Style helpers / shared subcomponents -----------------------------

function defaultFontSize(block: MailBlock): number {
  if (block.type === 'heading') {
    return ({ h1: 26, h2: 20, h3: 16 } as const)[block.level];
  }
  if (block.type === 'button') return 14;
  return 15;
}

function defaultWeight(block: MailBlock): 400 | 500 | 600 | 700 {
  if (block.type === 'heading' || block.type === 'button') return 600;
  return 400;
}

function defaultRadius(block: MailBlock): number {
  if (block.type === 'button') return 9999;
  if (block.type === 'image') return 8;
  return 0;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </h4>
      <div className="flex flex-col gap-2 rounded-xl bg-white/60 p-2.5">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.04] px-2 py-1">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          let v = n;
          if (min != null) v = Math.max(min, v);
          if (max != null) v = Math.min(max, v);
          onChange(v);
        }}
        disabled={disabled}
        className="w-14 border-0 bg-transparent p-0 text-right text-xs text-foreground outline-none"
      />
      {suffix && (
        <span className="text-[10px] uppercase tracking-wide text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.04] px-1.5 py-1">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Renk seçici"
        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
        style={{ appearance: 'none' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-16 border-0 bg-transparent p-0 text-[11px] font-mono uppercase text-foreground outline-none"
      />
    </div>
  );
}

function AlignToggle({
  value,
  onChange,
  disabled,
}: {
  value: 'left' | 'center' | 'right';
  onChange: (v: 'left' | 'center' | 'right') => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-foreground/[0.04] p-0.5">
      {(['left', 'center', 'right'] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          disabled={disabled}
          aria-label={`Hizala ${a}`}
          className={[
            'inline-flex h-6 w-7 items-center justify-center rounded text-xs transition-colors',
            value === a
              ? 'bg-foreground/[0.10] text-foreground'
              : 'text-muted hover:bg-foreground/[0.06] hover:text-foreground',
          ].join(' ')}
        >
          <AlignIcon dir={a} />
        </button>
      ))}
    </div>
  );
}

function AlignIcon({ dir }: { dir: 'left' | 'center' | 'right' }) {
  const lines =
    dir === 'left'
      ? ['M3 5h12', 'M3 9h8', 'M3 13h10']
      : dir === 'right'
        ? ['M5 5h12', 'M9 9h8', 'M7 13h10']
        : ['M3 5h12', 'M5 9h10', 'M4 13h12'];
  return (
    <svg width="13" height="13" viewBox="0 0 17 17" fill="none" aria-hidden>
      {lines.map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function WeightToggle({
  value,
  onChange,
  disabled,
}: {
  value: 400 | 500 | 600 | 700;
  onChange: (v: 400 | 500 | 600 | 700) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-foreground/[0.04] p-0.5">
      {([400, 500, 600, 700] as const).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          disabled={disabled}
          className={[
            'inline-flex h-6 w-7 items-center justify-center rounded text-[10px] transition-colors',
            value === w
              ? 'bg-foreground/[0.10] text-foreground'
              : 'text-muted hover:bg-foreground/[0.06]',
          ].join(' ')}
          style={{ fontWeight: w }}
        >
          {w}
        </button>
      ))}
    </div>
  );
}
