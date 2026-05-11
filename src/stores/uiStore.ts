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
}));
