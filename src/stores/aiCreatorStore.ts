import { create } from 'zustand';
import { api } from '@/services/api';
import type { ProductType } from './aiStore';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Guided AI üretim akışı için state machine.
 *
 * Akış (kullanıcı isteği):
 *   1. Kullanıcı tür seçer (ayarlardan tanımlı türler) → referans görseli otomatik gelir.
 *   2. Ürün görseli yükler.
 *   3. Backend Fal'a [referans, ürün] + tür-bazlı prompt yollar.
 *   4. Görsel kullanıcıya gösterilir → Beğen / Beğenme.
 *   5. Beğenmezse yorumla yeniden üret. Beğenirse video sorulur.
 *   6. Video isterse prompt alınır, gerekirse close-up görsel üretilir, Kling 3.0'a yollanır.
 *   7. Video kullanıcıya gösterilir → aynı beğeni/yorum loop'u.
 *   8. Beğenirse "siteye yükleyeyim mi?" → ürün adı/desc/sku/fiyat/stok/varyasyon toplanır → POST /products.
 *
 * Tüm görsel/video URL'leri Fal'dan döndüğü gibi kalıcı CDN URL'i olur — indir butonu doğrudan kullanır.
 */

export type GuidedStep =
  | 'type-selection'
  | 'awaiting-product-image'
  | 'generating-image'
  | 'image-ready'
  | 'awaiting-image-comment'
  | 'asking-video'
  | 'awaiting-video-prompt'
  | 'generating-video'
  | 'video-ready'
  | 'awaiting-video-comment'
  | 'asking-upload'
  | 'collecting-product-info'
  | 'uploading-product'
  | 'done';

/** Sohbet stream'inde her satır bir mesaj. UI mesajı `kind`'a göre render eder. */
export type GuidedMessage =
  | { id: string; kind: 'bot-text'; text: string }
  | { id: string; kind: 'user-text'; text: string }
  | { id: string; kind: 'bot-image'; url: string; caption?: string }
  | { id: string; kind: 'bot-video'; url: string; caption?: string }
  | { id: string; kind: 'user-image'; url: string }
  | { id: string; kind: 'type-picker'; resolvedTypeId?: string }
  | { id: string; kind: 'product-image-uploader'; resolved?: boolean }
  | { id: string; kind: 'image-feedback'; resolved?: 'liked' | 'disliked' }
  | { id: string; kind: 'comment-input'; placeholder: string; resolved?: string; target: 'image' | 'video' }
  | { id: string; kind: 'video-confirm'; resolved?: 'yes' | 'no' }
  | { id: string; kind: 'video-prompt-input'; resolved?: string }
  | { id: string; kind: 'video-feedback'; resolved?: 'liked' | 'disliked' }
  | { id: string; kind: 'upload-confirm'; resolved?: 'yes' | 'no' }
  | { id: string; kind: 'product-info-prompt'; field: ProductInfoField; resolved?: string }
  | { id: string; kind: 'pending'; label: string };

export type ProductInfoField =
  | 'name'
  | 'description'
  | 'sku'
  | 'price'
  | 'stockQuantity'
  | 'variations';

export interface ProductInfo {
  name: string;
  description: string;
  sku: string;
  price: number | null;
  stockQuantity: number | null;
  /** Basit varyasyonlar — "Renk: Bordo, Beden: M" gibi serbest metin parse edilir. */
  variations: Array<{ price?: number; stockQuantity?: number; attributes: Record<string, string> }>;
}

export const PRODUCT_INFO_ORDER: ProductInfoField[] = [
  'name',
  'description',
  'sku',
  'price',
  'stockQuantity',
  'variations',
];

export const PRODUCT_INFO_LABELS: Record<ProductInfoField, string> = {
  name: 'Ürün adı',
  description: 'Ürün açıklaması',
  sku: 'SKU kodu',
  price: 'Fiyat (TL)',
  stockQuantity: 'Stok adedi',
  variations: 'Varyasyonlar (örn. Renk: Bordo, Beden: M; Renk: Siyah, Beden: L)',
};

