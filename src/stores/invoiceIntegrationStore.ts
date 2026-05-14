import { create } from 'zustand';
import { api } from '@/services/api';

// E-Fatura sağlayıcıları — backend Prisma enum AccountingInvoiceProvider'a paralel.
export type InvoiceProvider = 'BIZIMHESAP' | 'PARASUT';

// Backend'in `toListItem` çıktısı — credential plaintext asla buraya akmaz.
// `config` JSON kolonunun şekli provider'a göre değişir, alttaki BH/Paraşüt
// tipleri bunu daraltıyor.
export interface BizimhesapConfig {
  firmId: string;
  apiKey?: string | null;
  baseUrl?: string | null;
}

export interface ParasutConfig {
  parasutCompanyId: string;
  baseUrl?: string | null;
}

interface ConnectionBase {
  id: string;
  label: string | null;
  isActive: boolean;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BizimhesapIntegration extends ConnectionBase {
  provider: 'BIZIMHESAP';
  config: BizimhesapConfig;
}

export interface ParasutIntegration extends ConnectionBase {
  provider: 'PARASUT';
  config: ParasutConfig;
}

// Backend liste endpoint'inin döndüğü generic kayıt — fetch sonrası provider'a
// göre ayrıştırılır.
interface RawConnectionListItem extends ConnectionBase {
  provider: InvoiceProvider;
  config: Record<string, unknown>;
}

export type InvoiceIntegration = BizimhesapIntegration | ParasutIntegration;

export interface InvoiceTestResult {
  ok: boolean;
  error?: string;
}

// Test DTO'ları — backend `BizimhesapTestConnectionDto` ve
// `ParasutTestConnectionDto` ile birebir. Hepsi opsiyonel; boş gönderilirse
// backend `.env` değerlerini kullanır.
export interface BizimhesapTestDto {
  token?: string;
  apiKey?: string;
}

export interface ParasutTestDto {
  email?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

// Connect (kaydet) DTO'ları — `ConnectBizimhesapDto` ve `ConnectParasutDto`
// ile birebir. Bağlanma başarılıysa backend upsert yapar.
export interface ConnectBizimhesapDto {
  token: string;
  firmId: string;
  apiKey?: string;
  baseUrl?: string;
  label?: string;
}

export interface ConnectParasutDto {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  parasutCompanyId: string;
  baseUrl?: string;
  label?: string;
}

interface InvoiceState {
  bizimhesaps: BizimhesapIntegration[];
  parasuts: ParasutIntegration[];
  isLoading: boolean;
  isSaving: boolean;

  fetchInvoiceIntegrations: (companyId: string) => Promise<void>;

  // Test — kaydetmez, kullanıcı bağlamadan önce credential dener.
  testBizimhesapCredentials: (
    companyId: string,
    args: BizimhesapTestDto,
  ) => Promise<InvoiceTestResult>;
  testParasutCredentials: (
    companyId: string,
    args: ParasutTestDto,
  ) => Promise<InvoiceTestResult>;

  // Connect — test + per-company upsert. Bir şirket için aynı provider'dan
  // tek aktif bağlantı vardır; yeniden bağlanmak mevcut kaydı override eder.
  // Hata durumunda throw eder (axios error) — caller try/catch ile yakalayıp
  // backend mesajını toast'a koysun.
  connectBizimhesap: (
    companyId: string,
    args: ConnectBizimhesapDto,
  ) => Promise<BizimhesapIntegration>;
  connectParasut: (
    companyId: string,
    args: ConnectParasutDto,
  ) => Promise<ParasutIntegration>;

