'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy as CopyIcon,
  TrashBin,
} from '@gravity-ui/icons';
import { BalinaDropdown, BalinaDropdownItem } from '@/components/balina';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useInventoryStore } from '@/stores/inventoryStore';
import {
  type BlockStyle,
  type MailBlock,
  makeDefaultBlock,
  newBlockId,
} from './mail-blocks';

const MIME_NEW = 'application/x-mailblock-new';
const MIME_MOVE = 'application/x-mailblock-move';

/** Library kartlarının drag başlangıcında dataTransfer'a koyacağı standart
 *  payload. EmailCanvas onDrop'ta okuyup yeni block yaratır. */
export function startLibraryDrag(e: React.DragEvent, type: MailBlock['type']) {
  e.dataTransfer.setData(MIME_NEW, type);
  e.dataTransfer.effectAllowed = 'copy';
}

/** Mevcut canvas block'unu reorder için drag etmek. */
function startBlockMove(e: React.DragEvent, id: string) {
  e.dataTransfer.setData(MIME_MOVE, id);
  e.dataTransfer.effectAllowed = 'move';
}

export interface EmailCanvasProps {
  blocks: MailBlock[];
  onChange: (blocks: MailBlock[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  subject: string;
  device: 'desktop' | 'tablet' | 'mobile';
  brandName: string;
  disabled?: boolean;
  /** Email kartının hemen üstüne render edilen toolbar (device toggle vb.).
   *  Border yok — scroll alanı içinde sade biçimde durur. */
  topSlot?: React.ReactNode;
  /** Seçili text/heading/button bloğu için AI text üretimi.
   *  Mevcut blok + ton + opsiyonel brief'le çağrılır; dönen text bloğa
   *  uygulanır (block.text veya button için block.label). */
  onGenerateBlockText?: (
    block: MailBlock,
    opts: { tone?: string; prompt?: string },
  ) => Promise<{ text: string } | null>;
  /** Seçili image/logo bloğu için Fal AI görsel üretimi. Dönen url
   *  block.url'e yazılır. */
  onGenerateImage?: (opts: {
    prompt: string;
    imageSize: ImageAspect;
  }) => Promise<{ url: string; error?: string }>;
}

export type ImageAspect =
  | 'square_hd'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'landscape_16_9';

const DEVICE_WIDTHS = {
  desktop: 640,
  tablet: 480,
  mobile: 360,
} as const;

/** Live, click-to-select, inline-edit email canvas. iframe DEĞİL —
 *  blokları gerçek React olarak render eder ki text düzenlemesi inline
 *  yapılabilsin. Görsel olarak gönderilen email'in shell'iyle eşleşir. */
export function EmailCanvas({
  blocks,
  onChange,
  selectedId,
  onSelect,
  subject,
  device,
  brandName,
  disabled,
  topSlot,
  onGenerateBlockText,
  onGenerateImage,
}: EmailCanvasProps) {
  const insertAt = useCallback(
    (index: number, block: MailBlock) => {
      const copy = [...blocks];
      copy.splice(index, 0, block);
      onChange(copy);
      onSelect(block.id);
    },
    [blocks, onChange, onSelect],
  );

  const moveTo = useCallback(
    (id: string, index: number) => {
      const fromIdx = blocks.findIndex((b) => b.id === id);
      if (fromIdx === -1) return;
      const copy = [...blocks];
      const [moved] = copy.splice(fromIdx, 1);
      const targetIdx = fromIdx < index ? index - 1 : index;
      copy.splice(targetIdx, 0, moved);
      onChange(copy);
    },
    [blocks, onChange],
  );

  /** Bir DropZone'a düşüldüğünde: yeni library item ya da move. */
  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return;
      const newType = e.dataTransfer.getData(MIME_NEW);
      const moveId = e.dataTransfer.getData(MIME_MOVE);
      if (newType) {
        insertAt(index, makeDefaultBlock(newType as MailBlock['type']));
      } else if (moveId) {
        moveTo(moveId, index);
      }
    },
    [disabled, insertAt, moveTo],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<MailBlock>) => {
      onChange(
        blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as MailBlock) : b)),
      );
    },
    [blocks, onChange],
  );

  /** Drop indicator pozisyonu — null değilse o index'in üstünde mavi çizgi
   *  çizilir. Drop sırasında bu değer kullanılır. */
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  /** Sağ-click context menu state — pozisyon + hedef blok. */
  const [contextMenu, setContextMenu] = useState<{
    blockId: string;
    x: number;
    y: number;
  } | null>(null);

  const moveBlockBy = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const next = idx + dir;
      if (next < 0 || next >= blocks.length) return;
      const copy = [...blocks];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      onChange(copy);
    },
    [blocks, onChange],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const clone: MailBlock = {
        ...blocks[idx],
        id: newBlockId(),
      } as MailBlock;
      const copy = [...blocks];
      copy.splice(idx + 1, 0, clone);
      onChange(copy);
      onSelect(clone.id);
    },
    [blocks, onChange, onSelect],
  );

  const removeBlock = useCallback(
    (id: string) => {
      onChange(blocks.filter((b) => b.id !== id));
      if (selectedId === id) onSelect(null);
    },
    [blocks, onChange, onSelect, selectedId],
  );

  const width = DEVICE_WIDTHS[device];

  const acceptsDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(MIME_NEW) ||
    e.dataTransfer.types.includes(MIME_MOVE);

  const handleBodyDragOver = (e: React.DragEvent) => {
    if (disabled || !acceptsDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(MIME_NEW)
      ? 'copy'
      : 'move';
    // Eğer henüz hiçbir blok dragover'a girmediyse, sona ekle.
    if (dropIndex === null) setDropIndex(blocks.length);
  };

  const handleBodyDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    const target = dropIndex ?? blocks.length;
    handleDrop(e, target);
    setDropIndex(null);
  };

  const handleBodyDragLeave = (e: React.DragEvent) => {
    // Sadece tüm body'den çıkıldığında reset et.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropIndex(null);
    }
  };

  return (
    <div
      className="h-full w-full overflow-y-auto bg-foreground/[0.03] p-6"
      onClick={() => onSelect(null)}
    >
      <div
        className="mx-auto flex flex-col transition-[width] duration-200"
        style={{ width: `${width}px`, maxWidth: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topslot (device toggle vb.) — email kartının hemen üstünde, ayrım yok */}
        {topSlot && (
          <div className="mb-3 flex justify-center">{topSlot}</div>
        )}

        {/* Subject preview — mail listesinde görünecek başlık */}
        <div className="mb-3 px-3 text-xs text-muted">
          <span className="font-medium text-foreground">[Konu] </span>
          {subject || <span className="text-muted">(konu girilmedi)</span>}
        </div>

        {/* Email card */}
        <div className="overflow-hidden rounded-2xl border border-foreground/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Brand header */}
          <div className="border-b border-zinc-100 px-6 py-5 text-sm font-semibold text-zinc-600">
            {brandName}
          </div>

          {/* Body — blocks rendered with selection + insertion indicator */}
          <div
            className="px-6 py-6 text-[15px] leading-[1.6] text-zinc-900"
            onDragOver={handleBodyDragOver}
            onDragLeave={handleBodyDragLeave}
            onDrop={handleBodyDrop}
          >
            {blocks.length === 0 ? (
              <div
                className={[
                  'rounded-xl border-2 border-dashed px-6 py-12 text-center text-xs transition-colors',
                  dropIndex !== null
                    ? 'border-accent bg-accent/[0.06] text-accent'
                    : 'border-zinc-200 text-zinc-400',
                ].join(' ')}
              >
                Sol panelden blok sürükle ya da kartına tıkla
              </div>
            ) : (
              <>
                {blocks.map((b, idx) => {
                  const isSelected = selectedId === b.id;
                  const aiAttached =
                    isSelected &&
                    !disabled &&
                    isAiEligibleBlock(b) &&
                    !!onGenerateBlockText;
                  const imageAttached =
                    isSelected &&
                    !disabled &&
                    isUrlBlock(b) &&
                    !!onGenerateImage;
                  const hasKulakcik = aiAttached || imageAttached;
                  const shell = (
                    <BlockShell
                      block={b}
                      isSelected={isSelected}
                      hasAiPanel={hasKulakcik}
                      onSelect={() => onSelect(b.id)}
                      onUpdate={(patch) => updateBlock(b.id, patch)}
                      onMoveStart={(e) => startBlockMove(e, b.id)}
                      onDragOverBlock={(side) =>
                        setDropIndex(side === 'top' ? idx : idx + 1)
                      }
                      onContextMenu={(e) => {
                        if (disabled) return;
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(b.id);
                        setContextMenu({
                          blockId: b.id,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      disabled={disabled}
                    />
                  );
                  return (
                    <Fragment key={b.id}>
                      <DropIndicator active={dropIndex === idx} />
                      {hasKulakcik ? (
                        <div className="my-0.5 rounded-xl bg-accent/[0.08] p-1">
                          {shell}
                          {aiAttached &&
                            isAiEligibleBlock(b) &&
                            onGenerateBlockText && (
                              <AiAssistPanel
                                block={b}
                                onGenerate={(opts) =>
                                  onGenerateBlockText(b, opts)
                                }
                                onApply={(text) => {
                                  if (b.type === 'button') {
                                    updateBlock(b.id, { label: text });
                                  } else {
                                    updateBlock(b.id, { text });
                                  }
                                }}
                              />
                            )}
                          {imageAttached &&
                            isUrlBlock(b) &&
                            onGenerateImage && (
                              <ImageAiPanel
                                block={b}
                                onGenerate={onGenerateImage}
                                onApply={(url) =>
                                  updateBlock(b.id, { url } as Partial<MailBlock>)
                                }
                              />
                            )}
                        </div>
                      ) : (
                        shell
                      )}
                    </Fragment>
                  );
                })}
                <DropIndicator active={dropIndex === blocks.length} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-100 px-6 py-5 text-center text-xs leading-[1.5] text-zinc-500">
            Bu maili {brandName} mağazalarından alışveriş yaptığınız için
            aldınız.
            <br />
            <span className="text-zinc-500 underline">
              Mailing servisinden çıkmak ister misiniz?
            </span>
          </div>
        </div>
      </div>

      {/* Sağ-click context menu — blok aksiyonları */}
      {contextMenu &&
        (() => {
          const idx = blocks.findIndex((b) => b.id === contextMenu.blockId);
          if (idx === -1) return null;
          return (
            <BlockContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              isFirst={idx === 0}
              isLast={idx === blocks.length - 1}
              onClose={() => setContextMenu(null)}
              onMoveUp={() => {
                moveBlockBy(contextMenu.blockId, -1);
                setContextMenu(null);
              }}
              onMoveDown={() => {
                moveBlockBy(contextMenu.blockId, 1);
                setContextMenu(null);
              }}
              onDuplicate={() => {
                duplicateBlock(contextMenu.blockId);
                setContextMenu(null);
              }}
              onRemove={() => {
                removeBlock(contextMenu.blockId);
                setContextMenu(null);
              }}
            />
          );
        })()}
    </div>
  );
}

// ============================================================================
// AI assist panel — seçili text/heading/button bloğu altında inline
// ============================================================================

const TONE_OPTIONS = [
  { id: 'samimi', label: 'Samimi' },
  { id: 'espirili', label: 'Espirili' },
  { id: 'resmi', label: 'Resmi' },
  { id: 'satis', label: 'Satışa yönelik' },
] as const;

type AiEligibleBlock = Extract<
  MailBlock,
  { type: 'heading' } | { type: 'text' } | { type: 'button' }
>;

function isAiEligibleBlock(b: MailBlock): b is AiEligibleBlock {
  return b.type === 'heading' || b.type === 'text' || b.type === 'button';
}

type UrlBlock = Extract<MailBlock, { type: 'image' } | { type: 'logo' }>;

function isUrlBlock(b: MailBlock): b is UrlBlock {
  return b.type === 'image' || b.type === 'logo';
}

const IMAGE_ASPECT_OPTIONS = [
  { id: 'square_hd' as ImageAspect, label: 'Kare' },
  { id: 'portrait_4_3' as ImageAspect, label: 'Portre 4:3' },
  { id: 'portrait_16_9' as ImageAspect, label: 'Portre 16:9' },
  { id: 'landscape_4_3' as ImageAspect, label: 'Manzara 4:3' },
  { id: 'landscape_16_9' as ImageAspect, label: 'Manzara 16:9' },
];

/** Görsel/Logo blokları için Fal AI görsel üretim paneli. Prompt + aspect
 *  ratio seçimi; Üret tıklayınca üretilen url block.url'e yazılır. */
function ImageAiPanel({
  block,
  onGenerate,
  onApply,
}: {
  block: UrlBlock;
  onGenerate: (opts: {
    prompt: string;
    imageSize: ImageAspect;
  }) => Promise<{ url: string; error?: string }>;
  onApply: (url: string) => void;
}) {
  const [aspect, setAspect] = useState<ImageAspect>('square_hd');
  const [prompt, setPrompt] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectLabel =
    IMAGE_ASPECT_OPTIONS.find((a) => a.id === aspect)?.label ?? 'Kare';

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsPending(true);
    setError(null);
    const result = await onGenerate({ prompt: prompt.trim(), imageSize: aspect });
    setIsPending(false);
    if (result.url) {
      onApply(result.url);
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col gap-1 px-2 pt-1"
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-accent">
          <BalinaOsMark className="h-3.5 w-3.5" />
          balinaOS AI · {block.type === 'logo' ? 'logo' : 'görsel'}
        </div>
        <BalinaDropdown
          align="start"
          trigger={
            <button
              type="button"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-accent hover:bg-accent/10"
            >
              {aspectLabel}
              <ChevronDown className="h-3 w-3" />
            </button>
          }
        >
          {IMAGE_ASPECT_OPTIONS.map((a) => (
            <BalinaDropdownItem
              key={a.id}
              onSelect={() => setAspect(a.id)}
              selected={aspect === a.id}
            >
              {a.label}
            </BalinaDropdownItem>
          ))}
        </BalinaDropdown>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt — örn. kırmızı ipek elbise, beyaz arkaplan"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleGenerate();
            }
          }}
          className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-accent/50"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || !prompt.trim()}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-60"
        >
          {isPending ? 'Üretiliyor…' : 'Üret'}
        </button>
      </div>
      {error && <div className="px-1 text-[11px] text-danger">{error}</div>}
    </div>
  );
}

function AiAssistPanel({
  block,
  onGenerate,
  onApply,
}: {
  block: AiEligibleBlock;
  onGenerate: (opts: {
    tone?: string;
    prompt?: string;
  }) => Promise<{ text: string } | null>;
  onApply: (text: string) => void;
}) {
  const [tone, setTone] = useState<string>('samimi');
  const [prompt, setPrompt] = useState('');
  const [isPending, setIsPending] = useState(false);

  const toneLabel =
    TONE_OPTIONS.find((t) => t.id === tone)?.label ?? 'Ton seç';

  const handleGenerate = async () => {
    setIsPending(true);
    const result = await onGenerate({
      tone: TONE_OPTIONS.find((t) => t.id === tone)?.label,
      prompt: prompt.trim() || undefined,
    });
    setIsPending(false);
    if (result?.text) onApply(result.text);
  };

  const kindLabel =
    block.type === 'button'
      ? 'buton metni'
      : block.type === 'heading'
        ? 'başlık'
        : 'paragraf';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 px-2 pt-1"
    >
      <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-accent">
        <BalinaOsMark className="h-3.5 w-3.5" />
        balinaOS AI · {kindLabel}
      </div>
      <BalinaDropdown
        align="start"
        trigger={
          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-accent hover:bg-accent/10"
          >
            {toneLabel}
            <ChevronDown className="h-3 w-3" />
          </button>
        }
      >
        {TONE_OPTIONS.map((t) => (
          <BalinaDropdownItem
            key={t.id}
            onSelect={() => setTone(t.id)}
            selected={tone === t.id}
          >
            {t.label}
          </BalinaDropdownItem>
        ))}
      </BalinaDropdown>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Kısa brief (ops.) — örn. %20 indirim vurgusu"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
          }
        }}
        className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-accent/50"
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-60"
      >
        {isPending ? 'Üretiliyor…' : 'Üret'}
      </button>
    </div>
  );
}

