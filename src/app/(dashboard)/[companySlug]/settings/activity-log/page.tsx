'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Clock,
  Person,
  Briefcase,
  ShoppingCart,
  Box as Package,
  ArrowsRotateRight as RefreshCw,
  AbbrApi as Key,
  Lock,
  CircleCheckFill,
  CircleXmark,
} from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useAuditLogStore, AuditLogItem } from '@/stores/auditLogStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { DateRangeInput, DateRange } from '@/components/date-range-input';

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface ActionMeta {
  label: string;
  icon: IconType;
}

// Tek bir kaynak: backend audit-log.types.ts'deki AuditAction sabitlerine
// karşılık gelir. Etiket Türkçe ve fiilin yanında kaynağı (Mağaza, Sipariş…)
// içerir; renk burada değil — `colorFor()` her action'a deterministic atar.
const ACTION_META: Record<string, ActionMeta> = {
  AUTH_LOGIN: { label: 'Giriş yaptı', icon: Lock },
  AUTH_LOGIN_FAILED: { label: 'Giriş başarısız', icon: Lock },
  AUTH_LOGOUT: { label: 'Çıkış yaptı', icon: Lock },
  AUTH_REGISTER: { label: 'Hesap oluşturdu', icon: Person },
  AUTH_PASSWORD_RESET: { label: 'Şifre sıfırladı', icon: Lock },
  AUTH_PASSWORD_CHANGE: { label: 'Şifre değiştirdi', icon: Lock },

  COMPANY_CREATE: { label: 'Şirket oluşturdu', icon: Briefcase },
  COMPANY_UPDATE: { label: 'Şirket bilgilerini güncelledi', icon: Briefcase },
  COMPANY_DELETE: { label: 'Şirketi sildi', icon: Briefcase },
  COMPANY_INVITE: { label: 'Şirkete üye davet etti', icon: Person },
  COMPANY_MEMBER_REMOVE: { label: 'Şirket üyesini kaldırdı', icon: Person },

  STORE_CREATE: { label: 'Mağaza ekledi', icon: Package },
  STORE_UPDATE: { label: 'Mağazayı güncelledi', icon: Package },
  STORE_DELETE: { label: 'Mağazayı sildi', icon: Package },
  STORE_TEST_CONNECTION: { label: 'Mağaza bağlantısını test etti', icon: Package },

  ORDER_CREATE: { label: 'Sipariş oluşturdu', icon: ShoppingCart },
  ORDER_UPDATE: { label: 'Siparişi güncelledi', icon: ShoppingCart },
  ORDER_REFUND: { label: 'Siparişi iade etti', icon: RefreshCw },
  ORDER_CANCEL: { label: 'Siparişi iptal etti', icon: ShoppingCart },

  STOCK_UPDATE: { label: 'Stok güncelledi', icon: Package },
  STOCK_PUSH_REMOTE: { label: 'Pazaryerine stok gönderdi', icon: Package },

  CARGO_CREATE: { label: 'Kargo oluşturdu', icon: Package },
  CARGO_CANCEL: { label: 'Kargoyu iptal etti', icon: Package },

  API_KEY_CREATE: { label: 'API anahtarı oluşturdu', icon: Key },
  API_KEY_REVOKE: { label: 'API anahtarını iptal etti', icon: Key },
  API_KEY_ROTATE: { label: 'API anahtarını yeniledi', icon: Key },
};

// Renk paletini Tailwind'in tarayıcısı yakalayabilsin diye class isimleri
// tam (literal) yazıldı — `bg-${x}-500` şeklinde dynamic compose Tailwind v4'te
// güvenilir değil.
const COLOR_PALETTE: string[] = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-orange-500',
  'bg-fuchsia-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-lime-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-green-500',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function colorFor(key: string): string {
  return COLOR_PALETTE[hashString(key) % COLOR_PALETTE.length];
}

/** UUID/cuid pattern — 18+ alfasayısal karakterli segmentleri "id" sayar. */
const ID_LIKE = /^[a-z0-9]{18,}$/i;

/**
 * Path'i normalleştirir: /api/, company/<cuid> ve diğer id-benzeri segmentler
 * atılır, geriye anlamlı endpoint kalır (örn. "ai/generate/image").
 * Rule eşleştirmesinde kullanılır; UI'da artık doğrudan gösterilmez.
 */
