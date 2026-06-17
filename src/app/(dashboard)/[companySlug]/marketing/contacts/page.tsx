'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  Calendar,
  Check,
  CircleDashed,
  CircleXmark,
  Envelope,
  Person,
  Plus,
  Tag,
  TrashBin,
} from '@gravity-ui/icons';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import {
  BalinaMailIcon,
  BalinaButton,
  BalinaCheckbox,
  BalinaConfirmDialog,
  BalinaModal,
  BalinaTextField,
  toast,
} from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useSavedFilterStore } from '@/stores/savedFilterStore';
import { useSidePanel } from '@/components/providers/SidePanel';
import { FilterPopover } from '@/components/products/filter-popover';
import { ActiveFilterChips } from '@/components/products/active-filter-chips';
import { SavedTab } from '@/components/products/saved-tab';
import { AddContactPanel } from '@/components/marketing/add-contact-panel';
import {
  applyFilterPayload,
  clearFilters as clearAllFilters,
} from '@/components/products/filter-types';
import type { FilterDef } from '@/components/products/filter-types';
import {
  useMarketingStore,
  type MarketingContact,
} from '@/stores/marketingStore';

const CONTEXT = 'marketing-contacts';

type StatusFilter = 'all' | 'active' | 'unsubscribed' | 'bounced';
type SortField = 'lastOrderAt' | 'orderCount' | 'totalSpent' | 'email';
type SortOrder = 'asc' | 'desc';

const statusOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif', icon: Check },
  { value: 'unsubscribed', label: 'Aboneliği iptal', icon: CircleXmark },
  { value: 'bounced', label: 'Bounce / Şikayet', icon: CircleXmark },
];

