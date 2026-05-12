'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Paperclip,
  Picture,
  Play,
  Sparkles,
  Xmark,
} from '@gravity-ui/icons';

import { Button, Dropdown, Label, toast } from '@heroui/react';
import {
  useAiCreatorStore,
  useAiCreatorHistoryStore,
  deriveSessionTitle,
  buildVideoPrompt,
  type ChatMode,
} from '@/stores/aiCreatorStore';
import { useAiStore, MODEL_CATALOG } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useUIStore } from '@/stores/uiStore';
import { applySkuOverlayToImage } from '@/lib/sku-overlay';
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
  const { currentCompany } = useCompanyStore();
  const {
    integrations,
    selectedImageModelId,
    selectedVideoModelId,
    setSelectedImageModelId,
    setSelectedVideoModelId,
    fetchIntegrations,
    generateImageRaw,
    generateVideoRaw,
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
  const [composerText, setComposerText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // textarea focus iken chroma sweep durur (kullanıcı odakta yazıyor,
  // çevredeki animasyon dikkat dağıtmasın). Blur olunca tekrar açılır.
  const [isComposerFocused, setIsComposerFocused] = useState(false);

  // Sabit eşleme (kullanıcı kararı): görsel = Fashn, video = Fal Kling.
  const imageIntegration =
    integrations.find((i) => i.provider === 'fashn' && i.isActive) ?? null;
  const videoIntegration =
    integrations.find((i) => i.provider === 'fal' && i.isActive) ?? null;
  const hasIntegration = !!imageIntegration && !!videoIntegration;
  // Aktif modeller — composer'daki Model dropdown'undan seçilmişse onu
  // kullan, yoksa provider'a göre default'a düş.
  const selectedImageModel = selectedImageModelId ?? 'fashn-ai/tryon-v1.6';
  const selectedVideoModel =
    selectedVideoModelId ?? 'fal-ai/kling-video/v2.1/master/image-to-video';

  useEffect(() => {
    if (currentCompany?.id) {
      fetchIntegrations(currentCompany.id);
      fetchSessions(currentCompany.id);
    }
  }, [currentCompany?.id, fetchIntegrations, fetchSessions]);

  // İlk açılışta selamlama bot mesajı.
  useEffect(() => {
    if (messages.length === 0 && hasIntegration) {
      start('Merhaba! Ne üretmek istersiniz? Composer\'da modu seçin (Görsel/Video), görsel ekleyin ve istediğinizi yazın.');
    }
  }, [messages.length, hasIntegration, start]);

  // Mesaj listesi her güncellendiğinde en alta kaydır.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

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

  const handleAttachFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.danger('Lütfen bir görsel dosyası seçin');
      return;
    }
    if (attachedImages.length >= 2) {
      toast.danger('En fazla 2 görsel ekleyebilirsiniz (model + ürün)');
      return;
    }
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    addAttachedImage(url);
  };

  /* ---------------- SKU helper ---------------- */

  const computeSku = (): string => {
    const code = productCode.trim();
    if (!code) return '';
    const prefix = imageIntegration?.codePrefix?.trim() ?? '';
    return prefix ? `${prefix}-${code}` : code;
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

    // Auto mode: attached görsel sayısı + prompt'taki "video" anahtar kelime
    // ile karar ver. 2 görsel + video kelimesi yok → image (Fashn VTON).
    // 1 görsel veya "video" kelimesi → video (Kling). 0 görsel + "video" →
    // hata; 0 görsel + "görsel" → image (Fashn 2 görsel gerektireceği için
    // ileride hata; kullanıcıya uyarı çıkar).
    const promptHasVideo = /\bvideo\b/i.test(promptText);
    const resolvedMode: 'image' | 'video' =
      mode === 'auto'
        ? promptHasVideo || attachedImages.length === 1
          ? 'video'
          : 'image'
        : mode;

    // Mesaj akışına user girdisini ekle.
    if (attachedImages.length > 0) {
      for (const url of attachedImages) {
        appendMessage({ id: '', kind: 'user-image', url });
      }
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

  const runImageGeneration = async (promptText: string, files: string[]) => {
    if (!currentCompany?.id) return;
    if (files.length < 2) {
      pushBotError(
        'Görsel üretimi için 2 görsel gerekli: 1) model (insan), 2) ürün (kıyafet). Lütfen önce iki görseli ekleyip tekrar deneyin.',
      );
      return;
    }
    const prompt =
      promptText ||
      'Apply the garment from IMAGE 2 onto the model in IMAGE 1.';
    const result = await generateImageRaw(currentCompany.id, {
      prompt,
      model: selectedImageModel,
      imageUrls: files,
    });
    if (!result.url) {
      pushBotError(`Üretim başarısız: ${result.error ?? 'bilinmeyen hata'}`);
      return;
    }
    const sku = computeSku();
    const overlaid = sku
      ? await applySkuOverlayToImage(result.url, sku)
      : { url: result.url, embedded: false };
    appendMessage({
      id: '',
      kind: 'bot-image',
      url: overlaid.url,
      sku,
      skuEmbedded: overlaid.embedded,
    });
  };

  const runVideoGeneration = async (promptText: string, files: string[]) => {
    if (!currentCompany?.id) return;
    if (files.length === 0) {
      pushBotError(
        'Video üretimi için en az bir başlangıç görseli gerekli. Lütfen bir görsel ekleyin.',
      );
      return;
    }
    const prompt = buildVideoPrompt(promptText);
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
    appendMessage({
      id: '',
      kind: 'bot-video',
      url: result.url,
      sku: computeSku(),
    });
  };

  const pushBotError = (text: string) =>
    appendMessage({ id: '', kind: 'bot-text', text });

  /* ---------------- UI ---------------- */

  const isDrawer = variant === 'drawer';

  if (!hasIntegration) {
    const missing: string[] = [];
    if (!imageIntegration) missing.push('Fashn.ai (görsel)');
    if (!videoIntegration) missing.push('Fal.ai (video)');
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          {missing.join(' ve ')} bağlı değil
        </p>
        <p className="mt-1 text-xs text-muted">
          AI üretim için Entegrasyonlar sayfasından bu hesapları bağlayın.
        </p>
        {currentCompany?.slug && (
          <Link
            href={`/${currentCompany.slug}/stores`}
            className="mt-3 text-xs font-semibold text-accent underline"
          >
            Entegrasyonlara git
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(32px)',
        boxShadow:
          '0px 1px 1px rgba(0,0,0,0.04), 0px 3px 9px rgba(0,0,0,0.04), 0px 6px 18px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header — Figma 12249:7375 */}
      <div className="flex items-center gap-2.5 overflow-hidden px-4 py-3">
        <div className="flex flex-1 items-center gap-2.5">
          <AiLogo />
          <div className="flex h-7 w-10 items-center justify-center overflow-hidden rounded-full bg-black/[0.05] p-1">
            <span className="text-sm font-medium leading-5 text-black">AI</span>
          </div>
        </div>
        {isDrawer && (
          <div className="flex items-center gap-1 text-foreground/70 max-sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={isAiDrawerExpanded ? 'Daralt' : 'Genişlet'}
              onPress={() => toggleAiDrawerExpanded()}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6.2168 8.72266C6.50798 8.42824 6.98279 8.4257 7.27734 8.7168C7.57154 9.00799 7.57423 9.48287 7.2832 9.77734L4.59863 12.5H6.2998C6.71402 12.5 7.0498 12.8358 7.0498 13.25C7.04964 13.6641 6.71392 14 6.2998 14H2.75C2.55116 14 2.36036 13.9208 2.21973 13.7803C2.07915 13.6397 2.00008 13.4488 2 13.25V9.75C2 9.33579 2.33579 9 2.75 9C3.16421 9 3.5 9.33579 3.5 9.75V11.4775L6.2168 8.72266Z" />
                <path d="M13.25 2C13.4488 2.00006 13.6397 2.07917 13.7803 2.21973C13.9208 2.36033 14 2.55119 14 2.75V6.25C14 6.66414 13.6641 6.99988 13.25 7C12.8358 7 12.5 6.66421 12.5 6.25V4.52246L9.7832 7.27734C9.49206 7.57173 9.01721 7.57419 8.72266 7.2832C8.42838 6.99201 8.42575 6.51716 8.7168 6.22266L11.4014 3.5H9.7002C9.28598 3.5 8.9502 3.16421 8.9502 2.75C8.95028 2.33586 9.28603 2 9.7002 2H13.25Z" />
              </svg>
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Kapat"
                onPress={onClose}
              >
                <Xmark className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Messages — sadece drawer expanded iken %50 ortalı kolon; normal
          drawer modunda tam genişlik kullanır (dar olduğu için). */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className={`mx-auto w-full px-4 py-2 ${
            isAiDrawerExpanded ? 'sm:max-w-[50%]' : ''
          }`}
        >
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-col">
                <MessageView message={m} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Empty state suggestions — kullanıcı henüz mesaj göndermedi.
          Tıklayınca composer'a hazır prompt + mode set olur. */}
      {!messages.some((m) => m.kind === 'user-text' || m.kind === 'user-image') && (
        <div
          className={`mx-auto w-full px-4 pb-1 pt-2 ${
            isAiDrawerExpanded ? 'sm:max-w-[50%]' : ''
          }`}
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('image');
                setComposerText('Yeni bir ürün görseli oluştur');
              }}
              className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[0.08]"
            >
              <Picture className="h-3.5 w-3.5 text-muted" />
              Yeni bir ürün görseli oluştur
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('video');
                setComposerText('Ürün videosu oluştur');
              }}
              className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[0.08]"
            >
              <Play className="h-3.5 w-3.5 text-muted" />
              Ürün videosu oluştur
            </button>
          </div>
        </div>
      )}

      {/* Composer — aynı koşula uyar. Drag/drop ve paste ile görsel eklenir. */}
      <div
        className={`mx-auto w-full px-4 py-3.5 ${
          isAiDrawerExpanded ? 'sm:max-w-[50%]' : ''
        }`}
      >
        <div
          style={{ borderRadius: '9999px' }}
          className={`relative flex flex-col gap-2 p-1 transition-colors ${
            isDragging
              ? 'bg-accent/10 ring-2 ring-accent/40'
              : 'bg-black/[0.04]'
          } ${isDragging || isComposerFocused ? '' : 'chroma-border'}`}
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
              setIsDragging(true);
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) e.preventDefault();
          }}
          onDragLeave={(e) => {
            // Yalnızca container'dan tamamen çıkıldığında kapat — child'a
            // geçtiğinde leave tetiklenmesin.
            if (
              !e.relatedTarget ||
              !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)
            ) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleAttachFile(file);
          }}
        >
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-accent/15 backdrop-blur-sm">
              <span className="text-sm font-medium text-accent">
                Görseli buraya bırakın
              </span>
            </div>
          )}
          {/* Attached image previews — başta picture icon + divider, sonra
              24×24 round thumbnail'lar. Figma'da @ context icon yerine bizde
              görsel iconu (Picture) + iliştirilen dosya(lar). */}
          {attachedImages.length > 0 && (
            <div className="flex items-center gap-2 px-3 pt-3 text-foreground/70">
              <Picture className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-1.5">
                {attachedImages.map((url, i) => (
                  <div
                    key={i}
                    className="relative h-6 w-6 overflow-hidden rounded-full border border-black/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAttachedImage(i)}
                      aria-label="Görseli kaldır"
                      className="absolute right-0 top-0 flex h-3 w-3 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <Xmark className="h-2 w-2" />
                    </button>
                  </div>
                ))}
                <span className="text-xs text-muted">
                  {attachedImages.length} görsel
                </span>
              </div>
            </div>
          )}

          {/* Text input — paste ile görsel desteği */}
          <div className="px-3 pt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAttachFile(file);
                e.target.value = '';
              }}
            />
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
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
                  void handleAttachFile(file);
                }
              }}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              placeholder="BalinaOS sor..."
              rows={1}
              className="block w-full resize-none border-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
              style={{ minHeight: 20 }}
            />
          </div>

          {/* Bottom row: + (mode kısayolu) + Araçlar / mode pill + send */}
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <div className="flex items-center gap-1">
              {/* + → görsel yükle (file picker) */}
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Dosya ekle"
                onPress={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <ToolsButton mode={mode} onSelect={setMode} />
            </div>

            <div className="flex items-center gap-1">
              <ModelDropdown
                mode={mode}
                imageModelId={selectedImageModel}
                videoModelId={selectedVideoModel}
                onImageSelect={setSelectedImageModelId}
                onVideoSelect={setSelectedVideoModelId}
              />
              <Button
                variant="tertiary"
                size="sm"
                isIconOnly
                aria-label="Gönder"
                onPress={() => void handleSend()}
                isDisabled={
                  isGenerating ||
                  (!composerText.trim() && attachedImages.length === 0)
                }
                className="rounded-2xl"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function AiLogo() {
  // BalinaOS resmi marka — siyah balina silüeti. Tüm AI-bağlı yüzeylerde
  // (chat header, fab launcher) aynı vector mark kullanılır.
  return (
    <BalinaOsMark
      className="h-5 w-5 shrink-0 text-foreground"
      role="img"
      aria-label="BalinaOS"
    />
  );
}

/** Mode picker dropdown — HeroUI Dropdown wrapper. Popover yukarı açılır
 *  (composer altta olduğu için). selectionMode="single" + selectedKeys ile
 *  aktif mode'a check basar. */
function ModeDropdown({
  mode,
  onSelect,
  triggerClassName,
  triggerContent,
  triggerAriaLabel,
}: {
  mode: ChatMode;
  onSelect: (mode: ChatMode) => void;
  triggerClassName?: string;
  triggerContent: React.ReactNode;
  triggerAriaLabel?: string;
}) {
  return (
    <Dropdown>
      {/* Dropdown.Trigger kendi button DOM'unu render eder — className'i ona
          ver, içeriği bir span ile sar (button-in-button hatasını önler). */}
      <Dropdown.Trigger className={triggerClassName} aria-label={triggerAriaLabel}>
        <span className="flex items-center gap-1">{triggerContent}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[206px]" placement="top start">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={new Set([mode])}
          onSelectionChange={(keys) => {
            const next = Array.from(keys as Set<string>)[0];
            if (next === 'auto' || next === 'image' || next === 'video') onSelect(next);
          }}
        >
          <Dropdown.Item id="auto" textValue="Auto">
            <Dropdown.ItemIndicator />
            <Sparkles className="size-4 shrink-0 text-muted" />
            <Label>Auto</Label>
          </Dropdown.Item>
          <Dropdown.Item id="image" textValue="Görsel Oluştur">
            <Dropdown.ItemIndicator />
            <Picture className="size-4 shrink-0 text-muted" />
            <Label>Görsel Oluştur</Label>
          </Dropdown.Item>
          <Dropdown.Item id="video" textValue="Video Oluştur">
            <Dropdown.ItemIndicator />
            <Play className="size-4 shrink-0 text-muted" />
            <Label>Video Oluştur</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/** Model dropdown item önündeki provider rozeti — Fashn mor gradient,
 *  Fal image kırmızı F, Fal video mavi play. */
function ProviderIcon({
  provider,
  kind,
}: {
  provider: 'fal' | 'fashn';
  kind: 'image' | 'video';
}) {
  if (provider === 'fashn') {
    return (
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
        style={{
          background: 'linear-gradient(135deg, #f0abfc, #a78bfa)',
        }}
        aria-hidden="true"
      >
        Fn
      </span>
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
    <Dropdown>
      <Dropdown.Trigger
        className="h-8 max-w-[160px] rounded-2xl px-3 text-xs font-medium text-foreground/80 hover:bg-black/[0.06]"
        aria-label="Model seç"
      >
        <span className="truncate">{activeMeta?.label ?? 'Model'}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover className="w-[260px]" placement="top end">
        {/* Search field — Popover üst kısmında, Menu'ye dahil değil */}
        <div className="border-b border-black/[0.06] p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Model ara..."
            className="block w-full rounded-md bg-black/[0.04] px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:bg-black/[0.06] focus:outline-none"
            // Aria autoFocus — kullanıcı popover açılınca direkt yazabilsin
            autoFocus
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto">
          <Dropdown.Menu
            selectionMode="single"
            selectedKeys={new Set([activeId])}
            onSelectionChange={(keys) => {
              const next = Array.from(keys as Set<string>)[0];
              if (!next) return;
              if (kind === 'video') onVideoSelect(next);
              else onImageSelect(next);
              setQuery('');
            }}
          >
            {ordered.map((m) => (
              <Dropdown.Item key={m.id} id={m.id} textValue={m.label}>
                <Dropdown.ItemIndicator />
                <ProviderIcon provider={m.provider} kind={m.kind} />
                <Label>{m.label}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
          {ordered.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted">
              Eşleşen model yok
            </p>
          )}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/** Figma 12249:6800 (Araçlar ghost — empty state) + 12249:7101 (Görsel
 *  Oluştur tertiary — mode seçili). */
function ToolsButton({
  mode,
  onSelect,
}: {
  mode: ChatMode;
  onSelect: (mode: ChatMode) => void;
}) {
  // Mod 'auto' → "Auto" ghost; image/video → tertiary (mavi) pill.
  const isAuto = mode === 'auto';
  const label =
    mode === 'auto' ? 'Auto' : mode === 'image' ? 'Görsel Oluştur' : 'Video Oluştur';
  const Icon = mode === 'auto' ? Sparkles : mode === 'image' ? Picture : Play;
  const triggerClass = isAuto
    ? 'h-8 rounded-2xl bg-black/[0.06] px-3 text-sm font-medium text-foreground hover:bg-black/[0.08]'
    : 'h-8 rounded-2xl bg-transparent px-3 text-sm font-medium text-[#0485F7] hover:bg-black/[0.04]';
  return (
    <ModeDropdown
      mode={mode}
      onSelect={onSelect}
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

function MessageView({ message }: { message: GuidedMessageWithKind }) {
  const m = message;
  switch (m.kind) {
    case 'bot-text':
      return <BotBubble>{m.text}</BotBubble>;
    case 'user-text':
      return <UserBubble>{m.text}</UserBubble>;
    case 'bot-image':
      return (
        <div className="self-start">
          <MediaCard
            url={m.url}
            type="image"
            sku={m.sku}
            showSkuOverlay={!!m.sku && !m.skuEmbedded}
            side="bot"
          />
        </div>
      );
    case 'bot-video':
      return (
        <div className="self-start">
          <MediaCard
            url={m.url}
            type="video"
            sku={m.sku}
            showSkuOverlay={!!m.sku}
            side="bot"
          />
        </div>
      );
    case 'user-image':
      return (
        <div className="self-end">
          <MediaCard url={m.url} type="image" compact side="user" />
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
  // Figma 12249:7447 — Frame 68, rounded 0/16/16/16 (sol-üst köşesi düz).
  // Kullanıcı isteği: bg rgba(0,0,0,0.04).
  return (
    <div
      className="max-w-[85%] self-start bg-black/[0.04] px-3 py-3 text-sm text-foreground"
      style={{ borderRadius: '0px 16px 16px 16px' }}
    >
      {children}
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  // Figma 12249:7456 — Frame 68, rounded 16/16/16/0 (sağ-alt köşesi düz).
  return (
    <div
      className="max-w-[85%] self-end bg-black/[0.04] px-3 py-3 text-sm text-foreground"
      style={{ borderRadius: '16px 16px 16px 0px' }}
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
  const Icon = mode === 'video' ? Play : Picture;
  return (
    <div
      className="ai-pending self-start overflow-hidden"
      style={{ borderRadius: '0px 16px 16px 16px' }}
    >
      {/* Üretim placeholder — shimmer animasyonu ile dolar.
          Görsel için 240x320 (3:4), video için 240x140 oran. */}
      <div
        className={`relative overflow-hidden bg-black/[0.04] ${
          mode === 'video' ? 'h-[140px]' : 'h-[320px]'
        } w-[240px]`}
      >
        {/* Shimmer overlay — sürekli sağ-sol kayan parıltı */}
        <div className="ai-shimmer absolute inset-0" />
        {/* Merkezdeki icon + pulse halka */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <span className="ai-pulse-ring absolute inset-0 rounded-full" />
            <span
              className="ai-conic-spin relative flex h-12 w-12 items-center justify-center rounded-full text-white"
              style={{
                background:
                  'conic-gradient(from 0deg, #0485F7, #B86CFF, #FF77B5, #FFB454, #0485F7)',
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
      {/* Alt etiket */}
      <div className="flex flex-col gap-0.5 bg-black/[0.04] px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm text-foreground">
          <span className="ai-dot inline-flex">
            <span /><span /><span />
          </span>
          {label}
        </span>
        <span className="text-[11px] text-muted">
          {mm}:{ss}
          {elapsed >= 30 && elapsed < 90 && ' • genelde 30-60 sn sürer'}
          {elapsed >= 90 && ' • model yoğun olabilir'}
        </span>
      </div>

    </div>
  );
}

function MediaCard({
  url,
  type,
  compact,
  sku,
  showSkuOverlay,
  side,
}: {
  url: string;
  type: 'image' | 'video';
  compact?: boolean;
  sku?: string;
  showSkuOverlay?: boolean;
  side: 'bot' | 'user';
}) {
  const radius =
    side === 'bot'
      ? '0px 16px 16px 16px'
      : '16px 16px 16px 0px';
  return (
    <figure
      className={`overflow-hidden bg-black/[0.04] ${compact ? 'max-w-[180px]' : 'max-w-[260px]'}`}
      style={{ borderRadius: radius }}
    >
      <div className="relative">
        {type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="block w-full" />
        ) : (
          <video src={url} controls className="block w-full" />
        )}
        {showSkuOverlay && sku && (
          <span
            className="pointer-events-none absolute right-4 bottom-4 text-black"
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {sku}
          </span>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-1 text-[10px] font-medium text-white hover:bg-black/60"
          aria-label="İndir"
        >
          <ArrowDownToLine className="h-3 w-3" />
        </a>
      </div>
    </figure>
  );
}
