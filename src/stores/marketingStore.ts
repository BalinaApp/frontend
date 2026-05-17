'use client';

import { create } from 'zustand';
import { api } from '@/services/api';

/** Backend `marketing_contacts` row + Decimal/Date string serileştirmesi. */
export interface MarketingContact {
  id: string;
  companyId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  source: 'order' | 'manual' | 'import' | string;
  storeIds: string[];
  orderCount: number;
  /** Prisma Decimal → string; UI Number ile parse eder. */
  totalSpent: string | number | null;
  lastOrderAt: string | null;
  isUnsubscribed: boolean;
  unsubscribedAt: string | null;
  tags: string[];
  status: 'active' | 'bounced' | 'complained' | string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingContactListResponse {
  contacts: MarketingContact[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketingContactQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'unsubscribed' | 'bounced' | 'complained';
  storeId?: string;
}

interface BackfillResult {
  ordersScanned: number;
  uniqueContacts: number;
  created: number;
  updated: number;
  durationMs: number;
}

interface MarketingState {
  contacts: MarketingContact[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isBackfilling: boolean;
  error: string | null;

  fetchContacts: (
    companyId: string,
    query?: MarketingContactQuery,
  ) => Promise<void>;
  createContact: (
    companyId: string,
    input: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      tags?: string[];
    },
  ) => Promise<MarketingContact | null>;
  updateContact: (
    companyId: string,
    contactId: string,
    patch: Partial<
      Pick<MarketingContact, 'firstName' | 'lastName' | 'phone' | 'tags'>
    >,
  ) => Promise<boolean>;
  deleteContact: (companyId: string, contactId: string) => Promise<boolean>;
  setUnsubscribed: (
    companyId: string,
    contactId: string,
    isUnsubscribed: boolean,
  ) => Promise<boolean>;
  backfillFromOrders: (companyId: string) => Promise<BackfillResult | null>;
  importCsv: (
    companyId: string,
    file: File,
  ) => Promise<{
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>;
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  contacts: [],
  total: 0,
  page: 1,
  totalPages: 0,
  isLoading: false,
  isBackfilling: false,
  error: null,

  fetchContacts: async (companyId, query = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));
      if (query.search) params.append('search', query.search);
      if (query.status && query.status !== 'all') {
        params.append('status', query.status);
      }
      if (query.storeId) params.append('storeId', query.storeId);
      const res = await api.get<MarketingContactListResponse>(
        `/company/${companyId}/marketing/contacts?${params.toString()}`,
      );
      set({
        contacts: res.data.contacts,
        total: res.data.total,
        page: res.data.page,
        totalPages: res.data.totalPages,
        isLoading: false,
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({
        error: e.response?.data?.message ?? 'Kontaklar yüklenemedi',
        isLoading: false,
      });
    }
  },

  createContact: async (companyId, input) => {
    try {
      const res = await api.post<MarketingContact>(
        `/company/${companyId}/marketing/contacts`,
        input,
      );
      // Listenin başına ekle.
      set((s) => ({
        contacts: [res.data, ...s.contacts],
        total: s.total + 1,
      }));
      return res.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({ error: e.response?.data?.message ?? 'Kontak eklenemedi' });
      return null;
    }
  },

  updateContact: async (companyId, contactId, patch) => {
    try {
      const res = await api.patch<MarketingContact>(
        `/company/${companyId}/marketing/contacts/${contactId}`,
        patch,
      );
      set((s) => ({
        contacts: s.contacts.map((c) => (c.id === contactId ? res.data : c)),
      }));
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({ error: e.response?.data?.message ?? 'Kontak güncellenemedi' });
      return false;
    }
  },

  deleteContact: async (companyId, contactId) => {
    try {
      await api.delete(`/company/${companyId}/marketing/contacts/${contactId}`);
      set((s) => ({
        contacts: s.contacts.filter((c) => c.id !== contactId),
        total: Math.max(0, s.total - 1),
      }));
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({ error: e.response?.data?.message ?? 'Kontak silinemedi' });
      return false;
    }
  },

  setUnsubscribed: async (companyId, contactId, isUnsubscribed) => {
    try {
      const res = await api.post<MarketingContact>(
        `/company/${companyId}/marketing/contacts/${contactId}/unsubscribe`,
        { isUnsubscribed },
      );
      set((s) => ({
        contacts: s.contacts.map((c) => (c.id === contactId ? res.data : c)),
      }));
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({ error: e.response?.data?.message ?? 'Abonelik güncellenemedi' });
      return false;
    }
  },

  importCsv: async (companyId, file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{
        totalRows: number;
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
      }>(`/company/${companyId}/marketing/contacts/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // İçeri aktarım sonrası listeyi yenile.
      const params = new URLSearchParams();
      params.append('limit', '1000');
      const list = await api.get<MarketingContactListResponse>(
        `/company/${companyId}/marketing/contacts?${params.toString()}`,
      );
      set({
        contacts: list.data.contacts,
        total: list.data.total,
        page: list.data.page,
        totalPages: list.data.totalPages,
      });
      return res.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({ error: e.response?.data?.message ?? 'CSV içe aktarılamadı' });
      return null;
    }
  },

  backfillFromOrders: async (companyId) => {
    set({ isBackfilling: true, error: null });
    try {
      const res = await api.post<BackfillResult>(
        `/company/${companyId}/marketing/contacts/backfill`,
      );
      set({ isBackfilling: false });
      // Listeyi yenile.
      await get().fetchContacts(companyId);
      return res.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({
        error: e.response?.data?.message ?? 'Geçmiş siparişler taranamadı',
        isBackfilling: false,
      });
      return null;
    }
  },
}));
