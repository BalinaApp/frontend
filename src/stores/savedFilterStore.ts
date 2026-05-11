import { create } from 'zustand';
import { api } from '@/services/api';
import type { FilterPayload } from '@/components/products/filter-types';

/**
 * Kullanıcının kaydettiği filtre setleri — backend'de `saved_filters` tablosu.
 * Şirket bazlı (companyId) ve sayfa bazlı (`context`, örn. "products") bölümlenir.
 *
 * Cache: ilk fetch'te liste set edilir; CRUD action'ları optimistic değil —
 * backend response'u state'i güncelleyen tek kaynak (basit ve doğru).
 */
export interface SavedFilter {
  id: string;
  context: string;
  name: string;
  payload: FilterPayload;
  createdAt: string;
  updatedAt: string;
}

interface SavedFilterState {
  filters: SavedFilter[];
  isLoading: boolean;
  error: string | null;

  /** Şirket + context için sunucudan listele. Tekrar çağrı cache'i tazeler. */
  fetch: (companyId: string, context: string) => Promise<void>;
  /** Cache'ten filtre listesi (UI render için senkron erişim). */
  list: (context: string) => SavedFilter[];

  create: (
    companyId: string,
    context: string,
    name: string,
    payload: FilterPayload
  ) => Promise<SavedFilter | null>;

  update: (
    companyId: string,
    id: string,
    patch: Partial<Pick<SavedFilter, 'name' | 'payload'>>
  ) => Promise<SavedFilter | null>;

  remove: (companyId: string, id: string) => Promise<boolean>;
}

function asString(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message || e.message || fallback;
}

export const useSavedFilterStore = create<SavedFilterState>((set, get) => ({
  filters: [],
  isLoading: false,
  error: null,

  fetch: async (companyId, context) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<SavedFilter[]>(
        `/company/${companyId}/saved-filters?context=${encodeURIComponent(context)}`
      );
      // Mevcut listede aynı context'teki kayıtları yenile, diğer context'leri koru.
      const others = get().filters.filter((f) => f.context !== context);
      set({ filters: [...others, ...data], isLoading: false });
    } catch (err) {
      set({ error: asString(err, 'Filtreler yüklenemedi'), isLoading: false });
    }
  },

  list: (context) => get().filters.filter((f) => f.context === context),

  create: async (companyId, context, name, payload) => {
    try {
      const { data } = await api.post<SavedFilter>(
        `/company/${companyId}/saved-filters`,
        { context, name, payload }
      );
      set({ filters: [...get().filters, data] });
      return data;
    } catch (err) {
      set({ error: asString(err, 'Filtre kaydedilemedi') });
      return null;
    }
  },

  update: async (companyId, id, patch) => {
    try {
      const { data } = await api.patch<SavedFilter>(
        `/company/${companyId}/saved-filters/${id}`,
        patch
      );
      set({
        filters: get().filters.map((f) => (f.id === id ? data : f)),
      });
      return data;
    } catch (err) {
      set({ error: asString(err, 'Filtre güncellenemedi') });
      return null;
    }
  },

  remove: async (companyId, id) => {
    try {
      await api.delete(`/company/${companyId}/saved-filters/${id}`);
      set({ filters: get().filters.filter((f) => f.id !== id) });
      return true;
    } catch (err) {
      set({ error: asString(err, 'Filtre silinemedi') });
      return false;
    }
  },
}));
