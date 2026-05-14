import { create } from 'zustand';
import { api } from '@/services/api';

// Backend marketplace ID'lerini (wc_product_id, wc_variation_id) Prisma BigInt
// olarak saklıyor. main.ts'te BigInt.prototype.toJSON = toString tanımlı,
// dolayısıyla JSON wire'da string olarak gelir. Frontend'te native bigint'e
// parse ediyoruz; arithmetic gerekmiyor ama Number.MAX_SAFE_INTEGER'i aşan
// Shopify ID'leri için tip güvenliğini koruyor.
const toBigInt = (v: unknown): bigint =>
  typeof v === 'bigint' ? v : BigInt(v as string | number);

const parseCriticalProduct = (p: CriticalProduct): CriticalProduct => ({
  ...p,
  wcProductId: toBigInt(p.wcProductId),
});

const parseProduct = (p: Product): Product => ({
  ...p,
  wcProductId: toBigInt(p.wcProductId),
});

const parseProductDetail = (d: ProductDetail): ProductDetail => ({
  ...d,
  wcProductId: toBigInt(d.wcProductId),
  variations: d.variations.map((v) => ({
    ...v,
    wcVariationId: toBigInt(v.wcVariationId),
  })),
  mapping: d.mapping
    ? {
        ...d.mapping,
        stores: d.mapping.stores.map((s) => ({
          ...s,
          wcProductId: toBigInt(s.wcProductId),
        })),
      }
    : null,
});

export interface InventorySummary {
  totalStock: number;
  totalStockValue: number;
  netProfit: number;
  criticalStockCount: number;
  outOfStockCount: number;
  productsWithoutPurchasePrice: number;
  lastSyncAt: string | null;
}

export interface StoreInventory {
  storeId: string;
  storeName: string;
  totalStock: number;
  totalStockValue: number;
  netProfit: number;
  criticalStockCount: number;
  productCount: number;
}

export interface CriticalProduct {
  id: string;
  name: string;
  sku: string | null;
  stockQuantity: number;
  price: number;
  purchasePrice: number | null;
  storeId: string;
  storeName: string;
  storeUrl: string;
  wcProductId: bigint;
  productType: string;
  variationInfo?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  productType: string;
  stockQuantity: number;
  price: number;
  purchasePrice: number | null;
  vatRate: number | null;
  storeId: string;
  storeName: string;
  wcProductId: bigint;
  syncedAt: string;
  createdAt: string;
  variationCount: number;
  isActive: boolean;
  /** Listing endpoint'i bu alanı zaten dolduruyor — Eşleştirme kolonu için. */
  isMapped?: boolean;
  mappingId?: string | null;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductVariation {
  id: string;
  wcVariationId: bigint;
  sku: string | null;
  price: number;
  stockQuantity: number;
  stockStatus: string;
  attributes: Record<string, string> | null;
  attributeString: string | null;
}

export interface ProductMappingStore {
  storeId: string;
  storeName: string;
  storeUrl: string;
  productId: string;
  wcProductId: bigint;
  isSource: boolean;
  stockQuantity: number;
}

export interface ProductMappingInfo {
  id: string;
  masterSku: string;
  name: string | null;
  stores: ProductMappingStore[];
}

export interface ProductDetail {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  productType: string;
  stockQuantity: number;
  stockStatus: string;
  price: number;
  purchasePrice: number | null;
  manageStock: boolean;
  isActive: boolean;
  wcProductId: bigint;
  syncedAt: string;
  store: {
    id: string;
    name: string;
    url: string;
  };
  variations: ProductVariation[];
  mapping: ProductMappingInfo | null;
}

interface InventoryState {
  summary: InventorySummary | null;
  storeInventories: StoreInventory[];
  criticalProducts: CriticalProduct[];
  products: Product[];
  productsTotal: number;
  productsPage: number;
  productsTotalPages: number;
  selectedProduct: ProductDetail | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  criticalThreshold: number;

