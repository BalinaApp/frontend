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
  TrashBin,
} from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Checkbox,
  Dropdown,
  Input,
  ListBox,
  Switch,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useAiStore } from '@/stores/aiStore';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { ProductAiImageModal } from '@/components/products/product-ai-image-modal';
import { VariationsTable } from '@/components/products/variations-table';

/**
 * Ürün düzenleme sayfası — Figma node 12284:8882 birebir.
 * Yeni ürün sayfasıyla aynı stack layout, pre-filled + Durumu switch.
 */

const MAX_IMAGES = 8;

// HeroUI <Input variant="secondary" /> + base saydam, focus'ta hafif bg.
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

/** Fiyat input — type=text + inputMode=decimal, TR formatı (1.234,56), ₺ suffix. */
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
    const sanitized = next.replace(/[^0-9.,]/g, '');
    setDraft(sanitized);
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

/** public/logos/ veya /figma/integrations/'tan platform logo path'i. */
function platformLogoSrc(
  platform: string | undefined,
  name: string,
): string | null {
  const p = (platform || '').toUpperCase();
  const n = name.toLowerCase();
  if (p === 'TRENDYOL' || n.includes('trendyol')) return '/logos/trendyol.svg';
  if (p === 'SHOPIFY' || n.includes('shopify'))
    return '/figma/integrations/shopify.png';
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

function StoreIcon({ name, platform }: { name: string; platform?: string }) {
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

/** Chat paneldeki AiMediaCard pattern'ı: hover'da kart gri bg + label fade out + Sil butonu fade in. */
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

function BalinaAiButton({
  onPress,
  isPending,
  isDisabled,
  label = 'Açıklama Oluştur',
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

export default function ProductEditPage() {
  usePageTitle('Ürün Düzenle');

  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const productId = params.productId as string;

  const { currentCompany } = useCompanyStore();
  const {
    selectedProduct,
    isLoading,
    error: loadError,
    fetchProduct,
    clearSelectedProduct,
    updateProduct,
    updateVariationStock,
  } = useInventoryStore();

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

  const openAiImageModalOrRedirect = () => {
    if (!hasAiIntegration) {
      toast.warning('Fashn.ai entegrasyonu yok — bağla sayfasından ekleyin');
      router.push(`/${companySlug}/stores?highlight=FASHN_AI`);
      return;
    }
    setAiModalOpen(true);
  };

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
      // SEO uyumlu, sabit formatlı şablon. AI bilinmeyen alanları
      // ürün adından mantıklı şekilde çıkarsar (kumaş, boy vb.); kullanıcı
      // sonradan editleyebilir. Format birebir korunur — Google rich results
      // ve LLM crawler'lar için scannable, anahtar kelime yoğunluğu doğal.
      const systemContent = [
        'Sen Türkçe e-ticaret kadın giyim ürün açıklaması uzmanısın. Aşağıdaki ŞABLONU BİREBİR (satır sayısı, emoji ve sıra) takip ederek SEO uyumlu bir açıklama üret.',
        '',
        'Çıktı yalnızca düz metin olsun — markdown/başlık/numara kullanma.',
        '',
        'ŞABLON (kategori adını ürün adından çıkar: Elbise / Ceket Takım / Pantolon / Tunik / vb.):',
        'Ürün kodu 👉🏻<SKU>',
        '<Kategori> fiyatı 👉🏻<fiyat>₺',
        '<Kategori> boy uzunluğu 👉🏻<cm> cm',
        'Kumaşı 👉🏻<kumaş tipi>',
        '',
        '🌿<beden aralığı> beden aralığıdır',
        '🌿<Kategori> <kalıp özelliği>',
        '<kalıp/beden tavsiyesi tek satır> 🌸',
        '🌿<özellik 1>',
        '🌿<özellik 2>',
        '',
        '(<parantez içinde kapanış tavsiyesi — kalıp / ölçü / kumaş ile ilgili>)',
        '',
        'KURALLAR:',
        '- SKU veya fiyat verilmemişse o satırı atla.',
        '- Bilinmeyen alanlar (boy/kumaş/beden aralığı/kalıp/astar/kuşak/yaka/kol vb.) için ürün adına ve kategoriye uygun mantıklı, satışa yönelik tahminler yap (örn. uzun elbise → 135-140 cm).',
        '- 🌿 ile başlayan 4-6 satır olsun; ürünün öne çıkan özelliklerini anahtar kelimelerle (tesettür, geniş kalıp, astarlı, viskon, müslim, kuşaklı, fermuarlı vb.) doğal şekilde vurgula.',
        '- 🌸 ile biten satır kalıp/beden tavsiyesi olsun (örn. "1 beden küçük tercih edebilirsiniz 🌸").',
        '- Kapanış parantezi tek cümle, müşteriye yönelik samimi ton.',
        '- SEO: ürün adındaki kategori + en az 2 öne çıkan özellik anahtar kelimesi spec bloğunda + bullet bloğunda geçsin.',
        '- 👉🏻 ve 🌿 emojilerini birebir kullan; başka emoji ekleme (yalnızca tavsiye satırında 🌸).',
      ].join('\n');
      const userParts = [
        `Ürün adı: ${name.trim()}`,
        sku.trim() ? `SKU: ${sku.trim()}` : '',
        price.trim() ? `Fiyat: ${price.trim()}₺` : '',
        description.trim()
          ? `Mevcut açıklama (referans al, gerekirse yeniden yaz): ${description.trim()}`
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

  useEffect(() => {
    if (currentCompany?.id && productId) {
      fetchProduct(currentCompany.id, productId);
      fetchAiIntegrations(currentCompany.id);
    }
    return () => clearSelectedProduct();
  }, [
    currentCompany?.id,
    productId,
    fetchProduct,
    clearSelectedProduct,
    fetchAiIntegrations,
  ]);

  // ---- Form ----
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [variationStockEdits, setVariationStockEdits] = useState<
    Record<string, string>
  >({});
  const [groupingAxis, setGroupingAxis] = useState<string>('');
  const [selectedVariationIds, setSelectedVariationIds] = useState<Set<string>>(
    new Set(),
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  /** Silme onayı bekleyen görsel index'i. null = kapalı. */
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedProduct) return;
    setName(selectedProduct.name);
    setSku(selectedProduct.sku ?? '');
    const extra = selectedProduct as unknown as {
      vatRate?: number | null;
      description?: string | null;
    };
    setVatRate(extra.vatRate != null ? String(extra.vatRate) : '');
    setPrice(selectedProduct.price?.toString() ?? '');
    setPurchasePrice(selectedProduct.purchasePrice?.toString() ?? '');
    setIsActive(selectedProduct.isActive);
    setImageUrls(selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []);
    setDescription(extra.description ?? '');
  }, [selectedProduct]);

  // ---- Grouping ----
  const variationAxisKeys = useMemo(() => {
    if (!selectedProduct) return [] as string[];
    const set = new Set<string>();
    for (const v of selectedProduct.variations) {
      if (v.attributes) Object.keys(v.attributes).forEach((k) => set.add(k));
    }
    return Array.from(set);
  }, [selectedProduct]);

  useEffect(() => {
    if (variationAxisKeys.length > 0 && !groupingAxis) {
      setGroupingAxis(variationAxisKeys[0]);
    }
  }, [variationAxisKeys, groupingAxis]);

  const groupedVariations = useMemo(() => {
    type V = NonNullable<typeof selectedProduct>['variations'][number];
    if (!selectedProduct || !groupingAxis) return new Map<string, V[]>();
    const map = new Map<string, V[]>();
    for (const v of selectedProduct.variations) {
      const groupVal = v.attributes?.[groupingAxis] ?? '—';
      if (!map.has(groupVal)) map.set(groupVal, []);
      map.get(groupVal)!.push(v);
    }
    return map;
  }, [selectedProduct, groupingAxis]);

  // ---- Image upload ----
  const addImageUrl = (url: string) =>
    setImageUrls((prev) => {
      if (prev.includes(url)) return prev;
      if (prev.length >= MAX_IMAGES) {
        toast.danger(`En fazla ${MAX_IMAGES} görsel`);
        return prev;
      }
      return [...prev, url];
    });

  const handleFilePick = () => fileInputRef.current?.click();

  const uploadFile = async (file: File) => {
    if (!currentCompany?.id || !selectedProduct) return;
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
      // Local state + backend'e otomatik kaydet (refresh'te kaybolmasın).
      // imageUrls state'i async — concat ile yeni listeyi hesaplayıp PATCH gönder.
      const nextUrls = imageUrls.includes(data.url)
        ? imageUrls
        : [...imageUrls, data.url].slice(0, MAX_IMAGES);
      setImageUrls(nextUrls);
      await updateProduct(currentCompany.id, selectedProduct.id, {
        imageUrls: nextUrls,
      });
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

  const removeImage = async (idx: number) => {
    if (!currentCompany?.id || !selectedProduct) return;
    const next = imageUrls.filter((_, i) => i !== idx);
    setImageUrls(next);
    // Backend'e patch — refresh'te güncel kalsın
    await updateProduct(currentCompany.id, selectedProduct.id, {
      imageUrls: next,
    });
  };

  // ---- Save ----
  const handleKaydet = async () => {
    if (!currentCompany?.id || !selectedProduct) return;
    if (!name.trim()) {
      toast.danger('Ürün başlığı gerekli');
      return;
    }
    setIsSaving(true);
    try {
      const patch = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        description: description.trim(),
        vatRate: vatRate ? Number(vatRate) : undefined,
        price: price ? Number(price) : undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        isActive,
      };
      const ok = await updateProduct(currentCompany.id, selectedProduct.id, patch);
      if (!ok) {
        toast.danger('Güncelleme başarısız');
        return;
      }
      const stockUpdates = Object.entries(variationStockEdits).filter(
        ([, v]) => v !== '' && !Number.isNaN(Number(v)),
      );
      let stockFailures = 0;
      for (const [variationId, newStock] of stockUpdates) {
        const success = await updateVariationStock(
          currentCompany.id,
          variationId,
          Number(newStock),
        );
        if (!success) stockFailures++;
      }
      if (stockFailures === 0) {
        toast.success('Ürün güncellendi');
        router.push(`/${companySlug}/products`);
      } else {
        toast.warning(`Ürün güncellendi, ${stockFailures} varyasyon hata`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentCompany || isLoading) return <PageHeader title="Ürün Adı" />;

  if (loadError) {
    return (
      <>
        <PageHeader title="Ürün Adı" />
        <div className="p-6">
          <div className="rounded-lg bg-danger/10 p-4 text-sm text-danger">
            {loadError}
          </div>
        </div>
      </>
    );
  }

  if (!selectedProduct) {
    return (
      <>
        <PageHeader title="Ürün Adı" />
        <div className="p-6 text-sm text-zinc-500">Ürün bulunamadı</div>
      </>
    );
  }

  const hasVariations = selectedProduct.variations.length > 0;
  const mappingStores = selectedProduct.mapping?.stores ?? [];

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
            isPending={isSaving}
            isDisabled={isSaving}
            className="h-8 rounded-full bg-foreground/[0.04] px-3 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Kaydet
          </Button>
        }
      />

      <div className="flex flex-1 flex-col overflow-auto">
        <div className="mx-auto flex w-full max-w-[616px] flex-col gap-3 px-3 py-6">
          {/* === 1) Başlık + Açıklama + AI === */}
          <Section>
            <div className="flex flex-col gap-2">
              <TextField value={name} onChange={setName} aria-label="Ürün başlığı">
                <Input
                  fullWidth
                  variant="secondary"
                  placeholder="Ürün Başlığı"
                  className="bg-transparent focus:outline-none focus:ring-0 focus:bg-foreground/[0.06] text-lg font-medium leading-7 placeholder:text-zinc-500"
                />
              </TextField>
              <div>
                <TextField
                  value={description}
                  onChange={setDescription}
                  aria-label="Açıklama"
                >
                  <TextArea
                    fullWidth
                    variant="secondary"
                    placeholder="Açıklama Alanı"
                    rows={3}
                    className="
                      min-h-[88px]
                      resize-none
                      bg-transparent
                      focus:outline-none
                      focus:ring-0
                      focus:bg-foreground/[0.06]
                      placeholder:text-zinc-500
                    "
                  />
                </TextField>
                <div className="pointer-events-none flex flex-1 items-center justify-end mt-4">
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
          </Section>

          {/* === 2) Görsel — dashed border + drag & drop === */}
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

          {/* === 3) Durumu + SKU + KDV === */}
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
              <TextField value={sku} onChange={setSku} aria-label="SKU">
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
                    onAction={(key) => setVatRate(String(key))}
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
          </Section>

          {/* === 4) Fiyatlar — bağlı mağazalar (e-com + pazaryeri) + Alış === */}
          <Section>
            {mappingStores.length === 0 ? (
              <FieldRow
                icon={<StoreIcon name={selectedProduct.store.name} />}
                label={storeFiyatLabel({ name: selectedProduct.store.name })}
              >
                <PriceField
                  value={price}
                  onChange={setPrice}
                  ariaLabel="Mağaza fiyatı"
                />
              </FieldRow>
            ) : (
              mappingStores.map((s) => (
                <FieldRow
                  key={s.storeId}
                  icon={<StoreIcon name={s.storeName} />}
                  label={storeFiyatLabel({ name: s.storeName })}
                >
                  <PriceField
                    value={price}
                    onChange={setPrice}
                    ariaLabel={`${s.storeName} fiyatı`}
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
                onChange={setPurchasePrice}
                ariaLabel="Alış Fiyatı"
              />
            </FieldRow>
          </Section>

          {/* === 6) Varyasyonlar === */}
          {hasVariations && (
            <Section noPadding>
              <div className="flex items-center gap-2 border-b border-black/5 p-4">
                <span className="flex-1 text-sm font-medium text-foreground">
                  Varyasyonlar
                </span>
                <span className="text-xs text-zinc-500">
                  {selectedProduct.variations.length} varyasyon
                </span>
              </div>

              <VariationsTable
                groups={Array.from(groupedVariations.entries()).map(
                  ([groupVal, vars]) => ({
                    key: groupVal,
                    label: groupVal,
                    items: vars.map((v) => {
                      const otherParts = v.attributes
                        ? Object.entries(v.attributes)
                            .filter(([axis]) => axis !== groupingAxis)
                            .map(([, val]) => val)
                        : [];
                      return {
                        key: v.id,
                        label: otherParts.join(' / ') || groupVal,
                        stock:
                          variationStockEdits[v.id] ??
                          v.stockQuantity.toString(),
                      };
                    }),
                  }),
                )}
                selectedKeys={selectedVariationIds}
                onToggleSelect={(key) => {
                  setSelectedVariationIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  });
                }}
                onToggleGroupSelect={(group) => {
                  const ids = group.items.map((i) => i.key);
                  const allSel = ids.every((id) =>
                    selectedVariationIds.has(id),
                  );
                  setSelectedVariationIds((prev) => {
                    const next = new Set(prev);
                    ids.forEach((id) =>
                      allSel ? next.delete(id) : next.add(id),
                    );
                    return next;
                  });
                }}
                onStockChange={(key, value) => {
                  setVariationStockEdits((prev) => ({
                    ...prev,
                    [key]: value,
                  }));
                }}
                onImageAi={() => openAiImageModalOrRedirect()}
                onImageFile={() => handleFilePick()}
              />
            </Section>
          )}
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
                  onPress={async () => {
                    if (pendingDeleteIdx !== null) {
                      const idx = pendingDeleteIdx;
                      setPendingDeleteIdx(null);
                      await removeImage(idx);
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

      {currentCompany && (
        <ProductAiImageModal
          isOpen={aiModalOpen}
          onOpenChange={setAiModalOpen}
          companyId={currentCompany.id}
          onGenerated={(url) => addImageUrl(url)}
          initialProductImage={imageUrls[0] ?? null}
          productName={name}
        />
      )}
    </>
  );
}
