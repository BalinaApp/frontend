'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/components/ui/cn';
import {
  BalinaSearchResultItem,
  BalinaButton,
  BalinaEnterIcon,
  BalinaSearchIcon,
  BalinaAiIcon,
  useBalinaScrollbar,
} from '@/components/balina';

/* Komut-paleti tarzı arama modalı — kaynak .SearchModal_* spec'inin portu
 * (balina token'ları + text-body-* tipografi, "define" yok). Data-driven
 * (sections) + klavye navigasyonu (↑/↓/Enter, Esc kapatır). */

export interface SearchItem {
  id: string;
  title: string;
  /** Solda gösterilecek ikon/avatar (opsiyonel). */
  icon?: React.ReactNode;
  /** Sağdaki aksiyon etiketi (ör. "Ara", "Aç"). */
  action?: string;
  /** Başlık yanındaki komut rozeti (ör. from: @stripe). */
  pill?: { prefix?: string; value: string; icon?: React.ReactNode };
  onSelect?: () => void;
}

export interface SearchSection {
  title: string;
  items: SearchItem[];
  onViewAll?: () => void;
}

export interface SearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  /** Kontrollü kullanım için; verilmezse dahili state tutulur. */
  query?: string;
  onQueryChange?: (q: string) => void;
  sections: SearchSection[];
  emptyText?: string;
  onSaveSearch?: () => void;
  onAskAi?: () => void;
}

export function SearchModal({
  isOpen,
  onOpenChange,
  placeholder = 'Dosya, e-posta ve kişi ara…',
  query,
  onQueryChange,
  sections,
  emptyText = 'Sonuç bulunamadı',
  onSaveSearch,
  onAskAi,
}: SearchModalProps) {
  const [internalQuery, setInternalQuery] = React.useState('');
  const q = query ?? internalQuery;
  const setQ = (v: string) => {
    if (query === undefined) setInternalQuery(v);
    onQueryChange?.(v);
  };

  const flat = React.useMemo(() => sections.flatMap((s) => s.items), [sections]);
  // item.id → düz listedeki global index (klavye navigasyonu + scroll için).
  const indexById = React.useMemo(() => {
    const m = new Map<string, number>();
    flat.forEach((it, i) => m.set(it.id, i));
    return m;
  }, [flat]);
  const [active, setActive] = React.useState(0);
  React.useEffect(() => setActive(0), [q, isOpen]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = useBalinaScrollbar<HTMLDivElement>();

  React.useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [isOpen]);

  React.useEffect(() => {
    scrollRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, scrollRef]);

  const selectAt = (i: number) => {
    const item = flat[i];
    if (!item) return;
    item.onSelect?.();
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectAt(active);
    }
  };

  const hasResults = flat.length > 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[99999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <div className="pointer-events-none fixed inset-0 z-[999999] flex items-center justify-center p-4 [&>*]:pointer-events-auto">
          <Dialog.Content
            onKeyDown={onKeyDown}
            aria-describedby={undefined}
            style={{
              backgroundImage: 'var(--color-background-raised-loud)',
              backgroundColor: 'var(--balina-background-light-shout)',
            }}
            className={cn(
              'w-[45rem] max-w-[90vw] overflow-hidden rounded-[1.25rem] outline-none',
              'border border-[var(--balina-border-muted)] shadow-elevation-large',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            )}
          >
            <Dialog.Title className="sr-only">Arama</Dialog.Title>

            {/* container — sabit yükseklik */}
            <div className="flex h-[28.125rem] flex-col">
              {/* header */}
              <div className="flex shrink-0 items-center gap-3 p-3">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={placeholder}
                  className="text-body-default-regular h-7 flex-1 bg-transparent text-[var(--balina-text-loud)] outline-none placeholder:text-[var(--balina-text-muted)]"
                />
                <button
                  type="button"
                  onClick={onAskAi}
                  className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-[var(--balina-background-dark-muted)] px-1.5 transition-colors hover:bg-[var(--balina-background-dark-default)]"
                >
                  <BalinaAiIcon className="h-4 w-4 text-[var(--balina-icon-strong)]" />
                  <span className="text-body-small-one-liner-medium px-0.5 text-[var(--balina-text-loud)]">
                    Ask AI
                  </span>
                </button>
              </div>

              {/* divider */}
              <div className="h-px w-full shrink-0 bg-[var(--balina-border-muted)]" />

              {/* contentRow → listContainer → scrollViewport */}
              <div className="flex min-h-0 flex-1">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {hasResults ? (
                    <div
                      ref={scrollRef}
                      className="balina-scrollbar h-full max-h-full overflow-y-auto px-2 py-1.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        {sections.map((section) => (
                          <div key={section.title} className="mb-3 flex flex-col gap-0.5 last:mb-0">
                            <div className="mb-0.5 flex items-center justify-between px-3 py-1">
                              <span className="text-body-tiny-medium text-[var(--balina-text-muted)]">
                                {section.title}
                              </span>
                              {section.onViewAll && (
                                <button
                                  type="button"
                                  onClick={section.onViewAll}
                                  className="text-body-tiny-medium cursor-pointer text-[var(--balina-text-muted)] transition-opacity hover:opacity-80"
                                >
                                  Tümünü gör
                                </button>
                              )}
                            </div>
                            {section.items.map((item) => {
                              const i = indexById.get(item.id) ?? -1;
                              return (
                                <div
                                  key={item.id}
                                  data-index={i}
                                  onMouseMove={() => setActive(i)}
                                >
                                  <BalinaSearchResultItem
                                    icon={item.icon}
                                    title={item.title}
                                    action={item.action}
                                    active={i === active}
                                    onClick={() => selectAt(i)}
                                    pill={
                                      item.pill ? (
                                        <>
                                          {item.pill.icon}
                                          {item.pill.prefix && (
                                            <span className="text-body-default-regular text-[var(--balina-text-default)]">
                                              {item.pill.prefix}
                                            </span>
                                          )}
                                          <span className="text-body-mail-medium text-[var(--balina-text-shout)]">
                                            {item.pill.value}
                                          </span>
                                        </>
                                      ) : undefined
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[0.625rem] bg-[var(--balina-background-dark-muted)]">
                        <BalinaSearchIcon className="h-5 w-5 text-[var(--balina-icon-strong)]" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-body-default-regular text-[var(--balina-text-loud)]">
                          {q ? `"${q}" için sonuç yok` : emptyText}
                        </span>
                        <span className="text-body-small-regular text-[var(--balina-text-muted)]">
                          Farklı bir arama terimi deneyin
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* footer */}
              <div className="flex h-[3.25rem] shrink-0 items-center justify-between border-t border-[var(--balina-border-muted)] bg-[var(--balina-background-dark-muted)] p-3">
                <BalinaButton variant="plain" onClick={onSaveSearch}>
                  Aramayı kaydet
                </BalinaButton>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => selectAt(active)}
                    className="flex h-7 w-[5.25rem] cursor-pointer items-center justify-between rounded-lg p-1 transition-colors hover:bg-[var(--balina-background-dark-default)] active:bg-[var(--balina-background-dark-strong)]"
                  >
                    <span className="text-body-small-one-liner-medium flex h-5 w-[3.125rem] items-center justify-center px-2 text-[var(--balina-text-strong)]">
                      Enter
                    </span>
                    <span className="flex h-5 w-[1.625rem] items-center justify-center rounded bg-[var(--balina-background-dark-default)] px-[0.3125rem] py-0.5 text-[var(--balina-icon-strong)]">
                      <BalinaEnterIcon
                        className="h-4 w-4"
                        style={{ transform: 'translate(0.0625rem, 0.125rem)' }}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