// ============================================================================
// Block context menu (sağ-click dropdown)
// ============================================================================

function BlockContextMenu({
  x,
  y,
  isFirst,
  isLast,
  onClose,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  x: number;
  y: number;
  isFirst: boolean;
  isLast: boolean;
  onClose: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: x,
    top: y,
  });

  // Mount sonrası ekran kenarlarını aşmaması için clamp et.
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    let left = x;
    let top = y;
    if (left + rect.width + margin > vw) left = vw - rect.width - margin;
    if (top + rect.height + margin > vh) top = vh - rect.height - margin;
    if (left < margin) left = margin;
    if (top < margin) top = margin;
    setPos({ left, top });
  }, [x, y]);

  // Dışarı tıklama / Escape ile kapat.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Bir sonraki tick'te ekle ki açan click'i yakalamasın.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-xl border border-foreground/[0.08] bg-white/95 py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur"
    >
      <ContextItem
        label="Yukarı taşı"
        icon={<ArrowUp className="h-3.5 w-3.5" />}
        disabled={isFirst}
        onClick={onMoveUp}
      />
      <ContextItem
        label="Aşağı taşı"
        icon={<ArrowDown className="h-3.5 w-3.5" />}
        disabled={isLast}
        onClick={onMoveDown}
      />
      <ContextItem
        label="Çoğalt"
        icon={<CopyIcon className="h-3.5 w-3.5" />}
        onClick={onDuplicate}
      />
      <div className="my-1 h-px bg-foreground/[0.06]" />
      <ContextItem
        label="Sil"
        icon={<TrashBin className="h-3.5 w-3.5" />}
        onClick={onRemove}
        danger
      />
    </div>
  );
}

