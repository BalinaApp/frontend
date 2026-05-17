'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowDown,
  Check,
  Clock,
  CircleDashed,
  CircleXmark,
  Envelope,
  Magnifier,
  Plus,
} from '@gravity-ui/icons';
import { AlertDialog, Button, Modal, toast } from '@heroui/react';
import {
  compileBlocksToHtml,
  collectProductIds,
} from '@/components/marketing/mail-blocks';
import { MAIL_TEMPLATES, type MailTemplate } from '@/components/marketing/mail-templates';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { useCompanyStore } from '@/stores/companyStore';
import { useSavedFilterStore } from '@/stores/savedFilterStore';
import { SavedTab } from '@/components/products/saved-tab';
import {
  useMarketingCampaignStore,
  type CampaignStatus,
  type MarketingCampaign,
} from '@/stores/marketingCampaignStore';

const SAVED_CONTEXT = 'marketing-campaigns';

const STATUS_TABS: { id: 'all' | CampaignStatus; label: string }[] = [
  { id: 'all', label: 'Tüm Kampanyalar' },
  { id: 'draft', label: 'Taslak' },
  { id: 'scheduled', label: 'Planlandı' },
  { id: 'sending', label: 'Gönderiliyor' },
  { id: 'sent', label: 'Gönderildi' },
];

const STATUS_LABELS: Record<string, { label: string; tone: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  draft: { label: 'Taslak', tone: 'text-muted', Icon: CircleDashed },
  scheduled: { label: 'Planlandı', tone: 'text-accent', Icon: Clock },
  sending: { label: 'Gönderiliyor', tone: 'text-warning-foreground', Icon: Clock },
  sent: { label: 'Gönderildi', tone: 'text-success', Icon: Check },
  cancelled: { label: 'İptal', tone: 'text-muted', Icon: CircleXmark },
  failed: { label: 'Başarısız', tone: 'text-danger', Icon: CircleXmark },
};

type SortField = 'updatedAt' | 'name' | 'sentCount';
type SortOrder = 'asc' | 'desc';

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

