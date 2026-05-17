'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRotateLeft,
  Magnifier,
  CircleXmark,
  Check,
  Person,
} from '@gravity-ui/icons';
import { Button, toast } from '@heroui/react';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { useCompanyStore } from '@/stores/companyStore';
import {
  useMarketingStore,
  type MarketingContact,
} from '@/stores/marketingStore';

type StatusFilter = 'all' | 'active' | 'unsubscribed' | 'bounced';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'unsubscribed', label: 'Aboneliği iptal' },
  { id: 'bounced', label: 'Bounce / Şikayet' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: string | number | null): string {
  if (value == null) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return `₺${n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fullName(c: MarketingContact): string {
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

export default function MarketingContactsPage() {
  usePageTitle('Marketing Kontakları');
  const { currentCompany } = useCompanyStore();
  const {
    contacts,
    total,
    isLoading,
    isBackfilling,
    fetchContacts,
    setUnsubscribed,
    backfillFromOrders,
  } = useMarketingStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!currentCompany?.id) return;
    fetchContacts(currentCompany.id, {
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
      limit: 500,
    });
  }, [currentCompany?.id, search, status, fetchContacts]);

  const visibleContacts = useMemo(() => contacts, [contacts]);

  const handleBackfill = async () => {
    if (!currentCompany?.id) return;
    const result = await backfillFromOrders(currentCompany.id);
    if (result) {
      toast.success(
        `${result.uniqueContacts} kontak senkronize edildi (${result.created} yeni, ${result.updated} güncellendi)`,
      );
    } else {
      toast.danger('Senkronizasyon başarısız');
    }
  };

  const handleToggleUnsubscribed = async (c: MarketingContact) => {
    if (!currentCompany?.id) return;
    const next = !c.isUnsubscribed;
    const ok = await setUnsubscribed(currentCompany.id, c.id, next);
    if (ok) {
      toast.success(
        next ? 'Aboneliği iptal edildi' : 'Tekrar mailing listesine eklendi',
      );
    } else {
      toast.danger('Güncellenemedi');
    }
  };

  return (
    <>
      <PageHeader
        title="Marketing Kontakları"
        action={
          <Button
            variant="secondary"
            size="sm"
            onPress={handleBackfill}
            isPending={isBackfilling}
            isDisabled={isBackfilling || !currentCompany?.id}
            className="h-8 rounded-full px-3 text-xs"
          >
            <ArrowRotateLeft className="h-3.5 w-3.5" />
            Geçmiş siparişlerden senkronize et
          </Button>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted">
          Bağlı tüm mağazalardaki siparişlerden toplanan müşteri e-postaları.
          Toplam <span className="font-medium text-foreground">{total}</span>{' '}
          kontak.
        </p>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-surface px-3 py-1.5">
            <Magnifier className="h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="E-posta veya isim ara"
              className="w-56 border-0 bg-transparent p-0 text-xs text-foreground outline-none placeholder:text-muted focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatus(t.id)}
                className={[
                  'inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-medium text-foreground transition-colors',
                  status === t.id
                    ? 'bg-foreground/[0.10]'
                    : 'hover:bg-foreground/[0.06]',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col gap-2.5 p-2.5">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted">
            <div className="flex flex-1 items-center gap-3">
              <span>Müşteri</span>
            </div>
            <div className="flex flex-1 items-center gap-20 text-right">
              <span className="flex-1">Siparişler</span>
              <span className="flex-1">Toplam Harcama</span>
              <span className="flex-1">Son Sipariş</span>
              <span className="flex-1">Durum</span>
            </div>
          </div>

          {isLoading && contacts.length === 0 ? (
            <div className="h-12" />
          ) : visibleContacts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Kontak bulunamadı. Geçmiş siparişlerden senkronize ederek
              başlayın.
            </div>
          ) : (
            visibleContacts.map((c) => (
              <div
                key={c.id}
                className="flex h-[60px] items-center justify-between rounded-2xl p-3 transition-colors hover:bg-foreground/[0.04]"
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default text-muted">
                    <Person className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span
                      className="truncate text-sm font-medium leading-5 text-foreground"
                      title={c.email}
                    >
                      {c.email}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {fullName(c)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-20 text-xs text-foreground">
                  <span className="flex-1">{c.orderCount}</span>
                  <span className="flex-1">{formatCurrency(c.totalSpent)}</span>
                  <span className="flex-1">{formatDate(c.lastOrderAt)}</span>
                  <span className="flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleUnsubscribed(c)}
                      className={[
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                        c.isUnsubscribed
                          ? 'bg-danger/10 text-danger hover:bg-danger/15'
                          : c.status === 'bounced' || c.status === 'complained'
                            ? 'bg-warning/10 text-warning-foreground'
                            : 'bg-success/10 text-success hover:bg-success/15',
                      ].join(' ')}
                    >
                      {c.isUnsubscribed ? (
                        <>
                          <CircleXmark className="h-3 w-3" />
                          Aboneliği iptal
                        </>
                      ) : c.status === 'bounced' ? (
                        <>
                          <CircleXmark className="h-3 w-3" />
                          Bounce
                        </>
                      ) : c.status === 'complained' ? (
                        <>
                          <CircleXmark className="h-3 w-3" />
                          Şikayet
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          Aktif
                        </>
                      )}
                    </button>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