  fetchSummary: (companyId: string) => Promise<void>;
  fetchByStore: (companyId: string) => Promise<void>;
  fetchCriticalProducts: (companyId: string, storeId?: string) => Promise<void>;
  fetchProducts: (
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
      storeId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      stockStatus?: 'instock' | 'outofstock' | 'critical';
      mappingStatus?: 'mapped' | 'unmapped';
      isActive?: 'true' | 'false';
      vatRate?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => Promise<void>;
  /** Toplu Aktif/Pasif. "Satıştan Kaldır" → isActive=false, geri al → true. */
  bulkSetActive: (
    companyId: string,
    productIds: string[],
    isActive: boolean
  ) => Promise<number>;
  /** Toplu hard-delete. Çağrılmadan önce confirm gösterilmelidir. */
  bulkDelete: (companyId: string, productIds: string[]) => Promise<number>;
  fetchProduct: (companyId: string, productId: string) => Promise<void>;
  updateProductStock: (companyId: string, productId: string, stockQuantity: number) => Promise<boolean>;
  updateVariationStock: (companyId: string, variationId: string, stockQuantity: number) => Promise<boolean>;
  updateProductPurchasePrice: (companyId: string, productId: string, purchasePrice: number) => Promise<boolean>;
  updateVariationPurchasePrice: (companyId: string, variationId: string, purchasePrice: number) => Promise<boolean>;
  /** Inline cell editor'lerin kullandığı multi-field PATCH (name, isActive). */
  updateProduct: (
    companyId: string,
    productId: string,
    patch: Partial<Pick<Product, 'name' | 'isActive'>>
  ) => Promise<boolean>;
  updateProductInList: (productId: string, updates: Partial<Product>) => void;
  setCriticalThreshold: (threshold: number) => void;
  clearSelectedProduct: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  summary: null,
  storeInventories: [],
  criticalProducts: [],
  products: [],
  productsTotal: 0,
  productsPage: 1,
  productsTotalPages: 0,
  selectedProduct: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  criticalThreshold: 5,

  fetchSummary: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { criticalThreshold } = get();
      const response = await api.get(
        `/company/${companyId}/inventory/summary?criticalThreshold=${criticalThreshold}`
      );
      set({ summary: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Envanter özeti yüklenemedi',
        isLoading: false,
      });
    }
  },

  fetchByStore: async (companyId: string) => {
    try {
      const { criticalThreshold } = get();
      const response = await api.get(
        `/company/${companyId}/inventory/by-store?criticalThreshold=${criticalThreshold}`
      );
      set({ storeInventories: response.data });
    } catch (error: any) {
      console.error('Store inventory fetch error:', error);
    }
  },

  fetchCriticalProducts: async (companyId: string, storeId?: string) => {
    try {
      const { criticalThreshold } = get();
      const params = new URLSearchParams({ criticalThreshold: String(criticalThreshold) });
      if (storeId) params.append('storeId', storeId);

      const response = await api.get<CriticalProduct[]>(
        `/company/${companyId}/inventory/critical?${params.toString()}`
      );
      set({ criticalProducts: response.data.map(parseCriticalProduct) });
    } catch (error: any) {
      console.error('Critical products fetch error:', error);
    }
  },

