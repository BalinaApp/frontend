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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { useCompanyStore } from '@/stores/companyStore';
import { useProductMappingStore, type MappingSuggestion, type SearchProduct } from '@/stores/productMappingStore';
import { cn } from '@/lib/utils';

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

  const [activeTab, setActiveTab] = useState<'mappings' | 'suggestions' | 'manual'>('mappings');
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
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
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
    } else if (error) {
      toast.error(error);
    }
  };

  const handleDeleteMapping = async () => {
    if (!currentCompany?.id || !selectedMappingId) return;

    const success = await deleteMapping(currentCompany.id, selectedMappingId);
    if (success) {
      toast.success('Eşleştirme silindi');
      setIsDeleteDialogOpen(false);
      setSelectedMappingId(null);
      fetchSuggestions(currentCompany.id);
    } else if (error) {
      toast.error(error);
    }
  };

  const handleAutoMatch = async () => {
    if (!currentCompany?.id) return;

    const result = await runAutoMatch(currentCompany.id);
    if (result) {
      toast.success(`${result.created} eşleştirme oluşturuldu${result.skipped > 0 ? `, ${result.skipped} atlandı` : ''}`);
      fetchSuggestions(currentCompany.id);
    } else if (error) {
      toast.error(error);
    }
  };

  const openCreateDialog = (suggestion: MappingSuggestion) => {
    setSelectedSuggestion(suggestion);
    setNewMappingName('');
    setIsCreateDialogOpen(true);
  };

  const openDeleteDialog = (mappingId: string) => {
    setSelectedMappingId(mappingId);
    setIsDeleteDialogOpen(true);
  };

  const handleDismissSuggestion = async (suggestionKey: string) => {
    if (!currentCompany?.id) return;

    const success = await dismissSuggestion(currentCompany.id, suggestionKey);
    if (success) {
      toast.success('Öneri reddedildi');
    } else if (error) {
      toast.error(error);
    }
  };

  // Search handler with debounce
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

  // Clear search when switching tabs
  useEffect(() => {
    if (activeTab !== 'manual') {
      setSearchQuery('');
      setSelectedProducts([]);
      clearSearchResults();
    }
  }, [activeTab, clearSearchResults]);

  const toggleProductSelection = (product: SearchProduct) => {
    if (product.isAlreadyMapped) return;

    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const uniqueStoresInSelection = useMemo(() => {
    const stores = new Set(selectedProducts.map((p) => p.storeId));
    return stores.size;
  }, [selectedProducts]);

  const canOpenCreateDialog = useMemo(() => {
    return selectedProducts.length >= 2 && uniqueStoresInSelection >= 2;
  }, [selectedProducts, uniqueStoresInSelection]);

  const canCreateManualMapping = useMemo(() => {
    return selectedProducts.length >= 2 && uniqueStoresInSelection >= 2 && manualMappingSku.trim().length > 0;
  }, [selectedProducts, uniqueStoresInSelection, manualMappingSku]);

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
    } else if (error) {
      toast.error(error);
    }
  };

  const openManualCreateDialog = () => {
    // Suggest SKU from the first selected product
    if (selectedProducts.length > 0 && !manualMappingSku) {
      const firstProduct = selectedProducts[0];
      setManualMappingSku(firstProduct.sku || '');
    }
    setIsManualCreateDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Ürün Eşleştirme</h1>
        </div>
        {suggestions.length > 0 && (
          <Button
            onClick={handleAutoMatch}
            disabled={isCreating}
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Otomatik Eşleştir ({suggestions.length})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b">
        <button
          onClick={() => setActiveTab('mappings')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeTab === 'mappings'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Eşleştirmeler ({mappings.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeTab === 'suggestions'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Öneriler ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeTab === 'manual'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Manuel Eşleştirme
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
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
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz eşleştirme yok
              </h3>
              <p className="text-gray-500 mb-4">
                Farklı mağazalardaki aynı ürünleri eşleştirerek stok yönetimini kolaylaştırın.
              </p>
              {suggestions.length > 0 && (
                <Button onClick={() => setActiveTab('suggestions')} variant="outline">
                  Önerileri Görüntüle
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-green-100 flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {mapping.name || mapping.items[0]?.productName || mapping.masterSku}
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          SKU: {mapping.masterSku}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {mapping.items.map(i => i.storeName).join(', ')}
                        </span>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <Package className="h-3 w-3" />
                          {mapping.realStock} adet stok
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => openDeleteDialog(mapping.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'suggestions' ? (
          suggestions.length === 0 ? (
            <div className="text-center py-12">
              <Wand2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Öneri bulunamadı
              </h3>
              <p className="text-gray-500">
                Farklı mağazalarda aynı SKU'ya sahip ürün bulunamadı.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.suggestionKey} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSuggestionExpanded(suggestion.suggestionKey)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="p-1">
                        {expandedSuggestions.has(suggestion.suggestionKey) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            SKU: {suggestion.masterSku}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {suggestion.storeCount} mağaza
                          </span>
                          <span className="flex items-center gap-1 text-green-600 font-medium">
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
                        className="text-gray-500 hover:text-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissSuggestion(suggestion.suggestionKey);
                        }}
                        disabled={isDismissing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateDialog(suggestion);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Eşleştir
                      </Button>
                    </div>
                  </div>

                  {expandedSuggestions.has(suggestion.suggestionKey) && (
                    <div className="border-t px-4 py-3 bg-gray-50">
                      <div className="grid gap-2">
                        {suggestion.products.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 bg-white rounded border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-gray-500">
                                  {product.storeName} - SKU: {product.sku}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{product.stockQuantity} adet</p>
                              <p className="text-xs text-gray-500">
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
          /* Manual Tab Content */
          <div className="space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Ürün adı veya SKU ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-blue-900">
                      Seçilen Ürünler ({selectedProducts.length})
                    </h3>
                    <Button
                      size="sm"
                      onClick={openManualCreateDialog}
                      disabled={!canOpenCreateDialog || isCreating}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Eşleştirme Oluştur
                    </Button>
                  </div>
                  {uniqueStoresInSelection < 2 && selectedProducts.length >= 2 && (
                    <p className="text-xs text-amber-600 mb-2">
                      ⚠️ En az 2 farklı mağazadan ürün seçmelisiniz
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <Badge
                        key={product.id}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-blue-200"
                        onClick={() => toggleProductSelection(product)}
                      >
                        <span className="text-xs text-blue-600">{product.storeName}:</span>
                        {product.name.substring(0, 30)}
                        {product.name.length > 30 && '...'}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Manuel Eşleştirme
                </h3>
                <p className="text-gray-500">
                  Farklı mağazalardaki ürünleri arayıp manuel olarak eşleştirin.
                  <br />
                  En az 2 karakter girin.
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sonuç bulunamadı
                </h3>
                <p className="text-gray-500">
                  "{searchQuery}" için eşleşen ürün bulunamadı.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">
                  {searchResults.length} sonuç bulundu
                </p>
                {searchResults.map((product) => {
                  const isSelected = selectedProducts.some((p) => p.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                        product.isAlreadyMapped
                          ? 'bg-gray-100 cursor-not-allowed opacity-60'
                          : isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white hover:bg-gray-50'
                      )}
                      onClick={() => toggleProductSelection(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-8 w-8 rounded flex items-center justify-center',
                            isSelected ? 'bg-blue-500' : 'bg-gray-100'
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : (
                            <Package className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className="text-xs">
                              {product.storeName}
                            </Badge>
                            {product.sku && (
                              <span className="font-mono">SKU: {product.sku}</span>
                            )}
                            {product.isAlreadyMapped && (
                              <Badge variant="secondary" className="text-xs">
                                Zaten eşleşmiş
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{product.stockQuantity} adet</p>
                        <p className="text-xs text-gray-500">
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

      {/* Create Mapping Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eşleştirme Oluştur</DialogTitle>
            <DialogDescription>
              SKU: {selectedSuggestion?.masterSku} için eşleştirme oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Eşleştirme Adı (Opsiyonel)</Label>
            <Input
              id="name"
              value={newMappingName}
              onChange={(e) => setNewMappingName(e.target.value)}
              placeholder="Örn: Ana Ürün Grubu"
              className="mt-2"
            />
            {selectedSuggestion && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">
                  {selectedSuggestion.products.length} ürün eşleştirilecek:
                </p>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {selectedSuggestion.products.map((p) => (
                    <div key={p.id} className="text-sm flex items-center gap-2">
                      <Store className="h-3 w-3 text-gray-400" />
                      {p.storeName}: {p.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => selectedSuggestion && handleCreateFromSuggestion(selectedSuggestion)}
              disabled={isCreating}
            >
              {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eşleştirmeyi Sil</DialogTitle>
            <DialogDescription>
              Bu eşleştirmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMapping}
              disabled={isDeleting}
            >
              {isDeleting ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Mapping Dialog */}
      <Dialog open={isManualCreateDialogOpen} onOpenChange={setIsManualCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manuel Eşleştirme Oluştur</DialogTitle>
            <DialogDescription>
              Seçtiğiniz {selectedProducts.length} ürün için eşleştirme oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="manualSku">Master SKU *</Label>
              <Input
                id="manualSku"
                value={manualMappingSku}
                onChange={(e) => setManualMappingSku(e.target.value)}
                placeholder="Eşleştirme için ortak SKU"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="manualName">Eşleştirme Adı (Opsiyonel)</Label>
              <Input
                id="manualName"
                value={manualMappingName}
                onChange={(e) => setManualMappingName(e.target.value)}
                placeholder="Örn: Ana Ürün Grubu"
                className="mt-2"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Eşleştirilecek ürünler:
              </p>
              <div className="space-y-1 max-h-40 overflow-auto">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="text-sm flex items-center gap-2">
                    <Store className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600">{p.storeName}:</span>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleManualCreateMapping}
              disabled={isCreating || !canCreateManualMapping}
            >
              {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
