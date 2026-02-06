import { create } from 'zustand';
import { api } from '@/services/api';

export interface MappingProduct {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  sku: string;
  stockQuantity: number;
  price: number;
}

export interface MappingItem {
  id: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  sku: string | null;
  stockQuantity: number;
  price: number;
  isSource: boolean;
}

export interface ProductMapping {
  id: string;
  masterSku: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  items: MappingItem[];
  totalStock: number;
  realStock: number; // Gerçek stok = Kaynak sitenin stoğu
  storeCount: number;
}

export interface MappingSuggestion {
  masterSku: string;
  suggestionKey: string;
  products: MappingProduct[];
  storeCount: number;
  totalStock: number;
  realStock: number; // Gerçek stok = İlk ürünün stoğu
}

export interface ConsolidatedInventory {
  masterSku: string;
  name: string | null;
  mappingId: string;
  totalStock: number;
  stores: {
    storeId: string;
    storeName: string;
    stock: number;
  }[];
}

export interface SearchProduct {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  sku: string | null;
  stockQuantity: number;
  price: number;
  isAlreadyMapped: boolean;
  mappingId: string | null;
}

interface ProductMappingState {
  mappings: ProductMapping[];
  suggestions: MappingSuggestion[];
  consolidatedInventory: ConsolidatedInventory[];
  searchResults: SearchProduct[];
  selectedMapping: ProductMapping | null;
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  isDismissing: boolean;
  isSearching: boolean;
  error: string | null;

  fetchMappings: (companyId: string) => Promise<void>;
  fetchMapping: (companyId: string, mappingId: string) => Promise<void>;
  createMapping: (
    companyId: string,
    data: { masterSku: string; name?: string; productIds: string[] }
  ) => Promise<ProductMapping | null>;
  updateMapping: (
    companyId: string,
    mappingId: string,
    data: { masterSku?: string; name?: string }
  ) => Promise<ProductMapping | null>;
  deleteMapping: (companyId: string, mappingId: string) => Promise<boolean>;
  addProductsToMapping: (
    companyId: string,
    mappingId: string,
    productIds: string[]
  ) => Promise<ProductMapping | null>;
  removeProductsFromMapping: (
    companyId: string,
    mappingId: string,
    productIds: string[]
  ) => Promise<ProductMapping | null>;
  fetchSuggestions: (companyId: string, storeIds?: string[]) => Promise<void>;
  dismissSuggestion: (companyId: string, suggestionKey: string) => Promise<boolean>;
  runAutoMatch: (
    companyId: string,
    storeIds?: string[]
  ) => Promise<{ created: number; skipped: number } | null>;
  fetchConsolidatedInventory: (companyId: string) => Promise<void>;
  searchProducts: (companyId: string, query: string, storeId?: string) => Promise<void>;
  clearSearchResults: () => void;
  clearSelectedMapping: () => void;
  clearError: () => void;
}

