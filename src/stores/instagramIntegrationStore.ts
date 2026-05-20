'use client';

import { create } from 'zustand';
import { api } from '@/services/api';

// ============================================================================
// Types — backend spec 00-backend-spec/SPEC.md ile uyumlu
// ============================================================================

export interface InstagramConfig {
  accountId: string | null;
  username: string | null;
  connected: boolean;
  connectedAt: string | null;
  chatbotActive: boolean;
  sysPromptOverride: string | null;
  adminInstagramId: string | null;
  iban: string | null;
  accountName: string | null;
  dhlCode: string | null;
  defaultModel: string;
}

export interface InstagramAuthStartResponse {
  authorizeUrl: string;
  state: string;
}

export interface InstagramAuthStatus {
  status: 'pending' | 'completed' | 'failed';
  instagram: { accountId: string; username: string } | null;
  error: string | null;
}

export type InstagramConfigPatch = Partial<{
  chatbotActive: boolean;
  sysPromptOverride: string | null;
  adminInstagramId: string;
  iban: string;
  accountName: string;
  dhlCode: string;
  defaultModel: string;
}>;

interface InstagramIntegrationState {
  /** Store ID → config cache */
  configs: Record<string, InstagramConfig>;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  fetchConfig: (
    companyId: string,
    storeId: string,
  ) => Promise<InstagramConfig | null>;
  updateConfig: (
    companyId: string,
    storeId: string,
    patch: InstagramConfigPatch,
  ) => Promise<InstagramConfig | null>;
  startOAuth: (
    companyId: string,
    storeId: string,
    redirectUri: string,
  ) => Promise<InstagramAuthStartResponse | null>;
  getAuthStatus: (
    companyId: string,
    storeId: string,
    state: string,
  ) => Promise<InstagramAuthStatus | null>;
  disconnect: (companyId: string, storeId: string) => Promise<boolean>;
  testConnection: (
    companyId: string,
    storeId: string,
  ) => Promise<{ ok: boolean; account?: { id: string; username: string } } | null>;
}

function extractError(err: unknown): string {
  const e = err as {
    response?: {
      data?: {
        message?: string | string[];
        error?: { message?: string };
      };
    };
  };
  const m = e.response?.data?.message;
  if (Array.isArray(m)) return m[0] ?? 'İşlem başarısız';
  return m ?? e.response?.data?.error?.message ?? 'İşlem başarısız';
}

export const useInstagramIntegrationStore = create<InstagramIntegrationState>(
  (set) => ({
    configs: {},
    isLoading: false,
    isMutating: false,
    error: null,

    fetchConfig: async (companyId, storeId) => {
      set({ isLoading: true, error: null });
      try {
        const res = await api.get<InstagramConfig>(
          `/company/${companyId}/stores/${storeId}/instagram`,
        );
        set((s) => ({
          configs: { ...s.configs, [storeId]: res.data },
          isLoading: false,
        }));
        return res.data;
      } catch (err) {
        // 404 = bağlı değil — boş config döndür, hata olarak gösterme
        const e = err as { response?: { status?: number } };
        if (e.response?.status === 404) {
          set({ isLoading: false });
          return null;
        }
        set({ error: extractError(err), isLoading: false });
        return null;
      }
    },

    updateConfig: async (companyId, storeId, patch) => {
      set({ isMutating: true, error: null });
      try {
        const res = await api.put<InstagramConfig>(
          `/company/${companyId}/stores/${storeId}/instagram`,
          patch,
        );
        set((s) => ({
          configs: { ...s.configs, [storeId]: res.data },
          isMutating: false,
        }));
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    startOAuth: async (companyId, storeId, redirectUri) => {
      set({ isMutating: true, error: null });
      try {
        const res = await api.post<InstagramAuthStartResponse>(
          `/company/${companyId}/stores/${storeId}/instagram/auth/start`,
          { redirectUri },
        );
        set({ isMutating: false });
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    getAuthStatus: async (companyId, storeId, state) => {
      try {
        const res = await api.get<InstagramAuthStatus>(
          `/company/${companyId}/stores/${storeId}/instagram/auth/status/${state}`,
        );
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },

    disconnect: async (companyId, storeId) => {
      set({ isMutating: true });
      try {
        await api.delete(`/company/${companyId}/stores/${storeId}/instagram`);
        set((s) => {
          const copy = { ...s.configs };
          delete copy[storeId];
          return { configs: copy, isMutating: false };
        });
        return true;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return false;
      }
    },

    testConnection: async (companyId, storeId) => {
      try {
        const res = await api.post<{
          ok: boolean;
          account?: { id: string; username: string };
        }>(`/company/${companyId}/stores/${storeId}/instagram/test-connection`);
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },
  }),
);