function ContextItem({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
        disabled
          ? 'cursor-not-allowed text-muted/60'
          : danger
            ? 'text-danger hover:bg-danger/[0.06]'
            : 'text-foreground hover:bg-foreground/[0.04]',
      ].join(' ')}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">
        {icon}
      </span>
      {label}
    </button>
  );
}

// ============================================================================
// Drop indicator — bloklar arasında mavi çizgi (drop hedefi)
// ============================================================================

function DropIndicator({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={[
        'rounded-full transition-all duration-100',
        active ? 'my-2 h-1 bg-accent shadow-[0_0_6px_rgba(0,0,0,0.06)]' : 'my-0 h-0',
      ].join(' ')}
    />
  );
}

// ============================================================================
// Block shell — selection chrome + content
// ============================================================================

function BlockShell({
  block,
  isSelected,
  hasAiPanel,
  onSelect,
  onUpdate,
  onMoveStart,
  onDragOverBlock,
  onContextMenu,
  disabled,
}: {
  block: MailBlock;
  isSelected: boolean;
  /** AI panel bitişik render ediliyor — block kendi padding'li beyaz kart
   *  içinde gösterilir, dışındaki accent wrapper chrome sağlar. */
  hasAiPanel: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<MailBlock>) => void;
  onMoveStart: (e: React.DragEvent) => void;
  onDragOverBlock?: (side: 'top' | 'bottom') => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || !onDragOverBlock) return;
    if (
      !e.dataTransfer.types.includes(MIME_NEW) &&
      !e.dataTransfer.types.includes(MIME_MOVE)
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onDragOverBlock(y < rect.height / 2 ? 'top' : 'bottom');
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={onContextMenu}
      onDragOver={handleDragOver}
      className={[
        'group relative cursor-pointer transition-colors',
        hasAiPanel
          ? // AI panel açık: white iç kart, dış accent wrapper chrome'u sağlar
            'rounded-lg bg-white px-3 py-2'
          : isSelected
            ? 'my-0.5 rounded-lg border border-accent'
            : 'my-0.5 rounded-lg border border-transparent hover:bg-foreground/[0.02]',
      ].join(' ')}
    >
      {/* Drag handle — sadece seçili veya hover'da görünür */}
      {!disabled && (
        <button
          type="button"
          draggable
          onDragStart={onMoveStart}
          onClick={(e) => e.stopPropagation()}
          aria-label="Sürükleyerek taşı"
          className={[
            'absolute -left-6 top-1/2 -translate-y-1/2 flex h-6 w-5 cursor-grab items-center justify-center rounded text-muted opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground active:cursor-grabbing',
            isSelected ? 'opacity-100' : 'group-hover:opacity-100',
          ].join(' ')}
        >
          <DragHandleIcon />
        </button>
      )}
      <BlockContent block={block} onUpdate={onUpdate} disabled={disabled} />
    </div>
  );
}

