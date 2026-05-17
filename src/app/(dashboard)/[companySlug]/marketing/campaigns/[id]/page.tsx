'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Eye,
  PaperPlane,
  Pencil,
  Tag,
  TrashBin,
} from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import {
  useMarketingCampaignStore,
  type AudienceFilter,
  type AudiencePreview,
  type MarketingCampaign,
} from '@/stores/marketingCampaignStore';
import { MailBlockEditor } from '@/components/marketing/mail-block-editor';
import {
  collectProductIds,
  compileBlocksToHtml,
  compileBlocksToPreviewHtml,
  makeDefaultBlock,
  type MailBlock,
} from '@/components/marketing/mail-blocks';

const FIELD_CLASS =
  'bg-transparent focus:outline-none focus:ring-0 focus:bg-foreground/[0.06] data-[focused=true]:bg-foreground/[0.06] placeholder:text-zinc-500';

/** Section card — products/new pattern'i ile aynı (bg-white/60 + 12px). */
function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`w-full rounded-xl bg-white/60 p-3 ${className}`}>
      {children}
    </section>
  );
}

/** Sol 112px label + sağ input — products/new FieldRow. */
function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-6">
      <div className="flex h-9 w-28 shrink-0 items-center gap-2 py-2">
        {icon}
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** balinaOS AI chroma-border pill — products/new BalinaAiButton. */
function BalinaAiButton({
  onPress,
  isPending,
  isDisabled,
  label = 'balinaOS AI',
  className = '',
}: {
  onPress: () => void;
  isPending?: boolean;
  isDisabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      variant="tertiary"
      size="sm"
      onPress={onPress}
      isPending={isPending}
      isDisabled={isDisabled}
      className={`chroma-border h-9 cursor-pointer rounded-full bg-foreground/[0.06] px-4 text-sm font-medium text-foreground ${className}`}
    >
      <BalinaOsMark className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Button>
  );
}