export const useProductMappingStore = create<ProductMappingState>((set, get) => ({
  mappings: [],
  suggestions: [],
  consolidatedInventory: [],
  searchResults: [],
  selectedMapping: null,
  isLoading: false,
  isCreating: false,
  isDeleting: false,
  isDismissing: false,
  isSearching: false,
  error: null,

  fetchMappings: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ProductMapping[]>(
        `/company/${companyId}/products/mappings`
      );
      set({ mappings: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Eşleştirmeler yüklenemedi',
        isLoading: false,
      });
    }
  },

  fetchMapping: async (companyId: string, mappingId: string) => {
    set({ isLoading: true, error: null, selectedMapping: null });
    try {
      const response = await api.get<ProductMapping>(
        `/company/${companyId}/products/mappings/${mappingId}`
      );
      set({ selectedMapping: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Eşleştirme yüklenemedi',
        isLoading: false,
      });
    }
  },

  createMapping: async (companyId, data) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.post<ProductMapping>(
        `/company/${companyId}/products/mappings`,
        data
      );
      const { mappings } = get();
      set({
        mappings: [response.data, ...mappings],
        isCreating: false,
      });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Eşleştirme oluşturulamadı',
        isCreating: false,
      });
      return null;
    }
  },

  updateMapping: async (companyId, mappingId, data) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.put<ProductMapping>(
        `/company/${companyId}/products/mappings/${mappingId}`,
        data
      );
      const { mappings, selectedMapping } = get();
      set({
        mappings: mappings.map((m) => (m.id === mappingId ? response.data : m)),
        selectedMapping:
          selectedMapping?.id === mappingId ? response.data : selectedMapping,
        isCreating: false,
      });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Eşleştirme güncellenemedi',
        isCreating: false,
      });
      return null;
    }
  },

  deleteMapping: async (companyId, mappingId) => {
    set({ isDeleting: true, error: null });
    try {
      await api.delete(`/company/${companyId}/products/mappings/${mappingId}`);
      const { mappings, selectedMapping } = get();
      set({
        mappings: mappings.filter((m) => m.id !== mappingId),
        selectedMapping: selectedMapping?.id === mappingId ? null : selectedMapping,
        isDeleting: false,
      });
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Eşleştirme silinemedi',
        isDeleting: false,
      });
      return false;
    }
  },

  addProductsToMapping: async (companyId, mappingId, productIds) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.post<ProductMapping>(
        `/company/${companyId}/products/mappings/${mappingId}/products`,
        { productIds }
      );
      const { mappings, selectedMapping } = get();
      set({
        mappings: mappings.map((m) => (m.id === mappingId ? response.data : m)),
        selectedMapping:
          selectedMapping?.id === mappingId ? response.data : selectedMapping,
        isCreating: false,
      });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Ürünler eklenemedi',
        isCreating: false,
      });
      return null;
    }
  },

  removeProductsFromMapping: async (companyId, mappingId, productIds) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.delete<ProductMapping>(
        `/company/${companyId}/products/mappings/${mappingId}/products`,
        { data: { productIds } }
      );
      const { mappings, selectedMapping } = get();
      set({
        mappings: mappings.map((m) => (m.id === mappingId ? response.data : m)),
        selectedMapping:
          selectedMapping?.id === mappingId ? response.data : selectedMapping,
        isCreating: false,
      });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Ürünler çıkarılamadı',
        isCreating: false,
      });
      return null;
    }
  },

  fetchSuggestions: async (companyId, storeIds) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (storeIds && storeIds.length > 0) {
        storeIds.forEach((id) => params.append('storeIds', id));
      }
      const response = await api.get<MappingSuggestion[]>(
        `/company/${companyId}/products/mappings/suggestions?${params.toString()}`
      );
      set({ suggestions: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Öneriler yüklenemedi',
        isLoading: false,
      });
    }
  },

  dismissSuggestion: async (companyId, suggestionKey) => {
    set({ isDismissing: true, error: null });
    try {
      await api.post(`/company/${companyId}/products/mappings/suggestions/dismiss`, {
        suggestionKey,
      });
      // Remove the dismissed suggestion from the list
      const { suggestions } = get();
      set({
        suggestions: suggestions.filter((s) => s.suggestionKey !== suggestionKey),
        isDismissing: false,
      });
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Öneri reddedilemedi',
        isDismissing: false,
      });
      return false;
    }
  },

  runAutoMatch: async (companyId, storeIds) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.post<{ created: number; skipped: number }>(
        `/company/${companyId}/products/mappings/auto`,
        { storeIds }
      );
      // Refresh mappings after auto-match
      await get().fetchMappings(companyId);
      set({ isCreating: false });
      return response.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Otomatik eşleştirme başarısız',
        isCreating: false,
      });
      return null;
    }
  },

  fetchConsolidatedInventory: async (companyId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ConsolidatedInventory[]>(
        `/company/${companyId}/products/mappings/inventory`
      );
      set({ consolidatedInventory: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Konsolide envanter yüklenemedi',
        isLoading: false,
      });
    }
  },

  searchProducts: async (companyId, query, storeId) => {
    if (!query || query.trim().length < 2) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true, error: null });
    try {
      const params = new URLSearchParams({ q: query });
      if (storeId) {
        params.append('storeId', storeId);
      }
      const response = await api.get<SearchProduct[]>(
        `/company/${companyId}/products/mappings/search?${params.toString()}`
      );
      set({ searchResults: response.data, isSearching: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Arama yapılamadı',
        isSearching: false,
      });
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [] });
  },

  clearSelectedMapping: () => {
    set({ selectedMapping: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
