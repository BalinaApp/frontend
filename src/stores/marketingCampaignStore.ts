'use client';

import { create } from 'zustand';
import { api } from '@/services/api';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'cancelled'
  | 'failed';

export interface AudienceFilter {
  storeIds?: string[];
  tags?: string[];
  lastOrderAfter?: string;
}

export interface MarketingCampaign {
  id: string;
  companyId: string;
  createdById: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  bodyMeta: {
    productIds?: string[];
    aiPrompt?: string;
    aiTone?: string;
    blocks?: unknown[];
  } | null;
  status: CampaignStatus | string;
  scheduledAt: string | null;
  sentAt: string | null;
  audienceFilter: AudienceFilter | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListResponse {
  campaigns: MarketingCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AudiencePreview {
  count: number;
  sample: { email: string; firstName: string | null; lastName: string | null }[];
}

interface MarketingCampaignState {
  campaigns: MarketingCampaign[];
  total: number;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  fetchCampaigns: (
    companyId: string,
    query?: { search?: string; status?: string },
  ) => Promise<void>;
  fetchOne: (
    companyId: string,
    campaignId: string,
  ) => Promise<MarketingCampaign | null>;
  createCampaign: (
    companyId: string,
    input: {
      name: string;
      subject?: string;
      bodyHtml?: string;
      bodyMeta?: Record<string, unknown>;
    },
  ) => Promise<MarketingCampaign | null>;
  updateCampaign: (
    companyId: string,
    campaignId: string,
    patch: Partial<
      Pick<
        MarketingCampaign,
        'name' | 'subject' | 'bodyHtml' | 'bodyText' | 'bodyMeta' | 'audienceFilter'
      >
    >,
  ) => Promise<MarketingCampaign | null>;
  deleteCampaign: (companyId: string, campaignId: string) => Promise<boolean>;
  generateContent: (
    companyId: string,
    campaignId: string,
    input: { prompt: string; tone?: string; productIds?: string[] },
  ) => Promise<{ subject: string; bodyHtml: string; productIds: string[] } | null>;
  generateBlockText: (
    companyId: string,
    campaignId: string,
    input: {
      blockType: 'heading' | 'text' | 'button';
      currentText?: string;
      tone?: string;
      blocksContext?: string;
      prompt?: string;
    },
  ) => Promise<{ text: string } | null>;
  sendNow: (
    companyId: string,
    campaignId: string,
  ) => Promise<MarketingCampaign | null>;
  schedule: (
    companyId: string,
    campaignId: string,
    scheduledAt: Date,
  ) => Promise<MarketingCampaign | null>;
  cancel: (
    companyId: string,
    campaignId: string,
  ) => Promise<MarketingCampaign | null>;
  fetchAudience: (
    companyId: string,
    campaignId: string,
  ) => Promise<AudiencePreview | null>;
  fetchPreview: (
    companyId: string,
    campaignId: string,
  ) => Promise<{ html: string } | null>;
  testSend: (
    companyId: string,
    campaignId: string,
    email: string,
  ) => Promise<{ ok: boolean; messageId: string | null } | null>;
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e.response?.data?.message;
  if (Array.isArray(m)) return m[0] ?? 'İşlem başarısız';
  return m ?? 'İşlem başarısız';
}

export const useMarketingCampaignStore = create<MarketingCampaignState>(
  (set) => ({
    campaigns: [],
    total: 0,
    isLoading: false,
    isMutating: false,
    error: null,

    fetchCampaigns: async (companyId, query = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        params.append('limit', '200');
        if (query.search) params.append('search', query.search);
        if (query.status && query.status !== 'all') {
          params.append('status', query.status);
        }
        const res = await api.get<CampaignListResponse>(
          `/company/${companyId}/marketing/campaigns?${params.toString()}`,
        );
        set({
          campaigns: res.data.campaigns,
          total: res.data.total,
          isLoading: false,
        });
      } catch (err) {
        set({ error: extractError(err), isLoading: false });
      }
    },

    fetchOne: async (companyId, campaignId) => {
      try {
        const res = await api.get<MarketingCampaign>(
          `/company/${companyId}/marketing/campaigns/${campaignId}`,
        );
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },

    createCampaign: async (companyId, input) => {
      set({ isMutating: true });
      try {
        const res = await api.post<MarketingCampaign>(
          `/company/${companyId}/marketing/campaigns`,
          input,
        );
        set((s) => ({
          campaigns: [res.data, ...s.campaigns],
          total: s.total + 1,
          isMutating: false,
        }));
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    updateCampaign: async (companyId, campaignId, patch) => {
      set({ isMutating: true });
      try {
        const res = await api.patch<MarketingCampaign>(
          `/company/${companyId}/marketing/campaigns/${campaignId}`,
          patch,
        );
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === campaignId ? res.data : c,
          ),
          isMutating: false,
        }));
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    deleteCampaign: async (companyId, campaignId) => {
      try {
        await api.delete(
          `/company/${companyId}/marketing/campaigns/${campaignId}`,
        );
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== campaignId),
          total: Math.max(0, s.total - 1),
        }));
        return true;
      } catch (err) {
        set({ error: extractError(err) });
        return false;
      }
    },

    generateContent: async (companyId, campaignId, input) => {
      set({ isMutating: true });
      try {
        const res = await api.post<{
          subject: string;
          bodyHtml: string;
          productIds: string[];
        }>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/generate-content`,
          input,
        );
        set({ isMutating: false });
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    generateBlockText: async (companyId, campaignId, input) => {
      try {
        const res = await api.post<{ text: string }>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/generate-block-text`,
          input,
        );
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },

    sendNow: async (companyId, campaignId) => {
      set({ isMutating: true });
      try {
        const res = await api.post<MarketingCampaign>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/send-now`,
        );
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === campaignId ? res.data : c,
          ),
          isMutating: false,
        }));
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    schedule: async (companyId, campaignId, scheduledAt) => {
      set({ isMutating: true });
      try {
        const res = await api.post<MarketingCampaign>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/schedule`,
          { scheduledAt: scheduledAt.toISOString() },
        );
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === campaignId ? res.data : c,
          ),
          isMutating: false,
        }));
        return res.data;
      } catch (err) {
        set({ error: extractError(err), isMutating: false });
        return null;
      }
    },

    cancel: async (companyId, campaignId) => {
      try {
        const res = await api.post<MarketingCampaign>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/cancel`,
        );
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === campaignId ? res.data : c,
          ),
        }));
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },

    fetchAudience: async (companyId, campaignId) => {
      try {
        const res = await api.get<AudiencePreview>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/audience`,
        );
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },

    fetchPreview: async (companyId, campaignId) => {
      try {
        const res = await api.get<{ html: string }>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/preview`,
        );
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },

    testSend: async (companyId, campaignId, email) => {
      try {
        const res = await api.post<{ ok: boolean; messageId: string | null }>(
          `/company/${companyId}/marketing/campaigns/${campaignId}/test-send`,
          { email },
        );
        return res.data;
      } catch (err) {
        set({ error: extractError(err) });
        return null;
      }
    },
  }),
);
