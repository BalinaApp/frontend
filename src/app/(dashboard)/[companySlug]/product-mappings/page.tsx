'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Link2,
  Plus,
  Wand2,
  Package,
  Store,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import {
  Button,
  Chip,
  Input,
  Label,
  Modal,
  Skeleton,
  TextField,
,
  toast,
} from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import {
  useProductMappingStore,
  type MappingSuggestion,
  type SearchProduct,
} from '@/stores/productMappingStore';

export default function ProductMappingsPage() {
  const { currentCompany } = useCompanyStore();
  const {
    mappings,
    suggestions,
    searchResults,
    isLoading,
    isCreating,
    isDeleting,
    isDismissing,
    isSearching,
    error,
    fetchMappings,
    fetchSuggestions,
    createMapping,
    deleteMapping,
    dismissSuggestion,
    runAutoMatch,
    searchProducts,
    clearSearchResults,
  } = useProductMappingStore();

  const [activeTab, setActiveTab] = useState<'mappings' | 'suggestions' | 'manual'>(
    'mappings'
  );
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManualCreateDialogOpen, setIsManualCreateDialogOpen] = useState(false);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MappingSuggestion | null>(null);
  const [newMappingName, setNewMappingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<SearchProduct[]>([]);
  const [manualMappingSku, setManualMappingSku] = useState('');
  const [manualMappingName, setManualMappingName] = useState('');

  useEffect(() => {
    if (currentCompany?.id) {
      fetchMappings(currentCompany.id);
      fetchSuggestions(currentCompany.id);
    }
  }, [currentCompany?.id, fetchMappings, fetchSuggestions]);

  const toggleSuggestionExpanded = (sku: string) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const handleCreateFromSuggestion = async (suggestion: MappingSuggestion) => {
    if (!currentCompany?.id) return;
    const result = await createMapping(currentCompany.id, {
      masterSku: suggestion.masterSku,
      name: newMappingName || undefined,
      productIds: suggestion.products.map((p) => p.id),
    });
    if (result) {
      toast.success('Eşleştirme başarıyla oluşturuldu');
      setIsCreateDialogOpen(false);
      setSelectedSuggestion(null);
      setNewMappingName('');
      fetchSuggestions(currentCompany.id);
    } else if (error) toast.danger(error);
  };

  const handleDeleteMapping = async () => {
    if (!currentCompany?.id || !selectedMappingId) return;
    const success = await deleteMapping(currentCompany.id, selectedMappingId);
    if (success) {
      toast.success('Eşleştirme silindi');
      setIsDeleteDialogOpen(false);
      setSelectedMappingId(null);
      fetchSuggestions(currentCompany.id);
    } else if (error) toast.danger(error);
  };

  const handleAutoMatch = async () => {
    if (!currentCompany?.id) return;
    const result = await runAutoMatch(currentCompany.id);
    if (result) {
      toast.success(
        `${result.created} eşleştirme oluşturuldu${result.skipped > 0 ? `, ${result.skipped} atlandı` : ''}`
      );
      fetchSuggestions(currentCompany.id);
    } else if (error) toast.danger(error);
  };

  const handleDismissSuggestion = async (suggestionKey: string) => {
    if (!currentCompany?.id) return;
    const success = await dismissSuggestion(currentCompany.id, suggestionKey);
    if (success) toast.success('Öneri reddedildi');
    else if (error) toast.danger(error);
  };

  useEffect(() => {
    if (!currentCompany?.id || activeTab !== 'manual') return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchProducts(currentCompany.id, searchQuery);
      } else {
        clearSearchResults();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentCompany?.id, activeTab, searchProducts, clearSearchResults]);

  useEffect(() => {
    if (activeTab !== 'manual') {
      setSearchQuery('');
      setSelectedProducts([]);
      clearSearchResults();
    }
  }, [activeTab, clearSearchResults]);

  const toggleProductSelection = (product: SearchProduct) => {
    if (product.isAlreadyMapped) return;
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  const uniqueStoresInSelection = useMemo(
    () => new Set(selectedProducts.map((p) => p.storeId)).size,
    [selectedProducts]
  );

  const canOpenCreateDialog =
    selectedProducts.length >= 2 && uniqueStoresInSelection >= 2;
  const canCreateManualMapping = canOpenCreateDialog && manualMappingSku.trim().length > 0;

  const handleManualCreateMapping = async () => {
    if (!currentCompany?.id || !canCreateManualMapping) return;
    const result = await createMapping(currentCompany.id, {
      masterSku: manualMappingSku.trim(),
      name: manualMappingName.trim() || undefined,
      productIds: selectedProducts.map((p) => p.id),
    });
    if (result) {
      toast.success('Eşleştirme başarıyla oluşturuldu');
      setIsManualCreateDialogOpen(false);
      setManualMappingSku('');
      setManualMappingName('');
      setSelectedProducts([]);
      setSearchQuery('');
      clearSearchResults();
      fetchSuggestions(currentCompany.id);
      setActiveTab('mappings');
    } else if (error) toast.danger(error);
  };

  const openManualCreateDialog = () => {
    if (selectedProducts.length > 0 && !manualMappingSku) {
      setManualMappingSku(selectedProducts[0].sku || '');
    }
    setIsManualCreateDialogOpen(true);
  };

  const tabs = [
    { id: 'mappings' as const, label: `Eşleştirmeler (${mappings.length})` },
    { id: 'suggestions' as const, label: `Öneriler (${suggestions.length})` },
    { id: 'manual' as const, label: 'Manuel Eşleştirme' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Ürün Eşleştirme</h1>
        </div>
        {suggestions.length > 0 && (
          <Button onPress={handleAutoMatch} isDisabled={isCreating}>
            <Wand2 className="h-4 w-4" />
            Otomatik Eşleştir ({suggestions.length})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border px-6 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-default text-foreground'
                : 'text-muted hover:bg-default/50 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="mt-2 flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'mappings' ? (
          mappings.length === 0 ? (
            <div className="py-12 text-center">
              <Link2 className="mx-auto mb-4 h-12 w-12 text-muted/50" />
              <h3 className="mb-2 text-lg font-medium">Henüz eşleştirme yok</h3>
              <p className="mb-4 text-muted">
                Farklı mağazalardaki aynı ürünleri eşleştirerek stok yönetimini kolaylaştırın.
              </p>
              {suggestions.length > 0 && (
                <Button onPress={() => setActiveTab('suggestions')} variant="outline">
                  Önerileri Görüntüle
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-success/15">
                      <Link2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {mapping.name || mapping.items[0]?.productName || mapping.masterSku}
                        </span>
                        <Chip variant="secondary" size="sm" className="font-mono">
                          SKU: {mapping.masterSku}
                        </Chip>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                        <span className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {mapping.items.map((i) => i.storeName).join(', ')}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-success">
                          <Package className="h-3 w-3" />
                          {mapping.realStock} adet stok
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label="Sil"
                    onPress={() => {
                      setSelectedMappingId(mapping.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'suggestions' ? (
          suggestions.length === 0 ? (
            <div className="py-12 text-center">
              <Wand2 className="mx-auto mb-4 h-12 w-12 text-muted/50" />
              <h3 className="mb-2 text-lg font-medium">Öneri bulunamadı</h3>
              <p className="text-muted">Farklı mağazalarda aynı SKU&apos;ya sahip ürün bulunamadı.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.suggestionKey} className="rounded-lg border border-border">
                  <div
                    className="flex cursor-pointer items-center justify-between p-4 hover:bg-surface-secondary/30"
                    onClick={() => toggleSuggestionExpanded(suggestion.suggestionKey)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="p-1" type="button" aria-label="Genişlet">
                        {expandedSuggestions.has(suggestion.suggestionKey) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <Chip variant="tertiary" size="sm" className="font-mono">
                          SKU: {suggestion.masterSku}
                        </Chip>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {suggestion.storeCount} mağaza
                          </span>
                          <span className="flex items-center gap-1 font-medium text-success">
                            <Package className="h-3 w-3" />
                            {suggestion.realStock} adet stok
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        aria-label="Reddet"
                        onPress={() => handleDismissSuggestion(suggestion.suggestionKey)}
                        isDisabled={isDismissing}
                      >
                        <X className="h-4 w-4 text-muted" />
                      </Button>
                      <Button
                        size="sm"
                        onPress={() => {
                          setSelectedSuggestion(suggestion);
                          setNewMappingName('');
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Eşleştir
                      </Button>
                    </div>
                  </div>

                  {expandedSuggestions.has(suggestion.suggestionKey) && (
                    <div className="border-t border-border bg-surface-secondary/30 px-4 py-3">
                      <div className="grid gap-2">
                        {suggestion.products.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between rounded border border-border bg-surface p-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-default">
                                <Package className="h-4 w-4 text-muted" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-muted">
                                  {product.storeName} - SKU: {product.sku}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{product.stockQuantity} adet</p>
                              <p className="text-xs text-muted">
                                {product.price.toLocaleString('tr-TR')} TL
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted" />
                <TextField value={searchQuery} onChange={setSearchQuery}>
                  <Input
                    placeholder="Ürün adı veya SKU ile ara..."
                    className="pl-10"
                  />
                </TextField>
              </div>

              {selectedProducts.length > 0 && (
                <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      Seçilen Ürünler ({selectedProducts.length})
                    </h3>
                    <Button
                      size="sm"
                      onPress={openManualCreateDialog}
                      isDisabled={!canOpenCreateDialog || isCreating}
                    >
                      <Plus className="h-4 w-4" />
                      Eşleştirme Oluştur
                    </Button>
                  </div>
                  {uniqueStoresInSelection < 2 && selectedProducts.length >= 2 && (
                    <p className="mb-2 text-xs text-warning-foreground">
                      ⚠️ En az 2 farklı mağazadan ürün seçmelisiniz
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <Chip
                        key={product.id}
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleProductSelection(product)}
                        className="cursor-pointer"
                      >
                        <span className="text-xs text-accent">{product.storeName}:</span>
                        {product.name.substring(0, 30)}
                        {product.name.length > 30 && '...'}
                        <X className="ml-1 h-3 w-3" />
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted" />
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted/50" />
                <h3 className="mb-2 text-lg font-medium">Manuel Eşleştirme</h3>
                <p className="text-muted">
                  Farklı mağazalardaki ürünleri arayıp manuel olarak eşleştirin.
                  <br />
                  En az 2 karakter girin.
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted/50" />
                <h3 className="mb-2 text-lg font-medium">Sonuç bulunamadı</h3>
                <p className="text-muted">&quot;{searchQuery}&quot; için eşleşen ürün bulunamadı.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="mb-3 text-sm text-muted">{searchResults.length} sonuç bulundu</p>
                {searchResults.map((product) => {
                  const isSelected = selectedProducts.some((p) => p.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                        product.isAlreadyMapped
                          ? 'cursor-not-allowed border-border bg-default opacity-60'
                          : isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-surface hover:bg-surface-secondary/30'
                      }`}
                      onClick={() => toggleProductSelection(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded ${
                            isSelected ? 'bg-accent' : 'bg-default'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4 text-accent-foreground" />
                          ) : (
                            <Package className="h-4 w-4 text-muted" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Chip variant="tertiary" size="sm">
                              {product.storeName}
                            </Chip>
                            {product.sku && (
                              <span className="font-mono">SKU: {product.sku}</span>
                            )}
                            {product.isAlreadyMapped && (
                              <Chip variant="secondary" size="sm">
                                Zaten eşleşmiş
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{product.stockQuantity} adet</p>
                        <p className="text-xs text-muted">
                          {product.price.toLocaleString('tr-TR')} TL
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[480px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Eşleştirme Oluştur</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  SKU: {selectedSuggestion?.masterSku} için eşleştirme oluşturun.
                </p>
                <TextField value={newMappingName} onChange={setNewMappingName}>
                  <Label>Eşleştirme Adı (Opsiyonel)</Label>
                  <Input placeholder="Örn: Ana Ürün Grubu" />
                </TextField>
                {selectedSuggestion && (
                  <div>
                    <p className="mb-2 text-sm text-muted">
                      {selectedSuggestion.products.length} ürün eşleştirilecek:
                    </p>
                    <div className="flex max-h-40 flex-col gap-1 overflow-auto">
                      {selectedSuggestion.products.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <Store className="h-3 w-3 text-muted" />
                          {p.storeName}: {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">
                  İptal
                </Button>
                <Button
                  onPress={() =>
                    selectedSuggestion && handleCreateFromSuggestion(selectedSuggestion)
                  }
                  isDisabled={isCreating}
                  isPending={isCreating}
                >
                  {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Eşleştirmeyi Sil</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Bu eşleştirmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">
                  İptal
                </Button>
                <Button
                  variant="danger"
                  onPress={handleDeleteMapping}
                  isDisabled={isDeleting}
                  isPending={isDeleting}
                >
                  {isDeleting ? 'Siliniyor...' : 'Sil'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={isManualCreateDialogOpen} onOpenChange={setIsManualCreateDialogOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[480px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Manuel Eşleştirme Oluştur</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  Seçtiğiniz {selectedProducts.length} ürün için eşleştirme oluşturun.
                </p>
                <TextField value={manualMappingSku} onChange={setManualMappingSku}>
                  <Label>Master SKU *</Label>
                  <Input placeholder="Eşleştirme için ortak SKU" />
                </TextField>
                <TextField value={manualMappingName} onChange={setManualMappingName}>
                  <Label>Eşleştirme Adı (Opsiyonel)</Label>
                  <Input placeholder="Örn: Ana Ürün Grubu" />
                </TextField>
                <div>
                  <p className="mb-2 text-sm text-muted">Eşleştirilecek ürünler:</p>
                  <div className="flex max-h-40 flex-col gap-1 overflow-auto">
                    {selectedProducts.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <Store className="h-3 w-3 text-muted" />
                        <span className="text-muted">{p.storeName}:</span>
                        {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">
                  İptal
                </Button>
                <Button
                  onPress={handleManualCreateMapping}
                  isDisabled={isCreating || !canCreateManualMapping}
                  isPending={isCreating}
                >
                  {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