/** Tarih input. */
function DateRow({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="h-9 w-full rounded-xl bg-transparent px-3 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-500 hover:bg-foreground/[0.04] focus:bg-foreground/[0.06]"
    />
  );
}

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

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<MailBlock[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('');
  const [audienceStoreIds, setAudienceStoreIds] = useState<string[]>([]);
  const [audienceTagsRaw, setAudienceTagsRaw] = useState('');
  const [audienceLastOrderAfter, setAudienceLastOrderAfter] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>(
    'desktop',
  );
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isReadOnly =
    !!campaign && ['sending', 'sent'].includes(campaign.status);

  // Body html derive — her blok değişiminde hesaplanır, kaydederken
  // bodyHtml + productIds güncellenir.
  const compiledHtml = compileBlocksToHtml(blocks);
  const compiledProductIds = collectProductIds(blocks);

  const loadCampaign = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const c = await fetchOne(currentCompany.id, campaignId);
    if (c) {
      setCampaign(c);
      setName(c.name);
      setSubject(c.subject);
      const storedBlocks =
        (c.bodyMeta as { blocks?: MailBlock[] } | null)?.blocks ?? null;
      if (storedBlocks && storedBlocks.length > 0) {
        setBlocks(storedBlocks);
      } else if (c.bodyHtml) {
        // Eski format — sade text block olarak migrate et.
        setBlocks([{ ...makeDefaultBlock('text'), text: stripTagsBrief(c.bodyHtml) } as MailBlock]);
      } else {
        setBlocks([]);
      }
      setAiPrompt(c.bodyMeta?.aiPrompt ?? '');
      setAiTone(c.bodyMeta?.aiTone ?? '');
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

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  useEffect(() => {
    if (!currentCompany?.id || !campaign) return;
    fetchAudience(currentCompany.id, campaign.id).then(setAudience);
  }, [currentCompany?.id, campaign, fetchAudience]);

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

  const handleSave = async (silent = false) => {
    if (!currentCompany?.id || !campaign) return null;
    setIsSaving(true);
    const updated = await updateCampaign(currentCompany.id, campaign.id, {
      name: name.trim() || 'İsimsiz kampanya',
      subject: subject.trim(),
      bodyHtml: compiledHtml,
      bodyMeta: { blocks, productIds: compiledProductIds, aiPrompt, aiTone },
      audienceFilter: buildAudienceFilter(),
    });
    setIsSaving(false);
    if (updated) {
      setCampaign(updated);
      if (!silent) toast.success('Kaydedildi');
      return updated;
    }
    if (!silent) toast.danger('Kaydedilemedi');
    return null;
  };

  const handleGenerate = async () => {
    if (!currentCompany?.id || !campaign) return;
    if (!aiPrompt.trim()) {
      toast.danger('Önce AI için brief yaz');
      return;
    }
    setIsGenerating(true);
    await handleSave(true);
    const result = await generateContent(currentCompany.id, campaign.id, {
      prompt: aiPrompt,
      tone: aiTone || undefined,
      productIds: compiledProductIds.length ? compiledProductIds : undefined,
    });
    setIsGenerating(false);
    if (!result) {
      toast.danger('AI içerik üretemedi');
      return;
    }
    setSubject(result.subject);
    // AI üretimi tek text block olarak — kullanıcı sonra blokları düzenler.
    const base = makeDefaultBlock('text');
    if (base.type === 'text') {
      base.text = stripHtmlToText(result.bodyHtml);
    }
    setBlocks([base]);
    toast.success('İçerik üretildi — blok olarak eklendi, düzenleyebilirsin');
  };

  const handlePreview = async () => {
    if (!currentCompany?.id || !campaign) return;
    await handleSave(true);
    const result = await fetchPreview(currentCompany.id, campaign.id);
    if (result) setPreviewHtml(result.html);
  };

  const handleSendNow = async () => {
    if (!currentCompany?.id || !campaign) return;
    await handleSave(true);
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
    await handleSave(true);
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

  const handleDelete = () => setDeleteOpen(true);
  const handleConfirmDelete = async () => {
    if (!currentCompany?.id || !campaign) return;
    setIsDeleting(true);
    const ok = await deleteCampaign(currentCompany.id, campaign.id);
    setIsDeleting(false);
    if (ok) router.push(`/${slug}/marketing/campaigns`);
    else {
      toast.danger('Silinemedi');
      setDeleteOpen(false);
    }
  };

  const handleTestSend = async () => {
    if (!currentCompany?.id || !campaign) return;
    const email = testEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.danger('Geçerli bir e-posta girin');
      return;
    }
    await handleSave(true);
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

  if (loading) {
    return (
      <>
        <PageHeader title="Yükleniyor…" />
        <div className="p-6 text-sm text-muted">Kampanya yükleniyor…</div>
      </>
    );
  }
  if (!campaign) {
    return (
      <>
        <PageHeader title="Kampanya bulunamadı" />
        <div className="p-6 text-sm text-muted">Kampanya bulunamadı.</div>
      </>
    );
  }

  return (
    <>
      {/* Kampanya silme onayı — products/new ile aynı AlertDialog. */}
      <AlertDialog
        isOpen={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting && !open) setDeleteOpen(false);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Kampanyayı sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-2 pb-0">
                Bu kampanya kalıcı olarak silinecek. Geri alınamaz.
              </AlertDialog.Body>
              <AlertDialog.Footer className="!mt-3 px-2">
                <Button variant="tertiary" slot="close" isDisabled={isDeleting}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={handleConfirmDelete}
                  isPending={isDeleting}
                  isDisabled={isDeleting}
                >
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Test gönder modal */}
      <Modal
        isOpen={testSendOpen}
        onOpenChange={(o) => {
          if (!isTestSending && !o) setTestSendOpen(false);
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
                  Yalnızca bu adrese gönderilir, audience etkilenmez.
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

      {/* Preview modal — iframe ile gerçek render, mobil/masaüstü toggle. */}
      <Modal
        isOpen={previewHtml !== null}
        onOpenChange={(o) => !o && setPreviewHtml(null)}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[760px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Mail önizleme</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="px-2 pb-2">
                <div className="mb-2 flex items-center justify-center gap-1">
                  {(['desktop', 'mobile'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPreviewDevice(d)}
                      className={[
                        'inline-flex h-7 items-center justify-center rounded-full px-3 text-[11px] font-medium transition-colors',
                        previewDevice === d
                          ? 'bg-foreground/[0.10] text-foreground'
                          : 'bg-foreground/[0.04] text-muted hover:bg-foreground/[0.06]',
                      ].join(' ')}
                    >
                      {d === 'desktop' ? 'Masaüstü' : 'Mobil'}
                    </button>
                  ))}
                </div>
                {previewHtml && (
                  <div className="flex justify-center bg-foreground/[0.03] py-3">
                    <iframe
                      title="Mail önizleme"
                      srcDoc={previewHtml}
                      style={{
                        width:
                          previewDevice === 'mobile' ? '375px' : '680px',
                        height: '600px',
                      }}
                      className="rounded-lg border-0 transition-[width] duration-200"
                    />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">
                  Kapat
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* === PageHeader — products/new ile birebir === */}
      <PageHeader
        title={name.trim() || 'İsimsiz Kampanya'}
        leading={
          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            aria-label="Geri"
            onPress={() => router.push(`/${slug}/marketing/campaigns`)}
            className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        }
        action={
          <div className="flex items-center gap-2">
            {(campaign.status === 'draft' ||
              campaign.status === 'cancelled' ||
              campaign.status === 'failed') && (
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
            )}
            <Button
              variant="tertiary"
              size="sm"
              onPress={() => handleSave()}
              isPending={isSaving}
              isDisabled={isSaving || isReadOnly}
              className="h-8 rounded-full bg-foreground/[0.04] px-3 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Kaydet
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col overflow-auto">
        <div className="mx-auto flex w-full max-w-[616px] flex-col gap-3 px-3 py-6">
          {/* === 1) Başlık + Konu + AI butonu (textarea içinde absolute) === */}
          <Section>
            <div className="flex flex-col gap-2">
              <TextField
                value={name}
                onChange={setName}
                aria-label="Kampanya başlığı"
                isDisabled={isReadOnly}
              >
                <Input
                  fullWidth
                  variant="secondary"
                  placeholder="Kampanya Başlığı (iç kullanım)"
                  className="bg-transparent text-lg font-medium leading-7 placeholder:text-zinc-500"
                />
              </TextField>

              <div className="relative">
                <TextField
                  value={subject}
                  onChange={setSubject}
                  aria-label="Mail konusu"
                  isDisabled={isReadOnly}
                >
                  <Input
                    fullWidth
                    variant="secondary"
                    placeholder="Mail konusu — alıcının inbox'unda görünecek"
                    className={FIELD_CLASS}
                  />
                </TextField>
              </div>

              {/* AI brief textarea + AI butonu — products/new ile aynı pattern */}
              <div className="relative">
                <TextField
                  value={aiPrompt}
                  onChange={setAiPrompt}
                  aria-label="AI içerik brief'i"
                  isDisabled={isReadOnly}
                >
                  <TextArea
                    fullWidth
                    variant="secondary"
                    placeholder='AI ile içerik üret — brief: "Bahar indirimi, %20 tüm elbiseler, 3 gün sürer, samimi ton"'
                    rows={3}
                    className="min-h-[88px] resize-none bg-transparent placeholder:text-zinc-500"
                  />
                </TextField>
                <div className="pointer-events-none absolute bottom-2 right-2 z-10">
                  <div className="pointer-events-auto">
                    <BalinaAiButton
                      onPress={handleGenerate}
                      isPending={isGenerating}
                      isDisabled={isGenerating || isReadOnly || !aiPrompt.trim()}
                      label="İçerik Üret"
                    />
                  </div>
                </div>
              </div>
              <FieldRow icon={<Pencil className="h-4 w-4 text-muted" />} label="Ton">
                <TextField
                  value={aiTone}
                  onChange={setAiTone}
                  isDisabled={isReadOnly}
                  aria-label="Ton"
                >
                  <Input
                    fullWidth
                    variant="secondary"
                    placeholder="Örn. samimi, espirili, resmi"
                    className={FIELD_CLASS}
                  />
                </TextField>
              </FieldRow>
            </div>
          </Section>

        </div>

        {/* === 2) Mail tasarımı — Canvas split: sol blok editor + sağ canlı önizleme ===
            Daha geniş container (1180px) — canvas iframe için yer açar. */}
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-3 pb-6">
          <Section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Mail tasarımı
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setTestSendOpen(true)}
                  isDisabled={isReadOnly || !subject.trim() || blocks.length === 0}
                  className="h-7 rounded-full px-2 text-xs"
                >
                  <PaperPlane className="h-3.5 w-3.5" />
                  Test gönder
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={handlePreview}
                  isDisabled={isReadOnly || blocks.length === 0}
                  className="h-7 rounded-full px-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Tam önizle
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
              {/* Sol: blok editör */}
              <div className="flex flex-col">
                <MailBlockEditor
                  blocks={blocks}
                  onChange={setBlocks}
                  disabled={isReadOnly}
                />
              </div>
              {/* Sağ: canlı canvas */}
              <div className="flex flex-col">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    Canlı önizleme
                  </span>
                  <span className="text-[10px] text-muted">
                    Gerçek render Önizle butonunda
                  </span>
                </div>
                <div className="flex-1 overflow-hidden rounded-lg border border-foreground/[0.06] bg-foreground/[0.03]">
                  <iframe
                    title="Canlı canvas önizleme"
                    srcDoc={compileBlocksToPreviewHtml(blocks)}
                    className="h-[820px] w-full border-0"
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Diğer section'lar yeniden 616 genişliğinde merkezde. */}
        <div className="mx-auto flex w-full max-w-[616px] flex-col gap-3 px-3 pb-6">

          {/* === 3) Hedef kitle === */}
          <Section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Hedef kitle
              </h3>
              <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-medium text-foreground">
                {audience?.count ?? '—'} kişi
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <FieldRow
                icon={<Tag className="h-4 w-4 text-muted" />}
                label="Mağazalar"
              >
                <div className="flex flex-wrap gap-1">
                  {stores.length === 0 ? (
                    <span className="text-xs text-muted">Mağaza yok</span>
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
                            'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors',
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
              </FieldRow>
              <FieldRow
                icon={<Tag className="h-4 w-4 text-muted" />}
                label="Tag'ler"
              >
                <TextField
                  value={audienceTagsRaw}
                  onChange={setAudienceTagsRaw}
                  isDisabled={isReadOnly}
                  aria-label="Tag'ler"
                >
                  <Input
                    fullWidth
                    variant="secondary"
                    placeholder="vip, mart-2026, ... (virgülle ayır)"
                    className={FIELD_CLASS}
                  />
                </TextField>
              </FieldRow>
              <FieldRow
                icon={<Calendar className="h-4 w-4 text-muted" />}
                label="Son sipariş"
              >
                <input
                  type="date"
                  value={audienceLastOrderAfter}
                  onChange={(e) => setAudienceLastOrderAfter(e.target.value)}
                  disabled={isReadOnly}
                  className="h-9 w-full rounded-xl bg-transparent px-3 text-sm text-foreground outline-none transition-colors hover:bg-foreground/[0.04] focus:bg-foreground/[0.06]"
                />
              </FieldRow>
            </div>
          </Section>

          {/* === 4) Gönderim === */}
          {!isReadOnly && (
            <Section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Gönderim</h3>
                {campaign.status !== 'draft' && (
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
                    {campaign.status}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <FieldRow
                  icon={<Clock className="h-4 w-4 text-muted" />}
                  label="Planla"
                >
                  <DateRow
                    value={scheduleAt}
                    onChange={setScheduleAt}
                    disabled={isScheduling || isSending}
                  />
                </FieldRow>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleSendNow}
                      isPending={isSending}
                      isDisabled={
                        isSending ||
                        !subject.trim() ||
                        blocks.length === 0 ||
                        (audience?.count ?? 0) === 0
                      }
                      className="rounded-full"
                    >
                      <PaperPlane className="h-3.5 w-3.5" />
                      Hemen gönder
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={handleSchedule}
                      isPending={isScheduling}
                      isDisabled={
                        isScheduling || !scheduleAt || !subject.trim() || blocks.length === 0
                      }
                      className="rounded-full"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Planla
                    </Button>
                  </div>
                  {(campaign.status === 'scheduled' ||
                    campaign.status === 'sending') && (
                    <Button
                      variant="danger"
                      size="sm"
                      onPress={handleCancel}
                      className="rounded-full"
                    >
                      İptal et
                    </Button>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* === 5) Stat'lar (gönderilen kampanya için) === */}
          {campaign.status === 'sent' && (
            <Section>
              <h3 className="mb-3 text-sm font-medium text-foreground">
                Performans
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Gönderildi" value={campaign.sentCount} />
                <Stat label="Açıldı" value={campaign.openedCount} />
                <Stat label="Tıklandı" value={campaign.clickedCount} />
                <Stat label="Başarısız" value={campaign.failedCount} />
                <Stat label="Bounce/şikayet" value={0} />
                <Stat
                  label="Aboneliği iptal"
                  value={campaign.unsubscribedCount}
                />
              </div>
            </Section>
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

/** AI üretiminden gelen HTML'i tek paragraf text'e çevir — block-text init için. */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Migrasyon — eski raw HTML kampanyaları için kısa metin çıkart. */
function stripTagsBrief(html: string): string {
  return stripHtmlToText(html).slice(0, 4000);
}

