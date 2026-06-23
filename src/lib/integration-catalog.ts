/* Entegrasyon kataloğu — hem Entegrasyonlar listesi (stores/page.tsx) hem de
 * entegrasyon detay sayfası (stores/[integrationId]/page.tsx) tarafından
 * paylaşılan saf veri. Bağlama/yönetme mantığı liste sayfasında kalır. */

export type Marketplace = {
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
  /** Detay sayfası "Overview" metni (yoksa description kullanılır). */
  overview?: string;
};

export type IntegrationCategory = {
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

const etsy: Marketplace = {
  id: 'ETSY',
  name: 'Etsy',
  description: 'El yapımı ve vintage ürün pazaryeri.',
  logo: '/figma/integrations/etsy.svg',
  comingSoon: false,
  platform: 'ETSY',
  // One-click OAuth (PKCE): kullanıcı sadece isim girer, sonraki adım Etsy'ye
  // yönlendirip Approve almak. Token swap + mağaza kaydı callback'te otomatik.
  steps: [
    { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
  ],
  helpUrl: 'https://developers.etsy.com/documentation/',
};

export const integrationCategories: IntegrationCategory[] = [
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
        logo: '/figma/integrations/bizimhesap.svg',
        comingSoon: false,
        steps: [
          { key: 'name', label: 'Hesap Adı', placeholder: 'Bizim Hesap Hesabım', description: 'Bu bağlantıyı tanıyacağınız bir isim.' },
          { key: 'firmId', label: 'Firma ID', placeholder: 'Firma ID', description: 'Bizim Hesap firma (firm) ID bilginiz.' },
          { key: 'token', label: 'Token', placeholder: 'Bizim Hesap token', type: 'password', description: 'Bizim Hesap API token bilginizi girin.' },
        ],
      },
      {
        id: 'PARASUT',
        name: 'Paraşüt',
        description: 'Ön muhasebe ve e-fatura.',
        logo: '/figma/integrations/parasut.svg',
        comingSoon: false,
        steps: [
          { key: 'name', label: 'Hesap Adı', placeholder: 'Paraşüt Hesabım', description: 'Bu bağlantıyı tanıyacağınız bir isim.' },
          { key: 'parasutCompanyId', label: 'Şirket ID', placeholder: 'Paraşüt şirket ID', description: 'Paraşüt şirket (company) ID bilginiz.' },
          { key: 'clientId', label: 'Client ID', placeholder: 'Paraşüt Client ID', description: 'Paraşüt uygulama Client ID bilginiz.' },
          { key: 'clientSecret', label: 'Client Secret', placeholder: 'Paraşüt Client Secret', type: 'password', description: 'Paraşüt uygulama Client Secret bilginiz.' },
          { key: 'username', label: 'Kullanıcı Adı', placeholder: 'Paraşüt e-posta', description: 'Paraşüt hesabınızın e-posta adresi.' },
          { key: 'password', label: 'Şifre', placeholder: 'Paraşüt şifresi', type: 'password', description: 'Paraşüt hesabınızın şifresi.' },
        ],
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Kargolar',
    items: [
      {
        id: 'DHL',
        name: 'DHL',
        description: 'Uluslararası kargo gönderileri.',
        logo: '/figma/integrations/dhl.png',
        comingSoon: false,
        steps: [
          { key: 'customerNumber', label: 'Müşteri Numarası', placeholder: 'MNG müşteri numaranız', description: 'MNG portal müşteri numaranızı girin.' },
          { key: 'password', label: 'Şifre', placeholder: 'MNG portal şifresi', type: 'password', description: 'MNG portal şifrenizi girin.' },
        ],
      },
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
      { id: 'TIKTOK', name: 'TikTok', description: 'TikTok hesabınızı bağlayın, video paylaşın.', logo: '/figma/integrations/tiktok.svg', comingSoon: false },
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
        logo: '/figma/integrations/fal.svg',
        comingSoon: false,
        steps: [
          { key: 'name', label: 'Hesap Adı', placeholder: 'Hesabınızı tanıyacağınız ad', description: 'Bu hesabı tanıyacağınız bir isim girin (opsiyonel).' },
          { key: 'apiKey', label: 'API Anahtarı', placeholder: 'fal_...', type: 'password', description: 'Fal.ai panelinizden aldığınız API anahtarını girin.' },
        ],
        helpUrl: 'https://fal.ai/dashboard/keys',
      },
      {
        id: 'OPENAI',
        name: 'OpenAI',
        description: 'GPT modelleri ile ürün açıklaması ve sohbet üretimi.',
        logo: '/figma/integrations/openai.svg',
        comingSoon: false,
        steps: [
          { key: 'name', label: 'Hesap Adı', placeholder: 'Hesabınızı tanıyacağınız ad', description: 'Bu hesabı tanıyacağınız bir isim girin (opsiyonel).' },
          { key: 'apiKey', label: 'API Anahtarı', placeholder: 'sk-...', type: 'password', description: 'OpenAI panelinizden aldığınız API anahtarını girin.' },
        ],
        helpUrl: 'https://platform.openai.com/api-keys',
      },
    ],
  },
];

/** Düz liste — id ile arama için. */
export const allIntegrations: Marketplace[] = integrationCategories.flatMap(
  (c) => c.items,
);

export function findIntegration(id: string): Marketplace | undefined {
  return allIntegrations.find((m) => m.id === id);
}

/** Her entegrasyon için "Destek" YouTube videosu. Anahtar = integration id.
 *  TODO: linkler verildikçe doldur (örn. WORDPRESS: 'https://youtu.be/...'). */
export const SUPPORT_VIDEOS: Record<string, string> = {};
