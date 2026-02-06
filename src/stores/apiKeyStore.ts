import { create } from 'zustand';
import { api } from '@/services/api';

export interface ApiKeyPermissions {
  read: boolean;
  write: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: ApiKeyPermissions;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key - only shown once
  warning: string;
}

export interface ApiUsageStats {
  totalRequests: number;
  statusDistribution: Array<{ statusCode: number; count: number }>;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    count: number;
    avgResponseTime: number;
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
    avg_response_time: number;
  }>;
}

interface ApiKeyState {
  // State
  apiKeys: ApiKey[];
  selectedKey: ApiKey | null;
  usageStats: ApiUsageStats | null;
  newKeySecret: string | null; // Temporarily store new key
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  // Actions
  fetchApiKeys: () => Promise<void>;
  createApiKey: (
    name: string,
    permissions?: ApiKeyPermissions,
    expiresAt?: string
  ) => Promise<ApiKeyWithSecret | null>;
  deleteApiKey: (id: string) => Promise<boolean>;
  revokeApiKey: (id: string) => Promise<boolean>;
  rotateApiKey: (id: string) => Promise<ApiKeyWithSecret | null>;
  fetchUsageStats: (id: string, days?: number) => Promise<void>;
  clearNewKeySecret: () => void;
  reset: () => void;
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  // Initial state
  apiKeys: [],
  selectedKey: null,
  usageStats: null,
  newKeySecret: null,
  isLoading: false,
  isCreating: false,
  error: null,

  // Fetch all API keys
  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/settings/api-keys');
      set({ apiKeys: response.data.items, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'API anahtarları yüklenemedi';
      set({ error: message, isLoading: false });
    }
  },

  // Create a new API key
  createApiKey: async (name, permissions, expiresAt) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.post('/settings/api-keys', {
        name,
        permissions: permissions || { read: true, write: false },
        expiresAt,
      });

      const newKey = response.data as ApiKeyWithSecret;

      // Store the secret temporarily
      set({ newKeySecret: newKey.key, isCreating: false });

      // Refresh the list
      await get().fetchApiKeys();

      return newKey;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'API anahtarı oluşturulamadı';
      set({ error: message, isCreating: false });
      return null;
    }
  },

  // Delete an API key
  deleteApiKey: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/settings/api-keys/${id}`);
      // Remove from list
      set((state) => ({
        apiKeys: state.apiKeys.filter((key) => key.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'API anahtarı silinemedi';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Revoke (deactivate) an API key
  revokeApiKey: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/settings/api-keys/${id}/revoke`);
      // Update in list
      set((state) => ({
        apiKeys: state.apiKeys.map((key) =>
          key.id === id ? { ...key, isActive: false } : key
        ),
        isLoading: false,
      }));
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'API anahtarı iptal edilemedi';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Rotate (regenerate) an API key
  rotateApiKey: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/settings/api-keys/${id}/rotate`);
      const rotatedKey = response.data as ApiKeyWithSecret;

      // Store the new secret temporarily
      set({ newKeySecret: rotatedKey.key, isLoading: false });

      // Refresh the list
      await get().fetchApiKeys();

      return rotatedKey;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'API anahtarı yenilenemedi';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Fetch usage statistics for an API key
  fetchUsageStats: async (id, days = 30) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(
        `/settings/api-keys/${id}/usage?days=${days}`
      );
      set({ usageStats: response.data, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Kullanım istatistikleri yüklenemedi';
      set({ error: message, isLoading: false });
    }
  },

  // Clear the temporarily stored new key secret
  clearNewKeySecret: () => {
    set({ newKeySecret: null });
  },

  // Reset store
  reset: () => {
    set({
      apiKeys: [],
      selectedKey: null,
      usageStats: null,
      newKeySecret: null,
      isLoading: false,
      isCreating: false,
      error: null,
    });
  },
}));
