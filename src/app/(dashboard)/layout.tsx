'use client';

import { useEffect, useRef, useState } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { usePricingStore, type UsageInfo } from '@/stores/pricingStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { UsageWarning } from '@/components/pricing/usage-warning';
import { AiChatDrawer } from '@/components/ai/ai-chat-drawer';
import { AiChatFab } from '@/components/ai/ai-chat-fab';
import { useUIStore } from '@/stores/uiStore';
import { useAiStore } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import {
  SidePanelProvider,
  useSidePanelContent,
} from '@/components/providers/SidePanel';

/**
 * Side panel kartı — açılırken Linear-style fade + blur + translate
 * animasyonu uygulanır. Inline style ile keyframe'i zorluyoruz ki
 * Tailwind v4 / class-purge / CSS layering ile takılmasın.
 *
 * mount'tan sonra animation tamamlanınca filter/opacity sıfırlanmaz —
 * `forwards` doldurma modu ile bitiş state'inde kalır.
 */
function SidePanelCard({ children }: { children: React.ReactNode }) {
  // Stable per-mount key — her mount'ta yeni animasyon başlasın.
  const idRef = useRef<number>(Date.now());
  return (
    <aside
      key={idRef.current}
      className="flex w-[360px] shrink-0 flex-col overflow-hidden content-surface rounded-lg"
      style={{
        animation:
          'side-panel-enter 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
      }}
    >
      {children}
    </aside>
  );
}

// Bottom strip yüksekliği — AI launcher + history button satırı.
const BOTTOM_STRIP_HEIGHT = 56;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { usage, fetchUsage, fetchPricingStatus } = usePricingStore();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchCurrent);
  const isAiDrawerExpanded = useUIStore((s) => s.isAiDrawerExpanded);

  // Fal veya Fashn aktif mi? Layout'tan fetch ediyoruz — bottom strip ve drawer
  // bu listeye göre render edilir, panel mount'una bağlı değil.
  const currentCompanyId = useCompanyStore((s) => s.currentCompany?.id);
  const integrations = useAiStore((s) => s.integrations);
  const fetchIntegrations = useAiStore((s) => s.fetchIntegrations);
  // En az bir aktif AI entegrasyonu (OpenAI / Fal / Fashn) varsa drawer mount
  // edilir. Yoksa fab tıklayınca /stores'a yönlendirir. Provider'a özgü uyarı
  // ilgili modda (text=OpenAI, video=Fal) gösterilir.
  const hasActiveAi = integrations.some((i) => i.isActive);

  // Trial gün sayısı için "clock state" tutuyoruz — saatte bir Date.now() ile
  // tazelenir, böylece sayfa açık kalsa bile gece yarısında stale kalmaz.
  // setState in effect lint kuralı için: clock dış kaynak, abone oluyoruz.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  let trialDaysLeft: number | null = null;
  let trialProgress = 0;
  if (
    now !== null &&
    subscription?.status === 'on_trial' &&
    subscription.trialEndsAt
  ) {
    const endTs = new Date(subscription.trialEndsAt).getTime();
    const startTs = new Date(subscription.createdAt).getTime();
    const totalMs = endTs - startTs;
    const diffMs = endTs - now;
    if (diffMs > 0) {
      trialDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      // Geçen sürenin oranı (0..1) — circular progress fill miktarı.
      if (totalMs > 0) {
        trialProgress = Math.min(1, Math.max(0, (now - startTs) / totalMs));
      }
    }
  }
  const isOnTrial = trialDaysLeft !== null;
  const PLAN_DISPLAY: Record<string, string> = {
    FREE: 'Free',
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise',
  };
  const trialPlanLabel = subscription
    ? PLAN_DISPLAY[subscription.planType] ?? subscription.planType
    : 'Pro';

  // Limit uyarısı: 999 sınırsız sayılır. Strip'te ya trial pill ya da
  // limit dolu/yakın iken "Plan Yükselt" pill render ediliyor.
  const hasLimitPill =
    !isOnTrial &&
    !!usage &&
    usage.storeLimit !== 999 &&
    (usage.isAtLimit || usage.isNearLimit);
  const hasPlanPill = isOnTrial || hasLimitPill;
  // AI fab her zaman bottom strip'te gözükür; usage pill opsiyonel.
  const showBottomStrip = true;
  const stripHeight = showBottomStrip ? BOTTOM_STRIP_HEIGHT : 0;

  useEffect(() => {
    fetchUsage();
    fetchPricingStatus();
    fetchSubscription();
  }, [fetchUsage, fetchPricingStatus, fetchSubscription]);

  useEffect(() => {
    if (currentCompanyId) fetchIntegrations(currentCompanyId);
  }, [currentCompanyId, fetchIntegrations]);

  return (
    <SidePanelProvider>
      <DashboardLayoutInner
        hasActiveAi={hasActiveAi}
        showBottomStrip={showBottomStrip}
        stripHeight={stripHeight}
        isAiDrawerExpanded={isAiDrawerExpanded}
        usage={usage}
        isOnTrial={isOnTrial}
        trialDaysLeft={trialDaysLeft ?? undefined}
        trialProgress={trialProgress}
        trialPlanLabel={trialPlanLabel}
        hasLimitPill={hasLimitPill}
      >
        {children}
      </DashboardLayoutInner>
    </SidePanelProvider>
  );
}

