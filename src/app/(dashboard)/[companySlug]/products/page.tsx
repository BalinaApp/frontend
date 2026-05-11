'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Box as Package,
  ArrowDown,
  Pencil,
  CircleDashed,
  Check,
  CircleXmark,
  Tag,
  Tags,
  Percent,
  CopyCheck,
  Calendar,
} from '@gravity-ui/icons';
import {
  Checkbox,
  Tooltip as UITooltip,
  toast,
} from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import {
  EditableTextCell,
  EditablePriceCell,
} from '@/components/inventory';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { FilterPopover } from '@/components/products/filter-popover';
import { SavedFilterTabs } from '@/components/products/saved-filter-tabs';
import type { FilterDef } from '@/components/products/filter-types';

// ---- Filter types ---------------------------------------------------------

type ActiveFilter = 'all' | 'yes' | 'no';
type MappingFilter = 'all' | 'mapped' | 'unmapped';
type SortField = 'name' | 'stockQuantity' | 'price';
type SortOrder = 'asc' | 'desc';

const activeOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'yes', label: 'Aktif' },
  { value: 'no', label: 'Pasif' },
];

const mappingOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'mapped', label: 'Eşleştirildi' },
  { value: 'unmapped', label: 'Eşleştirme yok' },
];

// ---- Favicon helper -------------------------------------------------------

function storeFaviconUrl(url?: string | null): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = url.startsWith('http') ? new URL(url).hostname : url;
  } catch {
    host = url;
  }
  if (!host || host === 'example.com') return null;
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
}

// ---- Page -----------------------------------------------------------------

