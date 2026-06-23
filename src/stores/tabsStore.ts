import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Workspace sekmeleri — tarayıcı/IDE tarzı kalıcı sekme sistemi. Her sekme bir
 * route'a (href) karşılık gelir; tıklayınca o route'a gidilir. Sekmeler
 * sessionStorage'da tutulur (sayfa yenilemede kapanmaz); href slug'ı içerdiği
 * için şirket bazlı doğal olarak ayrışır.
 */

export interface WorkspaceTab {
  /** Benzersiz kimlik = href (route bazlı tekilleştirme). */
  id: string;
  href: string;
  title: string;
  /** Sekme ikonu yerine gösterilecek görsel (ör. ürün görseli). */
  image?: string | null;
}

interface TabsState {
  tabs: WorkspaceTab[];
  activeId: string | null;

  /** Sekme aç/aktive et. Aynı href varsa tekrar açmaz, sadece aktive eder. */
  openTab: (tab: WorkspaceTab, opts?: { activate?: boolean }) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  /** Var olan sekmenin başlık/görselini güncelle (sayfa yüklenince). */
  updateTab: (id: string, patch: Partial<Pick<WorkspaceTab, 'title' | 'image'>>) => void;
  /** Sürükle-bırak ile yeniden sırala: fromId, toId'nin bulunduğu konuma taşınır. */
  reorderTabs: (fromId: string, toId: string) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
  tabs: [],
  activeId: null,

  openTab: (tab, opts) => {
    const activate = opts?.activate ?? true;
    const { tabs } = get();
    const existing = tabs.find((t) => t.id === tab.id);
    if (existing) {
      // Başlık güncellenmiş olabilir.
      set({
        tabs: tabs.map((t) => (t.id === tab.id ? { ...t, title: tab.title } : t)),
        ...(activate ? { activeId: tab.id } : {}),
      });
      return;
    }
    set({
      tabs: [...tabs, tab],
      ...(activate || get().activeId === null ? { activeId: tab.id } : {}),
    });
  },

  closeTab: (id) => {
    const { tabs, activeId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const next = tabs.filter((t) => t.id !== id);
    let nextActive = activeId;
    if (activeId === id) {
      // Komşu sekmeye geç (önce sağ, yoksa sol).
      const neighbor = next[idx] ?? next[idx - 1] ?? null;
      nextActive = neighbor?.id ?? null;
    }
    set({
      tabs: next,
      activeId: nextActive,
    });
  },

  setActive: (id) => set({ activeId: id }),

  updateTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  reorderTabs: (fromId, toId) =>
    set((s) => {
      if (fromId === toId) return {};
      const from = s.tabs.findIndex((t) => t.id === fromId);
      const to = s.tabs.findIndex((t) => t.id === toId);
      if (from === -1 || to === -1) return {};
      const next = [...s.tabs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { tabs: next };
    }),
    }),
    {
      // Sekmeler sayfa yenilemede kapanmasın — bu tarayıcı sekmesi için kalıcı.
      name: 'balina-workspace-tabs',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ tabs: s.tabs, activeId: s.activeId }),
    },
  ),
);
