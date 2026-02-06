'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Loader,
  RefreshCw,
  Trash2,
  ExternalLink,
  Check,
  AlertCircle,
  Sparkles,
  Link,
  Package,
  Layers,
  ShoppingCart,
  Database,
  Percent,
  Truck,
  Settings,
  Plug,
  Key,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore, CreateStoreDto } from '@/stores/storeStore';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

const marketplaces = [
  {
    id: 'WORDPRESS',
    name: 'WordPress',
    description: 'WooCommerce',
    logo: '/logos/woocommerce.svg',
    comingSoon: false,
    steps: [
      { key: 'name', label: 'Mağaza Adı', placeholder: 'Mağaza adınız', description: 'Mağazanızı tanıyacağınız bir isim girin.' },
      { key: 'url', label: 'Site URL', placeholder: 'https://example.com', description: 'WooCommerce sitenizin URL adresini girin.' },
      { key: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_xxxxxxxx', description: 'WooCommerce REST API Consumer Key bilginizi girin.' },
      { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_xxxxxxxx', type: 'password', description: 'WooCommerce REST API Consumer Secret bilginizi girin.' },
    ],
    helpUrl: 'https://woocommerce.com/document/woocommerce-rest-api/',
  },
  {
    id: 'TRENDYOL',
    name: 'Trendyol',
    logo: '/logos/trendyol.svg',
    comingSoon: true,
  },
  {
    id: 'HEPSIBURADA',
    name: 'Hepsiburada',
    logo: '/logos/hepsiburada.svg',
    comingSoon: true,
  },
  {
    id: 'AMAZON',
    name: 'Amazon',
    logo: '/logos/amazon.svg',
    comingSoon: true,
  },
  {
    id: 'N11',
    name: 'N11',
    logo: '/logos/n11.svg',
    comingSoon: true,
  },
  {
    id: 'CICEKSEPETI',
    name: 'Çiçeksepeti',
    logo: '/logos/ciceksepeti.png',
    comingSoon: true,
  },
];

export default function StoresPage() {
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores, createStore, updateStore, deleteStore, syncStore } = useStoreStore();

  const [selectedMarketplace, setSelectedMarketplace] = useState<typeof marketplaces[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: '',
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Settings state
  const [settingsState, setSettingsState] = useState<Record<string, {
    commissionRate: string;
    shippingCost: string;
    saving: boolean;
    saved: boolean;
    error: string | null;
  }>>({});
  const [settingsModalStoreId, setSettingsModalStoreId] = useState<string | null>(null);
  const [deleteConfirmStoreId, setDeleteConfirmStoreId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WCSC state
  const [wcscState, setWcscState] = useState<{
    apiKey: string;
    apiSecret: string;
    showSecret: boolean;
    testing: boolean;
    testResult: { success: boolean; error?: string } | null;
    connecting: boolean;
    disconnecting: boolean;
  }>({
    apiKey: '',
    apiSecret: '',
    showSecret: false,
    testing: false,
    testResult: null,
    connecting: false,
    disconnecting: false,
  });

  const totalSteps = selectedMarketplace?.steps?.length || 0;
  const isLastStep = currentStep === totalSteps; // Test step

  useEffect(() => {
    if (currentCompany?.id) {
      fetchStores(currentCompany.id);
    }
  }, [currentCompany?.id, fetchStores]);

  // Polling: Sync devam ediyorsa her 2 saniyede bir güncelle
  useEffect(() => {
    const hasSyncingStore = stores.some((s) => s.isSyncing);
    if (!hasSyncingStore || !currentCompany?.id) return;

    const interval = setInterval(() => {
      fetchStores(currentCompany.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [stores, currentCompany?.id, fetchStores]);

  // Settings state'i store'lardan başlat
  useEffect(() => {
    const newState: typeof settingsState = {};
    stores.forEach((store) => {
      if (!settingsState[store.id]) {
        newState[store.id] = {
          commissionRate: String(store.commissionRate || 0),
          shippingCost: String(store.shippingCost || 0),
          saving: false,
          saved: false,
          error: null,
        };
      } else {
        newState[store.id] = settingsState[store.id];
      }
    });
    if (Object.keys(newState).length > 0) {
      setSettingsState((prev) => ({ ...prev, ...newState }));
    }
  }, [stores]);

  // Settings input change handler
  const handleSettingsChange = (storeId: string, field: 'commissionRate' | 'shippingCost', value: string) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');

    setSettingsState((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], [field]: cleanValue, saved: false },
    }));
  };

  // Manual save function
  const handleSaveSettings = async (storeId: string) => {
    if (!currentCompany?.id) return;

    const state = settingsState[storeId];
    if (!state) return;

    setSettingsState((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], saving: true, saved: false, error: null },
    }));

    try {
      const commissionRate = parseFloat(state.commissionRate) || 0;
      const shippingCost = parseFloat(state.shippingCost) || 0;

      // Validation
      if (commissionRate < 0 || commissionRate > 100) {
        throw new Error('Komisyon oranı 0-100 arasında olmalı');
      }
      if (shippingCost < 0 || shippingCost > 10000) {
        throw new Error('Kargo maliyeti 0-10000 arasında olmalı');
      }

      await updateStore(currentCompany.id, storeId, { commissionRate, shippingCost });

      setSettingsState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], saving: false, saved: true, error: null },
      }));

      toast.success('Ayarlar kaydedildi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Kaydetme başarısız';
      setSettingsState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], saving: false, saved: false, error: errorMessage },
      }));
      toast.error(errorMessage);
    }
  };

  // WCSC functions
  const handleTestWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    if (!wcscState.apiKey || !wcscState.apiSecret) {
      toast.error('API Key ve API Secret gerekli');
      return;
    }

    setWcscState(prev => ({ ...prev, testing: true, testResult: null }));

    try {
      const response = await api.post(`/company/${currentCompany.id}/stores/${settingsModalStoreId}/test-wcsc`, {
        apiKey: wcscState.apiKey,
        apiSecret: wcscState.apiSecret,
      });

      setWcscState(prev => ({
        ...prev,
        testing: false,
        testResult: { success: response.data.success, error: response.data.error },
      }));
    } catch (error: any) {
      setWcscState(prev => ({
        ...prev,
        testing: false,
        testResult: { success: false, error: error.response?.data?.message || 'Test başarısız' },
      }));
    }
  };

  const handleConnectWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    if (!wcscState.apiKey || !wcscState.apiSecret) {
      toast.error('API Key ve API Secret gerekli');
      return;
    }

    setWcscState(prev => ({ ...prev, connecting: true }));

    try {
      await api.post(`/company/${currentCompany.id}/stores/${settingsModalStoreId}/connect-wcsc`, {
        apiKey: wcscState.apiKey,
        apiSecret: wcscState.apiSecret,
      });

      toast.success('WC Stock Connector bağlandı');
      fetchStores(currentCompany.id);
      setWcscState(prev => ({ ...prev, connecting: false, apiKey: '', apiSecret: '', testResult: null }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bağlantı başarısız');
      setWcscState(prev => ({ ...prev, connecting: false }));
    }
  };

  const handleDisconnectWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;

    setWcscState(prev => ({ ...prev, disconnecting: true }));

    try {
      await api.post(`/company/${currentCompany.id}/stores/${settingsModalStoreId}/disconnect-wcsc`);

      toast.success('WC Stock Connector bağlantısı kesildi');
      fetchStores(currentCompany.id);
      setWcscState(prev => ({ ...prev, disconnecting: false }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bağlantı kesilemedi');
      setWcscState(prev => ({ ...prev, disconnecting: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı');
  };

  const handleMarketplaceClick = (marketplace: typeof marketplaces[0]) => {
    if (marketplace.comingSoon) return;
    setSelectedMarketplace(marketplace);
    setFormData({
      name: `${marketplace.name} Mağazam`,
      url: '',
      consumerKey: '',
      consumerSecret: '',
    });
    setCurrentStep(0);
    setTestResult(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCurrentStep(0);
    setTestResult(null);
  };

  const validateCurrentStep = (): boolean => {
    if (!selectedMarketplace?.steps) return false;
    const step = selectedMarketplace.steps[currentStep];
    if (!step) return true; // Test step

    const value = formData[step.key as keyof typeof formData];

    if (step.key === 'name' && !value.trim()) {
      toast.error('Mağaza adı gerekli');
      return false;
    }
    if (step.key === 'url' && !value.trim()) {
      toast.error('Site URL gerekli');
      return false;
    }
    if (step.key === 'consumerKey' && (!value || value.length < 32)) {
      toast.error('Consumer Key en az 32 karakter olmalı');
      return false;
    }
    if (step.key === 'consumerSecret' && (!value || value.length < 32)) {
      toast.error('Consumer Secret en az 32 karakter olmalı');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleTestConnection = async () => {
    if (!currentCompany?.id) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await api.post(`/company/${currentCompany.id}/stores/test`, {
        url: formData.url,
        consumerKey: formData.consumerKey,
        consumerSecret: formData.consumerSecret,
      });

      if (response.data.success) {
        setTestResult({ success: true });
      } else {
        setTestResult({ success: false, error: response.data.error || 'Bağlantı kurulamadı' });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Bağlantı testi başarısız';
      setTestResult({ success: false, error: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!currentCompany?.id || !selectedMarketplace) return;

    setIsSubmitting(true);
    try {
      await createStore(currentCompany.id, formData as CreateStoreDto);
      toast.success('Mağaza başarıyla bağlandı');
      handleDialogClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Mağaza bağlanamadı';

      // Mağaza limiti hatası kontrolü
      if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
        handleDialogClose();
        setShowUpgradeDialog(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentCompany?.id || !deleteConfirmStoreId) return;

    setIsDeleting(true);
    try {
      await deleteStore(currentCompany.id, deleteConfirmStoreId);
      toast.success('Mağaza bağlantısı kesildi');
      setDeleteConfirmStoreId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mağaza silinemedi');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSync = async (storeId: string) => {
    if (!currentCompany?.id) return;

    try {
      await syncStore(currentCompany.id, storeId);
      toast.success('Senkronizasyon başlatıldı');
      fetchStores(currentCompany.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Senkronizasyon başarısız');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Henüz senkronize edilmedi';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const handleStatusToggle = async (storeId: string, currentStatus: string) => {
    if (!currentCompany?.id) return;

    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateStore(currentCompany.id, storeId, { status: newStatus as any });
      toast.success(newStatus === 'ACTIVE' ? 'Mağaza aktif edildi' : 'Mağaza pasif edildi');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Durum değiştirilemedi');
    }
  };

  return (
    <>
      {/* Mağaza Bağla */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Mağaza Bağla</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b">
        {marketplaces.map((marketplace, index) => {
          const isDisabled = marketplace.comingSoon;
          const isLastInRow = (index + 1) % 3 === 0;
          return (
            <div
              key={marketplace.id}
              className={`p-6 ${!isLastInRow ? 'lg:border-r' : ''} ${index >= 3 ? 'border-t' : ''} ${index % 2 === 0 && index < 3 ? 'md:border-r lg:border-r' : ''} ${index >= 2 && index < 3 ? 'md:border-t lg:border-t-0' : ''}`}
            >
              <img
                src={marketplace.logo}
                alt={marketplace.name}
                className={`w-12 h-12 object-contain ${isDisabled ? 'opacity-50 grayscale' : ''}`}
              />
              <div className="mt-4">
                <h4 className={`font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}>
                  {marketplace.name}
                </h4>
                {marketplace.description && (
                  <p className="text-sm text-muted-foreground">{marketplace.description}</p>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                {isDisabled ? (
                  <span className="text-sm text-muted-foreground">Yakında</span>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleMarketplaceClick(marketplace)}
                    >
                      + Bağla
                    </Button>
                    {marketplace.helpUrl && (
                      <a
                        href={marketplace.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        Döküman
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bağlı Mağazalar */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Bağlı Mağazalar ({stores.length})</h3>
      </div>
      {stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b">
          {stores.map((store, index) => {
            const isLastInRow = (index + 1) % 3 === 0;
            return (
              <div
                key={store.id}
                className={`p-6 ${!isLastInRow ? 'lg:border-r' : ''} ${index >= 3 ? 'border-t' : ''} ${index % 2 === 0 && index < 3 ? 'md:border-r lg:border-r' : ''} ${index >= 2 && index < 3 ? 'md:border-t lg:border-t-0' : ''} ${index >= 1 && index < 3 ? 'md:border-t lg:border-t-0' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://cdn.worldvectorlogo.com/logos/woocommerce.svg"
                      alt="WooCommerce"
                      className="w-10 h-10 object-contain"
                    />
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <a
                        href={store.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {store.url.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => setSettingsModalStoreId(store.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={store.status === 'ACTIVE'}
                      onCheckedChange={() => handleStatusToggle(store.id, store.status)}
                    />
                  </div>
                </div>

                {/* Sync Info or Sync Progress */}
                {store.isSyncing && store.status === 'ACTIVE' ? (
                  <div className="mt-4 relative">
                    {/* Top gradient fade */}
                    <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
                    {/* Bottom gradient fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

                    <div className="space-y-1 py-2">
                      {(() => {
                        const syncSteps = ['connection', 'products', 'variations', 'orders', 'saving'];
                        const currentStepIndex = store.syncStep ? syncSteps.indexOf(store.syncStep) : 0;

                        const getCount = (key: string) => {
                          if (key === 'products') return store.syncProductsCount;
                          if (key === 'variations') return store.syncVariationsCount;
                          if (key === 'orders') return store.syncOrdersCount;
                          return null;
                        };

                        return [
                          { icon: Link, label: 'Bağlantı kontrol ediliyor', key: 'connection' },
                          { icon: Package, label: 'Ürünler çekiliyor', key: 'products' },
                          { icon: Layers, label: 'Varyasyonlar çekiliyor', key: 'variations' },
                          { icon: ShoppingCart, label: 'Siparişler çekiliyor', key: 'orders' },
                          { icon: Database, label: 'Veriler kaydediliyor', key: 'saving' },
                        ].map((step, idx) => {
                          const stepIndex = syncSteps.indexOf(step.key);
                          const status = stepIndex < currentStepIndex ? 'completed' : stepIndex === currentStepIndex ? 'active' : 'pending';
                          const count = getCount(step.key);

                          return (
                            <div
                              key={idx}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                                status === 'active' && 'bg-muted',
                                status === 'completed' && 'text-muted-foreground/50 scale-95',
                                status === 'pending' && 'text-muted-foreground/30 scale-95'
                              )}
                            >
                              {status === 'active' ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <step.icon className="h-4 w-4" />
                              )}
                              <span className="flex-1">{step.label}</span>
                              {count !== null && count > 0 && (
                                <span className="text-xs tabular-nums">{count}</span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Son senkronizasyon</span>
                      <span className="ml-auto text-foreground">{formatDate(store.lastSyncAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSync(store.id)}
                        disabled={store.status !== 'ACTIVE'}
                      >
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Senkronize Et
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmStoreId(store.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-muted-foreground">
          <p className="text-sm">Henüz bağlı mağaza yok</p>
        </div>
      )}

      {/* Connection Wizard Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMarketplace && (
                <img
                  src={selectedMarketplace.logo}
                  alt={selectedMarketplace.name}
                  className="w-6 h-6 object-contain"
                />
              )}
              {selectedMarketplace?.name} Bağla
            </DialogTitle>
          </DialogHeader>

          {/* Vertical Stepper with Content */}
          <div className="py-2">
            {selectedMarketplace?.steps?.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={index} className="flex gap-4">
                  {/* Step indicator column */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(index)}
                      disabled={!isCompleted}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer'
                          : 'bg-muted text-muted-foreground cursor-default'
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </button>
                    {/* Connector line */}
                    {index < totalSteps && (
                      <div className="w-0.5 flex-1 min-h-4 bg-muted" />
                    )}
                  </div>

                  {/* Content column */}
                  <div className={cn('flex-1 pb-6', isActive ? '' : 'pb-4')}>
                    {isActive && !isLastStep ? (
                      <div className="space-y-3">
                        <Label htmlFor={step.key}>{step.label}</Label>
                        <Input
                          id={step.key}
                          type={step.type || 'text'}
                          value={formData[step.key as keyof typeof formData]}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [step.key]: e.target.value,
                            }))
                          }
                          placeholder={step.placeholder}
                          autoFocus
                        />
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                        <Button onClick={handleNext} className="w-full">
                          İleri
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => isCompleted && setCurrentStep(index)}
                        disabled={!isCompleted}
                        className={cn(
                          'pt-1.5 text-left w-full',
                          isCompleted && 'cursor-pointer hover:opacity-80'
                        )}
                      >
                        <span className="text-sm text-muted-foreground">
                          {step.label}
                        </span>
                        {isCompleted && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                            {formData[step.key as keyof typeof formData]}
                          </p>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Test Connection Step */}
            <div className="flex gap-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    isLastStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {totalSteps + 1}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                {isLastStep ? (
                  <div className="space-y-3">
                    <Label>Bağlantı Testi</Label>
                    <p className="text-sm text-muted-foreground">
                      Girdiğiniz bilgilerle bağlantıyı test edin.
                    </p>

                    {/* Connection Info Summary */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Mağaza:</span> {formData.name}</p>
                      <p><span className="text-muted-foreground">URL:</span> {formData.url}</p>
                    </div>

                    {/* Test Button */}
                    <Button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      variant="outline"
                      className="w-full"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Test ediliyor...
                        </>
                      ) : (
                        'Bağlantıyı Test Et'
                      )}
                    </Button>

                    {/* Test Result */}
                    {testResult && (
                      <div
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg text-sm',
                          testResult.success
                            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        )}
                      >
                        {testResult.success ? (
                          <>
                            <Check className="h-4 w-4" />
                            Bağlantı başarılı!
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            {testResult.error}
                          </>
                        )}
                      </div>
                    )}

                    {/* Connect Button */}
                    <Button
                      onClick={handleConnect}
                      disabled={isSubmitting || !testResult?.success}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Bağlanıyor...
                        </>
                      ) : (
                        'Mağazayı Bağla'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="pt-1.5">
                    <span className="text-sm text-muted-foreground">Bağlantı Testi</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Documentation Link */}
          <div className="pt-4">
            {selectedMarketplace?.helpUrl && (
              <a
                href={selectedMarketplace.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Dokümantasyon
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Mağaza Limitine Ulaştınız
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Mevcut planınızın mağaza limitine ulaştınız. Daha fazla mağaza eklemek için planınızı yükseltin.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Free Plan</span>
                <span>2 mağaza</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pro Plan</span>
                <span>5 mağaza</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Enterprise Plan</span>
                <span>Sınırsız</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowUpgradeDialog(false)}
              >
                Kapat
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  // TODO: Pricing sayfasına yönlendir
                  toast.info('Fiyatlandırma sayfası yakında eklenecek');
                  setShowUpgradeDialog(false);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Planı Yükselt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={!!settingsModalStoreId} onOpenChange={(open) => {
        if (!open) {
          setSettingsModalStoreId(null);
          setWcscState({ apiKey: '', apiSecret: '', showSecret: false, testing: false, testResult: null, connecting: false, disconnecting: false });
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Mağaza Ayarları
            </DialogTitle>
          </DialogHeader>
          {settingsModalStoreId && settingsState[settingsModalStoreId] && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Genel</TabsTrigger>
                <TabsTrigger value="wcsc" className="flex items-center gap-1">
                  <Plug className="h-3.5 w-3.5" />
                  Stok Sync
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Store Info */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <img
                    src="https://cdn.worldvectorlogo.com/logos/woocommerce.svg"
                    alt="WooCommerce"
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <p className="font-medium text-sm">
                      {stores.find((s) => s.id === settingsModalStoreId)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stores.find((s) => s.id === settingsModalStoreId)?.url.replace(/^https?:\/\//, '')}
                    </p>
                  </div>
                </div>

                {/* Commission Rate */}
                <div className="space-y-2">
                  <Label htmlFor="commission" className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    Komisyon Oranı
                  </Label>
                  <div className="relative">
                    <Input
                      id="commission"
                      type="text"
                      inputMode="decimal"
                      value={settingsState[settingsModalStoreId].commissionRate}
                      onChange={(e) => handleSettingsChange(settingsModalStoreId, 'commissionRate', e.target.value)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pazaryeri komisyon oranı (0-100 arası)
                  </p>
                </div>

                {/* Shipping Cost */}
                <div className="space-y-2">
                  <Label htmlFor="shipping" className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    Kargo Maliyeti
                  </Label>
                  <div className="relative">
                    <Input
                      id="shipping"
                      type="text"
                      inputMode="decimal"
                      value={settingsState[settingsModalStoreId].shippingCost}
                      onChange={(e) => handleSettingsChange(settingsModalStoreId, 'shippingCost', e.target.value)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">TL</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sabit kargo maliyeti (sipariş başına)
                  </p>
                </div>

                {/* Last Updated */}
                <p className="text-xs text-muted-foreground text-center">
                  Son güncelleme: {new Date(stores.find((s) => s.id === settingsModalStoreId)?.updatedAt || '').toLocaleString('tr-TR')}
                </p>

                {/* Save Button */}
                <Button
                  className="w-full"
                  onClick={() => handleSaveSettings(settingsModalStoreId)}
                  disabled={settingsState[settingsModalStoreId].saving}
                >
                  {settingsState[settingsModalStoreId].saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    'Kaydet'
                  )}
                </Button>
              </TabsContent>

              {/* WCSC Tab */}
              <TabsContent value="wcsc" className="space-y-4 mt-4">
                {(() => {
                  const currentStore = stores.find((s) => s.id === settingsModalStoreId);
                  const isConnected = currentStore?.hasWcscPlugin;

                  if (isConnected) {
                    return (
                      <>
                        {/* Connected State */}
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">WC Stock Connector Bağlı</span>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Stok değişiklikleri otomatik olarak senkronize edilecek.
                          </p>
                        </div>

                        {/* Webhook URL */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Link className="h-4 w-4 text-muted-foreground" />
                            Webhook URL
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={`${window.location.origin}/api/webhook/stock-sync`}
                              className="text-xs font-mono"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(`${window.location.origin}/api/webhook/stock-sync`)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Bu URL'i WordPress eklentisindeki Dashboard URL alanına girin.
                          </p>
                        </div>

                        {/* Last Sync */}
                        {currentStore?.wcscLastSyncAt && (
                          <div className="text-sm text-muted-foreground">
                            Son webhook: {new Date(currentStore.wcscLastSyncAt).toLocaleString('tr-TR')}
                          </div>
                        )}

                        {/* Disconnect Button */}
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={handleDisconnectWcsc}
                          disabled={wcscState.disconnecting}
                        >
                          {wcscState.disconnecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Bağlantı kesiliyor...
                            </>
                          ) : (
                            'Bağlantıyı Kes'
                          )}
                        </Button>
                      </>
                    );
                  }

                  return (
                    <>
                      {/* Not Connected State */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Plug className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">WC Stock Connector</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          WordPress sitenize WC Stock Connector eklentisini kurun ve aşağıdaki bilgileri girin.
                        </p>
                      </div>

                      {/* API Key */}
                      <div className="space-y-2">
                        <Label htmlFor="wcsc-api-key" className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          API Key
                        </Label>
                        <Input
                          id="wcsc-api-key"
                          type="text"
                          value={wcscState.apiKey}
                          onChange={(e) => setWcscState(prev => ({ ...prev, apiKey: e.target.value, testResult: null }))}
                          placeholder="Eklentiden kopyalayın"
                        />
                      </div>

                      {/* API Secret */}
                      <div className="space-y-2">
                        <Label htmlFor="wcsc-api-secret" className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          API Secret
                        </Label>
                        <div className="relative">
                          <Input
                            id="wcsc-api-secret"
                            type={wcscState.showSecret ? 'text' : 'password'}
                            value={wcscState.apiSecret}
                            onChange={(e) => setWcscState(prev => ({ ...prev, apiSecret: e.target.value, testResult: null }))}
                            placeholder="Eklentiden kopyalayın"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setWcscState(prev => ({ ...prev, showSecret: !prev.showSecret }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {wcscState.showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Test Result */}
                      {wcscState.testResult && (
                        <div
                          className={cn(
                            'flex items-center gap-2 p-3 rounded-lg text-sm',
                            wcscState.testResult.success
                              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                          )}
                        >
                          {wcscState.testResult.success ? (
                            <>
                              <Check className="h-4 w-4" />
                              Bağlantı başarılı!
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              {wcscState.testResult.error}
                            </>
                          )}
                        </div>
                      )}

                      {/* Test Button */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleTestWcsc}
                        disabled={wcscState.testing || !wcscState.apiKey || !wcscState.apiSecret}
                      >
                        {wcscState.testing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Test ediliyor...
                          </>
                        ) : (
                          'Bağlantıyı Test Et'
                        )}
                      </Button>

                      {/* Connect Button */}
                      <Button
                        className="w-full"
                        onClick={handleConnectWcsc}
                        disabled={wcscState.connecting || !wcscState.testResult?.success}
                      >
                        {wcscState.connecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Bağlanıyor...
                          </>
                        ) : (
                          'Eklentiyi Bağla'
                        )}
                      </Button>

                      {/* Help Link */}
                      <p className="text-xs text-muted-foreground text-center">
                        Eklentiyi indirmek için{' '}
                        <a href="#" className="text-primary hover:underline">
                          buraya tıklayın
                        </a>
                      </p>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmStoreId} onOpenChange={(open) => !open && setDeleteConfirmStoreId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Mağazayı Sil
            </DialogTitle>
          </DialogHeader>
          {deleteConfirmStoreId && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {stores.find((s) => s.id === deleteConfirmStoreId)?.name}
                </span>{' '}
                mağazasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteConfirmStoreId(null)}
                  disabled={isDeleting}
                >
                  İptal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    'Evet, Sil'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
