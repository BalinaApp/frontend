import { create } from 'zustand';
import { api } from '@/services/api';

export type FalImageModel =
  | 'fal-ai/nano-banana'
  | 'fal-ai/flux/dev'
  | 'fal-ai/flux/schnell'
  | 'fal-ai/flux-pro/v1.1';

export type FalVideoModel = 'fal-ai/kling-video/v2.1/master/text-to-video';

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
  createdAt: string;
  updatedAt: string;
}

/** UI'da gösterilen, kullanıcıya sunulacak model kataloğu. Her modelin
 * `kind` alanı bu modelin görsel mi video mu üreteceğini belirtir.
 * Liste Fal.ai'nin yaygın kullanılan endpoint'lerini kapsar — yeni eklenen
 * modeller buraya eklenmeli. */
export const FAL_MODEL_CATALOG: Array<{
  id: string;
  label: string;
  description: string;
  kind: FalGenerationKind;
  isDefault?: boolean;
}> = [
  // ===== Görsel modelleri =====
  {
    id: 'fal-ai/nano-banana',
    label: 'Nano Banana',
    description:
      'Google Nano Banana — varsayılan, hızlı, görsel-gönderimi destekler.',
    kind: 'image',
    isDefault: true,
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

  // ----- Virtual Try-On (giyim değişimi için optimize) -----
  {
    id: 'fal-ai/idm-vton',
    label: 'IDM-VTON (Virtual Try-On) ⭐',
    description:
      'Sanal kıyafet deneme — model üzerindeki kıyafeti birebir değiştirir, arka plan ve modeli korur. Giyim üretimi için ÖNERİLİR.',
    kind: 'image',
  },
  {
    id: 'fal-ai/cat-vton',
    label: 'CatVTON',
    description:
      'Hafif sanal try-on modeli — IDM-VTON alternatifi, daha hızlı.',
    kind: 'image',
  },
  {
    id: 'fal-ai/leffa',
    label: 'Leffa Virtual Try-On',
    description: 'Yeni nesil VTON — yüksek detay korur.',
    kind: 'image',
  },
  {
    id: 'fal-ai/kling/v1-5/kolors-virtual-try-on',
    label: 'Kolors Virtual Try-On (Kling)',
    description: 'Kuaishou Kolors VTON — yüksek kalite kıyafet swap.',
    kind: 'image',
  },

  // ===== Video modelleri =====
  {
    id: 'fal-ai/kling-video/v2.1/master/image-to-video',
    label: 'Kling 2.1 Master (Image-to-Video)',
    description: 'En yüksek kalite Kling — referans görselden video.',
    kind: 'video',
    isDefault: true,
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
  // Integrations
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

  // Actions
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

  /** Guided akış için Kling video üretimi. */
  generateVideoRaw: (
    companyId: string,
    args: {
      prompt: string;
      imageUrl?: string;
      model?: string;
      integrationId?: string;
    }
  ) => Promise<{ url: string; error?: string }>;

  resetChat: () => void;

  // Conversations
  fetchConversations: (companyId: string) => Promise<void>;
  loadConversation: (companyId: string, conversationId: string) => Promise<void>;
  deleteConversation: (companyId: string, conversationId: string) => Promise<void>;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useAiStore = create<AiState>((set, get) => ({
  fals: [],
  isLoadingFals: false,
  isSavingFal: false,
  selectedFalId: null,
  messages: [],
  currentConversationId: null,
  isGenerating: false,
  conversations: [],
  isLoadingConversations: false,

  fetchFalIntegrations: async (companyId) => {
    set({ isLoadingFals: true });
    try {
      const { data } = await api.get<FalIntegration[]>(
        `/company/${companyId}/ai/integrations/fal`
      );
      const list = data ?? [];
      const current = get().selectedFalId;
      const stillExists = current && list.some((i) => i.id === current);
      set({
        fals: list,
        selectedFalId: stillExists ? current : list.find((i) => i.isActive)?.id ?? null,
        isLoadingFals: false,
      });
    } catch {
      set({ fals: [], isLoadingFals: false });
    }
  },

  createFalIntegration: async (companyId, args) => {
    set({ isSavingFal: true });
    try {
      const { data } = await api.post<FalIntegration>(
        `/company/${companyId}/ai/integrations/fal`,
        args
      );
      set((state) => ({
        fals: [...state.fals, data],
        selectedFalId: state.selectedFalId ?? data.id,
        isSavingFal: false,
      }));
      return data;
    } catch {
      set({ isSavingFal: false });
      return null;
    }
  },

  updateFalIntegration: async (companyId, integrationId, args) => {
    set({ isSavingFal: true });
    try {
      const { data } = await api.patch<FalIntegration>(
        `/company/${companyId}/ai/integrations/fal/${integrationId}`,
        args
      );
      set((state) => ({
        fals: state.fals.map((f) => (f.id === integrationId ? data : f)),
        isSavingFal: false,
      }));
      return data;
    } catch {
      set({ isSavingFal: false });
      return null;
    }
  },

  removeFalIntegration: async (companyId, integrationId) => {
    await api.delete(`/company/${companyId}/ai/integrations/fal/${integrationId}`);
    set((state) => {
      const remaining = state.fals.filter((f) => f.id !== integrationId);
      return {
        fals: remaining,
        selectedFalId:
          state.selectedFalId === integrationId
            ? remaining.find((f) => f.isActive)?.id ?? null
            : state.selectedFalId,
      };
    });
  },

  testFalKey: async (companyId, apiKey) => {
    try {
      const { data } = await api.post<FalTestResult>(
        `/company/${companyId}/ai/integrations/fal/test`,
        { apiKey }
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

  testFalIntegration: async (companyId, integrationId) => {
    try {
      const { data } = await api.post<FalTestResult>(
        `/company/${companyId}/ai/integrations/fal/${integrationId}/test`
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

  setSelectedFalId: (id) => set({ selectedFalId: id }),

  generateImage: async (companyId, args) => {
    const { messages, selectedFalId, currentConversationId } = get();
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
        integrationId: args.integrationId ?? selectedFalId ?? undefined,
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
    const { selectedFalId } = get();
    try {
      const { data } = await api.post<{ images: AiGeneratedImage[] }>(
        `/company/${companyId}/ai/generate/image`,
        {
          prompt: args.prompt,
          model: args.model,
          imageSize: args.imageSize,
          numImages: 1,
          integrationId: args.integrationId ?? selectedFalId ?? undefined,
          imageUrls: args.imageUrls,
        },
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
    const { selectedFalId } = get();
    try {
      const { data } = await api.post<{ video: { url: string } }>(
        `/company/${companyId}/ai/generate/video`,
        {
          prompt: args.prompt,
          imageUrl: args.imageUrl,
          model: args.model,
          integrationId: args.integrationId ?? selectedFalId ?? undefined,
        },
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