function storeFaviconUrl(url?: string | null): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = url.startsWith('http') ? new URL(url).hostname : url;
  } catch {
    host = url;
  }
  if (!host || host === 'example.com') return null;
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
}

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
  usePageTitle('Pazarlama');
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    contacts,
    isLoading,
    fetchContacts,
    createContact,
    setUnsubscribed,
    deleteContact,
    backfillFromOrders,
  } = useMarketingStore();

  // Manuel kontak ekleme — sağ drawer (useSidePanel ile).
  const { setSidePanel } = useSidePanel();

  // Filter state — products page ile birebir aynı pattern (useState'ler
  // + filterDefs[] + applyFilterPayload kullanımı).
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [emailQuery, setEmailQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Sıralama + bulk select
  const [sortField, setSortField] = useState<SortField>('lastOrderAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Confirm dialogs
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUnsubscribing, setIsBulkUnsubscribing] = useState(false);

  // İlk açılışta liste boşsa arka planda backfill — sessiz, toast yok.
  // Idempotent: backend zaten companyId+email unique olduğu için tekrar
  // çağırmak güvenli. Yeni siparişler için per-order hook çalıştığından
  // bu yalnızca "ilk kurulum / geçmişten ilk senkron" senaryosu için.
  const [autoBackfilled, setAutoBackfilled] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Mağaza listesi — filter dropdown'ında kullanılır.
  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  // Saved filter setleri — products pattern.
  const fetchSaved = useSavedFilterStore((s) => s.fetch);
  const allSavedFilters = useSavedFilterStore((s) => s.filters);
  const updateSaved = useSavedFilterStore((s) => s.update);
  const removeSaved = useSavedFilterStore((s) => s.remove);
  const createSaved = useSavedFilterStore((s) => s.create);
  const savedFilters = useMemo(
    () => allSavedFilters.filter((f) => f.context === CONTEXT),
    [allSavedFilters],
  );
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  useEffect(() => {
    if (currentCompany?.id) fetchSaved(currentCompany.id, CONTEXT);
  }, [currentCompany?.id, fetchSaved]);

  // Saved tab rename modal
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const openRename = (id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
  };
  const submitRename = async () => {
    if (!currentCompany?.id || !renameId) return;
    const name = renameValue.trim();
    if (!name) return;
    setIsRenaming(true);
    try {
      const ok = await updateSaved(currentCompany.id, renameId, { name });
      if (ok) {
        toast.success('Yeniden adlandırıldı');
        setRenameId(null);
      }
    } finally {
      setIsRenaming(false);
    }
  };
  const handleDuplicate = async (sf: {
    name: string;
    payload: Record<string, string | string[]>;
  }) => {
    if (!currentCompany?.id) return;
    const result = await createSaved(
      currentCompany.id,
      CONTEXT,
      `${sf.name} (kopya)`,
      sf.payload,
    );
    if (result) toast.success('Kopya oluşturuldu');
    else toast.danger('Kopyalanamadı');
  };
  const [deleteSavedId, setDeleteSavedId] = useState<string | null>(null);
  const handleDeleteSaved = (id: string) => setDeleteSavedId(id);
  const handleConfirmDeleteSaved = async () => {
    if (!currentCompany?.id || !deleteSavedId) return;
    const ok = await removeSaved(currentCompany.id, deleteSavedId);
    if (ok) {
      toast.success('Silindi');
      if (activeSavedId === deleteSavedId) setActiveSavedId(null);
    }
    setDeleteSavedId(null);
  };

  // Mağaza filter seçenekleri
  const storeOptions = useMemo(
    () => [
      { value: 'all', label: 'Tüm mağazalar' },
      ...stores.map((s) => ({ value: s.id, label: s.name })),
    ],
    [stores],
  );

  const filterDefs: FilterDef[] = [
    {
      id: 'status',
      label: 'Durum',
      icon: CircleDashed,
      searchPlaceholder: 'Durumu değiştir...',
      type: 'select',
      defaultValue: 'all',
      value: statusFilter,
      onChange: (v) => setStatusFilter(v as StatusFilter),
      options: statusOptions,
    },
    {
      id: 'store',
      label: 'Mağaza',
      icon: Tag,
      searchPlaceholder: 'Mağaza seç...',
      type: 'select',
      defaultValue: 'all',
      value: storeFilter,
      onChange: setStoreFilter,
      options: storeOptions,
      optionIconUrl: (value) => {
        if (value === 'all') return null;
        const store = stores.find((s) => s.id === value);
        return storeFaviconUrl(store?.url);
      },
    },
    {
      id: 'email',
      label: 'E-posta',
      icon: Envelope,
      preposition: 'ile',
      type: 'text',
      placeholder: 'E-posta veya isim',
      value: emailQuery,
      onChange: setEmailQuery,
    },
    {
      id: 'date',
      label: 'Son sipariş',
      icon: Calendar,
      preposition: 'arası',
      type: 'text',
      widget: 'date-range',
      value: dateFilter,
      onChange: setDateFilter,
    },
  ];

  // Backend'e gönderilen liste sorgusu (status + storeId + search yalnızca
  // serverside; source/date frontend-side filtreleme — backend bunları
  // henüz desteklemiyor).
  const fetchData = useCallback(() => {
    if (!currentCompany?.id) return;
    fetchContacts(currentCompany.id, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      storeId: storeFilter !== 'all' ? storeFilter : undefined,
      search: emailQuery.trim() || undefined,
      limit: 1000,
    });
  }, [
    currentCompany?.id,
    statusFilter,
    storeFilter,
    emailQuery,
    fetchContacts,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // İlk fetch tamamlandıktan sonra liste hala boşsa otomatik backfill —
  // ilk açılışta kullanıcının manuel buton tıklamasına gerek kalmaz.
  // useEffect deps: contacts.length değişirse (backfill sonrası dolarsa)
  // koşul false olur, tekrar tetiklenmez.
  useEffect(() => {
    if (
      !currentCompany?.id ||
      autoBackfilled ||
      isLoading ||
      contacts.length > 0
    ) {
      return;
    }
    setAutoBackfilled(true);
    void backfillFromOrders(currentCompany.id);
  }, [
    currentCompany?.id,
    autoBackfilled,
    isLoading,
    contacts.length,
    backfillFromOrders,
  ]);

  // Tarih aralığı client-side; status + storeId + search backend'de.
  const visibleContacts = useMemo(() => {
    let list = contacts;

    if (dateFilter.trim()) {
      const [fromStr, toStr] = dateFilter.split('..').map((s) => s.trim());
      const fromTs = fromStr ? new Date(fromStr).getTime() : null;
      const toTs = toStr
        ? new Date(toStr).setHours(23, 59, 59, 999)
        : fromStr
          ? new Date(fromStr).setHours(23, 59, 59, 999)
          : null;
      list = list.filter((c) => {
        if (!c.lastOrderAt) return false;
        const t = new Date(c.lastOrderAt).getTime();
        if (fromTs != null && t < fromTs) return false;
        if (toTs != null && t > toTs) return false;
        return true;
      });
    }

    const sign = sortOrder === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
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
  }, [contacts, dateFilter, sortField, sortOrder]);

  // ---- Handlers -----------------------------------------------------------

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

  const openAddContact = () => {
    setSidePanel(
      <AddContactPanel onClose={() => setSidePanel(null)} />,
    );
  };

  // ---- Bulk operations ----------------------------------------------------

  const allSelectedUnsubscribed =
    selected.size > 0 &&
    Array.from(selected)
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean)
      .every((c) => c && c.isUnsubscribed);

  const handleBulkUnsubscribe = async () => {
    if (!currentCompany?.id || selected.size === 0) return;
    setIsBulkUnsubscribing(true);
    const next = !allSelectedUnsubscribed;
    let updated = 0;
    for (const id of selected) {
      const ok = await setUnsubscribed(currentCompany.id, id, next);
      if (ok) updated++;
    }
    setIsBulkUnsubscribing(false);
    setSelected(new Set());
    if (updated > 0) {
      toast.success(
        next
          ? `${updated} kontak abonelikten çıkarıldı`
          : `${updated} kontak yeniden dahil edildi`,
      );
    } else {
      toast.danger('Hiçbir kontak güncellenemedi');
    }
  };

  const handleBulkDelete = async () => {
    if (!currentCompany?.id || selected.size === 0) return;
    setIsBulkDeleting(true);
    let deleted = 0;
    for (const id of selected) {
      const ok = await deleteContact(currentCompany.id, id);
      if (ok) deleted++;
    }
    setIsBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelected(new Set());
    if (deleted > 0) toast.success(`${deleted} kontak silindi`);
    else toast.danger('Hiçbir kontak silinemedi');
  };

  // ---- Render -------------------------------------------------------------

  return (
    <>
      {/* Bulk delete confirm dialog */}
      <BalinaConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!isBulkDeleting && !open) setBulkDeleteOpen(false);
        }}
        title="Kontakları sil"
        description={`${selected.size} kontak kalıcı olarak silinecek. Geri alınamaz — tekrar senkronize etmek istersen geçmiş siparişlerden yeniden gelecektir.`}
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onConfirm={handleBulkDelete}
        danger
        loading={isBulkDeleting}
      />

      {/* Saved filter sil onayı */}
      <BalinaConfirmDialog
        open={deleteSavedId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSavedId(null);
        }}
        title="Filtre setini sil"
        description="Bu filtre seti kalıcı olarak silinecek."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onConfirm={handleConfirmDeleteSaved}
        danger
      />

      <PageHeader
        title="Kontaklar"
        icon={<BalinaMailIcon className="h-4 w-4" />}
        action={
          <BalinaButton
            variant="soft"
            size="small"
            onClick={openAddContact}
            disabled={!currentCompany?.id}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Kontak ekle
          </BalinaButton>
        }
      />

      <div className="flex flex-col">
        {/* ============== Filter row (Products page ile birebir) ============== */}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <TabPill
                selected={activeSavedId === null}
                onPress={() => {
                  setActiveSavedId(null);
                  clearAllFilters(filterDefs);
                }}
              >
                Tüm Kontaklar
              </TabPill>
              {savedFilters.map((sf) => (
                <SavedTab
                  key={sf.id}
                  name={sf.name}
                  isActive={activeSavedId === sf.id}
                  onSelect={() => {
                    setActiveSavedId(sf.id);
                    applyFilterPayload(filterDefs, sf.payload);
                  }}
                  onRename={() => openRename(sf.id, sf.name)}
                  onDuplicate={() => handleDuplicate(sf)}
                  onDelete={() => handleDeleteSaved(sf.id)}
                />
              ))}
            </div>
            <FilterPopover filters={filterDefs} />
          </div>
          <ActiveFilterChips
            filters={filterDefs}
            companyId={currentCompany?.id}
            context={CONTEXT}
            activeSavedFilter={
              savedFilters.find((sf) => sf.id === activeSavedId) ?? null
            }
            onSaved={(sf) => setActiveSavedId(sf.id)}
          />
        </div>

        {/* ============== Header + rows ============== */}
        <div className="flex flex-col gap-2.5 p-2.5">
          {/* Header — row cells ile aynı CellWrap kullan ki flex behavior
              ve içerik hizası birebir eşleşsin. */}
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-3">
              <CellWrap>
                <SortHeaderButton
                  field="email"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Müşteri
                </SortHeaderButton>
              </CellWrap>
            </div>
            <div className="flex flex-1 items-center justify-between">
              <CellWrap className="w-20">
                <SortHeaderButton
                  field="orderCount"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Siparişler
                </SortHeaderButton>
              </CellWrap>
              <CellWrap className="w-32">
                <SortHeaderButton
                  field="totalSpent"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Toplam Harcama
                </SortHeaderButton>
              </CellWrap>
              <CellWrap className="w-28">
                <SortHeaderButton
                  field="lastOrderAt"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Son Sipariş
                </SortHeaderButton>
              </CellWrap>
              <CellWrap className="w-24">
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium leading-4 text-muted">
                  Durum
                </span>
              </CellWrap>
            </div>
          </div>

          <div className="flex flex-col">
            {isLoading && contacts.length === 0 ? (
              <div className="h-12" />
            ) : visibleContacts.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                Kontak bulunamadı
              </div>
            ) : (
              visibleContacts.map((c) => {
                const isChecked = selected.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={[
                      'flex h-[60px] items-center justify-between rounded-2xl p-3 transition-colors',
                      isChecked
                        ? 'bg-foreground/[0.06] hover:bg-foreground/[0.08]'
                        : 'hover:bg-foreground/[0.04]',
                    ].join(' ')}
                  >
                    {/* LEFT — checkbox + avatar + email + name */}
                    <div className="flex flex-1 items-center gap-3">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <BalinaCheckbox
                          checked={isChecked}
                          onCheckedChange={(next) => {
                            setSelected((prev) => {
                              const updated = new Set(prev);
                              if (next) updated.add(c.id);
                              else updated.delete(c.id);
                              return updated;
                            });
                          }}
                        />
                      </div>
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

                    {/* RIGHT — 4 cells (header ile birebir width) */}
                    <div className="flex flex-1 items-center justify-between">
                      <CellWrap className="w-20">
                        <span className="text-sm text-foreground">
                          {c.orderCount}
                        </span>
                      </CellWrap>
                      <CellWrap className="w-32">
                        <span className="text-sm text-foreground">
                          {formatCurrency(c.totalSpent)}
                        </span>
                      </CellWrap>
                      <CellWrap className="w-28">
                        <span className="text-sm text-foreground">
                          {formatDate(c.lastOrderAt)}
                        </span>
                      </CellWrap>
                      <CellWrap className="w-24">
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
                );
              })
            )}
          </div>

          {/* Bulk actions bar — Products bar'ı ile aynı pill stili */}
          {selected.size > 0 && (
            <div className="pointer-events-none fixed bottom-6 left-20 right-1 z-30 flex justify-center">
              <div
                className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-surface/60 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-xl bar-blur-in"
                role="toolbar"
                aria-label={`${selected.size} kontak için işlemler`}
              >
                <span className="px-3 text-xs text-muted">
                  {selected.size} kontak seçildi
                </span>
                <BalinaButton
                  variant="soft"
                  size="default"
                  onClick={handleBulkUnsubscribe}
                  disabled={isBulkUnsubscribing}
                  leftIcon={
                    allSelectedUnsubscribed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <CircleXmark className="h-4 w-4" />
                    )
                  }
                >
                  {allSelectedUnsubscribed ? 'Tekrar dahil et' : 'Aboneliği iptal'}
                </BalinaButton>
                <BalinaButton
                  variant="danger"
                  size="default"
                  onClick={() => setBulkDeleteOpen(true)}
                  aria-label="Seçili kontakları sil"
                  leftIcon={<TrashBin className="h-4 w-4" />}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved filter rename modal — products page'iyle aynı küçük modal,
          inline state ile */}
      {renameId !== null && (
        <RenameModal
          value={renameValue}
          onChange={setRenameValue}
          onCancel={() => setRenameId(null)}
          onSubmit={submitRename}
          isPending={isRenaming}
        />
      )}
    </>
  );
}

// ---- Reused helpers (Products page pattern inline) ------------------------

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

function CellWrap({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        'inline-flex flex-col items-start justify-start gap-2.5',
        className ?? '',
      ].join(' ')}
    >
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

function RenameModal({
  value,
  onChange,
  onCancel,
  onSubmit,
  isPending,
}: {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <BalinaModal
      open={true}
      onOpenChange={(open) => {
        if (!isPending && !open) onCancel();
      }}
      title="Filtre setini adlandır"
      footer={
        <>
          <BalinaButton
            variant="soft"
            size="large"
            onClick={onCancel}
            disabled={isPending}
          >
            Vazgeç
          </BalinaButton>
          <BalinaButton
            variant="primary"
            size="large"
            onClick={onSubmit}
            disabled={isPending}
          >
            Kaydet
          </BalinaButton>
        </>
      }
    >
      <BalinaTextField
        value={value}
        onChange={onChange}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Filtre seti adı"
      />
    </BalinaModal>
  );
}
