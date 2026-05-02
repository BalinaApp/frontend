'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useCompanyStore } from '@/stores/companyStore';
import { Button, Chip, Skeleton, toast } from '@heroui/react';
import { EditableStockCell, EditablePriceCell } from '@/components/inventory';
import { ArrowLeft, ExternalLink, Package, ImageIcon } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const productId = params.productId as string;

  const { currentCompany } = useCompanyStore();
  const {
    selectedProduct,
    isLoading,
    error,
    fetchProduct,
    clearSelectedProduct,
    updateProductStock,
    updateVariationStock,
    updateProductPurchasePrice,
  } = useInventoryStore();

  useEffect(() => {
    if (currentCompany?.id && productId) {
      fetchProduct(currentCompany.id, productId);
    }
    return () => {
      clearSelectedProduct();
    };
  }, [currentCompany?.id, productId, fetchProduct, clearSelectedProduct]);

  if (!currentCompany || isLoading) return <ProductDetailSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-danger/10 p-4 text-danger">{error}</div>
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div className="p-6">
        <div className="text-muted">Ürün bulunamadı</div>
      </div>
    );
  }

  const getStockChip = (quantity: number) => {
    if (quantity === 0) return <Chip variant="primary" className="bg-danger text-danger-foreground" size="sm">Stok Yok</Chip>;
    if (quantity <= 5)
      return <Chip variant="primary" className="bg-warning text-warning-foreground" size="sm">Kritik</Chip>;
    return <Chip variant="primary" className="bg-success text-success-foreground" size="sm">Stokta</Chip>;
  };

  const isSimpleProduct = selectedProduct.productType === 'simple';
  const hasVariations = selectedProduct.variations.length > 0;

  const totalStock = hasVariations
    ? selectedProduct.variations.reduce((sum, v) => sum + v.stockQuantity, 0)
    : selectedProduct.stockQuantity;

  const handleStockUpdate = async (newStock: number): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductStock(currentCompany.id, productId, newStock);
    toast[success ? 'success' : 'danger'](
      success ? 'Stok güncellendi' : 'Stok güncellenemedi'
    );
    return success;
  };

  const handleVariationStockUpdate = async (
    variationId: string,
    newStock: number
  ): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateVariationStock(currentCompany.id, variationId, newStock);
    toast[success ? 'success' : 'danger'](
      success ? 'Varyasyon stoğu güncellendi' : 'Varyasyon stoğu güncellenemedi'
    );
    return success;
  };

  const handlePurchasePriceUpdate = async (newPrice: number): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductPurchasePrice(currentCompany.id, productId, newPrice);
    toast[success ? 'success' : 'danger'](
      success ? 'Alış fiyatı güncellendi' : 'Alış fiyatı güncellenemedi'
    );
    return success;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/${companySlug}/inventory`}>
            <Button variant="ghost" size="sm" isIconOnly aria-label="Geri">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{selectedProduct.name}</h1>
            <Chip
              variant="primary"
              className={
                selectedProduct.isActive
                  ? 'bg-success text-success-foreground'
                  : 'bg-default text-foreground'
              }
              size="sm"
            >
              {selectedProduct.isActive ? 'Aktif' : 'Pasif'}
            </Chip>
          </div>
        </div>
        <a
          href={`${selectedProduct.store.url}/wp-admin/post.php?post=${selectedProduct.wcProductId}&action=edit`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="h-4 w-4" />
            WooCommerce&apos;de Aç
          </Button>
        </a>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px]">
          <div className="border-r border-border">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {selectedProduct.imageUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-secondary/50">
                      <ImageIcon className="h-5 w-5 text-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-medium">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span>SKU: {selectedProduct.sku || '-'}</span>
                    <span>|</span>
                    <span>
                      {selectedProduct.productType === 'simple'
                        ? 'Basit Ürün'
                        : `Değişken Ürün (${selectedProduct.variations.length} varyant)`}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-2xl font-semibold">
                    ₺{selectedProduct.price.toFixed(2)}
                  </span>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <span className="text-sm text-muted">Maliyet:</span>
                    <EditablePriceCell
                      value={selectedProduct.purchasePrice}
                      onSave={handlePurchasePriceUpdate}
                      placeholder="Belirtilmedi"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between border-b border-border px-6 py-3">
                <h3 className="font-medium">Stok Yönetimi</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">Toplam Stok:</span>
                  <span className="font-semibold">{totalStock}</span>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-6 py-2 text-left text-xs font-medium text-muted">
                      {hasVariations ? 'Varyant' : 'Ürün'}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">SKU</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-muted">Durum</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-muted">Stok</th>
                    <th className="w-20 px-4 py-2 pr-6 text-center text-xs font-medium text-muted"></th>
                  </tr>
                </thead>
                <tbody>
                  {isSimpleProduct && !hasVariations && (
                    <tr className="border-b border-border">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted" />
                          <span className="text-sm font-medium">{selectedProduct.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {selectedProduct.sku || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStockChip(selectedProduct.stockQuantity)}
                      </td>
                      <td className="px-4 py-3 pr-6 text-center" colSpan={2}>
                        <EditableStockCell
                          value={selectedProduct.stockQuantity}
                          onSave={handleStockUpdate}
                          className="mx-auto"
                        />
                      </td>
                    </tr>
                  )}

                  {hasVariations &&
                    selectedProduct.variations.map((variation) => (
                      <tr key={variation.id} className="border-b border-border">
                        <td className="px-6 py-3 text-sm">
                          {variation.attributeString || 'Varsayılan'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {variation.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStockChip(variation.stockQuantity)}
                        </td>
                        <td className="px-4 py-3 pr-6 text-center" colSpan={2}>
                          <EditableStockCell
                            value={variation.stockQuantity}
                            onSave={(newStock) =>
                              handleVariationStockUpdate(variation.id, newStock)
                            }
                            className="mx-auto"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {selectedProduct.purchasePrice && (
              <div className="grid grid-cols-3 border-b border-border">
                <ValueCell label="Stok Değeri">
                  ₺{(selectedProduct.purchasePrice * totalStock).toLocaleString('tr-TR')}
                </ValueCell>
                <ValueCell label="Satış Değeri">
                  ₺{(selectedProduct.price * totalStock).toLocaleString('tr-TR')}
                </ValueCell>
                <ValueCell label="Brüt Kar" last>
                  <span
                    className={
                      (selectedProduct.price - selectedProduct.purchasePrice) * totalStock >= 0
                        ? 'text-success'
                        : 'text-danger'
                    }
                  >
                    ₺
                    {(
                      (selectedProduct.price - selectedProduct.purchasePrice) *
                      totalStock
                    ).toLocaleString('tr-TR')}
                  </span>
                </ValueCell>
              </div>
            )}
          </div>

          <div className="border-t border-border lg:border-t-0">
            <div className="border-b border-border">
              <div className="px-6 py-3">
                <h3 className="font-medium">Durum</h3>
              </div>
              <div className="flex flex-col gap-3 px-6 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Ürün Durumu</span>
                  <Chip
                    variant="primary"
                    className={
                      selectedProduct.isActive
                        ? 'bg-success text-success-foreground'
                        : 'bg-default text-foreground'
                    }
                    size="sm"
                  >
                    {selectedProduct.isActive ? 'Aktif' : 'Pasif'}
                  </Chip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Stok Durumu</span>
                  {getStockChip(totalStock)}
                </div>
              </div>
            </div>

            <div className="border-b border-border">
              <div className="px-6 py-3">
                <h3 className="font-medium">
                  {selectedProduct.mapping ? 'Eşleşen Mağazalar' : 'Mağaza'}
                </h3>
              </div>
              {selectedProduct.mapping ? (
                <div className="flex flex-col gap-4 px-6 pb-4">
                  {selectedProduct.mapping.stores.map((store, index) => (
                    <div
                      key={store.storeId}
                      className={index > 0 ? 'border-t border-border pt-4' : ''}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-sm font-medium">{store.storeName}</p>
                        {store.isSource && (
                          <Chip
                            variant="primary"
                            className="bg-accent text-accent-foreground"
                            size="sm"
                          >
                            Kaynak
                          </Chip>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted">
                        <div className="flex justify-between">
                          <span>Stok:</span>
                          <span className="font-medium text-foreground">
                            {store.stockQuantity} adet
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>WC ID:</span>
                          <span className="font-mono">#{store.wcProductId}</span>
                        </div>
                        <a
                          href={store.storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-accent hover:underline"
                        >
                          {store.storeUrl}
                        </a>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted">Eşleştirme SKU</p>
                    <p className="font-mono text-sm">{selectedProduct.mapping.masterSku}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 px-6 pb-4">
                  <div>
                    <p className="text-xs text-muted">Mağaza Adı</p>
                    <p className="text-sm font-medium">{selectedProduct.store.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">URL</p>
                    <a
                      href={selectedProduct.store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      {selectedProduct.store.url}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-muted">WooCommerce ID</p>
                    <p className="font-mono text-sm">#{selectedProduct.wcProductId}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-b border-border">
              <div className="px-6 py-3">
                <h3 className="font-medium">Senkronizasyon</h3>
              </div>
              <div className="px-6 pb-4">
                <div>
                  <p className="text-xs text-muted">Son Güncelleme</p>
                  <p className="text-sm">
                    {new Date(selectedProduct.syncedAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueCell({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-6 py-4 ${!last ? 'border-r border-border' : ''}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{children}</p>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px]">
          <div className="border-r border-border">
            <div className="border-b border-border px-6 py-4">
              <div className="flex gap-4">
                <Skeleton className="h-20 w-20 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-8 w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
