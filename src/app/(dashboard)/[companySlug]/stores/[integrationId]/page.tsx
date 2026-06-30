'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronDown,
  ArrowUpRightFromSquare as ExternalLink,
  ArrowsRotateRight as Loader2,
  At,
  Globe,
  Hashtag,
  Key,
  Link,
  MagnifierPlus,
  Pencil,
  Person,
  Picture,
  Plus,
  Tag,
  TrashBin,
  Video,
  Xmark,
} from '@gravity-ui/icons';
import {
  BalinaAlert,
  BalinaButton,
  BalinaConfirmDialog,
  BalinaInput,
  BalinaIntegrationIcon,
  BalinaPopover,
  BalinaSearchIcon,
  BalinaSelect,
  BalinaSwitch,
  BalinaTextField,
  toast,
} from '@/components/balina';
import { EtsyMark } from '@/components/icons/etsy-mark';
import { FalMark } from '@/components/icons/fal-mark';
import { BizimhesapMark } from '@/components/icons/bizimhesap-mark';
import { ParasutMark } from '@/components/icons/parasut-mark';
import { TiktokMark } from '@/components/icons/tiktok-mark';
import { PageHeader } from '@/components/layout/page-header';
import { useWorkspaceTab } from '@/components/layout/workspace-tabs';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useAiStore, FAL_MODEL_CATALOG, type AiIntegration, type ImagePose } from '@/stores/aiStore';
import { resizeImageToDataUrl } from '@/lib/image-resize';
import { useInvoiceIntegrationStore } from '@/stores/invoiceIntegrationStore';
import { useInstagramIntegrationStore } from '@/stores/instagramIntegrationStore';
import { useTiktokIntegrationStore } from '@/stores/tiktokIntegrationStore';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  allIntegrations,
  findIntegration,
  integrationCategories,
  SUPPORT_VIDEOS,
  type Marketplace,
} from '@/lib/integration-catalog';

type TestResult = {
  success: boolean;
  error?: string;
  meta?: { shopName?: string; currency?: string };
};

const INITIAL_FORM = {
  name: '',
  url: '',
  shopDomain: '',
  accessToken: '',
  sellerId: '',
  apiKey: '',
  apiSecret: '',
  environment: 'prod',
  merchantId: '',
  hbUsername: '',
  hbPassword: '',
  // E-Fatura (Bizim Hesap / Paraşüt)
  token: '',
  firmId: '',
  clientId: '',
  clientSecret: '',
  username: '',
  password: '',
  parasutCompanyId: '',
  // Kargo (DHL / MNG)
  customerNumber: '',
};

type TileSize = 'hero' | 'header' | 'sm' | 'pill';

