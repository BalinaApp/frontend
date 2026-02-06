import { create } from 'zustand';
import { api } from '@/services/api';

export interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalCommission: number;
  totalShippingCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  ordersCount: number;
  itemsCount: number;
  avgOrderProfit: number;
  previousNetProfit: number;
  profitChange: number;
}

export interface ProductProfit {
  productId: string;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  salePrice: number;
  purchasePrice: number | null;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  hasPurchasePrice: boolean;
}

export interface OrderProfit {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  storeName: string;
  customerName: string | null;
  itemsCount: number;
  revenue: number;
  cost: number;
  commission: number;
  shippingCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface ProfitTrend {
  date: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  netProfit: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ProfitState {
  // Data
  summary: ProfitSummary | null;
  productProfits: ProductProfit[];
  orderProfits: OrderProfit[];
  orderProfitsTotal: number;
  orderProfitsPage: number;
  orderProfitsTotalPages: number;
  trend: ProfitTrend[];

  // Filters
  period: string;
  customDateRange: DateRange | null;
  selectedStoreId: string | null;

  // Loading states
  isLoading: boolean;
  isSummaryLoading: boolean;
  isProductsLoading: boolean;
  isOrdersLoading: boolean;
  isTrendLoading: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: string) => void;
  setCustomDateRange: (range: DateRange | null) => void;
  setSelectedStoreId: (storeId: string | null) => void;
  fetchSummary: (companyId: string) => Promise<void>;
  fetchProductProfits: (companyId: string, limit?: number) => Promise<void>;
  fetchOrderProfits: (companyId: string, page?: number, limit?: number) => Promise<void>;
  fetchTrend: (companyId: string) => Promise<void>;
  fetchAllProfitAnalytics: (companyId: string) => Promise<void>;
}

export const useProfitStore = create<ProfitState>((set, get) => ({
  // Initial state
  summary: null,
  productProfits: [],
  orderProfits: [],
  orderProfitsTotal: 0,
  orderProfitsPage: 1,
  orderProfitsTotalPages: 0,
  trend: [],
  period: '30d',
  customDateRange: null,
  selectedStoreId: null,
  isLoading: false,
  isSummaryLoading: false,
  isProductsLoading: false,
  isOrdersLoading: false,
  isTrendLoading: false,
  error: null,

  setPeriod: (period: string) => {
    set({ period, customDateRange: null });
  },

  setCustomDateRange: (range: DateRange | null) => {
    if (range?.from && range?.to) {
      set({ customDateRange: range, period: 'custom' });
    } else {
      set({ customDateRange: range });
    }
  },

  setSelectedStoreId: (storeId: string | null) => {
    set({ selectedStoreId: storeId });
  },

  fetchSummary: async (companyId: string) => {
    const { period, customDateRange, selectedStoreId } = get();
    set({ isSummaryLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<ProfitSummary>(
        `/companies/${companyId}/profit/summary?${params.toString()}`
      );
      set({ summary: response.data, isSummaryLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Kar özeti yüklenemedi',
        isSummaryLoading: false,
      });
    }
  },

  fetchProductProfits: async (companyId: string, limit = 50) => {
    const { period, customDateRange, selectedStoreId } = get();
    set({ isProductsLoading: true, error: null });
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<ProductProfit[]>(
        `/companies/${companyId}/profit/products?${params.toString()}`
      );
      set({ productProfits: response.data, isProductsLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Ürün kar verileri yüklenemedi',
        isProductsLoading: false,
      });
    }
  },

  fetchOrderProfits: async (companyId: string, page = 1, limit = 20) => {
    const { period, customDateRange, selectedStoreId } = get();
    set({ isOrdersLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<{
        orders: OrderProfit[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/companies/${companyId}/profit/orders?${params.toString()}`);

      set({
        orderProfits: response.data.orders,
        orderProfitsTotal: response.data.total,
        orderProfitsPage: response.data.page,
        orderProfitsTotalPages: response.data.totalPages,
        isOrdersLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Sipariş kar verileri yüklenemedi',
        isOrdersLoading: false,
      });
    }
  },

  fetchTrend: async (companyId: string) => {
    const { period, customDateRange, selectedStoreId } = get();
    set({ isTrendLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<ProfitTrend[]>(
        `/companies/${companyId}/profit/trend?${params.toString()}`
      );
      set({ trend: response.data, isTrendLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Kar trendi yüklenemedi',
        isTrendLoading: false,
      });
    }
  },

  fetchAllProfitAnalytics: async (companyId: string) => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchSummary(companyId),
      get().fetchProductProfits(companyId),
      get().fetchTrend(companyId),
    ]);
    set({ isLoading: false });
  },
}));