interface AiCreatorState {
  /** Aktif session id'si — start() ile her yeni sohbette yeniden üretilir.
   * History'de snapshot ararken bu id kullanılır. */
  sessionId: string | null;
  step: GuidedStep;
  messages: GuidedMessage[];
  selectedType: ProductType | null;
  productImageUrl: string | null;
  /** En son üretilen görsel — yeniden üretmede de bu güncellenir. */
  lastImageUrl: string | null;
  imageHistory: string[];
  closeupImageUrl: string | null;
  videoUrl: string | null;
  videoHistory: string[];
  productInfo: ProductInfo;
  currentInfoField: ProductInfoField | null;
  selectedStoreId: string | null;
  isBusy: boolean;

  // Actions
  reset: () => void;
  start: (firstBotMessage?: string) => void;
  pushBot: (text: string) => void;
  pushUser: (text: string) => void;
  setStep: (step: GuidedStep) => void;
  appendMessage: (message: GuidedMessage) => void;
  resolveMessage: (id: string, patch: Partial<GuidedMessage>) => void;
  selectType: (type: ProductType) => void;
  setProductImage: (url: string) => void;
  setGeneratedImage: (url: string) => void;
  setVideo: (url: string) => void;
  setSelectedStoreId: (id: string) => void;
  setProductInfoField: (field: ProductInfoField, value: string) => void;
}

const emptyProductInfo: ProductInfo = {
  name: '',
  description: '',
  sku: '',
  price: null,
  stockQuantity: null,
  variations: [],
};

const initialState: Omit<AiCreatorState,
  'reset' | 'start' | 'pushBot' | 'pushUser' | 'setStep' | 'appendMessage'
  | 'resolveMessage' | 'selectType' | 'setProductImage' | 'setGeneratedImage'
  | 'setVideo' | 'setSelectedStoreId' | 'setProductInfoField'
> = {
  sessionId: null,
  step: 'type-selection',
  messages: [],
  selectedType: null,
  productImageUrl: null,
  lastImageUrl: null,
  imageHistory: [],
  closeupImageUrl: null,
  videoUrl: null,
  videoHistory: [],
  productInfo: emptyProductInfo,
  currentInfoField: null,
  selectedStoreId: null,
  isBusy: false,
};

export const useAiCreatorStore = create<AiCreatorState>()((set) => ({
  ...initialState,

  reset: () => set({ ...initialState, productInfo: { ...emptyProductInfo, variations: [] } }),

  start: (firstBotMessage) => {
    const messages: GuidedMessage[] = [];
    if (firstBotMessage) {
      messages.push({ id: uid(), kind: 'bot-text', text: firstBotMessage });
    }
    messages.push({ id: uid(), kind: 'type-picker' });
    set({
      ...initialState,
      sessionId: uid(),
      productInfo: { ...emptyProductInfo, variations: [] },
      messages,
      step: 'type-selection',
    });
  },

  pushBot: (text) =>
    set((s) => ({ messages: [...s.messages, { id: uid(), kind: 'bot-text', text }] })),

  pushUser: (text) =>
    set((s) => ({ messages: [...s.messages, { id: uid(), kind: 'user-text', text }] })),

  setStep: (step) => set({ step }),

  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, { ...message, id: message.id || uid() }] })),

  resolveMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? ({ ...m, ...patch } as GuidedMessage) : m,
      ),
    })),

  selectType: (type) => set({ selectedType: type }),

  setProductImage: (url) => set({ productImageUrl: url }),

  setGeneratedImage: (url) =>
    set((s) => ({
      lastImageUrl: url,
      imageHistory: [...s.imageHistory, url],
    })),

  setVideo: (url) =>
    set((s) => ({
      videoUrl: url,
      videoHistory: [...s.videoHistory, url],
    })),

  setSelectedStoreId: (id) => set({ selectedStoreId: id }),

  setProductInfoField: (field, value) =>
    set((s) => {
      if (field === 'price' || field === 'stockQuantity') {
        const num = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
        return {
          productInfo: { ...s.productInfo, [field]: Number.isFinite(num) ? num : null },
        };
      }
      if (field === 'variations') {
        // "Renk: Bordo, Beden: M; Renk: Siyah, Beden: L" parse — virgül attr ayır, ; varyant ayır.
        const variations = value
          .split(';')
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => {
            const attrs: Record<string, string> = {};
            for (const part of v.split(',')) {
              const [k, ...rest] = part.split(':');
              if (k && rest.length) attrs[k.trim()] = rest.join(':').trim();
            }
            return { attributes: attrs };
          })
          .filter((v) => Object.keys(v.attributes).length > 0);
        return { productInfo: { ...s.productInfo, variations } };
      }
      return { productInfo: { ...s.productInfo, [field]: value } };
    }),
}));

