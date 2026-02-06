import { create } from 'zustand';
import { api } from '@/services/api';

export interface RefundSummary {
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  totalOrders: number;
  avgRefundAmount: number;
  previousRefunds: number;
  previousRefundAmount: number;
  refundCountChange: number;
  refundAmountChange: number;
}

export interface RefundItem {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string | null;
  refundDate: string;
  storeName: string;
  customerName: string | null;
  orderTotal: number;
}

export interface RefundReason {
  reason: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface RefundTrend {
  date: string;
  count: number;
  amount: number;
}

export interface StoreRefundComparison {
  storeId: string;
  storeName: string;
  refundCount: number;
  refundAmount: number;
  totalOrders: number;
  refundRate: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface RefundState {
  // Data
  summary: RefundSummary | null;
  refundList: RefundItem[];
  refundListTotal: number;
  refundListPage: number;
  refundListTotalPages: number;
  reasons: RefundReason[];
  trend: RefundTrend[];
  storeComparison: StoreRefundComparison[];

  // Filters
  period: string;
  customDateRange: DateRange | null;
  selectedStoreId: string | null;

  // Loading states
  isLoading: boolean;
  isSummaryLoading: boolean;
  isListLoading: boolean;
  isReasonsLoading: boolean;
  isTrendLoading: boolean;
  isComparisonLoading: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: string) => void;
  setCustomDateRange: (range: DateRange | null) => void;
  setSelectedStoreId: (storeId: string | null) => void;
  fetchSummary: (companyId: string) => Promise<void>;
  fetchRefundList: (companyId: string, page?: number, limit?: number) => Promise<void>;
  fetchReasons: (companyId: string) => Promise<void>;
  fetchTrend: (companyId: string) => Promise<void>;
  fetchStoreComparison: (companyId: string) => Promise<void>;
  fetchAllRefundData: (companyId: string) => Promise<void>;
}

export const useRefundStore = create<RefundState>((set, get) => ({
  // Initial state
  summary: null,
  refundList: [],
  refundListTotal: 0,
  refundListPage: 1,
  refundListTotalPages: 0,
  reasons: [],
  trend: [],
  storeComparison: [],
  period: '30d',
  customDateRange: null,
  selectedStoreId: null,
  isLoading: false,
  isSummaryLoading: false,
  isListLoading: false,
  isReasonsLoading: false,
  isTrendLoading: false,
  isComparisonLoading: false,
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

      const response = await api.get<RefundSummary>(
        `/companies/${companyId}/refunds/summary?${params.toString()}`
      );
      set({ summary: response.data, isSummaryLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'İade özeti yüklenemedi',
        isSummaryLoading: false,
      });
    }
  },

  fetchRefundList: async (companyId: string, page = 1, limit = 20) => {
    const { period, customDateRange, selectedStoreId } = get();
    set({ isListLoading: true, error: null });
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
        refunds: RefundItem[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/companies/${companyId}/refunds/list?${params.toString()}`);

      set({
        refundList: response.data.refunds,
        refundListTotal: response.data.total,
        refundListPage: response.data.page,
        refundListTotalPages: response.data.totalPages,
        isListLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'İade listesi yüklenemedi',
        isListLoading: false,
      });
    }
  },

  fetchReasons: async (companyId: string) => {
    const { period, customDateRange, selectedStoreId } = get();
    set({ isReasonsLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<RefundReason[]>(
        `/companies/${companyId}/refunds/reasons?${params.toString()}`
      );
      set({ reasons: response.data, isReasonsLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'İade nedenleri yüklenemedi',
        isReasonsLoading: false,
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

      const response = await api.get<RefundTrend[]>(
        `/companies/${companyId}/refunds/trend?${params.toString()}`
      );
      set({ trend: response.data, isTrendLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'İade trendi yüklenemedi',
        isTrendLoading: false,
      });
    }
  },

  fetchStoreComparison: async (companyId: string) => {
    const { period, customDateRange } = get();
    set({ isComparisonLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      } else {
        params.append('period', period);
      }

      const response = await api.get<StoreRefundComparison[]>(
        `/companies/${companyId}/refunds/stores?${params.toString()}`
      );
      set({ storeComparison: response.data, isComparisonLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Mağaza karşılaştırması yüklenemedi',
        isComparisonLoading: false,
      });
    }
  },

  fetchAllRefundData: async (companyId: string) => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchSummary(companyId),
      get().fetchReasons(companyId),
      get().fetchTrend(companyId),
      get().fetchStoreComparison(companyId),
    ]);
    set({ isLoading: false });
  },
}));