function normalizePath(path: string | null | undefined): string {
  if (!path) return '';
  return path
    .replace(/\?.*$/, '')
    .split('/')
    .filter(Boolean)
    .filter((seg) => seg !== 'api')
    .filter((seg) => !ID_LIKE.test(seg))
    .join('/');
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface EndpointRule {
  /** Test eden regex; normalize edilmiş path üzerinde çalışır. */
  match: RegExp;
  /** Method → Türkçe eylem cümlesi. Eşleşmeyen method için null döner. */
  byMethod: Partial<Record<HttpMethod, string>>;
  /** Renk paletinden seçilen rengi sabitleyen anahtar. */
  key: string;
}

// Backend route'larıyla senkron tutulan tablo. Yeni endpoint eklenince
// buraya da bir satır eklenmeli; eşleşme bulunmazsa generic fiile düşer.
// Sıra önemli: daha spesifik pattern'ler önde olmalı (örn. fal/test → fal'dan
// önce).
const ENDPOINT_RULES: EndpointRule[] = [
  // ----- AI Creator -----
  {
    match: /^company\/ai\/integrations\/fal\/test$/,
    byMethod: { POST: 'Fal.ai bağlantısını test etti' },
    key: 'ai-fal-test',
  },
  {
    match: /^company\/ai\/integrations\/fal(\/test)?$/,
    byMethod: { POST: 'Fal.ai bağlantısını test etti' },
    key: 'ai-fal-test',
  },
  {
    match: /^company\/ai\/integrations\/fal$/,
    byMethod: {
      POST: 'Fal.ai hesabı ekledi',
      PATCH: 'Fal.ai hesabını güncelledi',
      DELETE: 'Fal.ai hesabını sildi',
    },
    key: 'ai-fal',
  },
  {
    match: /^company\/ai\/generate\/image$/,
    byMethod: { POST: 'Yapay zeka ile görsel üretti' },
    key: 'ai-generate',
  },
  {
    match: /^company\/ai\/conversations\/messages$/,
    byMethod: { POST: 'AI sohbetine mesaj ekledi' },
    key: 'ai-message',
  },
  {
    match: /^company\/ai\/conversations$/,
    byMethod: {
      POST: 'Yeni AI sohbeti başlattı',
      PATCH: 'AI sohbet başlığını güncelledi',
      DELETE: 'AI sohbetini sildi',
    },
    key: 'ai-conversation',
  },
  {
    match: /^company\/ai\/creator-sessions$/,
    byMethod: {
      POST: 'AI Creator oturumu başlattı',
      DELETE: 'AI Creator oturumunu sildi',
    },
    key: 'ai-creator-session',
  },
  // ----- Stores / Marketplace -----
  {
    match: /^stores\/marketplace(\/[a-z]+)?\/test$/i,
    byMethod: { POST: 'Mağaza bağlantısını test etti' },
    key: 'store-test',
  },
  {
    match: /^stores\/marketplace/i,
    byMethod: {
      POST: 'Pazaryeri mağazası ekledi',
      PUT: 'Pazaryeri mağazasını güncelledi',
      PATCH: 'Pazaryeri mağazasını güncelledi',
      DELETE: 'Pazaryeri mağazasını sildi',
    },
    key: 'store-marketplace',
  },
  {
    match: /^stores(\/sync)?$/,
    byMethod: {
      POST: 'Mağaza senkronize etti',
      PUT: 'Mağazayı güncelledi',
      PATCH: 'Mağazayı güncelledi',
      DELETE: 'Mağazayı sildi',
    },
    key: 'store',
  },
  // ----- Inventory / Stock -----
  {
    match: /\b(stock|inventory)\b/i,
    byMethod: {
      POST: 'Stok güncelledi',
      PUT: 'Stok güncelledi',
      PATCH: 'Stok güncelledi',
    },
    key: 'stock',
  },
  // ----- Pricing -----
  {
    match: /\bprices?\b/i,
    byMethod: {
      POST: 'Fiyat güncelledi',
      PUT: 'Fiyat güncelledi',
      PATCH: 'Fiyat güncelledi',
    },
    key: 'price',
  },
  // ----- Orders / Refunds -----
  {
    match: /\brefunds?\b/i,
    byMethod: {
      POST: 'Sipariş iadesi oluşturdu',
      DELETE: 'Sipariş iadesini iptal etti',
    },
    key: 'refund',
  },
  {
    match: /\borders?\b/i,
    byMethod: {
      POST: 'Sipariş oluşturdu',
      PUT: 'Siparişi güncelledi',
      PATCH: 'Siparişi güncelledi',
      DELETE: 'Siparişi iptal etti',
    },
    key: 'order',
  },
  // ----- Cargo / Shipments -----
  {
    match: /\b(cargo|shipments?)\b/i,
    byMethod: {
      POST: 'Kargo oluşturdu',
      DELETE: 'Kargoyu iptal etti',
    },
    key: 'cargo',
  },
  // ----- Product mapping -----
  {
    match: /\bproduct-mappings?\b/i,
    byMethod: {
      POST: 'Ürün eşleştirmesi ekledi',
      PUT: 'Ürün eşleştirmesini güncelledi',
      PATCH: 'Ürün eşleştirmesini güncelledi',
      DELETE: 'Ürün eşleştirmesini kaldırdı',
    },
    key: 'product-mapping',
  },
  // ----- API Keys -----
  {
    match: /\bapi-keys?\b/i,
    byMethod: {
      POST: 'API anahtarı oluşturdu',
      DELETE: 'API anahtarını iptal etti',
      PATCH: 'API anahtarını yeniledi',
    },
    key: 'api-key',
  },
  // ----- Notifications -----
  {
    match: /\bnotifications?\b/i,
    byMethod: {
      POST: 'Bildirim ayarını güncelledi',
      PUT: 'Bildirim ayarını güncelledi',
      PATCH: 'Bildirim ayarını güncelledi',
      DELETE: 'Bildirimi sildi',
    },
    key: 'notification',
  },
  // ----- Company / Members -----
  {
    match: /\bcompanies?\/[^/]+\/members?/i,
    byMethod: {
      POST: 'Şirkete üye davet etti',
      DELETE: 'Şirket üyesini kaldırdı',
      PATCH: 'Şirket üyesini güncelledi',
    },
    key: 'company-member',
  },
  {
    match: /\bcompanies?\b/i,
    byMethod: {
      POST: 'Şirket bilgisi oluşturdu',
      PUT: 'Şirket bilgisini güncelledi',
      PATCH: 'Şirket bilgisini güncelledi',
    },
    key: 'company',
  },
  // ----- Auth -----
  {
    match: /\bauth\/login\b/i,
    byMethod: { POST: 'Giriş yaptı' },
    key: 'auth-login',
  },
  {
    match: /\bauth\/logout\b/i,
    byMethod: { POST: 'Çıkış yaptı' },
    key: 'auth-logout',
  },
  {
    match: /\bauth\/(verify-code|verify-email)\b/i,
    byMethod: { POST: 'E-postasını doğruladı' },
    key: 'auth-verify',
  },
  {
    match: /\bauth\/(register|signup)\b/i,
    byMethod: { POST: 'Hesap oluşturdu' },
    key: 'auth-register',
  },
];

function matchEndpointRule(
  path: string,
  method: HttpMethod,
): { label: string; key: string } | null {
  for (const rule of ENDPOINT_RULES) {
    if (!rule.match.test(path)) continue;
    const label = rule.byMethod[method];
    if (label) return { label, key: rule.key };
  }
  return null;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} sa önce`;
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function userName(item: AuditLogItem): string {
  return (
    item.user?.name ||
    item.user?.email ||
    item.userEmail ||
    'Sistem / Bilinmeyen kullanıcı'
  );
}

interface DerivedAction {
  /** Eylem cümlesi — "AI sohbeti başlattı" gibi insan dilinde. */
  verb: string;
  icon: IconType;
  /** Renk seçimi için stable anahtar — aynı endpoint hep aynı rengi alır. */
  colorKey: string;
}

function deriveAction(item: AuditLogItem): DerivedAction {
  // 1) Backend'in @AuditLog ile etiketlediği action'lar — en güvenilir.
  const known = ACTION_META[item.action];
  if (known) {
    return { verb: known.label, icon: known.icon, colorKey: item.action };
  }

  // 2) HTTP_POST/PUT/PATCH/DELETE generic action'lar — path'ten Türkçeye çevir.
  const normalized = normalizePath(item.path);
  const method = (item.method ?? '').toUpperCase() as HttpMethod;
  if (normalized && method) {
    const rule = matchEndpointRule(normalized, method);
    if (rule) {
      return { verb: rule.label, icon: Clock, colorKey: rule.key };
    }
  }

  // 3) Hiçbir kural eşleşmediyse — yine de bir cümle çıkar.
  const verbMap: Record<string, string> = {
    POST: 'bir işlem oluşturdu',
    PUT: 'bir kaydı güncelledi',
    PATCH: 'bir kaydı güncelledi',
    DELETE: 'bir kaydı sildi',
  };
  return {
    verb: verbMap[method] ?? 'işlem yaptı',
    icon: Clock,
    colorKey: item.action,
  };
}

/** "Bugün" varsayılanı — 00:00 → 23:59:59.999 yerel saatle. */
function todayRange(): DateRange {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** `to` günü için günün sonuna (23:59:59) hizala — backend `lte` kullanıyor. */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function ActivityLogPage() {
  usePageTitle('Aktivite günlüğü');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const { items, meta, isLoading, error, forbidden, fetchCompanyLogs, reset } =
    useAuditLogStore();

  const slug = currentCompany?.slug ?? '';
  const companyId = currentCompany?.id;
  // Doc §1.1: yalnızca OWNER/ADMIN üyeler audit log'u görebilir. Backend zaten
  // 403 döner; UI'da önceden gate edip net mesaj göstermek daha iyi.
  const userRole = currentCompany?.role;
  const canViewLogs = userRole === 'OWNER' || userRole === 'ADMIN';

  const [range, setRange] = useState<DateRange>(() => todayRange());

  useEffect(() => {
    if (!companyId || !canViewLogs) return;
    reset();
    fetchCompanyLogs(companyId, {
      page: 1,
      startDate: range.from,
      endDate: endOfDay(range.to),
    });
  }, [companyId, canViewLogs, range.from, range.to, fetchCompanyLogs, reset]);

  const hasMore = meta.page < meta.totalPages;

  const handleLoadMore = () => {
    if (!companyId || isLoading || !hasMore) return;
    fetchCompanyLogs(companyId, {
      page: meta.page + 1,
      append: true,
      startDate: range.from,
      endDate: endOfDay(range.to),
    });
  };

  const renderedItems = useMemo(() => items, [items]);

  return (
    <>
      {/* Section header — settings layout convention */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Aktivite günlüğü</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          {/* OWNER/ADMIN dışı roller bu sayfayı göremez — backend 403 dönmeden
              UI'da net bir mesajla durduralım. */}
          {!canViewLogs ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-surface px-4 py-12 text-center">
              <Lock className="h-6 w-6 text-muted" />
              <span className="text-sm font-medium text-foreground">
                Bu sayfaya erişim yetkiniz yok
              </span>
              <span className="text-xs text-muted">
                Aktivite günlüğünü yalnızca şirket sahibi veya yönetici rolündeki
                üyeler görüntüleyebilir.
              </span>
            </div>
          ) : (
          <>
          {/* Filter row 1: meta + date range */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">
              {meta.total > 0
                ? `${meta.total} işlem`
                : isLoading
                  ? ''
                  : 'Kayıt yok'}
            </span>
            <DateRangeInput
              value={range}
              onChange={(next) => {
                if (next) setRange(next);
              }}
              visibleMonths={1}
              tone="muted"
              className="w-[260px]"
            />
          </div>

          <div className="flex flex-col rounded-xl bg-surface">
            {forbidden ? (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <Lock className="mb-1 h-6 w-6 text-muted" />
                <span className="text-sm font-medium text-foreground">
                  Bu sayfaya erişim yetkiniz yok
                </span>
                <span className="text-xs text-muted">
                  Aktivite günlüğünü yalnızca şirket sahibi veya yönetici
                  rolündeki üyeler görüntüleyebilir.
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <span className="text-sm font-medium text-foreground">
                  Aktivite günlüğü açılamadı
                </span>
                <span className="text-xs text-muted">{error}</span>
              </div>
            ) : isLoading && renderedItems.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-10">
                <span className="text-xs text-muted">Yükleniyor…</span>
              </div>
            ) : renderedItems.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <Clock className="mb-1 h-6 w-6 text-muted" />
                <span className="text-sm font-medium text-foreground">
                  Bu aralıkta kayıt yok
                </span>
                <span className="text-xs text-muted">
                  Tarih aralığını değiştirip tekrar deneyin.
                </span>
              </div>
            ) : (
              renderedItems.map((item, index) => {
                const isLast = index === renderedItems.length - 1;
                const derived = deriveAction(item);
                const Icon = derived.icon;
                const tile = colorFor(derived.colorKey);
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 ${
                      !isLast ? 'border-b border-black/[0.04]' : ''
                    }`}
                  >
                    {/* Action tile (deterministic color) */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white ${tile}`}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Body — title is a full Turkish sentence. */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="truncate text-sm text-foreground/85">
                          <span className="font-medium text-foreground">
                            {userName(item)}
                          </span>{' '}
                          <span className="text-foreground/70">
                            {derived.verb}
                          </span>
                        </p>
                        {!item.success && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                            <CircleXmark className="h-3 w-3" />
                            Hata
                          </span>
                        )}
                      </div>

                      {item.errorMessage && (
                        <span className="truncate text-xs text-rose-600/80">
                          {item.errorMessage}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div
                      className="shrink-0 text-right text-xs text-muted"
                      title={formatExactTime(item.createdAt)}
                    >
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hasMore && !error && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="tertiary"
                onPress={handleLoadMore}
                isPending={isLoading}
                isDisabled={isLoading}
                className="h-8 cursor-pointer rounded-full bg-black/[0.06] px-3 text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
              >
                Daha fazla göster
              </Button>
            </div>
          )}

          {!hasMore && renderedItems.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted">
              <CircleCheckFill className="h-3 w-3" />
              <span>Tüm kayıtlar gösterildi · {meta.total} işlem</span>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </>
  );
}
