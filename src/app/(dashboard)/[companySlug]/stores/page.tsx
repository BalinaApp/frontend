'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { UpgradePlanModal } from '@/components/pricing/upgrade-plan-modal';
import { ArrowsRotateRight as Loader2, TrashBin as Trash2, ArrowUpRightFromSquare as ExternalLink, Check, Sparkles } from '@gravity-ui/icons';
import { ArrowsRotateRight as Loader, ArrowsRotateRight as RefreshCw, Eye, EyeSlash as EyeOff } from '@gravity-ui/icons';
import { BalinaConfirmDialog, BalinaInput, BalinaModal, BalinaSwitch, BalinaTextField, BalinaTextarea, toast } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useProductMappingStore } from '@/stores/productMappingStore';
import { useAiStore, FAL_MODEL_CATALOG } from '@/stores/aiStore';
import { FalMark } from '@/components/icons/fal-mark';
import { BizimhesapMark } from '@/components/icons/bizimhesap-mark';
import { ParasutMark } from '@/components/icons/parasut-mark';
import { EtsyMark } from '@/components/icons/etsy-mark';
import { useInvoiceIntegrationStore } from '@/stores/invoiceIntegrationStore';
import { useInstagramIntegrationStore, type InstagramConfig, type InstagramConfigPatch } from '@/stores/instagramIntegrationStore';
import { useTiktokIntegrationStore } from '@/stores/tiktokIntegrationStore';
import { TiktokMark } from '@/components/icons/tiktok-mark';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaIntegrationIcon, BalinaButton, BalinaSearchIcon, BalinaDropdown, BalinaDropdownItem, BalinaIntegrationRow, type BalinaTabItem } from '@/components/balina';
import { ChevronDown, Plus } from '@gravity-ui/icons';

type Marketplace = {
  id: string;
  name: string;
  description?: string;
  logo: string;
  comingSoon: boolean;
  // Backend `platform` enum — `id` is the UI-only identifier (e.g. legacy
  // 'WORDPRESS' for WooCommerce), so we keep `platform` separate to map
  // straight onto `/stores/marketplace/:platform/...` endpoints.
  platform?: 'WOOCOMMERCE' | 'SHOPIFY' | 'TRENDYOL' | 'HEPSIBURADA' | 'ETSY';
  steps?: Array<{
    key: string;
    label: string;
    placeholder: string;
    description: string;
    type?: string;
  }>;
  helpUrl?: string;
};

type IntegrationCategory = {
  id: string;
  title: string;
  items: Marketplace[];
};

