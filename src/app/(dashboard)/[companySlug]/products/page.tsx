'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  ArrowDown,
  ChevronDown,
  Pencil,
  Copy,
  TrashBin,
  CircleDashed,
  Check,
  CircleXmark,
  Tag,
  Tags,
  Percent,
  CopyCheck,
  Calendar,
} from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Checkbox,
  Dropdown,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  Tooltip as UITooltip,
  toast,
} from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useProductMappingStore } from '@/stores/productMappingStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { FilterPopover } from '@/components/products/filter-popover';
import { ActiveFilterChips } from '@/components/products/active-filter-chips';
import { useSavedFilterStore } from '@/stores/savedFilterStore';
import {
  applyFilterPayload,
  clearFilters as clearAllFilters,
} from '@/components/products/filter-types';
import { BulkActionsBar } from '@/components/products/bulk-actions-bar';
import type { FilterDef } from '@/components/products/filter-types';

// ---- Filter types ---------------------------------------------------------

type ActiveFilter = 'all' | 'yes' | 'no';
type MappingFilter = 'all' | 'mapped' | 'unmapped';
// Backend `sortBy` query'sini string olarak alıyor; UI tarafında kolon başına
// bilinen anahtarlar. Backend desteklemeyen alanlar gönderildiğinde 400/ignore
// dönerse buraya geri dönüp daraltırız.
type SortField =
  | 'name'
  | 'price'
  | 'purchasePrice'
  | 'storeName'
  | 'isMapped'
  | 'isActive'
  | 'stockQuantity';
type SortOrder = 'asc' | 'desc';

// Detay popover'larında "Tümü" satırı YOK — Figma birebir. Filtre default'a
// dönmek için chip'in sağındaki X kullanılıyor (resetFilter).
// Figma 12249:4962'ye göre her seçeneğin solunda 16×16 ikon: Aktif →
// circle-dashed, Pasif → circle-xmark, Eşleştirildi → check, Eşleştirme yok →
// circle-xmark.
const activeOptions = [
  { value: 'yes', label: 'Aktif', icon: CircleDashed },
  { value: 'no', label: 'Pasif', icon: CircleXmark },
];

const mappingOptions = [
  { value: 'mapped', label: 'Eşleştirildi', icon: Check },
  { value: 'unmapped', label: 'Eşleştirme yok', icon: CircleXmark },
];

// ---- Favicon helper -------------------------------------------------------

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

// ---- Page -----------------------------------------------------------------