/* ---------------- History store (persisted) ---------------- */

/** Geçmiş sohbet kaydı — history'de listelenir, tıklanınca aiCreatorStore'a
 *  geri yüklenir. */
export interface AiCreatorSessionSnapshot {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  state: {
    step: GuidedStep;
    messages: GuidedMessage[];
    selectedType: ProductType | null;
    productImageUrl: string | null;
    lastImageUrl: string | null;
    imageHistory: string[];
    closeupImageUrl: string | null;
    videoUrl: string | null;
    videoHistory: string[];
    productInfo: ProductInfo;
    currentInfoField: ProductInfoField | null;
    selectedStoreId: string | null;
  };
}

/** Listede gösterilen sohbet meta-verisi (state olmadan). */
export interface AiCreatorSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AiCreatorHistoryState {
  /** Backend'den çekilen meta listesi (sıralı). */
  sessions: AiCreatorSessionMeta[];
  isLoading: boolean;
  /** Şirket için listeyi yenile. */
  fetchSessions: (companyId: string) => Promise<void>;
  /** Bir snapshot'ı backend'e upsert et. id varsa update, yoksa create.
   * Dönen meta listeye eklenir/güncellenir. */
  saveSnapshot: (
    companyId: string,
    snap: AiCreatorSessionSnapshot,
  ) => Promise<AiCreatorSessionMeta | null>;
  /** Sohbeti backend'den ve listeden sil. */
  removeSession: (companyId: string, sessionId: string) => Promise<void>;
  /** Tek bir sohbeti tam state ile çek. */
  fetchSession: (
    companyId: string,
    sessionId: string,
  ) => Promise<AiCreatorSessionSnapshot | null>;
}

export const useAiCreatorHistoryStore = create<AiCreatorHistoryState>()((set) => ({
  sessions: [],
  isLoading: false,

  fetchSessions: async (companyId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<AiCreatorSessionMeta[]>(
        `/company/${companyId}/ai/creator-sessions`,
      );
      set({ sessions: data ?? [], isLoading: false });
    } catch {
      set({ sessions: [], isLoading: false });
    }
  },

  saveSnapshot: async (companyId, snap) => {
    try {
      const { data } = await api.post<AiCreatorSessionMeta>(
        `/company/${companyId}/ai/creator-sessions`,
        {
          id: snap.id,
          title: snap.title,
          state: snap.state,
        },
      );
      set((s) => {
        const idx = s.sessions.findIndex((x) => x.id === data.id);
        if (idx >= 0) {
          const next = [...s.sessions];
          next[idx] = data;
          // updatedAt değişti — başa al ki UI'da en üstte görünsün.
          next.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          return { sessions: next };
        }
        return { sessions: [data, ...s.sessions] };
      });
      return data;
    } catch (err) {
      console.error('[saveSnapshot] failed:', err);
      return null;
    }
  },

  removeSession: async (companyId, sessionId) => {
    try {
      await api.delete(`/company/${companyId}/ai/creator-sessions/${sessionId}`);
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== sessionId) }));
    } catch (err) {
      console.error('[removeSession] failed:', err);
    }
  },

  fetchSession: async (companyId, sessionId) => {
    try {
      const { data } = await api.get<{
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
        state: AiCreatorSessionSnapshot['state'];
      }>(`/company/${companyId}/ai/creator-sessions/${sessionId}`);
      return {
        id: data.id,
        title: data.title,
        createdAt: new Date(data.createdAt).getTime(),
        updatedAt: new Date(data.updatedAt).getTime(),
        state: data.state,
      };
    } catch (err) {
      console.error('[fetchSession] failed:', err);
      return null;
    }
  },
}));