// ============================================================================
// Block content — inline-editable per type
// ============================================================================

function BlockContent({
  block,
  onUpdate,
  disabled,
}: {
  block: MailBlock;
  onUpdate: (patch: Partial<MailBlock>) => void;
  disabled?: boolean;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <HeadingRender
          block={block}
          onUpdate={onUpdate}
          disabled={disabled}
        />
      );
    case 'text':
      return (
        <TextRender block={block} onUpdate={onUpdate} disabled={disabled} />
      );
    case 'image':
      return <ImageRender block={block} />;
    case 'logo':
      return <LogoRender block={block} />;
    case 'product':
      return <ProductRender block={block} />;
    case 'product-grid':
      return <ProductGridRender block={block} />;
    case 'button':
      return (
        <ButtonRender block={block} onUpdate={onUpdate} disabled={disabled} />
      );
    case 'divider':
      return <DividerRender block={block} />;
    case 'spacer':
      return <SpacerRender block={block} />;
  }
}

// ----- Renderers — each mirrors renderBlock's email-safe output -----

function wrapperStyle(style: BlockStyle | undefined): React.CSSProperties {
  if (!style) return {};
  const css: React.CSSProperties = {};
  if (style.paddingTop != null) css.paddingTop = style.paddingTop;
  if (style.paddingRight != null) css.paddingRight = style.paddingRight;
  if (style.paddingBottom != null) css.paddingBottom = style.paddingBottom;
  if (style.paddingLeft != null) css.paddingLeft = style.paddingLeft;
  if (style.fillColor) css.backgroundColor = style.fillColor;
  if (
    style.strokeWidth != null &&
    style.strokeColor &&
    style.strokeWidth > 0
  ) {
    css.border = `${style.strokeWidth}px solid ${style.strokeColor}`;
  }
  if (style.cornerRadius != null && style.cornerRadius > 0) {
    css.borderRadius = style.cornerRadius;
  }
  if (style.opacity != null && style.opacity < 100) {
    css.opacity = style.opacity / 100;
  }
  return css;
}

