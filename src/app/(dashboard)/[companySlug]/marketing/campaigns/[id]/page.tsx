'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  PaperPlane,
  TrashBin,
} from '@gravity-ui/icons';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useCompanyStore } from '@/stores/companyStore';
import {
  useMarketingCampaignStore,
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

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
    if (!currentCompany?.id || !campaign) return;
    fetchAudience(currentCompany.id, campaign.id).then(setAudience);
  }, [currentCompany?.id, campaign, fetchAudience]);

  const handleSave = async () => {
    if (!currentCompany?.id || !campaign) return;
    setIsSaving(true);
    const updated = await updateCampaign(currentCompany.id, campaign.id, {
      name: name.trim(),
      subject: subject.trim(),
      bodyHtml,
      bodyMeta: { productIds, aiPrompt, aiTone },
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
            <div className="mt-2 text-xs text-muted">
              Ürünleri eklemek için aşağıdaki ürün id listesine ekle —{' '}
              <code>{'{{product:id}}'}</code> placeholder'ı gövdede render edilir.
            </div>
            <input
              type="text"
              value={productIds.join(', ')}
              onChange={(e) =>
                setProductIds(
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              disabled={isReadOnly}
              placeholder="Ürün id'leri, virgülle ayırarak"
              className="mt-2 h-9 w-full rounded-lg border border-foreground/[0.06] bg-surface-secondary px-3 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Body */}
          <div className="rounded-2xl border border-foreground/[0.06] bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>Mail gövdesi (HTML)</Label>
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
