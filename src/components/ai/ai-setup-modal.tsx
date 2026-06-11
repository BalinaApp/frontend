'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Picture, Video } from '@gravity-ui/icons';
import {
  Modal,
  Button,
  Select,
  ListBox,
} from '@/components/ui';
import {
  useAiStore,
  MODEL_CATALOG,
  type AiIntegration,
  type ModelProvider,
} from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';

interface AiSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SetupTab = 'image' | 'video';

/** AI üretim ayarları modalı. Üstte Görüntü/Video segmented toggle, her
 *  sekmede o kategoriye uygun sağlayıcı chip'leri ve model dropdown'ı. */
export function AiSetupModal({ isOpen, onClose }: AiSetupModalProps) {
  const { currentCompany } = useCompanyStore();
  const {
    integrations,
    selectedImageIntegrationId,
    selectedVideoIntegrationId,
    selectedImageModelId,
    selectedVideoModelId,
    setSelectedImageIntegrationId,
    setSelectedVideoIntegrationId,
    setSelectedImageModelId,
    setSelectedVideoModelId,
  } = useAiStore();

  const [tab, setTab] = useState<SetupTab>('image');
  const [imageIntegrationId, setImageIntegrationId] = useState<string | null>(
    selectedImageIntegrationId,
  );
  const [videoIntegrationId, setVideoIntegrationId] = useState<string | null>(
    selectedVideoIntegrationId,
  );
  const [imageModelId, setImageModelId] = useState<string | null>(selectedImageModelId);
  const [videoModelId, setVideoModelId] = useState<string | null>(selectedVideoModelId);

  // Modal her açıldığında store seçimlerine senkronize ol.
  useEffect(() => {
    if (!isOpen) return;
    setImageIntegrationId(selectedImageIntegrationId);
    setVideoIntegrationId(selectedVideoIntegrationId);
    setImageModelId(selectedImageModelId);
    setVideoModelId(selectedVideoModelId);
    setTab('image');
  }, [
    isOpen,
    selectedImageIntegrationId,
    selectedVideoIntegrationId,
    selectedImageModelId,
    selectedVideoModelId,
  ]);

  // Görsel için: aktif fal + openai. Video için: sadece aktif fal.
  const imageProviders: AiIntegration[] = useMemo(
    () =>
      integrations.filter(
        (i) => i.isActive && (i.provider === 'fal' || i.provider === 'openai'),
      ),
    [integrations],
  );
  const videoProviders: AiIntegration[] = useMemo(
    () => integrations.filter((i) => i.isActive && i.provider === 'fal'),
    [integrations],
  );

  // Seçili sağlayıcı objesi — provider'a göre model listesi türetilir.
  const imageProvider = imageProviders.find((i) => i.id === imageIntegrationId) ?? null;
  const videoProvider = videoProviders.find((i) => i.id === videoIntegrationId) ?? null;

  // Model katalog filtreleri.
  const imageModels = useMemo(
    () =>
      MODEL_CATALOG.filter(
        (m) => m.kind === 'image' && m.provider === (imageProvider?.provider ?? 'fal'),
      ),
    [imageProvider?.provider],
  );
  // Video modeller — provider'a göre filtrele.
  const videoModels = useMemo(
    () =>
      MODEL_CATALOG.filter(
        (m) => m.kind === 'video' && m.provider === (videoProvider?.provider ?? 'fal'),
      ),
    [videoProvider?.provider],
  );

  // Sağlayıcı değiştiğinde model seçimi geçersizleşebilir — otomatik ilkine düş.
  useEffect(() => {
    if (!imageProvider) return;
    if (!imageModelId || !imageModels.some((m) => m.id === imageModelId)) {
      const fallback =
        imageModels.find((m) => m.isDefault) ?? imageModels[0];
      setImageModelId(fallback?.id ?? null);
    }
  }, [imageProvider, imageModelId, imageModels]);
  useEffect(() => {
    if (!videoProvider) return;
    if (!videoModelId || !videoModels.some((m) => m.id === videoModelId)) {
      const fallback =
        videoModels.find((m) => m.isDefault) ?? videoModels[0];
      setVideoModelId(fallback?.id ?? null);
    }
  }, [videoProvider, videoModelId, videoModels]);

  const canConfirm = !!imageIntegrationId && !!videoIntegrationId;

  const handleConfirm = () => {
    setSelectedImageIntegrationId(imageIntegrationId);
    setSelectedVideoIntegrationId(videoIntegrationId);
    setSelectedImageModelId(imageModelId);
    setSelectedVideoModelId(videoModelId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>AI üretim ayarları</Modal.Heading>
              <p className="mt-1 text-sm text-muted">
                Görsel ve video için hangi sağlayıcı ve modeli kullanacağını seç.
              </p>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {/* Segmented toggle — Görüntü / Video */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-secondary p-1">
                <SegButton
                  active={tab === 'image'}
                  onPress={() => setTab('image')}
                  icon={<Picture className="h-4 w-4" />}
                  label="Görüntü"
                />
                <SegButton
                  active={tab === 'video'}
                  onPress={() => setTab('video')}
                  icon={<Video className="h-4 w-4" />}
                  label="Video"
                />
              </div>

              {tab === 'image' ? (
                <SettingsBlock
                  providers={imageProviders}
                  providerId={imageIntegrationId}
                  onProviderChange={setImageIntegrationId}
                  models={imageModels.map((m) => ({
                    id: m.id,
                    label: m.label,
                    description: m.description,
                  }))}
                  modelId={imageModelId}
                  onModelChange={setImageModelId}
                  emptyKind="image"
                  companySlug={currentCompany?.slug}
                />
              ) : (
                <SettingsBlock
                  providers={videoProviders}
                  providerId={videoIntegrationId}
                  onProviderChange={setVideoIntegrationId}
                  models={videoModels.map((m) => ({
                    id: m.id,
                    label: m.label,
                    description: m.description,
                  }))}
                  modelId={videoModelId}
                  onModelChange={setVideoModelId}
                  emptyKind="video"
                  companySlug={currentCompany?.slug}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" slot="close">
                İptal
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={!canConfirm}
              >
                Kaydet
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function SegButton({
  active,
  onPress,
  icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface ModelOption {
  id: string;
  label: string;
  description: string;
}

function SettingsBlock({
  providers,
  providerId,
  onProviderChange,
  models,
  modelId,
  onModelChange,
  emptyKind,
  companySlug,
}: {
  providers: AiIntegration[];
  providerId: string | null;
  onProviderChange: (id: string | null) => void;
  models: ModelOption[];
  modelId: string | null;
  onModelChange: (id: string | null) => void;
  emptyKind: 'image' | 'video';
  companySlug?: string;
}) {
  if (providers.length === 0) {
    return <EmptyState companySlug={companySlug} kind={emptyKind} />;
  }
  const activeModel = models.find((m) => m.id === modelId) ?? null;
  return (
    <div className="space-y-4">
      {/* Sağlayıcı chip'leri */}
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted">Sağlayıcı</p>
        <div className="flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <ProviderChip
              key={p.id}
              provider={p.provider}
              label={`${providerLabel(p.provider)} · ${p.name}`}
              active={providerId === p.id}
              onPress={() => onProviderChange(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Model dropdown */}
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted">Model</p>
        {models.length === 0 ? (
          <p className="rounded-lg bg-surface-secondary/50 p-3 text-xs text-muted">
            Bu sağlayıcıda kullanılabilir model yok.
          </p>
        ) : (
          <Select
            selectedKey={modelId ?? ''}
            onSelectionChange={(key) => onModelChange(String(key) || null)}
            aria-label="Model"
            className="w-full"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {models.map((m) => (
                  <ListBox.Item key={m.id} id={m.id} textValue={m.label}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-[11px] text-muted">{m.description}</span>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
        {activeModel && (
          <p className="text-[11px] text-muted">{activeModel.description}</p>
        )}
      </section>
    </div>
  );
}

function ProviderChip({
  provider,
  label,
  active,
  onPress,
}: {
  provider: ModelProvider;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-accent bg-accent/10 text-foreground'
          : 'border-border bg-surface text-muted hover:text-foreground'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${
          provider === 'openai' ? 'bg-emerald-600' : 'bg-rose-500'
        }`}
        aria-hidden="true"
      >
        {provider === 'openai' ? 'Ai' : 'Fa'}
      </span>
      {label}
    </button>
  );
}

function providerLabel(p: ModelProvider): string {
  return p === 'openai' ? 'OpenAI' : 'Fal.ai';
}

function EmptyState({
  companySlug,
  kind,
}: {
  companySlug?: string;
  kind: 'image' | 'video';
}) {
  const label = kind === 'image' ? 'görsel' : 'video';
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-muted">
      <p>
        {label.charAt(0).toUpperCase() + label.slice(1)} üretimi için bağlı bir
        hesap yok.
      </p>
      {companySlug && (
        <Link
          href={`/${companySlug}/stores`}
          className="mt-2 inline-flex items-center gap-1 text-accent underline"
        >
          Entegrasyonlar sayfasından bağla
        </Link>
      )}
    </div>
  );
}
