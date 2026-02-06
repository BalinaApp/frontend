import { create } from 'zustand';
import { api } from '@/services/api';

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
  wcProductId: number;
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
  storeId: string;
  storeName: string;
  wcProductId: number;
  syncedAt: string;
  variationCount: number;
  isActive: boolean;
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
  wcVariationId: number;
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
  wcProductId: number;
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
  wcProductId: number;
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
    }
  ) => Promise<void>;
  fetchProduct: (companyId: string, productId: string) => Promise<void>;
  updateProductStock: (companyId: string, productId: string, stockQuantity: number) => Promise<boolean>;
  updateVariationStock: (companyId: string, variationId: string, stockQuantity: number) => Promise<boolean>;
  updateProductPurchasePrice: (companyId: string, productId: string, purchasePrice: number) => Promise<boolean>;
  updateVariationPurchasePrice: (companyId: string, variationId: string, purchasePrice: number) => Promise<boolean>;
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

      const response = await api.get(
        `/company/${companyId}/inventory/critical?${params.toString()}`
      );
      set({ criticalProducts: response.data });
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

      const response = await api.get<ProductsResponse>(
        `/company/${companyId}/inventory/products?${params.toString()}`
      );
      set({
        products: response.data.products,
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
      set({ selectedProduct: response.data, isLoading: false });
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

  updateProductInList: (productId: string, updates: Partial<Product>) => {
    const { products } = get();
    set({
      products: products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    });
  },
}));
