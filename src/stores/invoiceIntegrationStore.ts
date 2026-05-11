import { create } from 'zustand';
import { api } from '@/services/api';

// E-Fatura sağlayıcıları — backend `Provider` enum'una paralel.
export type InvoiceProvider = 'BIZIMHESAP' | 'PARASUT';

export interface BizimhesapIntegration {
  id: string;
  provider: 'BIZIMHESAP';
  name: string;
  firmId: string;
  /** Yalnızca son 4 hane geri döner — credential plaintext olarak istemciye verilmiyor. */
  apiKeyTail?: string | null;
  tokenTail?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParasutIntegration {
  id: string;
  provider: 'PARASUT';
  name: string;
  /** Paraşüt'ün kendi company id'si — fatura path'inde kullanılır. */
  parasutCompanyId: string;
  username: string;
  clientIdTail?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceIntegration = BizimhesapIntegration | ParasutIntegration;

export interface InvoiceTestResult {
  ok: boolean;
  error?: string;
}

export interface CreateBizimhesapDto {
  name?: string;
  apiKey?: string;
  token: string;
  firmId: string;
}

export interface UpdateBizimhesapDto {
  name?: string;
  apiKey?: string;
  token?: string;
  firmId?: string;
  isActive?: boolean;
}

export interface CreateParasutDto {
  name?: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  parasutCompanyId: string;
}

export interface UpdateParasutDto {
  name?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  parasutCompanyId?: string;
  isActive?: boolean;
}

interface InvoiceState {
  bizimhesaps: BizimhesapIntegration[];
  parasuts: ParasutIntegration[];
  isLoading: boolean;
  isSaving: boolean;

  fetchInvoiceIntegrations: (companyId: string) => Promise<void>;

  createBizimhesap: (
    companyId: string,
    args: CreateBizimhesapDto
  ) => Promise<BizimhesapIntegration | null>;
  updateBizimhesap: (
    companyId: string,
    integrationId: string,
    args: UpdateBizimhesapDto
  ) => Promise<BizimhesapIntegration | null>;
  removeBizimhesap: (companyId: string, integrationId: string) => Promise<void>;
  testBizimhesapCredentials: (
    companyId: string,
    args: CreateBizimhesapDto
  ) => Promise<InvoiceTestResult>;
  testBizimhesapIntegration: (
    companyId: string,
    integrationId: string
  ) => Promise<InvoiceTestResult>;

  createParasut: (
    companyId: string,
    args: CreateParasutDto
  ) => Promise<ParasutIntegration | null>;
  updateParasut: (
    companyId: string,
    integrationId: string,
    args: UpdateParasutDto
  ) => Promise<ParasutIntegration | null>;
  removeParasut: (companyId: string, integrationId: string) => Promise<void>;
  testParasutCredentials: (
    companyId: string,
    args: CreateParasutDto
  ) => Promise<InvoiceTestResult>;
  testParasutIntegration: (
    companyId: string,
    integrationId: string
  ) => Promise<InvoiceTestResult>;
}

const errorMessage = (err: unknown, fallback: string): string => {
  const apiMsg = (err as { response?: { data?: { message?: string | string[]; error?: string } } })
    ?.response?.data;
  const msg = apiMsg?.message ?? apiMsg?.error;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || (err instanceof Error ? err.message : fallback);
};

export const useInvoiceIntegrationStore = create<InvoiceState>((set) => ({
  bizimhesaps: [],
  parasuts: [],
  isLoading: false,
  isSaving: false,

  fetchInvoiceIntegrations: async (companyId) => {
    set({ isLoading: true });
    try {
      const [bh, ps] = await Promise.all([
        api
          .get<BizimhesapIntegration[]>(`/company/${companyId}/integrations/bizimhesap`)
          .then((r) => r.data ?? [])
          .catch(() => []),
        api
          .get<ParasutIntegration[]>(`/company/${companyId}/integrations/parasut`)
          .then((r) => r.data ?? [])
          .catch(() => []),
      ]);
      set({ bizimhesaps: bh, parasuts: ps, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createBizimhesap: async (companyId, args) => {
    set({ isSaving: true });
    try {
      const { data } = await api.post<BizimhesapIntegration>(
        `/company/${companyId}/integrations/bizimhesap`,
        args
      );
      set((state) => ({
        bizimhesaps: [...state.bizimhesaps, data],
        isSaving: false,
      }));
      return data;
    } catch {
      set({ isSaving: false });
      return null;
    }
  },

  updateBizimhesap: async (companyId, integrationId, args) => {
    set({ isSaving: true });
    try {
      const { data } = await api.patch<BizimhesapIntegration>(
        `/company/${companyId}/integrations/bizimhesap/${integrationId}`,
        args
      );
      set((state) => ({
        bizimhesaps: state.bizimhesaps.map((i) => (i.id === integrationId ? data : i)),
        isSaving: false,
      }));
      return data;
    } catch {
      set({ isSaving: false });
      return null;
    }
  },

  removeBizimhesap: async (companyId, integrationId) => {
    await api.delete(`/company/${companyId}/integrations/bizimhesap/${integrationId}`);
    set((state) => ({
      bizimhesaps: state.bizimhesaps.filter((i) => i.id !== integrationId),
    }));
  },

  testBizimhesapCredentials: async (companyId, args) => {
    try {
      const { data } = await api.post<InvoiceTestResult>(
        `/company/${companyId}/integrations/bizimhesap/test`,
        args
      );
      return data;
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Test başarısız') };
    }
  },

  testBizimhesapIntegration: async (companyId, integrationId) => {
    try {
      const { data } = await api.post<InvoiceTestResult>(
        `/company/${companyId}/integrations/bizimhesap/${integrationId}/test`
      );
      return data;
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Test başarısız') };
    }
  },

  createParasut: async (companyId, args) => {
    set({ isSaving: true });
    try {
      const { data } = await api.post<ParasutIntegration>(
        `/company/${companyId}/integrations/parasut`,
        args
      );
      set((state) => ({
        parasuts: [...state.parasuts, data],
        isSaving: false,
      }));
      return data;
    } catch {
      set({ isSaving: false });
      return null;
    }
  },

  updateParasut: async (companyId, integrationId, args) => {
    set({ isSaving: true });
    try {
      const { data } = await api.patch<ParasutIntegration>(
        `/company/${companyId}/integrations/parasut/${integrationId}`,
        args
      );
      set((state) => ({
        parasuts: state.parasuts.map((i) => (i.id === integrationId ? data : i)),
        isSaving: false,
      }));
      return data;
    } catch {
      set({ isSaving: false });
      return null;
    }
  },

  removeParasut: async (companyId, integrationId) => {
    await api.delete(`/company/${companyId}/integrations/parasut/${integrationId}`);
    set((state) => ({
      parasuts: state.parasuts.filter((i) => i.id !== integrationId),
    }));
  },

  testParasutCredentials: async (companyId, args) => {
    try {
      const { data } = await api.post<InvoiceTestResult>(
        `/company/${companyId}/integrations/parasut/test`,
        args
      );
      return data;
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Test başarısız') };
    }
  },

  testParasutIntegration: async (companyId, integrationId) => {
    try {
      const { data } = await api.post<InvoiceTestResult>(
        `/company/${companyId}/integrations/parasut/${integrationId}/test`
      );
      return data;
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Test başarısız') };
    }
  },
}));
