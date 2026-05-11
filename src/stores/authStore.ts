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
  themeMode?: 'light' | 'dark';
  themeAccent?: string | null;
  googleConnected?: boolean;
}

interface VerifyResult {
  requiresProfile: boolean;
  user: User;
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
  requestCode: (email: string) => Promise<void>;
  verifyCode: (
    email: string,
    code: string,
    rememberMe?: boolean
  ) => Promise<VerifyResult>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<boolean>;
  disconnectGoogle: () => Promise<void>;
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
        set({ user, isAuthenticated: !!user, isLoading: false }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      requestCode: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/request-code', { email });
          set({ isLoading: false });
        } catch (error: any) {
          const message =
            error.response?.data?.message || 'Kod gönderilemedi';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      verifyCode: async (email, code, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/verify-code', {
            email,
            code,
            rememberMe,
          });
          const { user, accessToken, refreshToken, requiresProfile } =
            response.data;
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { requiresProfile: !!requiresProfile, user };
        } catch (error: any) {
          const message =
            error.response?.data?.message || 'Doğrulama başarısız';
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
        } catch {
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
          const {
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          } = response.data;
          set({
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
          });
          return true;
        } catch {
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
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
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
          set({ user: response.data, isLoading: false, error: null });
          return true;
        } catch (error: any) {
          const message =
            error.response?.data?.message || 'Profil güncellenemedi';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      disconnectGoogle: async () => {
        try {
          await api.delete('/auth/google');
          const { user } = get();
          if (user) set({ user: { ...user, googleConnected: false } });
        } catch (error: any) {
          const message =
            error.response?.data?.message ||
            'Google bağlantısı kaldırılamadı';
          throw new Error(message);
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