function HeadingRender({
  block,
  onUpdate,
  disabled,
}: {
  block: Extract<MailBlock, { type: 'heading' }>;
  onUpdate: (patch: Partial<MailBlock>) => void;
  disabled?: boolean;
}) {
  const sizes = { h1: 26, h2: 20, h3: 16 } as const;
  const Tag = block.level as 'h1' | 'h2' | 'h3';
  const align = block.align ?? 'left';
  const inner = (
    <Tag
      contentEditable={!disabled}
      suppressContentEditableWarning
      onBlur={(e) => onUpdate({ text: e.currentTarget.textContent ?? '' })}
      style={{
        margin: 0,
        fontSize: block.style?.fontSize ?? sizes[block.level],
        lineHeight: block.style?.lineHeight ?? 1.3,
        color: block.style?.textColor ?? '#111827',
        fontWeight: block.style?.fontWeight ?? 600,
        textAlign: align,
        outline: 'none',
      }}
      className=""
    >
      {block.text}
    </Tag>
  );
  return <div style={wrapperStyle(block.style)}>{inner}</div>;
}

function TextRender({
  block,
  onUpdate,
  disabled,
}: {
  block: Extract<MailBlock, { type: 'text' }>;
  onUpdate: (patch: Partial<MailBlock>) => void;
  disabled?: boolean;
}) {
  const align = block.align ?? 'left';
  return (
    <div style={wrapperStyle(block.style)}>
      <p
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ text: e.currentTarget.innerText })}
        style={{
          margin: 0,
          fontSize: block.style?.fontSize ?? 15,
          lineHeight: block.style?.lineHeight ?? 1.6,
          color: block.style?.textColor ?? '#111827',
          fontWeight: block.style?.fontWeight ?? 400,
          textAlign: align,
          outline: 'none',
          whiteSpace: 'pre-wrap',
        }}
        className=""
      >
        {block.text}
      </p>
    </div>
  );
}

