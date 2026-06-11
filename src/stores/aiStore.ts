import { create } from 'zustand';
import { api } from '@/services/api';

export type FalImageModel =
  | 'fal-ai/nano-banana-2'
  | 'fal-ai/nano-banana-2/edit'
  | 'fal-ai/nano-banana'
  | 'fal-ai/nano-banana/edit'
  | 'fal-ai/kling/v1-5/kolors-virtual-try-on'
  | 'fal-ai/flux/dev'
  | 'fal-ai/flux/schnell'
  | 'fal-ai/flux-pro/v1.1';

export type FalVideoModel =
  | 'fal-ai/kling-video/v2.1/pro/image-to-video'
  | 'fal-ai/kling-video/v2.1/pro/text-to-video'
  | 'fal-ai/kling-video/v2.1/master/image-to-video'
  | 'fal-ai/kling-video/v2.1/master/text-to-video'
  | 'fal-ai/kling-video/v2.1/standard/image-to-video';

/** Görsel/video oluşturma modu. */
export type FalGenerationKind = 'image' | 'video';
export type FalImageSize =
  | 'square_hd'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'landscape_16_9';

export interface AiGeneratedImage {
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  prompt?: string;
  images?: AiGeneratedImage[];
  status: 'pending' | 'success' | 'error';
  error?: string;
  model?: string;
  imageSize?: FalImageSize;
  createdAt: number;
}

export interface ProductType {
  id: string;
  name: string;
  /** Referans görseli — Fal'a image-to-image çağrısında ilk görsel
   * olarak kullanılır. Data URL veya kalıcı CDN URL'i. */
  referenceImageUrl: string;
  /** Bu tür için özel prompt. Boş ise sistem varsayılanı kullanılır. */
  prompt?: string;
}

export interface FalIntegration {
  id: string;
  name: string;
  apiKeyTail: string | null;
  models: string[];
  productTypes: ProductType[];
  isActive: boolean;
  /** Üretilen görsellerin SKU prefix'i (örn 'KZ'). Chat'te kullanıcı kod
   *  girer; tam SKU `${codePrefix}-${productCode}` olur. */
  codePrefix?: string;
  /** ===== Video üretim varsayılanları (entegrasyon ayarından) ===== */
  /** Varsayılan video modeli (Fal id). Boşsa Kling 2.1 Standard I2V. */
  videoModel?: string;
  /** aspect_ratio: Kling '16:9'|'9:16'|'1:1' · Veo 'auto'|'16:9'|'9:16'. */
  videoAspectRatio?: string;
  /** Süre: Kling '5'|'10' · Veo '4s'|'6s'|'8s'. */
  videoDuration?: string;
  /** Çözünürlük (yalnızca Veo): '720p' | '1080p'. */
  videoResolution?: string;
  /** Ses üretimi (yalnızca Veo). */
  videoGenerateAudio?: boolean;
  /** ===== Görsel üretim varsayılanı ===== */
  /** Varsayılan görsel modeli (Fal id). Boşsa nano-banana-2. Çıktı her zaman 2K. */
  imageModel?: string;
  createdAt: string;
  updatedAt: string;
}

/** Multi-provider AI entegrasyonu — fal/openai ile ayrılır. */
export interface AiIntegration extends FalIntegration {
  provider: 'fal' | 'openai';
}

export type ModelProvider = 'fal' | 'openai';

export interface ModelCatalogEntry {
  id: string;
  label: string;
  description: string;
  kind: FalGenerationKind;
  provider: ModelProvider;
  isDefault?: boolean;
}

/** Provider'ı model id prefix'inden çıkar. OpenAI modelleri ayrı; geri kalan
 *  tüm görsel/video modelleri Fal üzerinden. (Fashn kaldırıldı.) */
export function getModelProvider(modelId: string): ModelProvider {
  return modelId.startsWith('openai') ? 'openai' : 'fal';
}

/** UI'da gösterilen, kullanıcıya sunulacak Fal.ai model kataloğu. Her modelin
 * `kind` alanı bu modelin görsel mi video mu üreteceğini belirtir.
 * Görsel sanal-deneme (VTON) Fal'in kolors-virtual-try-on modeliyle yapılır. */
