'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { UpgradePlanModal } from '@/components/pricing/upgrade-plan-modal';
import { ArrowsRotateRight as Loader2, TrashBin as Trash2, ArrowUpRightFromSquare as ExternalLink, Check, Sparkles, Gear as Settings, Key } from '@gravity-ui/icons';
import { ArrowsRotateRight as Loader, ArrowsRotateRight as RefreshCw, CircleExclamation as AlertCircle, Link as LinkIcon, PlugConnection as Plug, Copy, Eye, EyeSlash as EyeOff } from '@gravity-ui/icons';
import { Alert, AlertDialog, Button, Card, Chip, Input, InputGroup, Label, Modal, SearchField, Switch, Tabs, TextField, toast } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useProductMappingStore } from '@/stores/productMappingStore';
import { useAiStore, FAL_MODEL_CATALOG, type ProductType } from '@/stores/aiStore';
import { resizeImageToDataUrl } from '@/lib/image-resize';
import { FalMark } from '@/components/icons/fal-mark';
import { MobileSidebarToggle } from '@/components/layout/mobile-sidebar-toggle';
import { BizimhesapMark } from '@/components/icons/bizimhesap-mark';
import { ParasutMark } from '@/components/icons/parasut-mark';
import { useInvoiceIntegrationStore } from '@/stores/invoiceIntegrationStore';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';

