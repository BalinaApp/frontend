'use client';

import * as React from 'react';
import { Picture } from '@gravity-ui/icons';
import { BalinaPopover, BalinaAtIcon, BalinaCloseIcon, BalinaSearchIcon } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useInventoryStore, type Product } from '@/stores/inventoryStore';

/* AI sohbet bağlamı — ürün seçim picker'ı. "Bağlam ekle"/@ ile açılır; üstte
 * arama, altta ürün listesi. Seçilen ürün buton tarzında gösterilir, tıklayınca
 * yeniden açılıp değiştirilebilir. Veri: inventoryStore (fetchProducts). */

export interface AiContextPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ürün seçilince — composer'a satır içi chip olarak eklenir. */
  onSelect: (product: Product) => void;
  /** true ise sadece @ ikonu gösterilir (etiket gizlenir) — bağlam eklendiğinde. */
  compact?: boolean;
}

export function AiContextPicker({ open, onOpenChange, onSelect, compact }: AiContextPickerProps) {
  const companyId = useCompanyStore((s) => s.currentCompany?.id);
  const products = useInventoryStore((s) => s.products);
  const fetchProducts = useInventoryStore((s) => s.fetchProducts);
  const isLoading = useInventoryStore((s) => s.isLoading);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Açıkken aramayı debounce ile store'dan çek.
  React.useEffect(() => {
    if (!open || !companyId) return;
    const t = setTimeout(() => {
      void fetchProducts(companyId, { search, limit: 20, page: 1 });
    }, 250);
    return () => clearTimeout(t);
  }, [open, search, companyId, fetchProducts]);

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Üst bağlam satırı her zaman ürün seçim tetikleyicisidir (seçilen ürün
  // composer'a satır içi chip olarak eklenir).
  const trigger = (
    <button
      type="button"
      aria-label="Bağlam seç"
      className={`text-body-small-one-liner-medium flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-[0.625rem] text-[var(--balina-text-loud)] outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] focus-visible:outline-none ${
        compact ? 'w-8 justify-center px-0' : 'px-1.5'
      }`}
    >
      <BalinaAtIcon className="h-4 w-4 text-[var(--balina-icon-loud)]" />
      {!compact && <span className="px-1">Bağlam seç</span>}
    </button>
  );

  return (
    <BalinaPopover
      open={open}
      onOpenChange={onOpenChange}
      side="top"
      align="start"
      className="w-[20rem] max-w-none overflow-hidden p-0"
      tooltip={compact ? 'Bağlam seç' : undefined}
      tooltipSide="top"
      trigger={trigger}
    >
      <div className="flex flex-col">
        {/* Arama */}
        <div className="flex items-center gap-2 border-b border-[var(--balina-border-muted)] px-3 py-2">
          <BalinaSearchIcon className="h-4 w-4 shrink-0 text-[var(--balina-icon-muted)]" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara…"
            className="text-body-small-one-liner-regular h-6 w-full bg-transparent text-[var(--balina-text-loud)] outline-none placeholder:text-[var(--balina-text-muted)]"
          />
        </div>
        {/* Liste */}
        <div className="balina-scrollbar max-h-[16rem] overflow-y-auto p-1">
          {isLoading && products.length === 0 ? (
            <div className="px-3 py-6 text-center text-body-small-regular text-[var(--balina-text-muted)]">
              Yükleniyor…
            </div>
          ) : products.length === 0 ? (
            <div className="px-3 py-6 text-center text-body-small-regular text-[var(--balina-text-muted)]">
              Ürün bulunamadı
            </div>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  onOpenChange(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[0.625rem] p-1.5 text-left outline-none transition-colors hover:bg-[var(--balina-background-dark-muted)] focus-visible:outline-none"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--balina-background-dark-default)] text-body-small-medium text-[var(--balina-text-muted)]">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-small-one-liner-medium truncate text-[var(--balina-text-strong)]">
                    {p.name}
                  </span>
                  {p.sku && (
                    <span className="text-body-tiny-regular truncate text-[var(--balina-text-muted)]">
                      {p.sku}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </BalinaPopover>
  );
}

/** Seçili ürün — chat/prompt alanında buton tarzında; tıklayınca değiştirilir,
 *  × ile kaldırılır. */
export function AiContextChip({
  product,
  onClick,
  onRemove,
}: {
  product: Product;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  return (
    <span className="text-body-small-one-liner-medium inline-flex h-7 max-w-full items-center gap-1.5 rounded-[0.625rem] bg-[var(--balina-background-dark-default)] pl-1 pr-1.5 text-[var(--balina-text-loud)]">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 outline-none focus-visible:outline-none"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--balina-background-dark-strong)] text-[var(--balina-text-muted)]">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="max-w-[12rem] truncate">{product.name}</span>
      </button>
      <button
        type="button"
        aria-label="Ürünü kaldır"
        onClick={onRemove}
        className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--balina-icon-strong)] outline-none transition-colors hover:text-[var(--balina-icon-loud)] focus-visible:outline-none"
      >
        <BalinaCloseIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/** Görsel dosya/ürün için bağlam chip'i (kaynak .ContextItem_*). Hover'da:
 *  zemin belirir, metin sağa doğru mask ile söner, sağda kaldır (×) çıkar. */
export function AiContextItemChip({
  label,
  avatar,
  onRemove,
  removing,
}: {
  label: string;
  /** Sol ikon/avatar (verilmezse görsel-çerçeve ikonu). */
  avatar?: React.ReactNode;
  onRemove?: () => void;
  /** Silinme animasyonu — içerik blur+scale+fade, dış kap genişlik çöker. */
  removing?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden transition-[max-width,opacity] duration-[320ms] ease-[cubic-bezier(0.2,0,0,1)] ${
        removing ? 'max-w-0 opacity-0' : 'max-w-[9.5rem] opacity-100'
      }`}
    >
    <span
      className={`group relative flex h-8 max-w-[9.5rem] cursor-pointer items-center gap-1 rounded-[0.625rem] p-1 transition-[filter,transform,background-color] duration-[280ms] ease-in hover:bg-[var(--balina-background-dark-muted)] ${
        removing ? 'scale-[0.92] blur-[8px]' : ''
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center p-0.5 text-[var(--balina-icon-strong)]">
        {avatar ?? <Picture className="h-4 w-4" />}
      </span>
      <span className="relative flex h-6 min-w-0 flex-1 items-center overflow-hidden">
        <span className="pointer-events-none flex h-6 min-w-0 flex-1 items-center px-1 group-hover:[-webkit-mask-image:linear-gradient(90deg,#000_0,#000_50%,transparent_85%,transparent)] group-hover:[mask-image:linear-gradient(90deg,#000_0,#000_50%,transparent_85%,transparent)]">
          <span className="text-body-small-one-liner-medium w-full select-none truncate text-[var(--balina-text-loud)]">
            {label}
          </span>
        </span>
      </span>
      <span className="absolute top-1/2 right-[-0.25rem] flex h-8 w-8 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label={`${label} kaldır`}
          onClick={onRemove}
          className="flex h-6 w-6 cursor-pointer items-center justify-center text-[var(--balina-icon-strong)] outline-none transition-colors hover:text-[var(--balina-icon-loud)] focus-visible:outline-none"
        >
          <BalinaCloseIcon className="h-4 w-4" />
        </button>
      </span>
    </span>
    </span>
  );
}

/** Yüklenen görsel dosyası — bağlam satırı chip'i. */
export function AiFileChip({
  name,
  onRemove,
  removing,
}: {
  name: string;
  onRemove?: () => void;
  removing?: boolean;
}) {
  return <AiContextItemChip label={name} onRemove={onRemove} removing={removing} />;
}
