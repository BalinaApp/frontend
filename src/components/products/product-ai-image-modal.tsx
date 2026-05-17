'use client';

import { useRef, useState } from 'react';
import { ArrowUpFromLine, ArrowLeft, ArrowRight, Check } from '@gravity-ui/icons';
import { Button, Modal, toast } from '@heroui/react';
import { useAiStore } from '@/stores/aiStore';
import { api } from '@/services/api';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  /** Üretilen görselin URL'ini parent'a iletir. */
  onGenerated: (url: string) => void;
  /** Step 2'nin başlangıç değeri — düzenleme sayfasında mevcut ürün görseli ön doldurulur. */
  initialProductImage?: string | null;
  /** Step 3'te prompt'a dahil edilecek ürün başlığı (optional context). */
  productName?: string;
}

type Framing = 'auto' | 'full' | 'half' | 'portrait';
type Step = 1 | 2 | 3;

const FRAMINGS: Array<{ id: Framing; label: string; description: string; prompt: string }> = [
  {
    id: 'auto',
    label: 'Otomatik',
    description: 'Fashn modeli en uygun kadrajı kendisi seçer',
    prompt: '',
  },
  {
    id: 'full',
    label: 'Tam boy',
    description: 'Modelin tamamı görünür (full body shot)',
    prompt: 'full body shot, standing pose, head to toe visible',
  },
  {
    id: 'half',
    label: 'Yarım boy',
    description: 'Bel üstü ürün odaklı (waist-up)',
    prompt: 'half body shot, waist up, garment-focused composition',
  },
  {
    id: 'portrait',
    label: 'Portre',
    description: 'Yakın çekim — yüz + üst gövde',
    prompt: 'close-up portrait, upper body, soft natural lighting',
  },
];

/**
 * Fashn try-on tabanlı çok adımlı ürün görseli üretici.
 *  Step 1: Model fotoğrafı (manken veya kişi)
 *  Step 2: Ürün/elbise fotoğrafı
 *  Step 3: Kadraj seçimi → fashn-ai/tryon-max çağrısı
 *
 * Backend `generateImageRaw` → fashn `tryon-max` modelini çağırır;
 * `imageUrls[0]` = model_image, `imageUrls[1]` = product_image olarak map'lenir.
 * Kadraj seçimi prompt'a yansıtılır (model türetir).
 */
export function ProductAiImageModal({
  isOpen,
  onOpenChange,
  companyId,
  onGenerated,
  initialProductImage,
  productName,
}: Props) {
  const generateImageRaw = useAiStore((s) => s.generateImageRaw);

  const [step, setStep] = useState<Step>(1);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(
    initialProductImage ?? null,
  );
  const [framing, setFraming] = useState<Framing>('auto');
  // Kullanıcının kendi prompt eklemesi — şal/pantolon rengi, stil, vb.
  // Step 3'te framing/kadraj seçiminin altında textarea olarak çıkar.
  const [customPrompt, setCustomPrompt] = useState('');
  const [isUploading, setIsUploading] = useState<'model' | 'product' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const modelFileRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setStep(1);
    setModelImage(null);
    setProductImage(initialProductImage ?? null);
    setFraming('auto');
    setCustomPrompt('');
    setIsUploading(null);
    setIsGenerating(false);
  };

  const handleClose = (next: boolean) => {
    if (!next && (isUploading || isGenerating)) return;
    if (!next) resetAll();
    onOpenChange(next);
  };

  const handleUpload = async (
    target: 'model' | 'product',
    file: File,
  ): Promise<void> => {
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      toast.danger('Sadece PNG/JPG/WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.danger('Dosya 10 MB\'ı aşamaz');
      return;
    }
    setIsUploading(target);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<{ url: string }>(
        `/company/${companyId}/media/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (target === 'model') setModelImage(data.url);
      else setProductImage(data.url);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.danger(e.response?.data?.message || 'Görsel yüklenemedi');
    } finally {
      setIsUploading(null);
    }
  };

  const handleGenerate = async () => {
    if (!modelImage || !productImage) return;
    setIsGenerating(true);
    try {
      const framingDef = FRAMINGS.find((f) => f.id === framing) ?? FRAMINGS[0];
      const promptParts = [
        productName?.trim() ? `Product: ${productName.trim()}` : '',
        framingDef.prompt,
        // Kullanıcının ek isteği (örn. "şal kırmızı, pantolon siyah") prompt'a
        // doğrudan eklenir; Fashn buna göre rengi/stili uygular.
        customPrompt.trim(),
        'high quality e-commerce product photo, clean background',
      ].filter(Boolean);
      const result = await generateImageRaw(companyId, {
        prompt: promptParts.join(', '),
        imageUrls: [modelImage, productImage],
        model: 'fashn-ai/tryon-max',
      });
      if (!result.url) {
        toast.danger(result.error || 'Görsel üretilemedi');
        return;
      }
      onGenerated(result.url);
      toast.success('Görsel üretildi');
      handleClose(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGoNext =
    (step === 1 && !!modelImage) ||
    (step === 2 && !!productImage) ||
    step === 3;

  return (
    <Modal isOpen={isOpen} onOpenChange={handleClose}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <BalinaOsMark className="h-5 w-5 text-foreground" />
                <Modal.Heading>balinaOS AI ile Görsel Üret</Modal.Heading>
              </div>
              <StepBar step={step} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
              {step === 1 && (
                <StepUpload
                  title="1. Model fotoğrafı"
                  description="Üzerinde ürünün görüneceği manken veya kişi fotoğrafını yükle. Düz arka plan ve net poz daha iyi sonuç verir."
                  imageUrl={modelImage}
                  onPick={() => modelFileRef.current?.click()}
                  onClear={() => setModelImage(null)}
                  isUploading={isUploading === 'model'}
                />
              )}

              {step === 2 && (
                <StepUpload
                  title="2. Ürün fotoğrafı"
                  description="Manken üzerine giydirilecek elbise/ürün fotoğrafı. Tek başına çekilmiş düz fotoğraf en iyi sonucu verir."
                  imageUrl={productImage}
                  onPick={() => productFileRef.current?.click()}
                  onClear={() => setProductImage(null)}
                  isUploading={isUploading === 'product'}
                />
              )}

              {step === 3 && (
                <StepFraming
                  framing={framing}
                  onChange={setFraming}
                  customPrompt={customPrompt}
                  onCustomPromptChange={setCustomPrompt}
                />
              )}

              <input
                ref={modelFileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) await handleUpload('model', f);
                }}
              />
              <input
                ref={productFileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) await handleUpload('product', f);
                }}
              />
            </Modal.Body>

            <Modal.Footer>
              {step > 1 && (
                <Button
                  variant="tertiary"
                  onPress={() => setStep((s) => (s - 1) as Step)}
                  isDisabled={isGenerating}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Geri
                </Button>
              )}
              {step < 3 ? (
                <Button
                  variant="primary"
                  onPress={() => setStep((s) => (s + 1) as Step)}
                  isDisabled={!canGoNext}
                >
                  İleri
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onPress={handleGenerate}
                  isPending={isGenerating}
                  isDisabled={isGenerating || !modelImage || !productImage}
                >
                  <Check className="h-3.5 w-3.5" />
                  Üret
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function StepBar({ step }: { step: Step }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-1 flex-1 rounded-full transition-colors ${
            n <= step ? 'bg-foreground' : 'bg-foreground/[0.08]'
          }`}
        />
      ))}
    </div>
  );
}

