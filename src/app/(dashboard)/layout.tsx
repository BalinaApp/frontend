'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { WorkspaceTabs } from '@/components/layout/workspace-tabs';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { usePricingStore, type UsageInfo } from '@/stores/pricingStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { UsageWarning } from '@/components/pricing/usage-warning';
import { useUIStore } from '@/stores/uiStore';
import { useAiStore, maxImagesForModel, DEFAULT_IMAGE_MODEL_ID } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import {
  SidePanelProvider,
  useSidePanelContent,
} from '@/components/providers/SidePanel';
import { SidebarPanelProvider } from '@/components/providers/SidebarPanel';
import {
  BalinaVideoIcon,
  BalinaImageIcon,
  BalinaSummarizeIcon,
  BalinaButton,
  BalinaChat,
  BalinaChatQuickAction,
  BalinaChatUserMessage,
  BalinaChatStatus,
  BalinaChatMedia,
  BalinaSearchIcon,
  BalinaTextField,
  toast,
  type BalinaChatInputHandle,
  type BalinaChatMode,
} from '@/components/balina';
import {
  ArrowDownToLine,
  ArrowsRotateRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Xmark,
} from '@gravity-ui/icons';
import { stampCodeOnImage, makeCodePillPng, trSlug } from '@/lib/stamp-code';
import { downloadImagesZip } from '@/lib/download-zip';
import { ResultSetStack } from '@/components/ai/result-set-stack';
import { AiContextPicker, AiFileChip } from '@/components/ai/ai-context-picker';
import { type Product } from '@/stores/inventoryStore';
import { resizeImageToDataUrl } from '@/lib/image-resize';

/** balinaOS AI panel mesaj tipi. */
// Mod seçilince composer'a önceden yazılan düzenlenebilir prompt'lar (kullanıcı
// değiştirebilir). Backend de boş gelirse aynı default'ları uygular.
const DEFAULT_IMAGE_PROMPT =
  '1. görseldeki modele 2. görseldeki ürünü giydir. EN KRİTİK KURAL — DÜĞMELER: ürün görselindeki düğmeleri tek tek say ve çıktıda TAM OLARAK aynı sayıda düğme olsun. Ürün DÜĞMESİZ veya önden kapamasız ise (ör. yalnızca dik/hakim yaka var, pat yok; süsleme/boncuk/desen düğme değildir) ÇIKTIDA HİÇ DÜĞME OLMAMALI — öne dikey düğme sırası, pat ya da kapama ASLA ekleme, yakadan aşağı düğme oluşturma. Üründe düğme VARSA: fazladan düğme ekleme, düğme dizisi uydurma, simetrik veya dikey ekstra sıra OLUŞTURMA; düğmeler yalnızca üründe göründükleri yerde (ör. asimetrik/çapraz pat boyunca), aynı konum, aynı boyut ve aynı renkte (gold/metal vb.) olmalı. Kol detayları (uzunluk, büzgü/fırfır, manşet, katlama, dikiş), yaka biçimi, desen, baskı, logo, kumaş dokusu ve tüm dikiş çizgileri ürünle birebir aynı kalmalı. Şal/kuşak ve ayakkabı kuralı: 3. bir görsel verildiyse şalı/kuşağı o görseldeki ile değiştir (renk + model birebir); 4. bir görsel verildiyse ayakkabıyı o görseldeki ile değiştir (renk + model birebir); verilmediyse üründeki şal/kuşağı ve modeldeki ayakkabıyı aynı renk ve biçimde aynen koru. Modelin yüzünü, başörtüsünü, saç/ten rengini, duruşunu ve vücudunu aynen koru; üründe ya da modelde olmayan başörtüsü, eşarp, atkı, şapka, takı gibi hiçbir aksesuar EKLEME. Yalnızca belirtilen parçalar giydirilir/değiştirilir.';
const DEFAULT_VIDEO_PROMPT =
  'Subtle mirror-selfie video. The model keeps the phone steady in her right hand at the same height throughout — phone never lowers. She turns her torso slightly to the right, then slightly to the left in a gentle, slow swing (no full body rotation, no pivoting around her axis). The camera slowly pushes in by ~15%, as if she is zooming her phone closer to herself, framing the dress in more detail. Smooth, calm, controlled motion — no fast movements, no jitter.';

type AiMsg =
  | { id: string; role: 'user'; text: string; images?: string[] }
  | { id: string; role: 'assistant'; kind: 'text'; text: string }
  | { id: string; role: 'assistant'; kind: 'error'; text: string }
  | { id: string; role: 'assistant'; kind: 'image'; url: string; name?: string }
  | {
      id: string;
      role: 'assistant';
      kind: 'image-set';
      urls: string[];
      selectedIndex?: number;
      posesResolved?: boolean;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'pose-set';
      items: { poseName: string; url: string; poseId?: string }[];
      /** Pozların üretildiği kaynak görsel — yeniden oluşturma için. */
      sourceUrl?: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'result-set';
      label: string;
      items: {
        poseName?: string;
        url: string;
        name?: string;
        /** Recolor kaynağı (orijinal poz görseli) — yeniden üretim için. */
        sourceUrl?: string;
        poseId?: string;
      }[];
      /** Bu setin renk referansı (varsa) — yeniden recolor için. */
      colorRef?: string;
    }
  | { id: string; role: 'assistant'; kind: 'video'; url: string; label?: string; name?: string };

/** Poz varyasyonları sonrası rehberli akış: renk → kod → video. Tek seferde
 *  bir akış aktif olur; sorular geçici UI, sonuçlar kalıcı mesajdır. */
type AiFlow = {
  step: 'colors' | 'code' | 'video';
  poses: { poseName: string; url: string; poseId?: string }[];
  colorRefs: string[];
  /** Nihai setler — renk uygulandıysa renk setleri, yoksa tek "Orijinal". */
  finalSets: {
    label: string;
    items: { poseName: string; url: string; poseId?: string }[];
  }[];
  /** Uygulanan kod (girilmişse) — dosya adlarında kullanılır. */
  code?: string;
};

/** Grup lightbox — sağ/sol gezinme + (varsa) yeniden oluştur + indir. */
function AiLightbox({
  items,
  index,
  onIndex,
  onClose,
  onRegenerate,
  regenBusy,
}: {
  items: { url: string; name?: string }[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onRegenerate?: () => void;
  regenBusy?: boolean;
}) {
  const n = items.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndex((index - 1 + n) % n);
      else if (e.key === 'ArrowRight') onIndex((index + 1) % n);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, n, onClose, onIndex]);

  if (typeof document === 'undefined') return null;
  const cur = items[index];
  if (!cur) return null;

  // Koyu overlay üzerinde görünür "glassy" buton stili (design-system buton + dark uyarlama).
  const glass =
    '!bg-white/15 !text-white [&>svg]:!text-white ring-1 ring-white/25 hover:!bg-white/25';

  const download = () => {
    const a = document.createElement('a');
    a.href = cur.url;
    a.download = `${cur.name || 'gorsel'}.png`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-xl sm:p-12"
    >
      <BalinaButton
        variant="soft"
        size="large"
        aria-label="Kapat"
        onClick={onClose}
        className={`absolute right-4 top-4 z-10 ${glass}`}
        leftIcon={<Xmark className="h-4 w-4" />}
      />
      {n > 1 && (
        <>
          <BalinaButton
            variant="soft"
            size="large"
            aria-label="Önceki"
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index - 1 + n) % n);
            }}
            className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 ${glass}`}
            leftIcon={<ChevronLeft className="h-5 w-5" />}
          />
          <BalinaButton
            variant="soft"
            size="large"
            aria-label="Sonraki"
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index + 1) % n);
            }}
            className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 ${glass}`}
            leftIcon={<ChevronRight className="h-5 w-5" />}
          />
        </>
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full flex-col items-center gap-3"
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.url}
            alt=""
            className={`max-h-[78vh] max-w-full rounded-lg object-contain transition-opacity ${
              regenBusy ? 'opacity-40' : 'opacity-100'
            }`}
          />
          {regenBusy && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowsRotateRight className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {n > 1 && (
            <span className="text-sm text-white/80">
              {index + 1} / {n}
            </span>
          )}
          {onRegenerate && (
            <BalinaButton
              variant="soft"
              size="small"
              disabled={regenBusy}
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className={glass}
              leftIcon={<ArrowsRotateRight className="h-3.5 w-3.5" />}
            >
              {regenBusy ? 'Oluşturuluyor…' : 'Yeniden oluştur'}
            </BalinaButton>
          )}
          <BalinaButton
            variant="soft"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              download();
            }}
            className={glass}
            leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            İndir
          </BalinaButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Side panel kartı — açılırken Linear-style fade + blur + translate
 * animasyonu uygulanır. Inline style ile keyframe'i zorluyoruz ki
 * Tailwind v4 / class-purge / CSS layering ile takılmasın.
 *
 * mount'tan sonra animation tamamlanınca filter/opacity sıfırlanmaz —
 * `forwards` doldurma modu ile bitiş state'inde kalır.
 */
