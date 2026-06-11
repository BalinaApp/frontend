'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Check,
  Tag,
  Percent,
  Box,
  Plus,
  SquareCheck,
  ChevronDown,
  ChevronLeft,
  Xmark,
  Grip,
  TrashBin,
} from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Checkbox,
  Chip,
  Dropdown,
  Input,
  ListBox,
  Modal,
  Switch,
  TextArea,
  TextField,
  toast,
} from '@/components/ui';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useAiStore } from '@/stores/aiStore';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { ProductAiImageModal } from '@/components/products/product-ai-image-modal';
import { VariationsTable } from '@/components/products/variations-table';

/**
 * Yeni ürün ekleme sayfası — Figma node 12284:5530 birebir uygulaması.
 * Tek sütun stack layout, 616px max-width, her bölüm bg-white/60 + 12px radius.
 * Input'lar visible outline (border-black/10) ile; "balinaOS AI" butonu
 * description bloğunda absolute positioned.
 */

const MAX_IMAGES = 8;
const MAX_AXES = 2;

// HeroUI <Input variant="secondary" /> + base saydam, focus'ta hafif bg.
// `data-[focused=true]` HeroUI'un kendi focus state'ini override eder.
const FIELD_CLASS =
  'bg-transparent focus:outline-none focus:ring-0 focus:bg-foreground/[0.06] data-[focused=true]:bg-foreground/[0.06] placeholder:text-zinc-500';

/** HeroUI secondary Input, başlık inputuyla aynı stil. */
function SecondaryInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      fullWidth
      variant="secondary"
      {...props}
      className={`${FIELD_CLASS} ${props.className ?? ''}`}
    />
  );
}

/** Fiyat input — type=text + inputMode=decimal (spinner yok), TR formatı
 *  (1.234,56) blur'da formatlanır, focus'ta raw gösterilir; canonical
 *  numeric string parent'a iletilir. ₺ suffix sağda. */
