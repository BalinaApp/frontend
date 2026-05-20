'use client';

import { useState } from 'react';
import {
  ChevronDown,
  LayersVertical,
  LayoutCells,
  Magnifier,
  Picture,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import {
  BLOCK_LABELS,
  makeDefaultBlock,
  type MailBlock,
} from './mail-blocks';
import { startLibraryDrag } from './email-canvas';

type LeftTab = 'layout' | 'layers' | 'assets';

interface EmailLeftRailProps {
  blocks: MailBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (blocks: MailBlock[]) => void;
  disabled?: boolean;
  /** Panelin en altına sabitlenen aksiyon satırı (Test gönder + Tam önizle). */
  footer?: React.ReactNode;
}

/** Sol panel — Layout / Layers / Assets tab'leri. Layout = block library
 *  (arama + kategorili kart grid'i, drag + click ekle). Layers = canvas'taki
 *  block'ların reorderable hiyerarşik listesi. Assets = stub. */
export function EmailLeftRail({
  blocks,
  selectedId,
  onSelect,
  onChange,
  disabled,
  footer,
}: EmailLeftRailProps) {
  const [tab, setTab] = useState<LeftTab>('layout');

  const tabs: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
    { id: 'layout', label: 'Düzen', icon: <LayoutCells className="h-4 w-4" /> },
    {
      id: 'layers',
      label: 'Katmanlar',
      icon: <LayersVertical className="h-4 w-4" />,
    },
    {
      id: 'assets',
      label: 'Varlıklar',
      icon: <Picture className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-foreground/[0.06] md:flex">
      {/* Vertical icon+label list (Typeform tarzı) */}
      <nav className="flex shrink-0 flex-col gap-0.5 border-b border-foreground/[0.06] p-2">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                isActive
                  ? 'bg-foreground/[0.06] text-foreground'
                  : 'text-muted hover:bg-foreground/[0.03] hover:text-foreground',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex h-4 w-4 shrink-0 items-center justify-center',
                  isActive ? 'text-foreground' : 'text-muted',
                ].join(' ')}
              >
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'layout' && (
          <LayoutTab onAddAt={(type) => onChange([...blocks, makeDefaultBlock(type)])} disabled={disabled} />
        )}
        {tab === 'layers' && (
          <LayersTab
            blocks={blocks}
            selectedId={selectedId}
            onSelect={onSelect}
            onChange={onChange}
            disabled={disabled}
          />
        )}
        {tab === 'assets' && <AssetsTab />}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-foreground/[0.06] p-3">
          {footer}
        </div>
      )}
    </aside>
  );
}

// ============================================================================
// Layout tab — block library
// ============================================================================

const LIBRARY_GROUPS: { title: string; items: MailBlock['type'][] }[] = [
  {
    title: 'Bloklar',
    items: ['logo', 'heading', 'text', 'image', 'button', 'divider', 'spacer'],
  },
  {
    title: 'Ürün',
    items: ['product', 'product-grid'],
  },
];