function SidePanelCard({
  children,
  width = 360,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  // Stable per-mount key — her mount'ta yeni animasyon başlasın.
  const id = useId();
  return (
    <aside
      key={id}
      className="shadow-panel-surface flex shrink-0 flex-col overflow-hidden rounded-[0.625rem]"
      style={{
        width: `${width}px`,
        backgroundImage: 'var(--balina-panel-surface)',
        animation:
          'side-panel-enter 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
      }}
    >
      {children}
    </aside>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { usage, fetchUsage, fetchPricingStatus } = usePricingStore();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchCurrent);
  const isAiDrawerExpanded = useUIStore((s) => s.isAiDrawerExpanded);

  // Fal veya OpenAI aktif mi? Layout'tan fetch ediyoruz — bottom strip ve drawer
  // bu listeye göre render edilir, panel mount'una bağlı değil.
  const currentCompanyId = useCompanyStore((s) => s.currentCompany?.id);
  const integrations = useAiStore((s) => s.integrations);
  const fetchIntegrations = useAiStore((s) => s.fetchIntegrations);
  // En az bir aktif AI entegrasyonu (OpenAI / Fal) varsa drawer mount
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

  useEffect(() => {
    fetchUsage();
    fetchPricingStatus();
    fetchSubscription();
  }, [fetchUsage, fetchPricingStatus, fetchSubscription]);

  useEffect(() => {
    if (currentCompanyId) fetchIntegrations(currentCompanyId);
  }, [currentCompanyId, fetchIntegrations]);

  return (
    <SidebarPanelProvider>
      <SidePanelProvider>
      <DashboardLayoutInner
        hasActiveAi={hasActiveAi}
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
    </SidebarPanelProvider>
  );
}

function DashboardLayoutInner({
  hasActiveAi,
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
  const isBalinaAiOpen = useUIStore((s) => s.isBalinaAiOpen);
  const setBalinaAiOpen = useUIStore((s) => s.setBalinaAiOpen);
  const isBalinaAiFloating = useUIStore((s) => s.isBalinaAiFloating);
  const toggleBalinaAiFloating = useUIStore((s) => s.toggleBalinaAiFloating);

  // AI paneli açılış/kapanış animasyonu — kapanırken exit slide için mount'u
  // kısa süre koru. aiRender türetilir; sadece kapanış setState'i effect'te.
  const AI_CLOSE_MS = 280;
  const [aiClosing, setAiClosing] = useState(false);
  const aiRender = isBalinaAiOpen || aiClosing;
  const wasAiOpen = useRef(isBalinaAiOpen);
  useEffect(() => {
    if (wasAiOpen.current && !isBalinaAiOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiClosing(true);
      const t = setTimeout(() => setAiClosing(false), AI_CLOSE_MS);
      wasAiOpen.current = isBalinaAiOpen;
      return () => clearTimeout(t);
    }
    wasAiOpen.current = isBalinaAiOpen;
  }, [isBalinaAiOpen]);

  // Yüzen pencere konumu (sayfa üzerinde serbest sürükleme).
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const FLOAT_W = 394;
  const FLOAT_H = 600;
  useEffect(() => {
    if (isBalinaAiFloating && floatPos === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFloatPos({
        x: Math.max(16, (window.innerWidth - FLOAT_W) / 2),
        y: Math.max(16, (window.innerHeight - FLOAT_H) / 2),
      });
    }
    if (!isBalinaAiFloating && floatPos !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFloatPos(null);
    }
  }, [isBalinaAiFloating, floatPos]);
  const startFloatDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = floatPos ?? { x: 0, y: 0 };
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => {
      setFloatPos({
        x: Math.max(8, base.x + (ev.clientX - startX)),
        y: Math.max(8, base.y + (ev.clientY - startY)),
      });
    };
    const up = () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // AI paneli yeniden boyutlandırma (sol kenardan sürükleme, sol sidebar gibi).
  const AI_MIN = 340;
  const AI_MAX = 620;
  const [aiWidth, setAiWidth] = useState(394);
  const [aiResizing, setAiResizing] = useState(false);
  useEffect(() => {
    const saved = Number(localStorage.getItem('balina-ai-width'));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved >= AI_MIN && saved <= AI_MAX) setAiWidth(saved);
  }, []);
  const startAiResize = (e: React.PointerEvent) => {
    e.preventDefault();
    setAiResizing(true);
    const startX = e.clientX;
    const startWidth = aiWidth;
    let latest = startWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const move = (ev: PointerEvent) => {
      // Handle solda: sola sürükle → genişle.
      latest = Math.min(AI_MAX, Math.max(AI_MIN, startWidth - (ev.clientX - startX)));
      setAiWidth(latest);
      setAiAnimW(latest); // resize sırasında animasyonsuz (transition kapalı) takip
    };
    const up = () => {
      setAiResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try {
        localStorage.setItem('balina-ai-width', String(Math.round(latest)));
      } catch {
        /* yok say */
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Side panel (sağ drawer — Detaylar/Stil vb.) yeniden boyutlandırma — sol
  // sidebar / AI paneliyle aynı handle. Handle panelin solunda; sola sürükle → genişle.
  const SP_MIN = 320;
  const SP_MAX = 640;
  const SP_DEFAULT = 360;
  const [sidePanelWidth, setSidePanelWidth] = useState(SP_DEFAULT);
  const [sidePanelResizing, setSidePanelResizing] = useState(false);
  useEffect(() => {
    const saved = Number(localStorage.getItem('balina-sidepanel-width'));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved >= SP_MIN && saved <= SP_MAX) setSidePanelWidth(saved);
  }, []);
  const startSidePanelResize = (e: React.PointerEvent) => {
    e.preventDefault();
    setSidePanelResizing(true);
    const startX = e.clientX;
    const startWidth = sidePanelWidth;
    let latest = startWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const move = (ev: PointerEvent) => {
      latest = Math.min(
        SP_MAX,
        Math.max(SP_MIN, startWidth - (ev.clientX - startX)),
      );
      setSidePanelWidth(latest);
    };
    const up = () => {
      setSidePanelResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try {
        localStorage.setItem('balina-sidepanel-width', String(Math.round(latest)));
      } catch {
        /* yok say */
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Docked panel genişlik animasyonu — açılırken 0→aiWidth, kapanırken →0.
  // Genişlik geçişi sayesinde content (flex-1) yumuşakça yeniden akar.
  const [aiAnimW, setAiAnimW] = useState(0);
  useEffect(() => {
    if (isBalinaAiOpen) {
      const id = requestAnimationFrame(() => setAiAnimW(aiWidth));
      return () => cancelAnimationFrame(id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiAnimW(0);
    // aiWidth bağımlılık değil — resize move handler aiAnimW'i ayrıca günceller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBalinaAiOpen]);

  // AI sohbet bağlamı — ürün picker'ı (üstte) + dosya chip'leri (üstte).
  // Seçilen ürün, composer'a satır içi chip olarak eklenir (insertProduct).
  const aiCompanyId = useCompanyStore((s) => s.currentCompany?.id);
  const aiIntegrations = useAiStore((s) => s.integrations);
  const generateImagesRaw = useAiStore((s) => s.generateImagesRaw);
  const generatePoseVariantsRaw = useAiStore((s) => s.generatePoseVariantsRaw);
  const generateVideoRaw = useAiStore((s) => s.generateVideoRaw);
  const stampVideoCodeRaw = useAiStore((s) => s.stampVideoCodeRaw);
  const generateTextStream = useAiStore((s) => s.generateTextStream);
  const selectedTextModelId = useAiStore((s) => s.selectedTextModelId);

  const aiInputRef = useRef<BalinaChatInputHandle | null>(null);
  // Search "Ask AI"den gelen bekleyen metin — balinaOS paneli açılınca otomatik gönderilir.
  const aiPendingPrompt = useUIStore((s) => s.aiPendingPrompt);
  const setAiPendingPrompt = useUIStore((s) => s.setAiPendingPrompt);
  const [aiContextOpen, setAiContextOpen] = useState(false);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const aiProductsRef = useRef<Record<string, Product>>({});
  const [aiMode, setAiMode] = useState<BalinaChatMode>('chat');
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  // Çalışırken gösterilecek durum metni (video/renk/görsel ayrımı için).
  const [aiStatusText, setAiStatusText] = useState<string | null>(null);
  // Varyant/poz görsellerini tam ekran büyütme (indirme dosya adıyla).
  // Grup lightbox — açık mesajın id'si + aktif index (sağ/sol gezinme).
  const [aiLightbox, setAiLightbox] = useState<{ msgId: string; index: number } | null>(null);
  // Aktif olarak yeniden üretilen tek öğe (spinner sadece bunda dönsün).
  const [regenTarget, setRegenTarget] = useState<{ msgId: string; index: number } | null>(null);
  // ZIP hazırlanan result-set mesajının id'si (indir butonu loading).
  const [zipBusyId, setZipBusyId] = useState<string | null>(null);
  // Rehberli akış (renk → kod → video) — aktif değilse null.
  const [aiFlow, setAiFlow] = useState<AiFlow | null>(null);
  const [aiCodeInput, setAiCodeInput] = useState('');
  const colorFileRef = useRef<HTMLInputElement>(null);
  // Son görsel üretim girdisi — "Yeniden oluştur" için.
  const [lastImageGen, setLastImageGen] = useState<{ prompt: string; imageUrls: string[] } | null>(null);
  // Her varyant seti için "yeniden oluştur" metin alanı (msgId → metin).
  const [aiRegenText, setAiRegenText] = useState<Record<string, string>>({});
  const aiMsgId = useRef(0);
  // Silinme animasyonu için "kaldırılıyor" işaretli dosyalar (File referansı).
  const [removingFiles, setRemovingFiles] = useState<Set<File>>(new Set());
  const removeAiFile = (f: File) => {
    setRemovingFiles((prev) => new Set(prev).add(f));
    // Animasyon (blur + genişlik çökmesi) bitince gerçekten kaldır.
    setTimeout(() => {
      setAiFiles((prev) => prev.filter((x) => x !== f));
      setRemovingFiles((prev) => {
        const next = new Set(prev);
        next.delete(f);
        return next;
      });
    }, 340);
  };

  const aiContextSlot = (
    <div className="flex flex-wrap items-center gap-1">
      <AiContextPicker
        open={aiContextOpen}
        onOpenChange={setAiContextOpen}
        compact={aiFiles.length > 0}
        onSelect={(p) => {
          aiProductsRef.current[p.id] = p;
          aiInputRef.current?.insertProduct(p);
        }}
      />
      {aiFiles.length > 0 && (
        <span className="mx-0.5 h-4 w-px shrink-0 rounded-full bg-[var(--balina-border-strong)]" />
      )}
      {aiFiles.map((f, i) => (
        <AiFileChip
          key={`${f.name}-${i}`}
          name={f.name}
          file={f}
          removing={removingFiles.has(f)}
          onRemove={() => removeAiFile(f)}
        />
      ))}
    </div>
  );

  // Aktif Fal entegrasyonunun seçili görsel agent'ına göre maks. görsel
  // (FASHN tryon 2 · Nano Banana 14). Yoksa varsayılan (FASHN = 2).
  const activeImageModel =
    aiIntegrations.find((i) => i.provider === 'fal' && i.isActive)
      ?.imageModel ?? DEFAULT_IMAGE_MODEL_ID;
  const MAX_AI_IMAGES = maxImagesForModel(activeImageModel);
  const handleAiFiles = (files: File[]) => {
    setAiFiles((prev) => {
      const remaining = MAX_AI_IMAGES - prev.length;
      if (remaining <= 0) {
        toast.error(`En fazla ${MAX_AI_IMAGES} görsel ekleyebilirsiniz`);
        return prev;
      }
      if (files.length > remaining) {
        toast.error(`En fazla ${MAX_AI_IMAGES} görsel ekleyebilirsiniz`);
      }
      return [...prev, ...files.slice(0, remaining)];
    });
    // Görsel yüklenince sohbet modundaysak otomatik "görsel" moduna geç
    // (video modunu bozma — yüklenen görsel başlangıç karesi olabilir).
    setAiMode((prev) => (prev === 'chat' ? 'image' : prev));
  };

  // Aktif Fal entegrasyonu — poz sayısı + video pozu ayarı.
  const aiFalIntegration = aiIntegrations.find(
    (i) => i.provider === 'fal' && i.isActive,
  );
  const aiPoseCount = aiFalIntegration?.imagePoses?.length ?? 0;
  const aiVideoPoseId = aiFalIntegration?.videoPoseId || '';

  const updateAiMsg = (
    id: string,
    patch: { selectedIndex?: number; posesResolved?: boolean },
  ) =>
    setAiMessages((prev) =>
      prev.map((m) => (m.id === id ? ({ ...m, ...patch } as AiMsg) : m)),
    );

  // Seçilen varyantın aynısını, entegrasyonda kayıtlı her poz için üret.
  const handleAiApplyPoses = async (msgId: string, sourceUrl: string) => {
    if (!aiCompanyId || aiBusy) return;
    if (aiPoseCount === 0) {
      toast.error(
        'Kayıtlı poz yok — entegrasyon ayarlarından "Poz ayarları"na ekleyin.',
      );
      return;
    }
    updateAiMsg(msgId, { posesResolved: true });
    setAiBusy(true);
    try {
      const { results, error } = await generatePoseVariantsRaw(aiCompanyId, {
        sourceImageUrl: sourceUrl,
      });
      setAiMessages((prev) => [
        ...prev,
        results.length
          ? {
              id: `a${++aiMsgId.current}`,
              role: 'assistant',
              kind: 'pose-set',
              items: results.map((r) => ({
                poseName: r.poseName,
                url: r.url,
                poseId: r.poseId,
              })),
              sourceUrl,
            }
          : {
              id: `a${++aiMsgId.current}`,
              role: 'assistant',
              kind: 'error',
              text: `Poz üretimi başarısız: ${error ?? 'bilinmeyen hata'}`,
            },
      ]);
      // Varyasyonlar oluştu → rehberli akışı başlat (renk → kod → video).
      if (results.length) {
        const poses = results.map((r) => ({
          poseName: r.poseName,
          url: r.url,
          poseId: r.poseId,
        }));
        setAiCodeInput('');
        setAiFlow({
          step: 'colors',
          poses,
          colorRefs: [],
          finalSets: [{ label: '', items: poses }],
        });
      }
    } finally {
      setAiBusy(false);
    }
  };

  // Poz varyasyonlarını yeniden oluştur — poseIds verilirse sadece o pozları
  // (tek varyasyon), boşsa tümünü. Sonuçları mesaj içinde yerinde değiştirir.
  const handleRegeneratePoses = async (
    msg: Extract<AiMsg, { kind: 'pose-set' }>,
    poseIds?: string[],
  ) => {
    if (!aiCompanyId || aiBusy || !msg.sourceUrl) return;
    setAiBusy(true);
    setAiStatusText('Varyasyonlar yeniden oluşturuluyor…');
    try {
      const { results, error } = await generatePoseVariantsRaw(aiCompanyId, {
        sourceImageUrl: msg.sourceUrl,
        poseIds,
      });
      if (!results.length) {
        toast.error(error ?? 'Yeniden oluşturulamadı');
        return;
      }
      const byId = new Map(results.map((r) => [r.poseId, r]));
      setAiMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msg.id || m.role !== 'assistant' || m.kind !== 'pose-set')
            return m;
          const items = m.items.map((it) => {
            const r = it.poseId ? byId.get(it.poseId) : undefined;
            return r ? { ...it, url: r.url } : it;
          });
          return { ...m, items };
        }),
      );
    } finally {
      setAiBusy(false);
      setAiStatusText(null);
    }
  };

  /* ---------------- Rehberli akış: renk → kod → video ---------------- */

  const RECOLOR_PROMPT =
    'The FIRST image is the SOURCE and is authoritative for EVERYTHING — keep its exact garment design, cut, collar, sleeves, length, buttons, zipper, pockets, embroidery/pattern, the same person, face, hijab, pose, body, background, framing and composition completely UNCHANGED. ' +
    'The SECOND image is ONLY a COLOR SWATCH: take from it ONLY the garment color. Do NOT copy its design, cut, shape, collar, buttons, pattern, length or anything else — ignore everything in the second image except the color. ' +
    'Recolor the garment in the first image to that color and change NOTHING else. ' +
    'Preserve the original photographic SHARPNESS, detail and lighting; do NOT blur or soften; keep neutral true-to-source white balance with no added red/warm color cast.';

  const pushAiMsg = (m: AiMsg) => setAiMessages((prev) => [...prev, m]);

  // "Kol Aşağıda" pozunu bul (yoksa son öğe).
  const findKolAsagida = <T extends { poseName?: string }>(items: T[]): T | undefined =>
    items.find((it) => /a[şs]a[ğg][ıi]da/i.test(it.poseName ?? '')) ??
    items[items.length - 1];

  const handleAddColorRefs = async (files: FileList | null) => {
    if (!files || !aiFlow) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const urls = (
      await Promise.all(imgs.map((f) => resizeImageToDataUrl(f, 2048, 0.92).catch(() => '')))
    ).filter(Boolean);
    if (urls.length) setAiFlow((prev) => (prev ? { ...prev, colorRefs: [...prev.colorRefs, ...urls] } : prev));
    if (colorFileRef.current) colorFileRef.current.value = '';
  };

  const handleApplyColors = async () => {
    if (!aiCompanyId || !aiFlow || aiBusy) return;
    if (aiFlow.colorRefs.length === 0) {
      toast.error('En az bir renk görseli ekleyin');
      return;
    }
    const flow = aiFlow;
    setAiBusy(true);
    setAiStatusText('Renk varyantları oluşturuluyor…');
    try {
      // Ana renk (orijinal) — önce göster (stacked kart + indir) ve nihai
      // setlere ekle ki kodu/videosu da oluşsun.
      const original = {
        label: 'Ana Renk',
        items: flow.poses.map((p) => ({
          poseName: p.poseName,
          url: p.url,
          poseId: p.poseId,
          name: `${trSlug(p.poseName)}-ana-renk`,
        })),
      };
      pushAiMsg({
        id: `a${++aiMsgId.current}`,
        role: 'assistant',
        kind: 'result-set',
        label: 'Ana Renk',
        items: original.items,
      });
      const colorSets: AiFlow['finalSets'] = [];
      for (let c = 0; c < flow.colorRefs.length; c++) {
        const ref = flow.colorRefs[c];
        const label = `Renk ${c + 1}`;
        const items = await Promise.all(
          flow.poses.map(async (p) => {
            const recolor = () =>
              generateImagesRaw(
                aiCompanyId,
                { prompt: RECOLOR_PROMPT, model: 'fal-ai/nano-banana-pro', imageUrls: [p.url, ref] },
                1,
              );
            // Recolor başarısızsa bir kez daha dene; yine olmazsa orijinale düşer
            // (kullanıcı pop-up'tan tek tek yeniden oluşturabilir).
            let r = await recolor();
            if (!r.urls[0]) r = await recolor();
            return {
              poseName: p.poseName,
              url: r.urls[0] ?? p.url,
              poseId: p.poseId,
              sourceUrl: p.url,
              name: `${trSlug(p.poseName)}-${trSlug(label)}`,
            };
          }),
        );
        colorSets.push({ label, items });
        pushAiMsg({
          id: `a${++aiMsgId.current}`,
          role: 'assistant',
          kind: 'result-set',
          label,
          items,
          colorRef: ref,
        });
      }
      setAiFlow({ ...flow, finalSets: [original, ...colorSets], step: 'code' });
    } finally {
      setAiBusy(false);
      setAiStatusText(null);
    }
  };

  const handleSkipColors = () => setAiFlow((prev) => (prev ? { ...prev, step: 'code' } : prev));

  const handleApplyCode = async () => {
    if (!aiFlow || aiBusy) return;
    const code = aiCodeInput.trim();
    if (!code) {
      toast.error('Kod girin');
      return;
    }
    const flow = aiFlow;
    setAiBusy(true);
    setAiStatusText('Görsellere kod ekleniyor…');
    try {
      // Görsellere kod canvas ile gömülür (görüntü/indirme). finalSets KODSUZ
      // kalır — video kodsuz görselden üretilir, kod video'ya ffmpeg ile eklenir.
      for (const set of flow.finalSets) {
        const items = await Promise.all(
          set.items.map(async (it) => ({
            poseName: it.poseName,
            url: await stampCodeOnImage(it.url, code),
            // Dosya adı: KOD-poz-renk (renk yoksa KOD-poz).
            name: [trSlug(code), trSlug(it.poseName), set.label ? trSlug(set.label) : '']
              .filter(Boolean)
              .join('-'),
          })),
        );
        pushAiMsg({
          id: `a${++aiMsgId.current}`,
          role: 'assistant',
          kind: 'result-set',
          label: set.label ? `${set.label} • Kod: ${code}` : `Kod: ${code}`,
          items,
        });
      }
      setAiFlow({ ...flow, step: 'video', code });
    } finally {
      setAiBusy(false);
      setAiStatusText(null);
    }
  };

  const handleSkipCode = () => setAiFlow((prev) => (prev ? { ...prev, step: 'video' } : prev));

  const handleMakeVideos = async () => {
    if (!aiCompanyId || !aiFlow || aiBusy) return;
    const flow = aiFlow;
    setAiBusy(true);
    setAiStatusText('Video oluşturuluyor…');
    try {
      // Kod video'ya ffmpeg ile sabit basılacaksa pill PNG'i bir kez hazırla.
      const pillPng = flow.code ? makeCodePillPng(flow.code) : '';
      for (const set of flow.finalSets) {
        // Entegrasyonda video pozu ayarlıysa onu kullan; yoksa otomatik (Kol Aşağıda).
        const chosen = aiVideoPoseId
          ? set.items.find((it) => it.poseId === aiVideoPoseId)
          : undefined;
        const kol = chosen ?? findKolAsagida(set.items);
        if (!kol) continue;
        // Video KODSUZ görselden üretilir (kod animasyonla oynamasın).
        let r = await generateVideoRaw(aiCompanyId, { prompt: '', imageUrl: kol.url });
        if (!r.url) {
          r = await generateVideoRaw(aiCompanyId, { prompt: '', imageUrl: kol.url });
        }
        let videoUrl = r.url;
        // Kod varsa videonun üzerine ffmpeg ile sabit bas.
        if (videoUrl && pillPng) {
          const stamped = await stampVideoCodeRaw(aiCompanyId, { videoUrl, pillPng });
          videoUrl = stamped.url;
        }
        const name = [flow.code ? trSlug(flow.code) : '', set.label ? trSlug(set.label) : '']
          .filter(Boolean)
          .join('-') || 'video';
        if (videoUrl)
          pushAiMsg({
            id: `a${++aiMsgId.current}`,
            role: 'assistant',
            kind: 'video',
            url: videoUrl,
            label: set.label || undefined,
            name,
          });
        else
          pushAiMsg({
            id: `a${++aiMsgId.current}`,
            role: 'assistant',
            kind: 'error',
            text: `Video oluşturulamadı${set.label ? ` (${set.label})` : ''}: ${r.error ?? ''}`,
          });
      }
    } finally {
      setAiBusy(false);
      setAiStatusText(null);
      setAiFlow(null);
    }
  };

  const handleSkipVideos = () => setAiFlow(null);

  // Renk setindeki tek bir görseli yeniden recolor et (bazen aynı renk çıkıyor).
  const handleRegenColorItem = async (
    msg: Extract<AiMsg, { kind: 'result-set' }>,
    index: number,
  ) => {
    if (!aiCompanyId || aiBusy) return;
    const it = msg.items[index];
    if (!it?.sourceUrl || !msg.colorRef) {
      toast.error('Bu görsel yeniden üretilemiyor');
      return;
    }
    setAiBusy(true);
    setAiStatusText('Renk yeniden oluşturuluyor…');
    try {
      const r = await generateImagesRaw(
        aiCompanyId,
        {
          prompt: RECOLOR_PROMPT,
          model: 'fal-ai/nano-banana-pro',
          imageUrls: [it.sourceUrl, msg.colorRef],
        },
        1,
      );
      const newUrl = r.urls[0];
      if (!newUrl) {
        toast.error('Yeniden oluşturulamadı');
        return;
      }
      setAiMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msg.id || m.role !== 'assistant' || m.kind !== 'result-set')
            return m;
          const items = m.items.map((x, i) => (i === index ? { ...x, url: newUrl } : x));
          return { ...m, items };
        }),
      );
    } finally {
      setAiBusy(false);
      setAiStatusText(null);
    }
  };

  // Varyantları yeniden oluştur. Seçim + metin varsa seçili görseli o talimata
  // göre düzenler (image-to-image); yoksa orijinal girdiyle baştan üretir.
  const handleRegenerate = async (
    msg: Extract<AiMsg, { kind: 'image-set' }>,
    extraText: string,
  ) => {
    if (!aiCompanyId || aiBusy) return;
    const text = extraText.trim();
    const selectedUrl =
      typeof msg.selectedIndex === 'number' ? msg.urls[msg.selectedIndex] : null;
    let prompt: string;
    let imageUrls: string[];
    let model: string | undefined;
    if (selectedUrl && text) {
      prompt = text;
      imageUrls = [selectedUrl];
      model = 'fal-ai/nano-banana-pro';
    } else {
      prompt = [lastImageGen?.prompt, text].filter(Boolean).join(' ').trim();
      imageUrls = lastImageGen?.imageUrls ?? (selectedUrl ? [selectedUrl] : []);
    }
    if (imageUrls.length === 0) {
      toast.error('Yeniden oluşturmak için referans görsel gerekli');
      return;
    }
    setAiBusy(true);
    try {
      const r = await generateImagesRaw(aiCompanyId, { prompt, imageUrls, model }, 3);
      pushAiMsg(
        r.urls.length
          ? { id: `a${++aiMsgId.current}`, role: 'assistant', kind: 'image-set', urls: r.urls }
          : {
              id: `a${++aiMsgId.current}`,
              role: 'assistant',
              kind: 'error',
              text: r.error ?? 'Görsel oluşturulamadı',
            },
      );
    } finally {
      setAiBusy(false);
      setAiRegenText((prev) => ({ ...prev, [msg.id]: '' }));
    }
  };

  // Bir result-set'in tüm görsellerini ZIP olarak indir.
  const handleDownloadSet = async (m: Extract<AiMsg, { kind: 'result-set' }>) => {
    if (zipBusyId) return;
    setZipBusyId(m.id);
    try {
      const files = m.items.map((it, i) => ({
        url: it.url,
        name: it.name || trSlug(it.poseName || `gorsel-${i + 1}`),
      }));
      await downloadImagesZip(files, trSlug(m.label) || 'gorseller');
    } finally {
      setZipBusyId(null);
    }
  };

  const handleAiSend = async (prompt: string, forceMode?: BalinaChatMode) => {
    if (!aiCompanyId || aiBusy) return;
    // Search "Ask AI" gibi dış tetikleyiciler modu zorlayabilir (her zaman metin).
    const mode = forceMode ?? aiMode;
    if (forceMode && forceMode !== aiMode) setAiMode(forceMode);

    const push = (msg: AiMsg) => setAiMessages((prev) => [...prev, msg]);
    const fail = (text: string) => {
      push({ id: `a${++aiMsgId.current}`, role: 'assistant', kind: 'error', text });
      toast.error(text);
    };
    // Composer'ı (dosya + ürün chip'leri) gönderir göndermez sıfırla.
    const resetComposer = () => {
      setAiFiles([]);
      aiProductsRef.current = {};
      aiInputRef.current?.clear();
    };

    // --- Normal akış ---
    // Bağlam görselleri: (1) yüklenen dosyalar (data URL'e çevrilir) +
    // (2) seçilen ürünlerin görselleri. Eski panelle aynı sıra: önce
    // yüklenenler, sonra ürün görselleri.
    const capturedFiles = aiFiles;
    const ids = aiInputRef.current?.getProductIds() ?? [];
    const productUrls = ids
      .map((id) => aiProductsRef.current[id]?.imageUrl)
      .filter((u): u is string => !!u);
    resetComposer();
    // Yüklenen görseller 2K (en uzun kenar 2048px) kalitede yeniden boyutlandırılır.
    const fileUrls = await Promise.all(
      capturedFiles.map((f) =>
        resizeImageToDataUrl(f, 2048, 0.92).catch(() => ''),
      ),
    ).then((urls) => urls.filter(Boolean));
    const imageUrls = [...fileUrls, ...productUrls];
    push({ id: `u${++aiMsgId.current}`, role: 'user', text: prompt, images: imageUrls });

    setAiBusy(true);
    try {
      if (mode === 'image') {
        // Aynı prompt'tan 3 varyant üret — kullanıcı birini seçip diğer
        // pozlarını da oluşturabilsin. (FASHN: imageUrls[0]=kişi, [1]=kıyafet)
        setLastImageGen({ prompt, imageUrls });
        const r = await generateImagesRaw(aiCompanyId, { prompt, imageUrls }, 3);
        if (r.urls.length)
          push({
            id: `a${++aiMsgId.current}`,
            role: 'assistant',
            kind: 'image-set',
            urls: r.urls,
          });
        else fail(r.error ?? 'Görsel oluşturulamadı');
      } else if (mode === 'video') {
        const r = await generateVideoRaw(aiCompanyId, {
          prompt,
          imageUrl: imageUrls[0],
          endImageUrl: imageUrls[1],
        });
        if (r.url) push({ id: `a${++aiMsgId.current}`, role: 'assistant', kind: 'video', url: r.url });
        else fail(r.error ?? 'Video oluşturulamadı');
      } else {
        // Geçmiş (yalnızca text mesajları) + yeni prompt → model değişse de
        // aynı konuşmaya devam edilir. Yanıt token token akıtılır (streaming).
        const history = aiMessages
          .map((m) => {
            if (m.role === 'user') return { role: 'user' as const, content: m.text };
            if (m.role === 'assistant' && m.kind === 'text')
              return { role: 'assistant' as const, content: m.text };
            return null;
          })
          .filter(
            (m): m is { role: 'user' | 'assistant'; content: string } =>
              !!m && m.content.trim().length > 0,
          );
        const chatMessages = [...history, { role: 'user' as const, content: prompt }];
        const assistantId = `a${++aiMsgId.current}`;
        push({ id: assistantId, role: 'assistant', kind: 'text', text: '' });
        const r = await generateTextStream(
          aiCompanyId,
          { messages: chatMessages, model: selectedTextModelId },
          (delta) => {
            setAiMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.role === 'assistant' && m.kind === 'text'
                  ? { ...m, text: m.text + delta }
                  : m,
              ),
            );
          },
        );
        if (r.error || !r.text) {
          const errText = r.error ?? 'Yanıt alınamadı';
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.role === 'assistant'
                ? { id: m.id, role: 'assistant', kind: 'error', text: errText }
                : m,
            ),
          );
          toast.error(errText);
        }
      }
    } catch {
      fail('Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setAiBusy(false);
    }
  };

  // Search "Ask AI" → bekleyen metin geldiğinde, balinaOS paneli açık ve şirket
  // hazırsa 'Sohbet' modunda otomatik gönder ve pending'i temizle.
  useEffect(() => {
    if (!aiPendingPrompt || !isBalinaAiOpen || !aiCompanyId || aiBusy) return;
    const prompt = aiPendingPrompt;
    setAiPendingPrompt(null);
    void handleAiSend(prompt, 'chat');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPendingPrompt, isBalinaAiOpen, aiCompanyId, aiBusy]);

  // Sayfa (route) değişince AI panelini kapat (sohbet KORUNUR).
  const pathname = usePathname();
  useEffect(() => {
    setBalinaAiOpen(false);
  }, [pathname, setBalinaAiOpen]);

  // Sohbeti sıfırla — yalnızca kullanıcı X ile kapatınca. Auto-close (route /
  // side panel) bunu ÇAĞIRMAZ; böylece tekrar açıldığında konuşma kaybolmaz.
  const resetAiChat = () => {
    setAiMessages([]);
    setAiFiles([]);
    setAiMode('chat');
    aiProductsRef.current = {};
    aiInputRef.current?.clear();
  };
  const handleAiCloseAndReset = () => {
    setBalinaAiOpen(false);
    setTimeout(resetAiChat, AI_CLOSE_MS);
  };

  // Genişlik yönetimi: sağ tarafta bir side panel açılırsa AI panelini kapat
  // (sohbet KORUNUR). İki sağ panel yan yana gelip taşmasın.
  useEffect(() => {
    if (sidePanel && isBalinaAiOpen) setBalinaAiOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidePanel]);

  const aiMessagesContent = (
    <>
      {aiMessages.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="flex flex-col gap-1.5">
            {m.text && <BalinaChatUserMessage>{m.text}</BalinaChatUserMessage>}
            {m.images && m.images.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1.5 px-2">
                {m.images.map((src, i) => (
                  <BalinaChatMedia key={i} url={src} type="image" compact />
                ))}
              </div>
            )}
          </div>
        ) : m.kind === 'image' ? (
          <div key={m.id} className="flex px-2 py-1">
            <BalinaChatMedia url={m.url} type="image" name={m.name} />
          </div>
        ) : m.kind === 'image-set' ? (
          <div key={m.id} className="flex flex-col gap-2 px-2 py-1">
            <div className="grid grid-cols-3 gap-1.5">
              {m.urls.map((url, i) => {
                const isSel = m.selectedIndex === i;
                return (
                  <div key={i} className="relative">
                    <button
                      type="button"
                      disabled={aiBusy}
                      onClick={() => updateAiMsg(m.id, { selectedIndex: i })}
                      aria-label={`Varyant ${i + 1} seç`}
                      aria-pressed={isSel}
                      className={`block aspect-[3/4] w-full overflow-hidden rounded-xl transition-all focus:outline-none disabled:cursor-not-allowed ${
                        isSel
                          ? 'ring-2 ring-black ring-offset-1'
                          : 'ring-1 ring-black/[0.10] hover:ring-black/30'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Varyant ${i + 1}`} className="h-full w-full object-cover" />
                      {isSel && (
                        <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                    {/* Büyüteç — design-system buton; görseli tam ekran büyütür. */}
                    <BalinaButton
                      variant="soft"
                      size="small"
                      aria-label={`Varyant ${i + 1} büyüt`}
                      onClick={() => setAiLightbox({ msgId: m.id, index: i })}
                      className="absolute right-1.5 top-1.5 !bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:!bg-white"
                      leftIcon={<BalinaSearchIcon className="h-4 w-4" />}
                    />
                  </div>
                );
              })}
            </div>
            {/* Yeniden oluştur — seçim + metin varsa seçili görseli düzenler. */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <BalinaTextField
                  value={aiRegenText[m.id] ?? ''}
                  onChange={(v) => setAiRegenText((prev) => ({ ...prev, [m.id]: v }))}
                  placeholder={
                    typeof m.selectedIndex === 'number'
                      ? 'Seçili görselde değişiklik yaz (opsiyonel)'
                      : 'Değişiklik yaz (opsiyonel)'
                  }
                />
              </div>
              <BalinaButton
                variant="soft"
                size="small"
                disabled={aiBusy}
                onClick={() => void handleRegenerate(m, aiRegenText[m.id] ?? '')}
              >
                Yeniden oluştur
              </BalinaButton>
            </div>
            {!m.posesResolved && (
              <div className="flex flex-col gap-2 rounded-2xl bg-[var(--balina-background-dark-faint)] p-3">
                <span className="text-body-small-medium text-[var(--balina-text-strong)]">
                  {typeof m.selectedIndex === 'number'
                    ? `Seçili görselin diğer pozlarını da oluşturayım mı?${aiPoseCount > 0 ? ` (${aiPoseCount} poz)` : ''}`
                    : 'Bir varyant seçin, diğer pozlarını da oluşturayım mı?'}
                </span>
                <div className="flex items-center gap-2">
                  <BalinaButton
                    variant="primary"
                    size="small"
                    disabled={typeof m.selectedIndex !== 'number' || aiBusy}
                    onClick={() => {
                      if (typeof m.selectedIndex === 'number')
                        void handleAiApplyPoses(m.id, m.urls[m.selectedIndex]);
                    }}
                  >
                    Evet, oluştur
                  </BalinaButton>
                  <BalinaButton
                    variant="soft"
                    size="small"
                    disabled={aiBusy}
                    onClick={() => updateAiMsg(m.id, { posesResolved: true })}
                  >
                    Hayır
                  </BalinaButton>
                </div>
                {aiPoseCount === 0 && (
                  <span className="text-body-tiny-regular text-[var(--balina-text-muted)]">
                    Henüz poz eklemediniz — entegrasyon ayarlarından “Poz ayarları”na ekleyin.
                  </span>
                )}
              </div>
            )}
          </div>
        ) : m.kind === 'pose-set' ? (
          <div key={m.id} className="flex flex-col gap-1.5 px-2 py-1">
            <span className="px-1 text-body-small-medium text-[var(--balina-text-strong)]">
              Varyasyonlarınız oluştu
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {m.items.map((it, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl ring-1 ring-black/[0.10]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt={it.poseName} className="h-full w-full object-cover" />
                    <BalinaButton
                      variant="soft"
                      size="small"
                      aria-label={`${it.poseName || `Poz ${i + 1}`} büyüt`}
                      onClick={() => setAiLightbox({ msgId: m.id, index: i })}
                      className="absolute right-1.5 top-1.5 !bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:!bg-white"
                      leftIcon={<BalinaSearchIcon className="h-4 w-4" />}
                    />
                    {/* Bu pozu tek başına yeniden oluştur. */}
                    {m.sourceUrl && (
                      <BalinaButton
                        variant="soft"
                        size="small"
                        disabled={aiBusy}
                        aria-label={`${it.poseName || `Poz ${i + 1}`} yeniden oluştur`}
                        onClick={() =>
                          void handleRegeneratePoses(m, it.poseId ? [it.poseId] : undefined)
                        }
                        className="absolute left-1.5 top-1.5 !bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:!bg-white"
                        leftIcon={<ArrowsRotateRight className="h-4 w-4" />}
                      />
                    )}
                  </div>
                  <span className="max-w-full truncate text-body-tiny-regular text-[var(--balina-text-muted)]">
                    {it.poseName || `Poz ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
            {m.sourceUrl && (
              <div className="flex justify-center">
                <BalinaButton
                  variant="soft"
                  size="small"
                  disabled={aiBusy}
                  onClick={() => void handleRegeneratePoses(m)}
                  leftIcon={<ArrowsRotateRight className="h-3.5 w-3.5" />}
                >
                  Tümünü yeniden oluştur
                </BalinaButton>
              </div>
            )}
          </div>
        ) : m.kind === 'result-set' ? (
          <ResultSetStack
            key={m.id}
            items={m.items}
            label={m.label}
            busy={zipBusyId === m.id}
            onZoom={(index) => setAiLightbox({ msgId: m.id, index })}
            onDownload={() => void handleDownloadSet(m)}
          />
        ) : m.kind === 'video' ? (
          <div key={m.id} className="flex flex-col gap-1 px-2 py-1">
            <BalinaChatMedia url={m.url} type="video" name={m.name} />
            {m.label && (
              <span className="px-1 text-body-tiny-regular text-[var(--balina-text-muted)]">
                {m.label}
              </span>
            )}
          </div>
        ) : m.kind === 'error' ? (
          <div key={m.id} className="px-3 py-2 text-body-default-regular text-red-500">
            {m.text}
          </div>
        ) : (
          <div
            key={m.id}
            className="whitespace-pre-wrap break-words px-3 py-2 text-body-default-regular text-[var(--balina-text-default)]"
          >
            {m.text}
          </div>
        ),
      )}
      {aiBusy && (
        <BalinaChatStatus variant="thinking">
          {aiStatusText ??
            (aiMode === 'video'
              ? 'Video oluşturuluyor…'
              : aiMode === 'image'
                ? 'Görsel oluşturuluyor…'
                : 'Yanıt hazırlanıyor…')}
        </BalinaChatStatus>
      )}
      {(() => {
        if (!aiLightbox) return null;
        const m = aiMessages.find((x) => x.id === aiLightbox.msgId);
        if (!m || m.role !== 'assistant') return null;
        let items: { url: string; name?: string }[] = [];
        const idxRaw = aiLightbox.index;
        // Tek bir öğeyi yeniden üretip regenTarget'ı set/temizleyen sarmalayıcı.
        const wrapRegen = (run: () => Promise<unknown>) => () => {
          setRegenTarget({ msgId: m.id, index: idxRaw });
          void run().finally(() => setRegenTarget(null));
        };
        let onRegenerate: (() => void) | undefined;
        if (m.kind === 'image-set') {
          items = m.urls.map((url, i) => ({ url, name: `varyant-${i + 1}` }));
        } else if (m.kind === 'pose-set') {
          items = m.items.map((it, i) => ({
            url: it.url,
            name: trSlug(it.poseName || `poz-${i + 1}`),
          }));
          if (m.sourceUrl) {
            const it = m.items[idxRaw];
            onRegenerate = wrapRegen(() =>
              handleRegeneratePoses(m, it?.poseId ? [it.poseId] : undefined),
            );
          }
        } else if (m.kind === 'result-set') {
          items = m.items.map((it, i) => ({
            url: it.url,
            name: it.name ?? trSlug(it.poseName || `gorsel-${i + 1}`),
          }));
          if (m.colorRef) {
            onRegenerate = wrapRegen(() => handleRegenColorItem(m, idxRaw));
          }
        } else {
          return null;
        }
        if (items.length === 0) return null;
        const idx = Math.min(idxRaw, items.length - 1);
        // Spinner yalnızca aktif olarak yeniden üretilen bu öğede dönsün.
        const thisBusy =
          !!regenTarget && regenTarget.msgId === m.id && regenTarget.index === idx;
        return (
          <AiLightbox
            items={items}
            index={idx}
            regenBusy={thisBusy}
            onRegenerate={onRegenerate}
            onIndex={(i) => setAiLightbox({ msgId: m.id, index: i })}
            onClose={() => setAiLightbox(null)}
          />
        );
      })()}
      {/* Rehberli akış soruları (renk → kod → video) — sonuçlar mesaj olarak akar. */}
      {aiFlow && !aiBusy && (
        <div className="mx-2 my-1 flex flex-col gap-2 rounded-2xl bg-[var(--balina-background-dark-faint)] p-3">
          {aiFlow.step === 'colors' && (
            <>
              <span className="text-body-small-medium text-[var(--balina-text-strong)]">
                Farklı renklerini de oluşturayım mı? Renk görsel(ler)ini ekleyin —
                yalnızca renk değişir, kalan her şey aynı kalır.
              </span>
              {aiFlow.colorRefs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiFlow.colorRefs.map((u, i) => (
                    <div key={i} className="group relative h-16 w-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-black/10"
                      />
                      {/* Sil — mobilde her zaman, masaüstünde hover'da; ortada. */}
                      <button
                        type="button"
                        aria-label="Rengi kaldır"
                        onClick={() =>
                          setAiFlow((prev) =>
                            prev
                              ? { ...prev, colorRefs: prev.colorRefs.filter((_, idx) => idx !== i) }
                              : prev,
                          )
                        }
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white shadow-sm">
                          <Xmark className="h-4 w-4" />
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={colorFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void handleAddColorRefs(e.target.files)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <BalinaButton
                  variant="soft"
                  size="small"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => colorFileRef.current?.click()}
                >
                  Renk görseli ekle
                </BalinaButton>
                <BalinaButton
                  variant="primary"
                  size="small"
                  disabled={aiFlow.colorRefs.length === 0}
                  onClick={() => void handleApplyColors()}
                >
                  Evet, oluştur
                </BalinaButton>
                <BalinaButton variant="soft" size="small" onClick={handleSkipColors}>
                  Hayır
                </BalinaButton>
              </div>
            </>
          )}
          {aiFlow.step === 'code' && (
            <>
              <span className="text-body-small-medium text-[var(--balina-text-strong)]">
                Görsellere kod eklensin mi?
              </span>
              <BalinaTextField
                value={aiCodeInput}
                onChange={setAiCodeInput}
                placeholder="Örn. KZ-1234"
              />
              <div className="flex items-center gap-2">
                <BalinaButton
                  variant="primary"
                  size="small"
                  disabled={!aiCodeInput.trim()}
                  onClick={() => void handleApplyCode()}
                >
                  Evet, uygula
                </BalinaButton>
                <BalinaButton variant="soft" size="small" onClick={handleSkipCode}>
                  Hayır
                </BalinaButton>
              </div>
            </>
          )}
          {aiFlow.step === 'video' && (
            <>
              <span className="text-body-small-medium text-[var(--balina-text-strong)]">
                Videoları oluşturayım mı? (her renk için{' '}
                {aiFalIntegration?.imagePoses?.find((p) => p.id === aiVideoPoseId)?.name ||
                  'Kol Aşağıda'}{' '}
                pozundan)
              </span>
              <div className="flex items-center gap-2">
                <BalinaButton
                  variant="primary"
                  size="small"
                  onClick={() => void handleMakeVideos()}
                >
                  Evet, oluştur
                </BalinaButton>
                <BalinaButton variant="soft" size="small" onClick={handleSkipVideos}>
                  Hayır
                </BalinaButton>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  // Mod değiştir + composer'a o modun düzenlenebilir default prompt'unu yaz
  // (kullanıcı değiştirebilir). Sohbette temizle ve odaklan.
  const handleModeChange = (m: BalinaChatMode) => {
    setAiMode(m);
    const text =
      m === 'image' ? DEFAULT_IMAGE_PROMPT : m === 'video' ? DEFAULT_VIDEO_PROMPT : '';
    aiInputRef.current?.setText(text);
    aiInputRef.current?.focus();
  };

  const aiQuickActions = () => (
    <>
      <BalinaChatQuickAction
        icon={<BalinaVideoIcon className="h-4 w-4" />}
        onClick={() => handleModeChange('video')}
      >
        Video oluştur
      </BalinaChatQuickAction>
      <BalinaChatQuickAction
        icon={<BalinaImageIcon className="h-4 w-4" />}
        onClick={() => handleModeChange('image')}
      >
        Görsel oluştur
      </BalinaChatQuickAction>
      <BalinaChatQuickAction
        icon={<BalinaSummarizeIcon className="h-4 w-4" />}
        onClick={() => handleModeChange('chat')}
      >
        Soru sor
      </BalinaChatQuickAction>
    </>
  );

  return (
    // h-dvh — mobil tarayıcılarda URL barı açıkken 100vh viewport'tan büyük
    // çıkıyor, alt 56px (AI fab + usage warning) ekran altı geçiyordu. dvh
    // dinamik viewport ile gerçek görünür yüksekliği esas alır. PWA için
    // ayrıca alt strip'e safe-area-inset-bottom padding'i ekliyoruz.
    <main
      className="relative flex min-h-svh min-w-0 flex-1 p-[var(--gap)]"
      style={{ background: 'var(--balina-base-heavy-loud)' }}
    >
      {/* Tema deseni katmanı (soft-light) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 [background-size:256px_256px] [mix-blend-mode:soft-light]"
      />
      <AppSidebar
        belowNav={
          isOnTrial || hasLimitPill ? (
            <UsageWarning
              isOnTrial={isOnTrial}
              trialDaysLeft={trialDaysLeft}
              trialProgress={trialProgress}
              trialPlanLabel={trialPlanLabel}
              isAtLimit={hasLimitPill && !!usage?.isAtLimit}
              isNearLimit={hasLimitPill && !!usage?.isNearLimit}
            />
          ) : null
        }
      />
      <div className="relative z-[1] flex h-[calc(100svh-calc(var(--gap)*2))] min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Horizontal split — content card + (opsiyonel) side panel.
              Side panel translucent white card, content kart ile aynı stil. */}
          <div className="flex min-h-0 flex-1">
            <div
              className="isolate flex min-w-0 flex-1 flex-col"
              style={{
                transform: isAiDrawerExpanded ? 'scale(0.98)' : 'scale(1)',
                transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                transformOrigin: 'center',
              }}
            >
              <WorkspaceTabs>{children}</WorkspaceTabs>
            </div>
            {sidePanel && (
              <div className="flex shrink-0">
                {/* Resize handle — sol sidebar ile aynı; çizgi default görünmez,
                    hover/resize'da belirir. Çift tık varsayılan genişliğe döner. */}
                <div
                  onPointerDown={startSidePanelResize}
                  onDoubleClick={() => {
                    setSidePanelWidth(SP_DEFAULT);
                    try {
                      localStorage.setItem(
                        'balina-sidepanel-width',
                        String(SP_DEFAULT),
                      );
                    } catch {
                      /* yok say */
                    }
                  }}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Paneli yeniden boyutlandır"
                  className="group flex w-2.5 shrink-0 cursor-col-resize items-stretch justify-center"
                >
                  <span
                    className={`w-1.5 rounded-[0.125rem] transition-colors ${
                      sidePanelResizing
                        ? 'bg-[var(--balina-neutral-dark-30)]'
                        : 'bg-transparent group-hover:bg-[var(--balina-neutral-dark-20)]'
                    }`}
                  />
                </div>
                <SidePanelCard width={sidePanelWidth}>{sidePanel}</SidePanelCard>
              </div>
            )}
            {aiRender && !isBalinaAiFloating && (
              <div className="flex shrink-0">
                {/* Resize handle — akışta (in-flow) gutter; çizgi default görünmez,
                    hover/resize'da belirir. */}
                <div
                  onPointerDown={startAiResize}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="AI panelini yeniden boyutlandır"
                  className="group flex w-2.5 shrink-0 cursor-col-resize items-stretch justify-center"
                >
                  <span
                    className={`w-1.5 rounded-[0.125rem] transition-colors ${
                      aiResizing
                        ? 'bg-[var(--balina-neutral-dark-30)]'
                        : 'bg-transparent group-hover:bg-[var(--balina-neutral-dark-20)]'
                    }`}
                  />
                </div>
                {/* Clip katmanı — genişlik animasyonuyla sabit genişlikli paneli açar. */}
                <div
                  className="overflow-hidden"
                  style={{
                    width: `${aiAnimW}px`,
                    willChange: 'width',
                    transition: aiResizing
                      ? 'none'
                      : 'width 240ms cubic-bezier(0.32, 0.72, 0, 1)',
                  }}
                >
                  <aside
                    className="flex h-full shrink-0 flex-col overflow-hidden"
                    style={{ width: `${aiWidth}px` }}
                  >
                    <BalinaChat
                      floating={false}
                      onToggleFloating={toggleBalinaAiFloating}
                      onClose={handleAiCloseAndReset}
                      quickActions={aiMessages.length === 0 ? aiQuickActions : undefined}
                      contextSlot={aiContextSlot}
                      onFiles={handleAiFiles}
                      onAddContext={() => setAiContextOpen(true)}
                      inputRef={aiInputRef}
                      mode={aiMode}
                      onModeChange={handleModeChange}
                      onSend={handleAiSend}
                    >
                      {aiMessagesContent}
                    </BalinaChat>
                  </aside>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Eski AI fab kaldırıldı (yeni AI paneline taşındı); plan/kullanım
            uyarısı artık sidebar'da footer'ın üstünde. */}
      </div>

      {/* Yüzen AI penceresi — sayfa üzerinde serbest sürüklenebilir (portal) */}
      {aiRender &&
        isBalinaAiFloating &&
        floatPos &&
        createPortal(
          <div
            className="fixed z-[9998]"
            style={{
              left: `${floatPos.x}px`,
              top: `${floatPos.y}px`,
              width: `${FLOAT_W}px`,
              height: `${FLOAT_H}px`,
              animation: `${
                aiClosing ? 'balina-ai-float-out' : 'balina-ai-float-in'
              } ${aiClosing ? AI_CLOSE_MS : 200}ms cubic-bezier(0.32, 0.72, 0, 1) both`,
            }}
          >
            <BalinaChat
              floating
              onToggleFloating={toggleBalinaAiFloating}
              onHeaderPointerDown={startFloatDrag}
              onClose={handleAiCloseAndReset}
              quickActions={aiMessages.length === 0 ? aiQuickActions : undefined}
              contextSlot={aiContextSlot}
              onFiles={handleAiFiles}
              onAddContext={() => setAiContextOpen(true)}
              inputRef={aiInputRef}
              mode={aiMode}
              onModeChange={handleModeChange}
              onSend={handleAiSend}
            >
              {aiMessagesContent}
            </BalinaChat>
          </div>,
          document.body,
        )}
    </main>
  );
}