export const FAL_MODEL_CATALOG: Array<Omit<ModelCatalogEntry, 'provider'>> = [
  // ===== Görsel modelleri =====
  {
    id: 'fal-ai/nano-banana-2',
    label: 'Nano Banana 2',
    description:
      'Google Nano Banana 2 — varsayılan, yüksek kalite, 14 referans görsele kadar.',
    kind: 'image',
    isDefault: true,
  },
  {
    id: 'fal-ai/nano-banana-2/edit',
    label: 'Nano Banana 2 — Edit',
    description:
      'Nano Banana 2 image-to-image; referans görsellerle düzenleme (14 görsele kadar).',
    kind: 'image',
  },
  {
    id: 'fal-ai/kling/v1-5/kolors-virtual-try-on',
    label: 'Kolors Virtual Try-On',
    description:
      'Fal sanal kıyafet deneme (VTON) — kişi + ürün görselinden yeni görsel.',
    kind: 'image',
  },
  {
    id: 'fal-ai/nano-banana',
    label: 'Nano Banana',
    description:
      'Google Nano Banana — önceki sürüm, hızlı, görsel-gönderimi destekler.',
    kind: 'image',
  },
  {
    id: 'fal-ai/nano-banana/edit',
    label: 'Nano Banana — Edit',
    description: 'Image-to-image varyantı; mevcut görseli düzenlemek için.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux/schnell',
    label: 'Flux Schnell',
    description: 'En hızlı Flux — çok düşük maliyet, hızlı denemeler için.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux/dev',
    label: 'Flux Dev',
    description: 'Dengeli kalite & hız.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux-pro/v1.1',
    label: 'Flux Pro v1.1',
    description: 'Yüksek kalite — ürün fotoğrafı için ideal.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux-pro/v1.1-ultra',
    label: 'Flux Pro v1.1 Ultra',
    description: 'En yüksek çözünürlük — premium kalite.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux-pro/kontext',
    label: 'Flux Pro Kontext',
    description: 'Bağlamsal düzenleme — referans korur.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux-pro/kontext/max',
    label: 'Flux Pro Kontext Max',
    description: 'Kontext en üst kalite varyantı.',
    kind: 'image',
  },
  {
    id: 'fal-ai/flux-realism',
    label: 'Flux Realism',
    description: 'Fotogerçekçi LoRA — realist render.',
    kind: 'image',
  },
  {
    id: 'fal-ai/ideogram/v3',
    label: 'Ideogram v3',
    description: 'Tipografi & metin yerleştirmede güçlü.',
    kind: 'image',
  },
  {
    id: 'fal-ai/ideogram/v2',
    label: 'Ideogram v2',
    description: 'Önceki Ideogram sürümü — uyumluluk için.',
    kind: 'image',
  },
  {
    id: 'fal-ai/recraft-v3',
    label: 'Recraft v3',
    description: 'Vector + raster, marka kimliğinde başarılı.',
    kind: 'image',
  },
  {
    id: 'fal-ai/imagen4',
    label: 'Imagen 4',
    description: 'Google Imagen 4 — yüksek kalite üretim.',
    kind: 'image',
  },
  {
    id: 'fal-ai/imagen3',
    label: 'Imagen 3',
    description: 'Google Imagen 3 — hızlı ve dengeli.',
    kind: 'image',
  },
  {
    id: 'fal-ai/luma-photon',
    label: 'Luma Photon',
    description: 'Sinematik görsel üretimi.',
    kind: 'image',
  },
  {
    id: 'fal-ai/stable-diffusion-v35-large',
    label: 'Stable Diffusion 3.5 Large',
    description: 'Açık kaynak — geniş uyumluluk.',
    kind: 'image',
  },
  {
    id: 'fal-ai/stable-diffusion-v3-medium',
    label: 'Stable Diffusion 3 Medium',
    description: 'SD3 orta boy — daha hızlı üretim.',
    kind: 'image',
  },
  {
    id: 'fal-ai/seedream/v4',
    label: 'Seedream v4',
    description: 'ByteDance Seedream — yaratıcı stil.',
    kind: 'image',
  },
  {
    id: 'fal-ai/seedream/v3/text-to-image',
    label: 'Seedream v3',
    description: 'Önceki Seedream sürümü.',
    kind: 'image',
  },
  {
    id: 'fal-ai/qwen-image',
    label: 'Qwen Image',
    description: 'Alibaba Qwen — Asya stilinde başarılı.',
    kind: 'image',
  },
  {
    id: 'fal-ai/hidream-i1-full',
    label: 'HiDream I1 Full',
    description: 'HiDream tam sürüm — yüksek detay.',
    kind: 'image',
  },
  {
    id: 'fal-ai/bria/text-to-image',
    label: 'Bria Text-to-Image',
    description: 'Bria 3.2 — ticari kullanım uyumlu.',
    kind: 'image',
  },
  {
    id: 'fal-ai/aura-flow',
    label: 'Aura Flow',
    description: 'Açık kaynak alternatif.',
    kind: 'image',
  },
  {
    id: 'fal-ai/playground-v25',
    label: 'Playground v2.5',
    description: 'Playground AI — sanatsal stil.',
    kind: 'image',
  },
  {
    id: 'fal-ai/dreamo',
    label: 'DreamO',
    description: 'Çoklu referans destekli kişiselleştirme.',
    kind: 'image',
  },

  // ===== Video modelleri =====
  {
    id: 'fal-ai/veo3.1/fast/image-to-video',
    label: 'Veo 3.1 Fast (Image-to-Video)',
    description: 'Google Veo 3.1 hızlı — referans görselden video.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v2.1/pro/image-to-video',
    label: 'Kling 2.1 Pro (Image-to-Video)',
    description:
      'Profesyonel kalite Kling I2V — varsayılan video modeli. Başlangıç + bitiş karesi.',
    kind: 'video',
    isDefault: true,
  },
  {
    id: 'fal-ai/kling-video/v2.1/pro/text-to-video',
    label: 'Kling 2.1 Pro (Text-to-Video)',
    description: 'Profesyonel kalite Kling — sadece prompt ile.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v2.1/master/image-to-video',
    label: 'Kling 2.1 Master (Image-to-Video)',
    description: 'En yüksek kalite Kling — referans görselden video.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v2.1/master/text-to-video',
    label: 'Kling 2.1 Master (Text-to-Video)',
    description: 'Kling master — sadece prompt ile.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    label: 'Kling 2.1 Standard (I2V)',
    description: 'Daha hızlı/ucuz Kling I2V.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v2.1/standard/text-to-video',
    label: 'Kling 2.1 Standard (T2V)',
    description: 'Daha hızlı/ucuz Kling T2V.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v2/master/image-to-video',
    label: 'Kling 2.0 Master (I2V)',
    description: 'Kling 2.0 master varyantı.',
    kind: 'video',
  },
  {
    id: 'fal-ai/kling-video/v1/standard',
    label: 'Kling 1.0 Standard',
    description: 'Kling 1.0 — uyumluluk için.',
    kind: 'video',
  },
  {
    id: 'fal-ai/veo3',
    label: 'Veo 3',
    description: 'Google Veo 3 — yüksek kalite + ses.',
    kind: 'video',
  },
  {
    id: 'fal-ai/veo3/fast',
    label: 'Veo 3 Fast',
    description: 'Veo 3 hızlı varyant.',
    kind: 'video',
  },
  {
    id: 'fal-ai/veo2',
    label: 'Veo 2',
    description: 'Google Veo 2.',
    kind: 'video',
  },
  {
    id: 'fal-ai/runway-gen3/turbo/image-to-video',
    label: 'Runway Gen-3 Turbo (I2V)',
    description: 'Runway Gen-3 — sinematik video.',
    kind: 'video',
  },
  {
    id: 'fal-ai/luma-dream-machine',
    label: 'Luma Dream Machine',
    description: 'Luma — yumuşak hareket.',
    kind: 'video',
  },
  {
    id: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
    label: 'Hailuo 02 Pro (I2V)',
    description: 'MiniMax Hailuo Pro — yüksek kalite.',
    kind: 'video',
  },
  {
    id: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
    label: 'Hailuo 02 Standard (I2V)',
    description: 'MiniMax Hailuo Standard.',
    kind: 'video',
  },
  {
    id: 'fal-ai/minimax/video-01-live',
    label: 'MiniMax Video-01 Live',
    description: 'Canlı yayın stili video.',
    kind: 'video',
  },
  {
    id: 'fal-ai/wan-2.5/text-to-video',
    label: 'Wan 2.5',
    description: 'Wan 2.5 — Asya stilinde başarılı.',
    kind: 'video',
  },
  {
    id: 'fal-ai/wan-i2v',
    label: 'Wan I2V',
    description: 'Wan image-to-video.',
    kind: 'video',
  },
  {
    id: 'fal-ai/seedance/v1/lite/text-to-video',
    label: 'Seedance v1 Lite',
    description: 'ByteDance Seedance — hızlı.',
    kind: 'video',
  },
  {
    id: 'fal-ai/pixverse/v4.5/text-to-video',
    label: 'Pixverse v4.5',
    description: 'Pixverse v4.5 — yaratıcı efektler.',
    kind: 'video',
  },
  {
    id: 'fal-ai/pixverse/v3.5',
    label: 'Pixverse v3.5',
    description: 'Pixverse önceki sürümü.',
    kind: 'video',
  },
  {
    id: 'fal-ai/cogvideox-5b',
    label: 'CogVideoX 5B',
    description: 'Açık kaynak — düşük maliyet.',
    kind: 'video',
  },
  {
    id: 'fal-ai/mochi-v1',
    label: 'Mochi v1',
    description: 'Mochi açık kaynak video.',
    kind: 'video',
  },
];