/** Entegrasyon logosu — Etsy özel mark, diğerleri görsel. */
function IntegrationTile({ item, size }: { item: Marketplace; size: TileSize }) {
  const cls =
    size === 'hero'
      ? 'h-20 w-20 rounded-[1.4rem]'
      : size === 'header'
        ? 'h-12 w-12 rounded-2xl'
        : size === 'sm'
          ? 'h-7 w-7 rounded-lg'
          : 'h-5 w-5 rounded-md';
  if (item.id === 'ETSY') return <EtsyMark className={cls} role="img" aria-label={item.name} />;
  if (item.id === 'FAL_AI') return <FalMark className={cls} role="img" aria-label={item.name} />;
  if (item.id === 'TIKTOK') return <TiktokMark className={cls} role="img" aria-label={item.name} />;
  if (item.id === 'BIZIMHESAP') return <BizimhesapMark className={cls} role="img" aria-label={item.name} />;
  if (item.id === 'PARASUT') return <ParasutMark className={cls} role="img" aria-label={item.name} />;
  const src = item.logo || (item.id === 'OPENAI' ? '/figma/integrations/openai.svg' : '');
  if (!src) {
    return (
      <div className={`${cls} flex items-center justify-center bg-[var(--balina-background-dark-muted)] text-[var(--balina-icon-muted)]`}>
        <BalinaIntegrationIcon className={size === 'hero' ? 'h-10 w-10' : size === 'header' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-3 w-3'} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.name}
      className={`${cls} ${size === 'pill' ? 'object-contain' : 'object-cover'}`}
    />
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <BalinaButton
      variant="soft"
      size="default"
      aria-label="Geri"
      leftIcon={<ChevronLeft className="h-4 w-4" />}
      onClick={onClick}
    />
  );
}

const HERO_GRADIENT =
  'bg-[radial-gradient(80%_110%_at_12%_10%,#cfe0ff_0%,transparent_55%),radial-gradient(70%_100%_at_92%_88%,#ffe0cf_0%,transparent_55%),radial-gradient(60%_90%_at_55%_50%,#efe6fb_0%,transparent_60%),linear-gradient(135deg,#eef3ff_0%,#f4f1fb_50%,#f6f4f1_100%)]';

/** Tam ekranı kaplayan görsel büyütme overlay'i — AI panelindeki önizleme gibi.
 *  ESC veya boşluğa/X'e tıklayınca kapanır. document.body'ye portal'lanır ki
 *  sidebar dahil tüm ekranı kaplasın. */
function ImageZoomOverlay({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-xl sm:p-12"
    >
      <BalinaButton
        variant="soft"
        size="large"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute right-4 top-4 z-10"
        leftIcon={<Xmark className="h-4 w-4" />}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
      />
    </div>,
    document.body,
  );
}

/** Entegrasyon hero kartı — büyük logo (soluk hayalet kopyalarla) + altta bilgi
 *  şeridi. Bağlıysa "Bağlandı · Tarih · Durum (Aktif)"; bağlı değilse "Bağlı değil".
 *  Tüm (sosyal olmayan) entegrasyonlarda, bağlı olsun olmasın gösterilir. */
function ConnectedHero({
  item,
  label,
  date,
  active,
  connected,
}: {
  item: Marketplace;
  label: string;
  date: string | null;
  active: boolean;
  connected: boolean;
}) {
  const dateText = date
    ? new Date(date).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
      <div className={`absolute inset-0 ${HERO_GRADIENT}`} />
      {/* Logo sahnesi — merkez büyük + arka planda yumuşak süzülen hayalet kopyalar. */}
      <div className="relative flex h-60 items-center justify-center">
        <div className="pointer-events-none absolute left-[24%] top-1/2 -translate-y-1/2">
          <div
            data-balina-hero-float
            className="opacity-30 blur-[1px]"
            style={{ animation: 'balina-hero-float 7s ease-in-out infinite' }}
          >
            <IntegrationTile item={item} size="header" />
          </div>
        </div>
        <div className="pointer-events-none absolute right-[24%] top-1/2 -translate-y-1/2">
          <div
            data-balina-hero-float
            className="opacity-30 blur-[1px]"
            style={{ animation: 'balina-hero-float 7s ease-in-out infinite', animationDelay: '-3.5s' }}
          >
            <IntegrationTile item={item} size="header" />
          </div>
        </div>
        <div className="pointer-events-none absolute left-[44%] top-[24%]">
          <div
            data-balina-hero-float
            className="opacity-20 blur-[2px]"
            style={{ animation: 'balina-hero-float 9s ease-in-out infinite', animationDelay: '-1.5s' }}
          >
            <IntegrationTile item={item} size="sm" />
          </div>
        </div>
        {/* Merkez logo — beyaz kutu yok, doğrudan; yumuşak gölge. */}
        <div className="relative drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
          <IntegrationTile item={item} size="hero" />
        </div>
      </div>
      {/* Bilgi şeridi — bağlıysa 3 kolon, değilse tek "Bağlı değil" durumu.
          backdrop-blur parent'ın rounded clip'ini bozduğu için alt radius'u
          şeride ayrıca veriyoruz. */}
      <div className="relative grid grid-cols-3 gap-3 rounded-b-[1.5rem] border-t border-white/50 bg-white/45 px-5 py-4 backdrop-blur-md">
        {connected ? (
          <>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted">Bağlandı</span>
              <span className="truncate text-sm font-medium text-foreground">{label}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted">Tarih</span>
              <span className="truncate text-sm font-medium text-foreground">{dateText}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted">Durum</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#16a34a]' : 'bg-[var(--balina-icon-muted)]'}`}
                />
                {active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </>
        ) : (
          <div className="col-span-3 flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted">Durum</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--balina-icon-muted)]" />
              Bağlı değil
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const FAL_IMAGE_MODELS = FAL_MODEL_CATALOG.filter((m) => m.kind === 'image').map((m) => ({ value: m.id, label: m.label }));
const FAL_VIDEO_MODELS = FAL_MODEL_CATALOG.filter((m) => m.kind === 'video').map((m) => ({ value: m.id, label: m.label }));
const ASPECT_OPTS = [
  { value: '9:16', label: '9:16 (Dikey)' },
  { value: '1:1', label: '1:1 (Kare)' },
  { value: '16:9', label: '16:9 (Yatay)' },
];
const RESOLUTION_OPTS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
];
const MODE_OPTS = [
  { value: 'performance', label: 'Performans' },
  { value: 'quality', label: 'Kalite' },
];
const DURATION_OPTS = [
  { value: '5', label: '5 saniye' },
  { value: '10', label: '10 saniye' },
];

/** Bağlama adımının key'ine göre anlamlı ikon — tüm entegrasyonlar için ortak. */
function stepKeyIcon(key: string): React.ReactNode {
  const cls = 'h-4 w-4';
  switch (key) {
    case 'name':
      return <Tag className={cls} />;
    case 'url':
    case 'shopDomain':
      return <Globe className={cls} />;
    case 'accessToken':
    case 'apiKey':
    case 'apiSecret':
    case 'token':
    case 'clientSecret':
    case 'password':
    case 'hbPassword':
      return <Key className={cls} />;
    case 'username':
    case 'hbUsername':
      return <At className={cls} />;
    case 'sellerId':
    case 'merchantId':
    case 'firmId':
    case 'clientId':
    case 'parasutCompanyId':
    case 'customerNumber':
      return <Hashtag className={cls} />;
    default:
      return <Pencil className={cls} />;
  }
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <div className="w-44">{children}</div>
    </div>
  );
}

/** AI Yönet — Hesap Ayarları (her zaman) + Fal.ai için görsel/video ayarları. */
function AiManageAccordion({
  companyId,
  integration,
}: {
  companyId: string;
  integration: AiIntegration;
}) {
  const updateIntegration = useAiStore((s) => s.updateIntegration);
  const fetchIntegrations = useAiStore((s) => s.fetchIntegrations);
  const [open, setOpen] = useState<'account' | 'image' | 'poses' | 'video' | null>('account');
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(integration.isActive);
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [img, setImg] = useState({
    model: integration.imageModel ?? '',
    mode: integration.imageGenerationMode ?? 'performance',
    aspect: integration.imageAspectRatio ?? '9:16',
    resolution: integration.imageResolution ?? '2K',
  });
  const [vid, setVid] = useState({
    model: integration.videoModel ?? '',
    aspect: integration.videoAspectRatio ?? '9:16',
    duration: integration.videoDuration ?? '10',
    poseId: integration.videoPoseId ?? '',
  });
  // ===== Poz şablonları =====
  const [poses, setPoses] = useState<ImagePose[]>(integration.imagePoses ?? []);
  const [posesSaving, setPosesSaving] = useState(false);
  const [poseZoom, setPoseZoom] = useState<string | null>(null);
  const [poseToDelete, setPoseToDelete] = useState<ImagePose | null>(null);
  const poseFileRef = useRef<HTMLInputElement>(null);

  const handleAddPoses = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const added: ImagePose[] = [];
    for (const file of imgs) {
      const url = await resizeImageToDataUrl(file, 1024, 0.9).catch(() => '');
      if (url) {
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: '',
          referenceImageUrl: url,
        });
      }
    }
    if (added.length) setPoses((p) => [...p, ...added]);
    if (poseFileRef.current) poseFileRef.current.value = '';
  };

  const savePoses = async () => {
    setPosesSaving(true);
    try {
      // Boş adları sıra numarasıyla doldur (backend de güvence sağlar).
      const clean = poses
        .filter((p) => p.referenceImageUrl)
        .map((p, i) => ({ ...p, name: p.name?.trim() || `Poz ${i + 1}` }));
      await updateIntegration(companyId, integration.id, { imagePoses: clean });
      toast.success('Poz ayarları kaydedildi');
      await fetchIntegrations(companyId);
    } catch {
      toast.danger('Pozlar kaydedilemedi');
    } finally {
      setPosesSaving(false);
    }
  };

  const save = async (args: Record<string, string>, msg: string) => {
    setSaving(true);
    try {
      await updateIntegration(companyId, integration.id, args);
      toast.success(msg);
      await fetchIntegrations(companyId);
    } catch {
      toast.danger('Ayarlar kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (v: boolean) => {
    setActive(v);
    try {
      await updateIntegration(companyId, integration.id, { isActive: v });
      await fetchIntegrations(companyId);
    } catch {
      setActive(!v);
      toast.danger('Durum güncellenemedi');
    }
  };

  const saveKey = async () => {
    if (!newKey.trim()) return toast.danger('Yeni anahtar gerekli');
    setKeySaving(true);
    try {
      await updateIntegration(companyId, integration.id, { apiKey: newKey.trim() });
      toast.success('API anahtarı güncellendi');
      setShowKey(false);
      setNewKey('');
      await fetchIntegrations(companyId);
    } catch {
      toast.danger('Anahtar güncellenemedi');
    } finally {
      setKeySaving(false);
    }
  };

  const sections: Array<{
    key: 'account' | 'image' | 'poses' | 'video';
    title: string;
    desc: string;
    icon: React.ReactNode;
    body: React.ReactNode;
  }> = [
    {
      key: 'account',
      title: 'Hesap Ayarları',
      desc: 'Durum ve API anahtarı',
      icon: <Key className="h-4 w-4" />,
      body: (
        <div className="flex flex-col gap-3">
          <FieldRow label="Durum">
            <BalinaSwitch checked={active} onCheckedChange={toggleActive} />
          </FieldRow>
          <FieldRow label="API Anahtarı">
            {showKey ? (
              <BalinaTextField value={newKey} onChange={setNewKey} type="password" placeholder="Yeni anahtar" autoFocus />
            ) : (
              <span className="font-mono text-sm text-[var(--balina-text-strong)]">
                ••••{integration.apiKeyTail ?? '----'}
              </span>
            )}
          </FieldRow>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              Eklendi: {new Date(integration.createdAt).toLocaleString('tr-TR')}
            </span>
            {showKey ? (
              <div className="flex gap-2">
                <BalinaButton size="small" variant="plain" onClick={() => { setShowKey(false); setNewKey(''); }}>
                  Vazgeç
                </BalinaButton>
                <BalinaButton size="small" disabled={keySaving} onClick={saveKey}>
                  {keySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
                </BalinaButton>
              </div>
            ) : (
              <BalinaButton size="small" variant="soft" onClick={() => setShowKey(true)}>
                Anahtarı Değiştir
              </BalinaButton>
            )}
          </div>
        </div>
      ),
    },
    ...(integration.provider === 'fal' ? [
    {
      key: 'image' as const,
      title: 'Görsel ayarları',
      desc: 'Model, mod, oran ve çözünürlük',
      icon: <Picture className="h-4 w-4" />,
      body: (
        <div className="flex flex-col gap-3">
          <FieldRow label="Model">
            <BalinaSelect options={FAL_IMAGE_MODELS} value={img.model} onValueChange={(v) => setImg((s) => ({ ...s, model: v }))} placeholder="Model seçin" />
          </FieldRow>
          <FieldRow label="Mod">
            <BalinaSelect options={MODE_OPTS} value={img.mode} onValueChange={(v) => setImg((s) => ({ ...s, mode: v }))} />
          </FieldRow>
          <FieldRow label="Oran">
            <BalinaSelect options={ASPECT_OPTS} value={img.aspect} onValueChange={(v) => setImg((s) => ({ ...s, aspect: v }))} />
          </FieldRow>
          <FieldRow label="Çözünürlük">
            <BalinaSelect options={RESOLUTION_OPTS} value={img.resolution} onValueChange={(v) => setImg((s) => ({ ...s, resolution: v }))} />
          </FieldRow>
          <div className="flex justify-end">
            <BalinaButton size="small" disabled={saving} onClick={() => save({ imageModel: img.model, imageGenerationMode: img.mode, imageAspectRatio: img.aspect, imageResolution: img.resolution }, 'Görsel ayarları kaydedildi')}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </BalinaButton>
          </div>
        </div>
      ),
    },
    {
      key: 'poses' as const,
      title: 'Poz ayarları',
      desc: 'Üretilen görseli farklı pozlarda çoğalt',
      icon: <Person className="h-4 w-4" />,
      body: (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            Her poz için bir referans görsel ekleyin. AI’da bir görsel ürettiğinizde,
            seçtiğiniz görselin aynısı buradaki her poz için yeniden üretilir.
          </p>
          {poses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/[0.12] px-4 py-6 text-center text-sm text-muted">
              Henüz poz eklenmedi.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {poses.map((pose, i) => (
                <div key={pose.id} className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-2">
                  {/* Tıklayınca tam ekran büyür. */}
                  <button
                    type="button"
                    onClick={() => setPoseZoom(pose.referenceImageUrl)}
                    aria-label={`${pose.name || `Poz ${i + 1}`} görselini büyüt`}
                    className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pose.referenceImageUrl}
                      alt={pose.name || `Poz ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                      <MagnifierPlus className="h-4 w-4" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <BalinaTextField
                      value={pose.name ?? ''}
                      onChange={(v) =>
                        setPoses((arr) => arr.map((p) => (p.id === pose.id ? { ...p, name: v } : p)))
                      }
                      placeholder={`Poz ${i + 1} (örn. Önden)`}
                    />
                  </div>
                  <BalinaButton
                    size="small"
                    variant="ghost"
                    aria-label="Pozu sil"
                    leftIcon={<TrashBin className="h-4 w-4" />}
                    className="[&>svg]:!text-[var(--accent-red)] hover:enabled:!bg-[color-mix(in_oklch,var(--accent-red)_12%,transparent)]"
                    onClick={() => setPoseToDelete(pose)}
                  />
                </div>
              ))}
            </div>
          )}
          <input
            ref={poseFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleAddPoses(e.target.files)}
          />
          <div className="flex items-center justify-between">
            <BalinaButton
              size="small"
              variant="soft"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => poseFileRef.current?.click()}
            >
              Poz ekle
            </BalinaButton>
            <BalinaButton size="small" disabled={posesSaving} onClick={savePoses}>
              {posesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </BalinaButton>
          </div>
        </div>
      ),
    },
    {
      key: 'video' as const,
      title: 'Video ayarları',
      desc: 'Model, oran ve süre',
      icon: <Video className="h-4 w-4" />,
      body: (
        <div className="flex flex-col gap-3">
          <FieldRow label="Model">
            <BalinaSelect options={FAL_VIDEO_MODELS} value={vid.model} onValueChange={(v) => setVid((s) => ({ ...s, model: v }))} placeholder="Model seçin" />
          </FieldRow>
          <FieldRow label="Oran">
            <BalinaSelect options={ASPECT_OPTS} value={vid.aspect} onValueChange={(v) => setVid((s) => ({ ...s, aspect: v }))} />
          </FieldRow>
          <FieldRow label="Süre">
            <BalinaSelect options={DURATION_OPTS} value={vid.duration} onValueChange={(v) => setVid((s) => ({ ...s, duration: v }))} />
          </FieldRow>
          <FieldRow label="Video pozu">
            <BalinaSelect
              options={poses.map((p, i) => ({ value: p.id, label: p.name || `Poz ${i + 1}` }))}
              value={vid.poseId}
              onValueChange={(v) => setVid((s) => ({ ...s, poseId: v }))}
              placeholder="Poz seçin"
            />
          </FieldRow>
          <div className="flex justify-end">
            <BalinaButton size="small" disabled={saving} onClick={() => save({ videoModel: vid.model, videoAspectRatio: vid.aspect, videoDuration: vid.duration, videoPoseId: vid.poseId }, 'Video ayarları kaydedildi')}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </BalinaButton>
          </div>
        </div>
      ),
    },
    ] : []),
  ];

  return (
    <>
      <div className="w-full divide-y divide-black/[0.06] rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
      {sections.map((sec) => {
        const isOpen = open === sec.key;
        return (
          <div key={sec.key} className="flex flex-col">
            <button
              type="button"
              onClick={() => setOpen((o) => (o === sec.key ? null : sec.key))}
              className="flex items-center gap-3 px-4 py-3.5 text-left outline-none"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] text-[var(--balina-icon-muted)]">
                {sec.icon}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-[var(--balina-text-loud)]">{sec.title}</span>
                <span className="truncate text-xs text-muted">{sec.desc}</span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--balina-icon-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="px-4 pb-4 pl-16">{sec.body}</div>}
          </div>
        );
      })}
      </div>
      {poseZoom && (
        <ImageZoomOverlay src={poseZoom} onClose={() => setPoseZoom(null)} />
      )}
      <BalinaConfirmDialog
        open={!!poseToDelete}
        onOpenChange={(o) => {
          if (!o) setPoseToDelete(null);
        }}
        title="Pozu sil"
        description="Bu pozu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        danger
        onConfirm={() => {
          if (poseToDelete) {
            setPoses((arr) => arr.filter((p) => p.id !== poseToDelete.id));
          }
          setPoseToDelete(null);
        }}
      />
    </>
  );
}

/** Mağaza Yönet — senkronizasyon + komisyon/kargo accordion'u. */
function StoreManageAccordion({
  companyId,
  store,
}: {
  companyId: string;
  store: { id: string; platform?: string; commissionRate?: number; shippingCost?: number };
}) {
  const updateStore = useStoreStore((s) => s.updateStore);
  const syncStore = useStoreStore((s) => s.syncStore);
  const [open, setOpen] = useState<'sync' | 'fees' | 'trendyol' | 'wcsc' | null>('sync');
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commission, setCommission] = useState(String(store.commissionRate ?? 0));
  const [shipping, setShipping] = useState(String(store.shippingCost ?? 0));
  // Trendyol webhook/sipariş + WooCommerce WCSC durumları.
  const [tyBusy, setTyBusy] = useState<'webhook' | 'orders' | null>(null);
  const [wcsc, setWcsc] = useState({ apiKey: '', apiSecret: '' });
  const [wcscBusy, setWcscBusy] = useState<'test' | 'connect' | 'disconnect' | null>(null);
  const [wcscResult, setWcscResult] = useState<{ success: boolean; error?: string } | null>(null);

  const trendyolWebhook = async () => {
    setTyBusy('webhook');
    try {
      await api.post(`/company/${companyId}/stores/${store.id}/trendyol/webhook/setup`);
      toast.success('Trendyol webhook aboneliği yenilendi');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      toast.danger(err.response?.data?.error || err.response?.data?.message || 'Webhook kurulamadı');
    } finally {
      setTyBusy(null);
    }
  };
  const trendyolRecent = async () => {
    setTyBusy('orders');
    try {
      await api.post(`/company/${companyId}/stores/${store.id}/trendyol/sync-recent-orders?sinceHours=24`);
      toast.success('Son 24 saatin siparişleri senkronize edildi');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      toast.danger(err.response?.data?.error || err.response?.data?.message || 'Siparişler çekilemedi');
    } finally {
      setTyBusy(null);
    }
  };
  const wcscTest = async () => {
    if (!wcsc.apiKey || !wcsc.apiSecret) return toast.danger('API Key ve API Secret gerekli');
    setWcscBusy('test');
    setWcscResult(null);
    try {
      const r = await api.post(`/company/${companyId}/stores/${store.id}/test-wcsc`, wcsc);
      setWcscResult({ success: r.data.success, error: r.data.error });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setWcscResult({ success: false, error: err.response?.data?.message || 'Test başarısız' });
    } finally {
      setWcscBusy(null);
    }
  };
  const wcscConnect = async () => {
    if (!wcsc.apiKey || !wcsc.apiSecret) return toast.danger('API Key ve API Secret gerekli');
    setWcscBusy('connect');
    try {
      await api.post(`/company/${companyId}/stores/${store.id}/connect-wcsc`, wcsc);
      toast.success('WC Stock Connector bağlandı');
      setWcsc({ apiKey: '', apiSecret: '' });
      setWcscResult(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.danger(err.response?.data?.message || 'Bağlantı başarısız');
    } finally {
      setWcscBusy(null);
    }
  };
  const wcscDisconnect = async () => {
    setWcscBusy('disconnect');
    try {
      await api.post(`/company/${companyId}/stores/${store.id}/disconnect-wcsc`);
      toast.success('WC Stock Connector bağlantısı kesildi');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.danger(err.response?.data?.message || 'Bağlantı kesilemedi');
    } finally {
      setWcscBusy(null);
    }
  };

  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await syncStore(companyId, store.id);
      toast.success(r.message || 'Senkronizasyon başlatıldı');
    } catch {
      toast.danger('Senkronizasyon başlatılamadı');
    } finally {
      setSyncing(false);
    }
  };

  const saveFees = async () => {
    const c = parseFloat(commission) || 0;
    const s = parseFloat(shipping) || 0;
    if (c < 0 || c > 100) return toast.danger('Komisyon 0-100 arasında olmalı');
    if (s < 0 || s > 10000) return toast.danger('Kargo 0-10000 arasında olmalı');
    setSaving(true);
    try {
      await updateStore(companyId, store.id, { commissionRate: c, shippingCost: s });
      toast.success('Kaydedildi');
    } catch {
      toast.danger('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const sections: Array<{ key: 'sync' | 'fees' | 'trendyol' | 'wcsc'; title: string; desc: string; icon: React.ReactNode; body: React.ReactNode }> = [
    {
      key: 'sync',
      title: 'Senkronizasyon',
      desc: 'Sipariş ve ürünleri güncelle',
      icon: <Loader2 className="h-4 w-4" />,
      body: (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">Mağazadaki sipariş ve ürünleri şimdi içe aktar.</p>
          <div className="flex justify-end">
            <BalinaButton size="small" variant="soft" disabled={syncing} onClick={doSync}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Şimdi senkronize et'}
            </BalinaButton>
          </div>
        </div>
      ),
    },
    ...(store.platform === 'TRENDYOL'
      ? ([
          {
            key: 'trendyol' as const,
            title: 'Webhook & Sipariş',
            desc: 'Webhook aboneliği ve son siparişler',
            icon: <BalinaIntegrationIcon className="h-4 w-4" />,
            body: (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted">
                  Webhook gelmiyorsa aboneliği yenileyin ya da son siparişleri elle çekin.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <BalinaButton size="small" variant="soft" disabled={tyBusy !== null} onClick={trendyolRecent}>
                    {tyBusy === 'orders' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Son siparişleri çek'}
                  </BalinaButton>
                  <BalinaButton size="small" disabled={tyBusy !== null} onClick={trendyolWebhook}>
                    {tyBusy === 'webhook' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Webhook’u yenile'}
                  </BalinaButton>
                </div>
              </div>
            ),
          },
        ] as const)
      : []),
    ...(store.platform === 'WOOCOMMERCE'
      ? ([
          {
            key: 'wcsc' as const,
            title: 'Stok Bağlayıcı (WCSC)',
            desc: 'WooCommerce stok senkronizasyonu',
            icon: <Key className="h-4 w-4" />,
            body: (
              <div className="flex flex-col gap-3">
                <FieldRow label="API Key">
                  <BalinaTextField value={wcsc.apiKey} onChange={(v) => setWcsc((s) => ({ ...s, apiKey: v }))} placeholder="WCSC API Key" />
                </FieldRow>
                <FieldRow label="API Secret">
                  <BalinaTextField value={wcsc.apiSecret} onChange={(v) => setWcsc((s) => ({ ...s, apiSecret: v }))} type="password" placeholder="WCSC API Secret" />
                </FieldRow>
                {wcscResult && (
                  <BalinaAlert status={wcscResult.success ? 'success' : 'danger'}>
                    <BalinaAlert.Indicator />
                    <BalinaAlert.Content>
                      <BalinaAlert.Title>
                        {wcscResult.success ? 'Bağlantı başarılı!' : wcscResult.error}
                      </BalinaAlert.Title>
                    </BalinaAlert.Content>
                  </BalinaAlert>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <BalinaButton size="small" variant="plain" disabled={wcscBusy !== null} onClick={wcscDisconnect}>
                    {wcscBusy === 'disconnect' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bağlantıyı kes'}
                  </BalinaButton>
                  <BalinaButton size="small" variant="soft" disabled={wcscBusy !== null} onClick={wcscTest}>
                    {wcscBusy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test et'}
                  </BalinaButton>
                  <BalinaButton size="small" disabled={wcscBusy !== null || !wcscResult?.success} onClick={wcscConnect}>
                    {wcscBusy === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bağla'}
                  </BalinaButton>
                </div>
              </div>
            ),
          },
        ] as const)
      : []),
    {
      key: 'fees',
      title: 'Komisyon & Kargo',
      desc: 'Kâr hesabı için oranlar',
      icon: <BalinaIntegrationIcon className="h-4 w-4" />,
      body: (
        <div className="flex flex-col gap-3">
          <FieldRow label="Komisyon (%)">
            <BalinaTextField value={commission} onChange={setCommission} type="number" placeholder="0" />
          </FieldRow>
          <FieldRow label="Kargo (₺)">
            <BalinaTextField value={shipping} onChange={setShipping} type="number" placeholder="0" />
          </FieldRow>
          <div className="flex justify-end">
            <BalinaButton size="small" disabled={saving} onClick={saveFees}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </BalinaButton>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full divide-y divide-black/[0.06] rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
      {sections.map((sec) => {
        const isOpen = open === sec.key;
        return (
          <div key={sec.key} className="flex flex-col">
            <button
              type="button"
              onClick={() => setOpen((o) => (o === sec.key ? null : sec.key))}
              className="flex items-center gap-3 px-4 py-3.5 text-left outline-none"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] text-[var(--balina-icon-muted)]">
                {sec.icon}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-[var(--balina-text-loud)]">{sec.title}</span>
                <span className="truncate text-xs text-muted">{sec.desc}</span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--balina-icon-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="px-4 pb-4 pl-16">{sec.body}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Sosyal (Instagram/TikTok) — per-store bağlantı listesi. Store fonksiyonları
 *  prop ile gelir (sağlayıcıya göre doğru hook page'de seçilir). */
function SocialStores({
  provider,
  companyId,
  companySlug,
  stores,
  configs,
  fetchConfig,
  startOAuth,
  disconnect,
}: {
  provider: 'instagram' | 'tiktok';
  companyId: string;
  companySlug: string;
  stores: Array<{ id: string; name?: string }>;
  configs: Record<string, { connected?: boolean; username?: string | null }>;
  fetchConfig: (companyId: string, storeId: string) => Promise<unknown>;
  startOAuth: (
    companyId: string,
    storeId: string,
    redirectUri: string,
  ) => Promise<{ authorizeUrl: string; state?: string } | null>;
  disconnect: (companyId: string, storeId: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    stores.forEach((st) => fetchConfig(companyId, st.id));
  }, [companyId, stores, fetchConfig]);

  const connect = async (storeId: string) => {
    setBusy(storeId);
    const redirectUri = `${window.location.origin}/integrations/${provider}/return`;
    const r = await startOAuth(companyId, storeId, redirectUri);
    setBusy(null);
    if (!r) {
      toast.danger('OAuth başlatılamadı');
      return;
    }
    if (provider === 'instagram') {
      sessionStorage.setItem('igAuthCompanyId', companyId);
      sessionStorage.setItem('igAuthStoreId', storeId);
      if (r.state) sessionStorage.setItem('igAuthState', r.state);
      sessionStorage.setItem('igAuthSlug', companySlug);
    } else {
      sessionStorage.setItem('ttAuthSlug', companySlug);
    }
    window.location.href = r.authorizeUrl;
  };

  const remove = async (storeId: string) => {
    setBusy(storeId);
    try {
      await disconnect(companyId, storeId);
      await fetchConfig(companyId, storeId);
      toast.success('Bağlantı kesildi');
    } finally {
      setBusy(null);
    }
  };

  if (stores.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 text-sm text-muted shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
        Bağlamak için önce bir mağaza bağlayın.
      </div>
    );
  }

  return (
    <div className="divide-y divide-black/[0.06] rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
      {stores.map((st) => {
        const cfg = configs[st.id];
        const connected = !!cfg?.connected;
        return (
          <div key={st.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] text-[var(--balina-icon-muted)]">
              <BalinaIntegrationIcon className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-[var(--balina-text-loud)]">{st.name ?? 'Mağaza'}</span>
              <span className="truncate text-xs text-muted">
                {connected ? `@${cfg?.username ?? ''} · bağlı` : 'Bağlı değil'}
              </span>
            </div>
            {connected ? (
              <BalinaButton size="small" variant="plain" disabled={busy === st.id} onClick={() => remove(st.id)}>
                {busy === st.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaldır'}
              </BalinaButton>
            ) : (
              <BalinaButton size="small" disabled={busy === st.id} onClick={() => connect(st.id)}>
                {busy === st.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bağla'}
              </BalinaButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function IntegrationConnectPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = String(params.companySlug ?? '');
  const integrationId = String(params.integrationId ?? '');

  const currentCompany = useCompanyStore((s) => s.currentCompany);
  const stores = useStoreStore((s) => s.stores);
  const fetchStores = useStoreStore((s) => s.fetchStores);
  const syncStore = useStoreStore((s) => s.syncStore);
  const deleteStore = useStoreStore((s) => s.deleteStore);
  // AI sağlayıcıları (Fal/OpenAI) ayrı kaynakta (aiStore) yaşar.
  const aiIntegrations = useAiStore((s) => s.integrations);
  const fetchIntegrations = useAiStore((s) => s.fetchIntegrations);
  const createIntegration = useAiStore((s) => s.createIntegration);
  const createFalIntegration = useAiStore((s) => s.createFalIntegration);
  const removeIntegration = useAiStore((s) => s.removeIntegration);
  // E-Fatura (Bizim Hesap / Paraşüt) ayrı kaynakta (invoiceStore).
  const bizimhesaps = useInvoiceIntegrationStore((s) => s.bizimhesaps);
  const parasuts = useInvoiceIntegrationStore((s) => s.parasuts);
  const fetchInvoiceIntegrations = useInvoiceIntegrationStore((s) => s.fetchInvoiceIntegrations);
  const connectBizimhesap = useInvoiceIntegrationStore((s) => s.connectBizimhesap);
  const connectParasut = useInvoiceIntegrationStore((s) => s.connectParasut);
  const disconnectProvider = useInvoiceIntegrationStore((s) => s.disconnectProvider);
  // Sosyal (Instagram/TikTok) — her ikisi de per-store.
  const igStore = useInstagramIntegrationStore();
  const ttStore = useTiktokIntegrationStore();

  const item = findIntegration(integrationId);
  const category = integrationCategories.find((c) =>
    c.items.some((it) => it.id === integrationId),
  )?.title;

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  // Kargo bağlantıları store'da değil — sayfada api ile çekilir.
  const [cargoConnections, setCargoConnections] = useState<
    Array<{ id: string; provider?: string; isActive?: boolean }>
  >([]);
  const fetchCargo = useCallback(async () => {
    if (!currentCompany?.id) return;
    try {
      const { data } = await api.get(`/company/${currentCompany.id}/cargo/connections`);
      setCargoConnections(data ?? []);
    } catch {
      setCargoConnections([]);
    }
  }, [currentCompany?.id]);

  usePageTitle(item ? item.name : 'Entegrasyon');
  // Sekme = entegrasyon adı + logosu (tüm logolar artık dosya olarak mevcut).
  useWorkspaceTab({
    title: item?.name,
    image: item?.logo || null,
  });
  // Bağlı durum tespiti için mağaza + AI entegrasyonlarını çek.
  useEffect(() => {
    if (!currentCompany?.id) return;
    fetchStores(currentCompany.id);
    fetchIntegrations(currentCompany.id);
    fetchInvoiceIntegrations(currentCompany.id);
    fetchCargo();
  }, [currentCompany?.id, fetchStores, fetchIntegrations, fetchInvoiceIntegrations, fetchCargo]);

  const backToList = () => router.push(`/${companySlug}/stores`);
  const supportUrl = item ? SUPPORT_VIDEOS[item.id] : undefined;
  const openSupport = () =>
    supportUrl
      ? window.open(supportUrl, '_blank', 'noopener,noreferrer')
      : toast.info('Destek videosu yakında eklenecek');

  if (!item) {
    return (
      <>
        <PageHeader
          title="Entegrasyon"
          icon={<BalinaIntegrationIcon className="h-4 w-4" />}
          leading={<BackButton onClick={backToList} />}
        />
        <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-4 px-4 py-12 text-center">
          <h1 className="text-lg font-medium text-foreground">Entegrasyon bulunamadı</h1>
          <BalinaButton variant="soft" onClick={backToList}>
            Entegrasyonlara dön
          </BalinaButton>
        </div>
      </>
    );
  }

  const steps = item.steps ?? [];
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;
  const isOAuth = item.platform === 'WOOCOMMERCE' || item.platform === 'ETSY';
  // Bağlama türü: marketplace | apikey (Fal/OpenAI) | invoice (BH/Paraşüt) | none.
  const aiProvider: 'fal' | 'openai' | null =
    item.id === 'FAL_AI' ? 'fal' : item.id === 'OPENAI' ? 'openai' : null;
  const invoiceProvider: 'BIZIMHESAP' | 'PARASUT' | null =
    item.id === 'BIZIMHESAP' ? 'BIZIMHESAP' : item.id === 'PARASUT' ? 'PARASUT' : null;
  const isCargo = item.id === 'DHL';
  const social: 'instagram' | 'tiktok' | null =
    item.id === 'INSTAGRAM' ? 'instagram' : item.id === 'TIKTOK' ? 'tiktok' : null;
  const kind: 'marketplace' | 'apikey' | 'invoice' | 'cargo' | 'instagram' | 'tiktok' | 'none' = item.platform
    ? 'marketplace'
    : aiProvider
      ? 'apikey'
      : invoiceProvider
        ? 'invoice'
        : isCargo
          ? 'cargo'
          : social
            ? social
            : 'none';
  const canConnectHere = kind !== 'none' && totalSteps > 0;

  const connectedStore =
    kind === 'marketplace' ? stores.find((s) => s.platform === item.platform) : undefined;
  const connectedAi =
    kind === 'apikey' ? aiIntegrations.find((i) => i.provider === aiProvider) : undefined;
  const connectedInvoice =
    invoiceProvider === 'BIZIMHESAP'
      ? bizimhesaps[0]
      : invoiceProvider === 'PARASUT'
        ? parasuts[0]
        : undefined;
  const connectedCargo = isCargo
    ? cargoConnections.find(
        (c) =>
          c.isActive !== false &&
          (c.provider === 'MNG' || (c.provider ?? '').toUpperCase().includes('DHL')),
      )
    : undefined;
  const isConnected =
    !!connectedStore || !!connectedAi || !!connectedInvoice || !!connectedCargo;

  // Sosyal (Instagram/TikTok) bağlı durumu — herhangi bir mağaza hesabı bağlıysa.
  const socialConfigs =
    social === 'instagram' ? igStore.configs : social === 'tiktok' ? ttStore.configs : null;
  const socialConnectedCfg = socialConfigs
    ? Object.values(socialConfigs).find((c) => c?.connected)
    : undefined;
  const socialConnected = !!socialConnectedCfg;

  // Hero meta — sosyalde kendi bağlı durumu, diğerlerinde mağaza/AI/fatura/kargo.
  const heroConnected = social ? socialConnected : isConnected;
  const connLabel = social
    ? socialConnectedCfg?.username
      ? `@${socialConnectedCfg.username}`
      : item.name
    : connectedAi?.name || connectedStore?.name || item.name;
  const connDate = connectedAi?.createdAt ?? connectedStore?.createdAt ?? null;
  const connActive = connectedAi ? connectedAi.isActive : true;

  const handleRemove = async () => {
    if (!currentCompany?.id) return;
    setIsSubmitting(true);
    try {
      if (connectedStore) await deleteStore(currentCompany.id, connectedStore.id);
      else if (connectedAi) await removeIntegration(currentCompany.id, connectedAi.id);
      else if (connectedInvoice && invoiceProvider)
        await disconnectProvider(currentCompany.id, invoiceProvider);
      else if (connectedCargo) {
        // Kargo'da DELETE yok — bağlantıyı pasife alarak kaldır.
        await api.patch(
          `/company/${currentCompany.id}/cargo/connections/${connectedCargo.id}`,
          { isActive: false },
        );
        await fetchCargo();
      } else return;
      toast.success('Entegrasyon kaldırıldı');
      setCurrentStep(0);
      setTestResult(null);
    } catch {
      toast.danger('Entegrasyon kaldırılamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  // E-Fatura sağlayıcıları (Bizim Hesap / Paraşüt) bağla — connect içeride test eder.
  const handleInvoiceConnect = async () => {
    if (!currentCompany?.id || !invoiceProvider) return;
    setIsSubmitting(true);
    try {
      const label = formData.name.trim() || undefined;
      if (invoiceProvider === 'BIZIMHESAP') {
        await connectBizimhesap(currentCompany.id, {
          firmId: formData.firmId.trim(),
          token: formData.token.trim(),
          label,
        });
      } else {
        await connectParasut(currentCompany.id, {
          parasutCompanyId: formData.parasutCompanyId.trim(),
          clientId: formData.clientId.trim(),
          clientSecret: formData.clientSecret.trim(),
          username: formData.username.trim(),
          password: formData.password,
          label,
        });
      }
      toast.success(`${item.name} bağlandı`);
      await fetchInvoiceIntegrations(currentCompany.id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.danger(err.response?.data?.error || err.response?.data?.message || 'Bağlantı kurulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DHL (MNG kargo) bağla.
  const handleCargoConnect = async () => {
    if (!currentCompany?.id) return;
    setIsSubmitting(true);
    try {
      await api.post(`/company/${currentCompany.id}/cargo/mng/connect`, {
        customerNumber: formData.customerNumber.trim(),
        password: formData.password,
        identityType: 1,
      });
      toast.success(`${item.name} bağlandı`);
      await fetchCargo();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.danger(err.response?.data?.error || err.response?.data?.message || 'Bağlantı kurulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  // API-key sağlayıcıları (Fal/OpenAI) bağla.
  const handleApiKeyConnect = async () => {
    if (!currentCompany?.id || !aiProvider) return;
    if (!formData.apiKey.trim()) {
      toast.danger('API Anahtarı gerekli');
      return;
    }
    setIsSubmitting(true);
    try {
      const args = { apiKey: formData.apiKey.trim(), name: formData.name.trim() || undefined };
      const result =
        aiProvider === 'fal'
          ? await createFalIntegration(currentCompany.id, args)
          : await createIntegration(currentCompany.id, aiProvider, args);
      if (result) {
        toast.success(`${item.name} hesabı bağlandı`);
        await fetchIntegrations(currentCompany.id);
      } else {
        toast.danger('Anahtar kaydedilemedi');
      }
    } catch {
      toast.danger('Anahtar kaydedilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const validateCurrentStep = (): boolean => {
    const step = steps[currentStep];
    if (!step) return true;
    const value = (formData[step.key as keyof typeof formData] ?? '').trim();
    if (!value) {
      toast.danger(`${step.label} gerekli`);
      return false;
    }
    if (item.platform === 'WOOCOMMERCE' && step.key === 'url' && !/^https:\/\/.+/i.test(value)) {
      toast.danger('URL https:// ile başlamalı');
      return false;
    }
    if (step.key === 'shopDomain' && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value)) {
      toast.danger('Geçersiz domain. Beklenen format: mystore.myshopify.com');
      return false;
    }
    if (step.key === 'accessToken' && !value.startsWith('shpat_')) {
      toast.danger('Access Token "shpat_" ile başlamalı');
      return false;
    }
    if (step.key === 'sellerId' && !/^\d+$/.test(value)) {
      toast.danger('Satıcı ID yalnızca rakam içermelidir');
      return false;
    }
    if (step.key === 'merchantId' && value.length < 3) {
      toast.danger('Merchant ID en az 3 karakter olmalı');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((p) => p + 1);
  };

  const handleTestConnection = async () => {
    if (!currentCompany?.id) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      let body: Record<string, unknown> | null = null;
      if (item.platform === 'SHOPIFY') {
        body = { credentials: { shopDomain: formData.shopDomain.trim(), accessToken: formData.accessToken.trim() } };
      } else if (item.platform === 'TRENDYOL') {
        body = {
          credentials: { apiKey: formData.apiKey.trim(), apiSecret: formData.apiSecret.trim(), sellerId: formData.sellerId.trim() },
          config: { sellerId: formData.sellerId.trim(), environment: formData.environment, storeFrontCode: 'TR', integrationLabel: 'SelfIntegration' },
        };
      } else if (item.platform === 'HEPSIBURADA') {
        body = {
          credentials: { username: formData.hbUsername.trim(), password: formData.hbPassword, merchantId: formData.merchantId.trim() },
          config: { merchantId: formData.merchantId.trim() },
        };
      }
      if (!body) {
        setTestResult({ success: false, error: 'Bu pazaryeri için test desteği henüz eklenmedi' });
        return;
      }
      const res = await api.post(`/company/${currentCompany.id}/stores/marketplace/${item.platform}/test`, body);
      if (res.data.success) setTestResult({ success: true, meta: res.data.meta });
      else setTestResult({ success: false, error: res.data.error || 'Bağlantı kurulamadı' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      setTestResult({ success: false, error: err.response?.data?.error || err.response?.data?.message || 'Bağlantı kurulamadı' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!currentCompany?.id) return;
    setIsSubmitting(true);
    try {
      let body: Record<string, unknown> | null = null;
      if (item.platform === 'SHOPIFY') {
        body = { name: formData.name, credentials: { shopDomain: formData.shopDomain.trim(), accessToken: formData.accessToken.trim() } };
      } else if (item.platform === 'TRENDYOL') {
        body = {
          name: formData.name,
          credentials: { apiKey: formData.apiKey.trim(), apiSecret: formData.apiSecret.trim(), sellerId: formData.sellerId.trim() },
          config: { sellerId: formData.sellerId.trim(), environment: formData.environment, storeFrontCode: 'TR', integrationLabel: 'SelfIntegration' },
        };
      } else if (item.platform === 'HEPSIBURADA') {
        body = {
          name: formData.name,
          credentials: { username: formData.hbUsername.trim(), password: formData.hbPassword, merchantId: formData.merchantId.trim() },
          config: { merchantId: formData.merchantId.trim() },
        };
      }
      if (!body) {
        toast.danger('Bu pazaryeri için bağlantı henüz desteklenmiyor');
        return;
      }
      const res = await api.post(`/company/${currentCompany.id}/stores/marketplace/${item.platform}`, body);
      const newStoreId: string | null = res.data?.id ?? null;
      if (item.platform === 'TRENDYOL') {
        toast.success('Mağaza bağlandı. Webhook arka planda kuruluyor, ürünler ve son siparişler birkaç dakika içinde senkronize edilecek.');
      } else {
        toast.success('Mağaza başarıyla bağlandı');
      }
      await fetchStores(currentCompany.id);
      if (newStoreId) syncStore(currentCompany.id, newStoreId).catch(() => {});
      // Sayfada kal — fetchStores sonrası isConnected true olunca bağlı durum
      // banner'ı + "Entegrasyonu kaldır" görünür.
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const apiMessage = err.response?.data?.error || err.response?.data?.message;
      const trendyol403 = item.platform === 'TRENDYOL' && err.response?.status === 403;
      toast.danger(
        trendyol403
          ? apiMessage || 'Trendyol bağlantısı reddedildi (403). API anahtarınızın stage/prod uyumunu ve IP beyaz listesini kontrol edin.'
          : apiMessage || 'Mağaza bağlanamadı',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthStart = async () => {
    if (!currentCompany?.id) return;
    setIsSubmitting(true);
    try {
      const path = item.platform === 'WOOCOMMERCE' ? 'woocommerce' : 'etsy';
      const payload =
        item.platform === 'WOOCOMMERCE'
          ? { name: formData.name, url: formData.url.trim() }
          : { name: formData.name };
      const res = await api.post(`/company/${currentCompany.id}/stores/${path}/auth/start`, payload);
      const { authorizeUrl, state } = res.data as { authorizeUrl: string; state: string };
      const prefix = item.platform === 'WOOCOMMERCE' ? 'wc' : 'etsy';
      sessionStorage.setItem(`${prefix}AuthCompanyId`, currentCompany.id);
      sessionStorage.setItem(`${prefix}AuthState`, state);
      window.location.href = authorizeUrl;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.danger(err.response?.data?.error || err.response?.data?.message || 'Bağlantı başlatılamadı');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        leading={<BackButton onClick={backToList} />}
        title={
          <BalinaPopover
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
            align="start"
            className="w-[20rem] max-w-none overflow-hidden p-0"
            trigger={
              <button
                type="button"
                className="-ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none transition-colors hover:bg-[var(--balina-background-dark-default)]"
              >
                <IntegrationTile item={item} size="pill" />
                <span className="font-medium text-[var(--balina-text-loud)]">{item.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--balina-icon-muted)]" />
              </button>
            }
          >
              <div className="flex flex-col">
                {/* Arama — ürün picker'ı ile aynı stil. */}
                <div className="flex items-center gap-2 border-b border-[var(--balina-border-muted)] px-3 py-2">
                  <BalinaSearchIcon className="h-4 w-4 shrink-0 text-[var(--balina-icon-muted)]" />
                  <input
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    placeholder="Entegrasyon ara…"
                    autoFocus
                    className="h-6 w-full bg-transparent text-xs text-[var(--balina-text-loud)] outline-none placeholder:text-[var(--balina-text-muted)]"
                  />
                </div>
                {/* Liste */}
                <div className="balina-scrollbar max-h-[16rem] overflow-y-auto p-1">
                  {(() => {
                    const list = allIntegrations.filter(
                      (i) =>
                        !i.comingSoon &&
                        i.name.toLocaleLowerCase('tr').includes(switcherSearch.toLocaleLowerCase('tr')),
                    );
                    if (list.length === 0) {
                      return (
                        <div className="px-3 py-5 text-center text-xs text-[var(--balina-text-muted)]">
                          “{switcherSearch}” ile eşleşen entegrasyon yok
                        </div>
                      );
                    }
                    return list.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          setSwitcherOpen(false);
                          setSwitcherSearch('');
                          router.push(`/${companySlug}/stores/${i.id}`);
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-[0.625rem] p-1.5 text-left outline-none transition-colors hover:bg-[var(--balina-background-dark-muted)] ${
                          i.id === item.id ? 'bg-[var(--balina-background-dark-muted)]' : ''
                        }`}
                      >
                        <IntegrationTile item={i} size="sm" />
                        <span className="text-body-small-one-liner-medium truncate text-[var(--balina-text-strong)]">{i.name}</span>
                      </button>
                    ));
                  })()}
                </div>
              </div>
          </BalinaPopover>
        }
      />
      <div className="scrollbar-none flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 py-8">
          {/* Başlık — logo + ad + açıklama; sağda (bağlıysa) kaldır butonu. */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <IntegrationTile item={item} size="header" />
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-medium text-[var(--balina-text-loud)]">{item.name}</h1>
                {item.description && <p className="text-sm text-muted">{item.description}</p>}
              </div>
            </div>
            {isConnected && !social && (
              <BalinaButton
                variant="danger"
                onClick={handleRemove}
                disabled={isSubmitting}
                className="shrink-0"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entegrasyonu kaldır'}
              </BalinaButton>
            )}
          </div>

          {/* Tüm entegrasyonlarda (sosyal dahil) hero — kendi bağlı/bağlı-değil durumuna göre. */}
          <ConnectedHero
            item={item}
            label={connLabel}
            date={connDate}
            active={connActive}
            connected={heroConnected}
          />

          {/* Yapılandırma — bağlı değilse aşama aşama bağlama, bağlıysa yönet ayarları. */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-foreground">Yapılandırma</h2>
            {social ? (
              <SocialStores
                provider={social}
                companyId={currentCompany?.id ?? ''}
                companySlug={companySlug}
                stores={stores}
                configs={social === 'instagram' ? igStore.configs : ttStore.configs}
                fetchConfig={social === 'instagram' ? igStore.fetchConfig : ttStore.fetchConfig}
                startOAuth={social === 'instagram' ? igStore.startOAuth : ttStore.startOAuth}
                disconnect={social === 'instagram' ? igStore.disconnect : ttStore.disconnect}
              />
            ) : isConnected ? (
              <div className="flex flex-col gap-4">
                {/* Bağlantı görseli + durum artık üstteki hero'da. Burada
                    yönet ayarları ve kaldırma kaldı. */}
                {connectedAi && currentCompany?.id && (
                  <AiManageAccordion key={connectedAi.id} companyId={currentCompany.id} integration={connectedAi} />
                )}
                {connectedStore && currentCompany?.id && (
                  <StoreManageAccordion key={connectedStore.id} companyId={currentCompany.id} store={connectedStore} />
                )}
              </div>
            ) : canConnectHere ? (
              <div className="divide-y divide-black/[0.06] rounded-2xl bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
                {steps.map((step, index) => {
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const value = formData[step.key as keyof typeof formData] as string;
                  return (
                    <div key={index} className="flex items-start gap-3 px-4 py-3.5">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] text-[var(--balina-icon-muted)]">
                        {isCompleted ? (
                          <Check className="h-4 w-4 text-[var(--balina-icon-strong)]" />
                        ) : (
                          stepKeyIcon(step.key)
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-col">
                            <span className={`text-sm font-medium ${isActive || isCompleted ? 'text-[var(--balina-text-loud)]' : 'text-muted'}`}>
                              {step.label}
                            </span>
                            {!isActive && (
                              <span className="truncate text-xs text-muted">
                                {isCompleted ? value : step.description}
                              </span>
                            )}
                          </div>
                          {isActive ? (
                            <BalinaButton size="small" onClick={handleNext}>
                              İleri
                            </BalinaButton>
                          ) : isCompleted ? (
                            <button
                              type="button"
                              onClick={() => setCurrentStep(index)}
                              className="shrink-0 text-sm text-muted hover:text-foreground"
                            >
                              Düzenle
                            </button>
                          ) : null}
                        </div>
                        {isActive && (
                          <div className="flex flex-col gap-2">
                            <BalinaTextField
                              value={value}
                              onChange={(v) => setField(step.key, v)}
                              type={step.type || 'text'}
                              autoFocus
                              placeholder={step.placeholder}
                            />
                            <p className="text-xs text-muted">{step.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Son aşama — OAuth yönlendirme / test + bağla. */}
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] text-[var(--balina-icon-muted)]">
                    <Link className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className={`text-sm font-medium ${isLastStep ? 'text-[var(--balina-text-loud)]' : 'text-muted'}`}>
                          {kind === 'apikey' || kind === 'invoice' || kind === 'cargo' || isOAuth ? `${item.name}'a bağlan` : 'Bağlantıyı tamamla'}
                        </span>
                        <span className="truncate text-xs text-muted">
                          {kind === 'apikey'
                            ? 'API anahtarını kaydet'
                            : kind === 'invoice' || kind === 'cargo'
                              ? 'Bilgileri kaydet ve bağlan'
                              : isOAuth
                                ? 'İzinleri onaylayıp geri dön'
                                : 'Test et ve mağazayı bağla'}
                        </span>
                      </div>
                      {isLastStep &&
                        (kind === 'apikey' || kind === 'invoice' || kind === 'cargo' ? (
                          <BalinaButton
                            size="small"
                            onClick={
                              kind === 'apikey'
                                ? handleApiKeyConnect
                                : kind === 'invoice'
                                  ? handleInvoiceConnect
                                  : handleCargoConnect
                            }
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bağla'}
                          </BalinaButton>
                        ) : isOAuth ? (
                          <BalinaButton size="small" onClick={handleOAuthStart} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `${item.name}'a Git`}
                          </BalinaButton>
                        ) : !testResult?.success ? (
                          <BalinaButton size="small" variant="soft" onClick={handleTestConnection} disabled={isTesting}>
                            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Et'}
                          </BalinaButton>
                        ) : (
                          <BalinaButton size="small" onClick={handleConnect} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bağla'}
                          </BalinaButton>
                        ))}
                    </div>
                    {isLastStep && kind === 'marketplace' && !isOAuth && testResult && (
                      <BalinaAlert status={testResult.success ? 'success' : 'danger'}>
                        <BalinaAlert.Indicator />
                        <BalinaAlert.Content>
                          <BalinaAlert.Title>
                            {testResult.success
                              ? testResult.meta?.shopName
                                ? `Bağlandı: ${testResult.meta.shopName}${testResult.meta.currency ? ` (${testResult.meta.currency})` : ''}`
                                : 'Bağlantı başarılı!'
                              : testResult.error}
                          </BalinaAlert.Title>
                        </BalinaAlert.Content>
                      </BalinaAlert>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-5 text-sm text-muted shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
                Bu entegrasyonun bağlama akışı yakında bu sayfaya taşınacak.
              </div>
            )}
          </section>

          {/* Bilgiler — meta. */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-foreground">Bilgiler</h2>
            <div className="flex flex-col divide-y divide-black/[0.06] rounded-2xl bg-white px-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-sm text-muted">Kategori</span>
                <span className="text-sm text-[var(--balina-text-strong)]">{category ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-sm text-muted">Dokümantasyon</span>
                <span className="text-sm text-[var(--balina-text-strong)]">
                  {item.helpUrl ? (
                    <a href={item.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                      Aç <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-sm text-muted">Destek</span>
                <button type="button" onClick={openSupport} className="inline-flex items-center gap-1 text-sm text-[var(--balina-text-strong)] hover:text-foreground">
                  Destek videosu <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
