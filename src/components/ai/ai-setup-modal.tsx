'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal, Button, Select, ListBox } from '@heroui/react';
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

  const labelFor = (i: AiIntegration) =>
    `${i.name} (${i.provider}${i.apiKeyTail ? ` · ••••${i.apiKeyTail}` : ''})`;

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
            <Modal.Body className="space-y-5">
              {/* Görsel sağlayıcı */}
              <section className="space-y-2">
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    Görsel üretimi
                  </h3>
                  <span className="text-xs text-muted">önerilen: Fashn.ai</span>
                </header>
                {imageOptions.length === 0 ? (
                  <EmptyState companySlug={currentCompany?.slug} kind="image" />
                ) : (
                  <Select
                    selectedKey={imageId ?? ''}
                    onSelectionChange={(key) => {
                      const v = String(key);
                      setImageId(v || null);
                    }}
                    aria-label="Görsel entegrasyonu"
                    className="w-full"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {imageOptions.map((i) => (
                          <ListBox.Item key={i.id} id={i.id} textValue={labelFor(i)}>
                            {labelFor(i)}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              </section>

              {/* Video sağlayıcı */}
              <section className="space-y-2">
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    Video üretimi
                  </h3>
                  <span className="text-xs text-muted">Fal.ai</span>
                </header>
                {videoOptions.length === 0 ? (
                  <EmptyState companySlug={currentCompany?.slug} kind="video" />
                ) : (
                  <Select
                    selectedKey={videoId ?? ''}
                    onSelectionChange={(key) => {
                      const v = String(key);
                      setVideoId(v || null);
                    }}
                    aria-label="Video entegrasyonu"
                    className="w-full"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {videoOptions.map((i) => (
                          <ListBox.Item key={i.id} id={i.id} textValue={labelFor(i)}>
                            {labelFor(i)}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
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