  // Disconnect — provider bazlı kaldırma. Sonraki fatura isteklerinde 404.
  disconnectProvider: (
    companyId: string,
    provider: InvoiceProvider,
  ) => Promise<void>;
}

const errorMessage = (err: unknown, fallback: string): string => {
  const apiMsg = (
    err as {
      response?: { data?: { message?: string | string[]; error?: string } };
    }
  )?.response?.data;
  const msg = apiMsg?.message ?? apiMsg?.error;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || (err instanceof Error ? err.message : fallback);
};

const splitConnections = (
  rows: RawConnectionListItem[],
): {
  bizimhesaps: BizimhesapIntegration[];
  parasuts: ParasutIntegration[];
} => {
  const bizimhesaps: BizimhesapIntegration[] = [];
  const parasuts: ParasutIntegration[] = [];
  for (const row of rows) {
    if (row.provider === 'BIZIMHESAP') {
      bizimhesaps.push({
        ...row,
        provider: 'BIZIMHESAP',
        config: (row.config || { firmId: '' }) as unknown as BizimhesapConfig,
      });
    } else if (row.provider === 'PARASUT') {
      parasuts.push({
        ...row,
        provider: 'PARASUT',
        config: (row.config || {
          parasutCompanyId: '',
        }) as unknown as ParasutConfig,
      });
    }
  }
  return { bizimhesaps, parasuts };
};

export const useInvoiceIntegrationStore = create<InvoiceState>((set) => ({
  bizimhesaps: [],
  parasuts: [],
  isLoading: false,
  isSaving: false,

  fetchInvoiceIntegrations: async (companyId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<RawConnectionListItem[]>(
        `/company/${companyId}/accounting/connections`,
      );
      const { bizimhesaps, parasuts } = splitConnections(data ?? []);
      set({ bizimhesaps, parasuts, isLoading: false });
    } catch {
      set({ bizimhesaps: [], parasuts: [], isLoading: false });
    }
  },

  testBizimhesapCredentials: async (companyId, args) => {
    try {
      const { data } = await api.post<{
        success?: boolean;
        ok?: boolean;
        error?: string;
      }>(`/company/${companyId}/bizimhesap/test`, args);
      // Backend hem `success` hem `ok` döndürebilir; ikisini de kabul ediyoruz.
      const ok = data?.ok ?? data?.success ?? false;
      return { ok, error: ok ? undefined : data?.error };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Test başarısız') };
    }
  },

  testParasutCredentials: async (companyId, args) => {
    try {
      const { data } = await api.post<{
        success?: boolean;
        ok?: boolean;
        error?: string;
      }>(`/company/${companyId}/parasut/test`, args);
      const ok = data?.ok ?? data?.success ?? false;
      return { ok, error: ok ? undefined : data?.error };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Test başarısız') };
    }
  },

  connectBizimhesap: async (companyId, args) => {
    set({ isSaving: true });
    try {
      const { data } = await api.post<RawConnectionListItem>(
        `/company/${companyId}/accounting/bizimhesap/connect`,
        args,
      );
      const integration: BizimhesapIntegration = {
        ...data,
        provider: 'BIZIMHESAP',
        config: (data.config || { firmId: args.firmId }) as unknown as BizimhesapConfig,
      };
      set((state) => ({
        // Tek aktif bağlantı kuralı: aynı provider'dan eskisini at, yenisini koy.
        bizimhesaps: [
          ...state.bizimhesaps.filter((b) => b.id !== integration.id),
          integration,
        ],
        isSaving: false,
      }));
      return integration;
    } catch (error) {
      // Backend 400 mesajını caller'a kadar taşı — UI bunu toast olarak
      // göstermeli (yanlış şifre, geçersiz token, vb.). Sessizce null
      // döndürmek dokümandaki "mesajı göster" akışını bozar.
      set({ isSaving: false });
      throw error;
    }
  },

  connectParasut: async (companyId, args) => {
    set({ isSaving: true });
    try {
      const { data } = await api.post<RawConnectionListItem>(
        `/company/${companyId}/accounting/parasut/connect`,
        args,
      );
      const integration: ParasutIntegration = {
        ...data,
        provider: 'PARASUT',
        config: (data.config || {
          parasutCompanyId: args.parasutCompanyId,
        }) as unknown as ParasutConfig,
      };
      set((state) => ({
        parasuts: [
          ...state.parasuts.filter((p) => p.id !== integration.id),
          integration,
        ],
        isSaving: false,
      }));
      return integration;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  disconnectProvider: async (companyId, provider) => {
    await api.delete(
      `/company/${companyId}/accounting/${provider}/disconnect`,
    );
    set((state) => ({
      bizimhesaps:
        provider === 'BIZIMHESAP' ? [] : state.bizimhesaps,
      parasuts: provider === 'PARASUT' ? [] : state.parasuts,
    }));
  },
}));
