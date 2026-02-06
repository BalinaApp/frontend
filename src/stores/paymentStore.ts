import { create } from 'zustand';
import { api } from '@/services/api';

export interface PaymentSummary {
  totalPayments: number;
  totalRevenue: number;
  completedPayments: number;
  completedRevenue: number;
  pendingPayments: number;
  pendingRevenue: number;
  failedPayments: number;
  failedRevenue: number;
  refundedPayments: number;
  refundedRevenue: number;
  successRate: number;
  avgPaymentValue: number;
  previousTotalRevenue: number;
  revenueChange: number;
}

export interface PendingPayment {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  total: number;
  paymentMethod: string | null;
  orderDate: string;
  storeName: string;
  daysPending: number;
}

export interface PaymentMethodDistribution {
  method: string;
  count: number;
  revenue: number;
}

export interface PaymentTrend {
  date: string;
  amount: number;
  count: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface PaymentState {
  // Data
  summary: PaymentSummary | null;
  pendingPayments: PendingPayment[];
  methodDistribution: PaymentMethodDistribution[];
  trend: PaymentTrend[];

  // Filters
  period: string;
  customDateRange: DateRange | null;
  selectedStoreId: string | null;

  // Loading states
  isLoading: boolean;
  isSummaryLoading: boolean;
  isPendingLoading: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: string) => void;
  setCustomDateRange: (range: DateRange | null) => void;
  setSelectedStoreId: (storeId: string | null) => void;
  fetchSummary: (companyId: string) => Promise<void>;
  fetchPendingPayments: (companyId: string, limit?: number) => Promise<void>;
  fetchMethodDistribution: (companyId: string) => Promise<void>;
  fetchAllPaymentAnalytics: (companyId: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  // Initial state
  summary: null,
  pendingPayments: [],
  methodDistribution: [],
  trend: [],
  period: '30d',
  customDateRange: null,
  selectedStoreId: null,
  isLoading: false,
  isSummaryLoading: false,
  isPendingLoading: false,
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

      const response = await api.get<PaymentSummary>(
        `/companies/${companyId}/orders/payments/summary?${params.toString()}`
      );
      set({ summary: response.data, isSummaryLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Ödeme özeti yüklenemedi',
        isSummaryLoading: false,
      });
    }
  },

  fetchPendingPayments: async (companyId: string, limit = 20) => {
    const { selectedStoreId } = get();
    set({ isPendingLoading: true, error: null });
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (selectedStoreId) params.append('storeId', selectedStoreId);

      const response = await api.get<PendingPayment[]>(
        `/companies/${companyId}/orders/payments/pending?${params.toString()}`
      );
      set({ pendingPayments: response.data, isPendingLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Bekleyen ödemeler yüklenemedi',
        isPendingLoading: false,
      });
    }
  },

  fetchMethodDistribution: async (companyId: string) => {
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
      set({ methodDistribution: response.data });
    } catch (error: any) {
      console.error('Payment distribution fetch error:', error);
    }
  },

  fetchAllPaymentAnalytics: async (companyId: string) => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchSummary(companyId),
      get().fetchPendingPayments(companyId),
      get().fetchMethodDistribution(companyId),
    ]);
    set({ isLoading: false });
  },
}));
