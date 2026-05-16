'use client';

import * as React from 'react';

/**
 * Dashboard genelinde "sağ kenar paneli" slotu — Linear'in "agent" paneli
 * gibi, ana content card'ın yanında sibling olarak render edilen panel.
 *
 * Page tarafından `setSidePanel(<Panel />)` çağrılır; layout context
 * üzerinden okuyup translucent white card içinde render eder. `null` ile
 * çağrılırsa panel kaybolur.
 *
 * Tipik kullanım — sayfa içinde:
 *
 *   const { setSidePanel } = useSidePanel();
 *   useEffect(() => {
 *     setSidePanel(selected ? <DetailPanel … /> : null);
 *     return () => setSidePanel(null);
 *   }, [selected]);
 */
type SidePanelContextValue = {
  panel: React.ReactNode | null;
  setSidePanel: (node: React.ReactNode | null) => void;
};

const SidePanelContext = React.createContext<SidePanelContextValue | null>(
  null,
);

export function SidePanelProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = React.useState<React.ReactNode | null>(null);
  // Stable setter — sayfanın useEffect deps'inde infinite loop tetiklemesin.
  const setSidePanel = React.useCallback((node: React.ReactNode | null) => {
    setPanel(node);
  }, []);
  const value = React.useMemo(
    () => ({ panel, setSidePanel }),
    [panel, setSidePanel],
  );
  return (
    <SidePanelContext.Provider value={value}>
      {children}
    </SidePanelContext.Provider>
  );
}

/** Layout'un slot'a render etmesi için panel içeriğini okur. */
export function useSidePanelContent(): React.ReactNode | null {
  const ctx = React.useContext(SidePanelContext);
  return ctx?.panel ?? null;
}

/** Sayfaların panel içeriği yazması için setter sağlar. */
export function useSidePanel(): {
  setSidePanel: (node: React.ReactNode | null) => void;
} {
  const ctx = React.useContext(SidePanelContext);
  if (!ctx) {
    // Provider'sız ortamda no-op — page hot-reload'da context kaybolsa bile
    // crash etmesin.
    return { setSidePanel: () => undefined };
  }
  return { setSidePanel: ctx.setSidePanel };
}
