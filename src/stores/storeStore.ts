import { create } from 'zustand';
import { api } from '@/services/api';

export type StoreStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface MarketplaceStore {
  id: string;
  name: string;
  url: string;
  status: StoreStatus;
  isSyncing: boolean;
  syncStep: 'connection' | 'products' | 'variations' | 'orders' | 'saving' | null;
  syncProductsCount: number | null;
  syncVariationsCount: number | null;
  syncOrdersCount: number | null;
  lastSyncAt: string | null;
  syncError: string | null;
  currency: string;
  commissionRate: number;
  shippingCost: number;
  // WCSC Plugin fields
  hasWcscPlugin: boolean;
  wcscApiKey: string | null;
  wcscApiSecret: string | null;
  wcscLastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    orders: number;
  };
}

export interface CreateStoreDto {
  name: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

interface StoreState {
  stores: MarketplaceStore[];
  isLoading: boolean;
  error: string | null;
  fetchStores: (companyId: string) => Promise<void>;
  createStore: (companyId: string, data: CreateStoreDto) => Promise<MarketplaceStore>;
  updateStore: (companyId: string, storeId: string, data: Partial<MarketplaceStore>) => Promise<MarketplaceStore>;
  deleteStore: (companyId: string, storeId: string) => Promise<void>;
  testConnection: (companyId: string, storeId: string) => Promise<{ success: boolean; error?: string }>;
  testWcscConnection: (companyId: string, storeId: string, apiKey: string, apiSecret: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  syncStore: (companyId: string, storeId: string) => Promise<{ success: boolean; message: string; started: boolean }>;
}

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  isLoading: false,
  error: null,

  fetchStores: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/company/${companyId}/stores`);
      set({ stores: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Mağazalar yüklenemedi',
        isLoading: false,
      });
    }
  },

  createStore: async (companyId: string, data: CreateStoreDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/company/${companyId}/stores`, data);
      const newStore = response.data;

      set((state) => ({
        stores: [newStore, ...state.stores],
        isLoading: false,
      }));

      return newStore;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Mağaza bağlanamadı',
        isLoading: false,
      });
      throw error;
    }
  },

  updateStore: async (companyId: string, storeId: string, data: Partial<MarketplaceStore>) => {
    try {
      const response = await api.put(`/company/${companyId}/stores/${storeId}`, data);
      const updatedStore = response.data;

      set((state) => ({
        stores: state.stores.map((s) => (s.id === storeId ? { ...s, ...updatedStore } : s)),
      }));

      return updatedStore;
    } catch (error: any) {
      throw error;
    }
  },

  deleteStore: async (companyId: string, storeId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/company/${companyId}/stores/${storeId}`);

      set((state) => ({
        stores: state.stores.filter((s) => s.id !== storeId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Mağaza silinemedi',
        isLoading: false,
      });
      throw error;
    }
  },

  testConnection: async (companyId: string, storeId: string) => {
    try {
      const response = await api.post(`/company/${companyId}/stores/${storeId}/test-connection`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Bağlantı testi başarısız',
      };
    }
  },

  testWcscConnection: async (companyId: string, storeId: string, apiKey: string, apiSecret: string) => {
    try {
      const response = await api.post(`/company/${companyId}/stores/${storeId}/test-wcsc`, {
        apiKey,
        apiSecret,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'WCSC bağlantı testi başarısız',
      };
    }
  },

  syncStore: async (companyId: string, storeId: string) => {
    // Sync'i başlat - backend async çalışacak, polling ile takip edilecek
    const response = await api.post(`/company/${companyId}/stores/${storeId}/sync`);
    return response.data;
  },
}));
