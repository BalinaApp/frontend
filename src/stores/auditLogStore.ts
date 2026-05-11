import { create } from 'zustand';
import { api } from '@/services/api';

export interface AuditLogUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuditLogCompany {
  id: string;
  name: string;
  slug: string;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  user: AuditLogUser | null;
  companyId: string | null;
  company: AuditLogCompany | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  success: boolean;
  errorMessage: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AuditLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLogState {
  items: AuditLogItem[];
  meta: AuditLogMeta;
  isLoading: boolean;
  error: string | null;

  fetchCompanyLogs: (
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
      append?: boolean;
      startDate?: Date | null;
      endDate?: Date | null;
    },
  ) => Promise<void>;
  reset: () => void;
}

const initialMeta: AuditLogMeta = { total: 0, page: 1, limit: 50, totalPages: 0 };

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  items: [],
  meta: initialMeta,
  isLoading: false,
  error: null,

  fetchCompanyLogs: async (companyId, options = {}) => {
    const {
      page = 1,
      limit = 50,
      append = false,
      startDate,
      endDate,
    } = options;
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (startDate) params.set('startDate', startDate.toISOString());
      if (endDate) params.set('endDate', endDate.toISOString());
      const response = await api.get(
        `/audit-logs/company/${companyId}?${params.toString()}`,
      );
      const data = response.data as { items: AuditLogItem[]; meta: AuditLogMeta };
      set({
        items: append ? [...get().items, ...data.items] : data.items,
        meta: data.meta,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Aktivite günlüğü yüklenemedi';
      set({ isLoading: false, error: message });
    }
  },

  reset: () => set({ items: [], meta: initialMeta, error: null }),
}));
