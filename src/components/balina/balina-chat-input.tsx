'use client';

import * as React from 'react';
import { Video, Picture, CircleQuestion } from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';
import { BalinaAttachIcon, BalinaArrowUpIcon, BalinaDownIcon } from './icons';
import { BalinaDropdown, BalinaDropdownItem } from './balina-dropdown';
import { BalinaTooltip } from './balina-tooltip';

export type BalinaChatMode = 'chat' | 'image' | 'video';

const CHAT_MODES: { value: BalinaChatMode; label: string; icon: React.ReactNode }[] = [
  { value: 'chat', label: 'Sohbet', icon: <CircleQuestion className="h-4 w-4" /> },
  { value: 'image', label: 'Görsel', icon: <Picture className="h-4 w-4" /> },
  { value: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
];

/* Balina ChatInput — AI sohbet composer'ı. Bağlam satırı + contentEditable
 * mention editörü (ürün satır içinde chip olarak eklenir) + aksiyon satırı. */

export interface BalinaChatInputHandle {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
  /** Tüm metni değiştirir (hızlı aksiyon prompt'u). */
  setText: (text: string) => void;
  /** İmleç konumuna ürün chip'i ekler. */
  insertProduct: (product: { id: string; name: string; imageUrl?: string | null }) => void;
  /** Editörde eklenmiş ürün chip'lerinin id'leri. */
  getProductIds: () => string[];
}

export interface BalinaChatInputProps {
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  placeholder?: string;
  mode?: BalinaChatMode;
  onModeChange?: (mode: BalinaChatMode) => void;
  /** "@" ya da "Bağlam ekle" tetiklenince. */
  onAddContext?: () => void;
  /** Bağlam satırı içeriği (ör. ürün picker'ı + dosya chip'leri). */
  contextSlot?: React.ReactNode;
  onAttach?: () => void;
  /** Sürükle-bırak veya ataç ile dosya eklendiğinde. */
  onFiles?: (files: File[]) => void;
  className?: string;
}

const CHIP_CLASS =
  'balina-mention-chip group relative mx-0.5 inline-flex h-7 max-w-56 items-center gap-1 rounded-[0.625rem] bg-[var(--balina-background-dark-default)] p-0.5 align-middle text-body-default-regular transition-colors hover:bg-[var(--balina-background-dark-strong)]';

const CHIP_CLOSE_SVG =
  '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5.16602 5.16675L10.8327 10.8334M10.8327 5.16675L5.16602 10.8334"/></svg>';

export const BalinaChatInput = React.forwardRef<BalinaChatInputHandle, BalinaChatInputProps>(
  function BalinaChatInput(
    {
      onChange,
      onSend,
      placeholder = 'Yaz, ya da bağlam eklemek için "@" tuşuna bas',
      mode: modeProp,
      onModeChange,
      onAddContext,
      contextSlot,
      onAttach,
      onFiles,
      className,
    },
    ref,
  ) {
    const [internalMode, setInternalMode] = React.useState<BalinaChatMode>('chat');
    const mode = modeProp ?? internalMode;
    const setMode = (m: BalinaChatMode) => {
      if (modeProp === undefined) setInternalMode(m);
      onModeChange?.(m);
    };
    const activeMode = CHAT_MODES.find((m) => m.value === mode) ?? CHAT_MODES[0];

    const editorRef = React.useRef<HTMLDivElement>(null);
    const savedRange = React.useRef<Range | null>(null);
    const [empty, setEmpty] = React.useState(true);
    const [dragging, setDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const getText = () => editorRef.current?.textContent ?? '';
    const refreshEmpty = () => {
      const el = editorRef.current;
      setEmpty(!el || (!el.textContent?.trim() && !el.querySelector('.balina-mention-chip')));
    };
    const notify = () => {
      refreshEmpty();
      onChange?.(getText());
    };

    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    };

    const send = () => {
      const text = getText().trim();
      if (!text) return;
      onSend?.(text);
      if (editorRef.current) editorRef.current.innerHTML = '';
      refreshEmpty();
    };

    const handleFiles = (list: FileList | null) => {
      const files = (list ? Array.from(list) : []).filter((f) => f.type.startsWith('image/'));
      if (files.length) onFiles?.(files);
    };

    React.useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      clear: () => {
        if (editorRef.current) editorRef.current.innerHTML = '';
        refreshEmpty();
      },
      getValue: () => getText(),
      setText: (text: string) => {
        if (!editorRef.current) return;
        editorRef.current.textContent = text;
        // İmleci sona taşı.
        const el = editorRef.current;
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        notify();
      },
      insertProduct: (product) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        let range = savedRange.current;
        if (!range || !el.contains(range.commonAncestorContainer)) {
          range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);
        range.deleteContents();
        const chip = document.createElement('span');
        chip.contentEditable = 'false';
        chip.dataset.productId = product.id;
        chip.className = CHIP_CLASS;
        // Avatar (ürün görseli ya da baş harf).
        const avatar = document.createElement('span');
        avatar.className =
          'flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded text-[var(--balina-icon-strong)]';
        if (product.imageUrl) {
          const img = document.createElement('img');
          img.src = product.imageUrl;
          img.alt = '';
          img.className = 'h-full w-full object-cover';
          avatar.appendChild(img);
        } else {
          avatar.textContent = product.name.charAt(0).toUpperCase();
        }
        chip.appendChild(avatar);
        // Metin (hover'da sağa doğru mask ile söner).
        const content = document.createElement('span');
        content.className = 'relative flex h-5 min-w-0 flex-1 items-center overflow-hidden';
        const textWrap = document.createElement('span');
        textWrap.className =
          'pointer-events-none flex h-5 min-w-0 flex-1 items-center px-1 group-hover:[-webkit-mask-image:linear-gradient(90deg,#000_0,#000_50%,transparent_85%,transparent)] group-hover:[mask-image:linear-gradient(90deg,#000_0,#000_50%,transparent_85%,transparent)]';
        const text = document.createElement('span');
        text.className = 'w-full select-none truncate text-[var(--balina-text-loud)]';
        text.textContent = product.name;
        textWrap.appendChild(text);
        content.appendChild(textWrap);
        chip.appendChild(content);
        // Kaldır (×) — absolute, hover'da opacity ile belirir.
        const closeWrap = document.createElement('span');
        closeWrap.className =
          'absolute top-1/2 right-[-0.25rem] flex h-7 w-7 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100';
        const close = document.createElement('button');
        close.type = 'button';
        close.setAttribute('aria-label', 'Ürünü kaldır');
        close.className =
          'flex h-5 w-5 cursor-pointer items-center justify-center text-[var(--balina-icon-strong)] transition-colors hover:text-[var(--balina-icon-loud)]';
        close.innerHTML = CHIP_CLOSE_SVG;
        close.addEventListener('mousedown', (ev) => ev.preventDefault());
        close.addEventListener('click', (ev) => {
          ev.preventDefault();
          // Silinme efekti: içerik blur+scale+fade, chip genişliği çöker.
          chip.style.maxWidth = `${chip.offsetWidth}px`;
          void chip.offsetWidth; // reflow — başlangıç genişliğini sabitle
          chip.style.overflow = 'hidden';
          chip.style.pointerEvents = 'none';
          chip.style.transition =
            'max-width 320ms cubic-bezier(0.2,0,0,1) 60ms, filter 280ms ease-in, opacity 200ms ease-in, transform 280ms ease-in';
          chip.style.maxWidth = '0px';
          chip.style.filter = 'blur(8px)';
          chip.style.opacity = '0';
          chip.style.transform = 'scale(0.92)';
          setTimeout(() => {
            chip.remove();
            notify();
          }, 340);
        });
        closeWrap.appendChild(close);
        chip.appendChild(closeWrap);
        range.insertNode(chip);
        const space = document.createTextNode(' ');
        chip.after(space);
        const after = document.createRange();
        after.setStartAfter(space);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRange.current = null;
        notify();
      },
      getProductIds: () =>
        Array.from(editorRef.current?.querySelectorAll('.balina-mention-chip') ?? [])
          .map((el) => (el as HTMLElement).dataset.productId ?? '')
          .filter(Boolean),
    }));

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'shadow-raised relative flex w-full flex-col gap-2.5 rounded-[1.25rem] p-2.5 backdrop-blur-[24px] transition-shadow',
          className,
        )}
        style={{
          backgroundImage: 'var(--color-background-raised-shout)',
          backgroundColor: 'var(--balina-background-light-shout)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] bg-[var(--balina-background-light-shout)]/40 backdrop-blur-md">
            <span className="text-body-small-medium text-[var(--balina-text-loud)]">
              Dosyaları buraya bırak
            </span>
          </div>
        )}

        {/* Bağlam satırı */}
        <div className="flex min-h-8 flex-wrap items-center gap-1">{contextSlot}</div>

        {/* Mention editörü */}
        <div className="relative min-h-9 rounded-[0.625rem] border border-[var(--balina-background-light-faint)] p-1.5">
          {empty && (
            <span className="text-body-default-regular pointer-events-none absolute left-2.5 top-1.5 text-[var(--balina-text-faint)]">
              {placeholder}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline
            onInput={notify}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              } else if (e.key === '@' && onAddContext) {
                e.preventDefault();
                saveSelection();
                onAddContext();
              }
            }}
            className="text-body-default-regular max-h-[7.5rem] min-h-6 w-full resize-none overflow-y-auto whitespace-pre-wrap break-words px-1 leading-6 text-[var(--balina-text-shout)] outline-none"
          />
        </div>

        {/* Aksiyon satırı */}
        <div className="flex h-8 items-center justify-between">
          <div className="flex h-8 items-center gap-1">
            <BalinaTooltip content="Dosya seçin" side="top">
              <button
                type="button"
                aria-label="Dosya seçin"
                onClick={() => {
                  onAttach?.();
                  fileInputRef.current?.click();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[0.625rem] text-[var(--balina-icon-strong)] outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)] focus-visible:outline-none"
              >
                <BalinaAttachIcon className="h-4 w-4" />
              </button>
            </BalinaTooltip>
            <div className="flex h-8 w-[0.5625rem] items-center justify-center">
              <div className="h-4 w-px rounded-full bg-[var(--balina-border-strong)]" />
            </div>
            <BalinaDropdown
              side="top"
              align="start"
              size="default"
              trigger={
                <button
                  type="button"
                  aria-label="Mod seç"
                  className="text-body-small-one-liner-medium flex h-8 cursor-pointer items-center gap-1 rounded-[0.625rem] px-1.5 text-[var(--balina-text-strong)] outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] focus-visible:outline-none"
                >
                  <span className="flex h-4 w-4 items-center justify-center text-[var(--balina-icon-strong)]">
                    {activeMode.icon}
                  </span>
                  <span className="px-0.5">{activeMode.label}</span>
                  <BalinaDownIcon className="h-3.5 w-3.5 text-[var(--balina-icon-strong)]" />
                </button>
              }
            >
              {CHAT_MODES.map((m) => (
                <BalinaDropdownItem
                  key={m.value}
                  icon={m.icon}
                  selected={m.value === mode}
                  onSelect={() => setMode(m.value)}
                >
                  {m.label}
                </BalinaDropdownItem>
              ))}
            </BalinaDropdown>
          </div>

          <button
            type="button"
            aria-label="Gönder"
            disabled={empty}
            onClick={send}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full p-1.5 transition-colors',
              !empty
                ? 'cursor-pointer bg-[var(--balina-neutral-dark-90)] text-[var(--balina-neutral-light-100)] hover:bg-[var(--balina-neutral-dark-100)]'
                : 'cursor-not-allowed bg-[var(--balina-background-dark-faint)] text-[var(--balina-icon-faint)]',
            )}
          >
            <BalinaArrowUpIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  },
);
