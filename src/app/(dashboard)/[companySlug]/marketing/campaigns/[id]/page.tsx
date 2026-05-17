'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CircleXmark,
  Clock,
  Eye,
  Magnifier,
  PaperPlane,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import Image from 'next/image';
import {
  AlertDialog,
  Button,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from '@heroui/react';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import {
  useMarketingCampaignStore,
  type AudienceFilter,
  type AudiencePreview,
  type MarketingCampaign,
} from '@/stores/marketingCampaignStore';

export default function CampaignEditorPage() {
  usePageTitle('Pazarlama');
  const router = useRouter();
  const params = useParams<{ companySlug: string; id: string }>();
  const slug = params?.companySlug ?? '';
  const campaignId = params?.id ?? '';
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    fetchOne,
    updateCampaign,
    deleteCampaign,
    generateContent,
    sendNow,
    schedule,
    cancel,
    fetchAudience,
    fetchPreview,
    testSend,
  } = useMarketingCampaignStore();

  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState<AudiencePreview | null>(null);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);

  // Audience filter — boş bırakılırsa tüm aktif (subscribed) kontaklar.
  const [audienceStoreIds, setAudienceStoreIds] = useState<string[]>([]);
  const [audienceTagsRaw, setAudienceTagsRaw] = useState('');
  const [audienceLastOrderAfter, setAudienceLastOrderAfter] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);

  const isReadOnly =
    !!campaign &&
    ['sending', 'sent'].includes(campaign.status);

  const loadCampaign = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const c = await fetchOne(currentCompany.id, campaignId);
    if (c) {
      setCampaign(c);
      setName(c.name);
      setSubject(c.subject);
      setBodyHtml(c.bodyHtml);
      setAiPrompt(c.bodyMeta?.aiPrompt ?? '');
      setAiTone(c.bodyMeta?.aiTone ?? '');
      setProductIds(c.bodyMeta?.productIds ?? []);
      // Audience filter alanları
      setAudienceStoreIds(c.audienceFilter?.storeIds ?? []);
      setAudienceTagsRaw((c.audienceFilter?.tags ?? []).join(', '));
      setAudienceLastOrderAfter(c.audienceFilter?.lastOrderAfter ?? '');
      if (c.scheduledAt) {
        const d = new Date(c.scheduledAt);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduleAt(local);
      }
    }
    setLoading(false);
  }, [currentCompany?.id, campaignId, fetchOne]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Mağaza listesi audience filter için.
  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  // Audience filter değiştikçe preview'ı tazele.
  useEffect(() => {
    if (!currentCompany?.id || !campaign) return;
    fetchAudience(currentCompany.id, campaign.id).then(setAudience);
  }, [
    currentCompany?.id,
    campaign,
    fetchAudience,
    // Save sonrası audience değiştiğinde tetiklensin.
    campaign?.audienceFilter,
  ]);

  const buildAudienceFilter = (): AudienceFilter => {
    const tags = audienceTagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      storeIds: audienceStoreIds.length ? audienceStoreIds : undefined,
      tags: tags.length ? tags : undefined,
      lastOrderAfter: audienceLastOrderAfter
        ? new Date(audienceLastOrderAfter).toISOString()
        : undefined,
    };
  };

  const handleSave = async () => {
    if (!currentCompany?.id || !campaign) return;
    setIsSaving(true);
    const updated = await updateCampaign(currentCompany.id, campaign.id, {
      name: name.trim(),
      subject: subject.trim(),
      bodyHtml,
      bodyMeta: { productIds, aiPrompt, aiTone },
      audienceFilter: buildAudienceFilter(),
    });
    setIsSaving(false);
    if (updated) {
      setCampaign(updated);
      toast.success('Kaydedildi');
    } else {
      toast.danger('Kaydedilemedi');
    }
  };

  const handleGenerate = async () => {
    if (!currentCompany?.id || !campaign) return;
    if (!aiPrompt.trim()) {
      toast.danger('Önce AI için brief yaz');
      return;
    }
    setIsGenerating(true);
    // Generate öncesi en güncel state'i sunucuya yaz — AI bunları context olarak okuyor.
    await updateCampaign(currentCompany.id, campaign.id, {
      name: name.trim(),
      subject: subject.trim(),
      bodyHtml,
      bodyMeta: { productIds, aiPrompt, aiTone },
      audienceFilter: buildAudienceFilter(),
    });
    const result = await generateContent(currentCompany.id, campaign.id, {
      prompt: aiPrompt,
      tone: aiTone || undefined,
      productIds: productIds.length ? productIds : undefined,
    });
    setIsGenerating(false);
    if (!result) {
      toast.danger('AI içerik üretemedi');
      return;
    }
    setSubject(result.subject);
    setBodyHtml(result.bodyHtml);
    toast.success('İçerik üretildi');
  };

  const handlePreview = async () => {
    if (!currentCompany?.id || !campaign) return;
    // Önce kaydet — preview backend'den render gelir.
    await handleSave();
    const result = await fetchPreview(currentCompany.id, campaign.id);
    if (result) setPreviewHtml(result.html);
  };

  const handleTestSend = async () => {
    if (!currentCompany?.id || !campaign) return;
    const email = testEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.danger('Geçerli bir e-posta girin');
      return;
    }
    await handleSave();
    setIsTestSending(true);
    const result = await testSend(currentCompany.id, campaign.id, email);
    setIsTestSending(false);
    if (result?.ok) {
      toast.success('Test maili gönderildi');
      setTestSendOpen(false);
    } else {
      toast.danger('Test gönderilemedi');
    }
  };

  const handleSendNow = async () => {
    if (!currentCompany?.id || !campaign) return;
    await handleSave();
    setIsSending(true);
    const updated = await sendNow(currentCompany.id, campaign.id);
    setIsSending(false);
    if (updated) {
      setCampaign(updated);
      toast.success('Kampanya gönderim sırasına alındı');
    } else {
      toast.danger('Gönderim başlatılamadı');
    }
  };

  const handleSchedule = async () => {
    if (!currentCompany?.id || !campaign || !scheduleAt) return;
    await handleSave();
    setIsScheduling(true);
    const updated = await schedule(
      currentCompany.id,
      campaign.id,
      new Date(scheduleAt),
    );
    setIsScheduling(false);
    if (updated) {
      setCampaign(updated);
      toast.success('Kampanya planlandı');
    } else {
      toast.danger('Planlanamadı');
    }
  };

  const handleCancel = async () => {
    if (!currentCompany?.id || !campaign) return;
    const updated = await cancel(currentCompany.id, campaign.id);
    if (updated) {
      setCampaign(updated);
      toast.success('İptal edildi');
    } else {
      toast.danger('İptal edilemedi');
    }
  };

  const handleDelete = async () => {
    if (!currentCompany?.id || !campaign) return;
    if (!confirm('Bu kampanyayı silmek istiyor musunuz?')) return;
    const ok = await deleteCampaign(currentCompany.id, campaign.id);
    if (ok) {
      router.push(`/${slug}/marketing/campaigns`);
    } else {
      toast.danger('Silinemedi');
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Pazarlama" />
        <div className="p-6 text-sm text-muted">Yükleniyor…</div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <PageHeader title="Pazarlama" />
        <div className="p-6 text-sm text-muted">Kampanya bulunamadı.</div>
      </>
    );
  }

  return (
    <>
      <ProductPickerInline
        isOpen={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        selectedIds={productIds}
        onToggle={(id) =>
          setProductIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }
      />

      {/* Test gönder modal'ı — Resend ile gerçek mail yollar (marketing key). */}
      <Modal
        isOpen={testSendOpen}
        onOpenChange={(open) => {
          if (!isTestSending && !open) setTestSendOpen(false);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Test gönder</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="px-4">
                <TextField
                  value={testEmail}
                  onChange={setTestEmail}
                  isRequired
                  autoFocus
                >
                  <Label>Test e-posta adresi</Label>
                  <Input
                    placeholder="ornek@adres.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTestSend();
                      }
                    }}
                  />
                </TextField>
                <p className="mt-2 text-xs text-muted">
                  Sadece bu adrese gönderilir, audience etkilenmez. Konu
                  başına <code>[TEST]</code> eklenir.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  slot="close"
                  isDisabled={isTestSending}
                >
                  Vazgeç
                </Button>
                <Button
                  variant="primary"
                  onPress={handleTestSend}
                  isPending={isTestSending}
                  isDisabled={isTestSending || !testEmail.trim()}
                >
                  Gönder
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <PageHeader
        title="Pazarlama"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onPress={() => router.push(`/${slug}/marketing/campaigns`)}
              className="h-8 rounded-full px-3 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Liste
            </Button>
            {campaign.status === 'draft' || campaign.status === 'cancelled' || campaign.status === 'failed' ? (
              <Button
                variant="danger"
                size="sm"
                isIconOnly
                onPress={handleDelete}
                aria-label="Kampanyayı sil"
                className="h-8 w-8 rounded-full"
              >
                <TrashBin className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_320px]">
        {/* Main editor */}
        <div className="flex flex-col gap-4">
          {/* Name + subject */}
          <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
            <TextField
              value={name}
              onChange={setName}
              isDisabled={isReadOnly}
              isRequired
            >
              <Label>Kampanya adı (iç kullanım)</Label>
              <Input placeholder="Örn. Bahar Kampanyası 2026" />
            </TextField>
            <div className="mt-3">
              <TextField
                value={subject}
                onChange={setSubject}
                isDisabled={isReadOnly}
              >
                <Label>Mail konusu</Label>
                <Input placeholder="Alıcının inbox'unda görünecek başlık" />
              </TextField>
            </div>
          </div>

          {/* AI prompt + generate */}
          <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>AI ile içerik üret</Label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || isReadOnly || !aiPrompt.trim()}
                className="chroma-border inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06] disabled:opacity-50"
              >
                <BalinaOsMark className="h-4 w-4" />
                {isGenerating ? 'Üretiliyor…' : 'AI Üret'}
              </button>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isReadOnly}
              rows={3}
              placeholder='Brief: "Bahar indirimi, %20 tüm elbiseler, 3 gün sürer, samimi ton"'
              className="w-full rounded-lg border border-foreground/[0.06] bg-surface-secondary p-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <div className="mt-2 flex items-center gap-3">
              <TextField
                value={aiTone}
                onChange={setAiTone}
                isDisabled={isReadOnly}
                className="flex-1"
              >
                <Label>Ton (opsiyonel)</Label>
                <Input placeholder="Örn. samimi, espirili, resmi" />
              </TextField>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <Label>Eklenen ürünler</Label>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setProductPickerOpen(true)}
                  isDisabled={isReadOnly}
                  className="h-7 rounded-full px-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ürün ekle
                </Button>
              </div>
              {productIds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-foreground/[0.08] bg-surface-secondary p-3 text-xs text-muted">
                  Henüz ürün eklenmedi — gövdede{' '}
                  <code>{'{{product:id}}'}</code> placeholder'ı olarak yer alır.
                </div>
              ) : (
                <ProductChips
                  ids={productIds}
                  onRemove={(id) =>
                    setProductIds(productIds.filter((p) => p !== id))
                  }
                  disabled={isReadOnly}
                />
              )}
            </div>
          </div>

          {/* Body */}
          <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>Mail gövdesi (HTML)</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setTestSendOpen(true)}
                  isDisabled={isReadOnly || !subject.trim() || !bodyHtml.trim()}
                  className="h-7 rounded-full px-2 text-xs"
                >
                  <PaperPlane className="h-3.5 w-3.5" />
                  Test gönder
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={handlePreview}
                  isDisabled={isReadOnly}
                  className="h-7 rounded-full px-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Önizle
                </Button>
              </div>
            </div>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              disabled={isReadOnly}
              rows={16}
              placeholder="<p>Selam {{firstName}},</p><p>...</p>"
              className="w-full rounded-lg border border-foreground/[0.06] bg-surface-secondary p-3 font-mono text-xs text-foreground outline-none focus:border-accent"
            />
          </div>

          {previewHtml && (
            <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-2">
              <iframe
                title="Mail önizleme"
                srcDoc={previewHtml}
                className="h-[800px] w-full rounded-lg border-0"
              />
            </div>
          )}
        </div>

        {/* Right sidebar — audience + actions */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
            <div className="text-xs text-muted">Hedef kitle</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {audience?.count ?? '—'}
            </div>
            <div className="mt-1 text-xs text-muted">
              Aktif, mailing'den çıkmamış kontaklar
            </div>
            {audience?.sample.slice(0, 3).map((s) => (
              <div
                key={s.email}
                className="mt-2 truncate text-xs text-foreground"
                title={s.email}
              >
                {s.email}
              </div>
            ))}

            {/* Audience filter editör — kaydedince audience preview tazelenir. */}
            <div className="mt-4 border-t border-foreground/[0.06] pt-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                Filtreler
              </div>
              <div className="mb-3">
                <Label>Mağazalar</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {stores.length === 0 ? (
                    <div className="text-xs text-muted">Mağaza yok</div>
                  ) : (
                    stores.map((s) => {
                      const selected = audienceStoreIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() =>
                            setAudienceStoreIds((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((x) => x !== s.id)
                                : [...prev, s.id],
                            )
                          }
                          className={[
                            'inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors',
                            selected
                              ? 'bg-foreground/[0.10] text-foreground'
                              : 'bg-foreground/[0.04] text-muted hover:bg-foreground/[0.06]',
                          ].join(' ')}
                        >
                          {s.name}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  Hiç seçilmezse tüm mağazalardan kontaklar dahil olur.
                </div>
              </div>
              <div className="mb-3">
                <TextField
                  value={audienceTagsRaw}
                  onChange={setAudienceTagsRaw}
                  isDisabled={isReadOnly}
                >
                  <Label>Tag&apos;ler (virgülle ayır)</Label>
                  <Input placeholder="vip, kampanya-mart, ..." />
                </TextField>
              </div>
              <div>
                <Label>Son sipariş tarihinden sonra</Label>
                <input
                  type="date"
                  value={audienceLastOrderAfter}
                  onChange={(e) => setAudienceLastOrderAfter(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 h-9 w-full rounded-lg border border-foreground/[0.06] bg-surface-secondary px-2 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>
              <Button
                variant="tertiary"
                size="sm"
                onPress={handleSave}
                isPending={isSaving}
                isDisabled={isReadOnly || isSaving}
                className="mt-3 w-full rounded-full"
                fullWidth
              >
                Filtreyi uygula
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
            <div className="text-xs font-medium text-foreground">Durum</div>
            <div className="mt-1 text-sm capitalize text-foreground">
              {campaign.status}
            </div>
            {campaign.status === 'sent' && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Gönderildi" value={campaign.sentCount} />
                <Stat label="Açıldı" value={campaign.openedCount} />
                <Stat label="Tıklandı" value={campaign.clickedCount} />
                <Stat label="Başarısız" value={campaign.failedCount} />
              </div>
            )}
          </div>

          {!isReadOnly && (
            <>
              <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleSendNow}
                  isPending={isSending}
                  isDisabled={isSending || !subject.trim() || !bodyHtml.trim()}
                  className="w-full rounded-full"
                  fullWidth
                >
                  <PaperPlane className="h-3.5 w-3.5" />
                  Hemen gönder
                </Button>
                <div className="mt-3 border-t border-foreground/[0.06] pt-3">
                  <Label>veya planla</Label>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-foreground/[0.06] bg-surface-secondary px-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={handleSchedule}
                    isPending={isScheduling}
                    isDisabled={isScheduling || !scheduleAt}
                    className="mt-2 w-full rounded-full"
                    fullWidth
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Planla
                  </Button>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={handleSave}
                  isPending={isSaving}
                  className="mt-3 w-full rounded-full"
                  fullWidth
                >
                  <Check className="h-3.5 w-3.5" />
                  Taslağı kaydet
                </Button>
              </div>
            </>
          )}

          {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
            <Button
              variant="danger"
              size="sm"
              onPress={handleCancel}
              className="rounded-full"
              fullWidth
            >
              Kampanyayı iptal et
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-foreground/[0.04] p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

// ---- Product chips — eklenmiş ürünleri görsel + ad ile gösterir ---------

function ProductChips({
  ids,
  onRemove,
  disabled,
}: {
  ids: string[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const products = useInventoryStore((s) => s.products);
  const items = ids.map(
    (id) => products.find((p) => p.id === id) ?? { id, name: id, imageUrl: null },
  );
  return (
    <div className="flex flex-col gap-1">
      {items.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-surface-secondary p-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default">
            {p.imageUrl ? (
              <Image
                src={p.imageUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-cover"
                unoptimized
              />
            ) : (
              <BalinaOsMark className="h-5 w-5 opacity-50" />
            )}
          </div>
          <span className="flex-1 truncate text-xs text-foreground" title={p.name}>
            {p.name}
          </span>
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            disabled={disabled}
            aria-label="Ürünü kaldır"
            className="rounded p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50"
          >
            <CircleXmark className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---- Product picker modal — products store'dan listeler -------------------

interface ProductPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function ProductPickerInline({
  isOpen,
  onClose,
  selectedIds,
  onToggle,
}: ProductPickerProps) {
  const { currentCompany } = useCompanyStore();
  const { products, isLoading, fetchProducts } = useInventoryStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !currentCompany?.id) return;
    fetchProducts(currentCompany.id, {
      limit: 200,
      search: search.trim() || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }, [isOpen, currentCompany?.id, search, fetchProducts]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Ürün seç</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-4 pb-0">
              <div className="mb-2 flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-surface px-3 py-1.5">
                <Magnifier className="h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ürün adı veya SKU"
                  className="w-full border-0 bg-transparent p-0 text-xs text-foreground outline-none placeholder:text-muted"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {isLoading && products.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    Yükleniyor…
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    Ürün bulunamadı
                  </div>
                ) : (
                  products.map((p) => {
                    const selected = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onToggle(p.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors',
                          selected
                            ? 'bg-foreground/[0.06]'
                            : 'hover:bg-foreground/[0.04]',
                        ].join(' ')}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default">
                          {p.imageUrl ? (
                            <Image
                              src={p.imageUrl}
                              alt=""
                              width={36}
                              height={36}
                              className="h-9 w-9 object-cover"
                              unoptimized
                            />
                          ) : (
                            <BalinaOsMark className="h-5 w-5 opacity-50" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span
                            className="truncate text-sm font-medium leading-5 text-foreground"
                            title={p.name}
                          >
                            {p.name}
                          </span>
                          <span className="truncate text-xs text-muted">
                            {p.sku ?? '—'} · ₺
                            {Number(p.price).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <div
                          className={[
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                            selected
                              ? 'bg-accent text-accent-foreground'
                              : 'border border-foreground/[0.12]',
                          ].join(' ')}
                          aria-hidden="true"
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" slot="close">
                Tamam
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
