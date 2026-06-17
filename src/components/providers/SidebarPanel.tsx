'use client';

import * as React from 'react';

/**
 * Sol ana sidebar'ın "ikincil kayan panel" slotu — settings/marketing menüsü
 * gibi nav'ı sola kaydırıp yerine sayfaya özel bir panel gösterir. Ama içerik
 * route'tan türetilmez; sayfa `setSidebarPanel(<Palet />, { onBack })` ile
 * canlı bir node push eder (kapanışlar güncel state'i yakalar). Kampanya
 * editöründe blok paletini ana sidebar'da açmak için kullanılır.
 *
 * Tipik kullanım — sayfa içinde:
 *
 *   const { setSidebarPanel } = useSidebarPanel();
 *   useEffect(() => {
 *     setSidebarPanel(<EmailLeftRail … />, {
 *       backLabel: 'Kampanyalar',
 *       onBack: () => router.push(`/${slug}/marketing/campaigns`),
 *     });
 *     return () => setSidebarPanel(null);
 *   }, [blocks, selectedId]);
 */

export interface SidebarPanelOptions {
  backLabel?: string;
  onBack?: () => void;
}

type SidebarPanelState = {
  panel: React.ReactNode | null;
  options: SidebarPanelOptions;
};

type SidebarPanelContextValue = SidebarPanelState & {
  setSidebarPanel: (
    node: React.ReactNode | null,
    options?: SidebarPanelOptions,
  ) => void;
};

const SidebarPanelContext =
  React.createContext<SidebarPanelContextValue | null>(null);

export function SidebarPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<SidebarPanelState>({
    panel: null,
    options: {},
  });
  // Stable setter — sayfanın useEffect deps'inde infinite loop tetiklemesin.
  const setSidebarPanel = React.useCallback(
    (node: React.ReactNode | null, options: SidebarPanelOptions = {}) => {
      setState({ panel: node, options });
    },
    [],
  );
  const value = React.useMemo(
    () => ({ ...state, setSidebarPanel }),
    [state, setSidebarPanel],
  );
  return (
    <SidebarPanelContext.Provider value={value}>
      {children}
    </SidebarPanelContext.Provider>
  );
}

/** AppSidebar'ın ikincil slot'a render etmesi için panel + geri seçeneklerini okur. */
export function useSidebarPanelContent(): SidebarPanelState {
  const ctx = React.useContext(SidebarPanelContext);
  return ctx ? { panel: ctx.panel, options: ctx.options } : { panel: null, options: {} };
}

/** Sayfaların sidebar paneli yazması için setter sağlar. */
export function useSidebarPanel(): {
  setSidebarPanel: (
    node: React.ReactNode | null,
    options?: SidebarPanelOptions,
  ) => void;
} {
  const ctx = React.useContext(SidebarPanelContext);
  if (!ctx) {
    return { setSidebarPanel: () => undefined };
  }
  return { setSidebarPanel: ctx.setSidebarPanel };
}