function DashboardLayoutInner({
  hasActiveAi,
  showBottomStrip,
  stripHeight,
  isAiDrawerExpanded,
  usage,
  isOnTrial,
  trialDaysLeft,
  trialProgress,
  trialPlanLabel,
  hasLimitPill,
  children,
}: {
  hasActiveAi: boolean;
  showBottomStrip: boolean;
  stripHeight: number;
  isAiDrawerExpanded: boolean;
  usage: UsageInfo | null;
  isOnTrial: boolean;
  trialDaysLeft?: number;
  trialProgress: number;
  trialPlanLabel: string;
  hasLimitPill: boolean;
  children: React.ReactNode;
}) {
  // SidePanelProvider context'inden panel içeriği oku — sayfanın
  // `setSidePanel(<Panel />)` çağrısıyla doldurulur. Content card'ın
  // sibling'i olarak translucent card içinde render edilir; null ise
  // panel slot tamamen gizlenir.
  const sidePanel = useSidePanelContent();

  return (
    // h-dvh — mobil tarayıcılarda URL barı açıkken 100vh viewport'tan büyük
    // çıkıyor, alt 56px (AI fab + usage warning) ekran altı geçiyordu. dvh
    // dinamik viewport ile gerçek görünür yüksekliği esas alır. PWA için
    // ayrıca alt strip'e safe-area-inset-bottom padding'i ekliyoruz.
    <div className="bg-page flex h-dvh w-full">
      <AppSidebar />
      <main className="flex h-dvh min-w-0 flex-1 flex-col p-1 pl-0">
        <div
          className="relative flex flex-col"
          style={
            showBottomStrip
              ? {
                  height: `calc(100dvh - ${stripHeight}px - env(safe-area-inset-bottom))`,
                }
              : { flex: '1 1 0%', minHeight: 0 }
          }
        >
          {/* Horizontal split — content card + (opsiyonel) side panel.
              Side panel translucent white card, content kart ile aynı stil. */}
          <div className="flex min-h-0 flex-1 gap-1">
            <div
              className="flex min-w-0 flex-1 flex-col overflow-hidden content-surface rounded-lg"
              style={{
                transform: isAiDrawerExpanded ? 'scale(0.98)' : 'scale(1)',
                transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                transformOrigin: 'center',
              }}
            >
              <div className="scrollbar-none flex flex-1 flex-col overflow-auto">
                {children}
              </div>
            </div>
            {sidePanel && (
              <SidePanelCard>{sidePanel}</SidePanelCard>
            )}
          </div>
          {/* Drawer sadece OpenAI varsa mount edilir — yoksa fab tıklayınca
              /stores'a yönlendirir. */}
          {hasActiveAi && <AiChatDrawer />}
        </div>
        {/* Bottom strip — AI fab veya UsageWarning olduğunda görünür.
            Hepsi en sağda toplanır: UsageWarning + AiChatFab yan yana. */}
        {showBottomStrip && (
          <div
            className="flex shrink-0 items-center justify-end gap-2 px-3"
            style={{
              height: `calc(${BOTTOM_STRIP_HEIGHT}px + env(safe-area-inset-bottom))`,
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {(isOnTrial || hasLimitPill) && (
              <UsageWarning
                isOnTrial={isOnTrial}
                trialDaysLeft={trialDaysLeft}
                trialProgress={trialProgress}
                trialPlanLabel={trialPlanLabel}
                isAtLimit={hasLimitPill && !!usage?.isAtLimit}
                isNearLimit={hasLimitPill && !!usage?.isNearLimit}
              />
            )}
            <AiChatFab />
          </div>
        )}
      </main>
    </div>
  );
}
