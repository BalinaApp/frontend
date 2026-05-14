'use client';

import { useEffect, useState } from 'react';
import { Clock, CircleXmark } from '@gravity-ui/icons';
import { useAuditLogStore, AuditLogItem } from '@/stores/auditLogStore';

interface Props {
  /** Backend `resource` alanı — örn. "Store", "Order", "Product". */
  resource: string;
  /** Kaynak id (cuid). */
  resourceId: string;
  /** Listelenecek max kayıt. */
  limit?: number;
  /** Boş durumda gösterilecek mesaj. */
  emptyMessage?: string;
  className?: string;
}

const formatRelativeTime = (iso: string): string => {
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
};

const formatExactTime = (iso: string): string =>
  new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const userName = (item: AuditLogItem): string =>
  item.user?.name || item.user?.email || item.userEmail || 'Sistem';

// activity-log/page.tsx'teki ACTION_META + ENDPOINT_RULES haritalamasının
// daraltılmış kopyası — bu feed yalnızca özet olduğu için tam çeviri yerine
// generic fallback yeterli; ileride paylaşılmış bir helper'a refactor edilebilir.
const ACTION_LABELS: Record<string, string> = {
  STORE_CREATE: 'mağaza ekledi',
  STORE_UPDATE: 'mağazayı güncelledi',
  STORE_DELETE: 'mağazayı sildi',
  STORE_TEST_CONNECTION: 'bağlantıyı test etti',
  ORDER_CREATE: 'sipariş oluşturdu',
  ORDER_UPDATE: 'siparişi güncelledi',
  ORDER_REFUND: 'siparişi iade etti',
  ORDER_CANCEL: 'siparişi iptal etti',
  STOCK_UPDATE: 'stok güncelledi',
  STOCK_PUSH_REMOTE: 'pazaryerine stok gönderdi',
};

const verbFor = (item: AuditLogItem): string => {
  const known = ACTION_LABELS[item.action];
  if (known) return known;
  const method = (item.method ?? '').toUpperCase();
  const fallback: Record<string, string> = {
    POST: 'bir işlem oluşturdu',
    PUT: 'bir kaydı güncelledi',
    PATCH: 'bir kaydı güncelledi',
    DELETE: 'bir kaydı sildi',
  };
  return fallback[method] ?? 'işlem yaptı';
};

export function ResourceAuditFeed({
  resource,
  resourceId,
  limit = 10,
  emptyMessage = 'Bu kaynak için kayıt bulunamadı.',
  className,
}: Props) {
  const fetchResourceLogs = useAuditLogStore((s) => s.fetchResourceLogs);
  const [items, setItems] = useState<AuditLogItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    fetchResourceLogs(resource, resourceId, { limit, page: 1 }).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [resource, resourceId, limit, fetchResourceLogs]);

  if (items === null) {
    return (
      <div
        className={`flex items-center justify-center px-4 py-6 text-xs text-muted ${
          className ?? ''
        }`}
      >
        Yükleniyor…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`flex flex-col items-center gap-1 px-4 py-6 text-center ${
          className ?? ''
        }`}
      >
        <Clock className="h-5 w-5 text-muted" />
        <span className="text-xs text-muted">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col rounded-xl bg-surface-secondary/50 ${className ?? ''}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 px-3 py-2.5 ${
              !isLast ? 'border-b border-black/[0.04]' : ''
            }`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="truncate text-xs text-foreground/85">
                  <span className="font-medium text-foreground">
                    {userName(item)}
                  </span>{' '}
                  <span className="text-foreground/70">{verbFor(item)}</span>
                </p>
                {!item.success && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                    <CircleXmark className="h-3 w-3" />
                    Hata
                  </span>
                )}
              </div>
              {item.errorMessage && (
                <span className="truncate text-[11px] text-rose-600/80">
                  {item.errorMessage}
                </span>
              )}
            </div>
            <div
              className="shrink-0 text-right text-[11px] text-muted"
              title={formatExactTime(item.createdAt)}
            >
              {formatRelativeTime(item.createdAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
