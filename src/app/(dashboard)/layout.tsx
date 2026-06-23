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
  BalinaChat,
  BalinaChatQuickAction,
  BalinaChatUserMessage,
  BalinaChatStatus,
  BalinaChatMedia,
  toast,
  type BalinaChatInputHandle,
  type BalinaChatMode,
} from '@/components/balina';
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
  | { id: string; role: 'assistant'; kind: 'video'; url: string };

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
  const generateImageRaw = useAiStore((s) => s.generateImageRaw);
  const generateVideoRaw = useAiStore((s) => s.generateVideoRaw);
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
        // Görsel doğrudan üretilir (FASHN sanal deneme: imageUrls[0]=kişi,
        // imageUrls[1]=kıyafet). Model + üretim modu backend'de entegrasyon
        // ayarından (seçili agent) gelir.
        const r = await generateImageRaw(aiCompanyId, { prompt, imageUrls });
        if (r.url) push({ id: `a${++aiMsgId.current}`, role: 'assistant', kind: 'image', url: r.url });
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
        ) : m.kind === 'video' ? (
          <div key={m.id} className="flex px-2 py-1">
            <BalinaChatMedia url={m.url} type="video" />
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
          {aiMode === 'video'
            ? 'Video oluşturuluyor…'
            : aiMode === 'image'
              ? 'Görsel oluşturuluyor…'
              : 'Yanıt hazırlanıyor…'}
        </BalinaChatStatus>
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
