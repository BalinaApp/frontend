'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRotateLeft,
  Check,
  CircleXmark,
  Magnifier,
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
type SortField = 'lastOrderAt' | 'orderCount' | 'totalSpent' | 'email';
type SortOrder = 'asc' | 'desc';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tüm Kontaklar' },
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
  const [sortField, setSortField] = useState<SortField>('lastOrderAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    if (!currentCompany?.id) return;
    fetchContacts(currentCompany.id, {
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
      limit: 1000,
    });
  }, [currentCompany?.id, search, status, fetchContacts]);

  // Client-side sort — backend default lastOrderAt desc; kolon başlığı
  // tıklandığında lokal olarak yeniden sıralanır.
  const visibleContacts = useMemo(() => {
    const list = [...contacts];
    const sign = sortOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case 'email':
          return sign * a.email.localeCompare(b.email, 'tr');
        case 'orderCount':
          return sign * (a.orderCount - b.orderCount);
        case 'totalSpent': {
          const an = Number(a.totalSpent ?? 0);
          const bn = Number(b.totalSpent ?? 0);
          return sign * (an - bn);
        }
        case 'lastOrderAt':
        default: {
          const at = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
          const bt = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
          return sign * (at - bt);
        }
      }
    });
    return list;
  }, [contacts, sortField, sortOrder]);

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
        title="Pazarlama"
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

      <div className="flex flex-col">
        {/* ============== Filter row (Products page ile aynı yapı) ============== */}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_TABS.map((t) => (
                <TabPill
                  key={t.id}
                  selected={status === t.id}
                  onPress={() => setStatus(t.id)}
                >
                  {t.label}
                </TabPill>
              ))}
            </div>
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
          </div>
          <p className="text-xs text-muted">
            Bağlı tüm mağazalardaki siparişlerden toplanan{' '}
            <span className="font-medium text-foreground">{total}</span> kontak.
          </p>
        </div>

        {/* ============== Header + rows (p-2.5 gap-2.5) ============== */}
        <div className="flex flex-col gap-2.5 p-2.5">
          {/* Column header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-2">
              <SortHeaderButton
                field="email"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              >
                Müşteri
              </SortHeaderButton>
            </div>
            <div className="flex flex-1 items-center gap-20">
              <div className="flex flex-1 items-center gap-2">
                <SortHeaderButton
                  field="orderCount"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Siparişler
                </SortHeaderButton>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <SortHeaderButton
                  field="totalSpent"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Toplam Harcama
                </SortHeaderButton>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <SortHeaderButton
                  field="lastOrderAt"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Son Sipariş
                </SortHeaderButton>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium leading-4 text-muted">
                  Durum
                </span>
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col">
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
                  {/* LEFT half — avatar + email + ad soyad */}
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

                  {/* RIGHT half — 4 cells, flex-1, gap-20 (products pattern) */}
                  <div className="flex flex-1 items-center gap-20">
                    <CellWrap>
                      <span className="text-sm text-foreground">
                        {c.orderCount}
                      </span>
                    </CellWrap>
                    <CellWrap>
                      <span className="text-sm text-foreground">
                        {formatCurrency(c.totalSpent)}
                      </span>
                    </CellWrap>
                    <CellWrap>
                      <span className="text-sm text-foreground">
                        {formatDate(c.lastOrderAt)}
                      </span>
                    </CellWrap>
                    <CellWrap>
                      <button
                        type="button"
                        onClick={() => handleToggleUnsubscribed(c)}
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                          c.isUnsubscribed
                            ? 'bg-danger/10 text-danger hover:bg-danger/15'
                            : c.status === 'bounced' ||
                                c.status === 'complained'
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
                    </CellWrap>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Reused helpers (Products page pattern, local inline) -----------------

function TabPill({
  selected,
  onPress,
  children,
}: {
  selected?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-medium text-foreground transition-colors',
        selected ? 'bg-foreground/[0.10]' : 'hover:bg-foreground/[0.10]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function CellWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex min-w-fit flex-1 flex-col items-start justify-start gap-2.5">
      {children}
    </div>
  );
}

function SortHeaderButton({
  field,
  currentField,
  currentOrder,
  onSort,
  children,
}: {
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="group inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium leading-4 text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      {children}
      <ArrowDown
        className={[
          'h-3 w-3 opacity-0 transition-all group-hover:opacity-100',
          isActive && currentOrder === 'asc' ? 'rotate-180' : '',
        ].join(' ')}
      />
    </button>
  );
}