/** Tüm provider'lardan birleşik katalog — composer ve mode chip filter'ı
 *  buradan üretilir. (Görsel + video tamamı Fal üzerinden.) */
export const MODEL_CATALOG: ModelCatalogEntry[] = [
  ...FAL_MODEL_CATALOG.map((m) => ({ ...m, provider: 'fal' as ModelProvider })),
];

export const DEFAULT_IMAGE_MODEL = FAL_MODEL_CATALOG.find(
  (m) => m.kind === 'image' && m.isDefault,
)?.id as FalImageModel;

export const DEFAULT_VIDEO_MODEL = FAL_MODEL_CATALOG.find(
  (m) => m.kind === 'video' && m.isDefault,
)?.id as FalVideoModel;

export interface FalTestResult {
  ok: boolean;
  error?: string;
}

/** Backend'de tutulan sohbet listesi öğesi (özet). */
export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface AiState {
  // Integrations (multi-provider)
  integrations: AiIntegration[];
  isLoadingIntegrations: boolean;
  isSavingIntegration: boolean;
  /** Görsel üretiminde kullanılacak entegrasyon (Fal). */
  selectedImageIntegrationId: string | null;
  /** Video üretiminde kullanılacak entegrasyon (sadece fal). */
  selectedVideoIntegrationId: string | null;
  /** Setup modal'dan seçilen aktif görsel ve video modeli (catalog id'leri).
   *  Boş ise integration.models[0] veya provider varsayılanı kullanılır. */
  selectedImageModelId: string | null;
  selectedVideoModelId: string | null;

  // Legacy aliases — FAL-only, yeni multi-provider state'inden türetilir.
  fals: FalIntegration[];
  isLoadingFals: boolean;
  isSavingFal: boolean;
  selectedFalId: string | null;

  // Aktif sohbet — view'da gösterilen mesajlar.
  messages: AiChatMessage[];
  currentConversationId: string | null;
  isGenerating: boolean;

  // Geçmiş — backend'den çekilir.
  conversations: AiConversation[];
  isLoadingConversations: boolean;

  // Actions — generic (multi-provider)
  fetchIntegrations: (companyId: string) => Promise<void>;
  createIntegration: (
    companyId: string,
    provider: 'fal' | 'openai',
    args: { name?: string; apiKey: string }
  ) => Promise<AiIntegration | null>;
  updateIntegration: (
    companyId: string,
    integrationId: string,
    args: {
      name?: string;
      apiKey?: string;
      models?: string[];
      isActive?: boolean;
      productTypes?: ProductType[];
      codePrefix?: string;
      videoModel?: string;
      videoAspectRatio?: string;
      videoDuration?: string;
      videoResolution?: string;
      videoGenerateAudio?: boolean;
      imageModel?: string;
    }
  ) => Promise<AiIntegration | null>;
  removeIntegration: (companyId: string, integrationId: string) => Promise<void>;
  testApiKey: (
    companyId: string,
    provider: 'fal' | 'openai',
    apiKey: string,
  ) => Promise<FalTestResult>;
  testIntegration: (companyId: string, integrationId: string) => Promise<FalTestResult>;
  setSelectedImageIntegrationId: (id: string | null) => void;
  setSelectedVideoIntegrationId: (id: string | null) => void;
  setSelectedImageModelId: (id: string | null) => void;
  setSelectedVideoModelId: (id: string | null) => void;

  // Legacy aliases (FAL-only sarmaçlar)
  fetchFalIntegrations: (companyId: string) => Promise<void>;
  createFalIntegration: (
    companyId: string,
    args: { name?: string; apiKey: string }
  ) => Promise<FalIntegration | null>;
  updateFalIntegration: (
    companyId: string,
    integrationId: string,
    args: {
      name?: string;
      apiKey?: string;
      models?: string[];
      isActive?: boolean;
      productTypes?: ProductType[];
      codePrefix?: string;
      videoModel?: string;
      videoAspectRatio?: string;
      videoDuration?: string;
      videoResolution?: string;
      videoGenerateAudio?: boolean;
      imageModel?: string;
    }
  ) => Promise<FalIntegration | null>;
  removeFalIntegration: (companyId: string, integrationId: string) => Promise<void>;

  testFalKey: (companyId: string, apiKey: string) => Promise<FalTestResult>;
  testFalIntegration: (companyId: string, integrationId: string) => Promise<FalTestResult>;

  setSelectedFalId: (id: string | null) => void;

  generateImage: (
    companyId: string,
    args: {
      prompt: string;
      model?: string;
      imageSize?: FalImageSize;
      numImages?: number;
      integrationId?: string;
      imageUrls?: string[];
    }
  ) => Promise<void>;

  /** Guided akış için raw image generation — store mesajına yazmaz, sadece sonuç döner.
   *  Başarısızlık durumunda url='' döner ve `error` alanı doldurulur. */
  generateImageRaw: (
    companyId: string,
    args: {
      prompt: string;
      model?: string;
      imageSize?: FalImageSize;
      integrationId?: string;
      imageUrls?: string[];
    }
  ) => Promise<{ url: string; error?: string }>;

  /** Guided akış için Kling video üretimi.
   *  - `imageUrl`     → start frame (1. üretilen görsel)
   *  - `middleImageUrl` → orta frame (2. üretilen — yakın çekim)
   *  - `endImageUrl`  → end frame (3. üretilen — uzak çekim) */
  generateVideoRaw: (
    companyId: string,
    args: {
      prompt: string;
      imageUrl?: string;
      middleImageUrl?: string;
      endImageUrl?: string;
      model?: string;
      integrationId?: string;
    }
  ) => Promise<{ url: string; error?: string }>;

  /** OpenAI chat completions — metin üretici (açıklama, sohbet vs.). */
  generateText: (
    companyId: string,
    args: {
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>;
      model?: string;
      temperature?: number;
      integrationId?: string;
    }
  ) => Promise<{ text: string; error?: string }>;

  resetChat: () => void;

  // Conversations
  fetchConversations: (companyId: string) => Promise<void>;
  loadConversation: (companyId: string, conversationId: string) => Promise<void>;
  deleteConversation: (companyId: string, conversationId: string) => Promise<void>;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// LocalStorage anahtarları — entegrasyon seçimleri sayfa yenilemelerinde
// kaybolmasın. Kullanıcı zaten chat ilk açılışta seçtiği için ayrı persist
// (Zustand persist middleware'i değil, manuel hydrate) yeterli.
const SELECTED_IMAGE_KEY = 'ai-selected-image-integration';
const SELECTED_VIDEO_KEY = 'ai-selected-video-integration';
const SELECTED_IMAGE_MODEL_KEY = 'ai-selected-image-model';
const SELECTED_VIDEO_MODEL_KEY = 'ai-selected-video-model';

function readSelection(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}
function writeSelection(key: string, id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** localStorage'dan model id okur ama mevcut katalogda yoksa yok sayar (ve
 *  temizler). Eski/kaldırılmış modeller (ör. `fashn-ai/tryon-max`) kalıcı
 *  seçim olarak üretime gitmesin — yoksa Fal "Application not found" döner. */
function readModelSelection(key: string): string | null {
  const id = readSelection(key);
  if (id && MODEL_CATALOG.some((m) => m.id === id)) return id;
  if (id) writeSelection(key, null);
  return null;
}

function falsOnly(list: AiIntegration[]): FalIntegration[] {
  // FalIntegration ile AiIntegration aynı shape — provider field'ı sade
  // structural type için artık fazlalık. Strip etmeden döndürmek güvenli.
  return list.filter((i) => i.provider === 'fal');
}

export const useAiStore = create<AiState>((set, get) => ({
  integrations: [],
  isLoadingIntegrations: false,
  isSavingIntegration: false,
  selectedImageIntegrationId: readSelection(SELECTED_IMAGE_KEY),
  selectedVideoIntegrationId: readSelection(SELECTED_VIDEO_KEY),
  selectedImageModelId: readModelSelection(SELECTED_IMAGE_MODEL_KEY),
  selectedVideoModelId: readModelSelection(SELECTED_VIDEO_MODEL_KEY),

  fals: [],
  isLoadingFals: false,
  isSavingFal: false,
  selectedFalId: null,

  messages: [],
  currentConversationId: null,
  isGenerating: false,
  conversations: [],
  isLoadingConversations: false,

  // ----- Generic (multi-provider) integration actions -----

  fetchIntegrations: async (companyId) => {
    set({ isLoadingIntegrations: true, isLoadingFals: true });
    try {
      const { data } = await api.get<AiIntegration[]>(
        `/company/${companyId}/ai/integrations`,
      );
      const list = (data ?? []).map((i) => ({
        ...i,
        // Backend tarafı enum'u büyük harf gönderebilir; normalize et.
        provider: (String(i.provider || 'fal').toLowerCase() as 'fal' | 'openai'),
      }));
      const fals = falsOnly(list);

      // Seçim cleanup — silinmiş entegrasyonu seçili bırakma.
      // ÖNEMLİ: Auto-fallback YOK. Kullanıcı setup modal'da explicit seçim
      // yapana kadar null kalır; null olunca modal açılır.
      const currentImage = get().selectedImageIntegrationId;
      const currentVideo = get().selectedVideoIntegrationId;
      const currentFal = get().selectedFalId;

      const imageStillValid =
        currentImage && list.some((i) => i.id === currentImage && i.isActive);
      const videoStillValid =
        currentVideo &&
        list.some((i) => i.id === currentVideo && i.provider === 'fal' && i.isActive);
      const falStillValid = currentFal && fals.some((i) => i.id === currentFal && i.isActive);

      const nextImage = imageStillValid ? currentImage : null;
      const nextVideo = videoStillValid ? currentVideo : null;
      const nextFal = falStillValid ? currentFal : nextVideo;

      writeSelection(SELECTED_IMAGE_KEY, nextImage);
      writeSelection(SELECTED_VIDEO_KEY, nextVideo);

      set({
        integrations: list,
        fals,
        selectedImageIntegrationId: nextImage,
        selectedVideoIntegrationId: nextVideo,
        selectedFalId: nextFal,
        isLoadingIntegrations: false,
        isLoadingFals: false,
      });
    } catch {
      set({
        integrations: [],
        fals: [],
        isLoadingIntegrations: false,
        isLoadingFals: false,
      });
    }
  },

  createIntegration: async (companyId, provider, args) => {
    set({ isSavingIntegration: true, isSavingFal: true });
    try {
      const { data } = await api.post<AiIntegration>(
        `/company/${companyId}/ai/integrations`,
        { provider, ...args },
      );
      const normalized: AiIntegration = {
        ...data,
        provider: (String(data.provider || provider).toLowerCase() as 'fal' | 'openai'),
      };
      set((state) => {
        const integrations = [...state.integrations, normalized];
        return {
          integrations,
          fals: falsOnly(integrations),
          isSavingIntegration: false,
          isSavingFal: false,
        };
      });
      return normalized;
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: unknown } };
        message?: string;
      };
      // Backend hatasını console + state'e koy, çağıran toast.danger ile gösterebilir.
      const raw = e.response?.data?.message ?? e.message ?? 'Anahtar kaydedilemedi';
      const msg =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw.map(String).join(', ')
            : 'Anahtar kaydedilemedi';
      console.error('[createIntegration] failed', e.response?.status, msg, err);
      // Globally publish via toast so the user sees the real reason.
      try {
        const { toast } = await import('@/components/ui/toast');
        toast.danger(msg);
      } catch {
        /* ignore */
      }
      set({ isSavingIntegration: false, isSavingFal: false });
      return null;
    }
  },

  updateIntegration: async (companyId, integrationId, args) => {
    set({ isSavingIntegration: true, isSavingFal: true });
    try {
      const { data } = await api.patch<AiIntegration>(
        `/company/${companyId}/ai/integrations/${integrationId}`,
        args,
      );
      const normalized: AiIntegration = {
        ...data,
        provider: (String(data.provider || 'fal').toLowerCase() as 'fal' | 'openai'),
      };
      set((state) => {
        const integrations = state.integrations.map((i) =>
          i.id === integrationId ? normalized : i,
        );
        return {
          integrations,
          fals: falsOnly(integrations),
          isSavingIntegration: false,
          isSavingFal: false,
        };
      });
      return normalized;
    } catch {
      set({ isSavingIntegration: false, isSavingFal: false });
      return null;
    }
  },

  removeIntegration: async (companyId, integrationId) => {
    await api.delete(`/company/${companyId}/ai/integrations/${integrationId}`);
    set((state) => {
      const integrations = state.integrations.filter((i) => i.id !== integrationId);
      const fals = falsOnly(integrations);
      const fixSelection = (sel: string | null) =>
        sel === integrationId ? null : sel;
      const nextImage = fixSelection(state.selectedImageIntegrationId);
      const nextVideo = fixSelection(state.selectedVideoIntegrationId);
      writeSelection(SELECTED_IMAGE_KEY, nextImage);
      writeSelection(SELECTED_VIDEO_KEY, nextVideo);
      return {
        integrations,
        fals,
        selectedImageIntegrationId: nextImage,
        selectedVideoIntegrationId: nextVideo,
        selectedFalId: fixSelection(state.selectedFalId),
      };
    });
  },

  testApiKey: async (companyId, provider, apiKey) => {
    try {
      const { data } = await api.post<FalTestResult>(
        `/company/${companyId}/ai/integrations/test`,
        { provider, apiKey },
      );
      return data;
    } catch (err) {
      const error =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        'Test başarısız';
      return { ok: false, error };
    }
  },

  testIntegration: async (companyId, integrationId) => {
    try {
      const { data } = await api.post<FalTestResult>(
        `/company/${companyId}/ai/integrations/${integrationId}/test`,
      );
      return data;
    } catch (err) {
      const error =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        'Test başarısız';
      return { ok: false, error };
    }
  },

  setSelectedImageIntegrationId: (id) => {
    writeSelection(SELECTED_IMAGE_KEY, id);
    set({ selectedImageIntegrationId: id });
  },

  setSelectedVideoIntegrationId: (id) => {
    writeSelection(SELECTED_VIDEO_KEY, id);
    set({ selectedVideoIntegrationId: id, selectedFalId: id });
  },

  setSelectedImageModelId: (id) => {
    writeSelection(SELECTED_IMAGE_MODEL_KEY, id);
    set({ selectedImageModelId: id });
  },

  setSelectedVideoModelId: (id) => {
    writeSelection(SELECTED_VIDEO_MODEL_KEY, id);
    set({ selectedVideoModelId: id });
  },

  // ----- Legacy Fal-specific aliases (sarmaçlar) -----

  fetchFalIntegrations: async (companyId) => {
    await get().fetchIntegrations(companyId);
  },

  createFalIntegration: async (companyId, args) => {
    return get().createIntegration(companyId, 'fal', args);
  },

  updateFalIntegration: async (companyId, integrationId, args) => {
    return get().updateIntegration(companyId, integrationId, args);
  },

  removeFalIntegration: async (companyId, integrationId) => {
    return get().removeIntegration(companyId, integrationId);
  },

  testFalKey: async (companyId, apiKey) => {
    return get().testApiKey(companyId, 'fal', apiKey);
  },

  testFalIntegration: async (companyId, integrationId) => {
    return get().testIntegration(companyId, integrationId);
  },

  setSelectedFalId: (id) => {
    // Legacy yol — video integration olarak ayarla (eski composer'da Fal
    // hesabı seçildiğinde video bunu kullanıyordu).
    writeSelection(SELECTED_VIDEO_KEY, id);
    set({ selectedFalId: id, selectedVideoIntegrationId: id });
  },

  generateImage: async (companyId, args) => {
    const {
      messages,
      selectedImageIntegrationId,
      selectedFalId,
      currentConversationId,
    } = get();
    const integrationId =
      args.integrationId ?? selectedImageIntegrationId ?? selectedFalId ?? undefined;
    const userMsg: AiChatMessage = {
      id: uid(),
      role: 'user',
      prompt: args.prompt,
      status: 'success',
      model: args.model,
      imageSize: args.imageSize,
      createdAt: Date.now(),
    };
    const pendingMsg: AiChatMessage = {
      id: uid(),
      role: 'assistant',
      status: 'pending',
      model: args.model,
      imageSize: args.imageSize,
      createdAt: Date.now(),
    };
    set({ messages: [...messages, userMsg, pendingMsg], isGenerating: true });

    // Conversation yoksa otomatik oluştur (ilk prompt'a göre başlık).
    let conversationId = currentConversationId;
    if (!conversationId) {
      try {
        const { data: conv } = await api.post<AiConversation>(
          `/company/${companyId}/ai/conversations`,
          { title: args.prompt.slice(0, 60) }
        );
        conversationId = conv.id;
        set({ currentConversationId: conv.id });
      } catch {
        // Conversation oluşturulamazsa generation'ı yine de yapalım,
        // backend'e kaydedemeyiz ama kullanıcıya görsel döner.
      }
    }

    // User mesajını backend'e kaydet.
    if (conversationId) {
      api
        .post(`/company/${companyId}/ai/conversations/${conversationId}/messages`, {
          role: 'user',
          status: 'success',
          prompt: args.prompt,
          model: args.model,
          imageSize: args.imageSize,
        })
        .catch(() => {
          /* sessizce yut — generation'ı bloklamasın */
        });
    }

    try {
      const { data } = await api.post<{
        images: AiGeneratedImage[];
        model: string;
        seed: number | null;
      }>(`/company/${companyId}/ai/generate/image`, {
        prompt: args.prompt,
        model: args.model,
        imageSize: args.imageSize,
        numImages: args.numImages ?? 1,
        integrationId,
        imageUrls: args.imageUrls,
      });
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === pendingMsg.id ? { ...m, status: 'success', images: data.images } : m
        ),
        isGenerating: false,
      }));
      // Assistant mesajını backend'e kaydet.
      if (conversationId) {
        api
          .post(`/company/${companyId}/ai/conversations/${conversationId}/messages`, {
            role: 'assistant',
            status: 'success',
            images: data.images,
            model: args.model,
            imageSize: args.imageSize,
          })
          .catch(() => {});
        // Conversation listesini yenile ki updatedAt yeni gelsin.
        get().fetchConversations(companyId);
      }
    } catch (err: unknown) {
      const error =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        'Üretim başarısız';
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === pendingMsg.id ? { ...m, status: 'error', error } : m
        ),
        isGenerating: false,
      }));
      // Hata mesajını da kaydet.
      if (conversationId) {
        api
          .post(`/company/${companyId}/ai/conversations/${conversationId}/messages`, {
            role: 'assistant',
            status: 'error',
            errorMessage: error,
            model: args.model,
            imageSize: args.imageSize,
          })
          .catch(() => {});
      }
    }
  },

  generateImageRaw: async (companyId, args) => {
    const { selectedImageIntegrationId, selectedFalId } = get();
    try {
      const { data } = await api.post<{ images: AiGeneratedImage[] }>(
        `/company/${companyId}/ai/generate/image`,
        {
          prompt: args.prompt,
          model: args.model,
          imageSize: args.imageSize,
          numImages: 1,
          integrationId:
            args.integrationId ?? selectedImageIntegrationId ?? selectedFalId ?? undefined,
          imageUrls: args.imageUrls,
        },
        // Backend Fal queue'yu 3dk'ya kadar yoklayabiliyor; isteği son anda
        // kesmemek için 10sn tampon.
        { timeout: 190_000 },
      );
      const url = data.images?.[0]?.url;
      return url ? { url } : { url: '', error: 'Backend görsel döndürmedi' };
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string | string[] } };
        message?: string;
      };
      const msg =
        (Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message) ||
        e?.message ||
        'Bilinmeyen hata';
      console.error('[generateImageRaw] failed:', e?.response?.status, msg, err);
      return { url: '', error: msg };
    }
  },

  generateVideoRaw: async (companyId, args) => {
    const { selectedVideoIntegrationId, selectedFalId } = get();
    try {
      const { data } = await api.post<{ video: { url: string } }>(
        `/company/${companyId}/ai/generate/video`,
        {
          prompt: args.prompt,
          imageUrl: args.imageUrl,
          middleImageUrl: args.middleImageUrl,
          endImageUrl: args.endImageUrl,
          model: args.model,
          integrationId:
            args.integrationId ?? selectedVideoIntegrationId ?? selectedFalId ?? undefined,
        },
        // Kling Master 10sn videolar 5-8 dk sürebiliyor. Backend axios 10 dk,
        // HTTP server 12 dk; frontend 11 dk veriyoruz (backend'den biraz kısa,
        // ki backend hata mesajı dönmeden frontend timeout etmesin).
        { timeout: 11 * 60_000 },
      );
      return data.video?.url
        ? { url: data.video.url }
        : { url: '', error: 'Backend video döndürmedi' };
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string | string[] } };
        message?: string;
      };
      const msg =
        (Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message) ||
        e?.message ||
        'Bilinmeyen hata';
      console.error('[generateVideoRaw] failed:', e?.response?.status, msg, err);
      return { url: '', error: msg };
    }
  },

  generateText: async (companyId, args) => {
    try {
      const { data } = await api.post<{ text: string }>(
        `/company/${companyId}/ai/generate/text`,
        {
          messages: args.messages,
          model: args.model,
          temperature: args.temperature,
          integrationId: args.integrationId,
        },
        { timeout: 60_000 },
      );
      return data.text
        ? { text: data.text }
        : { text: '', error: 'Backend boş yanıt döndürdü' };
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string | string[] } };
        message?: string;
      };
      const msg =
        (Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message) ||
        e?.message ||
        'Bilinmeyen hata';
      console.error('[generateText] failed:', e?.response?.status, msg, err);
      return { text: '', error: msg };
    }
  },

  resetChat: () => set({ messages: [], currentConversationId: null }),

  fetchConversations: async (companyId) => {
    set({ isLoadingConversations: true });
    try {
      const { data } = await api.get<AiConversation[]>(
        `/company/${companyId}/ai/conversations`
      );
      set({ conversations: data ?? [], isLoadingConversations: false });
    } catch {
      set({ conversations: [], isLoadingConversations: false });
    }
  },

  loadConversation: async (companyId, conversationId) => {
    try {
      const { data } = await api.get<{
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        messages: Array<{
          id: string;
          role: 'user' | 'assistant' | 'system';
          status: 'pending' | 'success' | 'error';
          prompt: string | null;
          images: AiGeneratedImage[] | null;
          errorMessage: string | null;
          model: string | null;
          imageSize: string | null;
          createdAt: string;
        }>;
      }>(`/company/${companyId}/ai/conversations/${conversationId}`);

      const msgs: AiChatMessage[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        prompt: m.prompt ?? undefined,
        images: m.images ?? undefined,
        error: m.errorMessage ?? undefined,
        model: m.model ?? undefined,
        imageSize: (m.imageSize as FalImageSize | null) ?? undefined,
        createdAt: new Date(m.createdAt).getTime(),
      }));
      set({ messages: msgs, currentConversationId: data.id });
    } catch {
      // sessizce yut — UI bilgilendirsin
    }
  },

  deleteConversation: async (companyId, conversationId) => {
    try {
      await api.delete(`/company/${companyId}/ai/conversations/${conversationId}`);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        // Şu an açık olan oturumu sildiyse view'ı da temizle.
        ...(state.currentConversationId === conversationId
          ? { messages: [], currentConversationId: null }
          : {}),
      }));
    } catch {
      // sessizce yut
    }
  },
}));