function StepUpload({
  title,
  description,
  imageUrl,
  onPick,
  onClear,
  isUploading,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  onPick: () => void;
  onClear: () => void;
  isUploading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted">{description}</p>
      </div>

      {imageUrl ? (
        <div className="relative aspect-[3/4] max-h-[320px] overflow-hidden rounded-lg border border-black/[0.08] bg-foreground/[0.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <Button
              variant="tertiary"
              size="sm"
              onPress={onPick}
              isPending={isUploading}
              isDisabled={isUploading}
              className="h-8 rounded-full bg-background/90 px-3 text-xs"
            >
              Değiştir
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onPress={onClear}
              isDisabled={isUploading}
              className="h-8 rounded-full bg-background/90 px-3 text-xs text-danger"
            >
              Kaldır
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={isUploading}
          className="flex aspect-[3/4] max-h-[320px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/[0.12] bg-foreground/[0.02] text-muted transition-colors hover:bg-foreground/[0.04]"
        >
          <ArrowUpFromLine className="h-5 w-5" />
          <span className="text-sm font-medium">
            {isUploading ? 'Yükleniyor…' : 'Dosya yükle'}
          </span>
          <span className="text-xs text-muted">PNG / JPG / WEBP · max 10MB</span>
        </button>
      )}
    </div>
  );
}

function StepFraming({
  framing,
  onChange,
  customPrompt,
  onCustomPromptChange,
}: {
  framing: Framing;
  onChange: (f: Framing) => void;
  customPrompt: string;
  onCustomPromptChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-medium text-foreground">3. Kadraj seç</h4>
        <p className="text-xs text-muted">
          Üretilen görseldeki çekim açısı/mesafe — Fashn modeli buna göre
          kompozisyon yapar.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {FRAMINGS.map((f) => {
          const isSelected = framing === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-foreground/30 bg-foreground/[0.04]'
                  : 'border-black/[0.06] bg-transparent hover:bg-foreground/[0.02]'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected
                    ? 'border-foreground bg-foreground'
                    : 'border-black/[0.16]'
                }`}
              >
                {isSelected && (
                  <div className="h-1.5 w-1.5 rounded-full bg-background" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{f.label}</span>
                <span className="text-xs text-muted">{f.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Ek prompt — renk/stil özel istekleri buradan girilir. Boş bırakılırsa
          prompt'a eklenmez. Örn. "şal kırmızı, pantolon siyah", "saç sarı,
          dudak kırmızı". */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label
          htmlFor="ai-custom-prompt"
          className="text-xs font-medium text-foreground"
        >
          Ek istek (opsiyonel)
        </label>
        <textarea
          id="ai-custom-prompt"
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="örn: şal kırmızı, pantolon siyah, ayakkabı bej, arka plan beyaz"
          rows={3}
          maxLength={400}
          className="resize-none rounded-lg border border-black/[0.08] bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
        />
        <p className="text-[11px] text-muted">
          Yazdıklarınız prompt&apos;a eklenir; model bu yönlendirmeye göre
          renk/stil uygular.
        </p>
      </div>
    </div>
  );
}
