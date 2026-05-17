'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  Check,
  CircleXmark,
  CircleDashed,
  Clock,
  ArrowUturnCcwLeft,
  Tags,
  Person,
  Tag,
  LayoutSideContentRight,
  Printer,
} from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Checkbox,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from '@heroui/react';
import { api } from '@/services/api';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useOrderStore, Order, OrderDetailItem } from '@/stores/orderStore';
import { useSavedFilterStore } from '@/stores/savedFilterStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { useSidePanel } from '@/components/providers/SidePanel';
import { FilterPopover } from '@/components/products/filter-popover';
import { ActiveFilterChips } from '@/components/products/active-filter-chips';
import { SavedTab } from '@/components/products/saved-tab';
import {
  applyFilterPayload,
  clearFilters as clearAllFilters,
} from '@/components/products/filter-types';
import type { FilterDef } from '@/components/products/filter-types';

type StatusFilter = 'all' | 'completed' | 'processing' | 'cancelled' | 'refunded';

type StatusTone = 'success' | 'accent' | 'warning' | 'danger' | 'muted';

// Backend buildOrderOrderBy whitelist'inden — relation/bilinmeyenler için
// fallback orderDate.
type SortField =
  | 'orderDate'
  | 'total'
  | 'itemsCount'
  | 'status'
  | 'storeName'
  | 'customerName';
type SortOrder = 'asc' | 'desc';

const statusMeta: Record<
  string,
  { label: string; tone: StatusTone; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }
> = {
  completed: { label: 'Tamamlandı', tone: 'success', Icon: Check },
  processing: { label: 'İşleniyor', tone: 'accent', Icon: CircleDashed },
  pending: { label: 'Beklemede', tone: 'warning', Icon: Clock },
  cancelled: { label: 'İptal', tone: 'danger', Icon: CircleXmark },
  refunded: { label: 'İade', tone: 'muted', Icon: ArrowUturnCcwLeft },
  failed: { label: 'Başarısız', tone: 'danger', Icon: CircleXmark },
  'on-hold': { label: 'Bekletiliyor', tone: 'warning', Icon: Clock },
};

const toneClass: Record<StatusTone, string> = {
  success: 'text-success',
  accent: 'text-accent',
  warning: 'text-warning-foreground',
  danger: 'text-danger',
  muted: 'text-muted',
};

// Kargo etiketi basılamaz: sipariş iptal edilmiş veya iade edilmiş.
const LABEL_BLOCKED_STATUSES = new Set([
  'cancelled',
  'refunded',
  'failed',
]);

function isLabelBlockedStatus(status: string): boolean {
  return LABEL_BLOCKED_STATUSES.has(status);
}

const statusOptions: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tüm Siparişler' },
  { id: 'processing', label: 'İşleniyor' },
  { id: 'completed', label: 'Tamamlandı' },
  { id: 'cancelled', label: 'İptal' },
  { id: 'refunded', label: 'İade' },
];

