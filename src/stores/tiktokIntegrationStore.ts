'use client';

import { create } from 'zustand';
import { api } from '@/services/api';

// ============================================================================
// TikTok entegrasyonu — backend modules/tiktok ile uyumlu.
// Bağlantı durumu store tablosundaki tiktok_* alanlarından gelir.
// ============================================================================

export interface TiktokConfig {
  connected: boolean;
  openId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  scopes: string | null;
  connectedAt: string | null;
}

export interface TiktokAuthStartResponse {
  authorizeUrl: string;
  state: string;
  expiresAt?: string;
}

export interface TiktokAuthStatus {
  status: 'pending' | 'completed' | 'failed';
  tiktok: { openId: string; displayName: string | null; username?: string } | null;
  error: string | null;
}

interface TiktokIntegrationState {
  /** Store ID → config cache */
  configs: Record<string, TiktokConfig>;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  fetchConfig: (companyId: string, storeId: string) => Promise<TiktokConfig | null>;
  startOAuth: (
    companyId: string,
    storeId: string,
    redirectUri: string,
  ) => Promise<TiktokAuthStartResponse | null>;
  getAuthStatus: (
    companyId: string,
    storeId: string,
    state: string,
  ) => Promise<TiktokAuthStatus | null>;
  disconnect: (companyId: string, storeId: string) => Promise<boolean>;
}

function extractError(err: unknown): string {
  const e = err as {
    response?: {
      data?: { message?: string | string[]; error?: { message?: string } };
    };
  };
  const m = e.response?.data?.message;
  if (Array.isArray(m)) return m[0] ?? 'İşlem başarısız';
  return m ?? e.response?.data?.error?.message ?? 'İşlem başarısız';
}

export const useTiktokIntegrationStore = create<TiktokIntegrationState>((set) => ({
  configs: {},
  isLoading: false,
  isMutating: false,
  error: null,

  fetchConfig: async (companyId, storeId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<TiktokConfig>(
        `/company/${companyId}/stores/${storeId}/tiktok`,
      );
      set((s) => ({
        configs: { ...s.configs, [storeId]: res.data },
        isLoading: false,
      }));
      return res.data;
    } catch (err) {
      const e = err as { response?: { status?: number } };
      // 404/403 = bağlı değil veya erişim yok — sessizce boş geç.
      if (e.response?.status === 404 || e.response?.status === 403) {
        set({ isLoading: false });
        return null;
      }
      set({ error: extractError(err), isLoading: false });
      return null;
    }
  },

  startOAuth: async (companyId, storeId, redirectUri) => {
    set({ isMutating: true, error: null });
    try {
      const res = await api.post<TiktokAuthStartResponse>(
        `/company/${companyId}/stores/${storeId}/tiktok/auth/start`,
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
      const res = await api.get<TiktokAuthStatus>(
        `/company/${companyId}/stores/${storeId}/tiktok/auth/status/${state}`,
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
      await api.delete(`/company/${companyId}/stores/${storeId}/tiktok`);
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
}));
