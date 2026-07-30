'use client';

import { create } from 'zustand';
import { api } from '@/services/api';

// ============================================================================
// Types — backend spec 00-backend-spec/SPEC.md ile uyumlu
// ============================================================================

export type ThreadStatus = 'ai' | 'observing' | 'human_takeover' | 'closed';
export type ThreadOutcome =
  | 'sale'
  | 'cancel'
  | 'return'
  | 'exchange'
  | 'no_response'
  | 'admin_takeover'
  | 'complaint';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageSource = 'customer' | 'ai' | 'admin' | 'system';

export interface ChatMedia {
  url: string;
  type: 'image' | 'video' | string;
  mediaId?: string;
  /** Gönderi paylaşımlarında (ig_post/ig_reel) caption — ürün kodu genelde burada. */
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  source: MessageSource;
  content: string | null;
  mediaUrls: ChatMedia[];
  toolCall: { id: string; name: string; arguments: unknown } | null;
  toolCallId: string | null;
  toolResult: unknown | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ChatThreadListItem {
  id: string;
  storeId: string;
  storeName: string;
  instagramUsername: string | null;
  instagramProfilePic: string | null;
  status: ThreadStatus;
  lastMessageAt: string | null;
  messageCount: number;
  preview: string;
}

export interface ChatThreadDetail {
  id: string;
  storeId: string;
  storeName?: string;
  instagramUserId: string;
  instagramUsername: string | null;
  instagramProfilePic: string | null;
  status: ThreadStatus;
  takenOverBy: string | null;
  takenOverAt: string | null;
  closedAt: string | null;
  outcome: ThreadOutcome | null;
  sessionData: Record<string, unknown>;
  messageCount: number;
  lastUserMessageAt: string | null;
  lastBotMessageAt: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThreadListResponse {
  items: ChatThreadListItem[];
  total: number;
  hasMore: boolean;
}

export interface ChatThreadDetailResponse {
  thread: ChatThreadDetail;
  messages: ChatMessage[];
}

export interface ChatThreadQuery {
  storeId?: string;
  status?: ThreadStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

interface ChatThreadState {
  threads: ChatThreadListItem[];
  total: number;
  hasMore: boolean;
  selectedThread: ChatThreadDetail | null;
  selectedMessages: ChatMessage[];
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  isMutating: boolean;
  error: string | null;

  fetchThreads: (
    companyId: string,
    query?: ChatThreadQuery,
  ) => Promise<void>;
  fetchThreadDetail: (
    companyId: string,
    threadId: string,
  ) => Promise<ChatThreadDetailResponse | null>;
  /** Generic thread state transition.
   *  Backward-compat: ikinci parametre boolean ise (true → human_takeover,
   *  false → ai) eski API olarak çağrılır. */
  setThreadStatus: (
    companyId: string,
    threadId: string,
    next:
      | { status: 'ai' | 'observing' | 'human_takeover'; reason?: string }
      | { takeover: boolean; reason?: string },
  ) => Promise<ChatThreadDetail | null>;
  /** Deprecated — `setThreadStatus({ takeover })` ile aynı. */
  toggleTakeover: (
    companyId: string,
    threadId: string,
    takeover: boolean,
    reason?: string,
  ) => Promise<ChatThreadDetail | null>;
  /** Admin → müşteri mesaj gönder. Takeover yapılmış olmalı. */
  sendAdminMessage: (
    companyId: string,
    threadId: string,
    text: string,
  ) => Promise<boolean>;
  /** Bir thread içindeki mesaj listesini yeniler (polling/realtime fallback). */
  refreshMessages: (
    companyId: string,
    threadId: string,
  ) => Promise<void>;
  clearSelected: () => void;
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[]; error?: { message?: string } } } };
  const m = e.response?.data?.message;
  if (Array.isArray(m)) return m[0] ?? 'İşlem başarısız';
  return m ?? e.response?.data?.error?.message ?? 'İşlem başarısız';
}

export const useChatThreadStore = create<ChatThreadState>((set, get) => ({
  threads: [],
  total: 0,
  hasMore: false,
  selectedThread: null,
  selectedMessages: [],
  isLoadingList: false,
  isLoadingDetail: false,
  isMutating: false,
  error: null,

  fetchThreads: async (companyId, query = {}) => {
    set({ isLoadingList: true, error: null });
    try {
      const params = new URLSearchParams();
      if (query.storeId) params.append('storeId', query.storeId);
      if (query.status && query.status !== 'all') {
        params.append('status', query.status);
      }
      if (query.search) params.append('search', query.search);
      if (query.limit != null) params.append('limit', String(query.limit));
      if (query.offset != null) params.append('offset', String(query.offset));
      const res = await api.get<ChatThreadListResponse>(
        `/company/${companyId}/chat-threads?${params.toString()}`,
      );
      set({
        threads: res.data.items,
        total: res.data.total,
        hasMore: res.data.hasMore,
        isLoadingList: false,
      });
    } catch (err) {
      set({ error: extractError(err), isLoadingList: false });
    }
  },

  fetchThreadDetail: async (companyId, threadId) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const res = await api.get<ChatThreadDetailResponse>(
        `/company/${companyId}/chat-threads/${threadId}`,
      );
      set({
        selectedThread: res.data.thread,
        selectedMessages: res.data.messages,
        isLoadingDetail: false,
      });
      return res.data;
    } catch (err) {
      set({ error: extractError(err), isLoadingDetail: false });
      return null;
    }
  },

  sendAdminMessage: async (companyId, threadId, text) => {
    try {
      await api.post(
        `/company/${companyId}/chat-threads/${threadId}/send`,
        { text },
      );
      // Mesajı liste'ye optimistik eklemek yerine refresh ile çekelim.
      await get().refreshMessages(companyId, threadId);
      return true;
    } catch (err) {
      set({ error: extractError(err) });
      return false;
    }
  },

  setThreadStatus: async (companyId, threadId, next) => {
    set({ isMutating: true });
    try {
      const body =
        'status' in next
          ? { status: next.status, reason: next.reason }
          : { takeover: next.takeover, reason: next.reason };
      const res = await api.patch<ChatThreadDetail>(
        `/company/${companyId}/chat-threads/${threadId}/takeover`,
        body,
      );
      set((s) => ({
        isMutating: false,
        selectedThread:
          s.selectedThread?.id === threadId ? res.data : s.selectedThread,
        threads: s.threads.map((t) =>
          t.id === threadId ? { ...t, status: res.data.status } : t,
        ),
      }));
      return res.data;
    } catch (err) {
      set({ error: extractError(err), isMutating: false });
      return null;
    }
  },

  toggleTakeover: async (companyId, threadId, takeover, reason) => {
    return get().setThreadStatus(companyId, threadId, { takeover, reason });
  },

  refreshMessages: async (companyId, threadId) => {
    try {
      const res = await api.get<ChatThreadDetailResponse>(
        `/company/${companyId}/chat-threads/${threadId}`,
      );
      // selectedThread değiştirilmemişse mesajları güncelle
      const current = get().selectedThread;
      if (current?.id === threadId) {
        set({
          selectedThread: res.data.thread,
          selectedMessages: res.data.messages,
        });
      }
    } catch {
      // sessiz fail — polling'de yutuyoruz
    }
  },

  clearSelected: () => set({ selectedThread: null, selectedMessages: [] }),
}));
