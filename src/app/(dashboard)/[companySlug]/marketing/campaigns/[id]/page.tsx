'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSidebarPanel } from '@/components/providers/SidebarPanel';
import { useSidePanel } from '@/components/providers/SidePanel';
import {
  Calendar,
  Check,
  Clock,
  Eye,
  PaperPlane,
  Pencil,
  Tag,
  TrashBin,
} from '@gravity-ui/icons';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import {
  BalinaButton,
  BalinaChip,
  BalinaConfirmDialog,
  BalinaDatePicker,
  BalinaInput,
  BalinaMailIcon,
  BalinaModal,
  BalinaSegmentedControl,
  BalinaTextarea,
  BalinaTextField,
  toast,
} from '@/components/balina';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import {
  useMarketingCampaignStore,
  type AudienceFilter,
  type AudiencePreview,
  type MarketingCampaign,
} from '@/stores/marketingCampaignStore';
import {
  collectProductIds,
  compileBlocksToHtml,
  makeDefaultBlock,
  type MailBlock,
} from '@/components/marketing/mail-blocks';
import { EmailCanvas } from '@/components/marketing/email-canvas';
import { useAiStore } from '@/stores/aiStore';
import { EmailLeftRail } from '@/components/marketing/email-left-rail';
import {
  EmailRightRail,
  StylePanel,
} from '@/components/marketing/email-right-rail';

/** Section card — products/new pattern'i ile aynı. */
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

/** balinaOS AI chroma-border pill. */
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
    <BalinaButton
      variant="soft"
      size="small"
      onClick={onPress}
      disabled={isPending || isDisabled}
      leftIcon={<BalinaOsMark className="h-4 w-4 shrink-0" aria-hidden="true" />}
      className={`chroma-border h-9 cursor-pointer rounded-full bg-foreground/[0.06] px-4 text-sm font-medium text-foreground ${className}`}
    >
      {label}
    </BalinaButton>
  );
}