export default function InventoryPage() {
  usePageTitle('Ürünler');

  const params = useParams();
  const companySlug = params.companySlug as string;
  const { currentCompany } = useCompanyStore();
  // STOCKIST yalnızca stoğu güncelleyebilir; alış + liste fiyatı kolonları
  // tamamen gizlenir. PRODUCT_UPLOADER ürünleri ve liste fiyatını görür ama
  // alış fiyatına (purchasePrice) erişemez. Backend de `assertNotLimitedRole`
  // ile aynı kontrolü uyguluyor — UI sadece görünürlüğü ayarlar.
  const isStockist = currentCompany?.role === 'STOCKIST';
  const isProductUploader = currentCompany?.role === 'PRODUCT_UPLOADER';
  const hidePurchasePrice = isStockist || isProductUploader;
  const hideListPrice = isStockist;
  const { stores, fetchStores } = useStoreStore();
  const {
    products,
    productsPage,
    isLoading,
    fetchProducts,
    updateProductPurchasePrice,
    updateProduct,
    updateProductInList,
    bulkSetActive,
    bulkDelete,
  } = useInventoryStore();
  const createMapping = useProductMappingStore((s) => s.createMapping);
  const router = useRouter();

  // Filtre state'leri (hepsi backend-bağlı)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [vatFilter, setVatFilter] = useState<string>('all');
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all');
  /** YYYY-MM-DD..YYYY-MM-DD aralık formatı; tek tarih de tek başına gönderilir. */
  const [dateFilter, setDateFilter] = useState<string>('');

  // SKU/Barkod araması (backend `search` query'sine geçer)
  const [skuQuery, setSkuQuery] = useState('');

  // Tablo
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // Şu an pagination UI'ı yok — tek seferde tüm ürünleri çekiyoruz. Çoğu
  // satıcı 1000'in altında ürün taşıyor; bu sınırın üstüne çıkanlar için
  // ileride load-more / infinite scroll eklenecek.
  const perPage = 1000;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mağaza listesini bir kere çek (Bağlı filtresi + entegrasyon kolonu için).
  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  // Saved filter setleri — tab strip'inde "Tüm Ürünler" + her saved filter
  // ismi gösterilir. Kaydet butonundan oluşturulan setler bu listede çıkar.
  // Selector tüm array'i döndürür (stable ref); filtre useMemo ile yapılır —
  // aksi halde Zustand her render'da yeni array görüp "getSnapshot should be
  // cached" sonsuz döngü uyarısı verir.
  const fetchSaved = useSavedFilterStore((s) => s.fetch);
  const updateSaved = useSavedFilterStore((s) => s.update);
  const removeSaved = useSavedFilterStore((s) => s.remove);
  const createSaved = useSavedFilterStore((s) => s.create);
  const allSavedFilters = useSavedFilterStore((s) => s.filters);
  const savedFilters = useMemo(
    () => allSavedFilters.filter((f) => f.context === 'products'),
    [allSavedFilters],
  );
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  useEffect(() => {
    if (currentCompany?.id) fetchSaved(currentCompany.id, 'products');
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
  const handleDuplicate = async (sf: { name: string; payload: Record<string, string | string[]> }) => {
    if (!currentCompany?.id) return;
    const result = await createSaved(
      currentCompany.id,
      'products',
      `${sf.name} (kopya)`,
      sf.payload,
    );
    if (result) toast.success('Kopya oluşturuldu');
    else toast.danger('Kopyalanamadı');
  };
  // Saved filter silme — native confirm yerine HeroUI AlertDialog ile.
  // ID dialog state'ine yazılır, kullanıcı Sil derse handleConfirmDeleteSaved
  // çalışır.
  const [deleteSavedId, setDeleteSavedId] = useState<string | null>(null);
  const [isDeletingSaved, setIsDeletingSaved] = useState(false);
  // Bulk delete (ürün toplu silme) AlertDialog state.
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const deleteSavedName = useMemo(
    () => savedFilters.find((s) => s.id === deleteSavedId)?.name ?? '',
    [savedFilters, deleteSavedId],
  );

  const handleDeleteSaved = (id: string) => {
    setDeleteSavedId(id);
  };

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

  const handleConfirmBulkDelete = async () => {
    if (!currentCompany?.id || selected.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selected);
      const deleted = await bulkDelete(currentCompany.id, ids);
      if (deleted > 0) {
        toast.success(`${deleted} ürün silindi`);
        setSelected(new Set());
        setBulkDeleteOpen(false);
      } else {
        toast.danger('Hiçbir ürün silinemedi');
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const fetchData = useCallback(
    (page: number = 1) => {
      if (!currentCompany?.id) return;

      // Tarih filtresi parser — "YYYY-MM-DD..YYYY-MM-DD" veya "YYYY-MM-DD".
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      const dRaw = dateFilter.trim();
      if (dRaw) {
        const [from, to] = dRaw.split('..').map((s) => s.trim());
        if (from) {
          const d = new Date(from);
          if (!Number.isNaN(d.getTime())) dateFrom = d.toISOString();
        }
        if (to) {
          // Tek günü kapsayacak şekilde günün sonuna kaydır.
          const d = new Date(to);
          if (!Number.isNaN(d.getTime())) {
            d.setHours(23, 59, 59, 999);
            dateTo = d.toISOString();
          }
        } else if (from && !to) {
          // Yalnızca tek tarih girildiyse: o günü kapsayacak gte+lte.
          const d = new Date(from);
          if (!Number.isNaN(d.getTime())) {
            d.setHours(23, 59, 59, 999);
            dateTo = d.toISOString();
          }
        }
      }

      fetchProducts(currentCompany.id, {
        page,
        limit: perPage,
        sortBy: sortField,
        sortOrder,
        search: skuQuery || undefined,
        isActive:
          activeFilter === 'yes'
            ? 'true'
            : activeFilter === 'no'
              ? 'false'
              : undefined,
        mappingStatus: mappingFilter !== 'all' ? mappingFilter : undefined,
        storeId: storeFilter !== 'all' ? storeFilter : undefined,
        vatRate:
          vatFilter !== 'all' && !Number.isNaN(Number(vatFilter))
            ? Number(vatFilter)
            : undefined,
        dateFrom,
        dateTo,
      });
    },
    [
      currentCompany?.id,
      skuQuery,
      activeFilter,
      mappingFilter,
      storeFilter,
      vatFilter,
      dateFilter,
      sortField,
      sortOrder,
      perPage,
      fetchProducts,
    ]
  );

  useEffect(() => {
    fetchData(1);
    const interval = setInterval(() => fetchData(productsPage), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handlePurchasePriceUpdate = async (
    productId: string,
    newPrice: number
  ): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const success = await updateProductPurchasePrice(currentCompany.id, productId, newPrice);
    if (success) {
      updateProductInList(productId, { purchasePrice: newPrice });
      toast.success('Alış fiyatı güncellendi');
    } else {
      toast.danger('Alış fiyatı güncellenemedi');
    }
    return success;
  };

  // ---- Inline cell helpers ------------------------------------------------

  // Inline cell save'leri için ortak helper (sadece isActive toggle).
  const saveProduct = async (
    productId: string,
    patch: Partial<{ isActive: boolean }>
  ): Promise<boolean> => {
    if (!currentCompany?.id) return false;
    const ok = await updateProduct(currentCompany.id, productId, patch);
    if (!ok) toast.danger('Ürün güncellenemedi');
    return ok;
  };

  // Filter popover'ın okuyacağı tek tip listesi (Figma birebir):
  //   Durumu / Mağaza / KDV / Eşleştirme / SKU / Tarih
  // Filtre değişince useEffect zaten fetchData'yı tetikliyor.
  // Figma birebir — "Tümü" satırı yok; deselect chip X ile yapılır.
  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }));
  const filterDefs: FilterDef[] = [
    {
      id: 'active',
      label: 'Durumu',
      icon: CircleDashed,
      searchPlaceholder: 'Durumu değiştir...',
      type: 'select',
      defaultValue: 'all',
      value: activeFilter,
      onChange: (v) => setActiveFilter(v as ActiveFilter),
      options: activeOptions,
    },
    {
      id: 'store',
      label: 'Mağaza',
      icon: Tag,
      searchPlaceholder: 'Mağaza değiştir...',
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
      id: 'vat',
      label: 'KDV',
      icon: Percent,
      searchPlaceholder: 'KDV değiştir...',
      type: 'select',
      defaultValue: 'all',
      value: vatFilter,
      onChange: setVatFilter,
      options: [
        { value: '0', label: '%0' },
        { value: '5', label: '%5' },
        { value: '10', label: '%10' },
        { value: '15', label: '%15' },
        { value: '20', label: '%20' },
      ],
      addNewLabel: 'Yeni ekle',
      addNewPlaceholder: 'Örn. 18',
      onAddNew: (raw) => {
        // Dropdown içindeki inline input'tan gelen değer.
        const trimmed = raw.trim();
        if (!trimmed) return;
        const n = Number(trimmed.replace('%', '').replace(',', '.'));
        if (Number.isNaN(n) || n < 0 || n > 100) {
          toast.danger('Geçerli bir oran girin (0-100 arası)');
          return;
        }
        setVatFilter(String(n));
      },
    },
    {
      id: 'mapping',
      label: 'Eşleştirme',
      icon: CopyCheck,
      searchPlaceholder: 'Eşleştirme değiştir...',
      type: 'select',
      defaultValue: 'all',
      value: mappingFilter,
      onChange: (v) => setMappingFilter(v as MappingFilter),
      options: mappingOptions,
    },
    {
      id: 'sku',
      label: 'SKU',
      icon: Tags,
      searchPlaceholder: 'SKU ara...',
      preposition: 'ile',
      type: 'text',
      placeholder: 'SKU/Barkod ile ara',
      value: skuQuery,
      onChange: setSkuQuery,
    },
    {
      id: 'date',
      label: 'Tarih',
      icon: Calendar,
      preposition: 'ile',
      type: 'text',
      widget: 'date-range',
      value: dateFilter,
      onChange: setDateFilter,
    },
  ];

  return (
    <>
      {/* Bulk product silme onayı — native window.confirm yerine AlertDialog. */}
      <AlertDialog
        isOpen={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!isBulkDeleting && !open) setBulkDeleteOpen(false);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Ürünleri sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-2 pb-0">
                <p>
                  Seçili <strong>{selected.size}</strong> ürün kalıcı olarak
                  silinecek. Bu işlem geri alınamaz.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer className="!mt-3 px-2">
                <Button variant="tertiary" slot="close" isDisabled={isBulkDeleting}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={handleConfirmBulkDelete}
                  isPending={isBulkDeleting}
                  isDisabled={isBulkDeleting}
                >
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Saved filter silme onayı — native window.confirm yerine HeroUI v3
          AlertDialog. Tüm destructive aksiyonlarda bu pattern kullanılır. */}
      <AlertDialog
        isOpen={deleteSavedId !== null}
        onOpenChange={(open) => {
          if (!isDeletingSaved && !open) setDeleteSavedId(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Filtre setini sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-2 pb-0">
                <p>
                  <strong>{deleteSavedName}</strong> filtre seti kalıcı olarak
                  silinecek. Bu işlem geri alınamaz.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer className="!mt-3 px-2">
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

      {/* Rename modal — saved tab "Düzenle" aksiyonu açar */}
      <Modal
        isOpen={renameId !== null}
        onOpenChange={(open) => {
          if (!isRenaming && !open) setRenameId(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Filtre setini yeniden adlandır</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
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
                  <Input
                    placeholder="Filtre seti adı"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitRename();
                      }
                    }}
                  />
                  {renameErr && <FieldError>{renameErr}</FieldError>}
                </TextField>
              </Modal.Body>
              <Modal.Footer>
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

      <PageHeader
        title="Ürünler"
        action={
          !isStockist ? (
            // Yeni ürün ekleme şimdilik deaktif — backend hazır olduğunda
            // tekrar aktif edilecek. Link'i kaldırdık, disabled görünüm.
            <Button
              variant="primary"
              size="sm"
              isDisabled
              className="h-8 rounded-full px-3 text-xs"
              aria-label="Yeni ürün ekleme şimdilik deaktif"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni ürün
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col">
        {/* ============== Filter row (Figma 12232:12828) ==============
            Sol: pill tabs ("Tüm Ürünler" seçili + saved filter setleri).
            Sağ: FilterPopover icon button. ActiveFilterChips & "+" tab
            butonu Figma'da yok — daha sonra ayrı bir UX kararı olarak
            geri eklenecek. Kayıtlı filtre logic'i SavedFilterTabs'tan
            taşınmadı — şimdilik static "Tüm Ürünler" + tek placeholder
            tab; fonksiyon kullanıcıyla beraber tasarlanacak. */}
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
                Tüm Ürünler
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
          {/* Aktif filtre alanı — Linear-style segmented chip + Vazgeç/Kaydet.
              Sadece en az bir filtre aktif İVE aktif saved tab ile payload'lar
              eşit değilse render eder. Kaydet sonrası onSaved ile yeni saved
              tab'ı aktif yap → chips alanı otomatik saklanır. */}
          <ActiveFilterChips
            filters={filterDefs}
            companyId={currentCompany?.id}
            context="products"
            activeSavedFilter={
              savedFilters.find((sf) => sf.id === activeSavedId) ?? null
            }
            onSaved={(sf) => setActiveSavedId(sf.id)}
          />
        </div>

        {/* ============== Header + rows (p-2.5 gap-2.5) ============== */}
        <div className="flex flex-col gap-2.5 p-2.5">
          {/* Column header — left half: name, right half: 5 cols. Tüm
              kolonlar SortHeaderButton — hover'da pill+arrow gösterir;
              tıklayınca sıralama uygulanır (backend `sortBy` string olarak
              alıyor). */}
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-2">
              <SortHeaderButton
                field="name"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              >
                Ürün adı
              </SortHeaderButton>
            </div>
            <div className="flex flex-1 items-center gap-20">
              {!hideListPrice ? (
                <div className="flex flex-1 items-center gap-2">
                  <SortHeaderButton
                    field="price"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  >
                    Satış F.
                  </SortHeaderButton>
                </div>
              ) : (
                <span className="flex-1" />
              )}
              {!hidePurchasePrice ? (
                <div className="flex flex-1 items-center gap-2">
                  <SortHeaderButton
                    field="purchasePrice"
                    currentField={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  >
                    Alış F.
                  </SortHeaderButton>
                </div>
              ) : (
                <span className="flex-1" />
              )}
              <div className="flex flex-1 items-center gap-2">
                <SortHeaderButton
                  field="storeName"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Mağazalar
                </SortHeaderButton>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <SortHeaderButton
                  field="isMapped"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Eşleştirme
                </SortHeaderButton>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <SortHeaderButton
                  field="isActive"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Durum
                </SortHeaderButton>
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col">
            {isLoading && products.length === 0 ? (
              // Skeleton yok — sadece sade boşluk; veri geldiğinde rows
              // anında render edilir.
              <div className="h-12" />
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                Ürün bulunamadı
              </div>
            ) : (
              products.map((product) => {
                const isChecked = selected.has(product.id);
                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        `/${companySlug}/products/${product.slug ?? product.id}`,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(
                          `/${companySlug}/products/${product.slug ?? product.id}`,
                        );
                      }
                    }}
                    className={[
                      // h:60, p:12, r:16. Hover'da subtle bg (orders pattern).
                      // Seçili ise ayrı bg + hover'da daha koyu.
                      'flex h-[60px] cursor-pointer items-center justify-between overflow-hidden rounded-2xl p-3 transition-colors',
                      isChecked
                        ? 'bg-foreground/[0.06] hover:bg-foreground/[0.08]'
                        : 'hover:bg-foreground/[0.04]',
                    ].join(' ')}
                  >
                    {/* LEFT half — checkbox + image + name */}
                    <div className="flex flex-1 items-center gap-3">
                      {/* Checkbox click row-click'i tetiklemesin */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          isSelected={isChecked}
                          onChange={(next) => {
                            setSelected((prev) => {
                              const updated = new Set(prev);
                              if (next) updated.add(product.id);
                              else updated.delete(product.id);
                              return updated;
                            });
                          }}
                          aria-label={`${product.name} seç`}
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 object-cover"
                            />
                          ) : (
                            <Image
                              src="/figma/balina-logo.svg"
                              alt=""
                              width={20}
                              height={20}
                              className="opacity-70"
                            />
                          )}
                        </div>
                        <span className="truncate text-sm font-medium leading-5 text-foreground">
                          {product.name}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT half — 5 cells, each flex-1, gap-20 */}
                    <div className="flex flex-1 items-center gap-20">
                      {/* Satış Fiyatı — pazaryeri başına farklı fiyat varsa hover popover */}
                      <CellWrap>
                        {!hideListPrice ? (
                          <PriceChip
                            value={product.price}
                            marketplacePrices={product.marketplacePrices}
                          />
                        ) : null}
                      </CellWrap>

                      {/* Alış Fiyatı — null veya dolu, aynı chip + dropdown akışı */}
                      <CellWrap>
                        {!hidePurchasePrice ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <AddPricePopover
                              value={product.purchasePrice}
                              onSubmit={(newPrice) =>
                                handlePurchasePriceUpdate(product.id, newPrice)
                              }
                            />
                          </div>
                        ) : null}
                      </CellWrap>

                      {/* Mağazalar */}
                      <CellWrap>
                        <IntegrationFavicons
                          stores={stores
                            .filter((s) => s.id === product.storeId)
                            .map((s) => ({ id: s.id, name: s.name, url: s.url }))}
                        />
                      </CellWrap>

                      {/* Eşleştirme */}
                      <CellWrap>
                        {product.isMapped ? (
                          <StatusChip variant="check">Eşleştirildi</StatusChip>
                        ) : (
                          <StatusChip variant="xmark">Eşleştirme yok</StatusChip>
                        )}
                      </CellWrap>

                      {/* Durum — chip trigger + dropdown ile aktif/pasif seç */}
                      <CellWrap>
                        <div onClick={(e) => e.stopPropagation()}>
                          <StatusPopover
                            isActive={product.isActive}
                            isDisabled={isStockist}
                            onSelect={(next) =>
                              saveProduct(product.id, { isActive: next })
                            }
                          />
                        </div>
                      </CellWrap>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ============== Bulk actions bar (Figma 12249:3298) ============== */}
          <BulkActionsBar
            count={selected.size}
            onMap={async () => {
              if (!currentCompany?.id) return;
              const ids = Array.from(selected);
              if (ids.length < 2) {
                toast.danger('En az 2 ürün seçmelisiniz');
                return;
              }
              // Pre-flight: aynı mağazadan ürünler eşleştirilemez — backend
              // de aynı kontrolü yapıyor ama UX için API çağrısı öncesi uyar.
              const selectedProducts = products.filter((p) => selected.has(p.id));
              const uniqueStores = new Set(selectedProducts.map((p) => p.storeId));
              if (uniqueStores.size < 2) {
                toast.danger(
                  'Eşleştirme için en az 2 farklı mağazadan ürün seçilmeli',
                );
                return;
              }
              // Seçili ürünler birbiri arasında doğrudan eşleştirilir.
              // masterSku — ilk ürünün SKU'su (varsa) veya id'sinin son 8 hanesi.
              const first = products.find((p) => p.id === ids[0]);
              const masterSku =
                first?.sku?.trim() || ids[0].slice(-8).toUpperCase();
              const mapping = await createMapping(currentCompany.id, {
                masterSku,
                productIds: ids,
              });
              if (mapping) {
                toast.success(`${ids.length} ürün eşleştirildi`);
                setSelected(new Set());
                fetchData(productsPage);
              } else {
                // Backend'in döndüğü spesifik mesajı göster (zaten daha
                // farklı bir hata, örn. masterSku çakışması olabilir).
                const err = useProductMappingStore.getState().error;
                toast.danger(err || 'Eşleştirme oluşturulamadı');
              }
            }}
            allSelectedInactive={
              selected.size > 0 &&
              Array.from(selected)
                .map((id) => products.find((p) => p.id === id))
                .filter(Boolean)
                .every((p) => p && !p.isActive)
            }
            onToggleActive={async () => {
              if (!currentCompany?.id) return;
              const ids = Array.from(selected);
              // Seçilenlerin tamamı pasifse → aktif et; aksi halde pasife al.
              const selectedProducts = products.filter((p) => selected.has(p.id));
              const allInactive =
                selectedProducts.length > 0 &&
                selectedProducts.every((p) => !p.isActive);
              const next = allInactive;
              const updated = await bulkSetActive(currentCompany.id, ids, next);
              if (updated > 0) {
                toast.success(
                  next
                    ? `${updated} ürün tekrar aktif edildi`
                    : `${updated} ürün satıştan kaldırıldı`,
                );
                setSelected(new Set());
                fetchData(productsPage);
              } else {
                toast.danger('Hiçbir ürün güncellenemedi');
              }
            }}
            onDelete={() => {
              // Confirm dialog AlertDialog ile açılır; native confirm yok.
              if (selected.size === 0) return;
              setBulkDeleteOpen(true);
            }}
          />
        </div>
      </div>
    </>
  );
}

// ---- Tab pill (placeholder filter tab) -----------------------------------
// Figma 12232:12828 — "Tüm Ürünler" tab'ı + saved filter seti placeholder'ı.
// Aktif: bg #EBEBEC, pasif: hover'da hafif bg.

function TabPill({
  selected,
  onPress,
  children,
}: {
  selected?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  // 32px height, rounded-2xl, padding 6px 12px, Inter 500 14px.
  // Renkler tema token'larından — text-foreground her durumda; seçili bg
  // `bg-default` (HeroUI v3 neutral fill, FilterPopover trigger ile aynı ton).
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

// ---- Saved filter tab — pill + (aktifse) chevron + dropdown ---------------
// Aktif olduğunda sağ kenarda ChevronDown ikonu; tıklayınca Düzenle/Kopyala/Sil
// dropdown'u açılır (HeroUI v3 Dropdown.Menu).

function SavedTab({
  name,
  isActive,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  name: string;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={[
        'inline-flex h-8 cursor-pointer items-center justify-center rounded-full text-sm font-medium text-foreground transition-colors',
        isActive ? 'bg-foreground/[0.10]' : 'hover:bg-foreground/[0.10]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onSelect}
        className={[
          'inline-flex h-8 items-center px-3',
          isActive ? 'rounded-l-full pr-2' : 'rounded-full',
        ].join(' ')}
      >
        {name}
      </button>
      {isActive && (
        <Dropdown>
          <Dropdown.Trigger
            aria-label="Filtre seti aksiyonları"
            className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground/[0.06] text-muted transition-colors hover:bg-foreground/[0.10] hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Dropdown.Trigger>
          <Dropdown.Popover
            className="w-[180px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
            style={{
              border: '1px solid var(--border)',
              boxShadow:
                '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
            }}
          >
            <Dropdown.Menu
              aria-label="Filtre seti aksiyonları"
              onAction={(key) => {
                if (key === 'rename') onRename();
                else if (key === 'duplicate') onDuplicate();
                else if (key === 'delete') onDelete();
              }}
              className="flex flex-col gap-0 py-1 outline-none"
            >
              <Dropdown.Item
                id="rename"
                textValue="Düzenle"
                className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="flex-1">Düzenle</span>
              </Dropdown.Item>
              <Dropdown.Item
                id="duplicate"
                textValue="Kopyala"
                className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
              >
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="flex-1">Kopyala</span>
              </Dropdown.Item>
              <Dropdown.Item
                id="delete"
                textValue="Sil"
                className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-danger outline-none transition-colors data-[hovered=true]:bg-danger/10 data-[focused=true]:bg-danger/10"
              >
                <TrashBin className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">Sil</span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}
    </div>
  );
}

// ---- Header label (plain text cell) --------------------------------------

function HeaderLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  // Inter 500 12px text-muted, padding 0 4px inner.
  return (
    <div className={['flex items-center gap-2', className ?? ''].join(' ')}>
      <div className="inline-flex flex-col items-start justify-center px-1">
        <span className="text-xs font-medium leading-4 text-muted">{children}</span>
      </div>
    </div>
  );
}

// ---- Cell wrap inside row right half -------------------------------------

function CellWrap({ children }: { children: React.ReactNode }) {
  // min-w-fit — flex-1 cell'in içeriği nowrap olduğunda taşmasın diye en az
  // içerik genişliğinde kalır. Cell'ler farklı genişlikte olabilir (en uzun
  // chip kadar) ama wrap olmaz.
  return (
    <div className="inline-flex min-w-fit flex-1 flex-col items-start justify-start gap-2.5">
      {children}
    </div>
  );
}

// ---- Add price popover (Alış Fiyatı — null veya dolu, aynı chip + dropdown)

function AddPricePopover({
  value,
  onSubmit,
}: {
  value: number | null;
  onSubmit: (value: number) => Promise<boolean> | void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [raw, setRaw] = useState('');

  const submit = async () => {
    const n = parsePriceInput(raw);
    if (n == null || n < 0) {
      toast.danger('Geçerli bir fiyat girin');
      return;
    }
    await onSubmit(n);
    setRaw('');
    setIsOpen(false);
  };

  const hasValue = value != null;

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        // Açılırken mevcut değerle pre-fill; kapanırken temizle.
        if (open) setRaw(hasValue ? formatPrice(value as number) : '');
        else setRaw('');
      }}
    >
      <Dropdown.Trigger
        aria-label={hasValue ? 'Alış fiyatını düzenle' : 'Alış fiyatı ekle'}
        className={[
          'inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 transition-colors',
          hasValue
            ? 'text-foreground hover:bg-foreground/[0.06]'
            : 'text-muted hover:bg-foreground/[0.06] hover:text-foreground',
        ].join(' ')}
      >
        {hasValue ? (
          `₺${formatPrice(value as number)}`
        ) : (
          <>
            <CircleDashed className="h-3 w-3" />
            Eklenmedi
          </>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover
        className="w-[180px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
        style={{
          border: '1px solid var(--border)',
          boxShadow:
            '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
        }}
      >
        <div className="flex h-9 items-center px-3">
          <span className="mr-1 text-[13px] text-muted">₺</span>
          {/* type="text" — number spinner ok'larını kullanıcı görmemeli.
              Kullanıcı 1234,56 / 1.234,56 / 1234.56 gibi yazabilir; submit'te
              parse edilir. */}
          <input
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(liveFormatPrice(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
              }
            }}
            placeholder="0,00"
            aria-label="Alış fiyatı"
            autoFocus
            className="h-9 w-full border-0 bg-transparent p-0 text-[13px] font-normal text-foreground outline-none ring-0 placeholder:text-muted focus:outline-none focus:ring-0"
          />
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/** Kullanıcı girdisini sayıya çevirir. TR locale: "," decimal, "." thousand.
 *  "2.250" → 2250, "2,50" → 2.5, "1.234,56" → 1234.56. */
function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

/** Sayıyı TR fiyat formatına çevirir: 1234.5 → "1.234,50". */
function formatPrice(n: number): string {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Kullanıcı yazarken anlık TR fiyat formatı: "123123" → "123.123",
 *  "1234,5" → "1.234,5", "2.250" → "2.250". TR locale'de "." thousand
 *  separator, "," decimal separator; "." ASLA decimal olarak yorumlanmaz. */
function liveFormatPrice(input: string): string {
  // Geçersiz karakterleri ele
  const cleaned = input.replace(/[^0-9.,]/g, '');
  if (!cleaned) return '';
  // Sadece "," decimal separator — varsa ilk virgüle göre böl, kalan tüm
  // "." karakterleri thousand separator olarak strip edilir.
  const commaIdx = cleaned.indexOf(',');
  let intPart: string;
  let decPart: string | null = null;
  if (commaIdx > -1) {
    intPart = cleaned.slice(0, commaIdx).replace(/[.,]/g, '');
    decPart = cleaned
      .slice(commaIdx + 1)
      .replace(/[.,]/g, '')
      .slice(0, 2);
  } else {
    intPart = cleaned.replace(/\./g, '');
  }
  if (intPart === '') intPart = '0';
  const intNum = Number(intPart);
  if (Number.isNaN(intNum)) return cleaned;
  const formattedInt = intNum.toLocaleString('tr-TR');
  if (decPart != null) return `${formattedInt},${decPart}`;
  return formattedInt;
}

// ---- Status popover (Durum chip trigger + Aktif/Pasif dropdown) ----------

function StatusPopover({
  isActive,
  isDisabled,
  onSelect,
}: {
  isActive: boolean;
  isDisabled?: boolean;
  onSelect: (next: boolean) => void;
}) {
  if (isDisabled) {
    // Stockist için tıklanmaz — sadece chip görünür.
    return isActive ? (
      <StatusChip variant="check">Aktif</StatusChip>
    ) : (
      <StatusChip variant="xmark">Pasif</StatusChip>
    );
  }
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Durum değiştir"
        className="inline-flex rounded-xl outline-none transition-colors hover:bg-foreground/[0.06]"
      >
        {isActive ? (
          <StatusChip variant="check">Aktif</StatusChip>
        ) : (
          <StatusChip variant="xmark">Pasif</StatusChip>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover
        className="w-[140px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
        style={{
          border: '1px solid var(--border)',
          boxShadow:
            '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
        }}
      >
        <Dropdown.Menu
          aria-label="Durum"
          onAction={(key) => onSelect(key === 'active')}
          className="flex flex-col gap-0 py-1 outline-none"
        >
          <Dropdown.Item
            id="active"
            textValue="Aktif"
            className={MENU_ITEM_CLASS}
          >
            <Check className="h-4 w-4 shrink-0 text-success" />
            <span className="flex-1 truncate">Aktif</span>
          </Dropdown.Item>
          <Dropdown.Item
            id="inactive"
            textValue="Pasif"
            className={MENU_ITEM_CLASS}
          >
            <CircleXmark className="h-4 w-4 shrink-0 text-muted" />
            <span className="flex-1 truncate">Pasif</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

// MENU_ITEM_CLASS — filter-popover ile birebir aynı görünüm.
const MENU_ITEM_CLASS =
  'flex h-8 cursor-pointer items-center gap-2 px-[14px] text-left text-[13px] font-medium leading-[1.193] text-foreground outline-none transition-colors data-[hovered=true]:bg-foreground/[0.04] data-[focused=true]:bg-foreground/[0.04]';

// ---- Integration favicons cell -------------------------------------------

function IntegrationFavicons({
  stores,
}: {
  stores: Array<{ id: string; name: string; url?: string | null }>;
}) {
  if (stores.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="flex items-start -space-x-2.5">
      {stores.map((s) => {
        const src = storeFaviconUrl(s.url);
        return (
          <UITooltip key={s.id} delay={0}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface"
              style={{ boxShadow: '0 0 0 2px rgb(245 245 245)' }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-sm"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[9px] font-semibold text-muted">
                  {s.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <UITooltip.Content>{s.name}</UITooltip.Content>
          </UITooltip>
        );
      })}
    </div>
  );
}

// ---- Sort header button (chip-style) -------------------------------------

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
    // Default: text-muted, bg yok, arrow gizli (sortField bu kolon olsa bile
    //   aktif-stil uygulanmaz — kolon başlığı her zaman diğer muted
    //   başlıklar gibi görünür).
    // Hover: bg-default (HeroUI v3 neutral token), text-foreground, arrow
    //   16×16 görünür. Aktif yön sadece hover sırasında okunabilir: ASC
    //   iken arrow yukarı (rotate-180), DESC iken aşağı. Renkler tema
    //   token'larından (text-muted, text-foreground, bg-default) geliyor —
    //   hardcoded hex yok.
    <button
      type="button"
      onClick={() => onSort(field)}
      className="group inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium leading-4 text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      {children}
      <ArrowDown
        className={[
          // 12×12 — text-xs (12px) ile orantılı; 16×16 fazla büyük kalıyordu.
          'h-3 w-3 opacity-0 transition-all group-hover:opacity-100',
          isActive && currentOrder === 'asc' ? 'rotate-180' : '',
        ].join(' ')}
      />
    </button>
  );
}

// ---- Price chip — plain text (Satış Fiyatı) ------------------------------
// Pazaryeri başına fiyat varsa hover'da popover ile her platformun
// fiyatını gösterir.

function PriceChip({
  value,
  marketplacePrices,
}: {
  value: number;
  marketplacePrices?: Array<{
    storeId: string;
    storeName: string;
    price: number;
  }>;
}) {
  const formatted = `₺${value.toLocaleString('tr-TR')}`;
  const hasMultiple =
    marketplacePrices && marketplacePrices.length > 1;

  const chip = (
    <span
      className={[
        'inline-flex h-5 items-center justify-center gap-1 rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-foreground',
        hasMultiple ? 'cursor-help underline decoration-dotted underline-offset-4' : '',
      ].join(' ')}
    >
      {formatted}
    </span>
  );

  if (!hasMultiple) return chip;

  return (
    <UITooltip delay={0}>
      {chip}
      <UITooltip.Content className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-muted">Pazaryeri Fiyatları</span>
          {marketplacePrices!.map((mp) => (
            <div
              key={mp.storeId}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-foreground">{mp.storeName}</span>
              <span className="font-medium text-foreground">
                ₺{mp.price.toLocaleString('tr-TR')}
              </span>
            </div>
          ))}
        </div>
      </UITooltip.Content>
    </UITooltip>
  );
}

// ---- Status chip — check (active) / xmark (muted) ------------------------

function StatusChip({
  variant,
  children,
}: {
  variant: 'check' | 'xmark';
  children: React.ReactNode;
}) {
  if (variant === 'check') {
    return (
      <span className="inline-flex h-5 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-foreground">
        <Check className="h-3 w-3 shrink-0 text-success" />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-0.5 text-xs font-medium leading-4 text-muted">
      <CircleXmark className="h-3 w-3 shrink-0" />
      {children}
    </span>
  );
}
