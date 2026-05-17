'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Magnifier,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import {
  Button,
  Dropdown as HDropdown,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
} from '@heroui/react';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useCompanyStore } from '@/stores/companyStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import {
  BLOCK_LABELS,
  makeDefaultBlock,
  type MailBlock,
} from './mail-blocks';

const BLOCK_TYPES: MailBlock['type'][] = [
  'heading',
  'text',
  'image',
  'product',
  'button',
  'divider',
  'spacer',
];

interface MailBlockEditorProps {
  blocks: MailBlock[];
  onChange: (blocks: MailBlock[]) => void;
  disabled?: boolean;
}

export function MailBlockEditor({
  blocks,
  onChange,
  disabled,
}: MailBlockEditorProps) {
  const [productPickerFor, setProductPickerFor] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<MailBlock>) => {
    onChange(
      blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as MailBlock) : b)),
    );
  };
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    onChange(copy);
  };
  const duplicate = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const original = blocks[idx];
    const clone: MailBlock = {
      ...original,
      id: `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    } as MailBlock;
    const copy = [...blocks];
    copy.splice(idx + 1, 0, clone);
    onChange(copy);
  };
  const add = (type: MailBlock['type']) => {
    onChange([...blocks, makeDefaultBlock(type)]);
  };

  /** Drag handle'dan ID transfer + drop hedefi'nin önüne yerleştir. */
  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    if (disabled) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    if (disabled || !draggingId || draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || !draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = blocks.findIndex((b) => b.id === draggingId);
    const toIdx = blocks.findIndex((b) => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const copy = [...blocks];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    onChange(copy);
    setDraggingId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-foreground/[0.10] bg-surface-secondary p-4 text-center text-xs text-muted">
          Henüz blok yok — aşağıdan ekleyerek mailini tasarla.
        </div>
      ) : (
        blocks.map((b, idx) => (
          <div
            key={b.id}
            onDragOver={handleDragOver(b.id)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(b.id)}
            className={[
              'transition-all',
              dragOverId === b.id && draggingId !== b.id
                ? 'translate-y-0.5'
                : '',
              draggingId === b.id ? 'opacity-50' : '',
            ].join(' ')}
          >
            <BlockCard
              block={b}
              isFirst={idx === 0}
              isLast={idx === blocks.length - 1}
              disabled={disabled}
              isDragging={draggingId === b.id}
              isDropTarget={dragOverId === b.id && draggingId !== b.id}
              onUpdate={(patch) => update(b.id, patch)}
              onRemove={() => remove(b.id)}
              onMove={(dir) => move(b.id, dir)}
              onDuplicate={() => duplicate(b.id)}
              onOpenProductPicker={() => setProductPickerFor(b.id)}
              onDragStart={handleDragStart(b.id)}
              onDragEnd={handleDragEnd}
            />
          </div>
        ))
      )}

      {/* Blok ekleme picker — chip rail */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            disabled={disabled}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-foreground/[0.04] px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-foreground/[0.08] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>

      <ProductPickerModal
        isOpen={productPickerFor !== null}
        onClose={() => setProductPickerFor(null)}
        onPick={(productId) => {
          if (productPickerFor) update(productPickerFor, { productId });
          setProductPickerFor(null);
        }}
      />
    </div>
  );
}

// ---- Block card — block-specific inline edit UI ----------------------

function BlockCard({
  block,
  isFirst,
  isLast,
  disabled,
  isDragging,
  isDropTarget,
  onUpdate,
  onRemove,
  onMove,
  onDuplicate,
  onOpenProductPicker,
  onDragStart,
  onDragEnd,
}: {
  block: MailBlock;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onUpdate: (patch: Partial<MailBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onOpenProductPicker: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className={[
        'group rounded-xl border bg-surface-secondary p-3 transition-colors',
        isDropTarget
          ? 'border-accent/40 bg-accent/[0.04]'
          : 'border-foreground/[0.06]',
        isDragging ? 'cursor-grabbing' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Drag handle */}
          <button
            type="button"
            draggable={!disabled}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            disabled={disabled}
            aria-label="Sürükle"
            className="-ml-1 inline-flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 active:cursor-grabbing"
            title="Sürükleyerek taşı"
          >
            <DragHandleIcon />
          </button>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {BLOCK_LABELS[block.type]}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            onPress={() => onMove(-1)}
            isDisabled={disabled || isFirst}
            aria-label="Yukarı taşı"
            className="h-6 w-6 rounded-md"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            onPress={() => onMove(1)}
            isDisabled={disabled || isLast}
            aria-label="Aşağı taşı"
            className="h-6 w-6 rounded-md"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            onPress={onDuplicate}
            isDisabled={disabled}
            aria-label="Bloğu çoğalt"
            className="h-6 w-6 rounded-md"
          >
            <CopyIcon />
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            onPress={onRemove}
            isDisabled={disabled}
            aria-label="Bloğu sil"
            className="h-6 w-6 rounded-md text-danger"
          >
            <TrashBin className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <BlockBody
        block={block}
        disabled={disabled}
        onUpdate={onUpdate}
        onOpenProductPicker={onOpenProductPicker}
      />
    </div>
  );
}

function BlockBody({
  block,
  disabled,
  onUpdate,
  onOpenProductPicker,
}: {
  block: MailBlock;
  disabled?: boolean;
  onUpdate: (patch: Partial<MailBlock>) => void;
  onOpenProductPicker: () => void;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <HDropdown>
              <HDropdown.Trigger
                className="inline-flex h-7 items-center gap-1 rounded-md bg-foreground/[0.04] px-2 text-[11px] font-medium text-foreground"
                isDisabled={disabled}
              >
                {block.level.toUpperCase()}
                <ChevronDown className="h-3 w-3" />
              </HDropdown.Trigger>
              <HDropdown.Popover className="w-24 bg-surface/95 p-0 backdrop-blur-[4px]">
                <HDropdown.Menu
                  onAction={(k) =>
                    onUpdate({ level: k as 'h1' | 'h2' | 'h3' })
                  }
                >
                  <HDropdown.Item id="h1">H1</HDropdown.Item>
                  <HDropdown.Item id="h2">H2</HDropdown.Item>
                  <HDropdown.Item id="h3">H3</HDropdown.Item>
                </HDropdown.Menu>
              </HDropdown.Popover>
            </HDropdown>
          </div>
          <TextField
            value={block.text}
            onChange={(v) => onUpdate({ text: v })}
            isDisabled={disabled}
          >
            <Input fullWidth variant="secondary" placeholder="Başlık metni" />
          </TextField>
        </div>
      );
    case 'text':
      return (
        <TextField
          value={block.text}
          onChange={(v) => onUpdate({ text: v })}
          isDisabled={disabled}
        >
          <TextArea
            fullWidth
            variant="secondary"
            rows={4}
            placeholder="Metin..."
            className="resize-none"
          />
        </TextField>
      );
    case 'image':
      return (
        <div className="flex flex-col gap-2">
          <TextField
            value={block.url}
            onChange={(v) => onUpdate({ url: v })}
            isDisabled={disabled}
          >
            <Label>Görsel URL</Label>
            <Input placeholder="https://..." />
          </TextField>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              value={block.alt}
              onChange={(v) => onUpdate({ alt: v })}
              isDisabled={disabled}
            >
              <Label>Alt metin</Label>
              <Input placeholder="Erişilebilirlik için" />
            </TextField>
            <TextField
              value={block.href ?? ''}
              onChange={(v) => onUpdate({ href: v || null })}
              isDisabled={disabled}
            >
              <Label>Tıklama linki (opsiyonel)</Label>
              <Input placeholder="https://..." />
            </TextField>
          </div>
          {block.url && (
            <div className="overflow-hidden rounded-lg border border-foreground/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.url}
                alt={block.alt}
                className="block w-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );
    case 'product':
      return (
        <div className="flex flex-col gap-2">
          {block.productId ? (
            <ProductCardPreview productId={block.productId} />
          ) : (
            <div className="rounded-lg border border-dashed border-foreground/[0.10] p-3 text-center text-xs text-muted">
              Henüz ürün seçilmedi
            </div>
          )}
          <Button
            variant="tertiary"
            size="sm"
            onPress={onOpenProductPicker}
            isDisabled={disabled}
            className="rounded-full"
          >
            {block.productId ? 'Ürünü değiştir' : 'Ürün seç'}
          </Button>
        </div>
      );
    case 'button':
      return (
        <div className="flex flex-col gap-2">
          <TextField
            value={block.label}
            onChange={(v) => onUpdate({ label: v })}
            isDisabled={disabled}
          >
            <Label>Buton metni</Label>
            <Input placeholder="Alışverişe başla" />
          </TextField>
          <TextField
            value={block.href}
            onChange={(v) => onUpdate({ href: v })}
            isDisabled={disabled}
          >
            <Label>Tıklama linki</Label>
            <Input placeholder="https://..." />
          </TextField>
          <div className="flex items-center gap-2">
            <Label>Hizalama</Label>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onUpdate({ align: a })}
                disabled={disabled}
                className={[
                  'inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-medium transition-colors',
                  block.align === a
                    ? 'bg-foreground/[0.10] text-foreground'
                    : 'bg-foreground/[0.04] text-muted hover:bg-foreground/[0.06]',
                ].join(' ')}
              >
                {a === 'left' ? 'Sol' : a === 'right' ? 'Sağ' : 'Orta'}
              </button>
            ))}
          </div>
        </div>
      );
    case 'divider':
      return (
        <div className="border-t border-foreground/[0.12]" aria-hidden="true" />
      );
    case 'spacer':
      return (
        <div className="flex items-center gap-2">
          <Label>Yükseklik (px)</Label>
          <input
            type="number"
            min={0}
            max={120}
            value={block.height}
            onChange={(e) =>
              onUpdate({ height: Math.max(0, Math.min(120, Number(e.target.value))) })
            }
            disabled={disabled}
            className="h-8 w-20 rounded-lg border border-foreground/[0.06] bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
          />
        </div>
      );
  }
}

// ---- Product preview + picker -----------------------------------------

/** 6-dot drag handle — gravity-ui'da direkt yok, inline SVG. */
function DragHandleIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="4" cy="2.5" r="1" fill="currentColor" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="9.5" r="1" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
      <circle cx="8" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

/** Duplicate ikonu — küçük overlapping kareler. */
function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="4" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ProductCardPreview({ productId }: { productId: string }) {
  const product = useInventoryStore((s) =>
    s.products.find((p) => p.id === productId),
  );
  if (!product) {
    return (
      <div className="rounded-lg border border-foreground/[0.06] bg-surface p-2 text-xs text-muted">
        Ürün bilgisi yüklenmedi (id: {productId.slice(0, 8)}…)
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-surface p-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
            unoptimized
          />
        ) : (
          <BalinaOsMark className="h-5 w-5 opacity-50" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium text-foreground" title={product.name}>
          {product.name}
        </span>
        <span className="text-[11px] text-muted">
          ₺{Number(product.price).toLocaleString('tr-TR')}
        </span>
      </div>
    </div>
  );
}

function ProductPickerModal({
  isOpen,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPick: (productId: string) => void;
}) {
  const { currentCompany } = useCompanyStore();
  const { products, fetchProducts, isLoading } = useInventoryStore();
  const [search, setSearch] = useState('');

  // Picker açıldığında ürün listesi boşsa fetch et.
  useEffect(() => {
    if (!isOpen || !currentCompany?.id) return;
    if (products.length > 0) return;
    fetchProducts(currentCompany.id, {
      limit: 200,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }, [isOpen, currentCompany?.id, products.length, fetchProducts]);

  const filtered = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.sku ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Ürün seç</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-4 pb-0">
              <div className="mb-2 flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-surface px-3 py-1.5">
                <Magnifier className="h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ürün adı veya SKU"
                  className="w-full border-0 bg-transparent p-0 text-xs text-foreground outline-none placeholder:text-muted"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {isLoading && products.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    Yükleniyor…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    Ürün bulunamadı
                  </div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPick(p.id)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-foreground/[0.04]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 object-cover"
                            unoptimized
                          />
                        ) : (
                          <BalinaOsMark className="h-5 w-5 opacity-50" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span
                          className="truncate text-sm font-medium leading-5 text-foreground"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <span className="truncate text-xs text-muted">
                          {p.sku ?? '—'} · ₺
                          {Number(p.price).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" slot="close">
                Kapat
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