function ImageRender({
  block,
}: {
  block: Extract<MailBlock, { type: 'image' }>;
}) {
  const radius = block.style?.cornerRadius ?? 8;
  return (
    <div
      style={{ margin: '8px 0 16px 0', ...wrapperStyle(block.style) }}
    >
      {block.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.url}
          alt={block.alt}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: radius,
          }}
        />
      ) : (
        <div
          style={{ borderRadius: radius }}
          className="flex h-40 items-center justify-center bg-zinc-100 text-xs text-zinc-400"
        >
          Görsel URL&apos;i sağ panelden ekle
        </div>
      )}
    </div>
  );
}

function LogoRender({
  block,
}: {
  block: Extract<MailBlock, { type: 'logo' }>;
}) {
  if (!block.url) {
    return (
      <div className="my-2 flex items-center justify-center py-2 text-xs text-zinc-400">
        Logo URL&apos;i sağ panelden ekle
      </div>
    );
  }
  return (
    <div style={{ margin: '8px 0 20px 0', textAlign: 'center', ...wrapperStyle(block.style) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.url}
        alt="Logo"
        style={{
          display: 'inline-block',
          maxWidth: 160,
          maxHeight: 48,
          height: 'auto',
          width: 'auto',
        }}
      />
    </div>
  );
}

function ProductRender({
  block,
}: {
  block: Extract<MailBlock, { type: 'product' }>;
}) {
  const product = useInventoryStore((s) =>
    s.products.find((p) => p.id === block.productId),
  );
  if (!block.productId) {
    return (
      <div className="my-3 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400">
        Sağ panelden ürün seç
      </div>
    );
  }
  return (
    <div
      className="my-3 flex flex-col items-center gap-2"
      style={wrapperStyle(block.style)}
    >
      <div className="h-44 w-44 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
        {product?.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={176}
            height={176}
            className="h-44 w-44 object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            Ürün görseli
          </div>
        )}
      </div>
      <div className="text-sm font-semibold text-zinc-900">
        {product?.name ?? 'Ürün adı'}
      </div>
      <div className="text-sm text-zinc-700">
        {product
          ? `₺${Number(product.price).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })}`
          : '₺—'}
      </div>
    </div>
  );
}

