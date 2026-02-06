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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from '@/components/ui/data-table';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { EditableStockCell, EditablePriceCell } from '@/components/inventory';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  // Fetch summary on mount and auto-refresh every 60 seconds
  useEffect(() => {
    if (currentCompany?.id) {
      fetchSummary(currentCompany.id);
    }

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      if (currentCompany?.id) {
        fetchSummary(currentCompany.id);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentCompany?.id, fetchSummary]);

  const fetchData = useCallback(() => {
    if (!currentCompany?.id) return;

    const filters: Record<string, string | undefined> = {};

    if (stockFilter === 'outofstock') {
      filters.stockStatus = 'outofstock';
    } else if (stockFilter === 'critical') {
      filters.stockStatus = 'critical';
    } else if (stockFilter === 'instock') {
      filters.stockStatus = 'instock';
    }

    if (selectedStoreId !== 'all') {
      filters.storeId = selectedStoreId;
    }

    if (searchQuery) {
      filters.search = searchQuery;
    }

    if (mappingFilter !== 'all') {
      filters.mappingStatus = mappingFilter;
    }

    fetchProducts(currentCompany.id, {
      page: 1,
      limit: 20,
      sortBy: sortField,
      sortOrder: sortOrder,
      ...filters,
    });
  }, [currentCompany?.id, stockFilter, mappingFilter, selectedStoreId, searchQuery, sortField, sortOrder, fetchProducts]);

  useEffect(() => {
    fetchData();

    // Auto-refresh products every 60 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePageChange = (page: number) => {
    if (!currentCompany?.id) return;

    const filters: Record<string, string | undefined> = {};
    if (stockFilter === 'outofstock') filters.stockStatus = 'outofstock';
    else if (stockFilter === 'critical') filters.stockStatus = 'critical';
    else if (stockFilter === 'instock') filters.stockStatus = 'instock';
    if (selectedStoreId !== 'all') filters.storeId = selectedStoreId;
    if (searchQuery) filters.search = searchQuery;
    if (mappingFilter !== 'all') filters.mappingStatus = mappingFilter;

    fetchProducts(currentCompany.id, {
      page,
      limit: 20,
      sortBy: sortField,
      sortOrder: sortOrder,
      ...filters,
    });
  };

  const tabs = [
    { id: 'all' as const, label: 'Tümü' },
    { id: 'instock' as const, label: 'Stokta' },
    { id: 'critical' as const, label: 'Kritik Stok' },
    { id: 'outofstock' as const, label: 'Stok Yok' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('tr-TR');
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('tr-TR') + ' TL';
  };

  const handleStockUpdate = async (productId: string, newStock: number): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductStock(currentCompany.id, productId, newStock);
    if (success) {
      updateProductInList(productId, { stockQuantity: newStock });
      toast.success('Stok güncellendi');
    } else {
      toast.error('Stok güncellenemedi');
    }
    return success;
  };

  const handlePurchasePriceUpdate = async (productId: string, newPrice: number): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductPurchasePrice(currentCompany.id, productId, newPrice);
    if (success) {
      updateProductInList(productId, { purchasePrice: newPrice });
      toast.success('Alış fiyatı güncellendi');
    } else {
      toast.error('Alış fiyatı güncellenemedi');
    }
    return success;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Stoklar</h1>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 border-b">
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toplam Stok</span>
            <Box className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mt-1">
            {summary ? formatNumber(summary.totalStock) : '-'}
          </p>
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stok Değeri</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mt-1">
            {summary ? formatCurrency(summary.totalStockValue) : '-'}
          </p>
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Net Kar</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-2xl font-semibold mt-1 ${summary && summary.netProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
            {summary ? formatCurrency(summary.netProfit) : '-'}
          </p>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Kritik Stok</span>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-semibold mt-1 text-orange-500">
            {summary ? summary.criticalStockCount : '-'}
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-between px-6 py-3 border-b gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStockFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                stockFilter === tab.id
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Ürün veya SKU ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Store Filter Dropdown */}
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Tüm Mağazalar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mağazalar</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mapping Filter Dropdown */}
          <Select value={mappingFilter} onValueChange={(v) => setMappingFilter(v as MappingFilter)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Eşleştirme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Ürünler</SelectItem>
              <SelectItem value="mapped">Eşleştirilmiş</SelectItem>
              <SelectItem value="unmapped">Eşleştirilmemiş</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-auto">
        <DataTable>
          <DataTableHeader>
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead className="pl-6 min-w-[280px]">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Ürün
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </DataTableHead>
              <DataTableHead>SKU</DataTableHead>
              <DataTableHead>Mağaza</DataTableHead>
              <DataTableHead className="text-center">
                <button
                  onClick={() => handleSort('stockQuantity')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  Stok
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </DataTableHead>
              <DataTableHead className="text-center">
                <button
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  Satış Fiyatı
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </DataTableHead>
              <DataTableHead className="text-center pr-6">Alış Fiyatı</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <DataTableRow key={i}>
                  <DataTableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </DataTableCell>
                  <DataTableCell><Skeleton className="h-4 w-20" /></DataTableCell>
                  <DataTableCell><Skeleton className="h-4 w-24" /></DataTableCell>
                  <DataTableCell><Skeleton className="h-8 w-16 mx-auto" /></DataTableCell>
                  <DataTableCell><Skeleton className="h-4 w-20 mx-auto" /></DataTableCell>
                  <DataTableCell className="pr-6"><Skeleton className="h-8 w-20 mx-auto" /></DataTableCell>
                </DataTableRow>
              ))
            ) : products.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Ürün bulunamadı
                </DataTableCell>
              </DataTableRow>
            ) : (
              products.map((product) => (
                <DataTableRow key={product.id}>
                  <DataTableCell className="pl-6">
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
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                        {product.productType === 'variable' && product.variationCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mt-0.5">
                            {product.variationCount} varyant
                          </span>
                        )}
                      </div>
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-gray-500 text-sm">
                    {product.sku || '-'}
                  </DataTableCell>
                  <DataTableCell className="text-gray-600 text-sm">
                    {product.storeName}
                  </DataTableCell>
                  <DataTableCell className="text-center">
                    <EditableStockCell
                      value={product.stockQuantity}
                      onSave={(newStock) => handleStockUpdate(product.id, newStock)}
                      disabled={product.productType === 'variable'}
                      className="mx-auto"
                    />
                  </DataTableCell>
                  <DataTableCell className="text-center text-sm font-medium">
                    {formatCurrency(product.price)}
                  </DataTableCell>
                  <DataTableCell className="text-center pr-6">
                    <EditablePriceCell
                      value={product.purchasePrice}
                      onSave={(newPrice) => handlePurchasePriceUpdate(product.id, newPrice)}
                      className="mx-auto"
                    />
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {/* Pagination */}
      {productsTotalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t bg-white">
          <span className="text-sm text-gray-500">
            Toplam {productsTotal} ürün
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={productsPage === 1}
              onClick={() => handlePageChange(productsPage - 1)}
            >
              Önceki
            </Button>
            <span className="text-sm text-gray-600">
              {productsPage} / {productsTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={productsPage === productsTotalPages}
              onClick={() => handlePageChange(productsPage + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
