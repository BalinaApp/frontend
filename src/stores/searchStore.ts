import { create } from 'zustand';
import { api } from '@/services/api';

/**
 * Global komut-paleti araması — şirket kapsamında ürün/sipariş/mağaza/kampanya.
 * Kişi (contact) araması YOK. "Son kullanılanlar" localStorage'da şirket bazlı
 * tutulur (backend'e gerek yok; kullanıcının açtığı sonuçların kısa geçmişi).
 */

export type SearchEntityType = 'product' | 'order' | 'store' | 'campaign';

export interface SearchResults {
  products: { id: string; name: string; sku: string | null; imageUrl: string | null }[];
  orders: { id: string; orderNumber: string; customerName: string | null; status: string }[];
  stores: { id: string; name: string; platform: string }[];
  campaigns: { id: string; name: string; status: string }[];
}

export interface RecentSearchItem {
  /** `${type}:${id}` — tekilleştirme anahtarı. */
  key: string;
  type: SearchEntityType;
  title: string;
}

const EMPTY: SearchResults = { products: [], orders: [], stores: [], campaigns: [] };
const RECENT_MAX = 6;
const recentStorageKey = (companyId: string) => `balina-search-recent-${companyId}`;

function readRecent(companyId: string): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(recentStorageKey(companyId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentSearchItem[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(companyId: string, items: RecentSearchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(recentStorageKey(companyId), JSON.stringify(items));
  } catch {
    /* kota / private mode — sessizce yut */
  }
}

interface SearchState {
  results: SearchResults;
  isLoading: boolean;
  recent: RecentSearchItem[];

  /** Backend'de ara. Boş sorgu sonuçları temizler (istek atmaz). */
  search: (companyId: string, query: string) => Promise<void>;
  /** Sonuçları temizle (modal kapanınca / sorgu boşalınca). */
  clearResults: () => void;
  /** localStorage'dan son kullanılanları yükle. */
  loadRecent: (companyId: string) => void;
  /** Açılan sonucu son kullanılanların başına ekle (tekilleştirip kırp). */
  addRecent: (companyId: string, item: RecentSearchItem) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  results: EMPTY,
  isLoading: false,
  recent: [],

  search: async (companyId, query) => {
    const q = query.trim();
    if (!q) {
      set({ results: EMPTY, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { data } = await api.get<SearchResults>(
        `/company/${companyId}/search`,
        { params: { q } },
      );
      set({ results: data ?? EMPTY, isLoading: false });
    } catch {
      set({ results: EMPTY, isLoading: false });
    }
  },

  clearResults: () => set({ results: EMPTY, isLoading: false }),

  loadRecent: (companyId) => set({ recent: readRecent(companyId) }),

  addRecent: (companyId, item) => {
    const next = [item, ...get().recent.filter((r) => r.key !== item.key)].slice(
      0,
      RECENT_MAX,
    );
    writeRecent(companyId, next);
    set({ recent: next });
  },
}));