/** History snapshot için title üret — son user mesajı veya selectedType.name. */
export function deriveSessionTitle(
  state: AiCreatorSessionSnapshot['state'],
): string {
  if (state.selectedType) return state.selectedType.name;
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (m.kind === 'user-text' && m.text.trim()) return m.text.slice(0, 60);
  }
  return 'Yeni sohbet';
}

/** aiCreatorStore'a snapshot'tan state'i geri yükle. */
export function restoreSession(snap: AiCreatorSessionSnapshot) {
  useAiCreatorStore.setState({
    sessionId: snap.id,
    ...snap.state,
    isBusy: false,
  });
}

/* ---------------- Helpers ---------------- */

/** Tür adına göre Fal'a verilecek prompt'u oluştur. Image 1 = referans (model),
 *  Image 2 = ürün. Hedef: modelin üstündeki kıyafeti BİRE BİR ürünle değiştirmek;
 *  arka plan, model, poz, ışık tamamen aynı kalmalı; ürünün her detayı korunmalı. */
export function buildImagePrompt(typeName: string, userComment?: string): string {
  const t = typeName.trim().toLowerCase();
  const lines: string[] = [
    // Görev tanımı en başta — model hangi görüntüye ne yapacağını net görsün.
    `TASK: Virtual try-on. Take IMAGE 1 (a fashion model) and replace ONLY the clothing on the model with the EXACT ${typeName} shown in IMAGE 2. Output a single photorealistic image.`,

    // IMAGE 1 — KORUNACAKLAR (sert dil)
    `FROM IMAGE 1 — KEEP IDENTICAL, DO NOT CHANGE:`,
    `- Background (wall texture, color, floor, lighting, shadows, ambient atmosphere — pixel-level identical)`,
    `- The model herself: face, hijab/headscarf, hair, hands, skin tone, jewelry, accessories not part of the outfit`,
    `- Camera angle, framing, crop, distance, perspective, focal length`,
    `- Pose, body posture, gesture, where hands are placed, head tilt`,
    `- Image resolution, sharpness, grain, color grading`,

    // IMAGE 2 — KORUNACAK ÜRÜN DETAYLARI (sert dil)
    `FROM IMAGE 2 — REPRODUCE THE ${typeName.toUpperCase()} EXACTLY, PIXEL-PERFECT:`,
    `- Exact color hue, saturation, sheen and gloss (do not lighten, darken or shift hue)`,
    `- Exact fabric type and texture (chiffon, satin, knit, denim, etc. — same surface behavior)`,
    `- Exact silhouette, length, fit, drape, volume`,
    `- Exact neckline, collar, sleeves, cuffs, waistline, hemline`,
    `- Every ruffle, pleat, gather, tier, layer, fold, ribbon, sash, belt, brooch, button, embroidery, embellishment, print, pattern — copy ALL of them, position-for-position`,
    `- Same number of layers/tiers as the source. Do not simplify or reduce detail.`,

    // Yasaklar
    `STRICTLY FORBIDDEN:`,
    `- Do not redesign, restyle, or simplify the ${typeName}`,
    `- Do not change the background or replace it with a studio backdrop`,
    `- Do not alter the model's face or pose`,
    `- Do not invent details that are not in IMAGE 2`,

    // Tamamlayıcı kıyafet — ürünün kendisi tam set değilse uyumlu parçalar
    `If the ${typeName} alone does not cover the full outfit (e.g., a sweater needs pants and shoes), add matching complementary items chosen to harmonize with the ${typeName}'s color and style. If the ${typeName} is a full-length garment (dress, gown, abaya), do not add extra layers.`,

    `Output: photorealistic, sharp, professional fashion photo. Same quality and style as IMAGE 1.`,
  ];

  if (userComment && userComment.trim()) {
    lines.push(`USER FEEDBACK to address in the regeneration: ${userComment.trim()}.`);
  }

  // Türe özgü ek ipuçları
  if (/(elbise|dress|gown|abaya|kaftan)/.test(t)) {
    lines.push(
      'This is a full-length garment — show the full silhouette from neckline to hem; do not crop legs.',
    );
  }
  if (/(kazak|sweater|knit|hırka|cardigan|tişört|tshirt|t-shirt|gömlek|shirt|bluz|blouse)/.test(t)) {
    lines.push(
      'Pair with well-fitted bottoms (color- and style-matched) and shoes; show full outfit.',
    );
  }
  if (/(pantolon|pants|trouser|jean|etek|skirt|şort|short)/.test(t)) {
    lines.push('Pair with a tasteful top and shoes that complement this bottom.');
  }
  if (/(ayakkab|shoe|sneaker|boot|topuk|heel)/.test(t)) {
    lines.push(
      'Include a stylish complete outfit (top + bottom) chosen to highlight the footwear; framing must show the shoes clearly.',
    );
  }

  return lines.join('\n');
}