function DateRow({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  // value: datetime-local biçimi 'yyyy-MM-ddTHH:mm'. Tarih → balina takvim,
  // saat → balina input. Tarih seçilmeden saat girilemez.
  const [datePart, timePart] = value
    ? [value.split('T')[0], value.split('T')[1] ?? '']
    : ['', ''];
  const setDate = (d: string) =>
    onChange(d ? `${d}T${timePart || '09:00'}` : '');
  const setTime = (t: string) => {
    if (!datePart) return;
    onChange(`${datePart}T${t}`);
  };
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <BalinaDatePicker
          value={datePart}
          onChange={setDate}
          disabled={disabled}
          disabledDates={{ before: new Date() }}
        />
      </div>
      <BalinaInput
        type="time"
        value={timePart}
        onChange={(e) => setTime(e.target.value)}
        disabled={disabled || !datePart}
        wrapperClassName="w-[120px] shrink-0"
      />
    </div>
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
  const generateImageRaw = useAiStore((s) => s.generateImageRaw);
  const {
    fetchOne,
    updateCampaign,
    deleteCampaign,
    generateContent,
    generateBlockText,
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

  // Builder state
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'details' | 'style'>('details');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  );

  // UI mutation state
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

  /** Block seçimi değiştiğinde sağ paneli otomatik aç. Effect yerine
   *  doğrudan handler içinde ele alıyoruz — cascading render önlemek için. */
  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    setRightTab(id ? 'style' : 'details');
  }, []);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  // Body html derive — her blok değişiminde hesaplanır.
  const compiledHtml = useMemo(() => compileBlocksToHtml(blocks), [blocks]);
  const compiledProductIds = useMemo(() => collectProductIds(blocks), [blocks]);

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
        setBlocks([
          { ...makeDefaultBlock('text'), text: stripTagsBrief(c.bodyHtml) } as MailBlock,
        ]);
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
    const base = makeDefaultBlock('text');
    if (base.type === 'text') {
      base.text = stripHtmlToText(result.bodyHtml);
    }
    setBlocks([base]);
    setSelectedBlockId(null);
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

  /** AI block text üretimi — canvas inline panel'den çağrılır. Mevcut tüm
   *  blokları kısa özet olarak context'e ekler ki AI mail'in akışına uygun
   *  metin üretsin. */
  const handleGenerateBlockText = useCallback(
    async (
      block: MailBlock,
      opts: { tone?: string; prompt?: string },
    ): Promise<{ text: string } | null> => {
      if (!currentCompany?.id || !campaign) return null;
      if (
        block.type !== 'heading' &&
        block.type !== 'text' &&
        block.type !== 'button'
      ) {
        return null;
      }
      const blocksContext = blocks
        .map((b, i) => {
          const kind =
            b.type === 'heading'
              ? `[${b.level.toUpperCase()}]`
              : `[${b.type}]`;
          let preview = '';
          if (b.type === 'heading' || b.type === 'text') preview = b.text;
          else if (b.type === 'button') preview = `→ ${b.label}`;
          else if (b.type === 'image') preview = b.url ? '(görsel)' : '';
          else if (b.type === 'product') preview = '(ürün kartı)';
          else if (b.type === 'product-grid')
            preview = `(${b.columns}-kolon ürün gridi)`;
          else if (b.type === 'divider') preview = '———';
          const marker = b.id === block.id ? ' ← DÜZENLENECEK' : '';
          return `${i + 1}. ${kind} ${preview}${marker}`.trim();
        })
        .join('\n');
      const currentText =
        block.type === 'button' ? block.label : block.text;
      return generateBlockText(currentCompany.id, campaign.id, {
        blockType: block.type,
        currentText,
        tone: opts.tone,
        prompt: opts.prompt,
        blocksContext,
      });
    },
    [currentCompany?.id, campaign, blocks, generateBlockText],
  );

  /** Görsel/Logo bloğu için Fal AI ile görsel üretimi. */
  const handleGenerateImage = useCallback(
    async (opts: {
      prompt: string;
      imageSize:
        | 'square_hd'
        | 'portrait_4_3'
        | 'portrait_16_9'
        | 'landscape_4_3'
        | 'landscape_16_9';
    }): Promise<{ url: string; error?: string }> => {
      if (!currentCompany?.id) {
        return { url: '', error: 'Şirket bulunamadı' };
      }
      return generateImageRaw(currentCompany.id, {
        prompt: opts.prompt,
        imageSize: opts.imageSize,
      });
    },
    [currentCompany?.id, generateImageRaw],
  );

  const updateSelectedBlock = (patch: Partial<MailBlock>) => {
    if (!selectedBlockId) return;
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === selectedBlockId ? ({ ...b, ...patch } as MailBlock) : b,
      ),
    );
  };

  // Sol blok paleti → ana sidebar'da kayan panel; sağ inspector → AI drawer.
  // Her ikisi de canlı node olarak push edilir (kapanışlar güncel state'i yakalar).
  const { setSidebarPanel } = useSidebarPanel();
  const { setSidePanel } = useSidePanel();

  const leftPanelNode = campaign ? (
        <EmailLeftRail
          blocks={blocks}
          selectedId={selectedBlockId}
          onSelect={handleSelectBlock}
          onChange={setBlocks}
          disabled={isReadOnly}
          footer={
            <div className="flex flex-col gap-1.5">
              <BalinaButton
                variant="soft"
                size="small"
                fullWidth
                onClick={() => setTestSendOpen(true)}
                disabled={
                  isReadOnly || !subject.trim() || blocks.length === 0
                }
                leftIcon={<PaperPlane className="h-3.5 w-3.5" />}
              >
                Test gönder
              </BalinaButton>
              <BalinaButton
                variant="soft"
                size="small"
                fullWidth
                onClick={handlePreview}
                disabled={isReadOnly || blocks.length === 0}
                leftIcon={<Eye className="h-3.5 w-3.5" />}
              >
                Tam önizle
              </BalinaButton>
            </div>
          }
        />
  ) : null;
  const rightPanelNode = campaign ? (
        <EmailRightRail
          tab={rightTab}
          onTabChange={setRightTab}
          hasSelection={!!selectedBlock}
        >
          {rightTab === 'style' && selectedBlock ? (
            <StylePanel
              block={selectedBlock}
              onChange={updateSelectedBlock}
              disabled={isReadOnly}
            />
          ) : (
            <div className="flex flex-col gap-3">
        {/* === Başlık + Konu + AI brief + Ton === */}
        <Section>
          <h3 className="mb-2 text-sm font-medium text-foreground">Detaylar</h3>
          <div className="flex flex-col gap-2">
            <BalinaTextField
              value={name}
              onChange={setName}
              aria-label="Kampanya başlığı"
              disabled={isReadOnly}
              placeholder="Kampanya başlığı (iç)"
            />
            <BalinaTextField
              value={subject}
              onChange={setSubject}
              aria-label="Mail konusu"
              disabled={isReadOnly}
              placeholder="Mail konusu"
            />
            <div className="relative">
              <BalinaTextarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                aria-label="AI içerik brief'i"
                disabled={isReadOnly}
                placeholder='AI brief — "Bahar indirimi, %20 elbiseler, 3 gün, samimi"'
                rows={3}
              />
              <div className="pointer-events-none absolute bottom-2 right-2 z-10">
                <div className="pointer-events-auto">
                  <BalinaAiButton
                    onPress={handleGenerate}
                    isPending={isGenerating}
                    isDisabled={isGenerating || isReadOnly || !aiPrompt.trim()}
                    label="Üret"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                <Pencil className="h-3.5 w-3.5" />
                Ton
              </div>
              <BalinaTextField
                value={aiTone}
                onChange={setAiTone}
                disabled={isReadOnly}
                aria-label="Ton"
                placeholder="samimi, espirili, resmi"
                containerClassName="flex-1"
              />
            </div>
          </div>
        </Section>

        {/* === Hedef kitle === */}
        <Section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Hedef kitle</h3>
            <BalinaChip variant="neutral" size="sm">
              {audience?.count ?? '—'} kişi
            </BalinaChip>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Tag className="h-3.5 w-3.5" />
                Mağazalar
              </span>
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
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Tag className="h-3.5 w-3.5" />
                Tag&apos;ler
              </span>
              <BalinaTextField
                value={audienceTagsRaw}
                onChange={setAudienceTagsRaw}
                disabled={isReadOnly}
                aria-label="Tag'ler"
                placeholder="vip, mart-2026 (virgülle)"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Calendar className="h-3.5 w-3.5" />
                Son sipariş
              </span>
              <BalinaDatePicker
                value={audienceLastOrderAfter}
                onChange={setAudienceLastOrderAfter}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </Section>

        {/* === Gönderim === */}
        {!isReadOnly && (
          <Section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Gönderim</h3>
              {campaign.status !== 'draft' && (
                <BalinaChip variant="neutral" size="sm" className="uppercase tracking-wide">
                  {campaign.status}
                </BalinaChip>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  Planla
                </span>
                <DateRow
                  value={scheduleAt}
                  onChange={setScheduleAt}
                  disabled={isScheduling || isSending}
                />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <BalinaButton
                  variant="primary"
                  size="small"
                  fullWidth
                  onClick={handleSendNow}
                  disabled={
                    isSending ||
                    !subject.trim() ||
                    blocks.length === 0 ||
                    (audience?.count ?? 0) === 0
                  }
                  leftIcon={<PaperPlane className="h-3.5 w-3.5" />}
                >
                  Hemen gönder
                </BalinaButton>
                <BalinaButton
                  variant="soft"
                  size="small"
                  fullWidth
                  onClick={handleSchedule}
                  disabled={
                    isScheduling ||
                    !scheduleAt ||
                    !subject.trim() ||
                    blocks.length === 0
                  }
                  leftIcon={<Clock className="h-3.5 w-3.5" />}
                >
                  Planla
                </BalinaButton>
                {(campaign.status === 'scheduled' ||
                  campaign.status === 'sending') && (
                  <BalinaButton
                    variant="danger"
                    size="small"
                    fullWidth
                    onClick={handleCancel}
                  >
                    İptal et
                  </BalinaButton>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* === Performans === */}
        {campaign.status === 'sent' && (
          <Section>
            <h3 className="mb-2 text-sm font-medium text-foreground">
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
          )}
        </EmailRightRail>
  ) : null;

  useEffect(() => {
    setSidebarPanel(leftPanelNode, {
      backLabel: 'Geri dön',
      onBack: () => router.push(`/${slug}/marketing/campaigns`),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, blocks, selectedBlockId, isReadOnly, subject, name]);
  useEffect(() => () => setSidebarPanel(null), [setSidebarPanel]);

  useEffect(() => {
    setSidePanel(rightPanelNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rightTab, selectedBlock, name, subject, aiPrompt, aiTone, audience,
    audienceStoreIds, audienceTagsRaw, audienceLastOrderAfter, scheduleAt,
    isGenerating, isSending, isScheduling, isReadOnly, stores, campaign,
  ]);
  useEffect(() => () => setSidePanel(null), [setSidePanel]);

  if (loading) {
    return (
      <>
        <PageHeader title="Yükleniyor…" icon={<BalinaMailIcon className="h-4 w-4" />} />
        <div className="p-6 text-sm text-muted">Kampanya yükleniyor…</div>
      </>
    );
  }
  if (!campaign) {
    return (
      <>
        <PageHeader title="Kampanya bulunamadı" icon={<BalinaMailIcon className="h-4 w-4" />} />
        <div className="p-6 text-sm text-muted">Kampanya bulunamadı.</div>
      </>
    );
  }

  return (
    <>
      {/* Kampanya silme onayı */}
      <BalinaConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting && !open) setDeleteOpen(false);
        }}
        title="Kampanyayı sil"
        description="Bu kampanya kalıcı olarak silinecek. Geri alınamaz."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onConfirm={handleConfirmDelete}
        danger
        loading={isDeleting}
      />

      {/* Test gönder modal */}
      <BalinaModal
        open={testSendOpen}
        onOpenChange={(o) => {
          if (!isTestSending && !o) setTestSendOpen(false);
        }}
        title="Test gönder"
        footer={
          <>
            <BalinaButton
              variant="soft"
              size="large"
              onClick={() => setTestSendOpen(false)}
              disabled={isTestSending}
            >
              Vazgeç
            </BalinaButton>
            <BalinaButton
              variant="primary"
              size="large"
              onClick={handleTestSend}
              disabled={isTestSending || !testEmail.trim()}
            >
              Gönder
            </BalinaButton>
          </>
        }
      >
        <BalinaTextField
          label="Test e-posta adresi"
          value={testEmail}
          onChange={setTestEmail}
          autoFocus
          placeholder="ornek@adres.com"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleTestSend();
            }
          }}
        />
        <p className="text-xs text-muted">
          Yalnızca bu adrese gönderilir, audience etkilenmez.
        </p>
      </BalinaModal>

      {/* Preview modal — backend'in render ettiği gerçek HTML */}
      <BalinaModal
        open={previewHtml !== null}
        onOpenChange={(o) => !o && setPreviewHtml(null)}
        className="max-w-[760px]"
        title="Mail önizleme"
        footer={
          <BalinaButton
            variant="soft"
            size="large"
            onClick={() => setPreviewHtml(null)}
          >
            Kapat
          </BalinaButton>
        }
      >
        <div>
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
        </div>
      </BalinaModal>

      {/* === PageHeader === */}
      <PageHeader
        title={name.trim() || 'İsimsiz Kampanya'}
        icon={<BalinaMailIcon className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            {(campaign.status === 'draft' ||
              campaign.status === 'cancelled' ||
              campaign.status === 'failed') && (
              <BalinaButton
                variant="danger"
                size="small"
                onClick={handleDelete}
                aria-label="Kampanyayı sil"
                leftIcon={<TrashBin className="h-3.5 w-3.5" />}
              />
            )}
            <BalinaButton
              variant="soft"
              size="small"
              onClick={() => handleSave()}
              disabled={isSaving || isReadOnly}
              leftIcon={<Check className="h-3.5 w-3.5" />}
            >
              Kaydet
            </BalinaButton>
          </div>
        }
      />

      {/* === 3-col workbench === */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <EmailCanvas
            blocks={blocks}
            onChange={setBlocks}
            selectedId={selectedBlockId}
            onSelect={handleSelectBlock}
            subject={subject}
            device={device}
            brandName={currentCompany?.name ?? 'balinaOS'}
            disabled={isReadOnly}
            topSlot={<DeviceToggle value={device} onChange={setDevice} />}
            onGenerateBlockText={handleGenerateBlockText}
            onGenerateImage={handleGenerateImage}
          />
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

function DeviceToggle({
  value,
  onChange,
}: {
  value: 'desktop' | 'tablet' | 'mobile';
  onChange: (v: 'desktop' | 'tablet' | 'mobile') => void;
}) {
  return (
    <BalinaSegmentedControl
      value={value}
      onChange={(v) => onChange(v as 'desktop' | 'tablet' | 'mobile')}
      segments={[
        { label: <DeviceIcon kind="desktop" />, value: 'desktop' },
        { label: <DeviceIcon kind="tablet" />, value: 'tablet' },
        { label: <DeviceIcon kind="mobile" />, value: 'mobile' },
      ]}
    />
  );
}

function DeviceIcon({ kind }: { kind: 'desktop' | 'tablet' | 'mobile' }) {
  if (kind === 'desktop') {
    return (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="3" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 17h6M10 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'tablet') {
    return (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="4" y="2" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 16h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="6" y="2" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 16h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTagsBrief(html: string): string {
  return stripHtmlToText(html).slice(0, 4000);
}
