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
  Link as LinkIcon,
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
import {
  Button,
  Input,
  Label,
  Modal,
  Switch,
  Tabs,
  TextField,
} from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore, CreateStoreDto } from '@/stores/storeStore';
import { toast } from 'sonner';
import { api } from '@/services/api';

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
  { id: 'TRENDYOL', name: 'Trendyol', logo: '/logos/trendyol.svg', comingSoon: true },
  { id: 'HEPSIBURADA', name: 'Hepsiburada', logo: '/logos/hepsiburada.svg', comingSoon: true },
  { id: 'AMAZON', name: 'Amazon', logo: '/logos/amazon.svg', comingSoon: true },
  { id: 'N11', name: 'N11', logo: '/logos/n11.svg', comingSoon: true },
  { id: 'CICEKSEPETI', name: 'Çiçeksepeti', logo: '/logos/ciceksepeti.png', comingSoon: true },
];

type Marketplace = {
  id: string;
  name: string;
  description?: string;
  logo: string;
  comingSoon: boolean;
  steps?: Array<{
    key: string;
    label: string;
    placeholder: string;
    description: string;
    type?: string;
  }>;
  helpUrl?: string;
};

export default function StoresPage() {
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores, createStore, updateStore, deleteStore, syncStore } =
    useStoreStore();

  const [selectedMarketplace, setSelectedMarketplace] = useState<Marketplace | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: '',
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const [settingsState, setSettingsState] = useState<
    Record<
      string,
      {
        commissionRate: string;
        shippingCost: string;
        saving: boolean;
        saved: boolean;
        error: string | null;
      }
    >
  >({});
  const [settingsModalStoreId, setSettingsModalStoreId] = useState<string | null>(null);
  const [deleteConfirmStoreId, setDeleteConfirmStoreId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const isLastStep = currentStep === totalSteps;

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  useEffect(() => {
    const hasSyncingStore = stores.some((s) => s.isSyncing);
    if (!hasSyncingStore || !currentCompany?.id) return;
    const interval = setInterval(() => {
      fetchStores(currentCompany.id);
    }, 2000);
    return () => clearInterval(interval);
  }, [stores, currentCompany?.id, fetchStores]);

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

  const handleSettingsChange = (
    storeId: string,
    field: 'commissionRate' | 'shippingCost',
    value: string
  ) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setSettingsState((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], [field]: cleanValue, saved: false },
    }));
  };

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
      if (commissionRate < 0 || commissionRate > 100)
        throw new Error('Komisyon oranı 0-100 arasında olmalı');
      if (shippingCost < 0 || shippingCost > 10000)
        throw new Error('Kargo maliyeti 0-10000 arasında olmalı');

      await updateStore(currentCompany.id, storeId, { commissionRate, shippingCost });
      setSettingsState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], saving: false, saved: true, error: null },
      }));
      toast.success('Ayarlar kaydedildi');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Kaydetme başarısız';
      setSettingsState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], saving: false, saved: false, error: errorMessage },
      }));
      toast.error(errorMessage);
    }
  };

  const handleTestWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    if (!wcscState.apiKey || !wcscState.apiSecret) {
      toast.error('API Key ve API Secret gerekli');
      return;
    }
    setWcscState((prev) => ({ ...prev, testing: true, testResult: null }));
    try {
      const response = await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/test-wcsc`,
        { apiKey: wcscState.apiKey, apiSecret: wcscState.apiSecret }
      );
      setWcscState((prev) => ({
        ...prev,
        testing: false,
        testResult: { success: response.data.success, error: response.data.error },
      }));
    } catch (error: any) {
      setWcscState((prev) => ({
        ...prev,
        testing: false,
        testResult: {
          success: false,
          error: error.response?.data?.message || 'Test başarısız',
        },
      }));
    }
  };

  const handleConnectWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    if (!wcscState.apiKey || !wcscState.apiSecret) {
      toast.error('API Key ve API Secret gerekli');
      return;
    }
    setWcscState((prev) => ({ ...prev, connecting: true }));
    try {
      await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/connect-wcsc`,
        { apiKey: wcscState.apiKey, apiSecret: wcscState.apiSecret }
      );
      toast.success('WC Stock Connector bağlandı');
      fetchStores(currentCompany.id);
      setWcscState((prev) => ({
        ...prev,
        connecting: false,
        apiKey: '',
        apiSecret: '',
        testResult: null,
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bağlantı başarısız');
      setWcscState((prev) => ({ ...prev, connecting: false }));
    }
  };

  const handleDisconnectWcsc = async () => {
    if (!currentCompany?.id || !settingsModalStoreId) return;
    setWcscState((prev) => ({ ...prev, disconnecting: true }));
    try {
      await api.post(
        `/company/${currentCompany.id}/stores/${settingsModalStoreId}/disconnect-wcsc`
      );
      toast.success('WC Stock Connector bağlantısı kesildi');
      fetchStores(currentCompany.id);
      setWcscState((prev) => ({ ...prev, disconnecting: false }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bağlantı kesilemedi');
      setWcscState((prev) => ({ ...prev, disconnecting: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı');
  };

  const handleMarketplaceClick = (marketplace: Marketplace) => {
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
    if (!step) return true;

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
      if (response.data.success) setTestResult({ success: true });
      else
        setTestResult({
          success: false,
          error: response.data.error || 'Bağlantı kurulamadı',
        });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Bağlantı testi başarısız';
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
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Mağaza Bağla</h3>
      </div>
      <div className="grid grid-cols-1 border-b border-border md:grid-cols-2 lg:grid-cols-3">
        {marketplaces.map((marketplace, index) => {
          const isDisabled = marketplace.comingSoon;
          const isLastInRow = (index + 1) % 3 === 0;
          return (
            <div
              key={marketplace.id}
              className={`p-6 ${!isLastInRow ? 'lg:border-r lg:border-border' : ''} ${
                index >= 3 ? 'border-t border-border' : ''
              } ${index % 2 === 0 && index < 3 ? 'md:border-r md:border-border' : ''}`}
            >
              <img
                src={marketplace.logo}
                alt={marketplace.name}
                className={`h-12 w-12 object-contain ${isDisabled ? 'opacity-50 grayscale' : ''}`}
              />
              <div className="mt-4">
                <h4 className={`font-medium ${isDisabled ? 'text-muted' : ''}`}>
                  {marketplace.name}
                </h4>
                {marketplace.description && (
                  <p className="text-sm text-muted">{marketplace.description}</p>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                {isDisabled ? (
                  <span className="text-sm text-muted">Yakında</span>
                ) : (
                  <>
                    <Button size="sm" onPress={() => handleMarketplaceClick(marketplace)}>
                      + Bağla
                    </Button>
                    {marketplace.helpUrl && (
                      <a
                        href={marketplace.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
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

      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Bağlı Mağazalar ({stores.length})</h3>
      </div>
      {stores.length > 0 ? (
        <div className="grid grid-cols-1 border-b border-border md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store, index) => {
            const isLastInRow = (index + 1) % 3 === 0;
            return (
              <div
                key={store.id}
                className={`p-6 ${!isLastInRow ? 'lg:border-r lg:border-border' : ''} ${
                  index >= 3 ? 'border-t border-border' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://cdn.worldvectorlogo.com/logos/woocommerce.svg"
                      alt="WooCommerce"
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <a
                        href={store.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
                      >
                        {store.url.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      aria-label="Ayarlar"
                      onPress={() => setSettingsModalStoreId(store.id)}
                    >
                      <Settings className="h-4 w-4 text-muted" />
                    </Button>
                    <Switch
                      isSelected={store.status === 'ACTIVE'}
                      onChange={() => handleStatusToggle(store.id, store.status)}
                      aria-label="Aktif"
                    >
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch>
                  </div>
                </div>

                {store.isSyncing && store.status === 'ACTIVE' ? (
                  <div className="relative mt-4">
                    <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 bg-gradient-to-t from-background to-transparent" />
                    <div className="flex flex-col gap-1 py-2">
                      {(() => {
                        const syncSteps = [
                          'connection',
                          'products',
                          'variations',
                          'orders',
                          'saving',
                        ];
                        const currentStepIndex = store.syncStep
                          ? syncSteps.indexOf(store.syncStep)
                          : 0;
                        const getCount = (key: string) => {
                          if (key === 'products') return store.syncProductsCount;
                          if (key === 'variations') return store.syncVariationsCount;
                          if (key === 'orders') return store.syncOrdersCount;
                          return null;
                        };

                        return [
                          { icon: LinkIcon, label: 'Bağlantı kontrol ediliyor', key: 'connection' },
                          { icon: Package, label: 'Ürünler çekiliyor', key: 'products' },
                          { icon: Layers, label: 'Varyasyonlar çekiliyor', key: 'variations' },
                          { icon: ShoppingCart, label: 'Siparişler çekiliyor', key: 'orders' },
                          { icon: Database, label: 'Veriler kaydediliyor', key: 'saving' },
                        ].map((step, idx) => {
                          const stepIndex = syncSteps.indexOf(step.key);
                          const status =
                            stepIndex < currentStepIndex
                              ? 'completed'
                              : stepIndex === currentStepIndex
                                ? 'active'
                                : 'pending';
                          const count = getCount(step.key);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                                status === 'active' ? 'bg-default' : ''
                              } ${status === 'completed' ? 'scale-95 text-muted/50' : ''} ${
                                status === 'pending' ? 'scale-95 text-muted/30' : ''
                              }`}
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
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Son senkronizasyon</span>
                      <span className="ml-auto text-foreground">
                        {formatDate(store.lastSyncAt)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onPress={() => handleSync(store.id)}
                        isDisabled={store.status !== 'ACTIVE'}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Senkronize Et
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        aria-label="Sil"
                        onPress={() => setDeleteConfirmStoreId(store.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-muted">
          <p className="text-sm">Henüz bağlı mağaza yok</p>
        </div>
      )}

      <Modal isOpen={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {selectedMarketplace && (
                    <img
                      src={selectedMarketplace.logo}
                      alt={selectedMarketplace.name}
                      className="h-6 w-6 object-contain"
                    />
                  )}
                  {selectedMarketplace?.name} Bağla
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="py-2">
                  {selectedMarketplace?.steps?.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => isCompleted && setCurrentStep(index)}
                            disabled={!isCompleted}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : isCompleted
                                  ? 'cursor-pointer bg-default text-muted hover:bg-default/80'
                                  : 'cursor-default bg-default text-muted'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                          </button>
                          {index < totalSteps && (
                            <div className="min-h-4 w-0.5 flex-1 bg-default" />
                          )}
                        </div>
                        <div className={`flex-1 ${isActive ? 'pb-6' : 'pb-4'}`}>
                          {isActive && !isLastStep ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                value={formData[step.key as keyof typeof formData]}
                                onChange={(value) =>
                                  setFormData((prev) => ({ ...prev, [step.key]: value }))
                                }
                                type={step.type || 'text'}
                                autoFocus
                              >
                                <Label>{step.label}</Label>
                                <Input placeholder={step.placeholder} />
                              </TextField>
                              <p className="text-sm text-muted">{step.description}</p>
                              <Button onPress={handleNext} fullWidth>
                                İleri
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isCompleted && setCurrentStep(index)}
                              disabled={!isCompleted}
                              className={`w-full pt-1.5 text-left ${
                                isCompleted ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                            >
                              <span className="text-sm text-muted">{step.label}</span>
                              {isCompleted && (
                                <p className="mt-0.5 truncate text-xs text-muted/70">
                                  {formData[step.key as keyof typeof formData]}
                                </p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isLastStep
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-default text-muted'
                        }`}
                      >
                        {totalSteps + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      {isLastStep ? (
                        <div className="flex flex-col gap-3">
                          <Label>Bağlantı Testi</Label>
                          <p className="text-sm text-muted">
                            Girdiğiniz bilgilerle bağlantıyı test edin.
                          </p>
                          <div className="flex flex-col gap-1 rounded-lg bg-surface-secondary/50 p-3 text-sm">
                            <p>
                              <span className="text-muted">Mağaza:</span> {formData.name}
                            </p>
                            <p>
                              <span className="text-muted">URL:</span> {formData.url}
                            </p>
                          </div>
                          <Button
                            onPress={handleTestConnection}
                            isDisabled={isTesting}
                            isPending={isTesting}
                            variant="outline"
                            fullWidth
                          >
                            {isTesting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Test ediliyor...
                              </>
                            ) : (
                              'Bağlantıyı Test Et'
                            )}
                          </Button>
                          {testResult && (
                            <div
                              className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                                testResult.success
                                  ? 'bg-success/15 text-success'
                                  : 'bg-danger/15 text-danger'
                              }`}
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
                          <Button
                            onPress={handleConnect}
                            isDisabled={isSubmitting || !testResult?.success}
                            isPending={isSubmitting}
                            fullWidth
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Bağlanıyor...
                              </>
                            ) : (
                              'Mağazayı Bağla'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-1.5">
                          <span className="text-sm text-muted">Bağlantı Testi</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {selectedMarketplace?.helpUrl && (
                  <div className="pt-4">
                    <a
                      href={selectedMarketplace.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                    >
                      Dokümantasyon
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-warning" />
                  Mağaza Limitine Ulaştınız
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  Mevcut planınızın mağaza limitine ulaştınız. Daha fazla mağaza eklemek için
                  planınızı yükseltin.
                </p>
                <div className="flex flex-col gap-2 rounded-lg bg-surface-secondary/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Free Plan</span>
                    <span>2 mağaza</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Pro Plan</span>
                    <span>5 mağaza</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Enterprise Plan</span>
                    <span>Sınırsız</span>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close" className="flex-1">
                  Kapat
                </Button>
                <Button
                  className="flex-1"
                  onPress={() => {
                    toast.info('Fiyatlandırma sayfası yakında eklenecek');
                    setShowUpgradeDialog(false);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Planı Yükselt
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={!!settingsModalStoreId}
        onOpenChange={(open) => {
          if (!open) {
            setSettingsModalStoreId(null);
            setWcscState({
              apiKey: '',
              apiSecret: '',
              showSecret: false,
              testing: false,
              testResult: null,
              connecting: false,
              disconnecting: false,
            });
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Mağaza Ayarları
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {settingsModalStoreId &&
                  settingsState[settingsModalStoreId] &&
                  (() => {
                    const currentStore = stores.find((s) => s.id === settingsModalStoreId);
                    const isConnected = currentStore?.hasWcscPlugin;
                    return (
                      <Tabs defaultSelectedKey="general">
                        <Tabs.ListContainer>
                          <Tabs.List aria-label="Ayar sekmeleri">
                            <Tabs.Tab id="general">
                              Genel
                              <Tabs.Indicator />
                            </Tabs.Tab>
                            <Tabs.Tab id="wcsc">
                              <Plug className="h-3.5 w-3.5" />
                              Stok Sync
                              <Tabs.Indicator />
                            </Tabs.Tab>
                          </Tabs.List>
                        </Tabs.ListContainer>
                        <Tabs.Panel id="general" className="mt-4 flex flex-col gap-4">
                          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 p-3">
                            <img
                              src="https://cdn.worldvectorlogo.com/logos/woocommerce.svg"
                              alt="WooCommerce"
                              className="h-8 w-8 object-contain"
                            />
                            <div>
                              <p className="text-sm font-medium">{currentStore?.name}</p>
                              <p className="text-xs text-muted">
                                {currentStore?.url.replace(/^https?:\/\//, '')}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <TextField
                              value={settingsState[settingsModalStoreId].commissionRate}
                              onChange={(v) =>
                                handleSettingsChange(settingsModalStoreId, 'commissionRate', v)
                              }
                            >
                              <Label className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted" />
                                Komisyon Oranı
                              </Label>
                              <div className="relative">
                                <Input placeholder="0" inputMode="decimal" className="pr-8" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                                  %
                                </span>
                              </div>
                            </TextField>
                            <p className="text-xs text-muted">
                              Pazaryeri komisyon oranı (0-100 arası)
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <TextField
                              value={settingsState[settingsModalStoreId].shippingCost}
                              onChange={(v) =>
                                handleSettingsChange(settingsModalStoreId, 'shippingCost', v)
                              }
                            >
                              <Label className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted" />
                                Kargo Maliyeti
                              </Label>
                              <div className="relative">
                                <Input placeholder="0" inputMode="decimal" className="pr-8" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                                  TL
                                </span>
                              </div>
                            </TextField>
                            <p className="text-xs text-muted">
                              Sabit kargo maliyeti (sipariş başına)
                            </p>
                          </div>
                          <p className="text-center text-xs text-muted">
                            Son güncelleme:{' '}
                            {new Date(currentStore?.updatedAt || '').toLocaleString('tr-TR')}
                          </p>
                          <Button
                            fullWidth
                            onPress={() => handleSaveSettings(settingsModalStoreId)}
                            isDisabled={settingsState[settingsModalStoreId].saving}
                            isPending={settingsState[settingsModalStoreId].saving}
                          >
                            {settingsState[settingsModalStoreId].saving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Kaydediliyor...
                              </>
                            ) : (
                              'Kaydet'
                            )}
                          </Button>
                        </Tabs.Panel>
                        <Tabs.Panel id="wcsc" className="mt-4 flex flex-col gap-4">
                          {isConnected ? (
                            <>
                              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                                <div className="flex items-center gap-2 text-success">
                                  <Check className="h-5 w-5" />
                                  <span className="font-medium">WC Stock Connector Bağlı</span>
                                </div>
                                <p className="mt-1 text-sm text-success">
                                  Stok değişiklikleri otomatik olarak senkronize edilecek.
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label className="flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4 text-muted" />
                                  Webhook URL
                                </Label>
                                <div className="flex gap-2">
                                  <TextField
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/stock-sync`}
                                    isReadOnly
                                    className="flex-1"
                                  >
                                    <Input className="font-mono text-xs" />
                                  </TextField>
                                  <Button
                                    variant="outline"
                                    size="md"
                                    isIconOnly
                                    aria-label="Kopyala"
                                    onPress={() =>
                                      copyToClipboard(
                                        `${window.location.origin}/api/webhook/stock-sync`
                                      )
                                    }
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted">
                                  Bu URL&apos;i WordPress eklentisindeki Dashboard URL alanına girin.
                                </p>
                              </div>
                              {currentStore?.wcscLastSyncAt && (
                                <div className="text-sm text-muted">
                                  Son webhook:{' '}
                                  {new Date(currentStore.wcscLastSyncAt).toLocaleString('tr-TR')}
                                </div>
                              )}
                              <Button
                                variant="danger"
                                fullWidth
                                onPress={handleDisconnectWcsc}
                                isDisabled={wcscState.disconnecting}
                                isPending={wcscState.disconnecting}
                              >
                                {wcscState.disconnecting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Bağlantı kesiliyor...
                                  </>
                                ) : (
                                  'Bağlantıyı Kes'
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="rounded-lg bg-surface-secondary/50 p-4">
                                <div className="flex items-center gap-2">
                                  <Plug className="h-5 w-5 text-muted" />
                                  <span className="font-medium">WC Stock Connector</span>
                                </div>
                                <p className="mt-1 text-sm text-muted">
                                  WordPress sitenize WC Stock Connector eklentisini kurun ve
                                  aşağıdaki bilgileri girin.
                                </p>
                              </div>
                              <TextField
                                value={wcscState.apiKey}
                                onChange={(v) =>
                                  setWcscState((prev) => ({
                                    ...prev,
                                    apiKey: v,
                                    testResult: null,
                                  }))
                                }
                              >
                                <Label className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-muted" />
                                  API Key
                                </Label>
                                <Input placeholder="Eklentiden kopyalayın" />
                              </TextField>
                              <TextField
                                value={wcscState.apiSecret}
                                onChange={(v) =>
                                  setWcscState((prev) => ({
                                    ...prev,
                                    apiSecret: v,
                                    testResult: null,
                                  }))
                                }
                                type={wcscState.showSecret ? 'text' : 'password'}
                              >
                                <Label className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-muted" />
                                  API Secret
                                </Label>
                                <div className="relative">
                                  <Input placeholder="Eklentiden kopyalayın" className="pr-10" />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setWcscState((prev) => ({
                                        ...prev,
                                        showSecret: !prev.showSecret,
                                      }))
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                                  >
                                    {wcscState.showSecret ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </TextField>
                              {wcscState.testResult && (
                                <div
                                  className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                                    wcscState.testResult.success
                                      ? 'bg-success/15 text-success'
                                      : 'bg-danger/15 text-danger'
                                  }`}
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
                              <Button
                                variant="outline"
                                fullWidth
                                onPress={handleTestWcsc}
                                isDisabled={
                                  wcscState.testing || !wcscState.apiKey || !wcscState.apiSecret
                                }
                                isPending={wcscState.testing}
                              >
                                {wcscState.testing ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Test ediliyor...
                                  </>
                                ) : (
                                  'Bağlantıyı Test Et'
                                )}
                              </Button>
                              <Button
                                fullWidth
                                onPress={handleConnectWcsc}
                                isDisabled={wcscState.connecting || !wcscState.testResult?.success}
                                isPending={wcscState.connecting}
                              >
                                {wcscState.connecting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Bağlanıyor...
                                  </>
                                ) : (
                                  'Eklentiyi Bağla'
                                )}
                              </Button>
                              <p className="text-center text-xs text-muted">
                                Eklentiyi indirmek için{' '}
                                <a href="#" className="text-accent hover:underline">
                                  buraya tıklayın
                                </a>
                              </p>
                            </>
                          )}
                        </Tabs.Panel>
                      </Tabs>
                    );
                  })()}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={!!deleteConfirmStoreId}
        onOpenChange={(open) => !open && setDeleteConfirmStoreId(null)}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-danger" />
                  Mağazayı Sil
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {deleteConfirmStoreId && (
                  <p className="text-sm text-muted">
                    <span className="font-medium text-foreground">
                      {stores.find((s) => s.id === deleteConfirmStoreId)?.name}
                    </span>{' '}
                    mağazasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  slot="close"
                  className="flex-1"
                  isDisabled={isDeleting}
                >
                  İptal
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onPress={handleDeleteConfirm}
                  isDisabled={isDeleting}
                  isPending={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    'Evet, Sil'
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
