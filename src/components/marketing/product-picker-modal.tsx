'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Magnifier } from '@gravity-ui/icons';
import { BalinaButton, BalinaModal } from '@/components/balina';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useCompanyStore } from '@/stores/companyStore';
import { useInventoryStore } from '@/stores/inventoryStore';

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (productId: string) => void;
}

/** Email block'ları için ürün seçici modal. Açıldığında inventory boşsa
 *  fetch eder. SKU veya isim ile arama yapılabilir. */
export function ProductPickerModal({
  isOpen,
  onClose,
  onPick,
}: ProductPickerModalProps) {
  const { currentCompany } = useCompanyStore();
  const { products, fetchProducts, isLoading } = useInventoryStore();
  const [search, setSearch] = useState('');

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
    <BalinaModal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      className="w-[90vw] max-w-[560px]"
      title="Ürün seç"
      footer={
        <BalinaButton variant="soft" onClick={onClose}>
          Kapat
        </BalinaButton>
      }
    >
            <div>
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
            </div>
    </BalinaModal>
  );
}
