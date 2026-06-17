import { create } from 'zustand';

interface UIState {
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // AI chat drawer (sağdan açılan panel) — global olarak her sayfadan tetiklenir.
  isAiDrawerOpen: boolean;
  setAiDrawerOpen: (open: boolean) => void;
  toggleAiDrawer: () => void;
  // Drawer "büyütülmüş" mü — true ise main content'i kaplayacak kadar genişler.
  isAiDrawerExpanded: boolean;
  setAiDrawerExpanded: (expanded: boolean) => void;
  toggleAiDrawerExpanded: () => void;

  // balinaOS AI paneli (sidebar AI butonundan sağda açılan BalinaChat paneli).
  isBalinaAiOpen: boolean;
  setBalinaAiOpen: (open: boolean) => void;
  toggleBalinaAi: () => void;
  // AI paneli "yüzen" mod — sayfa üzerinde serbest sürüklenebilir pencere.
  isBalinaAiFloating: boolean;
  setBalinaAiFloating: (floating: boolean) => void;
  toggleBalinaAiFloating: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),

  isAiDrawerOpen: false,
  setAiDrawerOpen: (open) =>
    set((s) => ({
      isAiDrawerOpen: open,
      // Kapanırken expand state'i de sıfırlansın — bir sonraki açılışta normal boyutta.
      isAiDrawerExpanded: open ? s.isAiDrawerExpanded : false,
    })),
  toggleAiDrawer: () => set((s) => ({ isAiDrawerOpen: !s.isAiDrawerOpen })),
  isAiDrawerExpanded: false,
  setAiDrawerExpanded: (expanded) => set({ isAiDrawerExpanded: expanded }),
  toggleAiDrawerExpanded: () =>
    set((s) => ({ isAiDrawerExpanded: !s.isAiDrawerExpanded })),

  isBalinaAiOpen: false,
  setBalinaAiOpen: (open) => set({ isBalinaAiOpen: open }),
  toggleBalinaAi: () => set((s) => ({ isBalinaAiOpen: !s.isBalinaAiOpen })),
  isBalinaAiFloating: false,
  setBalinaAiFloating: (floating) => set({ isBalinaAiFloating: floating }),
  toggleBalinaAiFloating: () => set((s) => ({ isBalinaAiFloating: !s.isBalinaAiFloating })),
}));
