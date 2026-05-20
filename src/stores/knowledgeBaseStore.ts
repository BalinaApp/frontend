'use client';

import { create } from 'zustand';
import { api } from '@/services/api';

// ============================================================================
// Knowledge base + learning clusters — backend spec ile uyumlu
// ============================================================================

export interface KnowledgeBaseItem {
  id: string;
  storeId: string;
  questionPattern: string;
  idealAnswer: string;
  examples: { question: string; answer: string }[];
  appliesTo: string | null;
  active: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClusterStatus = 'pending' | 'approved' | 'rejected';

export interface LearningCluster {
  id: string;
  storeId: string;
  sampleQuestions: string[];
  suggestedPattern: string;
  suggestedAnswer: string;
  clusterSize: number;
  status: ClusterStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  knowledgeBaseId: string | null;
  createdAt: string;
}

interface KnowledgeBaseState {
  items: KnowledgeBaseItem[];
  clusters: LearningCluster[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  fetchItems: (companyId: string, storeId: string) => Promise<void>;
  createItem: (
    companyId: string,
    storeId: string,
    input: {
      questionPattern: string;
      idealAnswer: string;
      examples?: { question: string; answer: string }[];
      appliesTo?: string;
    },
  ) => Promise<KnowledgeBaseItem | null>;
  updateItem: (
    companyId: string,
    storeId: string,
    id: string,
    patch: Partial<Pick<KnowledgeBaseItem, 'idealAnswer' | 'examples' | 'active'>>,
  ) => Promise<boolean>;
  deleteItem: (
    companyId: string,
    storeId: string,
    id: string,
  ) => Promise<boolean>;

  fetchClusters: (
    companyId: string,
    storeId: string,
    status?: ClusterStatus,
  ) => Promise<void>;
  approveCluster: (
    companyId: string,
    storeId: string,
    clusterId: string,
    overrideAnswer?: string,
  ) => Promise<boolean>;
  rejectCluster: (
    companyId: string,
    storeId: string,
    clusterId: string,
  ) => Promise<boolean>;
}

function extractError(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string | string[]; error?: { message?: string } } };
  };
  const m = e.response?.data?.message;
  if (Array.isArray(m)) return m[0] ?? 'İşlem başarısız';
  return m ?? e.response?.data?.error?.message ?? 'İşlem başarısız';
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  items: [],
  clusters: [],
  isLoading: false,
  isMutating: false,
  error: null,

  fetchItems: async (companyId, storeId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<KnowledgeBaseItem[]>(
        `/company/${companyId}/stores/${storeId}/knowledge-base`,
      );
      set({ items: res.data, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  createItem: async (companyId, storeId, input) => {
    set({ isMutating: true });
    try {
      const res = await api.post<KnowledgeBaseItem>(
        `/company/${companyId}/stores/${storeId}/knowledge-base`,
        input,
      );
      set((s) => ({ items: [res.data, ...s.items], isMutating: false }));
      return res.data;
    } catch (err) {
      set({ error: extractError(err), isMutating: false });
      return null;
    }
  },

  updateItem: async (companyId, storeId, id, patch) => {
    try {
      const res = await api.patch<KnowledgeBaseItem>(
        `/company/${companyId}/stores/${storeId}/knowledge-base/${id}`,
        patch,
      );
      set((s) => ({
        items: s.items.map((it) => (it.id === id ? res.data : it)),
      }));
      return true;
    } catch (err) {
      set({ error: extractError(err) });
      return false;
    }
  },

  deleteItem: async (companyId, storeId, id) => {
    try {
      await api.delete(
        `/company/${companyId}/stores/${storeId}/knowledge-base/${id}`,
      );
      set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
      return true;
    } catch (err) {
      set({ error: extractError(err) });
      return false;
    }
  },

  fetchClusters: async (companyId, storeId, status = 'pending') => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ status });
      const res = await api.get<LearningCluster[]>(
        `/company/${companyId}/stores/${storeId}/learning-clusters?${params.toString()}`,
      );
      set({ clusters: res.data, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  approveCluster: async (companyId, storeId, clusterId, overrideAnswer) => {
    try {
      await api.post(
        `/company/${companyId}/stores/${storeId}/learning-clusters/${clusterId}/approve`,
        overrideAnswer ? { idealAnswer: overrideAnswer } : {},
      );
      set((s) => ({
        clusters: s.clusters.filter((c) => c.id !== clusterId),
      }));
      return true;
    } catch (err) {
      set({ error: extractError(err) });
      return false;
    }
  },

  rejectCluster: async (companyId, storeId, clusterId) => {
    try {
      await api.post(
        `/company/${companyId}/stores/${storeId}/learning-clusters/${clusterId}/reject`,
      );
      set((s) => ({
        clusters: s.clusters.filter((c) => c.id !== clusterId),
      }));
      return true;
    } catch (err) {
      set({ error: extractError(err) });
      return false;
    }
  },
}));
