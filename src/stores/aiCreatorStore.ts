import { create } from 'zustand';
import { api } from '@/services/api';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Serbest-form AI sohbet state'i. Eski state machine (tür seç → yükle → üret …)
 * kaldırıldı; artık ChatGPT/Claude tarzı bir mesaj akışı:
 *   - Kullanıcı composer'a metin yazar, görsel ekler ve "mode" (image/video) seçer
 *   - Send → backend görsel veya video üretir, bot mesajı olarak görünür
 *   - Kullanıcı isterse mesaja devam eder (yeni prompt + ekler)
 *
 * SKU overlay: kullanıcı composer'da bir "kod" alanı doldurursa üretilen
 * medyanın sağ-altına basılır. Kod boşsa overlay yok.
 */

export type ChatMode = 'auto' | 'image' | 'video';

/** Sohbet stream mesajları. */
export type GuidedMessage =
  | { id: string; kind: 'bot-text'; text: string }
  | { id: string; kind: 'user-text'; text: string }
  | {
      id: string;
      kind: 'bot-image';
      url: string;
      caption?: string;
      sku?: string;
      /** SKU canvas ile URL'e gömüldü mü? true ise UI ek CSS overlay basmaz. */
      skuEmbedded?: boolean;
      /** Mesaj card'ının metadata satırında relative tarih için stamp. */
      createdAt?: number;
    }
  | {
      id: string;
      kind: 'bot-video';
      url: string;
      caption?: string;
      sku?: string;
      /** SKU ffmpeg drawtext ile mp4'e gömüldü mü? true ise UI ek CSS overlay basmaz. */
      skuEmbedded?: boolean;
      createdAt?: number;
    }
  | {
      id: string;
      kind: 'user-image';
      url: string;
      createdAt?: number;
      /** Composer'a 2 görsel eklendiyse ilk = "model", ikinci = "urun".
       *  Tek görsel ise "gorsel". Card filename'inde gösterilir. */
      name?: string;
      /** Yüklenen dosyanın gerçek uzantısı (data URL MIME'inden çıkarılır). */
      ext?: string;
    }
  | { id: string; kind: 'pending'; label: string; mode?: ChatMode };

interface AiCreatorState {
  /** Aktif session id'si — saveSnapshot için. */
  sessionId: string | null;
  messages: GuidedMessage[];

  /** Aktif mod — composer dropdown'undan seçilir. Default 'auto':
   *  attached görsel sayısına göre otomatik image/video kararı verilir. */
  mode: ChatMode;
  /** Composer'a iliştirilmiş görseller (data URL). En çok 2: model + garment. */
  attachedImages: string[];
  /** Bu mesaj için kullanılacak ürün kodu — SKU overlay için. */
  productCode: string;

  // Actions
  reset: () => void;
  start: (firstBotMessage?: string) => void;
  pushBot: (text: string) => void;
  pushUser: (text: string) => void;
  appendMessage: (message: GuidedMessage) => void;
  removeMessage: (id: string) => void;
  setMode: (mode: ChatMode) => void;
  addAttachedImage: (url: string) => void;
  removeAttachedImage: (index: number) => void;
  clearAttachedImages: () => void;
  setProductCode: (code: string) => void;
}

const initialState: Omit<
  AiCreatorState,
  | 'reset'
  | 'start'
  | 'pushBot'
  | 'pushUser'
  | 'appendMessage'
  | 'removeMessage'
  | 'setMode'
  | 'addAttachedImage'
  | 'removeAttachedImage'
  | 'clearAttachedImages'
  | 'setProductCode'
> = {
  sessionId: null,
  messages: [],
  mode: 'auto',
  attachedImages: [],
  productCode: '',
};

export const useAiCreatorStore = create<AiCreatorState>()((set) => ({
  ...initialState,

  reset: () => set({ ...initialState }),

  start: (firstBotMessage) => {
    const messages: GuidedMessage[] = [];
    if (firstBotMessage) {
      messages.push({ id: uid(), kind: 'bot-text', text: firstBotMessage });
    }
    set({
      ...initialState,
      sessionId: uid(),
      messages,
    });
  },

  pushBot: (text) =>
    set((s) => ({ messages: [...s.messages, { id: uid(), kind: 'bot-text', text }] })),

  pushUser: (text) =>
    set((s) => ({ messages: [...s.messages, { id: uid(), kind: 'user-text', text }] })),

  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, { ...message, id: message.id || uid() }] })),

  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  setMode: (mode) => set({ mode }),

  addAttachedImage: (url) =>
    set((s) => ({ attachedImages: [...s.attachedImages, url] })),

  removeAttachedImage: (index) =>
    set((s) => ({
      attachedImages: s.attachedImages.filter((_, i) => i !== index),
    })),

  clearAttachedImages: () => set({ attachedImages: [] }),

  setProductCode: (code) => set({ productCode: code }),
}));

/** Video için cinematic varsayılan prompt. Kullanıcı promptu kısa ise zenginleştirir.
 *  Fal Kling endpoint maksimum 2500 karakter kabul ediyor — kullanıcı uzun bir
 *  prompt (örn. VTON instruction) yapıştırırsa kısaltarak overflow'u önleriz. */
const FAL_PROMPT_MAX = 2500;
const VIDEO_SUFFIX =
  '. Cinematic product video. Smooth camera motion, soft lighting, natural body movement, high fidelity, fashion editorial style.';

export function buildVideoPrompt(userPrompt: string): string {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return VIDEO_SUFFIX.slice(2); // baştaki ". " yok
  }
  const maxUserLen = FAL_PROMPT_MAX - VIDEO_SUFFIX.length - 8; // güvenlik buffer'ı
  const truncated =
    trimmed.length > maxUserLen ? trimmed.slice(0, maxUserLen) : trimmed;
  return `${truncated}${VIDEO_SUFFIX}`;
}

/* ---------------- History store (persisted) ---------------- */

/** Geçmiş sohbet kaydı — history'de listelenir, tıklanınca aiCreatorStore'a
 *  geri yüklenir. */
export interface AiCreatorSessionSnapshot {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  state: {
    messages: GuidedMessage[];
    mode: ChatMode;
    productCode: string;
  };
}

/** Listede gösterilen sohbet meta-verisi. */
export interface AiCreatorSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AiCreatorHistoryState {
  sessions: AiCreatorSessionMeta[];
  isLoading: boolean;
  fetchSessions: (companyId: string) => Promise<void>;
  saveSnapshot: (
    companyId: string,
    snap: AiCreatorSessionSnapshot,
  ) => Promise<AiCreatorSessionMeta | null>;
  removeSession: (companyId: string, sessionId: string) => Promise<void>;
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

/** History snapshot için title üret — son user mesajı veya default. */
export function deriveSessionTitle(
  state: AiCreatorSessionSnapshot['state'],
): string {
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
    attachedImages: [],
  });
}
