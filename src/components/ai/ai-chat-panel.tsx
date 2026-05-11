'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ChevronDown,
  Xmark,
  ArrowRight,
  Plus,
} from '@gravity-ui/icons';
import { Button, Dropdown, ListBox, Select } from '@heroui/react';
import {
  useAiStore,
  type FalImageSize,
  FAL_MODEL_CATALOG,
} from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useUIStore } from '@/stores/uiStore';

interface AiChatPanelProps {
  /** Drawer modu — sağdan açılan kompakt panel; aksi halde full page */
  variant: 'drawer' | 'full';
  onClose?: () => void;
  /** (Eski API — artık kullanılmıyor; in-place expand var.) */
  expandHref?: string;
}

// Default model katalog — `FAL_MODEL_CATALOG`'dan türetiliyor. Seçili
// hesabın izin verdiği modeller varsa o filtre uygulanır (aşağıda).
const allModelOptions: Array<{ value: string; label: string; kind: 'image' | 'video' }> =
  FAL_MODEL_CATALOG.map((m) => ({ value: m.id, label: m.label, kind: m.kind }));

export function AiChatPanel({ variant, onClose }: AiChatPanelProps) {
  const { currentCompany } = useCompanyStore();
  const {
    fals,
    selectedFalId,
    setSelectedFalId,
    fetchFalIntegrations,
    messages,
    isGenerating,
    generateImage,
    resetChat,
  } = useAiStore();
  const isAiDrawerExpanded = useUIStore((s) => s.isAiDrawerExpanded);
  const toggleAiDrawerExpanded = useUIStore((s) => s.toggleAiDrawerExpanded);

  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('fal-ai/nano-banana');
  // Output ratio sabit kalıyor — Figma'da boyut chip'i yok; gelecekte mod
  // popover'ında çıkacak.
  const imageSize: FalImageSize = 'square_hd';
  // Çoklu referans görsel — virtual try-on gibi compositional prompt'lar için
  // birden fazla input gerekiyor (nano-banana/edit 4 image'a kadar destekler).
  const MAX_REFERENCE_FRAMES = 4;
  const [referenceFrames, setReferenceFrames] = useState<
    Array<{ url: string; name: string }>
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);

  const hasIntegration = fals.length > 0;

  // Seçili hesabın izin verdiği modeller. Liste boşsa tüm katalog gösterilir
  // (legacy/yeni eklenmiş ama henüz model seçilmemiş hesaplarda kırılmasın).
  const selectedFal = fals.find((f) => f.id === selectedFalId) ?? fals[0] ?? null;
  const allowedModels = selectedFal?.models?.length
    ? selectedFal.models
    : allModelOptions.map((m) => m.value);
  const modelOptions = allModelOptions.filter((o) => allowedModels.includes(o.value));
  // Seçili model artık izinli değilse otomatik ilk izinliye düş — render
  // sırasında hesaplıyoruz, useEffect+setState yerine derived value.
  const model = modelOptions.some((o) => o.value === selectedModel)
    ? selectedModel
    : modelOptions[0]?.value ?? selectedModel;
  const setModel = setSelectedModel;
  const currentKind = modelOptions.find((o) => o.value === model)?.kind ?? 'image';

  useEffect(() => {
    if (currentCompany?.id) fetchFalIntegrations(currentCompany.id);
  }, [currentCompany?.id, fetchFalIntegrations]);

  useEffect(() => {
    // Yeni mesaj geldiğinde alta kaydır.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isGenerating]);

  const isEmpty = messages.length === 0;
  const canSend = prompt.trim().length > 0 && !isGenerating && hasIntegration;

  const handleSend = () => {
    if (!canSend || !currentCompany?.id) return;
    const text = prompt.trim();
    setPrompt('');
    const urls = referenceFrames.length > 0 ? referenceFrames.map((f) => f.url) : undefined;
    setReferenceFrames([]);
    generateImage(currentCompany.id, {
      prompt: text,
      model,
      imageSize,
      integrationId: selectedFalId ?? undefined,
      imageUrls: urls,
    });
  };

  const handleAddFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    // Mevcut + yeni toplamı MAX_REFERENCE_FRAMES'i aşmasın.
    const remaining = MAX_REFERENCE_FRAMES - referenceFrames.length;
    const accepted = list.slice(0, Math.max(0, remaining));
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceFrames((prev) =>
          prev.length >= MAX_REFERENCE_FRAMES
            ? prev
            : [...prev, { url: String(reader.result), name: file.name }]
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFrame = (idx: number) => {
    setReferenceFrames((prev) => prev.filter((_, i) => i !== idx));
  };

  // "Sanal Deneme" preset — kullanıcının verdiği uzun try-on prompt'unu
  // hazır yükler ve model'i nano-banana/edit'e geçirir (multi-image edit
  // modeli; FAL_MODEL_CATALOG'da yer alıyor).
  const VTON_PROMPT_TEMPLATE = `TASK: Virtual try-on. IMAGE 1 is the reference scene with a person. IMAGE 2 is the new garment to wear. Replace ONLY the garment currently worn by the person in IMAGE 1 with the EXACT garment from IMAGE 2. Output ONE photorealistic image where every other pixel of IMAGE 1 is preserved.

PRESERVE FROM IMAGE 1 — PIXEL-IDENTICAL:
- Background entirely (store, racks, lighting, mirror, floor, reflections)
- Person's identity: face, jawline, skin tone, eyes, expression
- Headscarf drape/fold/wrap style and fabric (color may shift to harmonize with the new garment)
- Hands, phone, jewelry, watch, bag
- Body posture, foot placement, proportions
- Shoes silhouette (color may shift slightly)
- Camera angle, focal length, framing, aspect ratio, lighting

REPRODUCE FROM IMAGE 2 — PIXEL-PERFECT:
- Exact color hue, saturation, sheen
- Exact fabric type, texture, drape
- Exact silhouette, length, fit
- Exact neckline, collar, sleeves, cuffs, waistline, hemline
- Every pleat, ruffle, gather, layer, button, embroidery, print, pattern — same count and arrangement

STRICTLY FORBIDDEN:
- Do not redesign, restyle, simplify, or reinterpret IMAGE 2
- Do not change background, person's face/hands/phone/body
- Do not crop or change aspect ratio
- Do not invent details that are not in IMAGE 2
- Do not change headscarf style/drape, only color

OUTPUT: ONE photorealistic image, identical lighting and environment to IMAGE 1, with garment swapped to IMAGE 2's design. Sharp focus, natural skin tones, professional fashion-photo quality.`;

  const handleVtonPreset = () => {
    setPrompt(VTON_PROMPT_TEMPLATE);
    const editModel = 'fal-ai/nano-banana/edit';
    if (allowedModels.includes(editModel)) {
      setModel(editModel);
    }
  };

  const isDrawer = variant === 'drawer';

  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg"
      style={{
        // Linear-style chat panel — kullanıcı tarafından verilen LCH değerleri.
        background: 'lch(98 0 142.924)',
        border: '0.5px solid lch(94.6 0 142.924)',
        boxShadow:
          'lch(0 0 0 / 0.02) 0px 6px 18px, lch(0 0 0 / 0.04) 0px 3px 9px, lch(0 0 0 / 0.04) 0px 1px 1px',
        transition: 'border-color 0.15s ease-in-out, border-radius 200ms',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-black/[0.02] px-3.5 py-3.5">
        {/* Sol: Beta chip + Yeni sohbet (dropdown ile yeni başlatabilir) */}
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-foreground/70">
            Beta
          </span>
          <Dropdown>
            <Dropdown.Trigger className="flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium leading-[1.43] text-foreground hover:opacity-80">
              <span>Yeni sohbet</span>
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-56 border border-border bg-surface shadow-lg">
              <Dropdown.Menu>
                <Dropdown.Item
                  id="new"
                  textValue="Yeni sohbet"
                  onAction={() => resetChat()}
                >
                  Yeni sohbet
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Sağ: minimize / expand-toggle / close — HeroUI ghost icon-only butonlar */}
        <div className="flex items-center gap-0.5 text-foreground/70">
          {isDrawer && (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Sohbeti küçült"
              onPress={onClose}
            >
              {/* horizontal line — minimize */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.25 12C3.25 11.5858 3.58579 11.25 4 11.25H12C12.4142 11.25 12.75 11.5858 12.75 12C12.75 12.4142 12.4142 12.75 12 12.75H4C3.58579 12.75 3.25 12.4142 3.25 12Z"
                />
              </svg>
            </Button>
          )}
          {isDrawer && (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={isAiDrawerExpanded ? 'Daralt' : 'Genişlet'}
              onPress={() => toggleAiDrawerExpanded()}
            >
              {/* diagonal corner arrows — expand */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6.2168 8.72266C6.50798 8.42824 6.98279 8.4257 7.27734 8.7168C7.57154 9.00799 7.57423 9.48287 7.2832 9.77734L4.59863 12.5H6.2998C6.71402 12.5 7.0498 12.8358 7.0498 13.25C7.04964 13.6641 6.71392 14 6.2998 14H2.75C2.55116 14 2.36036 13.9208 2.21973 13.7803C2.07915 13.6397 2.00008 13.4488 2 13.25V9.75C2 9.33579 2.33579 9 2.75 9C3.16421 9 3.5 9.33579 3.5 9.75V11.4775L6.2168 8.72266Z" />
                <path d="M13.25 2C13.4488 2.00006 13.6397 2.07917 13.7803 2.21973C13.9208 2.36033 14 2.55119 14 2.75V6.25C14 6.66414 13.6641 6.99988 13.25 7C12.8358 7 12.5 6.66421 12.5 6.25V4.52246L9.7832 7.27734C9.49206 7.57173 9.01721 7.57419 8.72266 7.2832C8.42838 6.99201 8.42575 6.51716 8.7168 6.22266L11.4014 3.5H9.7002C9.28598 3.5 8.9502 3.16421 8.9502 2.75C8.95028 2.33586 9.28603 2 9.7002 2H13.25Z" />
              </svg>
            </Button>
          )}
          {isDrawer && onClose && (
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
      </div>

      {/* Body — boş durumda hiç içerik yok; mesaj geldikçe doluyor */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {!hasIntegration && <ConnectFalCTA companySlug={currentCompany?.slug} />}

        {hasIntegration && !isEmpty && (
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <li key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-foreground">
                    {m.prompt}
                  </div>
                ) : (
                  <AssistantBubble message={m} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composer — Figma 12203:4569 */}
      <div className="flex flex-col gap-2 p-2">
        {/* Hesap seçici — sadece 1'den fazla bağlı hesap varsa */}
        {fals.length > 1 && (
          <Select
            selectedKey={selectedFalId ?? fals[0]?.id ?? ''}
            onSelectionChange={(k) => setSelectedFalId(String(k))}
            aria-label="Fal hesabı"
            className="w-full"
          >
            <Select.Trigger className="h-7 rounded-lg border border-border bg-surface px-2 text-[11px]">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="border border-border bg-surface/85 shadow-lg backdrop-blur-xl">
              <ListBox>
                {fals.map((f) => (
                  <ListBox.Item key={f.id} id={f.id} textValue={f.name}>
                    {f.name} {f.apiKeyTail && `(••••${f.apiKeyTail})`}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}

        {/* Container — gradient bg, 12px radius, 2px inner padding (Figma 12203:4611) */}
        <div
          className="flex flex-col gap-0 rounded-xl bg-gradient-to-b from-black/[0.04] to-black/[0.06] p-0.5"
        >
          {/* Frames row — Figma 12203:4661 */}
          <div className="flex items-center gap-2.5 px-3.5 py-3.5">
            <input
              ref={startInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleStartFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => startInputRef.current?.click()}
              aria-label="Başlangıç görseli yükle"
              className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-transparent text-[10px] text-muted hover:border-accent/40"
            >
              {startFrame ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={startFrame.url} alt={startFrame.name} className="h-full w-full object-cover" />
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartFrame(null);
                    }}
                    role="button"
                    aria-label="Görseli kaldır"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Xmark className="h-3 w-3" />
                  </span>
                </>
              ) : (
                <span className="text-foreground/50">Start</span>
              )}
            </button>

            {/* Swap chip — 32×32, bg #EBEBEC, 16px radius (Figma 12203:4662) */}
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#EBEBEC]"
            >
              <ArrowRightArrowLeft className="h-4 w-4 text-foreground/70" />
            </span>

            <button
              type="button"
              disabled
              aria-label="Bitiş görseli (yakında)"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-transparent text-[10px] text-muted/40"
            >
              End
            </button>
          </div>

          {/* Input box — white bg, 10px radius (Figma 12203:5626) */}
          <div className="flex flex-col rounded-[10px] bg-white">
            {/* Textarea — padding 12px (Figma 12203:5629) */}
            <div className="flex p-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  hasIntegration
                    ? 'Görselin veya videonun nasıl olması gerektiğini tarif edin.'
                    : 'Önce bir Fal.ai hesabı bağlayın'
                }
                disabled={!hasIntegration}
                rows={2}
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-[#71717A] focus:outline-none disabled:opacity-60"
              />
            </div>

            {/* Action row — padding 8px, space-between (Figma 12203:5654) */}
            <div className="flex items-center justify-between gap-2 p-2">
              {/* Şablonlar chip — Figma 12203:5680 */}
              <Dropdown>
                <Dropdown.Trigger className="flex h-8 cursor-pointer items-center gap-1 rounded-2xl bg-[#EBEBEC] px-3 text-sm font-medium text-[#18181B] hover:bg-[#dedede]">
                  <span>Şablonlar</span>
                  <ChevronDown className="h-4 w-4 text-foreground/60" />
                </Dropdown.Trigger>
                <Dropdown.Popover className="w-56 border border-border bg-surface/85 shadow-lg backdrop-blur-xl">
                  <Dropdown.Menu>
                    <Dropdown.Item
                      id="template-product"
                      textValue="Ürün fotoğrafı (yakında)"
                      isDisabled
                    >
                      Ürün fotoğrafı (yakında)
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="template-lifestyle"
                      textValue="Yaşam tarzı (yakında)"
                      isDisabled
                    >
                      Yaşam tarzı (yakında)
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

              {/* Sağ taraf: mod chip + send (Figma 12203:5788) */}
              <div className="flex items-center gap-1">
                {/* Mode chip — Image/Video etiketi, popover'da modelleri listeler */}
                <Dropdown>
                  <Dropdown.Trigger className="flex h-8 cursor-pointer items-center gap-1 rounded-2xl bg-[#EBEBEC] px-3 text-sm font-medium text-[#18181B] hover:bg-[#dedede]">
                    <span>{currentKind === 'video' ? 'Video' : 'Image'}</span>
                    <ChevronDown className="h-4 w-4 text-foreground/60" />
                  </Dropdown.Trigger>
                  <Dropdown.Popover className="w-64 border border-border bg-surface/85 shadow-lg backdrop-blur-xl">
                    <Dropdown.Menu>
                      {modelOptions.map((o) => (
                        <Dropdown.Item
                          key={o.value}
                          id={o.value}
                          textValue={o.label}
                          onAction={() => setModel(o.value)}
                        >
                          <span className="flex flex-1 items-center gap-2">
                            <span
                              className={`inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-semibold uppercase tracking-wide ${
                                o.kind === 'video'
                                  ? 'bg-violet-500/15 text-violet-700'
                                  : 'bg-emerald-500/15 text-emerald-700'
                              }`}
                            >
                              {o.kind}
                            </span>
                            {o.label}
                          </span>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>

                {/* Send button — 32×32, bg #EBEBEC, 16 radius, arrow-right (Figma 12203:5656) */}
                <button
                  type="button"
                  onClick={handleSend}
                  aria-label="Gönder"
                  disabled={!canSend}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#EBEBEC] text-foreground/80 transition-opacity hover:bg-[#dedede] disabled:opacity-40"
                >
                  {isGenerating ? (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ConnectFalCTA({ companySlug }: { companySlug?: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <p className="text-sm font-medium text-foreground">Fal.ai bağlı değil</p>
      <p className="mt-1 text-xs text-muted">
        Görsel üretmek için önce <strong>Entegrasyonlar</strong> sayfasından bir Fal.ai
        hesabı bağlayın.
      </p>
      {companySlug && (
        <Link
          href={`/${companySlug}/stores`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent underline"
        >
          Entegrasyonlar sayfasına git
        </Link>
      )}
    </div>
  );
}

function AssistantBubble({ message }: { message: ReturnType<typeof useAiStore.getState>['messages'][number] }) {
  if (message.status === 'pending') {
    return (
      <div className="flex max-w-[85%] flex-col gap-2 rounded-2xl rounded-bl-sm bg-surface-secondary/60 px-4 py-3 text-xs text-muted">
        <span>Görsel üretiliyor…</span>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-default/40">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    );
  }
  if (message.status === 'error') {
    return (
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
        Hata: {message.error || 'Bilinmeyen hata'}
      </div>
    );
  }
  return (
    <div className="flex max-w-[90%] flex-col gap-2">
      {(message.images ?? []).map((img, i) => (
        <figure key={i} className="overflow-hidden rounded-2xl border border-black/10 bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="Üretilen görsel" className="w-full" />
          <figcaption className="flex items-center justify-between px-3 py-2 text-[11px] text-muted">
            <span>{img.width && img.height ? `${img.width}×${img.height}` : 'Görsel'}</span>
            <a
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-foreground hover:bg-surface-secondary"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              İndir
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