export default function InventoryPage() {
  usePageTitle('Ürünler');

  const params = useParams();
  const companySlug = params.companySlug as string;
  const { currentCompany } = useCompanyStore();
  // STOCKIST yalnızca stoğu güncelleyebilir; alış + liste fiyatı kolonları
  // tamamen gizlenir. PRODUCT_UPLOADER ürünleri ve liste fiyatını görür ama
  // alış fiyatına (purchasePrice) erişemez. Backend de `assertNotLimitedRole`
  // ile aynı kontrolü uyguluyor — UI sadece görünürlüğü ayarlar.
  const isStockist = currentCompany?.role === 'STOCKIST';
  const isProductUploader = currentCompany?.role === 'PRODUCT_UPLOADER';
  const hidePurchasePrice = isStockist || isProductUploader;
  const hideListPrice = isStockist;
  const { stores, fetchStores } = useStoreStore();
  const {
    products,
    productsPage,
    isLoading,
    fetchProducts,
    updateProductPurchasePrice,
    updateProduct,
    updateProductInList,
  } = useInventoryStore();

  // Filtre state'leri
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all'); // backend desteği yok — UI placeholder
  const [vatFilter, setVatFilter] = useState<string>('all'); // backend desteği yok — UI placeholder
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // UI placeholder

  // SKU/Barkod araması (backend `search` query'sine geçer)
  const [skuQuery, setSkuQuery] = useState('');

  // Tablo
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const perPage = 100;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mağaza listesini bir kere çek (Bağlı filtresi + entegrasyon kolonu için).
  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  const fetchData = useCallback(
    (page: number = 1) => {
      if (!currentCompany?.id) return;
      const filters: Record<string, string | undefined> = {};
      if (skuQuery) filters.search = skuQuery;
      if (activeFilter === 'yes') filters.isActive = 'true';
      if (activeFilter === 'no') filters.isActive = 'false';
      if (mappingFilter !== 'all') filters.mappingStatus = mappingFilter;

      fetchProducts(currentCompany.id, {
        page,
        limit: perPage,
        sortBy: sortField,
        sortOrder,
        ...filters,
      });
    },
    [
      currentCompany?.id,
      skuQuery,
      activeFilter,
      mappingFilter,
      sortField,
      sortOrder,
      perPage,
      fetchProducts,
    ]
  );

  useEffect(() => {
    fetchData(1);
    const interval = setInterval(() => fetchData(productsPage), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handlePurchasePriceUpdate = async (
    productId: string,
    newPrice: number
  ): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductPurchasePrice(currentCompany.id, productId, newPrice);
    if (success) {
      updateProductInList(productId, { purchasePrice: newPrice });
      toast.success('Alış fiyatı güncellendi');
    } else {
      toast.danger('Alış fiyatı güncellenemedi');
    }
    return success;
  };

  // ---- Inline cell helpers ------------------------------------------------

  // Ürün Adı için: row başına edit modu — Link/Pencil ile birlikte çalışsın.
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Inline cell save'leri için ortak helper.
  const saveProduct = async (
    productId: string,
    patch: Partial<{ name: string; isActive: boolean }>
  ): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const ok = await updateProduct(currentCompany.id, productId, patch);
    if (!ok) toast.danger('Ürün güncellenemedi');
    return ok;
  };

  // Filter popover'ın okuyacağı tek tip listesi (Figma birebir):
  //   Durumu / Marka / KDV / Eşleştirme / SKU / Tarih
  // Filtre değişince useEffect zaten fetchData'yı tetikliyor.
  const filterDefs: FilterDef[] = [
    {
      id: 'active',
      label: 'Durumu',
      icon: CircleDashed,
      type: 'select',
      defaultValue: 'all',
      value: activeFilter,
      onChange: (v) => setActiveFilter(v as ActiveFilter),
      options: activeOptions,
    },
    {
      id: 'brand',
      label: 'Marka',
      icon: Tag,
      type: 'select',
      defaultValue: 'all',
      value: brandFilter,
      onChange: setBrandFilter,
      options: [
        { value: 'all', label: 'Tümü' },
        { value: 'other', label: 'Diğer' },
      ],
    },
    {
      id: 'vat',
      label: 'KDV',
      icon: Percent,
      type: 'select',
      defaultValue: 'all',
      value: vatFilter,
      onChange: setVatFilter,
      options: [
        { value: 'all', label: 'Tümü' },
        { value: '0', label: '%0' },
        { value: '8', label: '%8' },
        { value: '10', label: '%10' },
        { value: '20', label: '%20' },
      ],
    },
    {
      id: 'mapping',
      label: 'Eşleştirme',
      icon: CopyCheck,
      type: 'select',
      defaultValue: 'all',
      value: mappingFilter,
      onChange: (v) => setMappingFilter(v as MappingFilter),
      options: mappingOptions,
    },
    {
      id: 'sku',
      label: 'SKU',
      icon: Tags,
      preposition: 'ile',
      type: 'text',
      placeholder: 'SKU/Barkod ile ara',
      value: skuQuery,
      onChange: setSkuQuery,
    },
    {
      id: 'date',
      label: 'Tarih',
      icon: Calendar,
      preposition: 'ile',
      type: 'text',
      placeholder: 'Örn. 2026-05-01..2026-05-31',
      value: dateFilter,
      onChange: setDateFilter,
    },
  ];

  return (
    <>
      <PageHeader title="Ürünler" />

      <div className="flex flex-col overflow-hidden">
        {/* ============== Tab strip + filter icon (p-4) ============== */}
        <div className="flex flex-col gap-3 p-4">
          <SavedFilterTabs
            companyId={currentCompany?.id}
            context="products"
            filters={filterDefs}
            rightAction={<FilterPopover filters={filterDefs} />}
          />
        </div>

        {/* ============== Header + rows (p-2.5 gap-2.5) ============== */}
        <div className="flex flex-col gap-2.5 overflow-hidden p-2.5">
          {/* Column header — left half: name, right half: 5 cols */}
          <div className="flex items-center justify-between overflow-hidden rounded-2xl px-3 py-1">
            <div className="flex flex-1 items-center gap-2">
              <div className="px-1">
                <span className="text-sm font-medium leading-5 text-foreground/60">Ürün adı</span>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-between">
              {!hideListPrice ? (
                <div className="flex w-16 items-center gap-2">
                  <SortHeaderButton
                    field="price"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  >
                    Satış Fiyatı
                  </SortHeaderButton>
                </div>
              ) : (
                <span className="w-16" />
              )}
              {!hidePurchasePrice ? (
                <HeaderLabel className="w-16">Alış Fiyatı</HeaderLabel>
              ) : (
                <span className="w-16" />
              )}
              <HeaderLabel className="w-16">Mağazalar</HeaderLabel>
              <HeaderLabel className="w-16">Eşleştirme</HeaderLabel>
              <HeaderLabel className="w-16">Durum</HeaderLabel>
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-2xl bg-foreground/[0.03]"
                />
              ))
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                Ürün bulunamadı
              </div>
            ) : (
              products.map((product, idx) => {
                const isChecked = selected.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={[
                      'flex h-14 items-center justify-between overflow-hidden rounded-2xl p-3 transition-colors',
                      idx === 0 ? 'bg-foreground/[0.05]' : 'hover:bg-foreground/[0.03]',
                    ].join(' ')}
                  >
                    {/* LEFT half — checkbox + image + name */}
                    <div className="flex flex-1 items-center gap-3">
                      <Checkbox
                        isSelected={isChecked}
                        onChange={(next) => {
                          setSelected((prev) => {
                            const updated = new Set(prev);
                            if (next) updated.add(product.id);
                            else updated.delete(product.id);
                            return updated;
                          });
                        }}
                        aria-label={`${product.name} seç`}
                      />
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${companySlug}/products/${product.id}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default"
                        >
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-muted" />
                          )}
                        </Link>
                        {editingNameId === product.id ? (
                          <EditableTextCell
                            value={product.name}
                            onSave={async (newName) => {
                              const ok = await saveProduct(product.id, { name: newName });
                              setEditingNameId(null);
                              return ok;
                            }}
                            className="w-full text-sm font-medium"
                          />
                        ) : (
                          <div className="group inline-flex items-center gap-1">
                            <Link
                              href={`/${companySlug}/products/${product.id}`}
                              className="truncate text-sm font-medium leading-5 text-foreground hover:underline"
                            >
                              {product.name}
                            </Link>
                            {!isStockist && (
                              <button
                                type="button"
                                aria-label="Adı düzenle"
                                onClick={() => setEditingNameId(product.id)}
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground group-hover:opacity-100"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT half — 5 cells, each flex-1, gap-20 */}
                    <div className="flex flex-1 items-center gap-20">
                      {/* Satış Fiyatı */}
                      <CellWrap>
                        {!hideListPrice ? <PriceChip value={product.price} /> : null}
                      </CellWrap>

                      {/* Alış Fiyatı */}
                      <CellWrap>
                        {!hidePurchasePrice ? (
                          product.purchasePrice != null ? (
                            <EditablePriceCell
                              value={product.purchasePrice}
                              onSave={(newPrice) =>
                                handlePurchasePriceUpdate(product.id, newPrice)
                              }
                            />
                          ) : (
                            <PlaceholderChip>Eklenmedi</PlaceholderChip>
                          )
                        ) : null}
                      </CellWrap>

                      {/* Mağazalar */}
                      <CellWrap>
                        <IntegrationFavicons
                          stores={stores
                            .filter((s) => s.id === product.storeId)
                            .map((s) => ({ id: s.id, name: s.name, url: s.url }))}
                        />
                      </CellWrap>

                      {/* Eşleştirme */}
                      <CellWrap>
                        {product.isMapped ? (
                          <StatusChip variant="check">Eşleştirildi</StatusChip>
                        ) : (
                          <StatusChip variant="xmark">Eşleştirme yok</StatusChip>
                        )}
                      </CellWrap>

                      {/* Durum */}
                      <CellWrap>
                        <button
                          type="button"
                          onClick={() =>
                            !isStockist &&
                            saveProduct(product.id, { isActive: !product.isActive })
                          }
                          disabled={isStockist}
                          className="disabled:cursor-default"
                        >
                          {product.isActive ? (
                            <StatusChip variant="check">Aktif</StatusChip>
                          ) : (
                            <StatusChip variant="xmark">Pasif</StatusChip>
                          )}
                        </button>
                      </CellWrap>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Header label (plain text cell) --------------------------------------

function HeaderLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={['flex items-center gap-2', className ?? ''].join(' ')}>
      <div className="inline-flex flex-col items-start justify-center px-1">
        <span className="text-sm font-medium leading-5 text-foreground/60">{children}</span>
      </div>
    </div>
  );
}

// ---- Cell wrap inside row right half -------------------------------------

function CellWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-1 flex-col items-start justify-start gap-2.5">
      {children}
    </div>
  );
}

// ---- Placeholder chip (Eklenmedi etc) ------------------------------------

function PlaceholderChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-muted">
      <CircleDashed className="h-3 w-3" />
      {children}
    </span>
  );
}

