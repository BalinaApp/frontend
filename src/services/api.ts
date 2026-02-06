import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

// Helper function to get tokens from Zustand persist storage
const getAuthTokens = (): { accessToken: string | null; refreshToken: string | null } => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return {
        accessToken: parsed?.state?.accessToken || null,
        refreshToken: parsed?.state?.refreshToken || null,
      };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return { accessToken: null, refreshToken: null };
};

// Helper function to update tokens in Zustand persist storage
const updateAuthTokens = (accessToken: string, refreshToken?: string) => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      parsed.state.accessToken = accessToken;
      if (refreshToken) {
        parsed.state.refreshToken = refreshToken;
      }
      localStorage.setItem('auth-storage', JSON.stringify(parsed));
    }
  } catch (e) {
    // Ignore errors
  }
};

// Helper function to clear tokens from Zustand persist storage
const clearAuthTokens = () => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      parsed.state.accessToken = null;
      parsed.state.refreshToken = null;
      localStorage.setItem('auth-storage', JSON.stringify(parsed));
    }
  } catch (e) {
    // Ignore errors
  }
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = getAuthTokens();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      const { refreshToken } = getAuthTokens();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          updateAuthTokens(accessToken, newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens - let AuthGuard handle redirect
          clearAuthTokens();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
