'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Search,
  ArrowUpDown,
  Package,
  X,
  Box,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Button, Input, ListBox, Select, Skeleton, TextField, toast } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { EditableStockCell, EditablePriceCell } from '@/components/inventory';

type StockFilter = 'all' | 'instock' | 'critical' | 'outofstock';
type MappingFilter = 'all' | 'mapped' | 'unmapped';
type SortField = 'name' | 'stockQuantity' | 'price';
type SortOrder = 'asc' | 'desc';

export default function InventoryPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const { currentCompany } = useCompanyStore();
  const { stores } = useStoreStore();
  const {
    products,
    productsTotal,
    productsPage,
    productsTotalPages,
    summary,
    isLoading,
    fetchProducts,
    fetchSummary,
    updateProductStock,
    updateProductPurchasePrice,
    updateProductInList,
  } = useInventoryStore();

  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (currentCompany?.id) fetchSummary(currentCompany.id);
    const interval = setInterval(() => {
      if (currentCompany?.id) fetchSummary(currentCompany.id);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentCompany?.id, fetchSummary]);

  const fetchData = useCallback(() => {
    if (!currentCompany?.id) return;
    const filters: Record<string, string | undefined> = {};
    if (stockFilter !== 'all') filters.stockStatus = stockFilter;
    if (selectedStoreId !== 'all') filters.storeId = selectedStoreId;
    if (searchQuery) filters.search = searchQuery;
    if (mappingFilter !== 'all') filters.mappingStatus = mappingFilter;

    fetchProducts(currentCompany.id, {
      page: 1,
      limit: 20,
      sortBy: sortField,
      sortOrder,
      ...filters,
    });
  }, [
    currentCompany?.id,
    stockFilter,
    mappingFilter,
    selectedStoreId,
    searchQuery,
    sortField,
    sortOrder,
    fetchProducts,
  ]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePageChange = (page: number) => {
    if (!currentCompany?.id) return;
    const filters: Record<string, string | undefined> = {};
    if (stockFilter !== 'all') filters.stockStatus = stockFilter;
    if (selectedStoreId !== 'all') filters.storeId = selectedStoreId;
    if (searchQuery) filters.search = searchQuery;
    if (mappingFilter !== 'all') filters.mappingStatus = mappingFilter;

    fetchProducts(currentCompany.id, {
      page,
      limit: 20,
      sortBy: sortField,
      sortOrder,
      ...filters,
    });
  };

  const tabs = [
    { id: 'all' as const, label: 'Tümü' },
    { id: 'instock' as const, label: 'Stokta' },
    { id: 'critical' as const, label: 'Kritik Stok' },
    { id: 'outofstock' as const, label: 'Stok Yok' },
  ];

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString('tr-TR');
  };

  const formatCurrency = (num: number) => num.toLocaleString('tr-TR') + ' TL';

  const handleStockUpdate = async (productId: string, newStock: number): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductStock(currentCompany.id, productId, newStock);
    if (success) {
      updateProductInList(productId, { stockQuantity: newStock });
      toast.success('Stok güncellendi');
    } else {
      toast.danger('Stok güncellenemedi');
    }
    return success;
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Stoklar</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 border-b border-border">
        <SummaryCell label="Toplam Stok" Icon={Box}>
          {summary ? formatNumber(summary.totalStock) : '-'}
        </SummaryCell>
        <SummaryCell label="Stok Değeri" Icon={ShoppingCart}>
          {summary ? formatCurrency(summary.totalStockValue) : '-'}
        </SummaryCell>
        <SummaryCell label="Net Kar" Icon={TrendingUp}>
          <span
            className={
              summary && summary.netProfit < 0 ? 'text-danger' : 'text-success'
            }
          >
            {summary ? formatCurrency(summary.netProfit) : '-'}
          </span>
        </SummaryCell>
        <SummaryCell label="Kritik Stok" Icon={AlertTriangle} iconTone="text-warning" last>
          <span className="text-warning-foreground">
            {summary ? summary.criticalStockCount : '-'}
          </span>
        </SummaryCell>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStockFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                stockFilter === tab.id
                  ? 'bg-default text-foreground'
                  : 'text-muted hover:bg-default/50 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchData();
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted" />
            <TextField
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-64"
            >
              <Input placeholder="Ürün veya SKU ara..." className="pl-9" />
            </TextField>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          <Select
            selectedKey={selectedStoreId}
            onSelectionChange={(key) => setSelectedStoreId(String(key))}
            aria-label="Mağaza filtresi"
            className="w-48"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="Tüm Mağazalar">
                  Tüm Mağazalar
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {stores.map((store) => (
                  <ListBox.Item key={store.id} id={store.id} textValue={store.name}>
                    {store.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            selectedKey={mappingFilter}
            onSelectionChange={(key) => setMappingFilter(key as MappingFilter)}
            aria-label="Eşleştirme filtresi"
            className="w-40"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="Tüm Ürünler">
                  Tüm Ürünler
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="mapped" textValue="Eşleştirilmiş">
                  Eşleştirilmiş
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="unmapped" textValue="Eşleştirilmemiş">
                  Eşleştirilmemiş
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="min-w-[280px] px-6 py-2 text-left text-xs font-medium text-muted">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Ürün
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted">SKU</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted">Mağaza</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted">
                <button
                  onClick={() => handleSort('stockQuantity')}
                  className="mx-auto flex items-center gap-1 hover:text-foreground"
                >
                  Stok
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted">
                <button
                  onClick={() => handleSort('price')}
                  className="mx-auto flex items-center gap-1 hover:text-foreground"
                >
                  Satış Fiyatı
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 pr-6 text-center text-xs font-medium text-muted">
                Alış Fiyatı
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="mx-auto h-8 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="mx-auto h-4 w-20" /></td>
                  <td className="px-4 py-3 pr-6"><Skeleton className="mx-auto h-8 w-20" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  Ürün bulunamadı
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-border">
                  <td className="px-6 py-3">
                    <Link
                      href={`/${companySlug}/inventory/${product.id}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-default">
                          <Package className="h-5 w-5 text-muted" />
                        </div>
                      )}
                      <div>
                        <p className="line-clamp-1 font-medium">{product.name}</p>
                        {product.productType === 'variable' && product.variationCount > 0 && (
                          <span className="mt-0.5 inline-flex items-center rounded bg-default px-1.5 py-0.5 text-xs text-muted">
                            {product.variationCount} varyant
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{product.sku || '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted">{product.storeName}</td>
                  <td className="px-4 py-3 text-center">
                    <EditableStockCell
                      value={product.stockQuantity}
                      onSave={(newStock) => handleStockUpdate(product.id, newStock)}
                      disabled={product.productType === 'variable'}
                      className="mx-auto"
                    />
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-4 py-3 pr-6 text-center">
                    <EditablePriceCell
                      value={product.purchasePrice}
                      onSave={(newPrice) => handlePurchasePriceUpdate(product.id, newPrice)}
                      className="mx-auto"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {productsTotalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
          <span className="text-sm text-muted">Toplam {productsTotal} ürün</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              isDisabled={productsPage === 1}
              onPress={() => handlePageChange(productsPage - 1)}
            >
              Önceki
            </Button>
            <span className="text-sm text-muted">
              {productsPage} / {productsTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              isDisabled={productsPage === productsTotalPages}
              onPress={() => handlePageChange(productsPage + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  Icon,
  iconTone = 'text-muted',
  last,
  children,
}: {
  label: string;
  Icon: React.ElementType;
  iconTone?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-6 py-4 ${!last ? 'border-r border-border' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <Icon className={`h-4 w-4 ${iconTone}`} />
      </div>
      <p className="mt-1 text-2xl font-semibold">{children}</p>
    </div>
  );
}