export default function MarketingCampaignsPage() {
  usePageTitle('Pazarlama');
  const router = useRouter();
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';
  const { currentCompany } = useCompanyStore();
  const { campaigns, isLoading, fetchCampaigns, createCampaign } =
    useMarketingCampaignStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CampaignStatus>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [creating, setCreating] = useState(false);

  // Saved filter tabs — contacts page ile aynı pattern.
  const fetchSaved = useSavedFilterStore((s) => s.fetch);
  const allSavedFilters = useSavedFilterStore((s) => s.filters);
  const updateSaved = useSavedFilterStore((s) => s.update);
  const removeSaved = useSavedFilterStore((s) => s.remove);
  const createSaved = useSavedFilterStore((s) => s.create);
  const savedFilters = useMemo(
    () => allSavedFilters.filter((f) => f.context === SAVED_CONTEXT),
    [allSavedFilters],
  );
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  useEffect(() => {
    if (currentCompany?.id) fetchSaved(currentCompany.id, SAVED_CONTEXT);
  }, [currentCompany?.id, fetchSaved]);

  // Saved tab dropdown aksiyonları (rename / duplicate / delete) — contacts ile aynı.
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
      SAVED_CONTEXT,
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

  useEffect(() => {
    if (!currentCompany?.id) return;
    fetchCampaigns(currentCompany.id, {
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
    });
  }, [currentCompany?.id, search, status, fetchCampaigns]);

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(f);
      setSortOrder('desc');
    }
  };

  const visible = useMemo(() => {
    const sign = sortOrder === 'asc' ? 1 : -1;
    return [...campaigns].sort((a, b) => {
      switch (sortField) {
        case 'name':
          return sign * a.name.localeCompare(b.name, 'tr');
        case 'sentCount':
          return sign * (a.sentCount - b.sentCount);
        case 'updatedAt':
        default: {
          const at = new Date(a.updatedAt).getTime();
          const bt = new Date(b.updatedAt).getTime();
          return sign * (at - bt);
        }
      }
    });
  }, [campaigns, sortField, sortOrder]);

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const handleCreateFromTemplate = async (tpl: MailTemplate) => {
    if (!currentCompany?.id) return;
    setCreating(true);
    const productIds = collectProductIds(tpl.blocks);
    const bodyHtml = compileBlocksToHtml(tpl.blocks);
    const created = await createCampaign(currentCompany.id, {
      name: tpl.name === 'Boş tema' ? 'Yeni Kampanya' : tpl.name,
      subject: tpl.subject,
      bodyHtml,
      bodyMeta: { blocks: tpl.blocks, productIds },
    });
    setCreating(false);
    setTemplatePickerOpen(false);
    if (created) router.push(`/${slug}/marketing/campaigns/${created.id}`);
    else toast.danger('Kampanya oluşturulamadı');
  };

  return (
    <>
      {/* Şablon seçim modal'ı — yeni kampanya akışı buradan başlar. */}
      <Modal
        isOpen={templatePickerOpen}
        onOpenChange={(o) => {
          if (!creating && !o) setTemplatePickerOpen(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[640px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Şablon seç</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="px-4 pb-2">
                <p className="mb-3 text-xs text-muted">
                  Hızlı başlangıç için bir şablonla aç — sonra blokları
                  düzenleyebilirsin.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MAIL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleCreateFromTemplate(tpl)}
                      disabled={creating}
                      className="flex flex-col items-start gap-1 rounded-xl border border-foreground/[0.06] bg-surface p-3 text-left transition-colors hover:bg-foreground/[0.04] disabled:opacity-50"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {tpl.name}
                      </span>
                      <span className="text-xs text-muted">{tpl.description}</span>
                      <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                        {tpl.blocks.length} blok
                      </span>
                    </button>
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close" isDisabled={creating}>
                  Vazgeç
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Saved filter sil onayı */}
      <AlertDialog
        isOpen={deleteSavedId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteSavedId(null);
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
                Bu filtre seti kalıcı olarak silinecek.
              </AlertDialog.Body>
              <AlertDialog.Footer className="!mt-3 px-2">
                <Button variant="tertiary" slot="close">
                  Vazgeç
                </Button>
                <Button variant="danger" onPress={handleConfirmDeleteSaved}>
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Saved filter rename modal */}
      {renameId !== null && (
        <AlertDialog
          isOpen={true}
          onOpenChange={(o) => {
            if (!isRenaming && !o) setRenameId(null);
          }}
        >
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[420px]">
                <AlertDialog.Header>
                  <AlertDialog.Heading>
                    Filtre setini adlandır
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <div className="px-6 pb-4">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitRename();
                      }
                    }}
                    placeholder="Filtre seti adı"
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <AlertDialog.Footer>
                  <Button
                    variant="tertiary"
                    slot="close"
                    isDisabled={isRenaming}
                  >
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
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      )}

      <PageHeader
        title="Kampanyalar"
        action={
          <Button
            variant="primary"
            size="sm"
            onPress={() => setTemplatePickerOpen(true)}
            isPending={creating}
            isDisabled={creating || !currentCompany?.id}
            className="h-8 rounded-full px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni kampanya
          </Button>
        }
      />

      <div className="flex flex-col">
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_TABS.map((t) => (
                <TabPill
                  key={t.id}
                  selected={status === t.id && activeSavedId === null}
                  onPress={() => {
                    setStatus(t.id);
                    setActiveSavedId(null);
                  }}
                >
                  {t.label}
                </TabPill>
              ))}
              {savedFilters.map((sf) => (
                <SavedTab
                  key={sf.id}
                  name={sf.name}
                  isActive={activeSavedId === sf.id}
                  onSelect={() => {
                    setActiveSavedId(sf.id);
                    // Şu an yalnızca status kayıtlı — saved filter
                    // genişletildiğinde diğer alanlar da uygulanır.
                    const s = sf.payload?.status as string | undefined;
                    if (s && s !== 'all') {
                      setStatus(s as CampaignStatus);
                    }
                  }}
                  onRename={() => openRename(sf.id, sf.name)}
                  onDuplicate={() => handleDuplicate(sf)}
                  onDelete={() => handleDeleteSaved(sf.id)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-surface px-3 py-1.5">
              <Magnifier className="h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kampanya adı veya konu ara"
                className="w-56 border-0 bg-transparent p-0 text-xs text-foreground outline-none placeholder:text-muted focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-3">
              <CellWrap>
                <SortHeaderButton
                  field="name"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Kampanya
                </SortHeaderButton>
              </CellWrap>
            </div>
            <div className="flex flex-1 items-center gap-20">
              <CellWrap>
                <SortHeaderButton
                  field="sentCount"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Gönderim
                </SortHeaderButton>
              </CellWrap>
              <CellWrap>
                <span className="rounded-full px-2 py-1 text-xs font-medium leading-4 text-muted">
                  Açılma
                </span>
              </CellWrap>
              <CellWrap>
                <SortHeaderButton
                  field="updatedAt"
                  currentField={sortField}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                >
                  Güncellendi
                </SortHeaderButton>
              </CellWrap>
              <CellWrap>
                <span className="rounded-full px-2 py-1 text-xs font-medium leading-4 text-muted">
                  Durum
                </span>
              </CellWrap>
            </div>
          </div>

          <div className="flex flex-col">
            {isLoading && campaigns.length === 0 ? (
              <div className="h-12" />
            ) : visible.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                Kampanya bulunamadı
              </div>
            ) : (
              visible.map((c) => (
                <CampaignRow key={c.id} c={c} slug={slug} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CampaignRow({
  c,
  slug,
}: {
  c: MarketingCampaign;
  slug: string;
}) {
  const router = useRouter();
  const statusMeta = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft;
  const StatusIcon = statusMeta.Icon;
  const openRate =
    c.sentCount > 0
      ? `${Math.round((c.openedCount / c.sentCount) * 100)}%`
      : '—';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/${slug}/marketing/campaigns/${c.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/${slug}/marketing/campaigns/${c.id}`);
        }
      }}
      className="flex h-[60px] cursor-pointer items-center justify-between rounded-2xl p-3 transition-colors hover:bg-foreground/[0.04]"
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default text-muted">
          <Envelope className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span
            className="truncate text-sm font-medium leading-5 text-foreground"
            title={c.name}
          >
            {c.name}
          </span>
          <span className="truncate text-xs text-muted">
            {c.subject || 'Konu yok'}
          </span>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-20 text-xs text-foreground">
        <CellWrap>
          <span className="text-foreground">
            {c.sentCount}/{c.recipientCount || '—'}
          </span>
        </CellWrap>
        <CellWrap>
          <span className="text-foreground">{openRate}</span>
        </CellWrap>
        <CellWrap>
          <span className="text-foreground">{formatDate(c.updatedAt)}</span>
        </CellWrap>
        <CellWrap>
          <span
            className={[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              statusMeta.tone,
            ].join(' ')}
          >
            <StatusIcon className="h-3 w-3" />
            {statusMeta.label}
          </span>
        </CellWrap>
      </div>
    </div>
  );
}

function CellWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex min-w-fit flex-1 flex-col items-start justify-start gap-2.5">
      {children}
    </div>
  );
}

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