function ProductGridRender({
  block,
}: {
  block: Extract<MailBlock, { type: 'product-grid' }>;
}) {
  const ids = block.productIds.filter(Boolean);
  if (ids.length === 0) {
    return (
      <div className="my-3 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400">
        Sağ panelden ürünler ekle
      </div>
    );
  }
  return (
    <div
      className="my-4 grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))`,
        ...wrapperStyle(block.style),
      }}
    >
      {ids.map((pid, i) => (
        <ProductGridCell key={`${pid}-${i}`} productId={pid} />
      ))}
    </div>
  );
}

function ProductGridCell({ productId }: { productId: string }) {
  const product = useInventoryStore((s) =>
    s.products.find((p) => p.id === productId),
  );
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
        {product?.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={200}
            height={200}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
            Ürün
          </div>
        )}
      </div>
      <div className="text-center text-xs font-semibold text-zinc-900">
        {product?.name ?? 'Ürün'}
      </div>
      <div className="text-center text-xs text-zinc-700">
        {product
          ? `₺${Number(product.price).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })}`
          : '₺—'}
      </div>
    </div>
  );
}

function ButtonRender({
  block,
  onUpdate,
  disabled,
}: {
  block: Extract<MailBlock, { type: 'button' }>;
  onUpdate: (patch: Partial<MailBlock>) => void;
  disabled?: boolean;
}) {
  const align: React.CSSProperties['textAlign'] =
    block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : 'center';
  const bg = block.style?.fillColor ?? '#111827';
  const color = block.style?.textColor ?? '#ffffff';
  const radius = block.style?.cornerRadius ?? 9999;
  const fontSize = block.style?.fontSize ?? 14;
  const weight = block.style?.fontWeight ?? 600;
  const border =
    block.style?.strokeColor && (block.style?.strokeWidth ?? 0) > 0
      ? `${block.style.strokeWidth}px solid ${block.style.strokeColor}`
      : undefined;
  return (
    <div style={{ margin: '16px 0', textAlign: align, ...wrapperStyle(block.style) }}>
      <span
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ label: e.currentTarget.textContent ?? '' })}
        style={{
          display: 'inline-block',
          background: bg,
          color,
          padding: '12px 24px',
          borderRadius: radius,
          fontSize,
          fontWeight: weight,
          border,
          outline: 'none',
          textDecoration: 'none',
        }}
      >
        {block.label}
      </span>
    </div>
  );
}

function DividerRender({
  block,
}: {
  block: Extract<MailBlock, { type: 'divider' }>;
}) {
  const color = block.style?.strokeColor ?? '#e5e7eb';
  const width = block.style?.strokeWidth ?? 1;
  return (
    <hr
      style={{
        border: 0,
        borderTop: `${width}px solid ${color}`,
        margin: '20px 0',
        ...wrapperStyle(block.style),
      }}
    />
  );
}

function SpacerRender({
  block,
}: {
  block: Extract<MailBlock, { type: 'spacer' }>;
}) {
  return (
    <div
      style={{
        height: Math.max(0, Math.min(120, block.height)),
        lineHeight: '1px',
      }}
      className="select-none text-transparent"
    >
      .
    </div>
  );
}

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