// ---- Integration favicons cell -------------------------------------------

function IntegrationFavicons({
  stores,
}: {
  stores: Array<{ id: string; name: string; url?: string | null }>;
}) {
  if (stores.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="flex items-start -space-x-2">
      {stores.map((s) => {
        const src = storeFaviconUrl(s.url);
        return (
          <UITooltip key={s.id} delay={0}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface"
              style={{ boxShadow: '0 0 0 2px rgb(245 245 245)' }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-sm"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[9px] font-semibold text-muted">
                  {s.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <UITooltip.Content>{s.name}</UITooltip.Content>
          </UITooltip>
        );
      })}
    </div>
  );
}

// ---- Sort header button (chip-style) -------------------------------------

function SortHeaderButton({
  field,
  currentField,
  currentOrder,
  onSort,
  children,
}: {
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={[
        'inline-flex items-center gap-1 rounded-[999px] px-1 text-sm font-medium leading-5 transition-colors',
        isActive
          ? 'text-foreground'
          : 'text-foreground/60 hover:text-foreground',
      ].join(' ')}
    >
      {children}
      {isActive && (
        <ArrowDown
          className={[
            'h-3 w-3 transition-transform',
            currentOrder === 'asc' ? 'rotate-180' : '',
          ].join(' ')}
        />
      )}
    </button>
  );
}

// ---- Price chip — plain text (Satış Fiyatı) ------------------------------

function PriceChip({ value }: { value: number }) {
  const formatted = `₺${value.toLocaleString('tr-TR')}`;
  return (
    <span className="inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-foreground">
      {formatted}
    </span>
  );
}

// ---- Status chip — check (active) / xmark (muted) ------------------------

function StatusChip({
  variant,
  children,
}: {
  variant: 'check' | 'xmark';
  children: React.ReactNode;
}) {
  if (variant === 'check') {
    return (
      <span className="inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-foreground">
        <Check className="h-3 w-3 text-success" />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-muted">
      <CircleXmark className="h-3 w-3" />
      {children}
    </span>
  );
}
