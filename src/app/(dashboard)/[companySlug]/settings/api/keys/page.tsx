'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  CircleCheckFill,
  Copy,
  Eye,
  EyeSlash,
  Key,
  Plus,
  TriangleExclamation,
} from '@gravity-ui/icons';
import {
  Alert,
  Button,
  Dropdown,
  Input,
  Label,
  Modal,
  Switch,
  TextField,
} from '@heroui/react';
import { ApiKey, useApiKeyStore } from '@/stores/apiKeyStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePricingStore } from '@/stores/pricingStore';
import { usePageTitle } from '@/hooks/use-page-title';

type Permission = 'read' | 'write';

const PERMISSION_LABEL: Record<Permission, string> = {
  read: 'Okuma',
  write: 'Yazma',
};

export default function ApiKeysListPage() {
  usePageTitle("API'ler");

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const {
    apiKeys,
    newKeySecret,
    isCreating,
    fetchApiKeys,
    createApiKey,
    updateApiKey,
    clearNewKeySecret,
  } = useApiKeyStore();

  const { hasFeature, fetchMyPlan, fetchPricingStatus, isPricingEnabled } =
    usePricingStore();

  const hasApiAccess = hasFeature('apiAccess');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyWrite, setNewKeyWrite] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    fetchPricingStatus();
    fetchMyPlan();
  }, [fetchPricingStatus, fetchMyPlan]);

  useEffect(() => {
    if (!isPricingEnabled || hasApiAccess) {
      fetchApiKeys();
    }
  }, [hasApiAccess, isPricingEnabled, fetchApiKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    await createApiKey(newKeyName.trim(), {
      read: true,
      write: newKeyWrite,
    });
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    clearNewKeySecret();
    setNewKeyName('');
    setNewKeyWrite(false);
    setShowSecret(false);
    setCopiedSecret(false);
  };

  const handleCopySecret = async () => {
    if (!newKeySecret) return;
    await navigator.clipboard.writeText(newKeySecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const upgradeBlocked = isPricingEnabled && !hasApiAccess;

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings/api`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">API&apos;ler</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          {upgradeBlocked ? (
            <div className="flex flex-col items-center gap-4 rounded-xl bg-surface p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-default">
                <TriangleExclamation className="h-6 w-6 text-muted" />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-sm font-medium text-foreground">
                  Enterprise Plan Gerekli
                </h3>
                <p className="text-xs text-muted">
                  API anahtarı yönetimi Enterprise plan ile kullanılabilir.
                </p>
              </div>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => router.push(`/${slug}/pricing`)}
                className="h-8 cursor-pointer rounded-full bg-black/[0.06] px-3 text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
              >
                Planları Görüntüle
              </Button>
            </div>
          ) : (
            <div className="flex flex-col rounded-xl bg-surface">
              {apiKeys.map((apiKey, index) => (
                <ApiKeyRow
                  key={apiKey.id}
                  apiKey={apiKey}
                  isLast={index === apiKeys.length - 1 && apiKeys.length > 0}
                  onToggleActive={(next) =>
                    updateApiKey(apiKey.id, { isActive: next })
                  }
                />
              ))}

              {/* Yeni ekle row — plain plus icon, no tile background */}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className={`flex cursor-pointer items-center gap-3 p-3 text-left ${
                  apiKeys.length > 0 ? 'border-t border-black/[0.04]' : ''
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground/60">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground/85">
                  Yeni ekle
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseCreate();
          else setIsCreateOpen(true);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[460px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {newKeySecret ? 'API Anahtarı Oluşturuldu' : 'Yeni API Anahtarı'}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                {newKeySecret ? (
                  <>
                    <Alert status="warning">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>Dikkat</Alert.Title>
                        <Alert.Description>
                          Bu anahtar yalnızca bir kez gösterilecektir. Lütfen
                          güvenli bir yerde saklayın.
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                    <div className="flex flex-col gap-2">
                      <Label>API Anahtarı</Label>
                      <div className="flex gap-2">
                        <TextField
                          value={newKeySecret}
                          type={showSecret ? 'text' : 'password'}
                          isReadOnly
                          className="flex-1"
                        >
                          <Input className="font-mono text-sm" />
                        </TextField>
                        <Button
                          variant="outline"
                          size="md"
                          isIconOnly
                          aria-label={showSecret ? 'Gizle' : 'Göster'}
                          onPress={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? (
                            <EyeSlash className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="md"
                          isIconOnly
                          aria-label="Kopyala"
                          onPress={handleCopySecret}
                        >
                          {copiedSecret ? (
                            <CircleCheckFill className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="modal-form-card">
                      <TextField
                        name="name"
                        value={newKeyName}
                        onChange={setNewKeyName}
                        isRequired
                      >
                        <Label>Anahtar adı</Label>
                        <Input placeholder="Örn: Üretim" />
                      </TextField>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <Label>Yazma izni</Label>
                        <p className="text-xs text-muted">
                          Bu anahtar veri değişikliği yapabilsin mi?
                        </p>
                      </div>
                      <Switch
                        isSelected={newKeyWrite}
                        onChange={setNewKeyWrite}
                        aria-label="Yazma izni"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                {newKeySecret ? (
                  <Button onPress={handleCloseCreate}>Tamam</Button>
                ) : (
                  <>
                    <Button variant="tertiary" slot="close">
                      İptal
                    </Button>
                    <Button
                      onPress={handleCreate}
                      isDisabled={!newKeyName.trim() || isCreating}
                      isPending={isCreating}
                    >
                      {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
                    </Button>
                  </>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

function ApiKeyRow({
  apiKey,
  isLast,
  onToggleActive,
}: {
  apiKey: ApiKey;
  isLast: boolean;
  onToggleActive: (isActive: boolean) => void;
}) {
  // Display only the active permission label; default to "Okuma".
  const activePermission: Permission = apiKey.permissions?.write
    ? 'write'
    : 'read';

  return (
    <div
      className={`flex items-center gap-2 p-3 ${
        !isLast ? 'border-b border-black/[0.04]' : ''
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-opacity ${
          apiKey.isActive ? '' : 'opacity-40'
        }`}
      >
        <Key className="h-5 w-5" />
      </div>
      <span
        className={`flex-1 truncate text-sm font-medium transition-colors ${
          apiKey.isActive ? 'text-foreground/85' : 'text-foreground/40'
        }`}
      >
        {apiKey.name}
      </span>

      {/* Permission label — read-only text (set at creation time) */}
      <span
        className={`shrink-0 text-xs font-medium transition-colors ${
          apiKey.isActive ? 'text-foreground/70' : 'text-foreground/35'
        }`}
      >
        {PERMISSION_LABEL[activePermission]}
      </span>

      <Switch
        isSelected={apiKey.isActive}
        onChange={onToggleActive}
        aria-label="Aktif"
      >
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </div>
  );
}
