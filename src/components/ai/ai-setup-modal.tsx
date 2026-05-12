'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal, Button, ListBox } from '@heroui/react';
import { Check } from '@gravity-ui/icons';
import { useAiStore, type AiIntegration } from '@/stores/aiStore';
import { useCompanyStore } from '@/stores/companyStore';

interface AiSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Chat ilk açıldığında veya kullanıcı entegrasyonlarını henüz seçmediyse
 *  gösterilen modal. Görsel + video için ayrı entegrasyon seçtirir. */
export function AiSetupModal({ isOpen, onClose }: AiSetupModalProps) {
  const { currentCompany } = useCompanyStore();
  const {
    integrations,
    selectedImageIntegrationId,
    selectedVideoIntegrationId,
    setSelectedImageIntegrationId,
    setSelectedVideoIntegrationId,
  } = useAiStore();

  const [imageId, setImageId] = useState<string | null>(selectedImageIntegrationId);
  const [videoId, setVideoId] = useState<string | null>(selectedVideoIntegrationId);

  useEffect(() => {
    // Modal her açıldığında en güncel seçimlere senkronize ol.
    if (isOpen) {
      setImageId(selectedImageIntegrationId);
      setVideoId(selectedVideoIntegrationId);
    }
  }, [isOpen, selectedImageIntegrationId, selectedVideoIntegrationId]);

  const activeFashn = integrations.filter((i) => i.provider === 'fashn' && i.isActive);
  const activeFal = integrations.filter((i) => i.provider === 'fal' && i.isActive);

  // Görsel için: fashn + fal birlikte. Video için: sadece fal.
  const imageOptions: AiIntegration[] = [...activeFashn, ...activeFal];
  const videoOptions: AiIntegration[] = activeFal;

  const canConfirm = !!imageId && !!videoId;

  const handleConfirm = () => {
    setSelectedImageIntegrationId(imageId);
    setSelectedVideoIntegrationId(videoId);
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
                Sohbette görsel ve video üretirken hangi hesabın kullanılacağını
                seç. Sonradan istediğinde değiştirebilirsin.
              </p>
            </Modal.Header>
            <Modal.Body className="space-y-6">
            {/* Görsel sağlayıcı */}
            <section className="space-y-2">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  Görsel üretimi
                  <span className="ml-2 text-xs text-muted">
                    (önerilen: Fashn.ai)
                  </span>
                </h3>
              </header>
              {imageOptions.length === 0 ? (
                <EmptyState companySlug={currentCompany?.slug} kind="image" />
              ) : (
                <ListBox
                  aria-label="Görsel entegrasyonu"
                  selectedKeys={imageId ? new Set([imageId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const next = Array.from(keys as Set<string>)[0] ?? null;
                    setImageId(next);
                  }}
                  selectionMode="single"
                  className="rounded-lg border border-border bg-surface"
                >
                  {imageOptions.map((i) => (
                    <ListBox.Item key={i.id} id={i.id} textValue={i.name}>
                      <div className="flex items-center justify-between gap-3 py-1">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{i.name}</span>
                          <span className="text-[11px] uppercase tracking-wide text-muted">
                            {i.provider}
                            {i.apiKeyTail ? ` · ••••${i.apiKeyTail}` : ''}
                          </span>
                        </div>
                        {imageId === i.id && (
                          <Check className="h-4 w-4 text-accent" />
                        )}
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              )}
            </section>

            {/* Video sağlayıcı */}
            <section className="space-y-2">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  Video üretimi
                  <span className="ml-2 text-xs text-muted">(Fal.ai)</span>
                </h3>
              </header>
              {videoOptions.length === 0 ? (
                <EmptyState companySlug={currentCompany?.slug} kind="video" />
              ) : (
                <ListBox
                  aria-label="Video entegrasyonu"
                  selectedKeys={videoId ? new Set([videoId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const next = Array.from(keys as Set<string>)[0] ?? null;
                    setVideoId(next);
                  }}
                  selectionMode="single"
                  className="rounded-lg border border-border bg-surface"
                >
                  {videoOptions.map((i) => (
                    <ListBox.Item key={i.id} id={i.id} textValue={i.name}>
                      <div className="flex items-center justify-between gap-3 py-1">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{i.name}</span>
                          <span className="text-[11px] uppercase tracking-wide text-muted">
                            fal
                            {i.apiKeyTail ? ` · ••••${i.apiKeyTail}` : ''}
                          </span>
                        </div>
                        {videoId === i.id && (
                          <Check className="h-4 w-4 text-accent" />
                        )}
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              )}
            </section>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" slot="close">
                Daha sonra
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={!canConfirm}
              >
                Devam et
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
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