/** Kullanıcının video prompt'unda close-up/yakın çekim isteyip istemediğini tespit et. */
export function shouldGenerateCloseup(prompt: string): boolean {
  return /(yakın|yakin|close[ -]?up|zoom|detay|makro|macro)/i.test(prompt);
}

export function buildVideoPrompt(userPrompt: string, typeName: string): string {
  return `Cinematic product video of a model wearing a ${typeName}. ${userPrompt.trim()}. Smooth camera motion, soft lighting, natural body movement, high fidelity, fashion editorial style.`;
}

export function buildCloseupPrompt(typeName: string, userPrompt: string): string {
  return `Close-up detail shot of the ${typeName} fabric and texture from the source image. Preserve exact colors and pattern. ${userPrompt.trim()}. Photorealistic, sharp focus, shallow depth of field.`;
}

/* ---------------- API helpers ---------------- */

export async function createProductFromGuidedSession(
  companyId: string,
  args: {
    storeId: string;
    name: string;
    description: string;
    sku: string;
    imageUrl: string;
    price: number;
    stockQuantity: number;
    stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
    productType?: 'simple' | 'variable';
    variations?: ProductInfo['variations'];
  },
): Promise<{ id: string } | null> {
  try {
    // Backend ürün oluşturma endpoint'i — frontend axios `api` instance'ı `/api`
    // base ile gelir. Mevcut endpoint: POST /api/v1/products (Swagger örneği).
    const { data } = await api.post(`/v1/products`, {
      storeId: args.storeId,
      name: args.name,
      description: args.description,
      sku: args.sku,
      imageUrl: args.imageUrl,
      productType: args.productType ?? (args.variations && args.variations.length ? 'variable' : 'simple'),
      price: args.price,
      stockQuantity: args.stockQuantity,
      stockStatus: args.stockStatus ?? (args.stockQuantity > 0 ? 'instock' : 'outofstock'),
      variations: args.variations ?? [],
    });
    return { id: (data?.id as string) ?? '' };
  } catch {
    return null;
  }
}