export default function OrdersPage() {
  usePageTitle('Siparişler');

  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    orders,
    ordersTotal,
    ordersPage,
    ordersTotalPages,
    selectedStoreId,
    setSelectedStoreId,
    fetchOrders,
  } = useOrderStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Bulk select — checkbox işaretlemeyle toplu kargo etiketi.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Sıralama — Products page ile aynı pattern. Backend safe mapping yapıyor
  // (storeName relation üzerinden, bilinmeyenler orderDate fallback).
  const [sortField, setSortField] = useState<SortField>('orderDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  // Saved filter setleri — tab strip'inde "Tüm Siparişler" + her saved filter
  // ismi gösterilir. Kaydet butonundan oluşturulan setler bu listede çıkar.
  // Selector tüm array'i döndürür (stable ref); filtre useMemo ile yapılır —
  // aksi halde Zustand her render'da yeni array görüp "getSnapshot should be
  // cached" sonsuz döngü uyarısı verir.
  const fetchSaved = useSavedFilterStore((s) => s.fetch);
  const allSavedFilters = useSavedFilterStore((s) => s.filters);
  const createSaved = useSavedFilterStore((s) => s.create);
  const updateSaved = useSavedFilterStore((s) => s.update);
  const removeSaved = useSavedFilterStore((s) => s.remove);
  const savedFilters = useMemo(
    () => allSavedFilters.filter((f) => f.context === 'orders'),
    [allSavedFilters],
  );
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  useEffect(() => {
    if (currentCompany?.id) fetchSaved(currentCompany.id, 'orders');
  }, [currentCompany?.id, fetchSaved]);

  // Saved tab dropdown aksiyonları: rename modal + duplicate + delete.
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameErr, setRenameErr] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const openRename = (id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
    setRenameErr(null);
  };
  const submitRename = async () => {
    if (!currentCompany?.id || !renameId) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameErr('İsim boş olamaz');
      return;
    }
    setIsRenaming(true);
    try {
      const ok = await updateSaved(currentCompany.id, renameId, { name });
      if (ok) {
        toast.success('Yeniden adlandırıldı');
        setRenameId(null);
      } else {
        setRenameErr('Güncellenemedi');
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
      'orders',
      `${sf.name} (kopya)`,
      sf.payload,
    );
    if (result) toast.success('Kopya oluşturuldu');
    else toast.danger('Kopyalanamadı');
  };
  const [deleteSavedId, setDeleteSavedId] = useState<string | null>(null);
  const [isDeletingSaved, setIsDeletingSaved] = useState(false);
  const deleteSavedName = useMemo(
    () => savedFilters.find((s) => s.id === deleteSavedId)?.name ?? '',
    [savedFilters, deleteSavedId],
  );
  const handleDeleteSaved = (id: string) => setDeleteSavedId(id);
  const handleConfirmDeleteSaved = async () => {
    if (!currentCompany?.id || !deleteSavedId) return;
    setIsDeletingSaved(true);
    try {
      const ok = await removeSaved(currentCompany.id, deleteSavedId);
      if (ok) {
        toast.success('Silindi');
        if (activeSavedId === deleteSavedId) {
          setActiveSavedId(null);
          clearAllFilters(filterDefs);
        }
        setDeleteSavedId(null);
      } else {
        toast.danger('Silinemedi');
      }
    } finally {
      setIsDeletingSaved(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    // Aynı satıra tekrar tıklarsa drawer'ı kapatır (toggle davranışı).
    setSelectedOrder((prev) => (prev?.id === order.id ? null : order));
  };

  // SidePanel — content card'ın sibling'i olarak layout seviyesinde render
  // edilen sağ panel. selectedOrder değiştiğinde içerik güncellenir; null
  // olunca panel slot tamamen gizlenir.
  const { setSidePanel } = useSidePanel();
  useEffect(() => {
    if (!selectedOrder) {
      setSidePanel(null);
      return;
    }
    setSidePanel(
      <OrderDetailDrawer
        order={selectedOrder}
        store={stores.find((s) => s.id === selectedOrder.store?.id)}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onClose={() => setSelectedOrder(null)}
      />,
    );
    return () => setSidePanel(null);
  }, [selectedOrder, stores, setSidePanel]);

  // Arama: sipariş no + müşteri ikisi de aynı backend `search` parametresine
  // bağlanıyor. Müşteri filtresi ayrı görünsün diye ayrı state'te tutuluyor
  // ama backend tek alan bekliyor — boş olmayanı gönderiyoruz, ikisi de
  // doluysa virgülle birleştiriyoruz (basit fallback).
  const fetchOrdersList = useCallback(() => {
    if (!currentCompany?.id) return;
    const search = [searchQuery, customerQuery].filter(Boolean).join(' ').trim();
    fetchOrders(currentCompany.id, {
      page: 1,
      limit: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
      sortBy: sortField,
      sortOrder,
    });
  }, [
    currentCompany?.id,
    statusFilter,
    searchQuery,
    customerQuery,
    sortField,
    sortOrder,
    fetchOrders,
  ]);

  useEffect(() => {
    fetchOrdersList();
  }, [fetchOrdersList]);

  const handlePageChange = (page: number) => {
    if (!currentCompany?.id) return;
    const search = [searchQuery, customerQuery].filter(Boolean).join(' ').trim();
    fetchOrders(currentCompany.id, {
      page,
      limit: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
      sortBy: sortField,
      sortOrder,
    });
  };

  const formatCurrency = (num: number) =>
    num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }));

  // Durum filtresinin "Tüm Siparişler" girişi pill tab'larda vardı; FilterPopover
  // içinde "Tümü" satırı kullanmıyoruz (Products page'iyle tutarlı) — default
  // 'all' değerinden çıkmak için chip'in X'i veya başka bir option seçilir.
  const filterDefs: FilterDef[] = [
    {
      id: 'status',
      label: 'Durum',
      icon: CircleDashed,
      searchPlaceholder: 'Durum değiştir...',
      type: 'select',
      defaultValue: 'all',
      value: statusFilter,
      onChange: (v) => setStatusFilter(v as StatusFilter),
      // Her seçeneğin ikonu statusMeta'dan — submenu satırlarında
      // semantic ikon (Check/CircleDashed/CircleXmark vb.) görünür.
      options: statusOptions
        .filter((o) => o.id !== 'all')
        .map((o) => ({
          value: o.id,
          label: o.label,
          icon: statusMeta[o.id]?.Icon,
        })),
    },
    {
      id: 'store',
      label: 'Mağaza',
      icon: Tag,
      searchPlaceholder: 'Mağaza değiştir...',
      type: 'select',
      defaultValue: 'all',
      value: selectedStoreId ?? 'all',
      onChange: (v) => setSelectedStoreId(v === 'all' ? null : v),
      options: storeOptions,
      // Her mağaza seçeneğinin yanında 16×16 favicon — products page'iyle
      // birebir aynı pattern.
      optionIconUrl: (value) => {
        if (value === 'all') return null;
        const store = stores.find((s) => s.id === value);
        return storeFaviconUrl(store?.url);
      },
    },
    {
      id: 'orderNo',
      label: 'Sipariş No',
      icon: Tags,
      searchPlaceholder: 'Sipariş no ara...',
      preposition: 'ile',
      type: 'text',
      placeholder: 'Sipariş no ile ara',
      value: searchQuery,
      onChange: setSearchQuery,
    },
    {
      id: 'customer',
      label: 'Müşteri',
      icon: Person,
      searchPlaceholder: 'Müşteri ara...',
      preposition: 'ile',
      type: 'text',
      placeholder: 'Müşteri adı/e-posta',
      value: customerQuery,
      onChange: setCustomerQuery,
    },
  ];

  return (
    <>
      <PageHeader title="Siparişler" />

      {/* Sipariş detay paneli artık layout seviyesinde sibling card olarak
          render ediliyor — burada wrap edici flex split yok, sayfa düz. */}
      <div className="flex flex-col">
        {/* ============== Filter row (Products page'iyle birebir) ==============
            Sol: pill tabs ("Tüm Siparişler" + dinamik saved filter setleri).
            Sağ: FilterPopover icon button.
            Alt: ActiveFilterChips (aktif filtre varsa render edilir). */}
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
                Tüm Siparişler
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
          {/* Aktif filtre alanı — Linear-style segmented chip + Temizle/Kaydet.
              Kaydet sonrası onSaved ile yeni saved tab'ı aktif yap → chips
              alanı otomatik saklanır (products pattern'i ile aynı). */}
          <ActiveFilterChips
            filters={filterDefs}
            companyId={currentCompany?.id}
            context="orders"
            activeSavedFilter={
              savedFilters.find((sf) => sf.id === activeSavedId) ?? null
            }
            onSaved={(sf) => setActiveSavedId(sf.id)}
          />
        </div>

        {/* ============== Header + rows ============== */}
        <div className="flex flex-col gap-2.5 p-2.5">
          {/* Column header — left half: order, right half: 4 cols
              (Durum/Mağaza/Tutar/Tarih hepsi sıralanabilir, products pattern'i). */}
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="px-1">
                <span className="text-xs font-medium leading-4 text-muted">
                  Sipariş / Müşteri
                </span>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-between">
              <div className="w-20">
                <SortHeaderButton
                  field="status"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Durum
                </SortHeaderButton>
              </div>
              <div className="w-28">
                <SortHeaderButton
                  field="storeName"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Mağaza
                </SortHeaderButton>
              </div>
              <div className="w-24">
                <SortHeaderButton
                  field="total"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Tutar
                </SortHeaderButton>
              </div>
              <div className="w-32">
                <SortHeaderButton
                  field="orderDate"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Tarih
                </SortHeaderButton>
              </div>
            </div>
          </div>

          {/* Rows — products page ile aynı pattern: div role="button",
              checkbox, hover bg, seçili bg. */}
          <div className="flex flex-col">
            {orders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                Sipariş bulunamadı
              </div>
            ) : (
              orders.map((order) => {
                const isChecked = selected.has(order.id);
                // İptal/iade siparişler için kargo etiketi anlamsız —
                // checkbox kapalı.
                const isShippable = !isLabelBlockedStatus(order.status);
                return (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOrderClick(order)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOrderClick(order);
                      }
                    }}
                    className={[
                      'flex h-[60px] cursor-pointer items-center justify-between overflow-hidden rounded-2xl p-3 transition-colors',
                      isChecked
                        ? 'bg-foreground/[0.06] hover:bg-foreground/[0.08]'
                        : 'hover:bg-foreground/[0.04]',
                    ].join(' ')}
                  >
                    {/* LEFT half — checkbox + icon + order/customer */}
                    <div className="flex flex-1 items-center gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          isSelected={isChecked}
                          isDisabled={!isShippable}
                          onChange={(next) => {
                            setSelected((prev) => {
                              const updated = new Set(prev);
                              if (next) updated.add(order.id);
                              else updated.delete(order.id);
                              return updated;
                            });
                          }}
                          aria-label={
                            isShippable
                              ? `${order.orderNumber} seç`
                              : `${order.orderNumber} — iptal/iade siparişler için kargo etiketi basılamaz`
                          }
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default">
                        <Image
                          src="/figma/balina-logo.svg"
                          alt=""
                          width={20}
                          height={20}
                          className="opacity-70"
                        />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium leading-5 text-foreground">
                          {formatOrderNo(order.orderNumber)}
                        </span>
                        <span className="truncate text-xs leading-4 text-muted">
                          {order.customerName || 'Misafir'}
                          {order.customerEmail ? ` · ${order.customerEmail}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT half — 4 cells */}
                    <div className="flex flex-1 items-center justify-between">
                      <CellWrap className="w-20">
                        <OrderStatusChip status={order.status} />
                      </CellWrap>
                      <CellWrap className="w-28">
                        <StoreSourceChip
                          store={stores.find((s) => s.id === order.store?.id)}
                          fallbackName={order.store?.name}
                        />
                      </CellWrap>
                      <CellWrap className="w-24">
                        <span className="text-xs font-medium leading-4 text-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </CellWrap>
                      <CellWrap className="w-32">
                        <span className="text-xs font-medium leading-4 text-muted">
                          {formatDate(order.orderDate)}
                        </span>
                      </CellWrap>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bulk actions bar — checkbox seçildiğinde sayfanın altında
              fixed pill: "Kargo Etiketi Bas" tek aksiyon. */}
          <OrdersBulkActionsBar
            count={selected.size}
            onPrintLabels={() => {
              if (selected.size === 0) return;
              // Güvenlik: iptal/iade siparişler son anda filtrelenir
              // (checkbox zaten disabled ama defansif).
              const eligibleIds = Array.from(selected).filter((id) => {
                const o = orders.find((x) => x.id === id);
                return o && !isLabelBlockedStatus(o.status);
              });
              if (eligibleIds.length === 0) {
                toast.danger(
                  'İptal/iade siparişler için kargo etiketi basılamaz',
                );
                return;
              }
              // Kargo entegrasyonu backend bağlantısı henüz yok — placeholder.
              toast.success(
                `${eligibleIds.length} sipariş için kargo etiketi kuyruğa alındı`,
              );
              setSelected(new Set());
            }}
          />

          {/* ============== Pagination ============== */}
          {ordersTotalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl px-3 py-2">
              <span className="text-xs leading-4 text-muted">
                Toplam {ordersTotal} sipariş
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="tertiary"
                  size="sm"
                  isDisabled={ordersPage === 1}
                  onPress={() => handlePageChange(ordersPage - 1)}
                >
                  Önceki
                </Button>
                <span className="text-xs text-muted">
                  {ordersPage} / {ordersTotalPages}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  isDisabled={ordersPage === ordersTotalPages}
                  onPress={() => handlePageChange(ordersPage + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* Order detail panel artık layout seviyesinde render ediliyor —
            useSidePanel useEffect'i selectedOrder değişiminde push ediyor.
            Content card içinde inline drawer yok. */}
      </div>

      {/* Saved filter rename modal */}
      <Modal
        isOpen={renameId !== null}
        onOpenChange={(open) => {
          if (!open && !isRenaming) setRenameId(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Filtre setini yeniden adlandır</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="px-3 pb-2">
                <TextField
                  value={renameValue}
                  onChange={(v) => {
                    setRenameValue(v);
                    if (renameErr) setRenameErr(null);
                  }}
                  isInvalid={!!renameErr}
                  autoFocus
                >
                  <Label>İsim</Label>
                  <Input placeholder="Filtre seti adı" />
                  {renameErr && <FieldError>{renameErr}</FieldError>}
                </TextField>
              </Modal.Body>
              <Modal.Footer className="px-3 pb-3">
                <Button variant="tertiary" slot="close" isDisabled={isRenaming}>
                  Vazgeç
                </Button>
                <Button
                  variant="primary"
                  onPress={submitRename}
                  isPending={isRenaming}
                  isDisabled={isRenaming}
                >
                  Kaydet
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Saved filter delete confirm */}
      <AlertDialog
        isOpen={deleteSavedId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingSaved) setDeleteSavedId(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Filtre setini sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-3 pb-2">
                <p>
                  <strong>{deleteSavedName}</strong> filtre seti silinecek. Bu
                  işlem geri alınamaz.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer className="px-3 pb-3">
                <Button variant="tertiary" slot="close" isDisabled={isDeletingSaved}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={handleConfirmDeleteSaved}
                  isPending={isDeletingSaved}
                  isDisabled={isDeletingSaved}
                >
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}

// ---- Order detail drawer (right side; content area shrinks) --------------
// Position: relative (flex item, position absolute değil). Content area'nın
// translucent kart stilinden esinlenmiş ama parent kartın içinde olduğu için
// sadece sol kenarda hairline divider ile ayrılır. Bottom'da "Kargo etiketi
// bas" sticky action butonu var.

function OrderDetailDrawer({
  order,
  store,
  formatCurrency,
  formatDate,
  onClose,
}: {
  order: Order;
  store?: { id: string; name: string; url: string; platform?: string };
  formatCurrency: (n: number) => string;
  formatDate: (s: string) => string;
  onClose: () => void;
}) {
  // Kargo etiketi modal'ı — MNG createBarcode endpoint'i için desi/kg/içerik
  // alır; submit edince backend `/company/:companyId/cargo/barcode` çağrılıp
  // tracking number alınır, ardından iframe ile print dialog'u açılır.
  const currentCompanyId = useCompanyStore((s) => s.currentCompany?.id);

  // Sipariş detayı — items + refunds + shipments için yeni endpoint.
  const selectedOrderDetail = useOrderStore((s) => s.selectedOrderDetail);
  const isOrderDetailLoading = useOrderStore((s) => s.isOrderDetailLoading);
  const orderDetailError = useOrderStore((s) => s.orderDetailError);
  const fetchOrderDetail = useOrderStore((s) => s.fetchOrderDetail);
  const clearOrderDetail = useOrderStore((s) => s.clearOrderDetail);

  useEffect(() => {
    if (!currentCompanyId || !order.id) return;
    fetchOrderDetail(currentCompanyId, order.id);
    return () => {
      clearOrderDetail();
    };
  }, [currentCompanyId, order.id, fetchOrderDetail, clearOrderDetail]);

  // Detay objesinde items varsa kullan; yoksa boş array
  const detail =
    selectedOrderDetail && selectedOrderDetail.id === order.id
      ? selectedOrderDetail
      : null;
  const [cargoOpen, setCargoOpen] = useState(false);
  const [cargoDesi, setCargoDesi] = useState('1');
  const [cargoKg, setCargoKg] = useState('1');
  const [cargoContent, setCargoContent] = useState('');
  const [cargoErr, setCargoErr] = useState<string | null>(null);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  // MNG referenceId: alphanumeric + uppercase, max 30. Order number'dan
  // # ve diğer non-alnum karakterleri at.
  const mngReferenceId = (order.orderNumber || '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 30);

  const openCargoModal = () => {
    if (!mngReferenceId) {
      toast.danger('Sipariş no MNG referansına çevrilemedi');
      return;
    }
    setCargoDesi('1');
    setCargoKg('1');
    setCargoContent(
      `${order.customerName || 'Misafir'} - ${order.itemsCount} ürün`,
    );
    setCargoErr(null);
    setCargoOpen(true);
  };

  const handleSubmitCargo = async () => {
    if (!currentCompanyId) {
      setCargoErr('Aktif şirket seçili değil');
      return;
    }
    const desi = Number(cargoDesi);
    const kg = Number(cargoKg);
    if (!Number.isInteger(desi) || desi < 0 || desi > 99) {
      setCargoErr('Desi 0-99 arası tam sayı olmalı');
      return;
    }
    if (!Number.isInteger(kg) || kg < 0 || kg > 99) {
      setCargoErr('Kg 0-99 arası tam sayı olmalı');
      return;
    }
    const content = cargoContent.trim().slice(0, 200);
    if (!content) {
      setCargoErr('İçerik gerekli');
      return;
    }

    setIsCreatingLabel(true);
    setCargoErr(null);
    try {
      // Defaults: COD kapalı, paket type "Paket" (1), hata durumunda barcode
      // bas (1). Bu alanlar MNG DTO zorunlu — boş bırakılamaz.
      const { data } = await api.post(
        `/company/${currentCompanyId}/cargo/barcode`,
        {
          referenceId: mngReferenceId,
          isCOD: 0,
          codAmount: 0,
          printReferenceBarcodeOnError: 1,
          additionalContent1: '',
          additionalContent2: '',
          additionalContent3: '',
          packagingType: 1,
          // MNG yalnızca '', TRND, GG, N11 kabul ediyor; geçersizse Code 26029.
          // WC = kendi site → boş string. Pazaryeri eklendiğinde ilgili kod
          // (TRND/GG/N11) gönderilmeli.
          marketPlaceShortCode: '',
          orderPieceList: [
            {
              barcode: mngReferenceId,
              desi,
              kg,
              content,
            },
          ],
        },
      );
      // Backend idempotency guard: bu sipariş için zaten barkod varsa MNG'ye
      // tekrar gitmeden mevcut bilgi döner. Kullanıcıya farklı toast göster.
      const alreadyExists =
        data && typeof data === 'object' && (data as { alreadyExists?: unknown }).alreadyExists === true;
      if (alreadyExists) {
        toast.info('Bu sipariş için barkod zaten oluşturulmuş, mevcut etiket yazdırılıyor');
      } else {
        toast.success('Kargo etiketi oluşturuldu');
      }
      setCargoOpen(false);
      // Print dialog — MNG response'tan tracking + label bilgisi varsa
      // etikete ekleriz.
      runPrintLabel(data, { desi, kg, content });
    } catch (err: unknown) {
      // Backend error.response.data.message bazen string, bazen string[],
      // bazen `{code, message, details}` objesi olabiliyor. MNG passthrough
      // hataları ise "MNG createbarcode error: {...}" formatında bir string
      // içinde gömülü JSON taşıyor — Description alanını çıkar.
      const e = err as {
        response?: {
          data?: {
            message?: unknown;
            error?: unknown;
          };
        };
      };
      const raw = e.response?.data?.message ?? e.response?.data?.error;
      let text = 'Kargo etiketi oluşturulamadı';
      if (typeof raw === 'string') text = raw;
      else if (Array.isArray(raw)) text = raw.map(String).join(', ');
      else if (raw && typeof raw === 'object') {
        const obj = raw as { message?: unknown; code?: unknown };
        if (typeof obj.message === 'string') text = obj.message;
        else if (typeof obj.code === 'string') text = obj.code;
        else text = JSON.stringify(raw);
      }
      // MNG-specific: "MNG xyz error: {"error":{"Code":...,"Description":...}}"
      // içinden Description alanını çek.
      const mngMatch = text.match(/\{[\s\S]*\}$/);
      if (mngMatch) {
        try {
          const parsed: { error?: { Description?: string; Message?: string; Code?: string } } =
            JSON.parse(mngMatch[0]);
          const inner = parsed.error;
          const desc = inner?.Description || inner?.Message;
          if (typeof desc === 'string' && desc.trim()) {
            const code = inner?.Code ? ` (${inner.Code})` : '';
            text = `${desc.replace(/^Exception:\s*/i, '').trim()}${code}`;
          }
        } catch {
          // JSON parse başarısız — orijinal text kalır.
        }
      }
      setCargoErr(text);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  // Extract tracking number from MNG response — known field candidates.
  const extractTracking = (data: unknown): string | null => {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if (typeof d.trackingNumber === 'string') return d.trackingNumber;
    if (typeof d.barcode === 'string') return d.barcode;
    // MNG bazı response'larda barcodeArray döner — ilk öğenin barcode field'ı.
    const arr = (d.barcodeArray as Array<{ barcode?: string }>) || undefined;
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0]?.barcode === 'string') {
      return arr[0].barcode;
    }
    return null;
  };

  // MNG createBarcode response'unda hazır label varsa onu kullan — varyantlar:
  //   - labelImage / barcodeImage / LabelImage  → base64 PNG (data URL'e wrap)
  //   - labelPdf / LabelPdf                     → base64 PDF
  //   - labelUrl / labelLink / label_url        → uzak resim/PDF URL'i
  //   - zpl / ZPL                               → thermal raw → Labelary ile PNG
  // Hiçbiri yoksa null döner; çağıran taraf product-info ZPL'e düşer.
  const extractMngLabelHtml = (apiData: unknown): string | null => {
    if (!apiData || typeof apiData !== 'object') return null;
    const d = apiData as Record<string, unknown>;
    const pick = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = d[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return undefined;
    };

    const url = pick('labelUrl', 'LabelUrl', 'labelLink', 'label_url');
    if (url) {
      if (/\.pdf(\?|$)/i.test(url)) {
        return `<embed src="${url}" type="application/pdf" class="mng-label-embed" />`;
      }
      return `<img src="${url}" alt="MNG kargo etiketi" class="mng-label-img" />`;
    }

    const pdfBase64 = pick('labelPdf', 'LabelPdf', 'labelPdfBase64');
    if (pdfBase64) {
      const src = pdfBase64.startsWith('data:')
        ? pdfBase64
        : `data:application/pdf;base64,${pdfBase64}`;
      return `<embed src="${src}" type="application/pdf" class="mng-label-embed" />`;
    }

    const imgBase64 = pick(
      'labelImage',
      'LabelImage',
      'barcodeImage',
      'BarcodeImage',
      'labelData',
      'LabelData',
    );
    if (imgBase64) {
      const src = imgBase64.startsWith('data:')
        ? imgBase64
        : `data:image/png;base64,${imgBase64}`;
      return `<img src="${src}" alt="MNG kargo etiketi" class="mng-label-img" />`;
    }

    // MNG ZPL döndürürse Labelary üzerinden PNG'ye çeviriyoruz.
    const mngZpl = pick('zpl', 'ZPL');
    if (mngZpl) {
      const url2 = `https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/${encodeURIComponent(mngZpl)}`;
      return `<img src="${url2}" alt="MNG kargo etiketi" class="mng-label-img" />`;
    }

    return null;
  };

  // Backend response'undaki productInfoLabel58mm.zpl'i Labelary API'sine
  // gönderip PNG olarak embed et. ZPL içinde özel karakterler var (^XA, ^FO,
  // ^FD vb.); encodeURIComponent ile path'e güvenli şekilde sığar.
  const extractProductInfoHtml = (apiData: unknown): string | null => {
    if (!apiData || typeof apiData !== 'object') return null;
    const d = apiData as {
      productInfoLabel58mm?: { zpl?: unknown; lines?: unknown } | null;
    };
    const zpl = d.productInfoLabel58mm?.zpl;
    if (typeof zpl === 'string' && zpl.trim().startsWith('^XA')) {
      // 812 dot ≈ 4 inch @ 203dpi (8dpmm). Uzunluk ZPL içindeki ^LL'den
      // belirleniyor; 4x6 etiket sınırlarına uyacak şekilde Labelary 4x6
      // template kullanıyoruz.
      const url = `https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/${encodeURIComponent(zpl)}`;
      return `<img src="${url}" alt="Ürün listesi etiketi" class="mng-label-img" />`;
    }
    // ZPL yoksa lines fallback (text-based)
    const lines = d.productInfoLabel58mm?.lines;
    if (Array.isArray(lines) && lines.length > 0) {
      const safeLines = lines.filter((l): l is string => typeof l === 'string');
      if (safeLines.length === 0) return null;
      const header = safeLines[0];
      const rows = safeLines.slice(1);
      const esc = (s: string) =>
        s.replace(/[&<>"]/g, (c) =>
          c === '&'
            ? '&amp;'
            : c === '<'
              ? '&lt;'
              : c === '>'
                ? '&gt;'
                : '&quot;',
        );
      return `<div class="products-fallback"><div class="products-order">${esc(header)}</div>${rows.map((l) => `<div class="product-line">${esc(l)}</div>`).join('')}</div>`;
    }
    return null;
  };

  const runPrintLabel = (
    apiData: unknown,
    _pkg: { desi: number; kg: number; content: string },
  ) => {
    // 2 sayfa basıyoruz:
    //   1) MNG'nin createBarcode response'unda dönen kargo etiketi
    //      (labelUrl / labelImage / labelPdf / ZPL → Labelary). Yoksa sayfa atlanır.
    //   2) Ürün listesi etiketi — backend'in productInfoLabel58mm.zpl çıktısını
    //      Labelary üzerinden PNG olarak basıyoruz (table layout, beden/renk dahil).
    //      ZPL yoksa text fallback.
    const mngLabelHtml = extractMngLabelHtml(apiData);
    const productInfoHtml = extractProductInfoHtml(apiData);

    if (!mngLabelHtml && !productInfoHtml) {
      toast.danger('Yazdırılacak etiket bulunamadı (MNG/ZPL yanıtı eksik).');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      visibility: 'hidden',
    } as CSSStyleDeclaration);
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      toast.danger('Yazdırma penceresi açılamadı');
      return;
    }

    doc.open();
    doc.write(`<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Kargo Etiketi ${formatOrderNo(order.orderNumber)}</title>
<style>
  @page { size: 10cm 15cm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; color: #000; background: #fff; }
  .page { width: 10cm; height: 15cm; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .page + .page { page-break-before: always; }
  .mng-label-img { display: block; width: 100%; height: 100%; object-fit: contain; }
  .mng-label-embed { width: 100%; height: 100%; border: 0; }
  .products-fallback { padding: 6mm; width: 100%; height: 100%; overflow: hidden; }
  .products-order { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12pt; font-weight: 600; margin-bottom: 4mm; }
  .product-line { font-size: 9pt; line-height: 1.45; padding: 1mm 0; border-bottom: 0.5pt dashed #C7C7C7; word-break: break-word; }
  .product-line:last-child { border-bottom: none; }
</style>
</head>
<body>
  ${mngLabelHtml ? `<div class="page">${mngLabelHtml}</div>` : ''}
  ${productInfoHtml ? `<div class="page">${productInfoHtml}</div>` : ''}
</body>
</html>`);
    doc.close();

    // İçerik DOM'a girdikten sonra print dialog'unu aç; print kapanınca iframe'i kaldır.
    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        toast.danger('Yazdırma başlatılamadı');
      } finally {
        // Print dialog kapansa da kapanmasa da iframe ileride temizlenir.
        setTimeout(() => iframe.remove(), 1000);
      }
    };

    if (doc.readyState === 'complete') {
      triggerPrint();
    } else {
      iframe.addEventListener('load', triggerPrint, { once: true });
    }
  };

  const customerInitials = (order.customerName || 'M')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  // Linear-style side panel içeriği — outer card styling (translucent,
  // rounded, shadow) layout tarafından sağlanır; burada sadece içerik.
  return (
    <div className="flex h-full flex-col">
      {/* Header — panel toggle icon (Linear-style sidebar collapse) +
          müşteri adı + sipariş no. X (close) yerine panel toggle:
          ikon kapatma butonu olduğunu daha sezgisel anlatıyor. */}
      <div className="flex items-start gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Paneli kapat"
          title="Paneli kapat"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <LayoutSideContentRight className="h-3.5 w-3.5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-sm font-medium leading-5 text-foreground">
            {order.customerName || 'Misafir'}
          </h2>
          <span className="truncate text-xs leading-4 text-muted">
            {formatOrderNo(order.orderNumber)}
          </span>
        </div>
      </div>

      {/* Body — Linear gibi düz property rows; hairline dividerlarla gruplama */}
      <div className="flex flex-1 flex-col overflow-auto">
        {/* Group 1 — kimlik */}
        <PanelGroup>
          <PanelRow label="Müşteri">
            <span className="truncate text-foreground">
              {order.customerName || 'Misafir'}
            </span>
          </PanelRow>
          {order.customerEmail && (
            <PanelRow label="E-posta">
              <span className="truncate text-foreground">{order.customerEmail}</span>
            </PanelRow>
          )}
          {order.customerPhone && (
            <PanelRow label="Telefon">
              <span className="truncate text-foreground">{order.customerPhone}</span>
            </PanelRow>
          )}
          <PanelRow label="Durum">
            <OrderStatusChip status={order.status} />
          </PanelRow>
        </PanelGroup>

        {/* Group 2 — sipariş meta */}
        <PanelGroup>
          <PanelRow label="Tarih">
            <span className="truncate text-foreground">{formatDate(order.orderDate)}</span>
          </PanelRow>
          <PanelRow label="Mağaza">
            <StoreSourceChip store={store} fallbackName={order.store?.name} />
          </PanelRow>
          <PanelRow label="Ürün">
            <span className="text-foreground">{order.itemsCount}</span>
          </PanelRow>
          <PanelRow label="Ödeme">
            <span className="truncate text-foreground">
              {order.paymentMethod || '—'}
            </span>
          </PanelRow>
        </PanelGroup>

        {/* Group 3 — adresler (varsa) */}
        {(order.shippingAddress || order.billingAddress) && (
          <PanelGroup>
            {order.shippingAddress && (
              <PanelRow label="Teslimat">
                <span className="truncate text-foreground" title={order.shippingAddress}>
                  {order.shippingAddress}
                </span>
              </PanelRow>
            )}
            {order.billingAddress &&
              order.billingAddress !== order.shippingAddress && (
                <PanelRow label="Fatura">
                  <span className="truncate text-foreground" title={order.billingAddress}>
                    {order.billingAddress}
                  </span>
                </PanelRow>
              )}
          </PanelGroup>
        )}

        {/* Group 4 — tutar */}
        <PanelGroup>
          <PanelRow label="Ara toplam">
            <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
          </PanelRow>
          <PanelRow label="Vergi">
            <span className="text-foreground">{formatCurrency(order.totalTax)}</span>
          </PanelRow>
          <PanelRow label="Kargo">
            <span className="text-foreground">{formatCurrency(order.shippingTotal)}</span>
          </PanelRow>
          {order.discountTotal > 0 && (
            <PanelRow label="İndirim">
              <span className="text-danger">-{formatCurrency(order.discountTotal)}</span>
            </PanelRow>
          )}
          <PanelRow label="Toplam" emphasize>
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(order.total)}
            </span>
          </PanelRow>
        </PanelGroup>

        {/* Group 5 — Sipariş kalemleri */}
        <OrderItemsSection
          isLoading={isOrderDetailLoading}
          error={orderDetailError}
          items={detail?.items ?? []}
          formatCurrency={formatCurrency}
        />

        {/* Group 6 — İadeler (varsa) */}
        {detail && detail.refunds.length > 0 && (
          <PanelGroup>
            <PanelSectionTitle>İadeler ({detail.refunds.length})</PanelSectionTitle>
            {detail.refunds.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs text-foreground">
                    {formatDate(r.refundDate)}
                  </span>
                  {r.reason && (
                    <span className="truncate text-xs text-muted">
                      {r.reason}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-danger">
                  -{formatCurrency(r.amount)}
                </span>
              </div>
            ))}
          </PanelGroup>
        )}

        {/* Group 7 — Gönderiler (varsa) */}
        {detail && detail.shipments.length > 0 && (
          <PanelGroup>
            <PanelSectionTitle>
              Gönderiler ({detail.shipments.length})
            </PanelSectionTitle>
            {detail.shipments.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-1 px-4 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {s.providerName || s.provider || 'Kargo'}
                  </span>
                  {s.status && (
                    <span className="text-[11px] text-muted">{s.status}</span>
                  )}
                </div>
                {s.trackingNumber && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-foreground">
                      {s.trackingNumber}
                    </span>
                    {s.trackingLink && (
                      <a
                        href={s.trackingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        Takip et
                      </a>
                    )}
                  </div>
                )}
                {s.dateShipped && (
                  <span className="text-[11px] text-muted">
                    Gönderim: {formatDate(s.dateShipped)}
                  </span>
                )}
              </div>
            ))}
          </PanelGroup>
        )}

        {/* Action — Linear "Draft a reply" tarzı text-button row */}
        <button
          type="button"
          onClick={openCargoModal}
          className="flex items-center gap-2 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.04]"
        >
          <Printer className="h-3.5 w-3.5 text-muted" />
          <span>Kargo etiketi bas</span>
        </button>
      </div>

      {/* Kargo etiketi modal — desi/kg/içerik al, backend MNG createBarcode
          endpoint'ine gönder, başarılı olunca print dialog'u aç. */}
      <Modal
        isOpen={cargoOpen}
        onOpenChange={(open) => {
          if (!isCreatingLabel && !open) setCargoOpen(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Kargo etiketi oluştur</Modal.Heading>
                <p className="mt-1 text-sm text-muted">
                  {formatOrderNo(order.orderNumber)} · MNG&apos;ye gönderilecek
                  paket bilgilerini girin.
                </p>
              </Modal.Header>
              <Modal.Body className="px-3 pb-3">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      value={cargoDesi}
                      onChange={(v) => {
                        setCargoDesi(v);
                        if (cargoErr) setCargoErr(null);
                      }}
                      type="number"
                    >
                      <Label>Desi</Label>
                      <Input placeholder="1" min={0} max={99} />
                    </TextField>
                    <TextField
                      value={cargoKg}
                      onChange={(v) => {
                        setCargoKg(v);
                        if (cargoErr) setCargoErr(null);
                      }}
                      type="number"
                    >
                      <Label>Ağırlık (kg)</Label>
                      <Input placeholder="1" min={0} max={99} />
                    </TextField>
                  </div>
                  <TextField
                    value={cargoContent}
                    onChange={(v) => {
                      setCargoContent(v);
                      if (cargoErr) setCargoErr(null);
                    }}
                    isInvalid={!!cargoErr}
                  >
                    <Label>İçerik</Label>
                    <Input placeholder="Paket içeriği (max 200 karakter)" />
                    {cargoErr && <FieldError>{cargoErr}</FieldError>}
                  </TextField>
                  <p className="text-[11px] text-muted">
                    Referans: <span className="font-mono">{mngReferenceId || '—'}</span>
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close" isDisabled={isCreatingLabel}>
                  Vazgeç
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmitCargo}
                  isPending={isCreatingLabel}
                  isDisabled={isCreatingLabel}
                >
                  Oluştur ve yazdır
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

// ---- Linear-style side panel helpers ------------------------------------
// PanelGroup: aralarında hairline divider olan label-value satır kümesi.
// PanelRow: tek bir Linear-tarzı satır (32px height, label sol / value sağ).

function PanelGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col border-b border-foreground/[0.06]">{children}</div>
  );
}

function PanelRow({
  label,
  emphasize,
  children,
}: {
  label: string;
  /** Toplam satırı gibi vurgulu olsun mu? */
  emphasize?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center gap-3 px-4 py-1.5">
      <span
        className={[
          'w-24 shrink-0 text-xs',
          emphasize ? 'font-medium text-foreground' : 'text-muted',
        ].join(' ')}
      >
        {label}
      </span>
      <div className="flex min-w-0 flex-1 justify-end overflow-hidden text-right text-xs">
        {children}
      </div>
    </div>
  );
}

// PanelSectionTitle: PanelGroup içinde başlık satırı (örn. "İadeler (2)").
function PanelSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center px-4 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {children}
      </span>
    </div>
  );
}

// OrderItemsSection: drawer'daki sipariş kalemleri listesi.
// Loading/error/empty state'leri kendi içinde yönetir; her satır bir
// OrderDetailItem'a karşılık gelir (görsel + isim + sku + qty×price + toplam).
function OrderItemsSection({
  isLoading,
  error,
  items,
  formatCurrency,
}: {
  isLoading: boolean;
  error: string | null;
  items: OrderDetailItem[];
  formatCurrency: (v: number) => string;
}) {
  if (isLoading && items.length === 0) {
    return (
      <PanelGroup>
        <PanelSectionTitle>Ürünler</PanelSectionTitle>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded bg-foreground/[0.06]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="h-3 w-2/3 animate-pulse rounded bg-foreground/[0.06]" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-foreground/[0.04]" />
            </div>
          </div>
        ))}
      </PanelGroup>
    );
  }

  if (error) {
    return (
      <PanelGroup>
        <PanelSectionTitle>Ürünler</PanelSectionTitle>
        <div className="px-4 py-2.5 text-xs text-danger">{error}</div>
      </PanelGroup>
    );
  }

  if (items.length === 0) {
    return (
      <PanelGroup>
        <PanelSectionTitle>Ürünler</PanelSectionTitle>
        <div className="px-4 py-2.5 text-xs text-muted">Kalem bulunamadı.</div>
      </PanelGroup>
    );
  }

  return (
    <PanelGroup>
      <PanelSectionTitle>Ürünler ({items.length})</PanelSectionTitle>
      {items.map((it) => {
        const img = it.product?.imageUrl ?? null;
        const sku = it.sku ?? it.product?.sku ?? null;
        return (
          <div key={it.id} className="flex items-start gap-3 px-4 py-2.5">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-foreground/[0.06] bg-surface-secondary">
              {img ? (
                <Image
                  src={img}
                  alt={it.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Tag className="h-4 w-4 text-muted" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium text-foreground" title={it.name}>
                {it.name}
              </span>
              <span className="text-[11px] text-muted">
                {sku ? `${sku} · ` : ''}
                {it.quantity} × {formatCurrency(it.price)}
              </span>
            </div>
            <span className="shrink-0 text-xs font-medium text-foreground">
              {formatCurrency(it.total)}
            </span>
          </div>
        );
      })}
    </PanelGroup>
  );
}

// ---- Tab pill (saved filter tab) -----------------------------------------
// Products page'iyle birebir aynı — "Tüm Siparişler" + saved filter setleri.
// Renkler tema token'larından: bg-default (HeroUI v3 neutral fill).

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
        // Selected ve hover aynı bg tonu (aktif gibi görünür); unselected
        // default transparent.
        'inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-medium text-foreground transition-colors',
        selected
          ? 'bg-foreground/[0.10]'
          : 'hover:bg-foreground/[0.10]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ---- Header label --------------------------------------------------------

// Sipariş numarası "#"-idempotent: backend "#1008" döndürürse manual prefix
// eklemeyiz, sadece numarası dönerse "#" prepend ederiz. "##1008" gibi
// görünmenin önüne geçer.
function formatOrderNo(orderNumber: string): string {
  if (!orderNumber) return '';
  const trimmed = orderNumber.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

// ---- Orders bulk actions bar — fixed bottom-6, content area pinned -------
// Products page'deki BulkActionsBar ile birebir aynı pill stili. Tek
// aksiyon: Kargo Etiketi Bas.

function OrdersBulkActionsBar({
  count,
  onPrintLabels,
}: {
  count: number;
  onPrintLabels: () => void;
}) {
  if (count <= 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-20 right-1 z-30 flex justify-center">
      <div
        className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 p-2 backdrop-blur-xl"
        role="toolbar"
        aria-label={`${count} sipariş için işlemler`}
      >
        <Button variant="tertiary" size="md" onPress={onPrintLabels}>
          <Printer className="h-4 w-4" />
          Kargo Etiketi Bas ({count})
        </Button>
      </div>
    </div>
  );
}

// ---- Sort header button — products page ile birebir aynı pattern --------
// Default: text-muted, bg yok, arrow gizli. Hover: bg-foreground/[0.06],
// text-foreground, arrow görünür. Aktif yön sadece hover'da okunabilir:
// ASC → arrow yukarı (rotate-180), DESC → aşağı.

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

// ---- Cell wrap -----------------------------------------------------------

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

// ---- Order status chip ---------------------------------------------------

function OrderStatusChip({ status }: { status: string }) {
  const meta = statusMeta[status] ?? {
    label: status,
    tone: 'muted' as StatusTone,
    Icon: CircleDashed,
  };
  const Icon = meta.Icon;
  return (
    <span className="inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-foreground">
      <Icon className={['h-3 w-3', toneClass[meta.tone]].join(' ')} />
      {meta.label}
    </span>
  );
}

// ---- Store source chip (favicon + platform/store adı) --------------------
// Products page'deki IntegrationFavicons pattern'inin tek-mağaza varyasyonu.
// Platform alanı varsa onun bilinen marka adı (Trendyol/WooCommerce/Shopify…)
// gösterilir; aksi halde mağaza adına düşer.

const platformBranding: Record<string, { label: string; color: string }> = {
  WOOCOMMERCE: { label: 'WooCommerce', color: '#7F54B3' },
  SHOPIFY: { label: 'Shopify', color: '#95BF47' },
  TRENDYOL: { label: 'Trendyol', color: '#F27A1A' },
  HEPSIBURADA: { label: 'Hepsiburada', color: '#FF6000' },
  N11: { label: 'N11', color: '#F5A623' },
  AMAZON: { label: 'Amazon', color: '#FF9900' },
  CICEKSEPETI: { label: 'ÇiçekSepeti', color: '#E91E63' },
  PTTAVM: { label: 'PTT AVM', color: '#FFCC00' },
};

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

function StoreSourceChip({
  store,
  fallbackName,
}: {
  store?: { id: string; name: string; url: string; platform?: string };
  fallbackName?: string;
}) {
  if (!store && !fallbackName) {
    return <span className="text-xs text-muted">—</span>;
  }
  const brand = store?.platform ? platformBranding[store.platform] : undefined;
  const label = brand?.label ?? store?.name ?? fallbackName ?? '—';
  const src = storeFaviconUrl(store?.url);
  const initial = label.slice(0, 1).toUpperCase();
  return (
    <span className="inline-flex h-5 items-center gap-1.5 text-xs font-medium leading-4 text-foreground">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface"
        style={{
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
          backgroundColor: src ? undefined : brand?.color,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={12}
            height={12}
            className="h-3 w-3"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span
            className={[
              'text-[8px] font-semibold',
              brand ? 'text-white' : 'text-muted',
            ].join(' ')}
          >
            {initial}
          </span>
        )}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
