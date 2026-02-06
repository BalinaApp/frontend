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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiKeyStore, ApiKey } from '@/stores/apiKeyStore';
import { usePricingStore } from '@/stores/pricingStore';
import { useCompany } from '@/components/providers/CompanyProvider';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  // Check for Enterprise access
  const hasApiAccess = hasFeature('apiAccess');

  useEffect(() => {
    fetchMyPlan();
  }, [fetchMyPlan]);

  useEffect(() => {
    // Only fetch API keys if pricing is disabled or user has access
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
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: tr,
    });
  };

  // Enterprise plan required screen
  if (!hasApiAccess && isPricingEnabled) {
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/${company?.slug}/settings`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Key className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">API Erişimi</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Enterprise Plan Gerekli</h3>
          <p className="mt-2 text-center text-muted-foreground max-w-md px-4">
            Harici API erişimi ve API anahtarı yönetimi Enterprise plan ile
            kullanılabilir.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push(`/${company?.slug}/pricing`)}
          >
            Planları Görüntüle
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Key className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">API Erişimi</h1>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Yeni API Anahtarı
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {newKeySecret ? 'API Anahtarı Oluşturuldu' : 'Yeni API Anahtarı'}
              </DialogTitle>
              <DialogDescription>
                {newKeySecret
                  ? 'API anahtarınız oluşturuldu. Bu anahtarı güvenli bir yerde saklayın, tekrar gösterilmeyecektir.'
                  : 'Harici API erişimi için yeni bir API anahtarı oluşturun.'}
              </DialogDescription>
            </DialogHeader>

            {newKeySecret ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dikkat!</AlertTitle>
                  <AlertDescription>
                    Bu API anahtarı sadece bir kez gösterilecektir. Lütfen
                    güvenli bir yerde saklayın.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>API Anahtarı</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={newKeySecret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyKey}
                    >
                      {copiedKey ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleCloseCreateDialog}>Tamam</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Anahtar Adı</Label>
                  <Input
                    id="name"
                    placeholder="Örn: Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Yazma İzni</Label>
                    <p className="text-sm text-muted-foreground">
                      Bu anahtar veri değişikliği yapabilsin mi?
                    </p>
                  </div>
                  <Switch
                    checked={writePermission}
                    onCheckedChange={setWritePermission}
                  />
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      'Oluştur'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="px-4 py-3 border-b">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* API Documentation */}
      <div className="border-b">
        <div className="grid grid-cols-12 items-center px-4 py-4">
          <div className="col-span-3">
            <p className="text-sm font-medium">Base URL</p>
          </div>
          <div className="col-span-6">
            <code className="bg-muted px-2 py-1 rounded text-sm">
              {process.env.NEXT_PUBLIC_API_URL}/api/v1
            </code>
          </div>
          <div className="col-span-3 text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `${process.env.NEXT_PUBLIC_API_URL}/api/docs`,
                  '_blank'
                )
              }
            >
              Swagger Docs
            </Button>
          </div>
        </div>
      </div>

      {/* Rate Limiting Info */}
      <div className="border-b">
        <div className="px-4 py-2 bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground">
            Rate Limiting
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">100 istek/dk</p>
              <p className="text-xs text-muted-foreground">API key başına</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">60 saniye</p>
              <p className="text-xs text-muted-foreground">Sıfırlama süresi</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">X-RateLimit-*</p>
              <p className="text-xs text-muted-foreground">Response headers</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Section Header */}
      <div className="px-4 py-2 bg-muted/50 border-b">
        <span className="text-xs font-medium text-muted-foreground">
          API Anahtarları
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-2 border-b bg-muted/30">
        <div className="col-span-3 text-xs font-medium text-muted-foreground">Ad</div>
        <div className="col-span-2 text-xs font-medium text-muted-foreground">Anahtar</div>
        <div className="col-span-2 text-xs font-medium text-muted-foreground">İzinler</div>
        <div className="col-span-2 text-xs font-medium text-muted-foreground">Son Kullanım</div>
        <div className="col-span-2 text-xs font-medium text-muted-foreground">Durum</div>
        <div className="col-span-1 text-xs font-medium text-muted-foreground text-right">İşlem</div>
      </div>

      {/* API Keys List */}
      <div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Key className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Henüz API anahtarı yok</h3>
            <p className="text-muted-foreground text-center mt-1">
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

// Separate component for each API key row
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
      className={cn(
        'grid grid-cols-12 items-center px-4 py-3 border-b',
        index % 2 === 1 && 'bg-muted/30'
      )}
    >
      <div className="col-span-3">
        <p className="text-sm font-medium">{apiKey.name}</p>
      </div>
      <div className="col-span-2">
        <code className="bg-muted px-2 py-1 rounded text-xs">
          {apiKey.keyPrefix}...
        </code>
      </div>
      <div className="col-span-2">
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs">Okuma</Badge>
          {apiKey.permissions?.write && (
            <Badge variant="secondary" className="text-xs">Yazma</Badge>
          )}
        </div>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-muted-foreground">
          {formatDate(apiKey.lastUsedAt)}
        </p>
      </div>
      <div className="col-span-2">
        {apiKey.isActive ? (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
            İptal Edildi
          </span>
        )}
      </div>
      <div className="col-span-1 text-right">
        <div className="flex justify-end gap-1">
          {/* Rotate Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!apiKey.isActive}
                title="Yenile"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {rotatedKey ? 'Anahtar Yenilendi' : 'API Anahtarını Yenile'}
                </DialogTitle>
                <DialogDescription>
                  {rotatedKey
                    ? 'Yeni API anahtarınız oluşturuldu. Eski anahtar artık geçersiz.'
                    : 'Bu işlem mevcut anahtarı geçersiz kılacak ve yeni bir anahtar oluşturacaktır.'}
                </DialogDescription>
              </DialogHeader>

              {rotatedKey ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Bu anahtar sadece bir kez gösterilecektir.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Input
                      type={showRotatedKey ? 'text' : 'password'}
                      value={rotatedKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowRotatedKey(!showRotatedKey)}
                    >
                      {showRotatedKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyRotatedKey}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => setRotatedKey(null)}>Tamam</Button>
                  </DialogFooter>
                </div>
              ) : (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRotatedKey(null)}
                  >
                    İptal
                  </Button>
                  <Button onClick={handleRotate} disabled={isRotating}>
                    {isRotating ? 'Yenileniyor...' : 'Yenile'}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>

          {/* Revoke Button */}
          {apiKey.isActive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="İptal Et">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>API Anahtarını İptal Et</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu API anahtarı iptal edilecek ve artık kullanılamayacak.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevoke}
                    disabled={isRevoking}
                  >
                    {isRevoking ? 'İptal Ediliyor...' : 'İptal Et'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Sil">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>API Anahtarını Sil</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. API anahtarı kalıcı olarak
                  silinecektir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {isDeleting ? 'Siliniyor...' : 'Sil'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