function PriceField({
  value,
  onChange,
  placeholder = 'Ekle',
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const formatTr = (raw: string): string => {
    if (!raw?.trim()) return '';
    const n = Number(raw.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(n)) return raw;
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const handleChange = (next: string) => {
    // Yalnızca rakam, virgül, nokta. (TR formatında binlik=., ondalık=,)
    const sanitized = next.replace(/[^0-9.,]/g, '');
    setDraft(sanitized);
    // Canonical: TR "1.234,56" → "1234.56" (Number parse için).
    const canonical = sanitized.replace(/\./g, '').replace(',', '.');
    onChange(canonical);
  };

  const display = focused ? draft : formatTr(value);

  return (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500"
      >
        ₺
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setDraft(formatTr(value));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl bg-transparent pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-500 hover:bg-foreground/[0.04] focus:bg-foreground/[0.06]"
      />
    </div>
  );
}

const PILL_BUTTON_CLASS =
  'h-9 rounded-full bg-foreground/[0.06] px-4 text-sm font-medium text-foreground hover:bg-foreground/[0.08]';

type AxisDraft = { name: string; options: string[] };
type VariationOverride = {
  sku?: string;
  stockQuantity?: string;
  imageIndex?: number;
};

const optionCode = (s: string): string =>
  s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'X';

function cartesian(axes: AxisDraft[]): Record<string, string>[] {
  const real = axes.filter((a) => a.name.trim() && a.options.length > 0);
  if (real.length === 0) return [];
  return real.reduce<Record<string, string>[]>(
    (acc, axis) => {
      const next: Record<string, string>[] = [];
      for (const row of acc) {
        for (const opt of axis.options) {
          next.push({ ...row, [axis.name.trim()]: opt });
        }
      }
      return next;
    },
    [{}],
  );
}

const comboKey = (combo: Record<string, string>): string =>
  Object.entries(combo).map(([k, v]) => `${k}=${v}`).join('|');

const autoSku = (parentSku: string, combo: Record<string, string>): string => {
  const codes = Object.values(combo).map(optionCode).join('-');
  return parentSku ? `${parentSku}-${codes}` : codes;
};

/** public/logos/ veya /figma/integrations/'tan platform logo path'i. */
function platformLogoSrc(
  platform: string | undefined,
  name: string,
): string | null {
  const p = (platform || '').toUpperCase();
  const n = name.toLowerCase();
  if (p === 'TRENDYOL' || n.includes('trendyol')) return '/logos/trendyol.svg';
  if (p === 'SHOPIFY' || n.includes('shopify')) return '/figma/integrations/shopify.png';
  if (p === 'WOOCOMMERCE' || n.includes('woocommerce') || n.includes('woo'))
    return '/logos/woocommerce.svg';
  if (p === 'HEPSIBURADA' || n.includes('hepsiburada'))
    return '/logos/hepsiburada.svg';
  if (p === 'N11' || n.includes('n11')) return '/logos/n11.svg';
  if (p === 'AMAZON' || n.includes('amazon')) return '/logos/amazon.svg';
  if (p === 'CICEKSEPETI' || n.includes('çiçek') || n.includes('ciceksepeti'))
    return '/logos/ciceksepeti.png';
  if (n.includes('ikas')) return '/figma/integrations/ikas.png';
  return null;
}

/** Mağaza logosu — gerçek brand SVG/PNG; yoksa abbr fallback. */
function StoreIcon({
  name,
  platform,
}: {
  name: string;
  platform?: string;
}) {
  const src = platformLogoSrc(platform, name);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="h-4 w-4 shrink-0 rounded-full object-contain shadow-[0_0_0_2px_rgba(245,245,245,1)]"
      />
    );
  }
  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[8px] font-bold text-foreground">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

/** Mağaza fiyat satırı etiketi — platform veya name'den brand çıkar. */
function storeFiyatLabel(store: { name: string; platform?: string }): string {
  const p = (store.platform || '').toUpperCase();
  const n = store.name.toLowerCase();
  if (p === 'TRENDYOL' || n.includes('trendyol')) return 'Trendyol F.';
  if (p === 'SHOPIFY' || n.includes('shopify')) return 'Shopify F.';
  if (p === 'WOOCOMMERCE' || n.includes('woocommerce') || n.includes('woo'))
    return 'WooCommerce F.';
  if (p === 'HEPSIBURADA' || n.includes('hepsiburada')) return 'Hepsiburada F.';
  if (p === 'N11' || n.includes('n11')) return 'N11 F.';
  if (n.includes('ikas')) return 'İkas F.';
  return `${store.name.slice(0, 12)} F.`;
}

/** SKU/KDV/Fiyat satırı: solda 112px label, sağda input. */
function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-6">
      <div className="flex h-9 w-28 shrink-0 items-center gap-2 py-2">
        {icon}
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** Card section — Figma'daki Content frame (bg-white/60 + 12px radius + 12px padding). */
function Section({
  children,
  className = '',
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={`w-full rounded-xl bg-white/60 ${noPadding ? '' : 'p-3'} ${className}`}
    >
      {children}
    </section>
  );
}

/** Görsel kartı — chat paneldeki AiMediaCard pattern'ı:
 *  shadow'lu kare görsel + altta label, hover'da kart gri bg + label fade out,
 *  aynı alanda "Sil" pill butonu fade in. */
function ProductImageCard({
  url,
  label,
  onRemove,
}: {
  url: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="group flex cursor-default flex-col rounded-2xl p-1.5 transition-colors hover:bg-foreground/[0.04]">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-[0_12px_24px_-10px_rgba(0,0,0,0.18)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </div>
      {/* Action zone — image'in altında mt boşluğuyla, label/Sil aynı alanda swap */}
      <div className="relative mt-2 flex h-7 items-center justify-center">
        <span className="truncate px-2 text-[11px] font-medium text-foreground transition-opacity duration-200 group-hover:opacity-0">
          {label}
        </span>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onPress={onRemove}
            aria-label="Görseli sil"
            className="rounded-full"
          >
            <TrashBin className="h-3.5 w-3.5" />
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
}

/** balinaOS AI buton — chroma-border animated gradient ring + BalinaOsMark.
 *  AiChatFab ile aynı stil dili: dış renkli akan kenar, iç dolgu pill. */
function BalinaAiButton({
  onPress,
  isPending,
  isDisabled,
  label = 'balinaOS AI',
  className = '',
}: {
  onPress: () => void;
  isPending?: boolean;
  isDisabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      variant="tertiary"
      size="sm"
      onPress={onPress}
      isPending={isPending}
      isDisabled={isDisabled}
      className={`chroma-border h-9 cursor-pointer rounded-full bg-foreground/[0.06] px-4 text-sm font-medium text-foreground ${className}`}
    >
      <BalinaOsMark className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Button>
  );
}

export default function NewProductPage() {
  usePageTitle('Yeni ürün');

  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  // ---- Genel ----
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});

  // ---- Varyant ----
  const [axes, setAxes] = useState<AxisDraft[]>([]);
  const [axisOptionDrafts, setAxisOptionDrafts] = useState<string[]>([]);
  const [groupingAxis, setGroupingAxis] = useState<string>('');
  const [variationOverrides, setVariationOverrides] = useState<
    Record<string, VariationOverride>
  >({});
  const [selectedComboKeys, setSelectedComboKeys] = useState<Set<string>>(new Set());

  // ---- Submit ----
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** Silme onayı için bekleyen görsel index'i. null = kapalı. */
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  // ---- Media + AI ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const aiIntegrations = useAiStore((s) => s.integrations);
  const fetchAiIntegrations = useAiStore((s) => s.fetchIntegrations);
  const generateText = useAiStore((s) => s.generateText);
  const hasAiIntegration = aiIntegrations.some(
    (i) => i.isActive && i.provider === 'fashn',
  );
  const hasOpenAi = aiIntegrations.some(
    (i) => i.isActive && i.provider === 'openai',
  );
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  useEffect(() => {
    if (currentCompany?.id) fetchAiIntegrations(currentCompany.id);
  }, [currentCompany?.id, fetchAiIntegrations]);

  /** AI modalını aç — Fashn yoksa /stores'a highlight ile yönlendir. */
  const openAiImageModalOrRedirect = () => {
    if (!hasAiIntegration) {
      toast.warning('Fashn.ai entegrasyonu yok — bağla sayfasından ekleyin');
      router.push(`/${companySlug}/stores?highlight=FASHN_AI`);
      return;
    }
    setAiModalOpen(true);
  };

  /** Ürün adı + SKU + (varsa) mevcut açıklamayı sistem mesajına gömerek
   *  OpenAI'ya açıklama üretici prompt'u yollar. Sonuç description state'e yazar. */
  const generateProductDescription = async () => {
    if (!currentCompany?.id) return;
    if (!hasOpenAi) {
      toast.warning('OpenAI entegrasyonu yok — bağla sayfasından ekleyin');
      router.push(`/${companySlug}/stores?highlight=OPENAI`);
      return;
    }
    if (!name.trim()) {
      toast.danger('Önce ürün başlığı girin');
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const systemContent =
        'Sen e-ticaret ürün açıklaması yazarı asistanısın. Türkçe, kısa (60-120 kelime), satışa yönelik, ürünün kullanım alanı + materyal + öne çıkan özelliklerini içeren akıcı bir açıklama yaz. Madde işareti veya başlık kullanma — tek paragraf düz metin döndür.';
      const userParts = [
        `Ürün adı: ${name.trim()}`,
        sku.trim() ? `SKU: ${sku.trim()}` : '',
        description.trim()
          ? `Mevcut açıklama (geliştir veya yeniden yaz): ${description.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
      const result = await generateText(currentCompany.id, {
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userParts },
        ],
      });
      if (!result.text) {
        toast.danger(result.error || 'Açıklama üretilemedi');
        return;
      }
      setDescription(result.text.trim());
      toast.success('Açıklama üretildi');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const activeStores = stores.filter((s) => s.status === 'ACTIVE');

  const addImageUrl = (url: string) =>
    setImageUrls((prev) => {
      if (prev.includes(url)) return prev;
      if (prev.length >= MAX_IMAGES) {
        toast.danger(`En fazla ${MAX_IMAGES} görsel ekleyebilirsin`);
        return prev;
      }
      return [...prev, url];
    });

  const handleFilePick = () => fileInputRef.current?.click();

  /** Tek bir File'ı backend'e upload edip galeriye ekler. */
  const uploadFile = async (file: File) => {
    if (!currentCompany?.id) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      toast.danger('Sadece görsel dosyası');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.danger('Dosya 10 MB\'ı aşamaz');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<{ url: string }>(
        `/company/${currentCompany.id}/media/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      addImageUrl(data.url);
      toast.success('Görsel yüklendi');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.danger(e.response?.data?.message || 'Görsel yüklenemedi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadFile(file);
  };

  // ---- Drag & drop ----
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  };

  const removeImage = (idx: number) =>
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));

  // ---- Axes ----
  const addAxis = () => {
    if (axes.length >= MAX_AXES) return;
    setAxes((prev) => [...prev, { name: '', options: [] }]);
    setAxisOptionDrafts((prev) => [...prev, '']);
  };

  const removeAxis = (idx: number) => {
    setAxes((prev) => prev.filter((_, i) => i !== idx));
    setAxisOptionDrafts((prev) => prev.filter((_, i) => i !== idx));
    setVariationOverrides({});
    setSelectedComboKeys(new Set());
  };

  const renameAxis = (idx: number, axisName: string) => {
    setAxes((prev) => prev.map((a, i) => (i === idx ? { ...a, name: axisName } : a)));
    setVariationOverrides({});
  };

  const setAxisOptionDraft = (idx: number, value: string) =>
    setAxisOptionDrafts((prev) => prev.map((d, i) => (i === idx ? value : d)));

  const commitAxisOption = (idx: number) => {
    const draft = (axisOptionDrafts[idx] ?? '').trim();
    if (!draft) return;
    setAxes((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        if (a.options.includes(draft)) return a;
        return { ...a, options: [...a.options, draft] };
      }),
    );
    setAxisOptionDrafts((prev) => prev.map((d, i) => (i === idx ? '' : d)));
    setVariationOverrides({});
  };

  const removeAxisOption = (axisIdx: number, optIdx: number) =>
    setAxes((prev) =>
      prev.map((a, i) =>
        i === axisIdx
          ? { ...a, options: a.options.filter((_, j) => j !== optIdx) }
          : a,
      ),
    );

  const realAxes = useMemo(
    () => axes.filter((a) => a.name.trim() && a.options.length > 0),
    [axes],
  );
  const hasVariations = realAxes.length > 0;
  const variationRows = useMemo(
    () => (hasVariations ? cartesian(axes) : []),
    [hasVariations, axes],
  );

  useEffect(() => {
    if (realAxes.length > 0 && !groupingAxis) {
      setGroupingAxis(realAxes[0].name.trim());
    } else if (realAxes.length === 0 && groupingAxis) {
      setGroupingAxis('');
    } else if (
      groupingAxis &&
      !realAxes.some((a) => a.name.trim() === groupingAxis)
    ) {
      setGroupingAxis(realAxes[0]?.name.trim() ?? '');
    }
  }, [realAxes, groupingAxis]);

  const updateOverride = (key: string, patch: Partial<VariationOverride>) =>
    setVariationOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));

  const setStorePrice = (storeId: string, v: string) =>
    setStorePrices((prev) => ({ ...prev, [storeId]: v }));

  const selectedStores = useMemo(
    () =>
      activeStores
        .filter((s) => {
          const p = storePrices[s.id]?.trim();
          return p && !Number.isNaN(Number(p));
        })
        .map((s) => ({ ...s, price: Number(storePrices[s.id]) })),
    [activeStores, storePrices],
  );

  const groupedCombos = useMemo(() => {
    if (!hasVariations || !groupingAxis)
      return new Map<string, Record<string, string>[]>();
    const map = new Map<string, Record<string, string>[]>();
    for (const combo of variationRows) {
      const groupVal = combo[groupingAxis];
      if (!groupVal) continue;
      if (!map.has(groupVal)) map.set(groupVal, []);
      map.get(groupVal)!.push(combo);
    }
    return map;
  }, [variationRows, groupingAxis, hasVariations]);

  // ---- Validation ----
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Ürün başlığı gerekli';
    if (!sku.trim()) errs.sku = 'SKU gerekli';

    if (vatRate) {
      const vatNum = Number(vatRate);
      if (Number.isNaN(vatNum) || vatNum < 0 || vatNum > 100) {
        errs.vatRate = 'KDV 0-100 arası olmalı';
      }
    }
    if (purchasePrice) {
      const ppNum = Number(purchasePrice);
      if (Number.isNaN(ppNum) || ppNum < 0) {
        errs.purchasePrice = 'Geçersiz alış fiyatı';
      }
    }
    // Push hedefi: en az bir mağazaya fiyat girilmiş olmalı.
    if (selectedStores.length === 0) {
      errs.stores = 'En az bir mağazaya fiyat girin (push hedefi olur)';
    }
    if (!hasVariations && stockQuantity) {
      const stockNum = Number(stockQuantity);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        errs.stockQuantity = 'Stok 0+ tam sayı';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleKaydet = () => {
    if (!validate()) {
      toast.danger('Formda eksik veya hatalı alanlar var');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!currentCompany?.id) return;
    setIsSubmitting(true);

    // Push hedefleri: fiyatı dolu mağazalar.
    const targets = selectedStores;
    const parentSku = sku.trim();
    const buildPayload = (price: number, targetStoreId: string) => {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        sku: parentSku,
        description: description.trim() || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        price,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        vatRate: vatRate ? Number(vatRate) : undefined,
        stockQuantity:
          !hasVariations && stockQuantity ? Number(stockQuantity) : 0,
        targetStoreIds: [targetStoreId],
      };
      if (hasVariations) {
        payload.attributes = realAxes.map((a) => ({
          name: a.name.trim(),
          options: a.options,
        }));
        payload.variations = variationRows.map((combo) => {
          const key = comboKey(combo);
          const o = variationOverrides[key] ?? {};
          const v: Record<string, unknown> = {
            sku: (o.sku?.trim() || autoSku(parentSku, combo)).trim(),
            attributeValues: combo,
          };
          if (o.stockQuantity) v.stockQuantity = Number(o.stockQuantity);
          if (
            o.imageIndex !== undefined &&
            o.imageIndex >= 0 &&
            o.imageIndex < imageUrls.length
          ) {
            v.imageUrl = imageUrls[o.imageIndex];
          }
          return v;
        });
      }
      return payload;
    };

    try {
      let okCount = 0;
      let failCount = 0;
      for (const tgt of targets) {
        try {
          await api.post(
            `/company/${currentCompany.id}/inventory/products`,
            buildPayload(tgt.price, tgt.id),
          );
          okCount++;
        } catch {
          failCount++;
        }
      }
      if (failCount === 0) {
        toast.success(`Ürün ${okCount} mağazaya gönderildi`);
      } else if (okCount > 0) {
        toast.warning(`${okCount} başarılı, ${failCount} hata`);
      } else {
        toast.danger('Hiçbir mağazaya gönderilemedi');
      }
      router.push(`/${companySlug}/products`);
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (!currentCompany) return null;

  return (
    <>
      <PageHeader
        title={name.trim() || 'Ürün Adı'}
        leading={
          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            aria-label="Geri"
            onPress={() => router.push(`/${companySlug}/products`)}
            className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        }
        action={
          <Button
            variant="tertiary"
            size="sm"
            onPress={handleKaydet}
            isPending={isSubmitting}
            isDisabled={isSubmitting}
            className="h-8 rounded-full bg-foreground/[0.04] px-3 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Kaydet
          </Button>
        }
      />

      <div className="flex flex-1 flex-col overflow-auto">
        <div className="mx-auto flex w-full max-w-[616px] flex-col gap-3 px-3 py-6">
          {/* === 1) Başlık + Açıklama + AI butonu (absolute bottom-right of textarea) === */}
          <Section>
            <div className="flex flex-col gap-2">
              {/* Başlık — HeroUI v3 secondary input, base bg transparent override */}
              <TextField
                value={name}
                onChange={(v) => {
                  setName(v);
                  if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                }}
                aria-label="Ürün başlığı"
                isInvalid={!!errors.name}
              >
                <Input
                  fullWidth
                  variant="secondary"
                  placeholder="Ürün Başlığı"
                  className="bg-transparent text-lg font-medium leading-7 placeholder:text-zinc-500"
                />
              </TextField>

              {/* Açıklama — HeroUI v3 secondary textarea, resize kapalı, AI butonu absolute */}
              <div className="relative">
                <TextField
                  value={description}
                  onChange={setDescription}
                  aria-label="Açıklama"
                >
                  <TextArea
                    fullWidth
                    variant="secondary"
                    placeholder="Açıklama girin..."
                    rows={3}
                    className="min-h-[88px] resize-none bg-transparent placeholder:text-zinc-500"
                  />
                </TextField>
                <div className="pointer-events-none absolute bottom-2 right-2 z-10">
                  <div className="pointer-events-auto">
                    <BalinaAiButton
                      onPress={generateProductDescription}
                      isPending={isGeneratingDescription}
                      isDisabled={isGeneratingDescription}
                      label="Açıklama Oluştur"
                    />
                  </div>
                </div>
              </div>
            </div>
            {errors.name && (
              <p className="px-3 pt-1 text-xs text-danger">{errors.name}</p>
            )}
          </Section>

          {/* === 2) Görsel yükleme — dashed border + drag & drop === */}
          <Section>
            {imageUrls.length === 0 ? (
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex h-44 items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors ${
                  isDragActive
                    ? 'border-foreground/40 bg-foreground/[0.04]'
                    : 'border-black/15'
                }`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={handleFilePick}
                      isPending={isUploading}
                      isDisabled={isUploading}
                      className={PILL_BUTTON_CLASS}
                    >
                      Yeni Yükle
                    </Button>
                    <BalinaAiButton
                      onPress={openAiImageModalOrRedirect}
                      label="balinaOS AI ile Üret"
                    />
                  </div>
                  <span className="text-center text-xs text-zinc-500">
                    {isDragActive
                      ? 'Bırakın, yüklensin'
                      : 'Sürükle bırak ya da seç · Max: 1.5MB'}
                  </span>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`grid grid-cols-3 gap-2 rounded-lg p-1 transition-colors sm:grid-cols-4 ${
                  isDragActive ? 'bg-foreground/[0.04]' : ''
                }`}
              >
                {imageUrls.map((url, idx) => (
                  <ProductImageCard
                    key={`${url}-${idx}`}
                    url={url}
                    label={idx === 0 ? 'Ana görsel' : `Görsel ${idx + 1}`}
                    onRemove={() => setPendingDeleteIdx(idx)}
                  />
                ))}
                {imageUrls.length < MAX_IMAGES && (
                  <Dropdown>
                    <Dropdown.Trigger
                      aria-label="Görsel ekle"
                      isDisabled={isUploading}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/15 text-zinc-500 transition-colors hover:bg-foreground/[0.04]"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-[10px]">Ekle</span>
                    </Dropdown.Trigger>
                    <Dropdown.Popover
                      className="w-[200px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
                      style={{
                        border: '1px solid var(--border)',
                        boxShadow:
                          '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
                      }}
                    >
                      <Dropdown.Menu
                        aria-label="Görsel kaynağı"
                        onAction={(key) => {
                          if (key === 'ai') openAiImageModalOrRedirect();
                          else if (key === 'file') handleFilePick();
                        }}
                        className="flex flex-col gap-0 py-1 outline-none"
                      >
                        <Dropdown.Item
                          id="ai"
                          textValue="AI ile üret"
                          className="flex h-9 cursor-pointer items-center gap-2.5 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                        >
                          <BalinaOsMark className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          <span className="flex-1">AI ile üret</span>
                        </Dropdown.Item>
                        <Dropdown.Item
                          id="file"
                          textValue="Dosyalardan seç"
                          className="flex h-9 cursor-pointer items-center gap-2.5 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
                          <span className="flex-1">Dosyalardan seç</span>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />

          </Section>

          {/* === 3) Durumu + SKU + KDV (stack) === */}
          <Section>
            <FieldRow
              icon={<SquareCheck className="h-4 w-4 text-foreground/70" />}
              label="Durumu"
            >
              <div className="flex h-9 items-center gap-2 px-3">
                <Switch
                  isSelected={isActive}
                  onChange={setIsActive}
                  aria-label="Ürün aktif"
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
                <span className="text-sm text-foreground">
                  {isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </FieldRow>
            <FieldRow
              icon={<Tag className="h-4 w-4 text-foreground/70" />}
              label="SKU"
            >
              <TextField
                value={sku}
                onChange={(v) => {
                  setSku(v);
                  if (errors.sku) setErrors((p) => ({ ...p, sku: '' }));
                }}
                aria-label="SKU"
                isInvalid={!!errors.sku}
              >
                <SecondaryInput placeholder="Ekle" />
              </TextField>
            </FieldRow>
            <FieldRow
              icon={<Percent className="h-4 w-4 text-foreground/70" />}
              label="KDV"
            >
              <Dropdown>
                <Dropdown.Trigger
                  aria-label="KDV oranı"
                  className="flex h-9 w-full items-center justify-between rounded-xl bg-transparent px-3 text-sm outline-none transition-colors hover:bg-foreground/[0.03] data-[focused=true]:bg-foreground/[0.03]"
                >
                  <span className={vatRate ? 'text-foreground' : 'text-zinc-500'}>
                    {vatRate ? `%${vatRate}` : 'Ekle'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/60" />
                </Dropdown.Trigger>
                <Dropdown.Popover
                  className="min-w-[200px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
                  style={{
                    border: '1px solid var(--border)',
                    boxShadow:
                      '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
                  }}
                >
                  <Dropdown.Menu
                    aria-label="KDV oranı seç"
                    onAction={(key) => {
                      setVatRate(String(key));
                      if (errors.vatRate)
                        setErrors((p) => ({ ...p, vatRate: '' }));
                    }}
                    className="flex flex-col gap-0 py-1 outline-none"
                  >
                    {['0', '1', '10', '20'].map((rate) => (
                      <Dropdown.Item
                        key={rate}
                        id={rate}
                        textValue={`%${rate}`}
                        className="flex h-9 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                      >
                        <span className="flex-1">%{rate}</span>
                        {vatRate === rate && (
                          <Check className="h-3.5 w-3.5 text-foreground" />
                        )}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </FieldRow>
            {errors.sku && (
              <p className="ml-[136px] pt-1 text-xs text-danger">{errors.sku}</p>
            )}
          </Section>

          {/* === 4) Fiyatlar — Aktif entegrasyonlar (e-ticaret + pazaryerleri) + Alış === */}
          <Section>
            {activeStores.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">
                Aktif mağaza/entegrasyon yok. Önce bir mağaza bağlayın.
              </p>
            ) : (
              activeStores.map((store) => (
                <FieldRow
                  key={store.id}
                  icon={<StoreIcon name={store.name} platform={store.platform} />}
                  label={storeFiyatLabel(store)}
                >
                  <PriceField
                    value={storePrices[store.id] ?? ''}
                    onChange={(v) => {
                      setStorePrice(store.id, v);
                      if (errors.stores)
                        setErrors((p) => ({ ...p, stores: '' }));
                    }}
                    ariaLabel={`${store.name} fiyatı`}
                  />
                </FieldRow>
              ))
            )}
            <FieldRow
              icon={<Box className="h-4 w-4 text-foreground/70" />}
              label="Alış Fiyatı"
            >
              <PriceField
                value={purchasePrice}
                onChange={(v) => {
                  setPurchasePrice(v);
                  if (errors.purchasePrice)
                    setErrors((p) => ({ ...p, purchasePrice: '' }));
                }}
                ariaLabel="Alış Fiyatı"
              />
            </FieldRow>
            {!hasVariations && (
              <FieldRow
                icon={<Box className="h-4 w-4 text-foreground/70" />}
                label="Stok"
              >
                <TextField
                  value={stockQuantity}
                  onChange={(v) => {
                    setStockQuantity(v);
                    if (errors.stockQuantity)
                      setErrors((p) => ({ ...p, stockQuantity: '' }));
                  }}
                  aria-label="Stok"
                  isInvalid={!!errors.stockQuantity}
                >
                  <SecondaryInput type="number" placeholder="Ekle" />
                </TextField>
              </FieldRow>
            )}
            {errors.stores && (
              <p className="pt-2 text-xs text-danger">{errors.stores}</p>
            )}
          </Section>

          {/* === 5) Varyasyonlar === */}
          <Section noPadding>
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-black/5 p-4">
              <span className="flex-1 text-sm font-medium text-foreground">
                Varyasyonlar
              </span>
              {hasVariations && (
                <span className="text-xs text-zinc-500">
                  {variationRows.length} varyasyon
                </span>
              )}
              <Button
                variant="tertiary"
                size="sm"
                onPress={addAxis}
                isDisabled={axes.length >= MAX_AXES}
                className={PILL_BUTTON_CLASS}
              >
                Varyasyon Ekle
              </Button>
            </div>

            {/* Axis rows */}
            {axes.map((axis, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 border-b border-black/5 p-4"
              >
                {/* Drag handle (currently sadece görsel; ileride DnD) */}
                <button
                  type="button"
                  onClick={() => removeAxis(idx)}
                  aria-label={`${axis.name || 'Eksen'} sil`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-foreground/[0.04] hover:text-danger"
                >
                  <Grip className="h-4 w-4" />
                </button>

                <div className="flex flex-1 flex-col gap-2">
                  <input
                    value={axis.name}
                    onChange={(e) => renameAxis(idx, e.target.value)}
                    placeholder="Eksen (örn. Beden, Renk)"
                    className="h-5 bg-transparent text-sm font-medium leading-5 text-foreground outline-none placeholder:text-zinc-500"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {axis.options.map((opt, optIdx) => (
                      <Chip
                        key={`${opt}-${optIdx}`}
                        variant="soft"
                        className="h-8 gap-1 rounded-full bg-foreground/[0.06] px-3 text-xs font-medium"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeAxisOption(idx, optIdx)}
                          aria-label={`${opt} kaldır`}
                          className="ml-0.5 -mr-1 rounded-full p-0.5 text-zinc-500 hover:bg-foreground/10 hover:text-danger"
                        >
                          <Xmark className="h-3 w-3" />
                        </button>
                      </Chip>
                    ))}
                    <input
                      type="text"
                      value={axisOptionDrafts[idx] ?? ''}
                      onChange={(e) => setAxisOptionDraft(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          commitAxisOption(idx);
                        }
                      }}
                      onBlur={() => commitAxisOption(idx)}
                      placeholder={
                        axis.options.length === 0 ? 'S, M, L… (Enter)' : '+ ekle'
                      }
                      className="h-8 min-w-[100px] flex-1 rounded-full bg-transparent px-3 text-xs outline-none placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Seçenek Ekle — text link, button değil */}
            {axes.length < MAX_AXES && (
              <div className="flex h-12 items-center gap-2 px-4">
                <Plus className="h-4 w-4 text-foreground/70" />
                <button
                  type="button"
                  onClick={addAxis}
                  className="text-sm font-medium text-foreground/85 underline-offset-2 hover:underline"
                >
                  Seçenek Ekle
                </button>
              </div>
            )}

            {/* Master + sub-row liste */}
            {hasVariations && (
              <>
                <VariationsTable
                  groups={Array.from(groupedCombos.entries()).map(
                    ([groupVal, combos]) => ({
                      key: groupVal,
                      label: groupVal,
                      items: combos.map((c) => {
                        const key = comboKey(c);
                        const o = variationOverrides[key] ?? {};
                        // Sub-row label = grouping ekseni dışındaki axis değerleri
                        const subParts = Object.entries(c)
                          .filter(([axis]) => axis !== groupingAxis)
                          .map(([, val]) => val);
                        return {
                          key,
                          label: subParts.join(' / ') || groupVal,
                          stock: o.stockQuantity ?? '',
                        };
                      }),
                    }),
                  )}
                  selectedKeys={selectedComboKeys}
                  onToggleSelect={(key) => {
                    setSelectedComboKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  }}
                  onToggleGroupSelect={(group) => {
                    const ids = group.items.map((i) => i.key);
                    const allSel = ids.every((id) => selectedComboKeys.has(id));
                    setSelectedComboKeys((prev) => {
                      const next = new Set(prev);
                      ids.forEach((id) =>
                        allSel ? next.delete(id) : next.add(id),
                      );
                      return next;
                    });
                  }}
                  onStockChange={(key, value) =>
                    updateOverride(key, { stockQuantity: value })
                  }
                  onImageAi={() => openAiImageModalOrRedirect()}
                  onImageFile={() => handleFilePick()}
                />
              </>
            )}
          </Section>
        </div>
      </div>

      {/* === Görsel silme onayı === */}
      <AlertDialog
        isOpen={pendingDeleteIdx !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteIdx(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Görseli sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-3 pb-2">
                <p>Bu görsel galeriden kaldırılacak. Devam edilsin mi?</p>
              </AlertDialog.Body>
              <AlertDialog.Footer className="px-3 pb-3">
                <Button variant="tertiary" slot="close">
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (pendingDeleteIdx !== null) {
                      removeImage(pendingDeleteIdx);
                      setPendingDeleteIdx(null);
                    }
                  }}
                >
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* === Onay modalı === */}
      <Modal
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setConfirmOpen(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[480px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Mağazalara gönderilecek</Modal.Heading>
                <p className="mt-1 text-sm text-zinc-500">
                  Aşağıdaki mağazalara ürün pushlanacak. Onaylıyor musun?
                </p>
              </Modal.Header>
              <Modal.Body className="px-3 pb-3">
                <div className="flex flex-col gap-1.5">
                  {selectedStores.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-foreground/[0.03] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <StoreIcon name={s.name} platform={s.platform} />
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                      <span className="text-sm tabular-nums text-foreground">
                        ₺{s.price.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  ))}
                  {selectedStores.length === 0 && activeStores.length === 0 && (
                    <p className="text-xs text-zinc-500">Aktif mağaza yok.</p>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close" isDisabled={isSubmitting}>
                  Vazgeç
                </Button>
                <Button
                  variant="primary"
                  onPress={handleConfirmSubmit}
                  isPending={isSubmitting}
                  isDisabled={isSubmitting}
                >
                  <Check className="h-3.5 w-3.5" />
                  Onayla ve Yükle
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {currentCompany && (
        <ProductAiImageModal
          isOpen={aiModalOpen}
          onOpenChange={setAiModalOpen}
          companyId={currentCompany.id}
          onGenerated={(url) => addImageUrl(url)}
          productName={name}
        />
      )}
    </>
  );
}
