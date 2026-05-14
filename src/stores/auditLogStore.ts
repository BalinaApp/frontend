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

export type AuditOperation = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'OTHER';

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  user: AuditLogUser | null;
  companyId: string | null;
  company: AuditLogCompany | null;
  action: string;
  operation: AuditOperation | null;
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

// Backend `ListAuditLogDto` ile birebir — boş bırakılan alan query'ye eklenmez.
export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  operation?: AuditOperation;
  resource?: string;
  resourceId?: string;
  success?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface FetchOptions extends AuditLogFilters {
  /** true → mevcut items dizisine eklenir (load-more); false → replace. */
  append?: boolean;
}

interface AuditLogState {
  items: AuditLogItem[];
  meta: AuditLogMeta;
  isLoading: boolean;
  error: string | null;
  /** Backend forbidden döndüyse (OWNER/ADMIN dışı rol) UI ayrı mesaj gösterir. */
  forbidden: boolean;

  fetchCompanyLogs: (
    companyId: string,
    options?: FetchOptions,
  ) => Promise<void>;

  /** Tek bir kaynak için geçmişi getirir — `/audit-logs/resource/:r/:rid`. */
  fetchResourceLogs: (
    resource: string,
    resourceId: string,
    options?: Pick<AuditLogFilters, 'page' | 'limit'>,
  ) => Promise<AuditLogItem[]>;

  /** Oturum açmış kullanıcının kendi kayıtları. */
  fetchMyLogs: (options?: FetchOptions) => Promise<void>;

  reset: () => void;
}

const initialMeta: AuditLogMeta = { total: 0, page: 1, limit: 50, totalPages: 0 };

const buildQuery = (
  options: FetchOptions,
  defaults: { page: number; limit: number },
): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? defaults.page));
  params.set('limit', String(options.limit ?? defaults.limit));
  if (options.userId?.trim()) params.set('userId', options.userId.trim());
  if (options.action?.trim()) params.set('action', options.action.trim());
  if (options.operation) params.set('operation', options.operation);
  if (options.resource?.trim()) params.set('resource', options.resource.trim());
  if (options.resourceId?.trim())
    params.set('resourceId', options.resourceId.trim());
  if (typeof options.success === 'boolean')
    params.set('success', String(options.success));
  if (options.startDate)
    params.set('startDate', options.startDate.toISOString());
  if (options.endDate) params.set('endDate', options.endDate.toISOString());
  return params;
};

const extractApiError = (err: unknown): { status?: number; message: string } => {
  const e = err as {
    response?: { status?: number; data?: { message?: string | string[] } };
    message?: string;
  };
  const raw = e.response?.data?.message;
  const message = Array.isArray(raw)
    ? raw.join(', ')
    : raw || e.message || 'Aktivite günlüğü yüklenemedi';
  return { status: e.response?.status, message };
};

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  items: [],
  meta: initialMeta,
  isLoading: false,
  error: null,
  forbidden: false,

  fetchCompanyLogs: async (companyId, options = {}) => {
    set({ isLoading: true, error: null, forbidden: false });
    try {
      const params = buildQuery(options, { page: 1, limit: 50 });
      const response = await api.get(
        `/audit-logs/company/${companyId}?${params.toString()}`,
      );
      const data = response.data as { items: AuditLogItem[]; meta: AuditLogMeta };
      set({
        items: options.append ? [...get().items, ...data.items] : data.items,
        meta: data.meta,
        isLoading: false,
      });
    } catch (err: unknown) {
      const { status, message } = extractApiError(err);
      // 403 backend OWNER/ADMIN şartını ihlal ettiğimizi söylüyor — UI bunu
      // ayrı bir banner ile gösterir, generic error gösterimine düşmesin.
      set({
        isLoading: false,
        error: status === 403 ? null : message,
        forbidden: status === 403,
      });
    }
  },

  fetchResourceLogs: async (resource, resourceId, options = {}) => {
    try {
      const params = buildQuery(options, { page: 1, limit: 20 });
      const response = await api.get(
        `/audit-logs/resource/${encodeURIComponent(
          resource,
        )}/${encodeURIComponent(resourceId)}?${params.toString()}`,
      );
      const data = response.data as { items: AuditLogItem[]; meta: AuditLogMeta };
      return data.items ?? [];
    } catch {
      return [];
    }
  },

  fetchMyLogs: async (options = {}) => {
    set({ isLoading: true, error: null, forbidden: false });
    try {
      const params = buildQuery(options, { page: 1, limit: 50 });
      const response = await api.get(`/audit-logs/me?${params.toString()}`);
      const data = response.data as { items: AuditLogItem[]; meta: AuditLogMeta };
      set({
        items: options.append ? [...get().items, ...data.items] : data.items,
        meta: data.meta,
        isLoading: false,
      });
    } catch (err: unknown) {
      const { message } = extractApiError(err);
      set({ isLoading: false, error: message });
    }
  },

  reset: () =>
    set({ items: [], meta: initialMeta, error: null, forbidden: false }),
}));
