'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  FileText,
  Paperclip,
  Picture,
  Play,
  Sparkles,
  Xmark,
} from '@gravity-ui/icons';

import {
  BalinaButton,
  BalinaDropdown,
  BalinaDropdownItem,
  toast,
} from '@/components/balina';
import {
  useAiCreatorStore,
  useAiCreatorHistoryStore,
  deriveSessionTitle,
  buildVideoPrompt,
  type ChatMode,
} from '@/stores/aiCreatorStore';
import {
  useAiStore,
  MODEL_CATALOG,
  DEFAULT_IMAGE_MODEL,
  maxImagesForModel,
} from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useUIStore } from '@/stores/uiStore';
import { applySkuOverlayToImage } from '@/lib/sku-overlay';
import { resizeImageToDataUrl } from '@/lib/image-resize';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

interface Props {
  variant: 'drawer' | 'full';
  onClose?: () => void;
}

/**
 * Figma 12249:6499 / 12249:7085 / 12249:7171 / 12249:7374 — yeni serbest
 * sohbet paneli. Tek composer + mesaj akışı, "Araçlar" menüsünde mode
 * seçimi (Görsel/Video Oluştur), composer üstünde attached image preview.
 */
export function GuidedAiChatPanel({ variant, onClose }: Props) {
  const router = useRouter();
  const { currentCompany } = useCompanyStore();

  /** Eksik entegrasyon → /stores'a yönlendir, ilgili tile'ı highlight et.
   *  Stores sayfası `?highlight=<id>` query'sini okuyup scale animasyonu uygular. */
  const redirectToIntegration = (
    integrationId: 'OPENAI' | 'FAL_AI',
    label: string,
  ) => {
    if (!currentCompany?.slug) return;
    toast.warning(`${label} entegrasyonu yok — bağla sayfasından ekleyin`);
    router.push(`/${currentCompany.slug}/stores?highlight=${integrationId}`);
    if (onClose) onClose();
  };
  const {
    integrations,
    selectedImageModelId,
    selectedVideoModelId,
    setSelectedImageModelId,
    setSelectedVideoModelId,
    fetchIntegrations,
    generateImageRaw,
    generateVideoRaw,
    generateText: generateTextRaw,
  } = useAiStore();
  const isAiDrawerExpanded = useUIStore((s) => s.isAiDrawerExpanded);
  const toggleAiDrawerExpanded = useUIStore((s) => s.toggleAiDrawerExpanded);

  const {
    sessionId,
    messages,
    mode,
    attachedImages,
    productCode,
    start,
    appendMessage,
    removeMessage,
    setMode,
    addAttachedImage,
    removeAttachedImage,
    clearAttachedImages,
    setProductCode,
  } = useAiCreatorStore();
  const saveSnapshot = useAiCreatorHistoryStore((s) => s.saveSnapshot);
  const fetchSessions = useAiCreatorHistoryStore((s) => s.fetchSessions);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [composerText, setComposerText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // textarea focus iken chroma sweep durur (kullanıcı odakta yazıyor,
  // çevredeki animasyon dikkat dağıtmasın). Blur olunca tekrar açılır.
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  // Tıklanan AI media için fullscreen overlay state — null iken kapalı.
  const [mediaPreview, setMediaPreview] = useState<AiMediaPreviewItem | null>(
    null,
  );

  // Sabit eşleme (kullanıcı kararı): metin = OpenAI, görsel = Fal, video = Fal Kling.
  const textIntegration =
    integrations.find((i) => i.provider === 'openai' && i.isActive) ?? null;
  const imageIntegration =
    integrations.find((i) => i.provider === 'fal' && i.isActive) ?? null;
  const videoIntegration =
    integrations.find((i) => i.provider === 'fal' && i.isActive) ?? null;
  // Text default mode olduğu için en azından bir entegrasyon yeterli — empty
  // state sadece HİÇBİR entegrasyon yokken gösterilir.
  const hasIntegration =
    !!textIntegration || !!imageIntegration || !!videoIntegration;
  // Aktif modeller — composer'daki Model dropdown'undan seçilmişse onu
  // kullan, yoksa provider'a göre default'a düş.
  // Öncelik: composer'da elle seçilen > entegrasyon ayarındaki varsayılan > genel default.
  const selectedImageModel =
    selectedImageModelId ?? imageIntegration?.imageModel ?? DEFAULT_IMAGE_MODEL;
  // Composer'da explicit seçim varsa onu kullan; yoksa Fal entegrasyonunda
  // kayıtlı varsayılan video modeline, o da yoksa Veo 3.1 Fast I2V'ye düş.
  const selectedVideoModel =
    selectedVideoModelId ??
    videoIntegration?.videoModel ??
    'fal-ai/kling-video/v2.1/standard/image-to-video';

  useEffect(() => {
    if (currentCompany?.id) {
      fetchIntegrations(currentCompany.id);
      fetchSessions(currentCompany.id);
    }
  }, [currentCompany?.id, fetchIntegrations, fetchSessions]);

  // İlk açılışta selamlama bot mesajı. Mevcut entegrasyonlara göre uyarlanır.
  useEffect(() => {
    if (messages.length === 0 && hasIntegration) {
      let greeting: string;
      if (textIntegration) {
        greeting =
          'Merhaba! Ben balinaOS AI. Soru sorabilir, ürün açıklaması üretebilir veya pazarlama metni yazmamı isteyebilirsin. Görsel/video için composer\'dan modu değiştir.';
      } else if (videoIntegration && !imageIntegration) {
        greeting =
          'Merhaba! Ürün videosu oluşturmak için bir görsel ekleyin ve oluştur\'a basın.';
      } else if (imageIntegration && !videoIntegration) {
        greeting =
          'Merhaba! Görsel oluşturmak için görselleri ekleyin ve istediğinizi yazın.';
      } else {
        greeting =
          'Merhaba! Composer\'da modu seçin (Görsel/Video), görsel ekleyin ve istediğinizi yazın.';
      }
      start(greeting);
    }
  }, [
    messages.length,
    hasIntegration,
    textIntegration,
    videoIntegration,
    imageIntegration,
    start,
  ]);

  // OpenAI bağlı değilse text modu kullanılamaz — entegrasyonlar yüklendiğinde
  // uygun bir moda geç (video öncelikli, sonra görsel). Aksi halde composer
  // "Metin" modunda takılı kalır ve gönderim OpenAI uyarısı verir.
  useEffect(() => {
    if (mode === 'text' && !textIntegration) {
      if (videoIntegration) setMode('video');
      else if (imageIntegration) setMode('image');
    }
  }, [mode, textIntegration, videoIntegration, imageIntegration, setMode]);

  // Composer'ın video modelini entegrasyonda kayıtlı varsayılan modele eşitle.
  // Settings'te seçilen model değişince composer da güncellenir ve eski persist
  // edilmiş seçim (örn. Kling) düzeltilir. Sadece kayıtlı model değişince çalışır
  // — kullanıcı dropdown'dan değiştirirse oturum içinde korunur.
  useEffect(() => {
    const m = videoIntegration?.videoModel;
    if (m && m !== selectedVideoModelId) {
      setSelectedVideoModelId(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoIntegration?.videoModel]);

  // Mesaj listesi her güncellendiğinde en alta kaydır.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  // composerText sıfırlandığında (send sonrası) textarea inline height'ını
  // resetle — auto-grow onChange'de büyütülmüş satırları temizler.
  useEffect(() => {
    if (composerText === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [composerText]);

  // Backend snapshot — debounced.
  useEffect(() => {
    if (!sessionId || !currentCompany?.id) return;
    const meaningful = messages.some(
      (m) => m.kind === 'user-text' || m.kind === 'bot-image' || m.kind === 'bot-video',
    );
    if (!meaningful) return;
    const snapshotState = {
      messages: messages.filter((m) => m.kind !== 'pending'),
      mode,
      productCode,
    };
    const handle = window.setTimeout(() => {
      saveSnapshot(currentCompany.id, {
        id: sessionId,
        title: deriveSessionTitle(snapshotState),
        createdAt: Number(sessionId.split('-')[0]) || Date.now(),
        updatedAt: Date.now(),
        state: snapshotState,
      });
    }, 1200);
    return () => window.clearTimeout(handle);
  }, [sessionId, currentCompany?.id, messages, mode, productCode, saveSnapshot]);

  /* ---------------- Image attach ---------------- */

  // Seçili modele göre maks. referans görsel (FASHN tryon 2 · nano-banana 14).
  const MAX_ATTACHED_IMAGES = maxImagesForModel(selectedImageModel);

  const handleAttachFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      toast.danger('Lütfen bir görsel dosyası seçin');
      return;
    }
    const remaining = MAX_ATTACHED_IMAGES - attachedImages.length;
    if (remaining <= 0) {
      toast.danger(`En fazla ${MAX_ATTACHED_IMAGES} görsel ekleyebilirsiniz`);
      return;
    }
    const accepted = list.slice(0, remaining);
    for (const file of accepted) {
      // 2K (en uzun kenar 2048px) kalitede yeniden boyutlandır.
      const url = await resizeImageToDataUrl(file, 2048, 0.92).catch(() => '');
      if (url) addAttachedImage(url);
    }
  };

  /* ---------------- Send ---------------- */

  const handleSend = async () => {
    if (!currentCompany?.id || isGenerating) return;
    const rawText = composerText.trim();

    if (!rawText && attachedImages.length === 0) return;

    // "Kod: XYZ" / "kod:XYZ" patternini parse et — kod productCode'a yazılır,
    // prompt metninden temizlenir. Backend'e gönderilecek prompt'ta sadece
    // kullanıcının görsel/video tarifi kalır.
    const codeMatch = rawText.match(/(?:^|[\s,.;])kod\s*[:=]\s*([\w-]+)/i);
    if (codeMatch?.[1]) {
      setProductCode(codeMatch[1]);
    }
    const promptText = rawText.replace(/(?:^|[\s,.;])kod\s*[:=]\s*[\w-]+/i, '').trim();

    // Text mode → OpenAI chat completions (sohbet / açıklama üretimi).
    if (mode === 'text') {
      setComposerText('');
      await runTextGeneration(promptText);
      return;
    }

    // Mode artık explicit: image veya video (text yukarıda early-return etti,
    // auto kaldırıldı). Type assertion ile narrow et — diğer chat akışı bu
    // değişkene image/video bekliyor.
    const resolvedMode: 'image' | 'video' =
      mode === 'image' || mode === 'video' ? mode : 'image';

    // Mesaj akışına user girdisini ekle.
    if (attachedImages.length > 0) {
      attachedImages.forEach((url) => {
        appendMessage({
          id: '',
          kind: 'user-image',
          url,
          createdAt: Date.now(),
          name: 'gorsel',
          ext: extFromUrl(url),
        });
      });
    }
    if (rawText) {
      appendMessage({ id: '', kind: 'user-text', text: rawText });
    }

    const filesForRequest = [...attachedImages];
    const promptForRequest = promptText;
    setComposerText('');
    clearAttachedImages();
    setIsGenerating(true);

    const pendingId = `pending-${Date.now()}`;
    appendMessage({
      id: pendingId,
      kind: 'pending',
      label:
        resolvedMode === 'image'
          ? 'AI ile görsel oluşturuluyor…'
          : 'AI ile video oluşturuluyor (1-3 dk sürebilir)…',
      mode: resolvedMode,
    });

    try {
      if (resolvedMode === 'image') {
        await runImageGeneration(promptForRequest, filesForRequest);
      } else {
        await runVideoGeneration(promptForRequest, filesForRequest);
      }
    } finally {
      removeMessage(pendingId);
      setIsGenerating(false);
    }
  };

  const runTextGeneration = async (promptText: string) => {
    if (!currentCompany?.id) return;
    if (!textIntegration) {
      redirectToIntegration('OPENAI', 'OpenAI');
      return;
    }
    if (!promptText.trim()) {
      pushBotError('Boş mesaj gönderilemez');
      return;
    }
    // User mesajı ekle
    appendMessage({ id: '', kind: 'user-text', text: promptText });
    setIsGenerating(true);
    const pendingId = `pending-${Date.now()}`;
    appendMessage({
      id: pendingId,
      kind: 'pending',
      label: 'balinaOS AI düşünüyor…',
      mode: 'text',
    });
    try {
      // Mevcut sohbet geçmişini chat completions formatına çevir.
      const history = messages
        .filter(
          (m): m is typeof m & { kind: 'user-text' | 'bot-text' } =>
            m.kind === 'user-text' || m.kind === 'bot-text',
        )
        .map((m) => ({
          role: m.kind === 'user-text' ? ('user' as const) : ('assistant' as const),
          content: m.kind === 'user-text' ? m.text : m.text,
        }));
      const systemMsg = {
        role: 'system' as const,
        content: `Sen balinaOS AI asistanısın — bir e-ticaret yönetim panelinin (balinaOS) yerleşik asistanısın.

Kullanıcı sana ŞİRKET VERİSİYLE ALAKALI sorular sorabilir: siparişler, ürünler, stok, mağaza/pazaryeri durumları, aylık/haftalık satış istatistikleri vb. Bu tür sorularda hayal etme — kullanılabilir tool'ları çağırarak gerçek veriyi getir:

Mevcut tool'lar:
- get_order_summary(period): bugün/dün/hafta/ay/yıl satış özeti
- get_recent_orders(limit, status?): son siparişler
- get_top_selling_products(period, limit): en çok satanlar
- get_inventory_summary(): stok özeti
- get_low_stock_products(limit, threshold): kritik stok
- search_products(query, limit): ürün ara
- get_store_list(): bağlı mağazalar
- get_product_history(sku, limit?): SKU'su verilen ürünün tüm geçmiş hareketleri (satışlar + stok değişiklikleri + ürün güncellemeleri, kim yaptı + ne zaman)

KURALLAR:
- Sayısal soru sorulduğunda mutlaka ilgili tool'u çağır; tahmin yürütme.
- Birden fazla tool çağırman gerekirse paralel/sırayla çağır.
- Yanıtların Türkçe, kısa ve doğrudan olsun. Para birimi: ₺.
- Tool sonuçlarındaki currency = 'TRY' alanını ₺ olarak insanlaştır.
- Liste/tablo gerektiren cevaplarda madde işareti kullan.
- Ürün açıklaması yazma, pazarlama metni vb. yaratıcı görevlerde tool'u kullanma — sadece yaz.

ÖZEL DURUMLAR:
- Tool sonucunda \`_hint\` alanı varsa (örn. totalOrdersAllTime, latestOrderDate), bunu kullanıcıya açıklarken yorumla. Örn: "Bu dönemde sipariş yok ama sistemde toplam X sipariş var, en son sipariş şu tarihte". Sadece "0 sipariş" deyip geçme.
- Sipariş/satış sorularında belirli bir dönem belirtilmemişse 'week' kullan ama 0 dönerse 'month' ve 'year' ile de dene; en azından bir veri bul.
- Tarihleri Türkçe gün/ay/yıl formatında yaz (örn. 12 May 2026).

ÜRÜN GEÇMİŞİ:
- Kullanıcı bir SKU veya ürün koduyla "geçmiş hareketler", "kim ne zaman stok düşürdü", "ne zaman satıldı" gibi sorular sorarsa \`get_product_history\` tool'unu kullan.
- Chat alanı DAR olduğu için **tablo kullanma** — onun yerine dikey markdown listesi yaz. Her olay için tek bir madde, içinde tek satır kalın başlık + altında 2-3 satır detay. Şu formatı kullan:
  - **DD.MM.YYYY HH:MM — Satış (Shopify Mağazam)**
    1 adet, ₺250, sipariş #1008
  - **DD.MM.YYYY HH:MM — Stok Güncelleme**
    user@x.com tarafından, +5 adet
- Birden fazla mağazada aynı SKU varsa olayları kronolojik tek listede ver, "mağaza" detayda gözüksün.
- Çok fazla olay varsa (>20) en yenileri ver + "toplam X olay" notu ekle.`,
      };
      const result = await generateTextRaw(currentCompany.id, {
        messages: [systemMsg, ...history, { role: 'user', content: promptText }],
      });
      if (!result.text) {
        pushBotError(`Üretim başarısız: ${result.error ?? 'bilinmeyen hata'}`);
        return;
      }
      appendMessage({ id: '', kind: 'bot-text', text: result.text });
    } finally {
      removeMessage(pendingId);
      setIsGenerating(false);
    }
  };

  const runImageGeneration = async (
    promptText: string,
    files: string[],
    explicitCode?: string,
  ) => {
    if (!currentCompany?.id) return;
    if (!imageIntegration) {
      redirectToIntegration('FAL_AI', 'Fal.ai');
      return;
    }
    // FASHN sanal deneme tam 2 görsel ister (kişi + kıyafet); diğer modeller ≥1.
    const isFashnTryon = /fashn\/tryon/.test(selectedImageModel);
    const minImages = isFashnTryon ? 2 : 1;
    if (files.length < minImages) {
      pushBotError(
        isFashnTryon
          ? 'FASHN sanal deneme için 2 görsel ekleyin: 1) kişi/manken, 2) kıyafet.'
          : 'Görsel üretimi için en az 1 referans görsel ekleyin.',
      );
      return;
    }
    const prompt =
      promptText || 'Bu referans görsel(ler)den yüksek kaliteli bir ürün görseli üret.';
    const result = await generateImageRaw(currentCompany.id, {
      prompt,
      model: selectedImageModel,
      imageUrls: files,
    });
    if (!result.url) {
      pushBotError(`Üretim başarısız: ${result.error ?? 'bilinmeyen hata'}`);
      return;
    }
    // explicitCode kod-bekleme akışından gelir; productCode store'a yeni
    // yazıldıysa bu render'da henüz okunamayabilir, o yüzden parametre tercih.
    const code = explicitCode?.trim() || productCode.trim();
    const prefix = imageIntegration?.codePrefix?.trim() ?? '';
    const sku = code ? (prefix ? `${prefix}-${code}` : code) : '';
    const overlaid = sku
      ? await applySkuOverlayToImage(result.url, sku)
      : { url: result.url, embedded: false };
    appendMessage({
      id: '',
      kind: 'bot-image',
      url: overlaid.url,
      sku,
      skuEmbedded: overlaid.embedded,
      createdAt: Date.now(),
    });
    // Bir sonraki ürün için kod tekrar sorulsun.
    setProductCode('');
  };

  const runVideoGeneration = async (promptText: string, files: string[]) => {
    if (!currentCompany?.id) return;
    if (!videoIntegration) {
      redirectToIntegration('FAL_AI', 'Fal.ai');
      return;
    }
    if (files.length === 0) {
      pushBotError(
        'Video üretimi için en az bir başlangıç görseli gerekli. Lütfen bir görsel ekleyin.',
      );
      return;
    }
    // Kullanıcı bir şey yazdıysa zenginleştir; boş bıraktıysa boş gönder —
    // backend entegrasyon ayarındaki kayıtlı (native/genel) prompt'u uygular.
    const prompt = promptText.trim() ? buildVideoPrompt(promptText) : '';
    const result = await generateVideoRaw(currentCompany.id, {
      prompt,
      imageUrl: files[0],
      endImageUrl: files[1],
      model: selectedVideoModel,
    });
    if (!result.url) {
      pushBotError(`Üretim başarısız: ${result.error ?? 'bilinmeyen hata'}`);
      return;
    }
    // Video tarafında kod/SKU yok — üretilen videoyu doğrudan göster.
    appendMessage({
      id: '',
      kind: 'bot-video',
      url: result.url,
      createdAt: Date.now(),
    });
  };

  const pushBotError = (text: string) =>
    appendMessage({ id: '', kind: 'bot-text', text });

  /* ---------------- UI ---------------- */

  const isDrawer = variant === 'drawer';

  // Empty state kaldırıldı: drawer her zaman composer'la açık. Eksik
  // entegrasyon durumunda send handler kullanıcıyı /stores'a yönlendirip
  // ilgili tile'ı highlight ediyor (redirectToIntegration helper).

  return (
    <div
      className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg"
      style={{
        background: [
          'linear-gradient(0deg, rgba(255,255,255,0.96), rgba(255,255,255,0.96))',
          'linear-gradient(180deg, rgba(252,252,252,0.7) 0%, rgba(252,252,252,0.4) 100%)',
        ].join(', '),
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: [
          '0 0 0 1px rgba(0,0,0,0.04)',
          '0 0 2px 0 rgba(0,0,0,0.04)',
          '0 4px 6px -2px rgba(0,0,0,0.04)',
          '0 16px 28px -8px rgba(0,0,0,0.04)',
          '0 24px 40px -12px rgba(0,0,0,0.08)',
        ].join(', '),
      }}
    >
      {/* Header — 48px, absolute. Beyaz progressive blur: üstte tam opak
          beyaz, alta doğru transparanlaşır; backdrop-filter + mask ile
          altından kayan mesajlar yumuşakça bulanıklaşır. */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex h-12 items-center justify-between gap-1 overflow-hidden px-2.5"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 55%, rgba(255,255,255,0) 100%)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          maskImage:
            'linear-gradient(to bottom, #000 55%, rgba(0,0,0,0.6) 80%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, #000 55%, rgba(0,0,0,0.6) 80%, transparent 100%)',
        }}
      >
        {/* Sol: balinaOS AI title (logo + label, statik). */}
        <div className="flex h-7 flex-1 items-center gap-1.5">
          <BalinaOsMark
            className="h-4 w-4 shrink-0"
            style={{ color: 'var(--balinaos-icon-loud)' }}
            aria-hidden="true"
          />
          <span
            className="text-[13px] font-medium leading-none"
            style={{ color: 'var(--balinaos-text-shout)' }}
          >
            balinaOS AI
          </span>
        </div>

        {/* Sağ: Genişlet (desktop-only) + Kapat. Mobile yalnızca close. */}
        {isDrawer && (
          <div className="flex h-7 items-center gap-1">
            <BalinaButton
              variant="ghost"
              size="small"
              aria-label={isAiDrawerExpanded ? 'Daralt' : 'Genişlet'}
              onClick={() => toggleAiDrawerExpanded()}
              className="max-sm:hidden"
            >
              {/* Corner brackets — expanded iken içe-doğru (shrink),
                  daraltılmışken dışa-doğru (expand). */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {isAiDrawerExpanded ? (
                  <>
                    <path d="M3 9h4v4" />
                    <path d="M13 7H9V3" />
                  </>
                ) : (
                  <>
                    <path d="M3 9v4h4" />
                    <path d="M13 7V3h-4" />
                  </>
                )}
              </svg>
            </BalinaButton>
            {onClose && (
              <BalinaButton
                variant="ghost"
                size="small"
                aria-label="Kapat"
                onClick={onClose}
              >
                <Xmark className="h-4 w-4" />
              </BalinaButton>
            )}
          </div>
        )}
      </div>

      {/* Messages — sadece drawer expanded iken %50 ortalı kolon; normal
          drawer modunda tam genişlik kullanır (dar olduğu için). Üstte
          header'ın altından akış için pt-12 (header 48px). */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-12"
      >
        <div
          className={`mx-auto w-full px-2 py-4 ${
            isAiDrawerExpanded ? 'sm:max-w-[50%]' : ''
          }`}
        >
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-col">
                <MessageView message={m} onOpenPreview={setMediaPreview} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Empty state suggestions — kullanıcı henüz mesaj göndermedi.
          Mod'a göre filtrelenir: text → hiç gözükmez, image → görsel, video → video. */}
      {mode !== 'text' &&
        !messages.some(
          (m) => m.kind === 'user-text' || m.kind === 'user-image',
        ) && (
          <div
            className={`relative z-20 mx-auto w-full px-4 pb-5 pt-2 ${
              isAiDrawerExpanded ? 'sm:max-w-[50%]' : ''
            }`}
          >
            <div className="flex flex-wrap gap-2">
              {mode === 'image' && (
                <BalinaButton
                  size="small"
                  variant="soft"
                  onClick={() => {
                    setComposerText('Yeni bir ürün görseli oluştur');
                  }}
                  className="h-8 gap-1.5 text-xs font-medium"
                  leftIcon={<Picture className="h-3.5 w-3.5 text-muted" />}
                >
                  Yeni bir ürün görseli oluştur
                </BalinaButton>
              )}
              {mode === 'video' && (
                <BalinaButton
                  size="small"
                  variant="soft"
                  onClick={() => {
                    setComposerText('Ürün videosu oluştur');
                  }}
                  className="h-8 gap-1.5 text-xs font-medium"
                  leftIcon={<Play className="h-3.5 w-3.5 text-muted" />}
                >
                  Ürün videosu oluştur
                </BalinaButton>
              )}
            </div>
          </div>
        )}

      {/* Composer — sticky bottom, üst kenarda beyaz progressive blur (Header
          ile simetrik). Mesaj listesi alttan composer arkasına doğru kayar ve
          fade ile yumuşakça gözden kaybolur — keskin kesik gitmez. */}
      <div
        className={`relative mx-auto w-full px-2 pb-2 ${
          isAiDrawerExpanded ? 'sm:max-w-[50%]' : ''
        }`}
      >
        {/* Üst fade: composer container'ın hemen üstünde 28px'lik beyaz
            gradient + backdrop blur. Mesaj listesi bunun ardından geçince
            yumuşakça erir. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 -top-7 h-7"
          style={{
            background:
              'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            maskImage:
              'linear-gradient(to top, #000 40%, rgba(0,0,0,0.6) 75%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to top, #000 40%, rgba(0,0,0,0.6) 75%, transparent 100%)',
          }}
        />
        <div
          className={`relative flex flex-col gap-2.5 rounded-md p-2.5 ${
            isDragging || isComposerFocused ? '' : 'chroma-border'
          }`}
          style={{
            backgroundImage: 'var(--balinaos-bg-raised-shout)',
            boxShadow: [
              '0 0 0 1px var(--balinaos-neutral-dark-4)',
              '0 4px 12px 0 var(--balinaos-neutral-dark-2)',
              '0 8px 24px 0 var(--balinaos-neutral-dark-2)',
              '0 16px 32px 0 var(--balinaos-neutral-dark-4)',
              '0 32px 48px 0 var(--balinaos-neutral-dark-2)',
            ].join(', '),
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
          onDragEnter={(e) => {
            // Text modunda görsel attach yok → drag handlers no-op.
            if (mode === 'text') return;
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
              setIsDragging(true);
            }
          }}
          onDragOver={(e) => {
            if (mode === 'text') return;
            if (e.dataTransfer.types.includes('Files')) e.preventDefault();
          }}
          onDragLeave={(e) => {
            if (mode === 'text') return;
            if (
              !e.relatedTarget ||
              !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)
            ) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            if (mode === 'text') return;
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              void handleAttachFiles(e.dataTransfer.files);
            }
          }}
        >
          {isDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md backdrop-blur-sm"
              style={{ background: 'var(--balinaos-bg-dark-strong)' }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--balinaos-text-loud)' }}
              >
                Görseli buraya bırakın
              </span>
            </div>
          )}

          {/* contextRow — eklenen görsellerin chip listesi (Define ChatInput
              contextRow spec: min-height 32px, gap 4px, flex-wrap). */}
          {attachedImages.length > 0 && (
            <div className="flex min-h-8 flex-wrap items-center gap-1">
              {attachedImages.map((url, i) => (
                <div
                  key={i}
                  className="relative flex h-8 items-center gap-1.5 rounded-[0.5rem] px-1.5"
                  style={{ background: 'var(--balinaos-bg-dark-muted)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: 'var(--balinaos-text-shout)' }}
                  >
                    {`Görsel ${i + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachedImage(i)}
                    aria-label="Görseli kaldır"
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--balinaos-bg-dark-strong)]"
                    style={{ color: 'var(--balinaos-icon-strong)' }}
                  >
                    <Xmark className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* inputRow — border yok, sade textarea. Auto-grow:
              content değiştikçe height yeniden hesaplanır (max 7.5rem).
              NOT: <div> kullanıyoruz, <label> değil. Label içine gizli file
              input koyarsak click event'i textarea'ya değil file picker'a
              gider (HTML label-input association). */}
          <div
            className="flex min-h-9 cursor-text items-start gap-1.5 p-1.5"
            onClick={(e) => {
              // Composer alanına click → textarea'ya focus. Hidden file input
              // tıklanmasın diye explicit target check yok — sadece focus.
              if (e.target === e.currentTarget) {
                textareaRef.current?.focus();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void handleAttachFiles(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <textarea
              ref={textareaRef}
              value={composerText}
              onChange={(e) => {
                setComposerText(e.target.value);
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              onPaste={(e) => {
                const item = Array.from(e.clipboardData.items).find((it) =>
                  it.type.startsWith('image/'),
                );
                const file = item?.getAsFile();
                if (file) {
                  e.preventDefault();
                  void handleAttachFiles([file]);
                }
              }}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              placeholder="balinaOS AI sor..."
              rows={1}
              className="block w-full resize-none rounded-sm border-none bg-transparent px-1 text-[14px] leading-6 outline-none placeholder:text-[var(--balinaos-text-faint)] focus:placeholder:text-[var(--balinaos-text-muted)]"
              style={{
                color: 'var(--balinaos-text-shout)',
                minHeight: '1.5rem',
                maxHeight: '7.5rem',
                overflowY: 'auto',
              }}
            />
          </div>

          {/* actionsRow — HeroUI v3 Button kullanır. Toolbar bottom'a daha
              fazla nefes alanı için pb-1.5 (composer container'a ek olarak). */}
          <div className="flex h-8 items-center justify-between pb-1.5">
            <div className="flex h-8 items-center gap-1">
              {/* Paperclip + Tools — text modunda dosya yükleme yok, sadece mode chip. */}
              {mode !== 'text' && (
                <>
                  <BalinaButton
                    aria-label="Dosya ekle"
                    onClick={() => fileInputRef.current?.click()}
                    variant="ghost"
                    size="small"
                    className="h-8 w-8 min-w-8 rounded-lg"
                  >
                    <Paperclip
                      className="h-4 w-4"
                      style={{ color: 'var(--balinaos-icon-strong)' }}
                    />
                  </BalinaButton>
                  <ComposerDivider />
                </>
              )}
              <ToolsButton
                mode={mode}
                onSelect={setMode}
                hasTextIntegration={!!textIntegration}
                hasImageIntegration={!!imageIntegration}
                hasVideoIntegration={!!videoIntegration}
              />
            </div>
            <div className="flex h-8 items-center gap-1">
              {/* Model dropdown text modunda gizli — OpenAI tek model. */}
              {mode !== 'text' && (
                <ModelDropdown
                  mode={mode}
                  imageModelId={selectedImageModel}
                  videoModelId={selectedVideoModel}
                  onImageSelect={setSelectedImageModelId}
                  onVideoSelect={setSelectedVideoModelId}
                />
              )}
              <SendButton
                onPress={() => void handleSend()}
                isActive={!!composerText.trim() || attachedImages.length > 0}
                isDisabled={
                  isGenerating ||
                  (!composerText.trim() && attachedImages.length === 0)
                }
              />
            </div>
          </div>
        </div>
      </div>
      {mediaPreview && (
        <AiMediaOverlay
          item={mediaPreview}
          onClose={() => setMediaPreview(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function AiLogo() {
  // balinaOS resmi marka — siyah balina silüeti. Tüm AI-bağlı yüzeylerde
  // (chat header, fab launcher) aynı vector mark kullanılır.
  return (
    <BalinaOsMark
      className="h-5 w-5 shrink-0 text-foreground"
      role="img"
      aria-label="balinaOS"
    />
  );
}

/** Mode picker dropdown — HeroUI Dropdown wrapper. Popover yukarı açılır
 *  (composer altta olduğu için). selectionMode="single" + selectedKeys ile
 *  aktif mode'a check basar. */
function ModeDropdown({
  mode,
  onSelect,
  hasTextIntegration,
  hasImageIntegration,
  hasVideoIntegration,
  triggerClassName,
  triggerContent,
  triggerAriaLabel,
}: {
  mode: ChatMode;
  onSelect: (mode: ChatMode) => void;
  hasTextIntegration: boolean;
  hasImageIntegration: boolean;
  hasVideoIntegration: boolean;
  triggerClassName?: string;
  triggerContent: React.ReactNode;
  triggerAriaLabel?: string;
}) {
  return (
    <BalinaDropdown
      side="top"
      align="start"
      trigger={
        <button
          type="button"
          className={triggerClassName}
          aria-label={triggerAriaLabel}
        >
          <span className="flex items-center gap-1">{triggerContent}</span>
        </button>
      }
    >
      {hasTextIntegration ? (
        <BalinaDropdownItem
          icon={<FileText className="size-4 shrink-0 text-muted" />}
          selected={mode === 'text'}
          onSelect={() => onSelect('text')}
        >
          Metin (OpenAI)
        </BalinaDropdownItem>
      ) : null}
      {hasImageIntegration ? (
        <BalinaDropdownItem
          icon={<Picture className="size-4 shrink-0 text-muted" />}
          selected={mode === 'image'}
          onSelect={() => onSelect('image')}
        >
          Görsel (Fal)
        </BalinaDropdownItem>
      ) : null}
      {hasVideoIntegration ? (
        <BalinaDropdownItem
          icon={<Play className="size-4 shrink-0 text-muted" />}
          selected={mode === 'video'}
          onSelect={() => onSelect('video')}
        >
          Video (Fal)
        </BalinaDropdownItem>
      ) : null}
    </BalinaDropdown>
  );
}

/** Composer'da gruplar arası dikey ayırıcı — Define ChatInput_divider spec.
 *  9px geniş kapsayıcı içinde 1×16 hairline. */
function ComposerDivider() {
  return (
    <span
      className="flex h-8 w-[9px] items-center justify-center"
      aria-hidden="true"
    >
      <span
        className="h-4 w-px rounded-full"
        style={{ background: 'var(--balinaos-border-strong)' }}
      />
    </span>
  );
}

/** Send butonu — Define ChatInput_sendButton spec. 32×32 round.
 *  Active (compose text/files): bg neutral-dark-90, icon light-100.
 *  Disabled: bg dark-faint, icon faint. */
function SendButton({
  onPress,
  isActive,
  isDisabled,
}: {
  onPress: () => void;
  isActive: boolean;
  isDisabled: boolean;
}) {
  // isActive iken (text/file var) background'da conic-gradient chroma döner;
  // boş/disabled iken sade gri arka plan.
  const iconColor = isActive
    ? 'var(--balinaos-neutral-light-100)'
    : 'var(--balinaos-icon-faint)';
  return (
    <BalinaButton
      size="small"
      variant="primary"
      aria-label="Gönder"
      onClick={onPress}
      disabled={isDisabled}
      className={`h-8 w-8 min-w-8 shrink-0 ${isActive ? 'chroma-bg' : ''}`}
      style={
        isActive ? undefined : { background: 'var(--balinaos-bg-dark-faint)' }
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ color: iconColor }}
      >
        <path d="M3.83 6.67L8 2.5l4.17 4.17M8 13.5V3" />
      </svg>
    </BalinaButton>
  );
}

/** Model dropdown item önündeki provider rozeti —
 *  Fal image kırmızı F, Fal video mavi play. */
function ProviderIcon({
  provider,
  kind,
}: {
  provider: 'fal' | 'openai';
  kind: 'image' | 'video';
}) {
  if (provider === 'openai') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/figma/integrations/openai.svg"
        alt="OpenAI"
        className="h-4 w-4 shrink-0 rounded-full"
        aria-hidden="true"
      />
    );
  }
  if (kind === 'video') {
    return (
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
        style={{
          background: 'linear-gradient(135deg, #60a5fa, #0358f7)',
        }}
        aria-hidden="true"
      >
        <Play className="h-2.5 w-2.5" />
      </span>
    );
  }
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
      style={{
        background: 'linear-gradient(135deg, #fb7185, #ef4444)',
      }}
      aria-hidden="true"
    >
      Fa
    </span>
  );
}

/** Send butonunun solunda model dropdown — aktif mode'a göre filtrelenmiş
 *  model katalogu. Popover içinde search input + sabit yükseklikli
 *  scrollable liste. Seçili model her zaman en üstte gösterilir. */
function ModelDropdown({
  mode,
  imageModelId,
  videoModelId,
  onImageSelect,
  onVideoSelect,
}: {
  mode: ChatMode;
  imageModelId: string;
  videoModelId: string;
  onImageSelect: (id: string | null) => void;
  onVideoSelect: (id: string | null) => void;
}) {
  // Mode 'auto' veya 'image' → image katalog; 'video' → video katalog.
  // Auto'da kullanıcı henüz mode seçmediği için image katalog gösterilir
  // (varsayılan üretim image).
  const kind: 'image' | 'video' = mode === 'video' ? 'video' : 'image';
  const activeId = kind === 'video' ? videoModelId : imageModelId;
  const allModels = MODEL_CATALOG.filter((m) => m.kind === kind);
  const activeMeta = allModels.find((m) => m.id === activeId) ?? allModels[0];

  const [query, setQuery] = useState('');

  // Filtre + sıralama: aktif model her zaman tepede, sonra query'ye uyanlar.
  const normalize = (s: string) => s.toLocaleLowerCase('tr');
  const q = normalize(query.trim());
  const filtered = allModels.filter((m) => !q || normalize(m.label).includes(q));
  const ordered = [
    ...filtered.filter((m) => m.id === activeId),
    ...filtered.filter((m) => m.id !== activeId),
  ];

  return (
    <BalinaDropdown
      side="top"
      align="end"
      size="medium"
      trigger={
        <button
          type="button"
          className="inline-flex h-8 max-w-[160px] items-center overflow-hidden rounded-lg bg-transparent px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-black/[0.06]"
          aria-label="Model seç"
        >
          <span className="block w-full truncate text-left">
            {activeMeta?.label ?? 'Model'}
          </span>
        </button>
      }
    >
      {/* Search input — sade, icon yok. */}
      <div
        className="px-2 py-2"
        style={{ borderBottom: '1px solid var(--balinaos-border-default)' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Model ara..."
          className="block w-full rounded-lg border-none bg-transparent px-0 py-0.5 text-xs outline-none placeholder:text-[var(--balinaos-text-faint)] focus:placeholder:text-[var(--balinaos-text-muted)]"
          style={{ color: 'var(--balinaos-text-shout)' }}
          autoFocus
        />
      </div>
      <div className="max-h-[260px] overflow-y-auto">
        {ordered.map((m) => (
          <BalinaDropdownItem
            key={m.id}
            icon={<ProviderIcon provider={m.provider} kind={m.kind} />}
            selected={m.id === activeId}
            onSelect={() => {
              if (kind === 'video') onVideoSelect(m.id);
              else onImageSelect(m.id);
              setQuery('');
            }}
          >
            {m.label}
          </BalinaDropdownItem>
        ))}
        {ordered.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted">
            Eşleşen model yok
          </p>
        )}
      </div>
    </BalinaDropdown>
  );
}

/** Figma 12249:6800 (Araçlar ghost — empty state) + 12249:7101 (Görsel
 *  Oluştur tertiary — mode seçili). */
function ToolsButton({
  mode,
  onSelect,
  hasTextIntegration,
  hasImageIntegration,
  hasVideoIntegration,
}: {
  mode: ChatMode;
  onSelect: (mode: ChatMode) => void;
  hasTextIntegration: boolean;
  hasImageIntegration: boolean;
  hasVideoIntegration: boolean;
}) {
  const label =
    mode === 'text'
      ? 'Metin'
      : mode === 'image'
        ? 'Görsel'
        : mode === 'video'
          ? 'Video'
          : 'Metin';
  const Icon =
    mode === 'image' ? Picture : mode === 'video' ? Play : FileText;
  // text = ghost (gri); image/video = tertiary (mavi) pill.
  const isText = mode === 'text';
  const triggerClass = isText
    ? 'inline-flex h-8 items-center gap-1 rounded-full bg-black/[0.06] px-3 text-sm font-medium text-foreground hover:bg-black/[0.08]'
    : 'inline-flex h-8 items-center gap-1 rounded-full bg-transparent px-3 text-sm font-medium text-[#0485F7] hover:bg-black/[0.04]';
  return (
    <ModeDropdown
      mode={mode}
      onSelect={onSelect}
      hasTextIntegration={hasTextIntegration}
      hasImageIntegration={hasImageIntegration}
      hasVideoIntegration={hasVideoIntegration}
      triggerClassName={triggerClass}
      triggerAriaLabel="Araçlar"
      triggerContent={
        <>
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </>
      }
    />
  );
}

/* ---------------- Message renderers ---------------- */

function MessageView({
  message,
  onOpenPreview,
}: {
  message: GuidedMessageWithKind;
  onOpenPreview: (item: AiMediaPreviewItem) => void;
}) {
  const m = message;
  switch (m.kind) {
    case 'bot-text':
      return <BotBubble>{m.text}</BotBubble>;
    case 'user-text':
      return <UserBubble>{m.text}</UserBubble>;
    case 'bot-image':
      return (
        <div className="self-start">
          <AiMediaCard
            url={m.url}
            type="image"
            sku={m.sku}
            createdAt={m.createdAt}
            showSkuOverlay={!!m.sku && !m.skuEmbedded}
            onOpenPreview={onOpenPreview}
          />
        </div>
      );
    case 'bot-video':
      return (
        <div className="self-start">
          <AiMediaCard
            url={m.url}
            type="video"
            sku={m.sku}
            createdAt={m.createdAt}
            showSkuOverlay={!!m.sku && !m.skuEmbedded}
            onOpenPreview={onOpenPreview}
          />
        </div>
      );
    case 'user-image':
      return (
        <div className="self-end">
          <AiMediaCard
            url={m.url}
            type="image"
            createdAt={m.createdAt}
            nameOverride={m.name}
            extOverride={m.ext}
            onOpenPreview={onOpenPreview}
          />
        </div>
      );
    case 'pending':
      return <PendingBubble label={m.label} mode={m.mode} />;
    default:
      return null;
  }
}

// Tip alias — bir useMemo guard'a gerek yok, doğrudan messages elemanı tipi.
type GuidedMessageWithKind =
  ReturnType<typeof useAiCreatorStore.getState>['messages'][number];

function BotBubble({ children }: { children: React.ReactNode }) {
  // AiResponse — Define spec: padding 4px 32px 4px 4px (sağda nefes), gövde
  // metni 14px/24, kenar yok. Mesaj wrapper'ın self-start'ı dış katmanda.
  // Markdown desteği: OpenAI **bold**, listeler, tablolar; başlıklar tek-line.
  const isString = typeof children === 'string';
  return (
    <div
      className="max-w-[85%] self-start text-[14px] leading-6"
      style={{
        color: 'var(--balinaos-text-shout)',
        padding: '4px 32px 4px 4px',
      }}
    >
      {isString ? (
        <div className="ai-md flex flex-col gap-2">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="my-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="my-1 list-disc space-y-1 pl-5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-1 list-decimal space-y-1 pl-5">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-6">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[12.5px]">
                  {children}
                </code>
              ),
              h1: ({ children }) => (
                <h3 className="my-1 text-[15px] font-semibold">{children}</h3>
              ),
              h2: ({ children }) => (
                <h3 className="my-1 text-[15px] font-semibold">{children}</h3>
              ),
              h3: ({ children }) => (
                <h3 className="my-1 text-[14px] font-semibold">{children}</h3>
              ),
              table: ({ children }) => (
                <div className="my-1 -mx-2 overflow-x-auto">
                  <table className="border-collapse text-[13px]" style={{ minWidth: 'max-content' }}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="whitespace-nowrap border border-black/10 bg-foreground/[0.04] px-2 py-1 text-left font-medium">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="whitespace-nowrap border border-black/10 px-2 py-1">
                  {children}
                </td>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {children as string}
          </ReactMarkdown>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  // UserMessage — Define spec: max-w 23.625rem, padding 10px 16px,
  // border-radius 16px (single-line 24px), bg dark-default. Single-line:
  // width max-content + radius 1.5rem; biz pratikte tek satır kabul ediyoruz.
  return (
    <div
      className="self-end break-words"
      style={{
        maxWidth: '23.625rem',
        padding: '10px 16px',
        borderRadius: '24px',
        background: 'var(--balinaos-bg-dark-default)',
        color: 'var(--balinaos-text-shout)',
        fontSize: '14px',
        lineHeight: '20px',
        width: 'max-content',
      }}
    >
      {children}
    </div>
  );
}

function PendingBubble({ label, mode }: { label: string; mode?: ChatMode }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const mm = Math.floor(elapsed / 60).toString();
  const ss = (elapsed % 60).toString().padStart(2, '0');
  // Text mode'da ikon gösterilmez (OpenAI sohbet için sadece shimmer text).
  const Icon = mode === 'video' ? Play : mode === 'image' ? Picture : null;
  // Define AiStatus_thinkingContainer spec: padding 4px 12px, satır 28px,
  // gap 8px, padding 4px (toggle butonu görünümünde). icon 20×20 +
  // shimmer text + elapsed.
  return (
    <div
      className="self-start"
      style={{ padding: '4px 12px' }}
    >
      <div className="flex h-7 items-center gap-2 rounded-lg p-1">
        {Icon && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center"
            style={{ color: 'var(--balinaos-icon-default)' }}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="ai-text-shimmer text-[13px] font-normal">
            {label}
          </span>
          <span
            className="text-[12px] tabular-nums"
            style={{ color: 'var(--balinaos-text-faint)' }}
          >
            {mm}:{ss}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- AI media card (Claude.ai Files-pane stili) ----------------
 *
 * Default: temiz preview + altta filename / "{EXT} • {relative}".
 * Hover: metadata blur'lanıp yukarı kayar, alt taraftan Download butonu fade-in.
 * Preview tıklaması fullscreen `AiMediaOverlay`'i açar; Download butonu sadece
 * indirir. Video card içinde sessiz autoplay loop oynar (controls'suz);
 * overlay'de native controls aktif.
 */

export interface AiMediaPreviewItem {
  url: string;
  type: 'image' | 'video';
  sku?: string;
  createdAt?: number;
}

function extForType(type: 'image' | 'video'): string {
  // image canvas JPEG verir (sku-overlay.ts toDataURL 'image/jpeg'),
  // video backend ffmpeg ile mp4. SKU yoksa da konsistan kalsın.
  return type === 'image' ? 'jpg' : 'mp4';
}

/** Data URL'den dosya uzantısı çıkarır. `data:image/png;base64,…` → "png".
 *  HTTP URL'leri için fallback gerekirse path'in son `.xxx` parçasını dener. */
function extFromUrl(url: string): string | undefined {
  const m = url.match(/^data:image\/([a-z0-9+.-]+)/i);
  if (m) {
    const mime = m[1].toLowerCase();
    if (mime === 'jpeg') return 'jpg';
    return mime;
  }
  const path = url.split('?')[0];
  const pm = path.match(/\.([a-z0-9]+)$/i);
  return pm ? pm[1].toLowerCase() : undefined;
}

function filenameFor(item: AiMediaPreviewItem): string {
  const base = item.sku?.trim() || (item.type === 'image' ? 'gorsel' : 'video');
  return `${base}.${extForType(item.type)}`;
}

/** Programatik indirme. Cross-origin URL'lerde (`fal.media` vb.) `<a download>`
 *  attribute'u tarayıcı tarafından sessizce yok sayılır ve sayfa video URL'sine
 *  gider — mobilde özellikle bariz. Bu yüzden önce fetch ile blob'a çeviriyoruz,
 *  ardından same-origin blob URL üzerinden download tetikliyoruz. CORS veya
 *  fetch hatasında fallback olarak _blank ile aç. */
async function triggerDownload(url: string, filename: string): Promise<void> {
  const clickAnchor = (href: string, opts?: { newTab?: boolean }) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    if (opts?.newTab) a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Blob/data URL ise direkt indir.
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    clickAnchor(url);
    return;
  }

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    clickAnchor(blobUrl);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // CORS reddi veya network hatası: kullanıcı en azından dosyayı görsün.
    clickAnchor(url, { newTab: true });
  }
}

/** Mesaj metadata satırı için Türkçe relative zaman: "Bugün 15:48",
 *  "Dün 14:20", "08.05 14:20". createdAt yoksa boş döner. */
function formatRelativeTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const hhmm = `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `Bugün ${hhmm}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  if (isYesterday) return `Dün ${hhmm}`;
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}.${mm} ${hhmm}`;
}

function AiMediaCard({
  url,
  type,
  sku,
  createdAt,
  showSkuOverlay,
  onOpenPreview,
  nameOverride,
  extOverride,
}: {
  url: string;
  type: 'image' | 'video';
  sku?: string;
  createdAt?: number;
  showSkuOverlay?: boolean;
  onOpenPreview: (item: AiMediaPreviewItem) => void;
  /** filenameFor()'u bypass eder. User uploads için 'model' / 'urun' geliyor. */
  nameOverride?: string;
  /** extForType()'u bypass eder. Yüklenen dosyanın gerçek uzantısı. */
  extOverride?: string;
}) {
  const ext = extOverride || extForType(type);
  const item: AiMediaPreviewItem = { url, type, sku, createdAt };
  const filename = nameOverride
    ? `${nameOverride}.${ext}`
    : filenameFor(item);
  const subtitle = `${ext.toUpperCase()}${
    createdAt ? ` • ${formatRelativeTime(createdAt)}` : ''
  }`;
  return (
    <div className="group relative flex w-[320px] cursor-pointer flex-col gap-1 rounded-3xl pb-3 transition-colors hover:bg-black/[0.04]">
      <div className="flex flex-1 items-center justify-center p-[18px]">
        <button
          type="button"
          onClick={() => onOpenPreview(item)}
          className="relative block w-full overflow-hidden rounded-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label="Önizleme aç"
        >
          {type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={sku || ''} className="block w-full" />
          ) : (
            // Sessiz autoplay loop — card içinde temiz görünüm. Native controls
            // sadece AiMediaOverlay (fullscreen) içinde gösterilir.
            <video
              src={url}
              autoPlay
              muted
              loop
              playsInline
              className="block w-full"
            />
          )}
          {showSkuOverlay && sku && (
            <span
              className="pointer-events-none absolute right-[6%] top-1/2 -translate-y-1/2 text-right text-black"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '48px',
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              {sku}
            </span>
          )}
        </button>
      </div>

      {/* Metadata — mobile'da hep görünür; md+ hover'da blur+fade, yukarı kayar. */}
      <div className="pointer-events-none flex flex-col items-center gap-0.5 transition-all duration-200 md:group-hover:-translate-y-2.5 md:group-hover:opacity-0 md:group-hover:blur-sm">
        <span className="text-sm font-medium text-foreground">{filename}</span>
        <span className="text-xs text-muted">{subtitle}</span>
      </div>

      {/* Action bar — mobile'da metadata altında static & hep görünür;
          md+ absolute + hover'da alttan fade-in. */}
      <div className="mt-1 flex items-center justify-center md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:translate-y-[10%] md:opacity-0 md:blur-sm md:transition-all md:duration-200 md:group-hover:pointer-events-auto md:group-hover:-translate-y-4 md:group-hover:opacity-100 md:group-hover:blur-none">
        <BalinaButton
          variant="ghost"
          size="small"
          onClick={() => triggerDownload(url, filename)}
          rightIcon={<ArrowDownToLine className="h-3.5 w-3.5" />}
        >
          İndir
        </BalinaButton>
      </div>
    </div>
  );
}

function AiMediaOverlay({
  item,
  onClose,
}: {
  item: AiMediaPreviewItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-xl sm:p-12"
    >
      {/* Kapatma — backdrop tıklaması da kapatır, ama explicit X gerekli. */}
      <BalinaButton
        variant="ghost"
        size="small"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 bg-white/10 text-white hover:bg-white/20"
      >
        <Xmark className="h-4 w-4" />
      </BalinaButton>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full max-w-5xl flex-col"
      >
        {item.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.sku || ''}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-full rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
