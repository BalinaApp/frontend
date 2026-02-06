import { create } from 'zustand';
import { api } from '@/services/api';

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalItems: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  // Period-over-period comparison
  previousTotalOrders: number;
  previousTotalRevenue: number;
  previousAvgOrderValue: number;
  ordersChange: number;
  revenueChange: number;
  avgOrderValueChange: number;
}

export interface StoreDistribution {
  storeId: string;
  storeName: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface OrderTrend {
  date: string;
  orders: number;
  revenue: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  revenue: number;
}

export interface PaymentMethodDistribution {
  method: string;
  count: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName: string | null;
  customerEmail: string | null;
  itemsCount: number;
  orderDate: string;
  storeName: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  totalTax: number;
  shippingTotal: number;
  discountTotal: number;
  customerName: string | null;
  customerEmail: string | null;
  paymentMethod: string | null;
  itemsCount: number;
  orderDate: string;
  store: {
    id: string;
    name: string;
  };
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DateDetailOrders {
  date: string;
  orders: Order[];
  total: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface OrderState {
  // Data
  summary: OrderSummary | null;
  trend: OrderTrend[];
  statusDistribution: StatusDistribution[];
  paymentDistribution: PaymentMethodDistribution[];
  storeDistribution: StoreDistribution[];
  recentOrders: RecentOrder[];
  orders: Order[];
  ordersTotal: number;
  ordersPage: number;
  ordersTotalPages: number;
  dateDetailOrders: DateDetailOrders | null;

  // Filters
  period: string;
  customDateRange: DateRange | null;
  selectedStoreId: string | null;

  // Loading states
  isLoading: boolean;
  isSummaryLoading: boolean;
  isTrendLoading: boolean;
  isDateDetailLoading: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: string) => void;
  setCustomDateRange: (range: DateRange | null) => void;
  setSelectedStoreId: (storeId: string | null) => void;
  fetchSummary: (companyId: string) => Promise<void>;
  fetchTrend: (companyId: string) => Promise<void>;
  fetchStatusDistribution: (companyId: string) => Promise<void>;
  fetchPaymentDistribution: (companyId: string) => Promise<void>;
  fetchStoreDistribution: (companyId: string) => Promise<void>;
  fetchRecentOrders: (companyId: string, limit?: number) => Promise<void>;
  fetchOrders: (
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) => Promise<void>;
  fetchOrdersByDate: (companyId: string, date: string) => Promise<void>;
  clearDateDetailOrders: () => void;
  fetchAllAnalytics: (companyId: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  // Initial state
  summary: null,
  trend: [],
  statusDistribution: [],
  paymentDistribution: [],
  storeDistribution: [],
  recentOrders: [],
  orders: [],
  ordersTotal: 0,
  ordersPage: 1,
  ordersTotalPages: 0,
  dateDetailOrders: null,
  period: '30d',
  customDateRange: null,
  selectedStoreId: null,
  isLoading: false,
  isSummaryLoading: false,
  isTrendLoading: false,
  isDateDetailLoading: false,
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

      const response = await api.get<OrderSummary>(
        `/companies/${companyId}/orders/summary?${params.toString()}`
      );
      set({ summary: response.data, isSummaryLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Sipariş özeti yüklenemedi',
        isSummaryLoading: false,
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

      const response = await api.get<OrderTrend[]>(
        `/companies/${companyId}/orders/trend?${params.toString()}`
      );
      set({ trend: response.data, isTrendLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Sipariş trendi yüklenemedi',
        isTrendLoading: false,
      });
    }
  },

  fetchStatusDistribution: async (companyId: string) => {
    const { period, customDateRange, selectedStoreId } = get();
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<StatusDistribution[]>(
        `/companies/${companyId}/orders/status-distribution?${params.toString()}`
      );
      set({ statusDistribution: response.data });
    } catch (error: any) {
      console.error('Status distribution fetch error:', error);
    }
  },

  fetchPaymentDistribution: async (companyId: string) => {
    const { period, customDateRange, selectedStoreId } = get();
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<PaymentMethodDistribution[]>(
        `/companies/${companyId}/orders/payment-distribution?${params.toString()}`
      );
      set({ paymentDistribution: response.data });
    } catch (error: any) {
      console.error('Payment distribution fetch error:', error);
    }
  },

  fetchStoreDistribution: async (companyId: string) => {
    const { period, customDateRange } = get();
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }

      const response = await api.get<StoreDistribution[]>(
        `/companies/${companyId}/orders/store-distribution?${params.toString()}`
      );
      set({ storeDistribution: response.data });
    } catch (error: any) {
      console.error('Store distribution fetch error:', error);
    }
  },

  fetchRecentOrders: async (companyId: string, limit = 10) => {
    const { selectedStoreId } = get();
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<RecentOrder[]>(
        `/companies/${companyId}/orders/recent?${params.toString()}`
      );
      set({ recentOrders: response.data });
    } catch (error: any) {
      console.error('Recent orders fetch error:', error);
    }
  },

  fetchOrders: async (companyId: string, options = {}) => {
    const { selectedStoreId } = get();
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', String(options.page));
      if (options.limit) params.append('limit', String(options.limit));
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<OrdersResponse>(
        `/companies/${companyId}/orders?${params.toString()}`
      );
      set({
        orders: response.data.orders,
        ordersTotal: response.data.total,
        ordersPage: response.data.page,
        ordersTotalPages: response.data.totalPages,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Siparişler yüklenemedi',
        isLoading: false,
      });
    }
  },

  fetchOrdersByDate: async (companyId: string, date: string) => {
    const { selectedStoreId } = get();
    set({ isDateDetailLoading: true, error: null });
    try {
      // Calculate start and end of the day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('limit', '100'); // Get up to 100 orders for that day
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<OrdersResponse>(
        `/companies/${companyId}/orders?${params.toString()}`
      );

      set({
        dateDetailOrders: {
          date,
          orders: response.data.orders,
          total: response.data.total,
        },
        isDateDetailLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Günlük siparişler yüklenemedi',
        isDateDetailLoading: false,
      });
    }
  },

  clearDateDetailOrders: () => {
    set({ dateDetailOrders: null });
  },

  fetchAllAnalytics: async (companyId: string) => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchSummary(companyId),
      get().fetchTrend(companyId),
      get().fetchStatusDistribution(companyId),
      get().fetchPaymentDistribution(companyId),
      get().fetchStoreDistribution(companyId),
      get().fetchRecentOrders(companyId),
    ]);
    set({ isLoading: false });
  },
}));