  fetchProducts: async (companyId: string, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', String(options.page));
      if (options.limit) params.append('limit', String(options.limit));
      if (options.storeId) params.append('storeId', options.storeId);
      if (options.search) params.append('search', options.search);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options.stockStatus) params.append('stockStatus', options.stockStatus);
      if (options.mappingStatus) params.append('mappingStatus', options.mappingStatus);
      if (options.isActive) params.append('isActive', options.isActive);
      if (options.vatRate !== undefined) params.append('vatRate', String(options.vatRate));
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);

      const response = await api.get<ProductsResponse>(
        `/company/${companyId}/inventory/products?${params.toString()}`
      );
      set({
        products: response.data.products.map(parseProduct),
        productsTotal: response.data.total,
        productsPage: response.data.page,
        productsTotalPages: response.data.totalPages,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Ürünler yüklenemedi',
        isLoading: false,
      });
    }
  },

  setCriticalThreshold: (threshold: number) => {
    set({ criticalThreshold: threshold });
  },

  fetchProduct: async (companyId: string, productId: string) => {
    set({ isLoading: true, error: null, selectedProduct: null });
    try {
      const response = await api.get<ProductDetail>(
        `/company/${companyId}/inventory/products/${productId}`
      );
      set({ selectedProduct: parseProductDetail(response.data), isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Ürün yüklenemedi',
        isLoading: false,
      });
    }
  },

  clearSelectedProduct: () => {
    set({ selectedProduct: null });
  },

  updateProductStock: async (companyId: string, productId: string, stockQuantity: number) => {
    set({ isUpdating: true, error: null });
    try {
      await api.patch(`/company/${companyId}/inventory/products/${productId}/stock`, {
        stockQuantity,
      });
      // Update local state
      const { selectedProduct } = get();
      if (selectedProduct && selectedProduct.id === productId) {
        set({
          selectedProduct: {
            ...selectedProduct,
            stockQuantity,
            stockStatus: stockQuantity > 0 ? 'instock' : 'outofstock',
          },
          isUpdating: false,
        });
      } else {
        set({ isUpdating: false });
      }
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Stok güncellenemedi',
        isUpdating: false,
      });
      return false;
    }
  },

  updateVariationStock: async (companyId: string, variationId: string, stockQuantity: number) => {
    set({ isUpdating: true, error: null });
    try {
      await api.patch(`/company/${companyId}/inventory/variations/${variationId}/stock`, {
        stockQuantity,
      });
      // Update local state
      const { selectedProduct } = get();
      if (selectedProduct) {
        const updatedVariations = selectedProduct.variations.map((v) =>
          v.id === variationId
            ? { ...v, stockQuantity, stockStatus: stockQuantity > 0 ? 'instock' : 'outofstock' }
            : v
        );
        set({
          selectedProduct: {
            ...selectedProduct,
            variations: updatedVariations,
          },
          isUpdating: false,
        });
      } else {
        set({ isUpdating: false });
      }
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Varyasyon stoğu güncellenemedi',
        isUpdating: false,
      });
      return false;
    }
  },

  updateProductPurchasePrice: async (companyId: string, productId: string, purchasePrice: number) => {
    set({ isUpdating: true, error: null });
    try {
      await api.patch(`/company/${companyId}/inventory/products/${productId}/purchase-price`, {
        purchasePrice,
      });
      // Update local state
      const { selectedProduct, products } = get();
      if (selectedProduct && selectedProduct.id === productId) {
        set({
          selectedProduct: {
            ...selectedProduct,
            purchasePrice,
          },
          isUpdating: false,
        });
      }
      // Also update in products list
      set({
        products: products.map((p) =>
          p.id === productId ? { ...p, purchasePrice } : p
        ),
        isUpdating: false,
      });
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Alış fiyatı güncellenemedi',
        isUpdating: false,
      });
      return false;
    }
  },

  updateVariationPurchasePrice: async (companyId: string, variationId: string, purchasePrice: number) => {
    set({ isUpdating: true, error: null });
    try {
      await api.patch(`/company/${companyId}/inventory/variations/${variationId}/purchase-price`, {
        purchasePrice,
      });
      // Update local state
      const { selectedProduct } = get();
      if (selectedProduct) {
        const updatedVariations = selectedProduct.variations.map((v) =>
          v.id === variationId ? { ...v, purchasePrice } : v
        );
        set({
          selectedProduct: {
            ...selectedProduct,
            variations: updatedVariations,
          },
          isUpdating: false,
        });
      } else {
        set({ isUpdating: false });
      }
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Varyasyon alış fiyatı güncellenemedi',
        isUpdating: false,
      });
      return false;
    }
  },

  // Inline cell editor multi-field PATCH. Optimistic — listeyi anında günceller,
  // backend hata verirse rollback için snapshot tutuluyor.
  updateProduct: async (companyId, productId, patch) => {
    const before = get().products.find((p) => p.id === productId);
    if (before) {
      set({
        products: get().products.map((p) =>
          p.id === productId ? { ...p, ...patch } : p
        ),
      });
    }
    try {
      const response = await api.patch(
        `/company/${companyId}/inventory/products/${productId}`,
        patch
      );
      const data = response.data as Partial<Product>;
      // Backend'den dönen otoriter değerlerle senkronize et.
      set({
        products: get().products.map((p) =>
          p.id === productId ? { ...p, ...data } : p
        ),
      });
      return true;
    } catch (error: any) {
      // Hata → snapshot'a rollback.
      if (before) {
        set({
          products: get().products.map((p) =>
            p.id === productId ? before : p
          ),
        });
      }
      set({
        error: error.response?.data?.message || 'Ürün güncellenemedi',
      });
      return false;
    }
  },

  updateProductInList: (productId: string, updates: Partial<Product>) => {
    const { products } = get();
    set({
      products: products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    });
  },

  bulkSetActive: async (companyId, productIds, isActive) => {
    if (productIds.length === 0) return 0;
    try {
      const response = await api.post<{ updated: number }>(
        `/company/${companyId}/inventory/products/bulk-set-active`,
        { productIds, isActive }
      );
      const updatedCount = response.data?.updated ?? 0;
      // Etkilenen ürünlerin local list state'ini de güncelle.
      const ids = new Set(productIds);
      set({
        products: get().products.map((p) =>
          ids.has(p.id) ? { ...p, isActive } : p
        ),
      });
      return updatedCount;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Toplu güncelleme başarısız',
      });
      return 0;
    }
  },

  bulkDelete: async (companyId, productIds) => {
    if (productIds.length === 0) return 0;
    try {
      const response = await api.post<{ deleted: number }>(
        `/company/${companyId}/inventory/products/bulk-delete`,
        { productIds }
      );
      const deletedCount = response.data?.deleted ?? 0;
      const ids = new Set(productIds);
      set({
        products: get().products.filter((p) => !ids.has(p.id)),
        productsTotal: Math.max(0, get().productsTotal - deletedCount),
      });
      return deletedCount;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Toplu silme başarısız',
      });
      return 0;
    }
  },
}));
