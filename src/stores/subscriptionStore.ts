import { create } from 'zustand';
import { api } from '@/services/api';

export type SubscriptionStatus =
  | 'on_trial'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'expired';

export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface Subscription {
  id: string;
  lsSubscriptionId: string;
  lsCustomerId: string;
  lsVariantId: string;
  lsOrderId: string | null;
  planType: PlanType;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  urlUpdatePaymentMethod: string | null;
  urlCustomerPortal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanChangePreview {
  isUpgrade: boolean;
  currentPrice: number;
  newPrice: number;
  remainingCredit: number;
  netCharge: number;
  effectiveAt: string;
}

export interface InvoiceRow {
  id: string;
  reason: string;
  status: string;
  currency: string;
  totalFormatted: string;
  invoiceUrl: string | null;
  createdAt: string;
}

interface State {
  subscription: Subscription | null;
  invoices: InvoiceRow[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  fetchCurrent: () => Promise<void>;
  /**
   * Checkout sonrası backend webhook gelmemişse, LS REST API'den manuel sync et.
   * Backend `POST /billing/subscription/sync` endpoint'ini çağırır; LS tarafındaki
   * kayıt DB'ye upsert edilir ve state güncellenir.
   */
  syncFromLemon: () => Promise<boolean>;
  createCheckout: (planType: PlanType, cycle: BillingCycle) => Promise<string | null>;
  /** Plan değişimi preview — prorated tutar tahmini. */
  previewChangePlan: (
    planType: PlanType,
    cycle: BillingCycle,
  ) => Promise<PlanChangePreview | null>;
  /** Plan değişimi: upgrade prorated charge, downgrade dönem sonunda. */
  changePlan: (planType: PlanType, cycle: BillingCycle) => Promise<boolean>;
  cancel: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  fetchInvoices: () => Promise<void>;
  getCustomerPortalUrl: () => Promise<string | null>;
}

export const useSubscriptionStore = create<State>((set, get) => ({
  subscription: null,
  invoices: [],
  isLoading: false,
  isMutating: false,
  error: null,

  fetchCurrent: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ subscription: Subscription | null }>(
        '/billing/subscription',
      );
      set({ subscription: data.subscription, isLoading: false });
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Abonelik yüklenemedi',
        isLoading: false,
      });
    }
  },

  syncFromLemon: async () => {
    try {
      const { data } = await api.post<{
        synced: boolean;
        subscription: Subscription | null;
      }>('/billing/subscription/sync');
      if (data.subscription) {
        set({ subscription: data.subscription, error: null });
      }
      return data.synced;
    } catch (e: any) {
      const message =
        e.response?.data?.message || 'Abonelik senkronizasyonu başarısız';
      // Hata mesajını upstream consumer'a iletmek için throw et — toast'ta
      // sebep gösterilebilsin (variant ID eşleşmeme gibi).
      set({ error: message });
      throw new Error(message);
    }
  },

  createCheckout: async (planType, cycle) => {
    set({ isMutating: true, error: null });
    try {
      const { data } = await api.post<{ url: string }>('/billing/checkout', {
        planType,
        cycle,
      });
      set({ isMutating: false });
      return data.url;
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Checkout başlatılamadı',
        isMutating: false,
      });
      return null;
    }
  },

  previewChangePlan: async (planType, cycle) => {
    try {
      const { data } = await api.post<PlanChangePreview>(
        '/billing/subscription/change-plan/preview',
        { planType, cycle },
      );
      return data;
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Preview hesaplanamadı',
      });
      return null;
    }
  },

  changePlan: async (planType, cycle) => {
    set({ isMutating: true, error: null });
    try {
      await api.post('/billing/subscription/change-plan', { planType, cycle });
      await get().fetchCurrent();
      set({ isMutating: false });
      return true;
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Plan değişimi başarısız',
        isMutating: false,
      });
      return false;
    }
  },

  cancel: async () => {
    set({ isMutating: true });
    try {
      await api.delete('/billing/subscription');
      await get().fetchCurrent();
      set({ isMutating: false });
      return true;
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'İptal başarısız',
        isMutating: false,
      });
      return false;
    }
  },

  resume: async () => {
    set({ isMutating: true });
    try {
      await api.post('/billing/subscription/resume');
      await get().fetchCurrent();
      set({ isMutating: false });
      return true;
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Geri alma başarısız',
        isMutating: false,
      });
      return false;
    }
  },

  fetchInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ invoices: InvoiceRow[] }>(
        '/billing/invoices',
      );
      set({ invoices: data.invoices ?? [], isLoading: false });
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Faturalar yüklenemedi',
        isLoading: false,
        invoices: [],
      });
    }
  },

  getCustomerPortalUrl: async () => {
    try {
      const { data } = await api.get<{ url: string }>('/billing/customer-portal');
      return data.url;
    } catch {
      return null;
    }
  },
}));