function LayoutTab({
  onAddAt,
  disabled,
}: {
  onAddAt: (type: MailBlock['type']) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl bg-foreground/[0.04] px-3 py-2">
        <Magnifier className="h-3.5 w-3.5 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Blok ara"
          className="w-full border-0 bg-transparent p-0 text-xs text-foreground outline-none placeholder:text-muted"
        />
      </div>

      {LIBRARY_GROUPS.map((group) => (
        <LibrarySection
          key={group.title}
          title={group.title}
          items={group.items.filter((t) =>
            q ? BLOCK_LABELS[t].toLowerCase().includes(q) : true,
          )}
          onAdd={onAddAt}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function LibrarySection({
  title,
  items,
  onAdd,
  disabled,
}: {
  title: string;
  items: MailBlock['type'][];
  onAdd: (type: MailBlock['type']) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between rounded-md bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent"
      >
        <span className="inline-flex items-center gap-1.5">
          <BlockIcon type="heading" className="h-3.5 w-3.5" />
          {title}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2">
          {items.map((type) => (
            <LibraryCard
              key={type}
              type={type}
              onAdd={() => onAdd(type)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryCard({
  type,
  onAdd,
  disabled,
}: {
  type: MailBlock['type'];
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={(e) => !disabled && startLibraryDrag(e, type)}
      onClick={onAdd}
      disabled={disabled}
      className="group flex h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-foreground/[0.06] bg-white/60 px-2 transition-colors hover:border-accent/40 hover:bg-accent/[0.04] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex h-10 w-full items-center justify-center text-foreground/60 group-hover:text-foreground">
        <BlockIcon type={type} className="h-6 w-6" />
      </div>
      <span className="text-[11px] font-medium text-foreground">
        {BLOCK_LABELS[type]}
      </span>
    </button>
  );
}

// ============================================================================
// Layers tab — reorderable list
// ============================================================================

function LayersTab({
  blocks,
  selectedId,
  onSelect,
  onChange,
  disabled,
}: {
  blocks: MailBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (blocks: MailBlock[]) => void;
  disabled?: boolean;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    onChange(copy);
  };
  const remove = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedId === id) onSelect(null);
  };

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.10] bg-foreground/[0.02] p-6 text-center text-xs text-muted">
        Henüz blok yok — Layout sekmesinden ekle.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {blocks.map((b) => {
        const isSelected = selectedId === b.id;
        const isOver = overId === b.id && draggingId !== b.id;
        return (
          <div
            key={b.id}
            onDragOver={(e) => {
              if (disabled || !draggingId || draggingId === b.id) return;
              e.preventDefault();
              setOverId(b.id);
            }}
            onDragLeave={() => setOverId(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (!draggingId || draggingId === b.id) return;
              const fromIdx = blocks.findIndex((x) => x.id === draggingId);
              const toIdx = blocks.findIndex((x) => x.id === b.id);
              if (fromIdx === -1 || toIdx === -1) return;
              const copy = [...blocks];
              const [moved] = copy.splice(fromIdx, 1);
              copy.splice(toIdx, 0, moved);
              onChange(copy);
              setDraggingId(null);
              setOverId(null);
            }}
            className={[
              'group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors',
              isSelected
                ? 'border-accent/40 bg-accent/[0.06]'
                : isOver
                  ? 'border-accent/40 bg-accent/[0.04]'
                  : 'border-foreground/[0.06] bg-white/40 hover:bg-foreground/[0.04]',
            ].join(' ')}
          >
            <button
              type="button"
              draggable={!disabled}
              onDragStart={() => setDraggingId(b.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
              aria-label="Sürükle"
              className="-ml-1 inline-flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted hover:bg-foreground/[0.06] active:cursor-grabbing"
            >
              <DragDotsIcon />
            </button>
            <BlockIcon type={b.type} className="h-3.5 w-3.5 shrink-0 text-muted" />
            <button
              type="button"
              onClick={() => onSelect(b.id)}
              className="flex min-w-0 flex-1 flex-col items-start text-left"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {BLOCK_LABELS[b.type]}
              </span>
              <span className="line-clamp-1 text-xs text-foreground/80">
                {previewText(b)}
              </span>
            </button>
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="tertiary"
                size="sm"
                isIconOnly
                onPress={() => move(b.id, -1)}
                isDisabled={disabled}
                aria-label="Yukarı"
                className="h-6 w-6 rounded-md"
              >
                <ArrowUpSm />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                isIconOnly
                onPress={() => move(b.id, 1)}
                isDisabled={disabled}
                aria-label="Aşağı"
                className="h-6 w-6 rounded-md"
              >
                <ArrowDownSm />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                isIconOnly
                onPress={() => remove(b.id)}
                isDisabled={disabled}
                aria-label="Sil"
                className="h-6 w-6 rounded-md text-danger"
              >
                <TrashBin className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function previewText(b: MailBlock): string {
  switch (b.type) {
    case 'heading':
    case 'text':
      return b.text.slice(0, 60) || '(boş)';
    case 'image':
      return b.url ? b.url.split('/').pop() ?? b.url : '(görsel yok)';
    case 'logo':
      return b.url ? 'Logo' : '(logo yok)';
    case 'product':
      return b.productId ? `Ürün #${b.productId.slice(0, 6)}` : '(ürün seçilmedi)';
    case 'product-grid':
      return `${b.columns} kolon · ${b.productIds.filter(Boolean).length} ürün`;
    case 'button':
      return b.label || '(boş)';
    case 'divider':
      return '─────';
    case 'spacer':
      return `${b.height}px`;
  }
}

// ============================================================================
// Assets tab — stub
// ============================================================================

function AssetsTab() {
  return (
    <div className="rounded-xl border border-dashed border-foreground/[0.10] bg-foreground/[0.02] p-6 text-center text-xs text-muted">
      <div className="mb-2 flex justify-center text-muted">
        <Plus className="h-5 w-5" />
      </div>
      Varlık yükleme yakında.
      <br />
      Şimdilik görseller için doğrudan URL kullan.
    </div>
  );
}

// ============================================================================
// Block icons — basit, blok tipini görsel olarak ifade eden minimal SVG'ler
// ============================================================================

export function BlockIcon({
  type,
  className,
}: {
  type: MailBlock['type'];
  className?: string;
}) {
  switch (type) {
    case 'heading':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path d="M5 4v16M19 4v16M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'text':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path d="M4 7h16M4 12h12M4 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'image':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 17l5-5 4 4 2-2 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'logo':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 12h2M12 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'product':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M4 8l8 4 8-4M12 12v8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'product-grid':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'button':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <rect x="3" y="8" width="18" height="8" rx="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'divider':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 8h2M11 8h2M17 8h2M5 16h2M11 16h2M17 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    case 'spacer':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path d="M12 4v16M8 7l4-3 4 3M8 17l4 3 4-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function DragDotsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="4" cy="2.5" r="1" fill="currentColor" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="9.5" r="1" fill="currentColor" />
      <circle cx="8" cy="2.5" r="1" fill="currentColor" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
      <circle cx="8" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ArrowUpSm() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownSm() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