const woocommerce: Marketplace = {
  id: 'WORDPRESS',
  name: 'Woocommerce',
  description: 'Sınırsız ürün ekle ve sat.',
  logo: '/figma/integrations/woocommerce.png',
  comingSoon: false,
  platform: 'WOOCOMMERCE',
  // One-click OAuth akışı: kullanıcı sadece isim + URL girer, sonraki adım
  // WP admin'e yönlendirip Approve almak. Consumer Key/Secret artık otomatik
  // alınıyor — bkz. handleWoocommerceStart + /integrations/woocommerce/return.
  steps: [
    { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
    { key: 'url', label: 'Site URL', placeholder: 'https://example.com', description: 'WooCommerce sitenizin URL adresini girin. https:// ile başlamalı.' },
  ],
  helpUrl: 'https://woocommerce.com/document/woocommerce-rest-api/',
};

const shopify: Marketplace = {
  id: 'SHOPIFY',
  name: 'Shopify',
  description: 'Global e-ticaret platformu.',
  logo: '/figma/integrations/shopify.png',
  comingSoon: false,
  platform: 'SHOPIFY',
  steps: [
    { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
    { key: 'shopDomain', label: 'Shop Domain', placeholder: 'mystore.myshopify.com', description: 'Shopify mağazanızın .myshopify.com domain adresini girin.' },
    { key: 'accessToken', label: 'Access Token', placeholder: 'shpat_xxxxxxxx', type: 'password', description: 'Shopify Admin API Custom App access token\'ınızı girin.' },
  ],
  helpUrl: 'https://shopify.dev/docs/api/admin-rest',
};

const etsy: Marketplace = {
  id: 'ETSY',
  name: 'Etsy',
  description: 'El yapımı ve vintage ürün pazaryeri.',
  logo: '/figma/integrations/etsy.png',
  comingSoon: false,
  platform: 'ETSY',
  // One-click OAuth (PKCE): kullanıcı sadece isim girer, sonraki adım Etsy'ye
  // yönlendirip Approve almak. Token swap + mağaza kaydı callback'te otomatik —
  // bkz. handleEtsyStart + /integrations/etsy/return.
  steps: [
    { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
  ],
  helpUrl: 'https://developers.etsy.com/documentation/',
};

const hepsiburada: Marketplace = {
  id: 'HEPSIBURADA',
  name: 'Hepsiburada',
  description: 'Çok kategorili online pazaryeri.',
  logo: '/figma/integrations/hepsiburada.png',
  comingSoon: false,
  platform: 'HEPSIBURADA',
  steps: [
    { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
    { key: 'merchantId', label: 'Merchant ID', placeholder: 'Örn. ABCDEF', description: 'Hepsiburada satıcı (merchant) ID bilginizi girin.' },
    { key: 'hbUsername', label: 'API Kullanıcı Adı', placeholder: 'Hepsiburada API kullanıcı adı', description: 'Hepsiburada entegrasyon API kullanıcı adınızı girin.' },
    { key: 'hbPassword', label: 'API Şifresi', placeholder: 'Hepsiburada API şifresi', type: 'password', description: 'Hepsiburada entegrasyon API şifresini girin.' },
  ],
  helpUrl: 'https://developers.hepsiburada.com/',
};

const trendyol: Marketplace = {
  id: 'TRENDYOL',
  name: 'Trendyol',
  description: 'Türkiye’nin lider pazaryeri.',
  logo: '/figma/integrations/trendyol.png',
  comingSoon: false,
  platform: 'TRENDYOL',
  steps: [
    { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
    { key: 'sellerId', label: 'Satıcı ID', placeholder: 'Örn. 2738', description: 'Trendyol satıcı (seller) ID bilginizi girin.' },
    { key: 'apiKey', label: 'API Key', placeholder: 'Trendyol API Key', description: 'Trendyol entegrasyon API Key bilginizi girin.' },
    { key: 'apiSecret', label: 'API Secret', placeholder: 'Trendyol API Secret', type: 'password', description: 'Trendyol entegrasyon API Secret bilginizi girin.' },
  ],
  helpUrl: 'https://developers.trendyol.com/docs',
};

const integrationCategories: IntegrationCategory[] = [
  {
    id: 'shops',
    title: 'Mağazalar',
    items: [
      woocommerce,
      shopify,
      { id: 'IKAS', name: 'ikas', description: 'Yerel e-ticaret altyapısı.', logo: '/figma/integrations/ikas.png', comingSoon: true },
    ],
  },
  {
    id: 'marketplaces',
    title: 'Pazaryerleri',
    items: [
      trendyol,
      hepsiburada,
      etsy,
      { id: 'CICEKSEPETI', name: 'Çiçeksepeti', description: 'Çiçek ve hediye pazaryeri.', logo: '/figma/integrations/ciceksepeti.png', comingSoon: true },
    ],
  },
  {
    id: 'invoicing',
    title: 'E-Fatura',
    items: [
      {
        id: 'BIZIMHESAP',
        name: 'Bizim Hesap',
        description: 'B2B fatura otomasyonu.',
        logo: '',
        comingSoon: false,
      },
      {
        id: 'PARASUT',
        name: 'Paraşüt',
        description: 'Ön muhasebe ve e-fatura.',
        logo: '',
        comingSoon: false,
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Kargolar',
    items: [
      { id: 'DHL', name: 'DHL', description: 'Uluslararası kargo gönderileri.', logo: '/figma/integrations/dhl.png', comingSoon: false },
      { id: 'YURTICI', name: 'Yurtiçi Kargo', description: 'Yurt içi kargo hizmeti.', logo: '/figma/integrations/yurtici.png', comingSoon: true },
      { id: 'ARAS', name: 'Aras', description: 'Yurt içi kargo hizmeti.', logo: '/figma/integrations/aras.png', comingSoon: true },
      { id: 'SURAT', name: 'Sürat', description: 'Yurt içi kargo hizmeti.', logo: '/figma/integrations/surat.png', comingSoon: true },
    ],
  },
  {
    id: 'social',
    title: 'Sosyal Medya',
    items: [
      { id: 'INSTAGRAM', name: 'Instagram', description: 'Sosyal medya hesabınızı bağlayın.', logo: '/figma/integrations/instagram.png', comingSoon: false },
      { id: 'TIKTOK', name: 'TikTok', description: 'TikTok hesabınızı bağlayın, video paylaşın.', logo: '', comingSoon: false },
      { id: 'WHATSAPP', name: 'WhatsApp', description: 'WhatsApp Business mesajlaşma.', logo: '/figma/integrations/whatsapp.png', comingSoon: true },
    ],
  },
  {
    id: 'ai',
    title: 'Yapay Zeka',
    items: [
      {
        id: 'FAL_AI',
        name: 'Fal.ai',
        description: 'Flux modelleri ile görsel ve video üretimi.',
        // Logo dosyası yok — render tarafında özel tile kullanılıyor
        // (mor-pembe gradyan + Sparkles ikonu).
        logo: '',
        comingSoon: false,
      },
      {
        id: 'OPENAI',
        name: 'OpenAI',
        description: 'GPT modelleri ile ürün açıklaması ve sohbet üretimi.',
        logo: '',
        comingSoon: false,
      },
    ],
  },
];

// Brand tile background — the downloaded PNGs are already styled brand
// chips with their own colour fills, so we just need to render them at
// `cover` inside the 40 × 40 rounded tile. Adding Figma's 135° gloss on
// top whitewashes the corners and hides every centred glyph except the
// few brands whose logo sits dead-centre, so it's intentionally omitted.
const brandTileStyle = (logo: string): React.CSSProperties => ({
  backgroundImage: `url(${logo})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

const siteFaviconUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return null;
  }
};

// Hero banner örnek otomasyon pill'leri — sürekli dönerek (her birkaç saniyede
// bir kayarak) entegrasyonların ne işe yaradığını gösterir.
const HERO_PILLS: Array<{ mark: string; name: string; text: string }> = [
  { mark: '/figma/integrations/shopify.png', name: 'Shopify', text: 'Siparişleri otomatik senkronize et' },
  { mark: '/figma/integrations/trendyol.png', name: 'Trendyol', text: 'Stokları tüm mağazalarda eşitle' },
  { mark: '/figma/integrations/openai.svg', name: 'OpenAI', text: 'Ürün açıklamalarını yapay zekâ ile yaz' },
  { mark: '/figma/integrations/hepsiburada.png', name: 'Hepsiburada', text: 'Yeni siparişleri anında çek' },
  { mark: '/figma/integrations/woocommerce.png', name: 'WooCommerce', text: 'Ürünleri tek tıkla içe aktar' },
  { mark: '/figma/integrations/dhl.png', name: 'DHL', text: 'Kargo takip kodlarını otomatik ekle' },
];

function HeroPills() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, []);
  // 3 görünür pill — her tick'te liste bir adım kayar.
  const visible = [0, 1, 2].map(
    (i) => HERO_PILLS[(tick + i) % HERO_PILLS.length],
  );
  return (
    <div className="relative flex flex-col items-center gap-3 px-6 py-12">
      {visible.map((pill, i) => (
        <div
          key={`${tick}-${i}`}
          className="animate-in fade-in-0 slide-in-from-bottom-1 flex w-full max-w-md items-center gap-2.5 rounded-2xl bg-white/55 px-3.5 py-2.5 backdrop-blur-md duration-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pill.mark}
            alt=""
            className="h-5 w-5 shrink-0 rounded-md object-contain"
          />
          <span className="shrink-0 text-sm font-medium leading-5 text-foreground">{pill.name}</span>
          <span className="truncate text-sm leading-5 text-[var(--balina-text-muted)]">{pill.text}</span>
        </div>
      ))}
    </div>
  );
}

// Backend Shopify için `url`'i `https://example.com` placeholder olarak
// dönüyor (doc: "ileride https://{shopDomain} olarak düzeltilecek"). Bu
// helper Shopify mağazalarını gerçek shopDomain üzerinden gösteriyor;
// shopDomain backend'den gelmezse aşağıdaki localStorage cache'ine düşer
// (kullanıcının wizard'da girdiği değer).
type ShopifyDisplayInput = {
  platform?: string;
  shopDomain?: string | null;
  url: string;
};

const SHOPIFY_DOMAIN_CACHE_KEY = 'balina:shopify-domains';

const readShopifyDomainCache = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SHOPIFY_DOMAIN_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeShopifyDomainCache = (cache: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHOPIFY_DOMAIN_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota / private mode — silently skip
  }
};

const getStoreDisplay = (
  store: ShopifyDisplayInput
): { displayUrl: string; href: string; useShopifyBrand: boolean } => {
  if (store.platform === 'SHOPIFY') {
    // Tercih sırası: backend'in döndürdüğü shopDomain → url'den parse
    // (yeni Shopify mağazalarında url = https://shopDomain) → 'shopify.com'.
    const explicit = store.shopDomain?.trim();
    if (explicit) {
      return {
        displayUrl: explicit,
        href: `https://${explicit}`,
        useShopifyBrand: true,
      };
    }
    try {
      const u = new URL(store.url);
      if (u.hostname && u.hostname !== 'example.com') {
        return {
          displayUrl: u.hostname,
          href: store.url,
          useShopifyBrand: true,
        };
      }
    } catch {
      // url parse edilemedi — fallback'e düş
    }
    return {
      displayUrl: 'shopify.com',
      href: 'https://www.shopify.com',
      useShopifyBrand: true,
    };
  }
  return {
    displayUrl: store.url.replace(/^https?:\/\//, ''),
    href: store.url,
    useShopifyBrand: false,
  };
};

export default function StoresPage() {
  usePageTitle('Entegrasyon');

  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const companySlug = routeParams?.companySlug as string | undefined;

  // ?highlight=OPENAI / FAL_AI — drawer'dan yönlendirme sonrası ilgili
  // tile'ı kısa süre scale animasyonu ile vurgula + viewport'a kaydır, sonra
  // query'yi temizle.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = searchParams?.get('highlight');
    if (!h) return;
    setHighlightId(h);
    // Tile mount olunca scrollIntoView yap — ref bir sonraki render'da set olur.
    const scrollT = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 50);
    const t = window.setTimeout(() => {
      setHighlightId(null);
      if (companySlug) {
        router.replace(`/${companySlug}/stores`, { scroll: false });
      }
    }, 1600);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(scrollT);
    };
  }, [searchParams, companySlug, router]);

  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores, deleteStore } = useStoreStore();
  const { runAutoMatch } = useProductMappingStore();

  // Hero arama — `search` filtre yardımcılarında kullanılıyor (boş = tümü).
  const [search, setSearch] = useState('');
  // Sıralama: 'recommended' (katalog sırası) | 'az' (alfabetik).
  const [sortBy, setSortBy] = useState<'recommended' | 'az'>('recommended');
  // Entegrasyon durum filtresi: Hepsi / Aktif / Pasif (segmented).
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<string>('all');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Fal.ai entegrasyonu — birden fazla hesap desteği. Mağaza akışından
  // farklı, tek alanlı API anahtarı stepper'ı kullanıyor.
  const {
    fals,
    integrations,
    fetchFalIntegrations,
    updateFalIntegration,
    testFalKey,
  } = useAiStore();
  const openais = integrations.filter((i) => i.provider === 'openai');

  // Fal hesap kimliği — model seçim akışı (handleModelPickerOpen) için tutulur.
  const [manageFalId, setManageFalId] = useState<string | null>(null);
  const manageFal = manageFalId
    ? integrations.find((i) => i.id === manageFalId) ?? null
    : null;

  // E-Fatura entegrasyonları (Bizim Hesap + Paraşüt) — Fal.ai ile aynı
  // pattern: birden fazla hesap, stepper modal, "Bağlı Olanlar" listesinde
  // Yönet butonu. Bağla akışı stepper modal, yönet akışı ayrı modal.
  const {
    bizimhesaps,
    parasuts,
    fetchInvoiceIntegrations,
  } = useInvoiceIntegrationStore();

  useEffect(() => {
    if (currentCompany?.id) fetchInvoiceIntegrations(currentCompany.id);
  }, [currentCompany?.id, fetchInvoiceIntegrations]);

  // Instagram — "Bağlı Olanlar" listesi + chatbot Yönet modalı için.
  const {
    configs: igConfigs,
    fetchConfig: fetchIgConfig,
    disconnect: disconnectIg,
    testConnection: testIg,
    updateConfig: updateIgConfig,
  } = useInstagramIntegrationStore();

  // "Bağlı Olanlar" listesinde IG kartlarını render edebilmek için sayfa
  // mount'unda tüm store'ların IG config'ini çek (404'lar sessiz geçer).
  useEffect(() => {
    if (!currentCompany?.id) return;
    for (const s of stores) {
      void fetchIgConfig(currentCompany.id, s.id);
    }
  }, [currentCompany?.id, stores, fetchIgConfig]);

  // Bağlı IG hesapları için Yönet & Bağlantıyı kaldır state'i
  const [manageIgStoreId, setManageIgStoreId] = useState<string | null>(null);
  const [disconnectIgStoreId, setDisconnectIgStoreId] = useState<string | null>(
    null,
  );
  const [igTestingStoreId, setIgTestingStoreId] = useState<string | null>(null);
  const [igDisconnecting, setIgDisconnecting] = useState(false);

  const handleIgTest = async (storeId: string) => {
    if (!currentCompany?.id) return;
    setIgTestingStoreId(storeId);
    const result = await testIg(currentCompany.id, storeId);
    setIgTestingStoreId(null);
    if (result?.ok) {
      toast.success(`Bağlantı çalışıyor: @${result.account?.username}`);
    } else {
      toast.danger('Bağlantı testi başarısız');
    }
  };

  const handleIgDisconnect = async () => {
    if (!currentCompany?.id || !disconnectIgStoreId) return;
    setIgDisconnecting(true);
    const ok = await disconnectIg(currentCompany.id, disconnectIgStoreId);
    setIgDisconnecting(false);
    if (ok) {
      toast.success('Instagram bağlantısı kaldırıldı');
      setDisconnectIgStoreId(null);
    } else {
      toast.danger('Bağlantı kaldırılamadı');
    }
  };

  // OAuth dönüşünden geldiyse (?ig=connected) sadece stale query'i temizle —
  // bağlama akışı artık ayrı route sayfasında.
  useEffect(() => {
    if (searchParams?.get('ig') === 'connected' && currentCompany?.id) {
      if (companySlug) {
        router.replace(`/${companySlug}/stores`, { scroll: false });
      }
    }
  }, [searchParams, currentCompany?.id, companySlug, router]);

  // ===== TikTok — bağlı durumları "Bağlı Olanlar" listesinde göstermek için =====
  const {
    configs: ttConfigs,
    fetchConfig: fetchTtConfig,
  } = useTiktokIntegrationStore();

  // Mount'ta tüm store'ların TikTok bağlantı durumunu çek (404/403 sessiz).
  useEffect(() => {
    if (!currentCompany?.id) return;
    for (const s of stores) {
      void fetchTtConfig(currentCompany.id, s.id);
    }
  }, [currentCompany?.id, stores, fetchTtConfig]);

  // OAuth dönüşü (?tiktok=connected) → durumları tazele + stale query'i temizle.
  useEffect(() => {
    if (searchParams?.get('tiktok') === 'connected' && currentCompany?.id) {
      for (const s of stores) void fetchTtConfig(currentCompany.id, s.id);
      if (companySlug) {
        router.replace(`/${companySlug}/stores`, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentCompany?.id, companySlug, router]);

  // Model seçim modalı (Fal) — Yönet içinden açılan model picker.
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerSelection, setModelPickerSelection] = useState<Set<string>>(
    new Set()
  );
  const [modelPickerSaving, setModelPickerSaving] = useState(false);
  const [modelPickerSearch, setModelPickerSearch] = useState('');

  useEffect(() => {
    if (currentCompany?.id) fetchFalIntegrations(currentCompany.id);
  }, [currentCompany?.id, fetchFalIntegrations]);

  type CargoConnection = {
    id: string;
    provider: string;
    apiUsername: string | null;
    customerNumber: string | null;
    identityType: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  const [cargoConnections, setCargoConnections] = useState<CargoConnection[]>(
    [],
  );

  // Backend cargo controller'ı `company/:companyId/cargo` altında — tüm cargo
  // çağrılarında bu prefix gerekiyor. currentCompany yoksa fetch atlanır.
  const fetchCargoConnections = async () => {
    if (!currentCompany?.id) {
      setCargoConnections([]);
      return;
    }
    try {
      const res = await api.get<CargoConnection[]>(
        `/company/${currentCompany.id}/cargo/connections`,
      );
      setCargoConnections(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCargoConnections([]);
    }
  };

  useEffect(() => {
    if (currentCompany?.id) fetchCargoConnections();
    // currentCompany switch'inde tekrar çekiyoruz; fetch fonksiyonu component
    // içinde tanımlı olduğu için dep listesine eklemiyoruz (her render'da
    // yeniden yaratılıyor).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  const handleModelPickerOpen = () => {
    if (!manageFal) return;
    // Mevcut seçili modeller; hiç yoksa varsayılan: 1 image + 1 video default.
    const defaults = FAL_MODEL_CATALOG.filter((m) => m.isDefault).map((m) => m.id);
    const initial =
      manageFal.models && manageFal.models.length > 0 ? manageFal.models : defaults;
    setModelPickerSelection(new Set(initial));
    setModelPickerSearch('');
    setModelPickerOpen(true);
  };

  const handleModelPickerSave = async () => {
    if (!currentCompany?.id || !manageFalId) return;
    setModelPickerSaving(true);
    const updated = await updateFalIntegration(currentCompany.id, manageFalId, {
      models: Array.from(modelPickerSelection),
    });
    setModelPickerSaving(false);
    if (updated) {
      toast.success('Modeller güncellendi');
      setModelPickerOpen(false);
    } else {
      toast.danger('Güncellenemedi');
    }
  };

  // Tek-seçim-per-kind: aynı türden başka model seçiliyse onu çıkar, bunu ekle.
  // Aynı modele tekrar tıklamak seçimi kaldırır.
  const toggleModelPick = (id: string) => {
    const meta = FAL_MODEL_CATALOG.find((m) => m.id === id);
    if (!meta) return;
    setModelPickerSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // Aynı türden mevcut seçimleri kaldır
      for (const existing of next) {
        const existingMeta = FAL_MODEL_CATALOG.find((m) => m.id === existing);
        if (existingMeta?.kind === meta.kind) next.delete(existing);
      }
      next.add(id);
      return next;
    });
  };

  // Yeni eklenen mağaza için "ilk sync bitti mi" bekçisi. Tamamlandığında
  // otomatik mapping önerileri çekilip kullanıcıya CTA gösteriliyor.
  const [pendingMappingStoreId, setPendingMappingStoreId] = useState<string | null>(null);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [isAutoMatching, setIsAutoMatching] = useState(false);

  // Shopify mağazalarının kullanıcı tarafından girilen shopDomain'i —
  // backend henüz response'larda dönmediği için lokalde saklıyoruz.
  const [shopifyDomains, setShopifyDomains] = useState<Record<string, string>>({});
  useEffect(() => {
    setShopifyDomains(readShopifyDomainCache());
  }, []);

  const [settingsState, setSettingsState] = useState<
    Record<
      string,
      {
        commissionRate: string;
        shippingCost: string;
        saving: boolean;
        saved: boolean;
        error: string | null;
      }
    >
  >({});
  // Mağaza ayarları modalı sekmesi (Genel / Stok Sync / Trendyol).
  const [deleteConfirmStoreId, setDeleteConfirmStoreId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // DHL (MNG Kargo) bağlantısı — MNG portal müşteri numarası + kimlik tipi
  // + şifre alınıyor. IBM API Gateway client_id/secret sunucu .env'sinde
  // sabit; frontend yalnızca müşteri kimliklerini gönderiyor.
  // identityType MNG connect DTO'sunda sabit 1 — doc'a göre tek geçerli değer.
  // Form'da kullanıcıya sormuyoruz, payload'da her zaman 1 gönderiyoruz.

  // Trendyol settings tab — Webhook'u yeniden kur / Son siparişleri çek
  // butonlarının yükleme durumları.

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  useEffect(() => {
    const hasSyncingStore = stores.some((s) => s.isSyncing);
    if (!hasSyncingStore || !currentCompany?.id) return;
    const interval = setInterval(() => {
      fetchStores(currentCompany.id);
    }, 2000);
    return () => clearInterval(interval);
  }, [stores, currentCompany?.id, fetchStores]);

  // Yeni eklenen mağazanın ilk sync'i bitince mapping önerilerini çekip
  // varsa kullanıcıya CTA gösteriyoruz. Diğer mağaza yoksa endpoint zaten
  // boş döner, dialog açılmaz.
  useEffect(() => {
    if (!pendingMappingStoreId || !currentCompany?.id) return;
    const store = stores.find((s) => s.id === pendingMappingStoreId);
    if (!store) return;
    if (store.syncError) {
      setPendingMappingStoreId(null);
      return;
    }
    if (store.isSyncing || !store.lastSyncAt) return;

    const companyId = currentCompany.id;
    setPendingMappingStoreId(null);
    (async () => {
      try {
        const response = await api.get(
          `/company/${companyId}/products/mappings/suggestions`
        );
        const count = Array.isArray(response.data) ? response.data.length : 0;
        if (count > 0) {
          setSuggestionsCount(count);
          setShowSuggestionsDialog(true);
        }
      } catch {
        // Mağaza eklendi, sync tamamlandı — öneri çekimi best-effort.
      }
    })();
  }, [pendingMappingStoreId, stores, currentCompany?.id]);

  useEffect(() => {
    const newState: typeof settingsState = {};
    stores.forEach((store) => {
      if (!settingsState[store.id]) {
        newState[store.id] = {
          commissionRate: String(store.commissionRate || 0),
          shippingCost: String(store.shippingCost || 0),
          saving: false,
          saved: false,
          error: null,
        };
      } else {
        newState[store.id] = settingsState[store.id];
      }
    });
    if (Object.keys(newState).length > 0) {
      setSettingsState((prev) => ({ ...prev, ...newState }));
    }
  }, [stores]);

  // Trendyol panelinde aboneliği yenile — satıcı başına 15 webhook limiti var,
  // backend gerekirse eski kaydı silip yeni kuruyor.

  // Sipariş pull yedek — webhook bir süredir gelmiyorsa veya son siparişler
  // dashboard'a düşmediyse kullanıcı buradan tetikler. Doc §5'e göre üst sınır
  // 720 saat (30 gün), default 2 saat; biz 24 saatlik pencereyi seçtik.

  const handleMarketplaceClick = (marketplace: Marketplace) => {
    if (marketplace.comingSoon) return;
    // Tüm bağlama akışları (pazaryeri/mağaza, Fal/OpenAI, DHL, E-Fatura,
    // Instagram, TikTok) artık ayrı route sayfasında (stores/[integrationId]).
    if (!companySlug) return;
    if (
      marketplace.platform ||
      marketplace.id === 'DHL' ||
      marketplace.id === 'FAL_AI' ||
      marketplace.id === 'OPENAI' ||
      marketplace.id === 'BIZIMHESAP' ||
      marketplace.id === 'PARASUT' ||
      marketplace.id === 'INSTAGRAM' ||
      marketplace.id === 'TIKTOK'
    ) {
      router.push(`/${companySlug}/stores/${marketplace.id}`);
      return;
    }
    if (!marketplace.steps) {
      toast.info('Bu entegrasyon yakında eklenecek');
      return;
    }
    router.push(`/${companySlug}/stores/${marketplace.id}`);
  };

  const handleAutoMatch = async () => {
    if (!currentCompany?.id) return;
    setIsAutoMatching(true);
    try {
      const result = await runAutoMatch(currentCompany.id);
      if (result) {
        toast.success(
          `${result.created} eşleştirme oluşturuldu${
            result.skipped ? `, ${result.skipped} atlandı` : ''
          }`
        );
        setShowSuggestionsDialog(false);
        setSuggestionsCount(0);
      } else {
        toast.danger('Otomatik eşleştirme başarısız');
      }
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Otomatik eşleştirme başarısız');
    } finally {
      setIsAutoMatching(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentCompany?.id || !deleteConfirmStoreId) return;
    setIsDeleting(true);
    try {
      await deleteStore(currentCompany.id, deleteConfirmStoreId);
      if (shopifyDomains[deleteConfirmStoreId]) {
        const { [deleteConfirmStoreId]: _removed, ...rest } = shopifyDomains;
        setShopifyDomains(rest);
        writeShopifyDomainCache(rest);
      }
      toast.success('Mağaza bağlantısı kesildi');
      setDeleteConfirmStoreId(null);
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Mağaza silinemedi');
    } finally {
      setIsDeleting(false);
    }
  };

  const matchesSearch = (text: string) =>
    !search.trim() ||
    text.toLocaleLowerCase('tr').includes(search.trim().toLocaleLowerCase('tr'));

  const filteredStores = stores.filter(
    (s) => matchesSearch(s.name) || matchesSearch(s.url)
  );

  const visibleCategories = integrationCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((m) => matchesSearch(m.name)),
    }))
    .filter((cat) => cat.items.length > 0);

  // Shared pill button — Figma's 36-px chip on #EBEBEC. We use the same
  // muted black-translucent tone the Settings "Çıkış yap" button uses so
  // every action pill across the app reads identically over any backdrop.
  // Bağlı Olanlar grid'i — açık, yumuşak zemin (design system token) + ince ring.
  const cardShellClass =
    'rounded-2xl bg-[var(--balina-background-dark-faint)] shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)]';

  // Katalog öğelerini seçili sıralamaya göre dön — 'az' alfabetik, aksi halde
  // katalog (önerilen) sırası korunur. Yakında olanlar her zaman sona iner.
  const sortedItems = (items: Marketplace[]): Marketplace[] => {
    const ordered =
      sortBy === 'az'
        ? [...items].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        : items;
    return [...ordered].sort(
      (a, b) => Number(a.comingSoon) - Number(b.comingSoon),
    );
  };

  const hasConnected =
    filteredStores.length > 0 ||
    fals.length > 0 ||
    openais.length > 0 ||
    bizimhesaps.length > 0 ||
    parasuts.length > 0 ||
    cargoConnections.length > 0;

  // Aktif (bağlı) entegrasyon TÜR id'leri — kart/sekme durum filtresi için.
  const activeIds = new Set<string>();
  stores.forEach((s) => {
    if (s.platform === 'WOOCOMMERCE') activeIds.add('WORDPRESS');
    else if (s.platform) activeIds.add(s.platform);
  });
  if (fals.length > 0) activeIds.add('FAL_AI');
  if (openais.length > 0) activeIds.add('OPENAI');
  if (bizimhesaps.length > 0) activeIds.add('BIZIMHESAP');
  if (parasuts.length > 0) activeIds.add('PARASUT');
  if (cargoConnections.some((c) => c.provider?.toUpperCase().includes('DHL')))
    activeIds.add('DHL');
  if (Object.values(igConfigs).some((c) => c?.connected)) activeIds.add('INSTAGRAM');
  if (Object.values(ttConfigs).some((c) => c?.connected)) activeIds.add('TIKTOK');

  // Durum sekmeleri: Hepsi / Aktif / Pasif.
  const integrationTabs: BalinaTabItem[] = [
    { id: 'all', label: 'Hepsi' },
    { id: 'active', label: 'Bağlı Olanlar' },
    { id: 'passive', label: 'Pasif' },
  ];
  const activeTab = integrationTabs.some((t) => t.id === activeIntegrationTab)
    ? activeIntegrationTab
    : 'all';

  // Her entegrasyon için "Destek" YouTube videosu. Anahtar = marketplace.id.
  // TODO: linkler verildikçe doldur (örn. woocommerce: 'https://youtu.be/...').

  return (
    <>
      {/* Durum filtresi (Hepsi/Aktif/Pasif) artık arama satırındaki dropdown'da. */}
      <PageHeader
        title="Entegrasyonlar"
        icon={<BalinaIntegrationIcon className="h-4 w-4" />}
      />
      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-4">
        {/* İçerik 960px container ile ortalanır (marketplace tarzı). */}
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8 pb-8 pt-2">
          {/* Hero — başlık. */}
          <h1 className="pt-4 text-center text-xl font-normal text-foreground sm:text-2xl">
            Ekibinizin kullandığı araçları bağlayın
          </h1>

          {/* Arama (sol, kısa) + Sıralama/Filtre (sağ) — hepsi Balina bileşeni. */}
          <div className="flex items-center justify-between gap-3">
            <BalinaInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Entegrasyon ara…"
              leftIcon={<BalinaSearchIcon className="h-4 w-4" />}
              wrapperClassName="w-full max-w-[300px]"
            />
            <div className="flex items-center gap-2">
            <BalinaDropdown
              align="end"
              size="small"
              trigger={
                <BalinaButton
                  variant="soft"
                  className="outline-none focus-visible:outline-none"
                  rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
                >
                  {sortBy === 'az' ? 'A-Z' : 'Sırala'}
                </BalinaButton>
              }
            >
              <BalinaDropdownItem
                selected={sortBy === 'recommended'}
                onSelect={() => setSortBy('recommended')}
              >
                Önerilen
              </BalinaDropdownItem>
              <BalinaDropdownItem
                selected={sortBy === 'az'}
                onSelect={() => setSortBy('az')}
              >
                A-Z
              </BalinaDropdownItem>
            </BalinaDropdown>
            <BalinaDropdown
              align="end"
              size="small"
              trigger={
                <BalinaButton
                  variant="soft"
                  className="outline-none focus-visible:outline-none"
                  rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
                >
                  {activeTab === 'active' ? 'Bağlı Olanlar' : activeTab === 'passive' ? 'Pasif' : 'Hepsi'}
                </BalinaButton>
              }
            >
              {integrationTabs.map((t) => (
                <BalinaDropdownItem
                  key={t.id}
                  selected={activeTab === t.id}
                  onSelect={() => setActiveIntegrationTab(t.id)}
                >
                  {t.label}
                </BalinaDropdownItem>
              ))}
            </BalinaDropdown>
            </div>
          </div>

          {/* Hero banner — yumuşak mesh gradyan + dönen örnek otomasyon pill'leri. */}
          <div className="relative overflow-hidden rounded-[1.25rem]">
            <div className="absolute inset-0 bg-[radial-gradient(80%_110%_at_12%_10%,#cfe0ff_0%,transparent_55%),radial-gradient(70%_100%_at_92%_88%,#ffe0cf_0%,transparent_55%),radial-gradient(60%_90%_at_55%_50%,#efe6fb_0%,transparent_60%),linear-gradient(135deg,#eef3ff_0%,#f4f1fb_50%,#f6f4f1_100%)]" />
            <HeroPills />
          </div>
          {/* Bağlı Olanlar — Pasif sekmesinde gizli (yalnızca Hepsi/Aktif'te). */}
          {hasConnected && activeTab !== 'passive' && (
            <section className="flex flex-col gap-4">
              <h2 className="pl-5 text-xs font-medium text-muted">Bağlı Olanlar</h2>
              <div
                className={`grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 ${cardShellClass}`}
              >
                {filteredStores.map((store) => {
                  const isSyncing = store.isSyncing && store.status === 'ACTIVE';
                  const display = getStoreDisplay({
                    ...store,
                    shopDomain: store.shopDomain || shopifyDomains[store.id],
                  });
                  // Shopify mağazaları için backend'in placeholder url'i
                  // anlamsız favicon getirir; bunun yerine Shopify brand
                  // logosu ve gerçek shopDomain (varsa) gösteriyoruz.
                  const favicon = display.useShopifyBrand
                    ? null
                    : siteFaviconUrl(store.url);
                  const fallbackLogo = display.useShopifyBrand
                    ? '/figma/integrations/shopify.png'
                    : '/figma/integrations/woocommerce.png';
                  return (
                    <BalinaIntegrationRow
                      key={store.id}
                      icon={
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]">
                          {favicon ? (
                            <img
                              src={favicon}
                              alt=""
                              className="h-6 w-6"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = fallbackLogo;
                                e.currentTarget.classList.remove('h-6', 'w-6');
                                e.currentTarget.classList.add('h-full', 'w-full', 'object-cover');
                              }}
                            />
                          ) : (
                            <img src={fallbackLogo} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      }
                      title={store.name}
                      description={
                        <a
                          href={display.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-fit max-w-full items-center gap-1 truncate hover:text-foreground"
                        >
                          <span className="truncate">{display.displayUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      }
                      action={
                        <div className="flex items-center gap-2">
                          {isSyncing && (
                            <Loader className="h-4 w-4 animate-spin text-muted" aria-label="Senkronize ediliyor" />
                          )}
                          <BalinaButton
                            variant="soft"
                            size="default"
                            onClick={() => {
                              // Mağaza yönetimi artık single sayfada.
                              const id =
                                store.platform === 'WOOCOMMERCE' ? 'WORDPRESS'
                                : store.platform === 'SHOPIFY' ? 'SHOPIFY'
                                : store.platform === 'TRENDYOL' ? 'TRENDYOL'
                                : store.platform === 'HEPSIBURADA' ? 'HEPSIBURADA'
                                : store.platform === 'ETSY' ? 'ETSY'
                                : null;
                              if (id && companySlug) router.push(`/${companySlug}/stores/${id}`);
                            }}
                          >
                            Yönet
                          </BalinaButton>

                        </div>
                      }
                    />
                  );
                })}

                {/* Bağlı Instagram hesapları — her mağaza için per-store.
                    Mağaza adı + @username · chatbot durumu, Yönet ayar
                    modal'ını açar. */}
                {filteredStores.map((store) => {
                  const cfg = igConfigs[store.id];
                  if (!cfg?.connected) return null;
                  const isTesting = igTestingStoreId === store.id;
                  return (
                    <BalinaIntegrationRow
                      key={`ig-${store.id}`}
                      icon={
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/figma/integrations/instagram.png"
                          alt="Instagram"
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      }
                      title={store.name}
                      description={`@${cfg.username} · ${cfg.chatbotActive ? 'Chatbot aktif' : 'Chatbot kapalı'}`}
                      action={
                        <div className="flex items-center gap-2">
                          {isTesting && (
                            <Loader className="h-4 w-4 animate-spin text-muted" aria-label="Test ediliyor" />
                          )}
                          <BalinaButton
                            variant="soft"
                            size="default"
                            onClick={() => setManageIgStoreId(store.id)}
                          >
                            Yönet
                          </BalinaButton>
                        </div>
                      }
                    />
                  );
                })}

                {/* Bağlı Fal.ai hesapları */}
                {fals.map((fal) => (
                  <BalinaIntegrationRow
                    key={fal.id}
                    icon={<FalMark className="h-10 w-10 rounded-xl" role="img" aria-label="Fal.ai" />}
                    title={fal.name}
                    description={
                      <>
                        Fal.ai • <span className="font-mono">••••{fal.apiKeyTail ?? '----'}</span>
                      </>
                    }
                    action={
                      <BalinaButton
                        variant="soft"
                        size="default"
                        onClick={() => companySlug && router.push(`/${companySlug}/stores/FAL_AI`)}
                      >
                        Yönet
                      </BalinaButton>
                    }
                  />
                ))}

                {/* Bağlı OpenAI hesapları */}
                {openais.map((oa) => (
                  <BalinaIntegrationRow
                    key={oa.id}
                    icon={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/figma/integrations/openai.svg" alt="OpenAI" className="h-10 w-10 rounded-xl" />
                    }
                    title={oa.name}
                    description={
                      <>
                        OpenAI • <span className="font-mono">••••{oa.apiKeyTail ?? '----'}</span>
                      </>
                    }
                    action={
                      <BalinaButton
                        variant="soft"
                        size="default"
                        onClick={() => companySlug && router.push(`/${companySlug}/stores/OPENAI`)}
                      >
                        Yönet
                      </BalinaButton>
                    }
                  />
                ))}

                {/* Bağlı Bizim Hesap hesapları */}
                {bizimhesaps.map((bh) => (
                  <BalinaIntegrationRow
                    key={bh.id}
                    icon={<BizimhesapMark className="h-10 w-10 rounded-xl" role="img" aria-label="Bizim Hesap" />}
                    title={bh.label || 'Bizim Hesap'}
                    description={`Bizim Hesap • Firma ${bh.config.firmId || '—'}`}
                    action={
                      <BalinaButton
                        variant="soft"
                        size="default"
                        onClick={() => companySlug && router.push(`/${companySlug}/stores/BIZIMHESAP`)}
                      >
                        Yönet
                      </BalinaButton>
                    }
                  />
                ))}

                {/* Bağlı Paraşüt hesapları */}
                {parasuts.map((ps) => (
                  <BalinaIntegrationRow
                    key={ps.id}
                    icon={<ParasutMark className="h-10 w-10 rounded-xl" role="img" aria-label="Paraşüt" />}
                    title={ps.label || 'Paraşüt'}
                    description={`Paraşüt • Şirket ${ps.config.parasutCompanyId || '—'}`}
                    action={
                      <BalinaButton
                        variant="soft"
                        size="default"
                        onClick={() => companySlug && router.push(`/${companySlug}/stores/PARASUT`)}
                      >
                        Yönet
                      </BalinaButton>
                    }
                  />
                ))}

                {/* Bağlı kargo hesapları — backend tarafında provider 'MNG'
                olarak saklanır; UI'da DHL adıyla bağlandığı için "DHL" diye
                gösteriyoruz. */}
                {cargoConnections.map((cn) => {
                  const label = cn.provider === 'MNG' ? 'DHL' : cn.provider;
                  const meta = cn.customerNumber
                    ? `Müşteri No: ${cn.customerNumber}`
                    : cn.apiUsername || cn.provider;
                  return (
                    <BalinaIntegrationRow
                      key={cn.id}
                      icon={
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]">
                          <img src="/figma/integrations/dhl.png" alt="" className="h-full w-full object-cover" />
                        </div>
                      }
                      title={label}
                      description={meta}
                      action={
                        <BalinaButton
                          variant="soft"
                          size="default"
                          onClick={() => companySlug && router.push(`/${companySlug}/stores/DHL`)}
                        >
                          Yönet
                        </BalinaButton>
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Mevcut entegrasyonlar — Aktif sekmesinde gizli; Pasif'te yalnızca
              bağlı olmayanlar. */}
          {activeTab !== 'active' &&
            visibleCategories
              .map((cat) => ({
                ...cat,
                items:
                  activeTab === 'passive'
                    ? cat.items.filter((it) => !activeIds.has(it.id))
                    : cat.items,
              }))
              .filter((cat) => cat.items.length > 0)
              .map((cat) => (
            <section key={cat.id} className="flex flex-col gap-4">
              <h2 className="pl-3 text-xs font-medium text-muted">{cat.title}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sortedItems(cat.items).map((item) => {
                  const isDisabled = item.comingSoon;
                  // Fal.ai için her zaman "Bağla" — kullanıcı birden fazla
                  // hesap ekleyebilsin diye Yönet'i kart üstünde değil,
                  // Bağlı Olanlar listesinde gösteriyoruz.
                  const isHighlighted = highlightId === item.id;
                  const icon =
                    item.id === 'FAL_AI' ? (
                      <FalMark className="h-10 w-10 rounded-xl" role="img" aria-label={item.name} />
                    ) : item.id === 'TIKTOK' ? (
                      <TiktokMark className="h-10 w-10 rounded-xl" role="img" aria-label={item.name} />
                    ) : item.id === 'OPENAI' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/figma/integrations/openai.svg" alt={item.name} className="h-10 w-10 rounded-xl" role="img" aria-label={item.name} />
                    ) : item.id === 'BIZIMHESAP' ? (
                      <BizimhesapMark className="h-10 w-10 rounded-xl" role="img" aria-label={item.name} />
                    ) : item.id === 'PARASUT' ? (
                      <ParasutMark className="h-10 w-10 rounded-xl" role="img" aria-label={item.name} />
                    ) : item.id === 'ETSY' ? (
                      <EtsyMark className="h-10 w-10 rounded-xl" role="img" aria-label={item.name} />
                    ) : (
                      <div className="h-10 w-10 rounded-xl" style={brandTileStyle(item.logo)} aria-label={item.name} role="img" />
                    );
                  return (
                    <BalinaIntegrationRow
                      key={item.id}
                      ref={isHighlighted ? highlightRef : undefined}
                      muted={isDisabled}
                      highlighted={isHighlighted}
                      icon={icon}
                      title={item.name}
                      description={item.description}
                      action={
                        isDisabled ? (
                          <span className="px-1.5 text-xs font-medium text-muted">
                            Yakında
                          </span>
                        ) : (
                          <BalinaButton
                            variant="soft"
                            size="default"
                            aria-label={`${item.name} bağla`}
                            onClick={() => handleMarketplaceClick(item)}
                            leftIcon={<Plus className="h-4 w-4" />}
                          />
                        )
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {activeTab === 'active' && !hasConnected && (
            <p className="text-center text-sm text-muted">
              Henüz aktif (bağlı) bir entegrasyon yok.
            </p>
          )}
          {activeTab !== 'active' &&
            filteredStores.length === 0 &&
            visibleCategories.length === 0 && (
              <p className="text-center text-sm text-muted">
                Aramanızla eşleşen entegrasyon bulunamadı.
              </p>
            )}
        </div>
      </div>

      {/* Model seçim alt-modalı — Bağla modalı estetiğiyle, çoklu seçim. */}
      <BalinaModal
        open={modelPickerOpen}
        onOpenChange={(open) => {
          if (!open && !modelPickerSaving) setModelPickerOpen(false);
        }}
        className="sm:max-w-md"
        title={
          <span className="flex items-center gap-2">
            <FalMark className="h-6 w-6 rounded-md" />
            Model Seç
          </span>
        }
      >
              <div>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted">
                    Görsel ve video için birer model seçin (her türden en fazla 1 tane).
                    Üretim sırasında otomatik olarak bunlar kullanılacak.
                  </p>

                  {/* Search input — Entegrasyonlardaki varyantla aynı stil */}
                  <BalinaInput
                    value={modelPickerSearch}
                    onChange={(e) => setModelPickerSearch(e.target.value)}
                    aria-label="Model ara"
                    wrapperClassName="w-full"
                    leftIcon={<BalinaSearchIcon className="h-4 w-4" />}
                    placeholder="Model adı veya id ile ara..."
                  />

                  {(() => {
                    const q = modelPickerSearch.trim().toLowerCase();
                    const matches = (m: { id: string; label: string; description: string }) =>
                      !q ||
                      m.id.toLowerCase().includes(q) ||
                      m.label.toLowerCase().includes(q) ||
                      m.description.toLowerCase().includes(q);
                    const list = FAL_MODEL_CATALOG.filter(matches);
                    // Her türden zaten bir model seçili mi? Seçiliyse aynı türden
                    // diğer modeller disable olur — kullanıcı tek-türü-tek-model
                    // kuralını switch'le yönetir.
                    const selectedByKind = (kind: 'image' | 'video') =>
                      FAL_MODEL_CATALOG.find(
                        (m) => m.kind === kind && modelPickerSelection.has(m.id),
                      )?.id ?? null;
                    const selectedImage = selectedByKind('image');
                    const selectedVideo = selectedByKind('video');

                    if (list.length === 0) {
                      return (
                        <p className="rounded-lg bg-surface-secondary/30 p-3 text-xs text-muted">
                          Eşleşen model yok.
                        </p>
                      );
                    }

                    return (
                      <div
                        className="scrollbar-none flex max-h-[420px] flex-col gap-2 overflow-y-auto"
                        style={{
                          maskImage:
                            'linear-gradient(to bottom, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)',
                          WebkitMaskImage:
                            'linear-gradient(to bottom, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)',
                          paddingTop: 12,
                          paddingBottom: 12,
                        }}
                      >
                        {list.map((m) => {
                          const checked = modelPickerSelection.has(m.id);
                          const sameKindSelected =
                            m.kind === 'image' ? selectedImage : selectedVideo;
                          // Aynı türden başka bir model zaten seçiliyse bu satır disable.
                          const isDisabled = !checked && !!sameKindSelected;
                          return (
                            <label
                              key={m.id}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                                checked
                                  ? 'border-accent bg-accent/5'
                                  : isDisabled
                                    ? 'cursor-not-allowed border-border bg-surface-secondary/20 opacity-50'
                                    : 'cursor-pointer border-border hover:bg-surface-secondary/50'
                              }`}
                            >
                              <BalinaSwitch
                                checked={checked}
                                disabled={isDisabled}
                                onCheckedChange={() => toggleModelPick(m.id)}
                              />
                              <div className="flex flex-1 flex-col">
                                <span className="text-sm font-medium text-foreground">
                                  {m.label}
                                </span>
                                <span className="text-xs text-muted">
                                  {m.description}
                                </span>
                                <span className="mt-0.5 font-mono text-[10px] text-muted/70">
                                  {m.id}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <BalinaButton
                      variant="soft"
                      size="small"
                      onClick={() => setModelPickerOpen(false)}
                      disabled={modelPickerSaving}
                    >
                      Vazgeç
                    </BalinaButton>
                    <BalinaButton
                      variant="primary"
                      size="small"
                      onClick={handleModelPickerSave}
                      disabled={modelPickerSaving || modelPickerSelection.size === 0}
                    >
                      {modelPickerSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </BalinaButton>
                  </div>
                </div>
              </div>
      </BalinaModal>

      <BalinaModal
        open={showSuggestionsDialog}
        onOpenChange={(open) => {
          if (!open && !isAutoMatching) {
            setShowSuggestionsDialog(false);
            setSuggestionsCount(0);
          }
        }}
        className="sm:max-w-md"
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            SKU Eşleşmesi Bulundu
          </span>
        }
        footer={
          <>
            <BalinaButton
              variant="soft"
              className="flex-1"
              disabled={isAutoMatching}
              onClick={() => {
                if (!isAutoMatching) {
                  setShowSuggestionsDialog(false);
                  setSuggestionsCount(0);
                }
              }}
            >
              Belki Sonra
            </BalinaButton>
            <BalinaButton
              className="flex-1"
              onClick={handleAutoMatch}
              disabled={isAutoMatching}
            >
              {isAutoMatching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eşleştiriliyor...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Otomatik Eşleştir
                </>
              )}
            </BalinaButton>
          </>
        }
      >
                <p className="text-sm text-muted">
                  Mağazalarınız arasında <span className="font-medium text-foreground">{suggestionsCount}</span>{' '}
                  SKU eşleşmesi tespit edildi. Otomatik olarak eşleştirilsin mi? Stok ve fiyat değişimleri
                  bağlı mağazalarda senkron tutulacak.
                </p>
      </BalinaModal>

      <UpgradePlanModal
        isOpen={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        description="Maalesef Free plan'da 1 mağazadan fazla ekleyemezsiniz. Daha fazla mağaza eklemek için planınızı yükseltin."
      />

      <BalinaModal
        open={!!deleteConfirmStoreId}
        onOpenChange={(open) => !open && setDeleteConfirmStoreId(null)}
        className="sm:max-w-md"
        title={
          <span className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-danger" />
            Mağazayı Sil
          </span>
        }
        footer={
          <>
            <BalinaButton
              variant="soft"
              className="flex-1"
              disabled={isDeleting}
              onClick={() => !isDeleting && setDeleteConfirmStoreId(null)}
            >
              İptal
            </BalinaButton>
            <BalinaButton
              variant="danger"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                'Evet, Sil'
              )}
            </BalinaButton>
          </>
        }
      >
                {deleteConfirmStoreId && (
                  <p className="text-sm text-muted">
                    <span className="font-medium text-foreground">
                      {stores.find((s) => s.id === deleteConfirmStoreId)?.name}
                    </span>{' '}
                    mağazasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                )}
      </BalinaModal>

      {/* Instagram chatbot ayarları — bağlı her mağaza için Yönet butonu açar */}
      {manageIgStoreId && igConfigs[manageIgStoreId] && (
        <ChatbotSettingsModal
          isOpen={manageIgStoreId !== null}
          onClose={() => setManageIgStoreId(null)}
          config={igConfigs[manageIgStoreId]}
          onTest={() => handleIgTest(manageIgStoreId)}
          onDisconnect={() => {
            setDisconnectIgStoreId(manageIgStoreId);
            setManageIgStoreId(null);
          }}
          onSave={async (patch) => {
            if (!currentCompany?.id || !manageIgStoreId) return;
            const updated = await updateIgConfig(
              currentCompany.id,
              manageIgStoreId,
              patch,
            );
            if (updated) {
              toast.success('Ayarlar kaydedildi');
              setManageIgStoreId(null);
            } else {
              toast.danger('Kaydedilemedi');
            }
          }}
        />
      )}

      {/* Instagram bağlantısını kaldır — confirm */}
      <BalinaConfirmDialog
        open={disconnectIgStoreId !== null}
        onOpenChange={(open) => {
          if (!igDisconnecting && !open) setDisconnectIgStoreId(null);
        }}
        title="Bağlantıyı kaldır"
        titleIcon={<Trash2 className="h-5 w-5 text-danger" />}
        confirmLabel="Kaldır"
        cancelLabel="Vazgeç"
        danger
        loading={igDisconnecting}
        onConfirm={handleIgDisconnect}
      >
        <p className="text-sm text-muted">
          Instagram bağlantısı kaldırıldığında chatbot kapanır ve yeni
          gelen mesajlar işlenmez. Mevcut sohbet geçmişi silinmez.
        </p>
      </BalinaConfirmDialog>
    </>
  );
}

// ============================================================================
// Instagram chatbot ayarları modal — eski /conversations/setup sayfasından
// taşındı. Yönet butonu açar; Vazgeç / Kaydet / Test et / Bağlantıyı kaldır.
// ============================================================================

function ChatbotSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
  onTest,
  onDisconnect,
}: {
  isOpen: boolean;
  onClose: () => void;
  config: InstagramConfig;
  onSave: (patch: InstagramConfigPatch) => Promise<void>;
  onTest: () => void;
  onDisconnect: () => void;
}) {
  const [chatbotActive, setChatbotActive] = useState(config.chatbotActive);
  const [chatbotMode, setChatbotMode] = useState<'learning' | 'live'>(
    config.chatbotMode ?? 'learning',
  );
  const [sysPrompt, setSysPrompt] = useState(config.sysPromptOverride ?? '');
  const [adminInstagramId, setAdminInstagramId] = useState(
    config.adminInstagramId ?? '',
  );
  const [iban, setIban] = useState(config.iban ?? '');
  const [accountName, setAccountName] = useState(config.accountName ?? '');
  const [dhlCode, setDhlCode] = useState(config.dhlCode ?? '');
  // Boş = sistem varsayılanı. Sağlayıcıya özel bir model adını (ör. 'gpt-4o')
  // buraya sabitlemek, backend başka bir sağlayıcıya geçince 404 üretiyor.
  const [defaultModel, setDefaultModel] = useState(config.defaultModel ?? '');
  const [showPrompt, setShowPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    await onSave({
      chatbotActive,
      chatbotMode,
      sysPromptOverride: sysPrompt.trim() ? sysPrompt : null,
      adminInstagramId: adminInstagramId.trim(),
      iban: iban.trim(),
      accountName: accountName.trim(),
      dhlCode: dhlCode.trim(),
      defaultModel,
    });
    setSaving(false);
  }, [
    chatbotActive,
    chatbotMode,
    sysPrompt,
    adminInstagramId,
    iban,
    accountName,
    dhlCode,
    defaultModel,
    onSave,
  ]);

  return (
    <BalinaModal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      className="sm:max-w-[560px]"
      title="Chatbot ayarları"
      footer={
        <>
          <BalinaButton variant="soft" disabled={saving} onClick={() => !saving && onClose()}>
            Vazgeç
          </BalinaButton>
          <BalinaButton
            variant="primary"
            onClick={handleSubmit}
            disabled={saving}
            leftIcon={<Check className="h-3.5 w-3.5" />}
          >
            Kaydet
          </BalinaButton>
        </>
      }
    >
              <div className="flex flex-col gap-3">
                {/* Hesap özeti */}
                <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] p-3">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-foreground">
                      @{config.username}
                    </div>
                    <div className="text-[11px] text-muted">
                      {config.connected
                        ? 'Instagram bağlı'
                        : 'Instagram bağlı değil'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <BalinaButton
                      variant="soft"
                      size="small"
                      onClick={onTest}
                      aria-label="Bağlantıyı test et"
                      className="h-8 w-8 bg-foreground/[0.06]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </BalinaButton>
                    <BalinaButton
                      variant="danger"
                      size="small"
                      onClick={onDisconnect}
                      aria-label="Bağlantıyı kaldır"
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </BalinaButton>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Chatbot aktif
                    </div>
                    <div className="text-xs text-muted">
                      Kapalı iken gelen mesajlar Sohbetler&apos;de görünür ama
                      AI cevap üretmez.
                    </div>
                  </div>
                  <BalinaSwitch
                    checked={chatbotActive}
                    onCheckedChange={setChatbotActive}
                  />
                </div>

                {/* Çalışma modu — Learning (gözlem) vs Live (AI aktif). */}
                <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Çalışma modu
                    </div>
                    <div className="text-xs text-muted">
                      <strong>Learning</strong>: AI sessiz, sadece mesajları
                      kaydeder (admin analiz eder).
                      <br />
                      <strong>Live</strong>: AI gelen mesajlara otomatik cevap
                      verir.
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-0.5 rounded-full bg-foreground/[0.06] p-0.5">
                    {(['learning', 'live'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setChatbotMode(m)}
                        className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors ${
                          chatbotMode === m
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {m === 'learning' ? 'Learning' : 'Live'}
                      </button>
                    ))}
                  </div>
                </div>

                <BalinaTextField
                  label="Admin Instagram ID"
                  value={adminInstagramId}
                  onChange={setAdminInstagramId}
                  aria-label="Admin Instagram PSID"
                  placeholder="26701310816144690"
                />

                <div className="grid grid-cols-2 gap-2">
                  <BalinaTextField label="IBAN" value={iban} onChange={setIban} placeholder="TR70 0020 ..." />
                  <BalinaTextField label="Hesap sahibi" value={accountName} onChange={setAccountName} placeholder="İsim Soyisim" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <BalinaTextField label="DHL kodu" value={dhlCode} onChange={setDhlCode} placeholder="915737309" />
                  <BalinaTextField
                    label="Varsayılan model"
                    value={defaultModel}
                    onChange={setDefaultModel}
                    placeholder="Sistem varsayılanı"
                    description="Boş bırakırsan sistemdeki AI modeli kullanılır."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-body-small-one-liner-medium px-1 text-[var(--balina-text-strong)]">Sistem promptu (özelleştirme)</label>
                  <button
                    type="button"
                    onClick={() => setShowPrompt((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
                  >
                    {showPrompt ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Gizle
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Göster
                      </>
                    )}
                  </button>
                </div>
                {showPrompt && (
                  <BalinaTextarea
                    value={sysPrompt}
                    onChange={(e) => setSysPrompt(e.target.value)}
                    rows={8}
                    placeholder="Boş bırakırsan varsayılan prompt kullanılır."
                    className="font-mono text-xs"
                  />
                )}
              </div>
    </BalinaModal>
  );
}
