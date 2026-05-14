'use client';

import { useEffect } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { usePricingStore } from '@/stores/pricingStore';
import { UsageWarning } from '@/components/pricing/usage-warning';
import { AiChatDrawer } from '@/components/ai/ai-chat-drawer';
import { AiChatFab } from '@/components/ai/ai-chat-fab';
import { useUIStore } from '@/stores/uiStore';
import { useAiStore } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';

// Bottom strip yüksekliği — AI launcher + history button satırı.
const BOTTOM_STRIP_HEIGHT = 56;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { usage, fetchUsage, fetchPricingStatus } = usePricingStore();
  const isAiDrawerExpanded = useUIStore((s) => s.isAiDrawerExpanded);

  // Fal veya Fashn aktif mi? Layout'tan fetch ediyoruz — bottom strip ve drawer
  // bu listeye göre render edilir, panel mount'una bağlı değil.
  const currentCompanyId = useCompanyStore((s) => s.currentCompany?.id);
  const integrations = useAiStore((s) => s.integrations);
  const fetchIntegrations = useAiStore((s) => s.fetchIntegrations);
  const hasActiveAi = integrations.some((i) => i.isActive);
  const stripHeight = hasActiveAi ? BOTTOM_STRIP_HEIGHT : 0;

  useEffect(() => {
    fetchUsage();
    fetchPricingStatus();
  }, [fetchUsage, fetchPricingStatus]);

  useEffect(() => {
    if (currentCompanyId) fetchIntegrations(currentCompanyId);
  }, [currentCompanyId, fetchIntegrations]);

  return (
    <div className="bg-page flex h-screen w-full">
      {/* Sidebar fixed; spacer flex layout'ta yer kapatır */}
      <AppSidebar />
      <main className="flex h-screen min-w-0 flex-1 flex-col p-1 pl-0">
        {/* Wrapper — drawer'ın absolute pozisyon referansı.
            FAL aktifken: explicit height = 100vh - strip (drawer inset hesabı
            buna bağlı, dokunma).
            FAL pasifken: flex-1 — main'in p-1 padding'ini bozmadan doğal
            şekilde kalan alanı doldurur (üst/sağ/alt padding görünür). */}
        <div
          className="relative flex flex-col"
          style={
            hasActiveAi
              ? { height: `calc(100vh - ${stripHeight}px)` }
              : { flex: '1 1 0%', minHeight: 0 }
          }
        >
          {/* Content card — scale BURAYA uygulanır.
              Drawer kardeş olduğu için scale'den etkilenmez. */}
          <div
            className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white/[0.56] shadow-[0_0_8px_-2px_rgba(0,0,0,0.04)]"
            style={{
              transform: isAiDrawerExpanded ? 'scale(0.98)' : 'scale(1)',
              transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
              transformOrigin: 'center',
            }}
          >
            {usage && (usage.isNearLimit || usage.isAtLimit) && (
              <UsageWarning
                storeCount={usage.storeCount}
                storeLimit={usage.storeLimit}
                isAtLimit={usage.isAtLimit}
                isNearLimit={usage.isNearLimit}
              />
            )}
            <div className="scrollbar-none flex flex-1 flex-col overflow-auto">
              {children}
            </div>
          </div>
          {/* Drawer — wrapper'ın direkt çocuğu, content card'ın sibling'i.
              Scale'den etkilenmez, kendi inset değerleriyle konumlanır.
              FAL aktif değilse hiç render edilmez. */}
          {hasActiveAi && <AiChatDrawer />}
        </div>
        {/* Bottom strip — sadece FAL aktif iken görünür. */}
        {hasActiveAi && (
          <div
            className="flex shrink-0 items-center justify-end gap-1 px-3"
            style={{ height: BOTTOM_STRIP_HEIGHT }}
          >
            <AiChatFab />
          </div>
        )}
      </main>
    </div>
  );
}
