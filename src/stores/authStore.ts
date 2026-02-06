import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  storeLimit: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  plan?: Plan;
  currentCompanyId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ requiresVerification: boolean; email?: string }>;
  register: (email: string, name: string, password: string) => Promise<{ requiresVerification: boolean; email?: string }>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', {
            email,
            password,
            rememberMe,
          });

          // Check if verification is required
          if (response.data.requiresVerification) {
            set({ isLoading: false, error: null });
            return { requiresVerification: true, email: response.data.email };
          }

          const { user, accessToken, refreshToken } = response.data;
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { requiresVerification: false };
        } catch (error: any) {
          const message = error.response?.data?.message || 'Giriş başarısız';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      register: async (email, name, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', {
            email,
            name,
            password,
          });

          // Check if verification is required
          if (response.data.requiresVerification) {
            set({ isLoading: false, error: null });
            return { requiresVerification: true, email: response.data.email };
          }

          const { user, accessToken, refreshToken } = response.data;
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { requiresVerification: false };
        } catch (error: any) {
          const message = error.response?.data?.message || 'Kayıt başarısız';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } catch (error) {
          // Ignore logout errors
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { user, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          set({
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      checkAuth: async () => {
        const { accessToken, refreshTokens } = get();
        set({ isLoading: true });

        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // Try to refresh token
          const refreshed = await refreshTokens();
          if (!refreshed) {
            set({ isLoading: false });
          }
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.put('/auth/profile', data);
          set({
            user: response.data,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Profil güncellenemedi';
          set({ isLoading: false, error: message });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