type Marketplace = {
  id: string;
  name: string;
  description?: string;
  logo: string;
  comingSoon: boolean;
  // Backend `platform` enum — `id` is the UI-only identifier (e.g. legacy
  // 'WORDPRESS' for WooCommerce), so we keep `platform` separate to map
  // straight onto `/stores/marketplace/:platform/...` endpoints.
  platform?: 'WOOCOMMERCE' | 'SHOPIFY' | 'TRENDYOL' | 'HEPSIBURADA';
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
      { id: 'INSTAGRAM', name: 'Instagram', description: 'Sosyal medya hesabınızı bağlayın.', logo: '/figma/integrations/instagram.png', comingSoon: true },
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
        id: 'FASHN_AI',
        name: 'Fashn.ai',
        description: 'Sanal kıyafet deneme (VTON) — kişiye kıyafet sadık şekilde geçirir.',
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

  // ?highlight=OPENAI / FASHN_AI / FAL_AI — drawer'dan yönlendirme sonrası ilgili
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
  const { stores, fetchStores, updateStore, deleteStore, syncStore } =
    useStoreStore();
  const { runAutoMatch } = useProductMappingStore();

  const [search, setSearch] = useState('');
  const [selectedMarketplace, setSelectedMarketplace] = useState<Marketplace | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    meta?: { shopName?: string; currency?: string; country?: string; domain?: string };
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: '',
    shopDomain: '',
    accessToken: '',
    sellerId: '',
    apiKey: '',
    apiSecret: '',
    environment: 'prod' as 'prod' | 'stage',
    merchantId: '',
    hbUsername: '',
    hbPassword: '',
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Fal.ai entegrasyonu — birden fazla hesap desteği. Mağaza akışından
  // farklı, tek alanlı API anahtarı stepper'ı kullanıyor.
  const {
    fals,
    integrations,
    fetchFalIntegrations,
    createFalIntegration,
    createIntegration,
    updateFalIntegration,
    removeFalIntegration,
    testFalKey,
    testApiKey,
    testFalIntegration,
    isSavingFal,
  } = useAiStore();
  const fashns = integrations.filter((i) => i.provider === 'fashn');
  const openais = integrations.filter((i) => i.provider === 'openai');

  // "Bağla" akışı — Fal/Fashn/OpenAI aynı dialog'u paylaşıyor.
  const [isFalDialogOpen, setIsFalDialogOpen] = useState(false);
  const [falDialogProvider, setFalDialogProvider] = useState<
    'fal' | 'fashn' | 'openai'
  >('fal');
  const [falForm, setFalForm] = useState({ apiKey: '', name: '' });
  const [falShowKey, setFalShowKey] = useState(false);
  const [falCurrentStep, setFalCurrentStep] = useState(0);
  const falProviderLabel =
    falDialogProvider === 'fashn'
      ? 'Fashn.ai'
      : falDialogProvider === 'openai'
        ? 'OpenAI'
        : 'Fal.ai';

  // "Yönet" akışı (mevcut hesabı düzenle)
  const [manageFalId, setManageFalId] = useState<string | null>(null);
  const [manageFalKey, setManageFalKey] = useState('');
  const [manageFalShowKey, setManageFalShowKey] = useState(false);
  const [manageFalTesting, setManageFalTesting] = useState(false);
  const [manageFalTestResult, setManageFalTestResult] = useState<
    { ok: boolean; error?: string } | null
  >(null);
  // Header card switch — kapatıp Kaydet derse hesap kaldırılır.
  const [manageFalActive, setManageFalActive] = useState(true);
  // Üretilen görsellerin SKU öneki (örn 'KZ'). Boş ise sadece kod kullanılır.
  const [manageFalCodePrefix, setManageFalCodePrefix] = useState('');
  const [isManageSaving, setIsManageSaving] = useState(false);
  // Anahtar değiştirme alt-modalı — Yönet modalı içindeki butondan açılır.
  const [isChangeKeyOpen, setIsChangeKeyOpen] = useState(false);
  // Manage dialog Fal + Fashn ortak; row tüm integrations'tan çekilir.
  const manageFal = manageFalId
    ? integrations.find((i) => i.id === manageFalId) ?? null
    : null;
  const manageProvider: 'fal' | 'fashn' | 'openai' = manageFal?.provider ?? 'fal';
  const manageProviderLabel =
    manageProvider === 'fashn'
      ? 'Fashn.ai'
      : manageProvider === 'openai'
        ? 'OpenAI'
        : 'Fal.ai';

  // E-Fatura entegrasyonları (Bizim Hesap + Paraşüt) — Fal.ai ile aynı
  // pattern: birden fazla hesap, stepper modal, "Bağlı Olanlar" listesinde
  // Yönet butonu. Bağla akışı stepper modal, yönet akışı ayrı modal.
  const {
    bizimhesaps,
    parasuts,
    fetchInvoiceIntegrations,
    connectBizimhesap,
    connectParasut,
    disconnectProvider,
    testBizimhesapCredentials,
    testParasutCredentials,
    isSaving: isSavingInvoice,
  } = useInvoiceIntegrationStore();

  useEffect(() => {
    if (currentCompany?.id) fetchInvoiceIntegrations(currentCompany.id);
  }, [currentCompany?.id, fetchInvoiceIntegrations]);

  // Bizim Hesap — Bağla akışı
  const [isBizimhesapDialogOpen, setIsBizimhesapDialogOpen] = useState(false);
  const [bizimhesapCurrentStep, setBizimhesapCurrentStep] = useState(0);
  const [bizimhesapForm, setBizimhesapForm] = useState({
    name: '',
    firmId: '',
    apiKey: '',
    token: '',
  });
  const [bizimhesapShowApiKey, setBizimhesapShowApiKey] = useState(false);
  const [bizimhesapShowToken, setBizimhesapShowToken] = useState(false);
  const [bizimhesapTestResult, setBizimhesapTestResult] = useState<
    { success: boolean; error?: string } | null
  >(null);
  const [isTestingBizimhesap, setIsTestingBizimhesap] = useState(false);
  // Bizim Hesap — Yönet akışı
  const [manageBizimhesapId, setManageBizimhesapId] = useState<string | null>(null);
  const [manageBizimhesapActive, setManageBizimhesapActive] = useState(true);
  const [isManagingBizimhesap, setIsManagingBizimhesap] = useState(false);
  const manageBizimhesap = manageBizimhesapId
    ? bizimhesaps.find((b) => b.id === manageBizimhesapId) ?? null
    : null;

  // Paraşüt — Bağla akışı
  const [isParasutDialogOpen, setIsParasutDialogOpen] = useState(false);
  const [parasutCurrentStep, setParasutCurrentStep] = useState(0);
  const [parasutForm, setParasutForm] = useState({
    name: '',
    parasutCompanyId: '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
  });
  const [parasutShowSecret, setParasutShowSecret] = useState(false);
  const [parasutShowPassword, setParasutShowPassword] = useState(false);
  const [parasutTestResult, setParasutTestResult] = useState<
    { success: boolean; error?: string } | null
  >(null);
  const [isTestingParasut, setIsTestingParasut] = useState(false);
  // Paraşüt — Yönet akışı
  const [manageParasutId, setManageParasutId] = useState<string | null>(null);
  const [manageParasutActive, setManageParasutActive] = useState(true);
  const [isManagingParasut, setIsManagingParasut] = useState(false);
  const manageParasut = manageParasutId
    ? parasuts.find((p) => p.id === manageParasutId) ?? null
    : null;

  // Model değiştirme alt-modalı (Yönet içinden açılır, Bağla modalıyla aynı stil).
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

  // Kargo bağlantısı yönet akışı — Yönet butonundan açılır.
  // identityType MNG entegrasyonunda sabit 1 (TC Kimlik); doc'a göre tek geçerli
  // değer. UI'da seçenek tutmuyoruz, payload'ta her zaman 1 gönderiyoruz.
  const [manageCargoId, setManageCargoId] = useState<string | null>(null);
  const [manageCargoForm, setManageCargoForm] = useState<{
    customerNumber: string;
    password: string;
  }>({ customerNumber: '', password: '' });
  const [manageCargoActive, setManageCargoActive] = useState(true);
  const [manageCargoShowPassword, setManageCargoShowPassword] = useState(false);
  const [isManagingCargo, setIsManagingCargo] = useState(false);
  const manageCargo = manageCargoId
    ? cargoConnections.find((c) => c.id === manageCargoId) ?? null
    : null;

  const handleManageCargoClose = () => {
    if (isManagingCargo) return;
    setManageCargoId(null);
    setManageCargoShowPassword(false);
  };

  const handleManageCargoSave = async () => {
    if (!manageCargo) return;
    if (!manageCargoForm.customerNumber.trim()) {
      toast.danger('Müşteri numarası boş olamaz');
      return;
    }
    setIsManagingCargo(true);
    try {
      const payload: {
        customerNumber?: string;
        password?: string;
        isActive?: boolean;
      } = {};
      if (
        manageCargoForm.customerNumber.trim() !==
        (manageCargo.customerNumber ?? '')
      ) {
        payload.customerNumber = manageCargoForm.customerNumber.trim();
      }
      if (manageCargoForm.password) {
        payload.password = manageCargoForm.password;
      }
      if (manageCargoActive !== manageCargo.isActive) {
        payload.isActive = manageCargoActive;
      }
      if (Object.keys(payload).length === 0) {
        setManageCargoId(null);
        return;
      }
      if (!currentCompany?.id) return;
      await api.patch(
        `/company/${currentCompany.id}/cargo/connections/${manageCargo.id}`,
        payload,
      );
      await fetchCargoConnections();
      toast.success('Kargo bağlantısı güncellendi');
      setManageCargoId(null);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { message?: string | string[] } };
      };
      const apiMessage = err.response?.data?.message;
      let message: string;
      if (err.response?.status === 403) {
        message =
          'Kargo bağlantısını değiştirme yetkiniz yok. Stokçu/ürün yükleyici rolündeki kullanıcılar bu işlemi yapamaz.';
      } else {
        message = Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage ||
            (error instanceof Error
              ? error.message
              : 'Kargo bağlantısı güncellenemedi');
      }
      toast.danger(message);
    } finally {
      setIsManagingCargo(false);
    }
  };

  const handleManageCargoDelete = async () => {
    if (!manageCargo) return;
    if (!window.confirm('Bu kargo bağlantısı silinsin mi?')) return;
    setIsManagingCargo(true);
    try {
      if (!currentCompany?.id) return;
      await api.delete(
        `/company/${currentCompany.id}/cargo/connections/${manageCargo.id}`,
      );
      await fetchCargoConnections();
      toast.success('Kargo bağlantısı silindi');
      setManageCargoId(null);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      const apiMessage = err.response?.data?.message;
      const message =
        err.response?.status === 403
          ? 'Kargo bağlantısını silme yetkiniz yok. Stokçu/ürün yükleyici rolündeki kullanıcılar bu işlemi yapamaz.'
          : apiMessage || 'Silme işlemi başarısız';
      toast.danger(message);
    } finally {
      setIsManagingCargo(false);
    }
  };

  useEffect(() => {
    if (currentCompany?.id) fetchCargoConnections();
    // currentCompany switch'inde tekrar çekiyoruz; fetch fonksiyonu component
    // içinde tanımlı olduğu için dep listesine eklemiyoruz (her render'da
    // yeniden yaratılıyor).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  const falKeyPlaceholder =
    falDialogProvider === 'fashn'
      ? 'fa-...'
      : falDialogProvider === 'openai'
        ? 'sk-...'
        : 'fal-...';
  const falKeyDescription =
    falDialogProvider === 'fashn'
      ? 'Fashn.ai dashboard üzerinden oluşturduğunuz API anahtarınızı girin. Anahtar şifreli saklanır.'
      : falDialogProvider === 'openai'
        ? 'OpenAI Platform (platform.openai.com) üzerinden oluşturduğunuz API anahtarınızı girin. Anahtar şifreli saklanır.'
        : 'Fal.ai dashboard üzerinden oluşturduğunuz API anahtarınızı girin. Anahtar şifreli saklanır.';
  const falSteps = [
    {
      key: 'apiKey' as const,
      label: 'API Anahtarı',
      placeholder: falKeyPlaceholder,
      description: falKeyDescription,
      isPassword: true,
    },
  ];
  const falTotalSteps = falSteps.length;
  const isFalLastStep = falCurrentStep === falTotalSteps;

  // ----- Bizim Hesap stepper -----
  const bizimhesapSteps = [
    {
      key: 'name' as const,
      label: 'Hesap Adı',
      placeholder: 'Bizim Hesap Hesabım',
      description: 'Bu hesabı tanıyacağınız bir isim girin.',
      isPassword: false,
    },
    {
      key: 'firmId' as const,
      label: 'Firma ID',
      placeholder: 'Örn. 12345',
      description:
        'Bizim Hesap B2B paneli veya entegrasyon dokümanında bulunan firma kimlik numarası. Fatura kesme isteklerinde kullanılır — formda göstermediğimiz tüm fatura çağrıları bu kaydı kullanır.',
      isPassword: false,
    },
    {
      key: 'apiKey' as const,
      label: 'API Key (opsiyonel)',
      placeholder: 'Bizim Hesap B2B Key',
      description:
        'Hesabınıza özel bir B2B Key varsa girin. Boş bırakılırsa Bizim Hesap dokümantasyonundaki varsayılan B2B Key kullanılır.',
      isPassword: true,
    },
    {
      key: 'token' as const,
      label: 'Token',
      placeholder: 'Bizim Hesap B2B Token',
      description:
        'Bizim Hesap B2B panelinizden aldığınız Token değeri. Sunucuda AES-GCM ile şifrelenerek saklanır.',
      isPassword: true,
    },
  ];
  const bizimhesapTotalSteps = bizimhesapSteps.length;
  const isBizimhesapLastStep = bizimhesapCurrentStep === bizimhesapTotalSteps;

  const handleBizimhesapDialogClose = () => {
    setIsBizimhesapDialogOpen(false);
    setBizimhesapCurrentStep(0);
    setBizimhesapShowApiKey(false);
    setBizimhesapShowToken(false);
    setBizimhesapTestResult(null);
  };

  const handleBizimhesapNext = () => {
    const step = bizimhesapSteps[bizimhesapCurrentStep];
    if (!step) return;
    const value = bizimhesapForm[step.key];
    if (step.key !== 'apiKey' && !value.trim()) {
      toast.danger(`${step.label} gerekli`);
      return;
    }
    setBizimhesapCurrentStep((prev) => prev + 1);
  };

  const handleBizimhesapTest = async () => {
    if (!currentCompany?.id) return;
    if (!bizimhesapForm.token.trim()) {
      toast.danger('Token gerekli');
      return;
    }
    setIsTestingBizimhesap(true);
    setBizimhesapTestResult(null);
    // Test DTO doc'taki BizimhesapTestConnectionDto ile birebir: sadece
    // {token?, apiKey?}. firmId test aşamasında sorulmaz (auth doğrulaması
    // firma id'sini gerektirmez).
    const result = await testBizimhesapCredentials(currentCompany.id, {
      token: bizimhesapForm.token.trim(),
      apiKey: bizimhesapForm.apiKey.trim() || undefined,
    });
    setBizimhesapTestResult({ success: result.ok, error: result.error });
    setIsTestingBizimhesap(false);
  };

  const handleBizimhesapSave = async () => {
    if (!currentCompany?.id) return;
    if (!bizimhesapForm.token.trim() || !bizimhesapForm.firmId.trim()) {
      toast.danger('Token ve Firma ID gerekli');
      return;
    }
    // ConnectBizimhesapDto — name yerine label kullanılır. Backend ilk önce
    // token'ı test edip başarılıysa AES-GCM ile şifreleyip per-company upsert
    // yapar. Aynı şirkette ikinci bir BizimHesap bağlantısı yoktur; bu çağrı
    // mevcudu override eder.
    try {
      await connectBizimhesap(currentCompany.id, {
        token: bizimhesapForm.token.trim(),
        firmId: bizimhesapForm.firmId.trim(),
        apiKey: bizimhesapForm.apiKey.trim() || undefined,
        label: bizimhesapForm.name.trim() || undefined,
      });
      toast.success('Bizim Hesap bağlandı');
      setBizimhesapForm({ name: '', firmId: '', apiKey: '', token: '' });
      handleBizimhesapDialogClose();
    } catch (error: unknown) {
      // Doc §6 + §7: 400 → backend mesajı (yanlış token, BH erişim hatası);
      // 403 → STOCKIST/PRODUCT_UPLOADER rolü bu işlemi yapamaz.
      const err = error as {
        response?: {
          status?: number;
          data?: { message?: string | string[]; error?: string };
        };
      };
      let text: string;
      if (err.response?.status === 403) {
        text =
          'Bizim Hesap bağlantısı kurma yetkiniz yok. Stokçu/ürün yükleyici rolündeki kullanıcılar bu işlemi yapamaz — şirket sahibi veya yöneticisiyle iletişime geçin.';
      } else {
        const msg = err.response?.data?.message;
        text = Array.isArray(msg)
          ? msg.join(', ')
          : msg || err.response?.data?.error || 'Bizim Hesap kaydedilemedi';
      }
      toast.danger(text);
    }
  };

  const handleManageBizimhesapClose = () => {
    setManageBizimhesapId(null);
    setManageBizimhesapActive(true);
    setIsManagingBizimhesap(false);
  };

  const handleManageBizimhesapSave = async () => {
    if (!currentCompany?.id || !manageBizimhesap) return;
    // Backend'de "isActive false" diye bir update yolu yok — bağlantı ya
    // vardır ya yoktur. Kullanıcı switch'i kapadıysa kaydı tamamen siliyoruz.
    if (!manageBizimhesapActive) {
      if (
        !window.confirm(
          'Hesap pasif durumda kaydedilirse kaldırılacaktır. Devam edilsin mi?',
        )
      ) {
        return;
      }
      setIsManagingBizimhesap(true);
      try {
        await disconnectProvider(currentCompany.id, 'BIZIMHESAP');
        toast.success('Bizim Hesap kaldırıldı');
        handleManageBizimhesapClose();
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } };
        };
        toast.danger(
          err.response?.data?.message ||
            err.response?.data?.error ||
            'Kaldırılamadı',
        );
      } finally {
        setIsManagingBizimhesap(false);
      }
      return;
    }
    handleManageBizimhesapClose();
  };

  // ----- Paraşüt stepper -----
  const parasutSteps = [
    {
      key: 'name' as const,
      label: 'Hesap Adı',
      placeholder: 'Paraşüt Hesabım',
      description: 'Bu hesabı tanıyacağınız bir isim girin.',
      isPassword: false,
    },
    {
      key: 'parasutCompanyId' as const,
      label: 'Paraşüt Şirket ID',
      placeholder: 'Örn. 123456',
      description:
        'Paraşüt API URL\'sindeki firma id (/v4/{şirket_id}/...). Panel adres çubuğundan da kopyalayabilirsiniz.',
      isPassword: false,
    },
    {
      key: 'username' as const,
      label: 'Kullanıcı Adı (e-posta)',
      placeholder: 'muhasebe@firma.com',
      description:
        'Paraşüt hesabınıza giriş yaptığınız e-posta adresi. OAuth2 password grant\'ta kullanılır.',
      isPassword: false,
    },
    {
      key: 'password' as const,
      label: 'Şifre',
      placeholder: 'Paraşüt şifreniz',
      description: 'Paraşüt giriş şifrenizi girin. Şifreli saklanır.',
      isPassword: true,
    },
    {
      key: 'clientId' as const,
      label: 'Client ID',
      placeholder: 'OAuth Client ID',
      description: 'Paraşüt API uygulamanızın OAuth Client ID değerini girin.',
      isPassword: false,
    },
    {
      key: 'clientSecret' as const,
      label: 'Client Secret',
      placeholder: 'OAuth Client Secret',
      description: 'Paraşüt API uygulamanızın OAuth Client Secret değerini girin.',
      isPassword: true,
    },
  ];
  const parasutTotalSteps = parasutSteps.length;
  const isParasutLastStep = parasutCurrentStep === parasutTotalSteps;

  const handleParasutDialogClose = () => {
    setIsParasutDialogOpen(false);
    setParasutCurrentStep(0);
    setParasutShowSecret(false);
    setParasutShowPassword(false);
    setParasutTestResult(null);
  };

  const handleParasutNext = () => {
    const step = parasutSteps[parasutCurrentStep];
    if (!step) return;
    const value = parasutForm[step.key];
    if (!value.trim()) {
      toast.danger(`${step.label} gerekli`);
      return;
    }
    setParasutCurrentStep((prev) => prev + 1);
  };

  const handleParasutTest = async () => {
    if (!currentCompany?.id) return;
    setIsTestingParasut(true);
    setParasutTestResult(null);
    // ParasutTestConnectionDto: {email?, password?, clientId?, clientSecret?}.
    // parasutCompanyId test'te kullanılmaz (OAuth token alma adımı şirket
    // id'sini ister değil). Username form'da `username` olarak toplanıyor
    // ama backend `email` key'ini bekliyor — burada map'liyoruz.
    const result = await testParasutCredentials(currentCompany.id, {
      email: parasutForm.username.trim() || undefined,
      password: parasutForm.password || undefined,
      clientId: parasutForm.clientId.trim() || undefined,
      clientSecret: parasutForm.clientSecret.trim() || undefined,
    });
    setParasutTestResult({ success: result.ok, error: result.error });
    setIsTestingParasut(false);
  };

  const handleParasutSave = async () => {
    if (!currentCompany?.id) return;
    const required: Array<keyof typeof parasutForm> = [
      'parasutCompanyId',
      'clientId',
      'clientSecret',
      'username',
      'password',
    ];
    if (required.some((k) => !parasutForm[k].trim())) {
      toast.danger('Tüm alanları doldurun');
      return;
    }
    // ConnectParasutDto — backend OAuth2 password grant ile token alır,
    // başarılıysa credential'ları AES-GCM ile şifreleyip upsert eder.
    try {
      await connectParasut(currentCompany.id, {
        clientId: parasutForm.clientId.trim(),
        clientSecret: parasutForm.clientSecret.trim(),
        username: parasutForm.username.trim(),
        password: parasutForm.password,
        parasutCompanyId: parasutForm.parasutCompanyId.trim(),
        label: parasutForm.name.trim() || undefined,
      });
      toast.success('Paraşüt bağlandı');
      setParasutForm({
        name: '',
        parasutCompanyId: '',
        clientId: '',
        clientSecret: '',
        username: '',
        password: '',
      });
      handleParasutDialogClose();
    } catch (error: unknown) {
      // Doc §7: 400 connect → "yanlış şifre, client id, veya Paraşüt erişim
      // hatası". 403 → STOCKIST/PRODUCT_UPLOADER rolü bu işlemi yapamaz.
      const err = error as {
        response?: {
          status?: number;
          data?: { message?: string | string[]; error?: string };
        };
      };
      let text: string;
      if (err.response?.status === 403) {
        text =
          'Paraşüt bağlantısı kurma yetkiniz yok. Stokçu/ürün yükleyici rolündeki kullanıcılar bu işlemi yapamaz — şirket sahibi veya yöneticisiyle iletişime geçin.';
      } else {
        const msg = err.response?.data?.message;
        text = Array.isArray(msg)
          ? msg.join(', ')
          : msg || err.response?.data?.error || 'Paraşüt kaydedilemedi';
      }
      toast.danger(text);
    }
  };

  const handleManageParasutClose = () => {
    setManageParasutId(null);
    setManageParasutActive(true);
    setIsManagingParasut(false);
  };

  const handleManageParasutSave = async () => {
    if (!currentCompany?.id || !manageParasut) return;
    // BizimHesap manage flow ile aynı: backend update endpoint'i yok, sadece
    // disconnect var. Pasif toggle = kaldır.
    if (!manageParasutActive) {
      if (
        !window.confirm(
          'Hesap pasif durumda kaydedilirse kaldırılacaktır. Devam edilsin mi?',
        )
      ) {
        return;
      }
      setIsManagingParasut(true);
      try {
        await disconnectProvider(currentCompany.id, 'PARASUT');
        toast.success('Paraşüt kaldırıldı');
        handleManageParasutClose();
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } };
        };
        toast.danger(
          err.response?.data?.message ||
            err.response?.data?.error ||
            'Kaldırılamadı',
        );
      } finally {
        setIsManagingParasut(false);
      }
      return;
    }
    handleManageParasutClose();
  };

  const handleFalDialogClose = () => {
    setIsFalDialogOpen(false);
    setFalCurrentStep(0);
    setFalShowKey(false);
  };

  const handleFalNext = () => {
    const step = falSteps[falCurrentStep];
    if (!step) return;
    const value = falForm[step.key];
    if (!value.trim()) {
      toast.danger(`${step.label} gerekli`);
      return;
    }
    setFalCurrentStep((prev) => prev + 1);
  };

  const handleFalSave = async () => {
    if (!currentCompany?.id) return;
    if (!falForm.apiKey.trim()) {
      toast.danger('API Anahtarı gerekli');
      return;
    }
    const args = {
      apiKey: falForm.apiKey.trim(),
      name: falForm.name.trim() || undefined,
    };
    const result =
      falDialogProvider === 'fal'
        ? await createFalIntegration(currentCompany.id, args)
        : await createIntegration(currentCompany.id, falDialogProvider, args);
    if (result) {
      toast.success(`${falProviderLabel} hesabı eklendi`);
      setFalForm({ apiKey: '', name: '' });
      handleFalDialogClose();
    } else {
      toast.danger('Anahtar kaydedilemedi');
    }
  };

  const handleManageClose = () => {
    setManageFalId(null);
    setManageFalKey('');
    setManageFalShowKey(false);
    setManageFalTesting(false);
    setManageFalTestResult(null);
    setIsChangeKeyOpen(false);
    setManageFalActive(true);
    setManageFalCodePrefix('');
    setIsManageSaving(false);
  };

  const handleChangeKeyClose = () => {
    setIsChangeKeyOpen(false);
    setManageFalKey('');
    setManageFalShowKey(false);
    setManageFalTesting(false);
    setManageFalTestResult(null);
  };

  const handleManageTest = async () => {
    if (!currentCompany?.id || !manageFalId) return;
    setManageFalTesting(true);
    setManageFalTestResult(null);
    const trimmed = manageFalKey.trim();
    // Yeni anahtar varsa onu test et (henüz kaydetmeden), yoksa saklanan
    // anahtarı sunucu tarafında doğrula. Provider'a göre endpoint farklı.
    const result = trimmed
      ? await testApiKey(currentCompany.id, manageProvider, trimmed)
      : await testFalIntegration(currentCompany.id, manageFalId);
    setManageFalTestResult(result);
    setManageFalTesting(false);
  };

  const handleManageSave = async () => {
    if (!currentCompany?.id || !manageFalId) return;
    const args: { apiKey?: string } = {};
    const trimmed = manageFalKey.trim();
    if (trimmed) args.apiKey = trimmed;
    if (Object.keys(args).length === 0) {
      toast.info('Yeni bir anahtar girilmedi');
      return;
    }
    const updated = await updateFalIntegration(currentCompany.id, manageFalId, args);
    if (updated) {
      toast.success('Anahtar güncellendi');
      setManageFalKey('');
      setManageFalTestResult(null);
      setIsChangeKeyOpen(false);
    } else {
      toast.danger('Güncellenemedi');
    }
  };

  // AlertDialog onay sonrası çağrılır — confirmation prompt'u dialog yapıyor.
  const handleManageRemove = async () => {
    if (!currentCompany?.id || !manageFalId) return;
    await removeFalIntegration(currentCompany.id, manageFalId);
    toast.success('Hesap kaldırıldı');
    handleManageClose();
  };

  const handleManageSettingsSave = async () => {
    if (!currentCompany?.id || !manageFal) return;
    // Switch kapatılıp kaydedildiyse — entegrasyon silinsin.
    if (!manageFalActive) {
      if (!window.confirm('Hesap pasif durumda kaydedilirse kaldırılacaktır. Devam edilsin mi?')) {
        return;
      }
      setIsManageSaving(true);
      await removeFalIntegration(currentCompany.id, manageFal.id);
      setIsManageSaving(false);
      toast.success('Hesap kaldırıldı');
      handleManageClose();
      return;
    }
    // Switch veya kod öneki değiştiyse update — ikisini tek istekte yolla.
    const nextPrefix = manageFalCodePrefix.trim();
    const prevPrefix = (manageFal.codePrefix ?? '').trim();
    const activeChanged = manageFal.isActive !== manageFalActive;
    const prefixChanged = prevPrefix !== nextPrefix;
    if (activeChanged || prefixChanged) {
      setIsManageSaving(true);
      const updated = await updateFalIntegration(currentCompany.id, manageFal.id, {
        ...(activeChanged ? { isActive: manageFalActive } : {}),
        ...(prefixChanged ? { codePrefix: nextPrefix } : {}),
      });
      setIsManageSaving(false);
      if (updated) {
        toast.success('Ayarlar kaydedildi');
        handleManageClose();
      } else {
        toast.danger('Kaydedilemedi');
      }
      return;
    }
    handleManageClose();
  };

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
  const [settingsModalStoreId, setSettingsModalStoreId] = useState<string | null>(null);
  const [deleteConfirmStoreId, setDeleteConfirmStoreId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // DHL (MNG Kargo) bağlantısı — MNG portal müşteri numarası + kimlik tipi
  // + şifre alınıyor. IBM API Gateway client_id/secret sunucu .env'sinde
  // sabit; frontend yalnızca müşteri kimliklerini gönderiyor.
  const [dhlModalOpen, setDhlModalOpen] = useState(false);
  const [dhlCurrentStep, setDhlCurrentStep] = useState(0);
  // identityType MNG connect DTO'sunda sabit 1 — doc'a göre tek geçerli değer.
  // Form'da kullanıcıya sormuyoruz, payload'da her zaman 1 gönderiyoruz.
  const [dhlForm, setDhlForm] = useState<{
    customerNumber: string;
    password: string;
  }>({
    customerNumber: '',
    password: '',
  });
  const [dhlShowPassword, setDhlShowPassword] = useState(false);
  const [isDhlSaving, setIsDhlSaving] = useState(false);

  type DhlStep =
    | {
        key: 'customerNumber';
        label: string;
        placeholder: string;
        description: string;
        kind: 'text';
      }
    | {
        key: 'password';
        label: string;
        placeholder: string;
        description: string;
        kind: 'password';
      };

  const dhlSteps: DhlStep[] = [
    {
      key: 'customerNumber',
      label: 'Müşteri Numarası',
      placeholder: 'DHL müşteri numaranız',
      description: 'DHL sözleşmenizde / portalında yer alan müşteri ID.',
      kind: 'text',
    },
    {
      key: 'password',
      label: 'Şifre',
      placeholder: 'DHL portal şifreniz',
      description: 'DHL portal şifrenizi girin. Sunucuda şifrelenerek saklanır.',
      kind: 'password',
    },
  ];
  const dhlTotalSteps = dhlSteps.length;
  const isDhlLastStep = dhlCurrentStep === dhlTotalSteps;

  const [wcscState, setWcscState] = useState<{
    apiKey: string;
    apiSecret: string;
    showSecret: boolean;
    testing: boolean;
    testResult: { success: boolean; error?: string } | null;
    connecting: boolean;
    disconnecting: boolean;
  }>({
    apiKey: '',
    apiSecret: '',
    showSecret: false,
    testing: false,
    testResult: null,
    connecting: false,
    disconnecting: false,
  });

  // Trendyol settings tab — Webhook'u yeniden kur / Son siparişleri çek
  // butonlarının yükleme durumları.
  const [trendyolActionState, setTrendyolActionState] = useState<{
    webhookSetup: boolean;
    recentOrders: boolean;
  }>({ webhookSetup: false, recentOrders: false });

  const totalSteps = selectedMarketplace?.steps?.length || 0;
  const isLastStep = currentStep === totalSteps;

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

  const handleSettingsChange = (
    storeId: string,
    field: 'commissionRate' | 'shippingCost',
    value: string
  ) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setSettingsState((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], [field]: cleanValue, saved: false },
    }));
  };

  const handleSaveSettings = async (storeId: string) => {
    if (!currentCompany?.id) return;
    const state = settingsState[storeId];
    if (!state) return;

    setSettingsState((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], saving: true, saved: false, error: null },
    }));

    try {
      const commissionRate = parseFloat(state.commissionRate) || 0;
      const shippingCost = parseFloat(state.shippingCost) || 0;
      if (commissionRate < 0 || commissionRate > 100)
        throw new Error('Komisyon oranı 0-100 arasında olmalı');
      if (shippingCost < 0 || shippingCost > 10000)
        throw new Error('Kargo maliyeti 0-10000 arasında olmalı');

      await updateStore(currentCompany.id, storeId, { commissionRate, shippingCost });
      setSettingsState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], saving: false, saved: true, error: null },
      }));
      toast.success('Ayarlar kaydedildi');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Kaydetme başarısız';
      setSettingsState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], saving: false, saved: false, error: errorMessage },
      }));
      toast.danger(errorMessage);
    }
  };

  const handleTestWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    if (!wcscState.apiKey || !wcscState.apiSecret) {
      toast.danger('API Key ve API Secret gerekli');
      return;
    }
    setWcscState((prev) => ({ ...prev, testing: true, testResult: null }));
    try {
      const response = await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/test-wcsc`,
        { apiKey: wcscState.apiKey, apiSecret: wcscState.apiSecret }
      );
      setWcscState((prev) => ({
        ...prev,
        testing: false,
        testResult: { success: response.data.success, error: response.data.error },
      }));
    } catch (error: any) {
      setWcscState((prev) => ({
        ...prev,
        testing: false,
        testResult: {
          success: false,
          error: error.response?.data?.message || 'Test başarısız',
        },
      }));
    }
  };

  const handleConnectWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    if (!wcscState.apiKey || !wcscState.apiSecret) {
      toast.danger('API Key ve API Secret gerekli');
      return;
    }
    setWcscState((prev) => ({ ...prev, connecting: true }));
    try {
      await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/connect-wcsc`,
        { apiKey: wcscState.apiKey, apiSecret: wcscState.apiSecret }
      );
      toast.success('WC Stock Connector bağlandı');
      fetchStores(currentCompany.id);
      setWcscState((prev) => ({
        ...prev,
        connecting: false,
        apiKey: '',
        apiSecret: '',
        testResult: null,
      }));
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Bağlantı başarısız');
      setWcscState((prev) => ({ ...prev, connecting: false }));
    }
  };

  const handleDisconnectWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    setWcscState((prev) => ({ ...prev, disconnecting: true }));
    try {
      await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/disconnect-wcsc`
      );
      toast.success('WC Stock Connector bağlantısı kesildi');
      fetchStores(currentCompany.id);
      setWcscState((prev) => ({ ...prev, disconnecting: false }));
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Bağlantı kesilemedi');
      setWcscState((prev) => ({ ...prev, disconnecting: false }));
    }
  };

  // Trendyol panelinde aboneliği yenile — satıcı başına 15 webhook limiti var,
  // backend gerekirse eski kaydı silip yeni kuruyor.
  const handleTrendyolWebhookSetup = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    setTrendyolActionState((prev) => ({ ...prev, webhookSetup: true }));
    try {
      await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/trendyol/webhook/setup`,
      );
      toast.success('Trendyol webhook aboneliği yenilendi');
      await fetchStores(currentCompany.id);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      toast.danger(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Webhook kurulamadı',
      );
    } finally {
      setTrendyolActionState((prev) => ({ ...prev, webhookSetup: false }));
    }
  };

  // Sipariş pull yedek — webhook bir süredir gelmiyorsa veya son siparişler
  // dashboard'a düşmediyse kullanıcı buradan tetikler. Doc §5'e göre üst sınır
  // 720 saat (30 gün), default 2 saat; biz 24 saatlik pencereyi seçtik.
  const handleTrendyolSyncRecentOrders = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    setTrendyolActionState((prev) => ({ ...prev, recentOrders: true }));
    try {
      await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/trendyol/sync-recent-orders?sinceHours=24`,
      );
      toast.success('Son 24 saatin siparişleri senkronize edildi');
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      toast.danger(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Sipariş senkronizasyonu başarısız',
      );
    } finally {
      setTrendyolActionState((prev) => ({ ...prev, recentOrders: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı');
  };

  const handleMarketplaceClick = (marketplace: Marketplace) => {
    if (marketplace.comingSoon) return;
    // DHL'in kendi stepper'ı — alanlar farklı olduğu için Marketplace
    // stepper'ından ayrı bir akış kullanıyor ama görsel olarak aynı.
    if (marketplace.id === 'DHL') {
      setDhlForm({ customerNumber: '', password: '' });
      setDhlShowPassword(false);
      setDhlCurrentStep(0);
      setDhlModalOpen(true);
      return;
    }
    // Fal.ai / Fashn.ai / OpenAI — tek alanlı API key formu.
    if (
      marketplace.id === 'FAL_AI' ||
      marketplace.id === 'FASHN_AI' ||
      marketplace.id === 'OPENAI'
    ) {
      const provider: 'fal' | 'fashn' | 'openai' =
        marketplace.id === 'FASHN_AI'
          ? 'fashn'
          : marketplace.id === 'OPENAI'
            ? 'openai'
            : 'fal';
      setFalDialogProvider(provider);
      setFalForm({ apiKey: '', name: '' });
      setFalCurrentStep(0);
      setFalShowKey(false);
      setIsFalDialogOpen(true);
      return;
    }
    // Bizim Hesap & Paraşüt — e-fatura akışı, mağaza/marketplace değil.
    if (marketplace.id === 'BIZIMHESAP') {
      setBizimhesapForm({
        name: 'Bizim Hesap Hesabım',
        firmId: '',
        apiKey: '',
        token: '',
      });
      setBizimhesapCurrentStep(0);
      setBizimhesapShowApiKey(false);
      setBizimhesapShowToken(false);
      setBizimhesapTestResult(null);
      setIsBizimhesapDialogOpen(true);
      return;
    }
    if (marketplace.id === 'PARASUT') {
      setParasutForm({
        name: 'Paraşüt Hesabım',
        parasutCompanyId: '',
        clientId: '',
        clientSecret: '',
        username: '',
        password: '',
      });
      setParasutCurrentStep(0);
      setParasutShowSecret(false);
      setParasutShowPassword(false);
      setParasutTestResult(null);
      setIsParasutDialogOpen(true);
      return;
    }
    if (!marketplace.steps) {
      toast.info('Bu entegrasyon yakında eklenecek');
      return;
    }
    setSelectedMarketplace(marketplace);
    setFormData({
      name: `${marketplace.name} Mağazam`,
      url: '',
      consumerKey: '',
      consumerSecret: '',
      shopDomain: '',
      accessToken: '',
      sellerId: '',
      apiKey: '',
      apiSecret: '',
      environment: 'prod',
      merchantId: '',
      hbUsername: '',
      hbPassword: '',
    });
    setCurrentStep(0);
    setTestResult(null);
    setIsDialogOpen(true);
  };

  const handleDhlDialogClose = () => {
    setDhlModalOpen(false);
    setDhlCurrentStep(0);
  };

  const handleDhlNext = () => {
    const step = dhlSteps[dhlCurrentStep];
    if (!step) return;
    const value = dhlForm[step.key];
    if (!value.trim()) {
      toast.danger(`${step.label} gerekli`);
      return;
    }
    setDhlCurrentStep((prev) => prev + 1);
  };

  const handleSaveDhl = async () => {
    if (!dhlForm.customerNumber.trim() || !dhlForm.password.trim()) {
      toast.danger('Tüm alanları doldurun');
      return;
    }
    setIsDhlSaving(true);
    try {
      // POST /api/company/:companyId/cargo/mng/connect — backend, IBM API
      // Gateway client bilgilerini .env'den (MNG_CLIENT_ID/SECRET) okur. Bu
      // uçtan müşteri numarası + şifre + identityType ile MNG token endpoint'i
      // denenir, başarılıysa ShippingProvider kaydı upsert edilir.
      if (!currentCompany?.id) {
        toast.danger('Aktif şirket seçili değil');
        setIsDhlSaving(false);
        return;
      }
      await api.post(`/company/${currentCompany.id}/cargo/mng/connect`, {
        customerNumber: dhlForm.customerNumber.trim(),
        password: dhlForm.password,
        identityType: 1,
      });
      await fetchCargoConnections();
      toast.success('DHL bağlandı');
      handleDhlDialogClose();
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { message?: string | string[] } };
      };
      const apiMessage = err.response?.data?.message;
      const status = err.response?.status;
      // Doc §"Yetki": STOCKIST ve PRODUCT_UPLOADER 403 alır. Backend mesajı
      // genelde "Bu işlem için yetkiniz yok" gibi soyut bir şey döner — net
      // bir yönerge gösteriyoruz.
      let message: string;
      if (status === 403) {
        message =
          'DHL bağlantısı kurmak için yetkiniz yok. Stokçu/ürün yükleyici rolündeki kullanıcılar bu işlemi yapamaz — şirket sahibi veya yöneticisiyle iletişime geçin.';
      } else {
        message = Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage ||
            (error instanceof Error
              ? error.message
              : 'DHL bağlantısı kaydedilemedi');
      }
      toast.danger(message);
    } finally {
      setIsDhlSaving(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCurrentStep(0);
    setTestResult(null);
  };

  const validateCurrentStep = (): boolean => {
    if (!selectedMarketplace?.steps) return false;
    const step = selectedMarketplace.steps[currentStep];
    if (!step) return true;

    const value = (formData[step.key as keyof typeof formData] ?? '').trim();
    // Generic required-field guard runs first — format checks below build
    // on a non-empty value and would otherwise leak past missing input.
    if (!value) {
      toast.danger(`${step.label} gerekli`);
      return false;
    }
    if (
      selectedMarketplace?.platform === 'WOOCOMMERCE' &&
      step.key === 'url' &&
      !/^https:\/\/.+/i.test(value)
    ) {
      toast.danger('URL https:// ile başlamalı');
      return false;
    }
    if (
      step.key === 'shopDomain' &&
      !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value)
    ) {
      toast.danger('Geçersiz domain. Beklenen format: mystore.myshopify.com');
      return false;
    }
    if (step.key === 'accessToken' && !value.startsWith('shpat_')) {
      toast.danger('Access Token "shpat_" ile başlamalı');
      return false;
    }
    if (step.key === 'sellerId' && !/^\d+$/.test(value)) {
      toast.danger('Satıcı ID yalnızca rakam içermelidir');
      return false;
    }
    if (step.key === 'merchantId' && value.length < 3) {
      toast.danger('Merchant ID en az 3 karakter olmalı');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleTestConnection = async () => {
    if (!currentCompany?.id || !selectedMarketplace) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      if (selectedMarketplace.platform === 'SHOPIFY') {
        const response = await api.post(
          `/company/${currentCompany.id}/stores/marketplace/SHOPIFY/test`,
          {
            credentials: {
              shopDomain: formData.shopDomain.trim(),
              accessToken: formData.accessToken.trim(),
            },
          }
        );
        if (response.data.success) {
          setTestResult({ success: true, meta: response.data.meta });
        } else {
          setTestResult({
            success: false,
            error: response.data.error || 'Bağlantı kurulamadı',
          });
        }
      } else if (selectedMarketplace.platform === 'TRENDYOL') {
        const response = await api.post(
          `/company/${currentCompany.id}/stores/marketplace/TRENDYOL/test`,
          {
            credentials: {
              apiKey: formData.apiKey.trim(),
              apiSecret: formData.apiSecret.trim(),
              sellerId: formData.sellerId.trim(),
            },
            config: {
              sellerId: formData.sellerId.trim(),
              environment: formData.environment,
              storeFrontCode: 'TR',
              integrationLabel: 'SelfIntegration',
            },
          }
        );
        if (response.data.success) {
          setTestResult({ success: true, meta: response.data.meta });
        } else {
          setTestResult({
            success: false,
            error: response.data.error || 'Bağlantı kurulamadı',
          });
        }
      } else if (selectedMarketplace.platform === 'HEPSIBURADA') {
        const response = await api.post(
          `/company/${currentCompany.id}/stores/marketplace/HEPSIBURADA/test`,
          {
            credentials: {
              username: formData.hbUsername.trim(),
              password: formData.hbPassword,
              merchantId: formData.merchantId.trim(),
            },
            config: {
              merchantId: formData.merchantId.trim(),
            },
          }
        );
        if (response.data.success) {
          setTestResult({ success: true, meta: response.data.meta });
        } else {
          setTestResult({
            success: false,
            error: response.data.error || 'Bağlantı kurulamadı',
          });
        }
      } else {
        setTestResult({
          success: false,
          error: 'Bu pazaryeri için test desteği henüz eklenmedi',
        });
      }
    } catch (error: any) {
      const status = error.response?.status;
      const apiMessage =
        error.response?.data?.error || error.response?.data?.message;
      // Trendyol 403'ü genelde ya çıkış IP'si Trendyol panelinde beyaz listede
      // değildir ya da apiKey/secret çiftini stage modunda oluşturup prod'a
      // (veya tersi) bağlanılmaya çalışılmıştır — kullanıcıya açıkça söyle.
      const trendyol403 =
        selectedMarketplace?.platform === 'TRENDYOL' && status === 403;
      const errorMessage = trendyol403
        ? apiMessage ||
          'Trendyol bağlantısı reddedildi (403). Olası nedenler: API anahtarınız stage/prod ortamıyla uyumsuz ya da Balina sunucusunun IP adresi Trendyol satıcı panelinde beyaz listeye eklenmemiş.'
        : apiMessage || 'Bağlantı testi başarısız';
      setTestResult({ success: false, error: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!currentCompany?.id || !selectedMarketplace) return;
    setIsSubmitting(true);
    try {
      let newStoreId: string | null = null;
      if (selectedMarketplace.platform === 'SHOPIFY') {
        const response = await api.post(
          `/company/${currentCompany.id}/stores/marketplace/SHOPIFY`,
          {
            name: formData.name,
            credentials: {
              shopDomain: formData.shopDomain.trim(),
              accessToken: formData.accessToken.trim(),
            },
          }
        );
        newStoreId = response.data?.id ?? null;
        await fetchStores(currentCompany.id);
      } else if (selectedMarketplace.platform === 'TRENDYOL') {
        // sellerId hem credentials hem config içinde gönderilmeli — backend
        // ikisini birleştiriyor ama eksik kalırsa upsert sırasında satıcı no
        // bulunamayıp create başarısız olabiliyor (doc §3.1).
        const response = await api.post(
          `/company/${currentCompany.id}/stores/marketplace/TRENDYOL`,
          {
            name: formData.name,
            credentials: {
              apiKey: formData.apiKey.trim(),
              apiSecret: formData.apiSecret.trim(),
              sellerId: formData.sellerId.trim(),
            },
            config: {
              sellerId: formData.sellerId.trim(),
              environment: formData.environment,
              storeFrontCode: 'TR',
              integrationLabel: 'SelfIntegration',
            },
          }
        );
        newStoreId = response.data?.id ?? null;
        await fetchStores(currentCompany.id);
      } else if (selectedMarketplace.platform === 'HEPSIBURADA') {
        const response = await api.post(
          `/company/${currentCompany.id}/stores/marketplace/HEPSIBURADA`,
          {
            name: formData.name,
            credentials: {
              username: formData.hbUsername.trim(),
              password: formData.hbPassword,
              merchantId: formData.merchantId.trim(),
            },
            config: {
              merchantId: formData.merchantId.trim(),
            },
          }
        );
        newStoreId = response.data?.id ?? null;
        await fetchStores(currentCompany.id);
      } else {
        toast.danger('Bu pazaryeri için bağlantı henüz desteklenmiyor');
        return;
      }
      if (selectedMarketplace.platform === 'TRENDYOL') {
        // Trendyol kayıttan sonra arka planda webhook kurulumu + ürün/sipariş
        // çekimi başlatır; kullanıcıya bekleme süresinin normal olduğunu söyle.
        toast.success(
          'Mağaza bağlandı. Webhook arka planda kuruluyor, ürünler ve son siparişler birkaç dakika içinde senkronize edilecek.',
        );
      } else {
        toast.success('Mağaza başarıyla bağlandı');
      }
      handleDialogClose();

      // Shopify shopDomain'i lokal cache'e yaz — backend response'da henüz
      // dönmüyor (placeholder url). Backend `shopDomain` döndürmeye başlarsa
      // store.shopDomain bu cache'i ezer; getStoreDisplay her iki durumu da
      // şeffafça handle ediyor.
      if (
        newStoreId &&
        selectedMarketplace.platform === 'SHOPIFY' &&
        formData.shopDomain.trim()
      ) {
        const next = {
          ...shopifyDomains,
          [newStoreId]: formData.shopDomain.trim(),
        };
        setShopifyDomains(next);
        writeShopifyDomainCache(next);
      }

      // Otomatik ilk sync — backend hemen 200 dönüyor, polling devralıyor.
      // Sync tamamlanınca pendingMappingStoreId effect'i mapping önerilerini
      // çekip CTA modal'ı açacak.
      if (newStoreId) {
        const storeId = newStoreId;
        syncStore(currentCompany.id, storeId).catch(() => {
          // Sync başlatılamadıysa kullanıcı yönet modal'ından elle deneyebilir.
        });
        setPendingMappingStoreId(storeId);
        await fetchStores(currentCompany.id);
      }
    } catch (error: any) {
      const status = error.response?.status;
      const apiMessage =
        error.response?.data?.error || error.response?.data?.message;
      const trendyol403 =
        selectedMarketplace?.platform === 'TRENDYOL' && status === 403;
      const errorMessage = trendyol403
        ? apiMessage ||
          'Trendyol bağlantısı reddedildi (403). API anahtarınızın stage/prod uyumunu ve Balina IP adresinin Trendyol panelinde beyaz listede olduğunu kontrol edin.'
        : apiMessage || 'Mağaza bağlanamadı';
      if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
        handleDialogClose();
        setShowUpgradeDialog(true);
      } else {
        toast.danger(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // WooCommerce one-click OAuth — kullanıcıyı WP admin'in `/wc-auth/v1/authorize`
  // ekranına yollar. Backend, callback'i alıp store + webhook'ları otomatik
  // oluşturur. Return URL `/integrations/woocommerce/return?state=...` —
  // sayfa state'i sessionStorage'dan okuyup status polling yapar.
  const handleWoocommerceStart = async () => {
    if (!currentCompany?.id) return;
    setIsSubmitting(true);
    try {
      const response = await api.post(
        `/company/${currentCompany.id}/stores/woocommerce/auth/start`,
        { name: formData.name, url: formData.url.trim() }
      );
      const { authorizeUrl, state } = response.data as {
        authorizeUrl: string;
        state: string;
        expiresAt: string;
      };
      // Return sayfası companyId + state'i buradan okur — WP roundtrip'i sırasında
      // currentCompany değişmiş olsa bile akış doğru şirkete bağlı kalır.
      sessionStorage.setItem('wcAuthCompanyId', currentCompany.id);
      sessionStorage.setItem('wcAuthState', state);
      window.location.href = authorizeUrl;
      // Redirect başlattık — finally setIsSubmitting(false) çalışmasın diye
      // erken return etmiyoruz; sayfa unmount olacak.
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'WooCommerce bağlantısı başlatılamadı';
      if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
        handleDialogClose();
        setShowUpgradeDialog(true);
      } else {
        toast.danger(errorMessage);
      }
      setIsSubmitting(false);
    }
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

  const handleSync = async (storeId: string) => {
    if (!currentCompany?.id) return;
    try {
      await syncStore(currentCompany.id, storeId);
      toast.success('Senkronizasyon başlatıldı');
      fetchStores(currentCompany.id);
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Senkronizasyon başarısız');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Henüz senkronize edilmedi';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const handleStatusToggle = async (storeId: string, currentStatus: string) => {
    if (!currentCompany?.id) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateStore(currentCompany.id, storeId, { status: newStatus as any });
      toast.success(newStatus === 'ACTIVE' ? 'Mağaza aktif edildi' : 'Mağaza pasif edildi');
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Durum değiştirilemedi');
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
  const pillBtnClass =
    'h-8 cursor-pointer rounded-full bg-black/[0.06] px-3 text-sm font-medium text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]';
  // Bağlı Olanlar grid'i — soft top-down gradient + 0.5-px ring.
  const cardShellClass =
    'rounded-2xl bg-gradient-to-b from-black/[0.04] to-black/[0.06] shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]';

  return (
    <>
      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-4">
        {/* Mobil sidebar toggle — bu sayfanın PageHeader'ı yok, bu yüzden
            sol-üst köşede absolute olarak gösteriyoruz. Desktop'ta gizli. */}
        <MobileSidebarToggle className="absolute left-4 top-4 z-20" />

        {/* Soft blurred blob — Figma 12107:16370. 952×160 pill horizontally
        centered at -80 so it bleeds a subtle shadow behind the title. Black
        on the neutral grey page; switches to white when a theme accent is
        active so it lifts off the coloured gradient instead of muddying it. */}
        <div className="integrations-blob pointer-events-none absolute left-1/2 -top-20 z-0 h-40 w-[952px] -translate-x-1/2 rounded-[278px] blur-[32px]" />

        {/* Title block — pb-8 mirrors the 32-px bottom padding from Figma 12107:16372 */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-4 pb-8 pt-24">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-4xl font-medium leading-tight text-foreground">
              Entegrasyonlar
            </h1>
            <p className="text-sm text-foreground/70">
              Kullanmak istediklerinizi BalinaOS&apos;a bağlayın.
            </p>
          </div>
          <SearchField
            variant="secondary"
            value={search}
            onChange={setSearch}
            aria-label="Entegrasyonlarda ara"
            className="w-full max-w-[572px]"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Entegrasyonlarda ara..." />
            </SearchField.Group>
          </SearchField>
        </div>

        <div className="flex flex-col gap-8 px-4 pb-8 pt-8">
          {/* Bağlı Olanlar — mağazalar + fal + fashn + openai + e-fatura hesapları aynı şeritte */}
          {(filteredStores.length > 0 ||
            fals.length > 0 ||
            fashns.length > 0 ||
            openais.length > 0 ||
            bizimhesaps.length > 0 ||
            parasuts.length > 0 ||
            cargoConnections.length > 0) && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-foreground">Bağlı Olanlar</h2>
              <div
                className={`grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-4 ${cardShellClass}`}
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
                    <div
                      key={store.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]">
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
                          <img
                            src={fallbackLogo}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate text-sm font-medium text-foreground">
                          {store.name}
                        </span>
                        <a
                          href={display.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-fit max-w-full items-center gap-1 truncate text-xs text-[#737373] hover:text-foreground"
                        >
                          <span className="truncate">{display.displayUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                      {isSyncing && (
                        <Loader className="h-4 w-4 animate-spin text-muted" aria-label="Senkronize ediliyor" />
                      )}
                      <Button
                        variant="tertiary"
                        size="sm"
                        onPress={() => setSettingsModalStoreId(store.id)}
                        className={pillBtnClass}
                      >
                        Yönet
                      </Button>
                    </div>
                  );
                })}

                {/* Bağlı Fal.ai hesapları */}
                {fals.map((fal) => (
                  <div key={fal.id} className="flex items-center gap-3 p-3">
                    <FalMark
                      className="h-10 w-10 shrink-0 rounded-xl"
                      role="img"
                      aria-label="Fal.ai"
                    />
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground">
                        {fal.name}
                      </span>
                      <span className="truncate text-xs text-[#737373]">
                        Fal.ai • <span className="font-mono">••••{fal.apiKeyTail ?? '----'}</span>
                      </span>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => {
                        setManageFalId(fal.id);
                        setManageFalKey('');
                        setManageFalShowKey(false);
                        setManageFalTestResult(null);
                        setManageFalActive(fal.isActive);
                        setManageFalCodePrefix(fal.codePrefix ?? '');
                      }}
                      className={pillBtnClass}
                    >
                      Yönet
                    </Button>
                  </div>
                ))}

                {/* Bağlı Fashn.ai hesapları */}
                {fashns.map((fashn) => (
                  <div key={fashn.id} className="flex items-center gap-3 p-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[10px] font-bold text-white"
                      role="img"
                      aria-label="Fashn.ai"
                    >
                      Fn
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground">
                        {fashn.name}
                      </span>
                      <span className="truncate text-xs text-[#737373]">
                        Fashn.ai • <span className="font-mono">••••{fashn.apiKeyTail ?? '----'}</span>
                      </span>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => {
                        setManageFalId(fashn.id);
                        setManageFalKey('');
                        setManageFalShowKey(false);
                        setManageFalTestResult(null);
                        setManageFalActive(fashn.isActive);
                        setManageFalCodePrefix(fashn.codePrefix ?? '');
                      }}
                      className={pillBtnClass}
                    >
                      Yönet
                    </Button>
                  </div>
                ))}

                {/* Bağlı OpenAI hesapları */}
                {openais.map((oa) => (
                  <div key={oa.id} className="flex items-center gap-3 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/figma/integrations/openai.svg"
                      alt="OpenAI"
                      className="h-10 w-10 shrink-0 rounded-xl"
                    />
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground">
                        {oa.name}
                      </span>
                      <span className="truncate text-xs text-[#737373]">
                        OpenAI • <span className="font-mono">••••{oa.apiKeyTail ?? '----'}</span>
                      </span>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => {
                        setManageFalId(oa.id);
                        setManageFalKey('');
                        setManageFalShowKey(false);
                        setManageFalTestResult(null);
                        setManageFalActive(oa.isActive);
                        setManageFalCodePrefix(oa.codePrefix ?? '');
                      }}
                      className={pillBtnClass}
                    >
                      Yönet
                    </Button>
                  </div>
                ))}

                {/* Bağlı Bizim Hesap hesapları */}
                {bizimhesaps.map((bh) => (
                  <div key={bh.id} className="flex items-center gap-3 p-3">
                    <BizimhesapMark
                      className="h-10 w-10 shrink-0 rounded-xl"
                      role="img"
                      aria-label="Bizim Hesap"
                    />
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground">
                        {bh.label || 'Bizim Hesap'}
                      </span>
                      <span className="truncate text-xs text-[#737373]">
                        Bizim Hesap • Firma {bh.config.firmId || '—'}
                      </span>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => {
                        setManageBizimhesapId(bh.id);
                        setManageBizimhesapActive(bh.isActive);
                      }}
                      className={pillBtnClass}
                    >
                      Yönet
                    </Button>
                  </div>
                ))}

                {/* Bağlı Paraşüt hesapları */}
                {parasuts.map((ps) => (
                  <div key={ps.id} className="flex items-center gap-3 p-3">
                    <ParasutMark
                      className="h-10 w-10 shrink-0 rounded-xl"
                      role="img"
                      aria-label="Paraşüt"
                    />
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground">
                        {ps.label || 'Paraşüt'}
                      </span>
                      <span className="truncate text-xs text-[#737373]">
                        Paraşüt • Şirket {ps.config.parasutCompanyId || '—'}
                      </span>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => {
                        setManageParasutId(ps.id);
                        setManageParasutActive(ps.isActive);
                      }}
                      className={pillBtnClass}
                    >
                      Yönet
                    </Button>
                  </div>
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
                    <div
                      key={cn.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]">
                        <img
                          src="/figma/integrations/dhl.png"
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate text-sm font-medium text-foreground">
                          {label}
                        </span>
                        <span className="truncate text-xs text-[#737373]">
                          {meta}
                        </span>
                      </div>
                      <Button
                        variant="tertiary"
                        size="sm"
                        onPress={() => {
                          setManageCargoId(cn.id);
                          setManageCargoForm({
                            customerNumber: cn.customerNumber ?? '',
                            password: '',
                          });
                          setManageCargoActive(cn.isActive);
                          setManageCargoShowPassword(false);
                        }}
                        className={pillBtnClass}
                      >
                        Yönet
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available categories — horizontal grid of 314-px brand cards */}
          {visibleCategories.map((cat) => (
            <section key={cat.id} className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-foreground">{cat.title}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cat.items.map((item) => {
                  const isDisabled = item.comingSoon;
                  // Fal.ai için her zaman "Bağla" — kullanıcı birden fazla
                  // hesap ekleyebilsin diye Yönet'i kart üstünde değil,
                  // Bağlı Olanlar listesinde gösteriyoruz.
                  const buttonLabel = isDisabled ? 'Yakında' : 'Bağla';
                  const isHighlighted = highlightId === item.id;
                  return (
                    <div
                      key={item.id}
                      ref={isHighlighted ? highlightRef : undefined}
                      className={`flex items-center gap-3 p-3 transition-all duration-500 ${
                        isDisabled ? 'opacity-40' : ''
                      } ${
                        isHighlighted
                          ? 'scale-[1.04] rounded-2xl bg-foreground/[0.06]'
                          : 'scale-100'
                      }`}
                    >
                      {item.id === 'FAL_AI' ? (
                        <FalMark
                          className="h-10 w-10 shrink-0 rounded-xl"
                          role="img"
                          aria-label={item.name}
                        />
                      ) : item.id === 'FASHN_AI' ? (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[10px] font-bold text-white"
                          role="img"
                          aria-label={item.name}
                        >
                          Fn
                        </div>
                      ) : item.id === 'OPENAI' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/figma/integrations/openai.svg"
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-xl"
                          role="img"
                          aria-label={item.name}
                        />
                      ) : item.id === 'BIZIMHESAP' ? (
                        <BizimhesapMark
                          className="h-10 w-10 shrink-0 rounded-xl"
                          role="img"
                          aria-label={item.name}
                        />
                      ) : item.id === 'PARASUT' ? (
                        <ParasutMark
                          className="h-10 w-10 shrink-0 rounded-xl"
                          role="img"
                          aria-label={item.name}
                        />
                      ) : (
                        <div
                          className="h-10 w-10 shrink-0 rounded-xl"
                          style={brandTileStyle(item.logo)}
                          aria-label={item.name}
                          role="img"
                        />
                      )}
                      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                        {item.description && (
                          <span className="truncate text-xs text-[#737373]">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="tertiary"
                        size="sm"
                        onPress={() => handleMarketplaceClick(item)}
                        isDisabled={isDisabled}
                        className={pillBtnClass}
                      >
                        {buttonLabel}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredStores.length === 0 && visibleCategories.length === 0 && (
            <p className="text-center text-sm text-muted">
              Aramanızla eşleşen entegrasyon bulunamadı.
            </p>
          )}
        </div>
      </div>

      <Modal isOpen={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {selectedMarketplace && (
                    <img
                      src={selectedMarketplace.logo}
                      alt={selectedMarketplace.name}
                      className="h-6 w-6 object-contain"
                    />
                  )}
                  {selectedMarketplace?.name} Bağla
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="py-2">
                  {selectedMarketplace?.steps?.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => isCompleted && setCurrentStep(index)}
                            disabled={!isCompleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : isCompleted
                                  ? 'cursor-pointer bg-default text-muted hover:bg-default/80'
                                  : 'cursor-default bg-default text-muted'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                          </button>
                          {index < totalSteps && (
                            <div className="min-h-4 w-0.5 flex-1 bg-default" />
                          )}
                        </div>
                        <div className={`flex-1 ${isActive ? 'pb-6' : 'pb-4'}`}>
                          {isActive && !isLastStep ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                value={formData[step.key as keyof typeof formData]}
                                onChange={(value) =>
                                  setFormData((prev) => ({ ...prev, [step.key]: value }))
                                }
                                type={step.type || 'text'}
                                autoFocus
                              >
                                <Label>{step.label}</Label>
                                <Input placeholder={step.placeholder} />
                              </TextField>
                              <p className="text-sm text-muted">{step.description}</p>
                              <Button onPress={handleNext} fullWidth>
                                İleri
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isCompleted && setCurrentStep(index)}
                              disabled={!isCompleted}
                              className={`w-full pt-1.5 text-left ${
                                isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                            >
                              <span className="text-sm text-muted">{step.label}</span>
                              {isCompleted && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {formData[step.key as keyof typeof formData]}
                                </p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isLastStep
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-default text-muted'
                        }`}
                      >
                        {totalSteps + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      {isLastStep ? (
                        selectedMarketplace?.platform === 'WOOCOMMERCE' ? (
                          <div className="flex flex-col gap-3">
                            <Label>WooCommerce'a Yönlendir</Label>
                            <p className="text-sm text-muted">
                              Sonraki adımda WooCommerce sitenize gideceksiniz. WP admin'e
                              giriş yapıp <strong>Approve</strong> butonuna tıkladıktan sonra
                              otomatik olarak geri döneceksiniz.
                            </p>
                            <Card>
                              <Card.Content className="flex flex-col gap-1 text-sm">
                                <p>
                                  <span className="text-muted">Mağaza:</span>{' '}
                                  {formData.name}
                                </p>
                                <p>
                                  <span className="text-muted">URL:</span>{' '}
                                  {formData.url}
                                </p>
                              </Card.Content>
                            </Card>
                            <Button
                              onPress={handleWoocommerceStart}
                              isDisabled={isSubmitting}
                              isPending={isSubmitting}
                              fullWidth
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Yönlendiriliyor...
                                </>
                              ) : (
                                "WooCommerce'a Git"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <Label>Bağlantı Testi</Label>
                            <p className="text-sm text-muted">
                              Girdiğiniz bilgilerle bağlantıyı test edin.
                            </p>
                            <Card>
                              <Card.Content className="flex flex-col gap-1 text-sm">
                                <p>
                                  <span className="text-muted">Mağaza:</span>{' '}
                                  {formData.name}
                                </p>
                                {selectedMarketplace?.platform === 'SHOPIFY' ? (
                                  <p>
                                    <span className="text-muted">Domain:</span>{' '}
                                    {formData.shopDomain}
                                  </p>
                                ) : selectedMarketplace?.platform === 'TRENDYOL' ? (
                                  <>
                                    <p>
                                      <span className="text-muted">Satıcı ID:</span>{' '}
                                      {formData.sellerId}
                                    </p>
                                    <p>
                                      <span className="text-muted">Ortam:</span>{' '}
                                      {formData.environment === 'prod' ? 'Prod' : 'Stage'}
                                    </p>
                                  </>
                                ) : selectedMarketplace?.platform === 'HEPSIBURADA' ? (
                                  <>
                                    <p>
                                      <span className="text-muted">Merchant ID:</span>{' '}
                                      {formData.merchantId}
                                    </p>
                                    <p>
                                      <span className="text-muted">Kullanıcı:</span>{' '}
                                      {formData.hbUsername}
                                    </p>
                                  </>
                                ) : (
                                  <p>
                                    <span className="text-muted">URL:</span>{' '}
                                    {formData.url}
                                  </p>
                                )}
                              </Card.Content>
                            </Card>
                            <Button
                              onPress={handleTestConnection}
                              isDisabled={isTesting}
                              isPending={isTesting}
                              variant="outline"
                              fullWidth
                            >
                              {isTesting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Test ediliyor...
                                </>
                              ) : (
                                'Bağlantıyı Test Et'
                              )}
                            </Button>
                            {testResult && (
                              <Alert
                                status={testResult.success ? 'success' : 'danger'}
                              >
                                <Alert.Indicator />
                                <Alert.Content>
                                  <Alert.Title>
                                    {testResult.success
                                      ? testResult.meta?.shopName
                                        ? `Bağlandı: ${testResult.meta.shopName}${
                                            testResult.meta.currency
                                              ? ` (${testResult.meta.currency})`
                                              : ''
                                          }`
                                        : 'Bağlantı başarılı!'
                                      : testResult.error}
                                  </Alert.Title>
                                </Alert.Content>
                              </Alert>
                            )}
                            <Button
                              onPress={handleConnect}
                              isDisabled={isSubmitting || !testResult?.success}
                              isPending={isSubmitting}
                              fullWidth
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Bağlanıyor...
                                </>
                              ) : (
                                'Mağazayı Bağla'
                              )}
                            </Button>
                          </div>
                        )
                      ) : (
                        <div className="pt-1.5">
                          <span className="text-sm text-muted">
                            {selectedMarketplace?.platform === 'WOOCOMMERCE'
                              ? "WooCommerce'a Yönlendir"
                              : 'Bağlantı Testi'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {selectedMarketplace?.helpUrl && (
                  <div className="pt-4">
                    <a
                      href={selectedMarketplace.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                    >
                      Dokümantasyon
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={dhlModalOpen}
        onOpenChange={(open) => !open && handleDhlDialogClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <img
                    src="/figma/integrations/dhl.png"
                    alt="DHL"
                    className="h-6 w-6 object-contain"
                  />
                  DHL Bağla
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="py-2">
                  {dhlSteps.map((step, index) => {
                    const isActive = index === dhlCurrentStep;
                    const isCompleted = index < dhlCurrentStep;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => isCompleted && setDhlCurrentStep(index)}
                            disabled={!isCompleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : isCompleted
                                  ? 'cursor-pointer bg-default text-muted hover:bg-default/80'
                                  : 'cursor-default bg-default text-muted'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                          </button>
                          {index < dhlTotalSteps && (
                            <div className="min-h-4 w-0.5 flex-1 bg-default" />
                          )}
                        </div>
                        <div className={`flex-1 ${isActive ? 'pb-6' : 'pb-4'}`}>
                          {isActive && !isDhlLastStep ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                  value={dhlForm[step.key]}
                                  onChange={(value) =>
                                    setDhlForm((prev) => ({
                                      ...prev,
                                      [step.key]: value,
                                    }))
                                  }
                                  type={
                                    step.kind === 'password'
                                      ? dhlShowPassword
                                        ? 'text'
                                        : 'password'
                                      : 'text'
                                  }
                                  autoFocus
                                >
                                  <Label>{step.label}</Label>
                                  {step.kind === 'password' ? (
                                    <div className="relative w-full">
                                      <Input
                                        placeholder={step.placeholder}
                                        className="w-full pr-10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setDhlShowPassword((v) => !v)}
                                        aria-label={
                                          dhlShowPassword
                                            ? 'Şifreyi gizle'
                                            : 'Şifreyi göster'
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                                      >
                                        {dhlShowPassword ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <Input placeholder={step.placeholder} />
                                  )}
                                </TextField>
                              <p className="text-sm text-muted">{step.description}</p>
                              <Button onPress={handleDhlNext} fullWidth>
                                İleri
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isCompleted && setDhlCurrentStep(index)}
                              disabled={!isCompleted}
                              className={`w-full pt-1.5 text-left ${
                                isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                            >
                              <span className="text-sm text-muted">{step.label}</span>
                              {isCompleted && step.key === 'customerNumber' && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {dhlForm.customerNumber}
                                </p>
                              )}
                              {isCompleted && step.key === 'password' && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {'•'.repeat(Math.min(dhlForm.password.length, 8))}
                                </p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Final step — submit */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isDhlLastStep
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-default text-muted'
                        }`}
                      >
                        {dhlTotalSteps + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      {isDhlLastStep ? (
                        <div className="flex flex-col gap-3">
                          <Label>Bağla</Label>
                          <p className="text-sm text-muted">
                            Girdiğiniz bilgilerle DHL bağlantısını kaydedin.
                          </p>
                          <Button
                            onPress={handleSaveDhl}
                            isDisabled={isDhlSaving}
                            isPending={isDhlSaving}
                            fullWidth
                          >
                            {isDhlSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Bağlanıyor...
                              </>
                            ) : (
                              'Bağla'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-1.5">
                          <span className="text-sm text-muted">Bağla</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <a
                    href="https://developer.dhl.com/api-reference/dhl-express-mydhl-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  >
                    Dokümantasyon
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Fal.ai / Fashn.ai bağlama modalı — Woocommerce/DHL ile aynı stepper deseni. */}
      <Modal
        isOpen={isFalDialogOpen}
        onOpenChange={(open) => !open && handleFalDialogClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {falDialogProvider === 'fashn' ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[8px] font-bold text-white">
                      Fn
                    </div>
                  ) : falDialogProvider === 'openai' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/figma/integrations/openai.svg"
                      alt="OpenAI"
                      className="h-6 w-6 rounded-md"
                    />
                  ) : (
                    <FalMark className="h-6 w-6 rounded-md" />
                  )}
                  {falProviderLabel} Bağla
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {(() => {
                  const count =
                    falDialogProvider === 'fashn'
                      ? fashns.length
                      : falDialogProvider === 'openai'
                        ? openais.length
                        : fals.length;
                  return count > 0 ? (
                    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground/80">
                      {count} bağlı hesap mevcut. Yeni bir anahtar girerek ek hesap ekleyebilirsiniz.
                    </div>
                  ) : null;
                })()}

                <div className="py-2">
                  {falSteps.map((step, index) => {
                    const isActive = index === falCurrentStep;
                    const isCompleted = index < falCurrentStep;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => isCompleted && setFalCurrentStep(index)}
                            disabled={!isCompleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : isCompleted
                                  ? 'cursor-pointer bg-default text-muted hover:bg-default/80'
                                  : 'cursor-default bg-default text-muted'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                          </button>
                          {index < falTotalSteps && (
                            <div className="min-h-4 w-0.5 flex-1 bg-default" />
                          )}
                        </div>
                        <div className={`flex-1 ${isActive ? 'pb-6' : 'pb-4'}`}>
                          {isActive && !isFalLastStep ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                value={falForm[step.key]}
                                onChange={(value) =>
                                  setFalForm((prev) => ({ ...prev, [step.key]: value }))
                                }
                                type={
                                  step.isPassword
                                    ? falShowKey
                                      ? 'text'
                                      : 'password'
                                    : 'text'
                                }
                                autoFocus
                              >
                                <Label>{step.label}</Label>
                                {step.isPassword ? (
                                  <div className="relative w-full">
                                    <Input
                                      placeholder={step.placeholder}
                                      className="w-full pr-10"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setFalShowKey((v) => !v)}
                                      aria-label={
                                        falShowKey ? 'Anahtarı gizle' : 'Anahtarı göster'
                                      }
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                                    >
                                      {falShowKey ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <Input placeholder={step.placeholder} />
                                )}
                              </TextField>
                              <p className="text-sm text-muted">{step.description}</p>
                              <Button onPress={handleFalNext} fullWidth>
                                İleri
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isCompleted && setFalCurrentStep(index)}
                              disabled={!isCompleted}
                              className={`w-full pt-1.5 text-left ${
                                isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                            >
                              <span className="text-sm text-muted">{step.label}</span>
                              {isCompleted && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {'•'.repeat(Math.min(falForm.apiKey.length, 8))}
                                </p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Final step — submit */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isFalLastStep
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-default text-muted'
                        }`}
                      >
                        {falTotalSteps + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      {isFalLastStep ? (
                        <div className="flex flex-col gap-3">
                          <Label>Bağla</Label>
                          <p className="text-sm text-muted">
                            Anahtarınız şifrelenip kaydedilecek; ardından AI Üretim panelinden
                            görsel üretebilirsiniz.
                          </p>
                          <Button
                            onPress={handleFalSave}
                            isDisabled={isSavingFal}
                            isPending={isSavingFal}
                            fullWidth
                          >
                            {isSavingFal ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Kaydediliyor...
                              </>
                            ) : (
                              'Bağla'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-1.5">
                          <span className="text-sm text-muted">Bağla</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <a
                    href="https://fal.ai/dashboard/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  >
                    Dokümantasyon
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Fal.ai yönetim modalı — Mağaza Ayarları desenini takip eder.
          Anahtar değişikliği ayrı bir alt-modale taşındı. */}
      <Modal
        isOpen={manageFalId !== null}
        onOpenChange={(open) => !open && handleManageClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Hesap Ayarları</Modal.Heading>
              </Modal.Header>
              <Modal.Body style={{ marginTop: 0 }}>
                <div className="flex flex-col gap-4">
                  {manageFal && (
                    <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3">
                      {manageProvider === 'fashn' ? (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[10px] font-bold text-white"
                          role="img"
                          aria-label="Fashn.ai"
                        >
                          Fn
                        </div>
                      ) : (
                        <FalMark
                          className="h-10 w-10 shrink-0 rounded-xl"
                          role="img"
                          aria-label="Fal.ai"
                        />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium">{manageFal.name}</p>
                        <p className="truncate text-xs text-muted">
                          {manageProviderLabel} •{' '}
                          <span className="font-mono">
                            ••••{manageFal.apiKeyTail ?? '----'}
                          </span>
                        </p>
                      </div>
                      <Switch
                        isSelected={manageFalActive}
                        onChange={setManageFalActive}
                        aria-label="Aktif"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  )}

                  {/* Modeller bölümü — sadece Fal hesabı için. Fashn'da tek model var. */}
                  {manageFal && manageProvider === 'fal' && (
                    <div className="flex flex-col gap-2">
                      <Label>Modeller</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {manageFal.models.length === 0 ? (
                          <span className="text-xs text-muted">
                            Hiç model seçilmedi.
                          </span>
                        ) : (
                          manageFal.models.map((m) => {
                            const meta = FAL_MODEL_CATALOG.find((c) => c.id === m);
                            return (
                              <Chip key={m} variant="secondary" size="sm">
                                {meta?.label ?? m}
                              </Chip>
                            );
                          })
                        )}
                      </div>
                      <Button
                        variant="tertiary"
                        size="sm"
                        onPress={handleModelPickerOpen}
                        className={`self-start ${pillBtnClass}`}
                      >
                        Modelleri Değiştir
                      </Button>
                    </div>
                  )}

                  {/* Ürün kodu öneki — chat'te girilen koda eklenecek prefix.
                      Örn 'KZ' + kullanıcı kodu '001' → SKU 'KZ-001'.
                      Üretilen tüm görsel/videoların sağ-altına bu kod overlay
                      olarak basılır ve ürün yüklemede SKU olarak kullanılır. */}
                  {manageFal && (
                    <div className="flex flex-col gap-1.5">
                      <Label>Ürün kodu öneki</Label>
                      <TextField
                        value={manageFalCodePrefix}
                        onChange={setManageFalCodePrefix}
                        aria-label="Ürün kodu öneki"
                      >
                        <Input placeholder="örn. KZ" />
                      </TextField>
                      <p className="text-[11px] text-muted">
                        Üretilen görsel/videoların sol alt köşesinde gösterilir.
                        Örn: <span className="font-mono">{manageFalCodePrefix.trim() || 'KZ'}-001</span>
                      </p>
                    </div>
                  )}


                  {/* API Anahtarı — değiştirme alt-modalını açan satır */}
                  <div className="flex flex-col gap-2">
                    <Label>API Anahtarı</Label>
                    <div className="flex items-center gap-2 rounded-lg bg-surface-secondary/50 p-3">
                      <Key className="h-4 w-4 shrink-0 text-muted" />
                      <span className="flex-1 truncate font-mono text-sm">
                        ••••••••••••{manageFal?.apiKeyTail ?? '----'}
                      </span>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onPress={() => {
                        setManageFalKey('');
                        setManageFalShowKey(false);
                        setManageFalTestResult(null);
                        setIsChangeKeyOpen(true);
                      }}
                      className={`self-start ${pillBtnClass}`}
                    >
                      Anahtarı Değiştir
                    </Button>
                  </div>

                  {manageFal && (
                    <p className="text-center text-xs text-muted">
                      Eklendi:{' '}
                      {new Date(manageFal.createdAt).toLocaleString('tr-TR')}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <AlertDialog>
                      <Button variant="tertiary" className="flex-1 text-danger">
                        <Trash2 className="h-4 w-4" />
                        Hesabı Kaldır
                      </Button>
                      <AlertDialog.Backdrop>
                        <AlertDialog.Container>
                          <AlertDialog.Dialog className="sm:max-w-md">
                            <AlertDialog.Header>
                              <AlertDialog.Icon status="danger" />
                              <AlertDialog.Heading>Hesabı Kaldır</AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body style={{ marginTop: 0, padding: '0 12px' }}>
                              <p className="text-sm text-muted">
                                <span className="font-medium text-foreground">
                                  {manageFal?.name}
                                </span>{' '}
                                Fal.ai hesabını kaldırmak istediğinize emin misiniz? Bu
                                işlem geri alınamaz; bağlı ürün türleri ve model ayarları
                                da silinir.
                              </p>
                            </AlertDialog.Body>
                            <AlertDialog.Footer>
                              <Button variant="tertiary" slot="close" className="flex-1">
                                İptal
                              </Button>
                              <Button
                                variant="danger"
                                slot="close"
                                onPress={handleManageRemove}
                                className="flex-1"
                              >
                                Kaldır
                              </Button>
                            </AlertDialog.Footer>
                          </AlertDialog.Dialog>
                        </AlertDialog.Container>
                      </AlertDialog.Backdrop>
                    </AlertDialog>
                    <Button
                      className="flex-1"
                      onPress={handleManageSettingsSave}
                      isDisabled={isManageSaving}
                      isPending={isManageSaving}
                    >
                      {isManageSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        'Kaydet'
                      )}
                    </Button>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Anahtar değiştirme alt-modalı — Yönet içindeki Değiştir butonundan açılır. */}
      <Modal
        isOpen={isChangeKeyOpen}
        onOpenChange={(open) => {
          if (!open && !isSavingFal && !manageFalTesting) handleChangeKeyClose();
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <FalMark className="h-6 w-6 rounded-md" />
                  Anahtarı Değiştir
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body style={{ marginTop: 0 }}>
                <div className="flex flex-col gap-4">
                  {manageFal && (
                    <p className="text-sm text-muted">
                      <span className="font-medium text-foreground">{manageFal.name}</span>{' '}
                      hesabı için yeni bir API anahtarı girin. Mevcut anahtar:{' '}
                      <span className="font-mono">••••{manageFal.apiKeyTail ?? '----'}</span>
                    </p>
                  )}

                  <TextField
                    value={manageFalKey}
                    onChange={setManageFalKey}
                    type={manageFalShowKey ? 'text' : 'password'}
                  >
                    <Label>Yeni API Anahtarı</Label>
                    <div className="relative w-full">
                      <Input
                        placeholder="fal-..."
                        className="w-full pr-10"
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setManageFalShowKey((v) => !v)}
                        aria-label={manageFalShowKey ? 'Anahtarı gizle' : 'Anahtarı göster'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      >
                        {manageFalShowKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </TextField>
                  <p className="text-xs text-muted">
                    Anahtar şifreli olarak saklanır. Test Et ile kaydetmeden önce
                    doğrulayabilirsiniz.
                  </p>

                  {manageFalTestResult && (
                    <Alert status={manageFalTestResult.ok ? 'success' : 'danger'}>
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>
                          {manageFalTestResult.ok
                            ? 'Bağlantı başarılı'
                            : manageFalTestResult.error || 'Bağlantı başarısız'}
                        </Alert.Title>
                      </Alert.Content>
                    </Alert>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      onPress={handleManageTest}
                      isDisabled={manageFalTesting || manageFalKey.trim().length === 0}
                      isPending={manageFalTesting}
                      className="flex-1"
                    >
                      {manageFalTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Test ediliyor...
                        </>
                      ) : (
                        'Test Et'
                      )}
                    </Button>
                    <Button
                      variant="primary"
                      onPress={handleManageSave}
                      isDisabled={isSavingFal || manageFalKey.trim().length === 0}
                      isPending={isSavingFal}
                      className="flex-1"
                    >
                      {isSavingFal ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Model seçim alt-modalı — Bağla modalı estetiğiyle, çoklu seçim. */}
      <Modal
        isOpen={modelPickerOpen}
        onOpenChange={(open) => {
          if (!open && !modelPickerSaving) setModelPickerOpen(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <FalMark className="h-6 w-6 rounded-md" />
                  Model Seç
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body style={{ marginTop: 0 }}>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted">
                    Görsel ve video için birer model seçin (her türden en fazla 1 tane).
                    Üretim sırasında otomatik olarak bunlar kullanılacak.
                  </p>

                  {/* Search input — Entegrasyonlardaki varyantla aynı stil */}
                  <SearchField
                    variant="secondary"
                    value={modelPickerSearch}
                    onChange={setModelPickerSearch}
                    aria-label="Model ara"
                    className="w-full"
                  >
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Model adı veya id ile ara..." />
                    </SearchField.Group>
                  </SearchField>

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
                              <Switch
                                isSelected={checked}
                                isDisabled={isDisabled}
                                onChange={() => toggleModelPick(m.id)}
                                aria-label={m.label}
                              >
                                <Switch.Control>
                                  <Switch.Thumb />
                                </Switch.Control>
                              </Switch>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setModelPickerOpen(false)}
                      isDisabled={modelPickerSaving}
                    >
                      Vazgeç
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleModelPickerSave}
                      isDisabled={modelPickerSaving || modelPickerSelection.size === 0}
                      isPending={modelPickerSaving}
                    >
                      {modelPickerSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={showSuggestionsDialog}
        onOpenChange={(open) => {
          if (!open && !isAutoMatching) {
            setShowSuggestionsDialog(false);
            setSuggestionsCount(0);
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  SKU Eşleşmesi Bulundu
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  Mağazalarınız arasında <span className="font-medium text-foreground">{suggestionsCount}</span>{' '}
                  SKU eşleşmesi tespit edildi. Otomatik olarak eşleştirilsin mi? Stok ve fiyat değişimleri
                  bağlı mağazalarda senkron tutulacak.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  slot="close"
                  className="flex-1"
                  isDisabled={isAutoMatching}
                >
                  Belki Sonra
                </Button>
                <Button
                  className="flex-1"
                  onPress={handleAutoMatch}
                  isDisabled={isAutoMatching}
                  isPending={isAutoMatching}
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
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <UpgradePlanModal
        isOpen={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        description="Maalesef Free plan'da 1 mağazadan fazla ekleyemezsiniz. Daha fazla mağaza eklemek için planınızı yükseltin."
      />

      <Modal
        isOpen={!!settingsModalStoreId}
        onOpenChange={(open) => {
          if (!open) {
            setSettingsModalStoreId(null);
            setWcscState({
              apiKey: '',
              apiSecret: '',
              showSecret: false,
              testing: false,
              testResult: null,
              connecting: false,
              disconnecting: false,
            });
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Mağaza Ayarları</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {settingsModalStoreId &&
                  settingsState[settingsModalStoreId] &&
                  (() => {
                    const currentStore = stores.find((s) => s.id === settingsModalStoreId);
                    const isConnected = currentStore?.hasWcscPlugin;
                    // WCSC sadece WooCommerce için anlamlı (WordPress plugin
                    // bazlı). Trendyol/Shopify mağazalarında tab'ı gizliyoruz.
                    // Legacy kayıtlarda platform undefined olabilir — onları
                    // WooCommerce kabul ediyoruz.
                    const isWoocommerce =
                      !currentStore?.platform ||
                      currentStore.platform === 'WOOCOMMERCE';
                    const isTrendyol = currentStore?.platform === 'TRENDYOL';
                    // "Genel" dışında ek tab varsa (WCSC veya Trendyol) tab list
                    // göster; tek başına Genel duruyorsa anlamsız → list gizli.
                    const hasExtraTabs = isWoocommerce || isTrendyol;
                    return (
                      <Tabs defaultSelectedKey="general">
                        {hasExtraTabs && (
                          <Tabs.ListContainer>
                            <Tabs.List aria-label="Ayar sekmeleri">
                              <Tabs.Tab id="general">
                                Genel
                                <Tabs.Indicator />
                              </Tabs.Tab>
                              {isWoocommerce && (
                                <Tabs.Tab id="wcsc">
                                  Stok Sync
                                  <Tabs.Indicator />
                                </Tabs.Tab>
                              )}
                              {isTrendyol && (
                                <Tabs.Tab id="trendyol">
                                  Trendyol
                                  <Tabs.Indicator />
                                </Tabs.Tab>
                              )}
                            </Tabs.List>
                          </Tabs.ListContainer>
                        )}
                        <Tabs.Panel
                          id="general"
                          className="mt-4 flex flex-col gap-4"
                        >
                          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3">
                            {(() => {
                              if (!currentStore) return null;
                              const display = getStoreDisplay({
                                ...currentStore,
                                shopDomain:
                                  currentStore.shopDomain ||
                                  shopifyDomains[currentStore.id],
                              });
                              const fallbackLogo = display.useShopifyBrand
                                ? '/figma/integrations/shopify.png'
                                : '/figma/integrations/woocommerce.png';
                              const fav = display.useShopifyBrand
                                ? null
                                : siteFaviconUrl(currentStore.url);
                              return fav ? (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]">
                                  <img
                                    src={fav}
                                    alt=""
                                    className="h-6 w-6"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = fallbackLogo;
                                    }}
                                  />
                                </div>
                              ) : (
                                <img
                                  src={fallbackLogo}
                                  alt=""
                                  className="h-10 w-10 rounded-xl object-cover"
                                />
                              );
                            })()}
                            <div className="flex min-w-0 flex-1 flex-col">
                              <p className="truncate text-sm font-medium">{currentStore?.name}</p>
                              <p className="truncate text-xs text-muted">
                                {currentStore
                                  ? getStoreDisplay({
                                      ...currentStore,
                                      shopDomain:
                                        currentStore.shopDomain ||
                                        shopifyDomains[currentStore.id],
                                    }).displayUrl
                                  : ''}
                              </p>
                            </div>
                            <Switch
                              isSelected={currentStore?.status === 'ACTIVE'}
                              onChange={() =>
                                currentStore &&
                                handleStatusToggle(currentStore.id, currentStore.status)
                              }
                              aria-label="Aktif"
                            >
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch>
                          </div>
                          <div className="flex flex-col gap-2">
                            <TextField
                              value={settingsState[settingsModalStoreId].commissionRate}
                              onChange={(v) =>
                                handleSettingsChange(settingsModalStoreId, 'commissionRate', v)
                              }
                            >
                              <Label>Komisyon Oranı</Label>
                              <InputGroup variant="secondary">
                                <InputGroup.Input placeholder="0" inputMode="decimal" />
                                <InputGroup.Suffix>%</InputGroup.Suffix>
                              </InputGroup>
                            </TextField>
                            <p className="text-xs text-muted">
                              Pazaryeri komisyon oranı (0-100 arası)
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <TextField
                              value={settingsState[settingsModalStoreId].shippingCost}
                              onChange={(v) =>
                                handleSettingsChange(settingsModalStoreId, 'shippingCost', v)
                              }
                            >
                              <Label>Kargo Maliyeti</Label>
                              <InputGroup variant="secondary">
                                <InputGroup.Input placeholder="0" inputMode="decimal" />
                                <InputGroup.Suffix>TL</InputGroup.Suffix>
                              </InputGroup>
                            </TextField>
                            <p className="text-xs text-muted">
                              Sabit kargo maliyeti (sipariş başına)
                            </p>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3 text-xs text-muted">
                            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                            <span className="shrink-0">Son senkronizasyon</span>
                            <span className="truncate text-foreground">
                              {formatDate(currentStore?.lastSyncAt ?? null)}
                            </span>
                            <Button
                              size="sm"
                              onPress={() => currentStore && handleSync(currentStore.id)}
                              isDisabled={
                                currentStore?.status !== 'ACTIVE' || !!currentStore?.isSyncing
                              }
                              className={`ml-auto ${pillBtnClass}`}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Senkronize Et
                            </Button>
                          </div>
                          <p className="text-center text-xs text-muted">
                            Son güncelleme:{' '}
                            {currentStore?.updatedAt
                              ? new Date(currentStore.updatedAt).toLocaleString('tr-TR')
                              : '-'}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="tertiary"
                              onPress={() =>
                                currentStore && setDeleteConfirmStoreId(currentStore.id)
                              }
                              className={`flex-1 text-danger ${pillBtnClass}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Mağazayı Sil
                            </Button>
                            <Button
                              className="flex-1"
                              onPress={() => handleSaveSettings(settingsModalStoreId)}
                              isDisabled={settingsState[settingsModalStoreId].saving}
                              isPending={settingsState[settingsModalStoreId].saving}
                            >
                              {settingsState[settingsModalStoreId].saving ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Kaydediliyor...
                                </>
                              ) : (
                                'Kaydet'
                              )}
                            </Button>
                          </div>
                        </Tabs.Panel>
                        {isWoocommerce && (
                        <Tabs.Panel
                          id="wcsc"
                          className="mt-4 flex flex-col gap-4"
                        >
                          {isConnected ? (
                            <>
                              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                                <div className="flex items-center gap-2 text-success">
                                  <Check className="h-5 w-5" />
                                  <span className="font-medium">WC Stock Connector Bağlı</span>
                                </div>
                                <p className="mt-1 text-sm text-success">
                                  Stok değişiklikleri otomatik olarak senkronize edilecek.
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label className="flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4 text-muted" />
                                  Webhook URL
                                </Label>
                                <div className="flex gap-2">
                                  <TextField
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/stock-sync`}
                                    isReadOnly
                                    className="flex-1"
                                  >
                                    <Input className="font-mono text-xs" />
                                  </TextField>
                                  <Button
                                    variant="outline"
                                    size="md"
                                    isIconOnly
                                    aria-label="Kopyala"
                                    onPress={() =>
                                      copyToClipboard(
                                        `${window.location.origin}/api/webhook/stock-sync`
                                      )
                                    }
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted">
                                  Bu URL&apos;i WordPress eklentisindeki Dashboard URL alanına girin.
                                </p>
                              </div>
                              {currentStore?.wcscLastSyncAt && (
                                <div className="text-sm text-muted">
                                  Son webhook:{' '}
                                  {new Date(currentStore.wcscLastSyncAt).toLocaleString('tr-TR')}
                                </div>
                              )}
                              <Button
                                variant="danger"
                                fullWidth
                                onPress={handleDisconnectWcsc}
                                isDisabled={wcscState.disconnecting}
                                isPending={wcscState.disconnecting}
                              >
                                {wcscState.disconnecting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Bağlantı kesiliyor...
                                  </>
                                ) : (
                                  'Bağlantıyı Kes'
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="rounded-lg bg-surface-secondary/50 p-4">
                                <div className="flex items-center gap-2">
                                  <Plug className="h-5 w-5 text-muted" />
                                  <span className="font-medium">WC Stock Connector</span>
                                </div>
                                <p className="mt-1 text-sm text-muted">
                                  WordPress sitenize WC Stock Connector eklentisini kurun ve
                                  aşağıdaki bilgileri girin.
                                </p>
                              </div>
                              <TextField
                                value={wcscState.apiKey}
                                onChange={(v) =>
                                  setWcscState((prev) => ({
                                    ...prev,
                                    apiKey: v,
                                    testResult: null,
                                  }))
                                }
                              >
                                <Label className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-muted" />
                                  API Key
                                </Label>
                                <Input placeholder="Eklentiden kopyalayın" />
                              </TextField>
                              <TextField
                                value={wcscState.apiSecret}
                                onChange={(v) =>
                                  setWcscState((prev) => ({
                                    ...prev,
                                    apiSecret: v,
                                    testResult: null,
                                  }))
                                }
                                type={wcscState.showSecret ? 'text' : 'password'}
                              >
                                <Label>API Secret</Label>
                                <InputGroup variant="secondary">
                                  <InputGroup.Input placeholder="Eklentiden kopyalayın" />
                                  <InputGroup.Suffix>
                                    <button
                                      type="button"
                                      aria-label={
                                        wcscState.showSecret ? 'Gizle' : 'Göster'
                                      }
                                      onClick={() =>
                                        setWcscState((prev) => ({
                                          ...prev,
                                          showSecret: !prev.showSecret,
                                        }))
                                      }
                                      className="text-muted hover:text-foreground"
                                    >
                                      {wcscState.showSecret ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </InputGroup.Suffix>
                                </InputGroup>
                              </TextField>
                              {wcscState.testResult && (
                                <div
                                  className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                                    wcscState.testResult.success
                                      ? 'bg-success/15 text-success'
                                      : 'bg-danger/15 text-danger'
                                  }`}
                                >
                                  {wcscState.testResult.success ? (
                                    <>
                                      <Check className="h-4 w-4" />
                                      Bağlantı başarılı!
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-4 w-4" />
                                      {wcscState.testResult.error}
                                    </>
                                  )}
                                </div>
                              )}
                              <Button
                                variant="outline"
                                fullWidth
                                onPress={handleTestWcsc}
                                isDisabled={
                                  wcscState.testing || !wcscState.apiKey || !wcscState.apiSecret
                                }
                                isPending={wcscState.testing}
                              >
                                {wcscState.testing ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Test ediliyor...
                                  </>
                                ) : (
                                  'Bağlantıyı Test Et'
                                )}
                              </Button>
                              <Button
                                fullWidth
                                onPress={handleConnectWcsc}
                                isDisabled={wcscState.connecting || !wcscState.testResult?.success}
                                isPending={wcscState.connecting}
                              >
                                {wcscState.connecting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Bağlanıyor...
                                  </>
                                ) : (
                                  'Eklentiyi Bağla'
                                )}
                              </Button>
                              <p className="text-center text-xs text-muted">
                                Eklentiyi indirmek için{' '}
                                <a href="#" className="text-accent hover:underline">
                                  buraya tıklayın
                                </a>
                              </p>
                            </>
                          )}
                        </Tabs.Panel>
                        )}
                        {isTrendyol && (
                          <Tabs.Panel
                            id="trendyol"
                            className="mt-4 flex flex-col gap-4"
                          >
                            <div className="rounded-lg border border-default/60 bg-surface-secondary/50 p-4">
                              <div className="flex items-start gap-3">
                                <Plug className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
                                <div className="flex flex-col gap-1">
                                  <p className="text-sm font-medium">
                                    Webhook aboneliği
                                  </p>
                                  <p className="text-xs text-muted">
                                    Trendyol siparişleri webhook üzerinden anlık iletilir.
                                    Abonelik düşerse veya bağlantı testinde hata alırsanız
                                    yenileyebilirsiniz. (Satıcı başına 15 webhook limiti
                                    geçerlidir; mevcut Balina kaydı gerekirse otomatik silinir.)
                                  </p>
                                </div>
                              </div>
                              <Button
                                onPress={handleTrendyolWebhookSetup}
                                isDisabled={trendyolActionState.webhookSetup}
                                isPending={trendyolActionState.webhookSetup}
                                variant="outline"
                                fullWidth
                                className="mt-3"
                              >
                                {trendyolActionState.webhookSetup ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Yenileniyor...
                                  </>
                                ) : (
                                  "Webhook'u yeniden kur"
                                )}
                              </Button>
                            </div>

                            <div className="rounded-lg border border-default/60 bg-surface-secondary/50 p-4">
                              <div className="flex items-start gap-3">
                                <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
                                <div className="flex flex-col gap-1">
                                  <p className="text-sm font-medium">
                                    Son siparişleri çek
                                  </p>
                                  <p className="text-xs text-muted">
                                    Trendyol API'sinden son 24 saatin siparişlerini çekip
                                    eşitler. Webhook gecikmesi veya gözden kaçan paket
                                    olduğunu düşünüyorsanız tetikleyin.
                                  </p>
                                </div>
                              </div>
                              <Button
                                onPress={handleTrendyolSyncRecentOrders}
                                isDisabled={trendyolActionState.recentOrders}
                                isPending={trendyolActionState.recentOrders}
                                variant="outline"
                                fullWidth
                                className="mt-3"
                              >
                                {trendyolActionState.recentOrders ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Senkronize ediliyor...
                                  </>
                                ) : (
                                  'Son 24 saati senkronize et'
                                )}
                              </Button>
                            </div>

                            <p className="text-center text-xs text-muted">
                              Tam senkron için Genel sekmesindeki <strong>Senkronize Et</strong>
                              {' '}butonunu kullanabilirsiniz (son 30 günü kapsar).
                            </p>
                          </Tabs.Panel>
                        )}
                      </Tabs>
                    );
                  })()}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={!!deleteConfirmStoreId}
        onOpenChange={(open) => !open && setDeleteConfirmStoreId(null)}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-danger" />
                  Mağazayı Sil
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {deleteConfirmStoreId && (
                  <p className="text-sm text-muted">
                    <span className="font-medium text-foreground">
                      {stores.find((s) => s.id === deleteConfirmStoreId)?.name}
                    </span>{' '}
                    mağazasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  slot="close"
                  className="flex-1"
                  isDisabled={isDeleting}
                >
                  İptal
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onPress={handleDeleteConfirm}
                  isDisabled={isDeleting}
                  isPending={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    'Evet, Sil'
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Bizim Hesap bağlama modalı — Fal.ai/DHL ile aynı stepper deseni. */}
      <Modal
        isOpen={isBizimhesapDialogOpen}
        onOpenChange={(open) => !open && handleBizimhesapDialogClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <BizimhesapMark className="h-6 w-6 rounded-md" />
                  Bizim Hesap Bağla
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {bizimhesaps.length > 0 && (
                  <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground/80">
                    Mevcut bir Bizim Hesap bağlantınız zaten var. Bu form'u doldurup
                    kaydederseniz mevcut bağlantı yeni bilgilerle değiştirilir
                    (şirket başına tek aktif bağlantı tutuluyor).
                  </div>
                )}

                <div className="py-2">
                  {bizimhesapSteps.map((step, index) => {
                    const isActive = index === bizimhesapCurrentStep;
                    const isCompleted = index < bizimhesapCurrentStep;
                    const showValue = isCompleted ? bizimhesapForm[step.key] : '';
                    const showVisible =
                      step.key === 'apiKey'
                        ? bizimhesapShowApiKey
                        : step.key === 'token'
                          ? bizimhesapShowToken
                          : false;
                    const setShow =
                      step.key === 'apiKey'
                        ? setBizimhesapShowApiKey
                        : step.key === 'token'
                          ? setBizimhesapShowToken
                          : null;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => isCompleted && setBizimhesapCurrentStep(index)}
                            disabled={!isCompleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : isCompleted
                                  ? 'cursor-pointer bg-default text-muted hover:bg-default/80'
                                  : 'cursor-default bg-default text-muted'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                          </button>
                          {index < bizimhesapTotalSteps && (
                            <div className="min-h-4 w-0.5 flex-1 bg-default" />
                          )}
                        </div>
                        <div className={`flex-1 ${isActive ? 'pb-6' : 'pb-4'}`}>
                          {isActive && !isBizimhesapLastStep ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                value={bizimhesapForm[step.key]}
                                onChange={(value) =>
                                  setBizimhesapForm((prev) => ({ ...prev, [step.key]: value }))
                                }
                                type={
                                  step.isPassword
                                    ? showVisible
                                      ? 'text'
                                      : 'password'
                                    : 'text'
                                }
                                autoFocus
                              >
                                <Label>{step.label}</Label>
                                {step.isPassword && setShow ? (
                                  <div className="relative w-full">
                                    <Input placeholder={step.placeholder} className="w-full pr-10" />
                                    <button
                                      type="button"
                                      onClick={() => setShow((v) => !v)}
                                      aria-label={showVisible ? 'Gizle' : 'Göster'}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                                    >
                                      {showVisible ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <Input placeholder={step.placeholder} />
                                )}
                              </TextField>
                              <p className="text-sm text-muted">{step.description}</p>
                              <Button onPress={handleBizimhesapNext} fullWidth>
                                İleri
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isCompleted && setBizimhesapCurrentStep(index)}
                              disabled={!isCompleted}
                              className={`w-full pt-1.5 text-left ${
                                isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                            >
                              <span className="text-sm text-muted">{step.label}</span>
                              {isCompleted && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {step.isPassword
                                    ? '•'.repeat(Math.min(showValue.length, 8))
                                    : showValue || '—'}
                                </p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isBizimhesapLastStep
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-default text-muted'
                        }`}
                      >
                        {bizimhesapTotalSteps + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      {isBizimhesapLastStep ? (
                        <div className="flex flex-col gap-3">
                          <Label>Bağlantı Testi</Label>
                          <p className="text-sm text-muted">
                            Girdiğiniz bilgilerle Bizim Hesap bağlantısını test edip kaydedin.
                          </p>
                          <Button
                            onPress={handleBizimhesapTest}
                            isDisabled={isTestingBizimhesap}
                            isPending={isTestingBizimhesap}
                            variant="outline"
                            fullWidth
                          >
                            {isTestingBizimhesap ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Test ediliyor...
                              </>
                            ) : (
                              'Bağlantıyı Test Et'
                            )}
                          </Button>
                          {bizimhesapTestResult && (
                            <Alert status={bizimhesapTestResult.success ? 'success' : 'danger'}>
                              <Alert.Indicator />
                              <Alert.Content>
                                <Alert.Title>
                                  {bizimhesapTestResult.success
                                    ? 'Bağlantı başarılı!'
                                    : bizimhesapTestResult.error || 'Bağlantı başarısız'}
                                </Alert.Title>
                              </Alert.Content>
                            </Alert>
                          )}
                          <Button
                            onPress={handleBizimhesapSave}
                            isDisabled={isSavingInvoice}
                            isPending={isSavingInvoice}
                            fullWidth
                          >
                            {isSavingInvoice ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Kaydediliyor...
                              </>
                            ) : (
                              'Bağla'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-1.5">
                          <span className="text-sm text-muted">Bağlantı Testi</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <a
                    href="https://apidocs.bizimhesap.com/addinvoice"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  >
                    Dokümantasyon
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Bizim Hesap yönet modalı. */}
      <Modal
        isOpen={manageBizimhesapId !== null}
        onOpenChange={(open) => !open && handleManageBizimhesapClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Hesap Ayarları</Modal.Heading>
              </Modal.Header>
              <Modal.Body style={{ marginTop: 0 }}>
                <div className="flex flex-col gap-4">
                  {manageBizimhesap && (
                    <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3">
                      <BizimhesapMark
                        className="h-10 w-10 shrink-0 rounded-xl"
                        role="img"
                        aria-label="Bizim Hesap"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium">
                          {manageBizimhesap.label || 'Bizim Hesap'}
                        </p>
                        <p className="truncate text-xs text-muted">
                          Bizim Hesap • Firma {manageBizimhesap.config.firmId || '—'}
                        </p>
                      </div>
                      <Switch
                        isSelected={manageBizimhesapActive}
                        onChange={setManageBizimhesapActive}
                        aria-label="Aktif"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onPress={handleManageBizimhesapClose}
                      isDisabled={isManagingBizimhesap}
                    >
                      İptal
                    </Button>
                    <Button
                      onPress={handleManageBizimhesapSave}
                      isPending={isManagingBizimhesap}
                      isDisabled={isManagingBizimhesap}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Paraşüt bağlama modalı. */}
      <Modal
        isOpen={isParasutDialogOpen}
        onOpenChange={(open) => !open && handleParasutDialogClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <ParasutMark className="h-6 w-6 rounded-md" />
                  Paraşüt Bağla
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {parasuts.length > 0 && (
                  <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground/80">
                    Mevcut bir Paraşüt bağlantınız zaten var. Bu form'u doldurup
                    kaydederseniz mevcut bağlantı yeni bilgilerle değiştirilir
                    (şirket başına tek aktif bağlantı tutuluyor).
                  </div>
                )}

                <div className="py-2">
                  {parasutSteps.map((step, index) => {
                    const isActive = index === parasutCurrentStep;
                    const isCompleted = index < parasutCurrentStep;
                    const showValue = isCompleted ? parasutForm[step.key] : '';
                    const showVisible =
                      step.key === 'password'
                        ? parasutShowPassword
                        : step.key === 'clientSecret'
                          ? parasutShowSecret
                          : false;
                    const setShow =
                      step.key === 'password'
                        ? setParasutShowPassword
                        : step.key === 'clientSecret'
                          ? setParasutShowSecret
                          : null;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => isCompleted && setParasutCurrentStep(index)}
                            disabled={!isCompleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : isCompleted
                                  ? 'cursor-pointer bg-default text-muted hover:bg-default/80'
                                  : 'cursor-default bg-default text-muted'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                          </button>
                          {index < parasutTotalSteps && (
                            <div className="min-h-4 w-0.5 flex-1 bg-default" />
                          )}
                        </div>
                        <div className={`flex-1 ${isActive ? 'pb-6' : 'pb-4'}`}>
                          {isActive && !isParasutLastStep ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                value={parasutForm[step.key]}
                                onChange={(value) =>
                                  setParasutForm((prev) => ({ ...prev, [step.key]: value }))
                                }
                                type={
                                  step.isPassword
                                    ? showVisible
                                      ? 'text'
                                      : 'password'
                                    : 'text'
                                }
                                autoFocus
                              >
                                <Label>{step.label}</Label>
                                {step.isPassword && setShow ? (
                                  <div className="relative w-full">
                                    <Input placeholder={step.placeholder} className="w-full pr-10" />
                                    <button
                                      type="button"
                                      onClick={() => setShow((v) => !v)}
                                      aria-label={showVisible ? 'Gizle' : 'Göster'}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                                    >
                                      {showVisible ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <Input placeholder={step.placeholder} />
                                )}
                              </TextField>
                              <p className="text-sm text-muted">{step.description}</p>
                              <Button onPress={handleParasutNext} fullWidth>
                                İleri
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isCompleted && setParasutCurrentStep(index)}
                              disabled={!isCompleted}
                              className={`w-full pt-1.5 text-left ${
                                isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                            >
                              <span className="text-sm text-muted">{step.label}</span>
                              {isCompleted && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {step.isPassword
                                    ? '•'.repeat(Math.min(showValue.length, 8))
                                    : showValue || '—'}
                                </p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isParasutLastStep
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-default text-muted'
                        }`}
                      >
                        {parasutTotalSteps + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      {isParasutLastStep ? (
                        <div className="flex flex-col gap-3">
                          <Label>Bağlantı Testi</Label>
                          <p className="text-sm text-muted">
                            Girdiğiniz bilgilerle Paraşüt OAuth bağlantısını test edip kaydedin.
                          </p>
                          <Button
                            onPress={handleParasutTest}
                            isDisabled={isTestingParasut}
                            isPending={isTestingParasut}
                            variant="outline"
                            fullWidth
                          >
                            {isTestingParasut ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Test ediliyor...
                              </>
                            ) : (
                              'Bağlantıyı Test Et'
                            )}
                          </Button>
                          {parasutTestResult && (
                            <Alert status={parasutTestResult.success ? 'success' : 'danger'}>
                              <Alert.Indicator />
                              <Alert.Content>
                                <Alert.Title>
                                  {parasutTestResult.success
                                    ? 'Bağlantı başarılı!'
                                    : parasutTestResult.error || 'Bağlantı başarısız'}
                                </Alert.Title>
                              </Alert.Content>
                            </Alert>
                          )}
                          <Button
                            onPress={handleParasutSave}
                            isDisabled={isSavingInvoice}
                            isPending={isSavingInvoice}
                            fullWidth
                          >
                            {isSavingInvoice ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Kaydediliyor...
                              </>
                            ) : (
                              'Bağla'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-1.5">
                          <span className="text-sm text-muted">Bağlantı Testi</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <a
                    href="https://apidocs.parasut.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  >
                    Dokümantasyon
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Paraşüt yönet modalı. */}
      <Modal
        isOpen={manageParasutId !== null}
        onOpenChange={(open) => !open && handleManageParasutClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Hesap Ayarları</Modal.Heading>
              </Modal.Header>
              <Modal.Body style={{ marginTop: 0 }}>
                <div className="flex flex-col gap-4">
                  {manageParasut && (
                    <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3">
                      <ParasutMark
                        className="h-10 w-10 shrink-0 rounded-xl"
                        role="img"
                        aria-label="Paraşüt"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium">
                          {manageParasut.label || 'Paraşüt'}
                        </p>
                        <p className="truncate text-xs text-muted">
                          Paraşüt • Şirket {manageParasut.config.parasutCompanyId || '—'}
                        </p>
                      </div>
                      <Switch
                        isSelected={manageParasutActive}
                        onChange={setManageParasutActive}
                        aria-label="Aktif"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onPress={handleManageParasutClose}
                      isDisabled={isManagingParasut}
                    >
                      İptal
                    </Button>
                    <Button
                      onPress={handleManageParasutSave}
                      isPending={isManagingParasut}
                      isDisabled={isManagingParasut}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Kargo (DHL/MNG) yönet modalı — şifre rotasyonu + müşteri no / kimlik
      türü güncellemesi için. Şifre alanı boş bırakılırsa mevcut şifre korunur;
      diğer alanlar değişirse backend mevcut şifreyle re-test eder. */}
      <Modal
        isOpen={manageCargoId !== null}
        onOpenChange={(open) => !open && handleManageCargoClose()}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Kargo Hesabı Ayarları</Modal.Heading>
              </Modal.Header>
              <Modal.Body style={{ marginTop: 0 }}>
                <div className="flex flex-col gap-4">
                  {manageCargo && (
                    <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.07)]">
                        <img
                          src="/figma/integrations/dhl.png"
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium">
                          {manageCargo.provider === 'MNG'
                            ? 'DHL'
                            : manageCargo.provider}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {manageCargo.customerNumber
                            ? `Müşteri No: ${manageCargo.customerNumber}`
                            : manageCargo.apiUsername || manageCargo.provider}
                        </p>
                      </div>
                      <Switch
                        isSelected={manageCargoActive}
                        onChange={setManageCargoActive}
                        aria-label="Aktif"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  )}

                  <TextField
                    value={manageCargoForm.customerNumber}
                    onChange={(v) =>
                      setManageCargoForm((p) => ({ ...p, customerNumber: v }))
                    }
                  >
                    <Label>Müşteri Numarası</Label>
                    <Input placeholder="DHL müşteri numaranız" />
                  </TextField>

                  <TextField
                    value={manageCargoForm.password}
                    onChange={(v) =>
                      setManageCargoForm((p) => ({ ...p, password: v }))
                    }
                    type={manageCargoShowPassword ? 'text' : 'password'}
                  >
                    <Label>Yeni Şifre (opsiyonel)</Label>
                    <div className="relative w-full">
                      <Input
                        placeholder="Değiştirmek istemiyorsanız boş bırakın"
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setManageCargoShowPassword((v) => !v)
                        }
                        aria-label={
                          manageCargoShowPassword
                            ? 'Şifreyi gizle'
                            : 'Şifreyi göster'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      >
                        {manageCargoShowPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </TextField>
                  <p className="text-xs text-muted">
                    Müşteri no veya kimlik tipi değişirse, mevcut şifreyle MNG
                    portal üzerinden tekrar test edilir. Hata alırsanız yeni
                    şifreyi de girin.
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="tertiary"
                      onPress={handleManageCargoDelete}
                      isDisabled={isManagingCargo}
                      className={`flex-1 text-danger ${pillBtnClass}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Bağlantıyı Sil
                    </Button>
                    <Button
                      className="flex-1"
                      onPress={handleManageCargoSave}
                      isPending={isManagingCargo}
                      isDisabled={isManagingCargo}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
