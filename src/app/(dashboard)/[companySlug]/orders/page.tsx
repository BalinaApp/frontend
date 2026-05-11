'use client';

import { useEffect, useState, useCallback } from 'react';
import { Xmark as X } from '@gravity-ui/icons';
import { ShoppingCart, Magnifier as Search } from '@gravity-ui/icons';
import {
  Chip,
  Input,
  ListBox,
  Modal,
  Select,
  TextField,
  Button } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useOrderStore, Order } from '@/stores/orderStore';
import { usePageTitle } from '@/hooks/use-page-title';

type StatusFilter = 'all' | 'completed' | 'processing' | 'cancelled' | 'refunded';

const statusLabels: Record<string, { label: string; tone: string }> = {
  completed: { label: 'Tamamlandı', tone: 'bg-success/15 text-success' },
  processing: { label: 'İşleniyor', tone: 'bg-accent/15 text-accent' },
  pending: { label: 'Beklemede', tone: 'bg-warning/15 text-warning-foreground' },
  cancelled: { label: 'İptal', tone: 'bg-danger/15 text-danger' },
  refunded: { label: 'İade', tone: 'bg-accent/15 text-accent' },
  failed: { label: 'Başarısız', tone: 'bg-default text-muted' },
  'on-hold': { label: 'Bekletiliyor', tone: 'bg-warning/15 text-warning-foreground' },
};

export default function OrdersPage() {
  usePageTitle('Siparişler');

  const { currentCompany } = useCompanyStore();
  const { stores } = useStoreStore();
  const {
    orders,
    ordersTotal,
    ordersPage,
    ordersTotalPages,
    selectedStoreId,
    isLoading,
    setSelectedStoreId,
    fetchOrders,
  } = useOrderStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const fetchOrdersList = useCallback(() => {
    if (!currentCompany?.id) return;
    fetchOrders(currentCompany.id, {
      page: 1,
      limit: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    });
  }, [currentCompany?.id, statusFilter, searchQuery, fetchOrders]);

  useEffect(() => {
    fetchOrdersList();
  }, [fetchOrdersList]);

  const handlePageChange = (page: number) => {
    if (!currentCompany?.id) return;
    fetchOrders(currentCompany.id, {
      page,
      limit: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    });
  };

  const formatCurrency = (num: number) =>
    num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const tabs = [
    { id: 'all' as const, label: 'Tümü' },
    { id: 'processing' as const, label: 'İşleniyor' },
    { id: 'completed' as const, label: 'Tamamlandı' },
    { id: 'cancelled' as const, label: 'İptal' },
    { id: 'refunded' as const, label: 'İade' },
  ];

  const renderStatusChip = (status: string) => {
    const info = statusLabels[status] || { label: status, tone: 'bg-default text-muted' };
    return (
      <Chip variant="primary" size="sm" className={info.tone}>
        {info.label}
      </Chip>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Siparişler</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select
            selectedKey={selectedStoreId || 'all'}
            onSelectionChange={(key) =>
              setSelectedStoreId(key === 'all' ? null : String(key))
            }
            aria-label="Mağaza filtresi"
            className="w-48"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="Tüm Mağazalar">
                  Tüm Mağazalar
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {stores.map((store) => (
                  <ListBox.Item key={store.id} id={store.id} textValue={store.name}>
                    {store.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-default text-foreground'
                      : 'text-muted hover:bg-default/50 hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchOrdersList();
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted" />
              <TextField value={searchQuery} onChange={setSearchQuery} className="w-72">
                <Input placeholder="Sipariş no veya müşteri ara..." className="h-9 pl-9" />
              </TextField>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Aramayı temizle"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-2 text-left text-xs font-medium text-muted">
                    Sipariş No
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted">Müşteri</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted">Durum</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted">Ürün</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted">Tutar</th>
                  <th className="px-4 py-2 pr-6 text-right text-xs font-medium text-muted">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-6 py-3"></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          </div>
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 pr-6"></td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      Sipariş bulunamadı
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer border-b border-border hover:bg-surface-secondary/30"
                      onClick={() => handleOrderClick(order)}
                    >
                      <td className="px-6 py-3">
                        <span className="font-medium">#{order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{order.customerName || 'Misafir'}</p>
                          {order.customerEmail && (
                            <p className="text-sm text-muted">{order.customerEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{renderStatusChip(order.status)}</td>
                      <td className="px-4 py-3 text-center text-muted">{order.itemsCount}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3 pr-6 text-right text-muted">
                        {formatDate(order.orderDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {ordersTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
              <span className="text-sm text-muted">Toplam {ordersTotal} sipariş</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={ordersPage === 1}
                  onPress={() => handlePageChange(ordersPage - 1)}
                >
                  Önceki
                </Button>
                <span className="text-sm text-muted">
                  {ordersPage} / {ordersTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={ordersPage === ordersTotalPages}
                  onPress={() => handlePageChange(ordersPage + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}

      <Modal isOpen={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Sipariş #{selectedOrder?.orderNumber}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                {selectedOrder && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Durum</span>
                      {renderStatusChip(selectedOrder.status)}
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                      <h4 className="text-sm font-medium">Müşteri Bilgileri</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted">Ad Soyad:</span>
                        <span>{selectedOrder.customerName || 'Misafir'}</span>
                        <span className="text-muted">E-posta:</span>
                        <span>{selectedOrder.customerEmail || '-'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                      <h4 className="text-sm font-medium">Sipariş Detayları</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted">Tarih:</span>
                        <span>{formatDate(selectedOrder.orderDate)}</span>
                        <span className="text-muted">Mağaza:</span>
                        <span>{selectedOrder.store?.name || '-'}</span>
                        <span className="text-muted">Ürün Sayısı:</span>
                        <span>{selectedOrder.itemsCount}</span>
                        <span className="text-muted">Ödeme Yöntemi:</span>
                        <span>{selectedOrder.paymentMethod || '-'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                      <h4 className="text-sm font-medium">Tutar Bilgileri</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted">Ara Toplam:</span>
                        <span>{formatCurrency(selectedOrder.subtotal)}</span>
                        <span className="text-muted">Vergi:</span>
                        <span>{formatCurrency(selectedOrder.totalTax)}</span>
                        <span className="text-muted">Kargo:</span>
                        <span>{formatCurrency(selectedOrder.shippingTotal)}</span>
                        {selectedOrder.discountTotal > 0 && (
                          <>
                            <span className="text-muted">İndirim:</span>
                            <span className="text-danger">
                              -{formatCurrency(selectedOrder.discountTotal)}
                            </span>
                          </>
                        )}
                        <span className="font-medium">Toplam:</span>
                        <span className="text-lg font-semibold">
                          {formatCurrency(selectedOrder.total)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

