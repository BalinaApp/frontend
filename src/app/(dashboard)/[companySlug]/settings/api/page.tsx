'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Key,
  ChevronLeft,
  Copy,
  Trash2,
  RotateCcw,
  Ban,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Button,
  Chip,
  Input,
  Label,
  Modal,
  Skeleton,
  Switch,
  TextField,
} from '@heroui/react';
import { useApiKeyStore, ApiKey } from '@/stores/apiKeyStore';
import { usePricingStore } from '@/stores/pricingStore';
import { useCompany } from '@/components/providers/CompanyProvider';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ApiSettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const {
    apiKeys,
    newKeySecret,
    isLoading,
    isCreating,
    error,
    fetchApiKeys,
    createApiKey,
    deleteApiKey,
    revokeApiKey,
    rotateApiKey,
    clearNewKeySecret,
  } = useApiKeyStore();

  const { hasFeature, fetchMyPlan, isPricingEnabled } = usePricingStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [writePermission, setWritePermission] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const hasApiAccess = hasFeature('apiAccess');

  useEffect(() => {
    fetchMyPlan();
  }, [fetchMyPlan]);

  useEffect(() => {
    if (!isPricingEnabled || hasApiAccess) {
      fetchApiKeys();
    }
  }, [hasApiAccess, isPricingEnabled, fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    const result = await createApiKey(newKeyName, {
      read: true,
      write: writePermission,
    });

    if (result) {
      setNewKeyName('');
      setWritePermission(false);
    }
  };

  const handleCopyKey = async () => {
    if (newKeySecret) {
      await navigator.clipboard.writeText(newKeySecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    clearNewKeySecret();
    setShowSecret(false);
    setCopiedKey(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: tr });
  };

  if (!hasApiAccess && isPricingEnabled) {
    return (
      <>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Geri"
              onPress={() => router.push(`/${company?.slug}/settings`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Key className="h-5 w-5 text-muted" />
            <h1 className="text-lg font-semibold">API Erişimi</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-default">
            <AlertTriangle className="h-8 w-8 text-muted" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Enterprise Plan Gerekli</h3>
          <p className="mt-2 max-w-md px-4 text-center text-muted">
            Harici API erişimi ve API anahtarı yönetimi Enterprise plan ile kullanılabilir.
          </p>
          <Button className="mt-6" onPress={() => router.push(`/${company?.slug}/pricing`)}>
            Planları Görüntüle
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Geri"
            onPress={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Key className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">API Erişimi</h1>
        </div>

        <Modal
          isOpen={isCreateOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseCreateDialog();
            else setIsCreateOpen(true);
          }}
        >
          <Button size="sm" onPress={() => setIsCreateOpen(true)}>
            Yeni API Anahtarı
          </Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-[500px]">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>
                    {newKeySecret ? 'API Anahtarı Oluşturuldu' : 'Yeni API Anahtarı'}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    {newKeySecret
                      ? 'API anahtarınız oluşturuldu. Bu anahtarı güvenli bir yerde saklayın, tekrar gösterilmeyecektir.'
                      : 'Harici API erişimi için yeni bir API anahtarı oluşturun.'}
                  </p>

                  {newKeySecret ? (
                    <>
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>Dikkat!</Alert.Title>
                          <Alert.Description>
                            Bu API anahtarı sadece bir kez gösterilecektir. Lütfen güvenli bir yerde saklayın.
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
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="md"
                            isIconOnly
                            aria-label="Kopyala"
                            onPress={handleCopyKey}
                          >
                            {copiedKey ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <TextField
                        name="name"
                        value={newKeyName}
                        onChange={setNewKeyName}
                      >
                        <Label>Anahtar Adı</Label>
                        <Input placeholder="Örn: Production API Key" />
                      </TextField>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <Label>Yazma İzni</Label>
                          <p className="text-sm text-muted">
                            Bu anahtar veri değişikliği yapabilsin mi?
                          </p>
                        </div>
                        <Switch
                          isSelected={writePermission}
                          onChange={setWritePermission}
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
                    <Button onPress={handleCloseCreateDialog}>Tamam</Button>
                  ) : (
                    <>
                      <Button variant="tertiary" slot="close">
                        İptal
                      </Button>
                      <Button
                        onPress={handleCreateKey}
                        isDisabled={!newKeyName.trim() || isCreating}
                        isPending={isCreating}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Oluşturuluyor...
                          </>
                        ) : (
                          'Oluştur'
                        )}
                      </Button>
                    </>
                  )}
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      {error && (
        <div className="border-b border-border px-4 py-3">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      <div className="border-b border-border">
        <div className="grid grid-cols-12 items-center px-4 py-4">
          <div className="col-span-3">
            <p className="text-sm font-medium">Base URL</p>
          </div>
          <div className="col-span-6">
            <code className="rounded bg-default px-2 py-1 text-sm">
              {process.env.NEXT_PUBLIC_API_URL}/api/v1
            </code>
          </div>
          <div className="col-span-3 text-right">
            <Button
              variant="outline"
              size="sm"
              onPress={() =>
                window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/docs`, '_blank')
              }
            >
              Swagger Docs
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="bg-surface-secondary px-4 py-2">
          <span className="text-xs font-medium text-muted">Rate Limiting</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-default">
              <Activity className="h-5 w-5 text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium">100 istek/dk</p>
              <p className="text-xs text-muted">API key başına</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-default">
              <Clock className="h-5 w-5 text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium">60 saniye</p>
              <p className="text-xs text-muted">Sıfırlama süresi</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-default">
              <Key className="h-5 w-5 text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium">X-RateLimit-*</p>
              <p className="text-xs text-muted">Response headers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-surface-secondary px-4 py-2">
        <span className="text-xs font-medium text-muted">API Anahtarları</span>
      </div>

      <div className="grid grid-cols-12 border-b border-border bg-surface-secondary/50 px-4 py-2">
        <div className="col-span-3 text-xs font-medium text-muted">Ad</div>
        <div className="col-span-2 text-xs font-medium text-muted">Anahtar</div>
        <div className="col-span-2 text-xs font-medium text-muted">İzinler</div>
        <div className="col-span-2 text-xs font-medium text-muted">Son Kullanım</div>
        <div className="col-span-2 text-xs font-medium text-muted">Durum</div>
        <div className="col-span-1 text-right text-xs font-medium text-muted">İşlem</div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-default">
              <Key className="h-6 w-6 text-muted" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Henüz API anahtarı yok</h3>
            <p className="mt-1 text-center text-muted">
              Harici API erişimi için bir API anahtarı oluşturun
            </p>
          </div>
        ) : (
          apiKeys.map((apiKey, index) => (
            <ApiKeyRow
              key={apiKey.id}
              apiKey={apiKey}
              index={index}
              onDelete={deleteApiKey}
              onRevoke={revokeApiKey}
              onRotate={rotateApiKey}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </>
  );
}

function ApiKeyRow({
  apiKey,
  index,
  onDelete,
  onRevoke,
  onRotate,
  formatDate,
}: {
  apiKey: ApiKey;
  index: number;
  onDelete: (id: string) => Promise<boolean>;
  onRevoke: (id: string) => Promise<boolean>;
  onRotate: (id: string) => Promise<any>;
  formatDate: (date: string | null) => string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [showRotatedKey, setShowRotatedKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(apiKey.id);
    setIsDeleting(false);
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    await onRevoke(apiKey.id);
    setIsRevoking(false);
  };

  const handleRotate = async () => {
    setIsRotating(true);
    const result = await onRotate(apiKey.id);
    if (result?.key) {
      setRotatedKey(result.key);
    }
    setIsRotating(false);
  };

  const handleCopyRotatedKey = async () => {
    if (rotatedKey) {
      await navigator.clipboard.writeText(rotatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`grid grid-cols-12 items-center border-b border-border px-4 py-3 ${
        index % 2 === 1 ? 'bg-surface-secondary/50' : ''
      }`}
    >
      <div className="col-span-3">
        <p className="text-sm font-medium">{apiKey.name}</p>
      </div>
      <div className="col-span-2">
        <code className="rounded bg-default px-2 py-1 text-xs">
          {apiKey.keyPrefix}...
        </code>
      </div>
      <div className="col-span-2">
        <div className="flex gap-1">
          <Chip variant="tertiary" size="sm">Okuma</Chip>
          {apiKey.permissions?.write && (
            <Chip variant="primary" size="sm">Yazma</Chip>
          )}
        </div>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-muted">{formatDate(apiKey.lastUsedAt)}</p>
      </div>
      <div className="col-span-2">
        {apiKey.isActive ? (
          <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-default px-2 py-0.5 text-xs font-medium text-muted">
            İptal Edildi
          </span>
        )}
      </div>
      <div className="col-span-1 text-right">
        <div className="flex justify-end gap-1">
          <Modal>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              isDisabled={!apiKey.isActive}
              aria-label="Anahtarı yenile"
            >
              <RotateCcw className="h-4 w-4 text-muted" />
            </Button>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-[500px]">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>
                      {rotatedKey ? 'Anahtar Yenilendi' : 'API Anahtarını Yenile'}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-4">
                    <p className="text-sm text-muted">
                      {rotatedKey
                        ? 'Yeni API anahtarınız oluşturuldu. Eski anahtar artık geçersiz.'
                        : 'Bu işlem mevcut anahtarı geçersiz kılacak ve yeni bir anahtar oluşturacaktır.'}
                    </p>
                    {rotatedKey && (
                      <>
                        <Alert status="danger">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Description>
                              Bu anahtar sadece bir kez gösterilecektir.
                            </Alert.Description>
                          </Alert.Content>
                        </Alert>

                        <div className="flex gap-2">
                          <TextField
                            value={rotatedKey}
                            type={showRotatedKey ? 'text' : 'password'}
                            isReadOnly
                            className="flex-1"
                          >
                            <Input className="font-mono text-sm" />
                          </TextField>
                          <Button
                            variant="outline"
                            size="md"
                            isIconOnly
                            aria-label={showRotatedKey ? 'Gizle' : 'Göster'}
                            onPress={() => setShowRotatedKey(!showRotatedKey)}
                          >
                            {showRotatedKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="md"
                            isIconOnly
                            aria-label="Kopyala"
                            onPress={handleCopyRotatedKey}
                          >
                            {copied ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    {rotatedKey ? (
                      <Button slot="close" onPress={() => setRotatedKey(null)}>
                        Tamam
                      </Button>
                    ) : (
                      <>
                        <Button variant="tertiary" slot="close">
                          İptal
                        </Button>
                        <Button
                          onPress={handleRotate}
                          isDisabled={isRotating}
                          isPending={isRotating}
                        >
                          {isRotating ? 'Yenileniyor...' : 'Yenile'}
                        </Button>
                      </>
                    )}
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>

          {apiKey.isActive && (
            <AlertDialog>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="API anahtarını iptal et"
              >
                <Ban className="h-4 w-4 text-muted" />
              </Button>
              <AlertDialog.Backdrop>
                <AlertDialog.Container>
                  <AlertDialog.Dialog className="sm:max-w-[400px]">
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="warning" />
                      <AlertDialog.Heading>API Anahtarını İptal Et</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p>Bu API anahtarı iptal edilecek ve artık kullanılamayacak.</p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button variant="tertiary" slot="close">
                        Vazgeç
                      </Button>
                      <Button
                        variant="danger"
                        slot="close"
                        onPress={handleRevoke}
                        isDisabled={isRevoking}
                      >
                        {isRevoking ? 'İptal Ediliyor...' : 'İptal Et'}
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          )}

          <AlertDialog>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="API anahtarını sil"
            >
              <Trash2 className="h-4 w-4 text-muted" />
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>API Anahtarını Sil</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      Bu işlem geri alınamaz. API anahtarı kalıcı olarak silinecektir.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" slot="close">
                      Vazgeç
                    </Button>
                    <Button
                      variant="danger"
                      slot="close"
                      onPress={handleDelete}
                      isDisabled={isDeleting}
                    >
                      {isDeleting ? 'Siliniyor...' : 'Sil'}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
