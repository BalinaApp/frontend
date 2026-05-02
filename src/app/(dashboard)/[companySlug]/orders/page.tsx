'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  BarChart3,
  CalendarIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Chip,
  Input,
  ListBox,
  Modal,
  Select,
  Skeleton,
  TextField,
  Button,
} from '@heroui/react';
import { DateRangeInput, type DateRange } from '@/components/date-range-input';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useOrderStore, Order } from '@/stores/orderStore';

type StatusFilter = 'all' | 'completed' | 'processing' | 'cancelled' | 'refunded';
type ViewMode = 'table' | 'charts';

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
  { value: 'custom', label: 'Özel Tarih' },
];

const statusLabels: Record<string, { label: string; tone: string }> = {
  completed: { label: 'Tamamlandı', tone: 'bg-success/15 text-success' },
  processing: { label: 'İşleniyor', tone: 'bg-accent/15 text-accent' },
  pending: { label: 'Beklemede', tone: 'bg-warning/15 text-warning-foreground' },
  cancelled: { label: 'İptal', tone: 'bg-danger/15 text-danger' },
  refunded: { label: 'İade', tone: 'bg-accent/15 text-accent' },
  failed: { label: 'Başarısız', tone: 'bg-default text-muted' },
  'on-hold': { label: 'Bekletiliyor', tone: 'bg-warning/15 text-warning-foreground' },
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_COLORS: Record<string, string> = {
  Tamamlandı: '#10b981',
  İşleniyor: '#3b82f6',
  Beklemede: '#f59e0b',
  İptal: '#ef4444',
  İade: '#8b5cf6',
  Başarısız: '#6b7280',
  Bekletiliyor: '#f97316',
};

export default function OrdersPage() {
  const { currentCompany } = useCompanyStore();
  const { stores } = useStoreStore();
  const {
    summary,
    trend,
    statusDistribution,
    storeDistribution,
    orders,
    ordersTotal,
    ordersPage,
    ordersTotalPages,
    period,
    customDateRange,
    selectedStoreId,
    isLoading,
    isSummaryLoading,
    isTrendLoading,
    isDateDetailLoading,
    dateDetailOrders,
    setPeriod,
    setCustomDateRange,
    setSelectedStoreId,
    fetchAllAnalytics,
    fetchOrders,
    fetchOrdersByDate,
    clearDateDetailOrders,
  } = useOrderStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange?.from && customDateRange?.to
      ? { from: customDateRange.from, to: customDateRange.to }
      : undefined
  );
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDateDetailOpen, setIsDateDetailOpen] = useState(false);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleChartClick = (data: { activePayload?: Array<{ payload: { date: string } }> }) => {
    if (data?.activePayload?.[0]?.payload?.date && currentCompany?.id) {
      const clickedDate = data.activePayload[0].payload.date;
      if (clickedDate.includes('W')) return;
      fetchOrdersByDate(currentCompany.id, clickedDate);
      setIsDateDetailOpen(true);
    }
  };

  const handleDateDetailClose = (open: boolean) => {
    setIsDateDetailOpen(open);
    if (!open) clearDateDetailOrders();
  };

  useEffect(() => {
    if (currentCompany?.id) fetchAllAnalytics(currentCompany.id);
  }, [currentCompany?.id, period, customDateRange, selectedStoreId, fetchAllAnalytics]);

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

  const handlePeriodChange = (value: string) => {
    if (value !== 'custom') setDateRange(undefined);
    setPeriod(value);
  };

  const handleDateRangeChange = (range: DateRange | null) => {
    setDateRange(range ?? undefined);
    if (range?.from && range?.to) {
      setCustomDateRange({ from: range.from, to: range.to });
    }
  };

  const formatCurrency = (num: number) =>
    num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  const formatNumber = (num: number) => num.toLocaleString('tr-TR');
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatChartDate = (dateString: string) => {
    if (dateString.includes('W')) return dateString.replace('-W', ' H');
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  };

  const renderChange = (change: number) => {
    if (change === 0) return null;
    const positive = change > 0;
    return (
      <span
        className={`flex items-center text-xs font-medium ${
          positive ? 'text-success' : 'text-danger'
        }`}
      >
        {positive ? (
          <TrendingUp className="mr-0.5 h-3 w-3" />
        ) : (
          <TrendingDown className="mr-0.5 h-3 w-3" />
        )}
        {positive ? '+' : ''}
        {change}%
      </span>
    );
  };

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
          <div className="flex items-center rounded-md border border-border">
            <button
              onClick={() => setViewMode('charts')}
              aria-label="Grafik görünümü"
              className={`rounded-l-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'charts'
                  ? 'bg-default text-foreground'
                  : 'text-muted hover:bg-default/50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              aria-label="Tablo görünümü"
              className={`rounded-r-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-default text-foreground'
                  : 'text-muted hover:bg-default/50'
              }`}
            >
              <Package className="h-4 w-4" />
            </button>
          </div>

          <Select
            selectedKey={period}
            onSelectionChange={(key) => handlePeriodChange(String(key))}
            aria-label="Dönem"
            className="w-36"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {periodOptions.map((opt) => (
                  <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {period === 'custom' && (
            <DateRangeInput
              value={dateRange}
              onChange={handleDateRangeChange}
              className="w-[280px]"
            />
          )}

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

      <div className="grid grid-cols-4 border-b border-border">
        <SummaryStat
          label="Toplam Sipariş"
          Icon={ShoppingCart}
          loading={isSummaryLoading}
          extra={summary && renderChange(summary.ordersChange)}
        >
          {summary ? formatNumber(summary.totalOrders) : '0'}
        </SummaryStat>
        <SummaryStat
          label="Toplam Gelir"
          Icon={DollarSign}
          loading={isSummaryLoading}
          extra={summary && renderChange(summary.revenueChange)}
        >
          {summary ? formatCurrency(summary.totalRevenue) : '0,00 TL'}
        </SummaryStat>
        <SummaryStat
          label="Ort. Sipariş"
          Icon={TrendingUp}
          loading={isSummaryLoading}
          extra={summary && renderChange(summary.avgOrderValueChange)}
        >
          {summary ? formatCurrency(summary.avgOrderValue) : '0,00 TL'}
        </SummaryStat>
        <SummaryStat label="Toplam Ürün" Icon={Package} loading={isSummaryLoading} last>
          {summary ? formatNumber(summary.totalItems) : '0'}
        </SummaryStat>
      </div>

      <div className="grid grid-cols-4 border-b border-border bg-surface-secondary/30">
        <StatusRow Icon={CheckCircle} tone="text-success" label="Tamamlanan:">
          {summary ? formatNumber(summary.completedOrders) : '0'}
        </StatusRow>
        <StatusRow Icon={Clock} tone="text-accent" label="İşlenen:">
          {summary ? formatNumber(summary.processingOrders) : '0'}
        </StatusRow>
        <StatusRow Icon={XCircle} tone="text-danger" label="İptal:">
          {summary ? formatNumber(summary.cancelledOrders) : '0'}
        </StatusRow>
        <StatusRow Icon={RotateCcw} tone="text-accent" label="İade:" last>
          {summary ? formatNumber(summary.refundedOrders) : '0'}
        </StatusRow>
      </div>

      {viewMode === 'charts' ? (
        <div className="flex-1">
          <div className="border-b border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Sipariş Trendi</h3>
            </div>
            <div className="p-6">
              {isTrendLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trend.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted">
                  Bu dönem için veri bulunamadı
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={trend}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="equidistantPreserveStart"
                      minTickGap={40}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value.toLocaleString('tr-TR')}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      cursor={false}
                      labelFormatter={(label) => formatChartDate(String(label))}
                    />
                    <Legend
                      formatter={(value) => (value === 'orders' ? 'Sipariş Sayısı' : 'Gelir (TL)')}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2">
            <div className="border-r border-border">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-medium">Mağaza Dağılımı</h3>
              </div>
              <div className="p-6">
                {storeDistribution.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-muted">
                    Veri bulunamadı
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={storeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="revenue"
                        nameKey="storeName"
                        label={({ storeName, percentage }) =>
                          `${storeName} (${percentage}%)`
                        }
                        labelLine={false}
                      >
                        {storeDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip cursor={false} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {storeDistribution.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    {storeDistribution.map((store, index) => (
                      <div
                        key={store.storeId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{store.storeName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-muted">
                          <span>{store.count} sipariş</span>
                          <span className="font-medium text-foreground">
                            {store.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-medium">Durum Dağılımı</h3>
              </div>
              <div className="p-6">
                {statusDistribution.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-muted">
                    Veri bulunamadı
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={statusDistribution}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="status"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                      <Tooltip cursor={false} />
                      <Bar dataKey="count" name="Sipariş" radius={[0, 4, 4, 0]}>
                        {statusDistribution.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] || '#6b7280'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
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
                      <td className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </td>
                      <td className="px-4 py-3"><Skeleton className="mx-auto h-6 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="mx-auto h-4 w-8" /></td>
                      <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-24" /></td>
                      <td className="px-4 py-3 pr-6"><Skeleton className="ml-auto h-4 w-28" /></td>
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
        </>
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

      <Modal isOpen={isDateDetailOpen} onOpenChange={handleDateDetailClose}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="flex max-h-[80vh] max-w-2xl flex-col">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {dateDetailOrders?.date &&
                    `${new Date(dateDetailOrders.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })} Siparişleri`}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {isDateDetailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
                  </div>
                ) : dateDetailOrders?.orders.length === 0 ? (
                  <div className="py-8 text-center text-muted">
                    Bu tarihte sipariş bulunamadı
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-secondary/50 p-3">
                      <span className="text-sm text-muted">Toplam Sipariş:</span>
                      <span className="font-semibold">{dateDetailOrders?.total || 0}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {dateDetailOrders?.orders.map((order) => (
                        <div
                          key={order.id}
                          className="cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-surface-secondary/30"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDateDetailOpen(false);
                            setIsDetailOpen(true);
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium">#{order.orderNumber}</span>
                            {renderStatusChip(order.status)}
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted">
                            <span>{order.customerName || 'Misafir'}</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted">
                            <span>{order.itemsCount} ürün</span>
                            <span>{order.store?.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function SummaryStat({
  label,
  Icon,
  loading,
  last,
  extra,
  children,
}: {
  label: string;
  Icon: React.ElementType;
  loading: boolean;
  last?: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-6 py-4 ${!last ? 'border-r border-border' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-24" />
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold">{children}</p>
          {extra}
        </div>
      )}
    </div>
  );
}

function StatusRow({
  Icon,
  tone,
  label,
  last,
  children,
}: {
  Icon: React.ElementType;
  tone: string;
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 px-6 py-3 ${!last ? 'border-r border-border' : ''}`}>
      <Icon className={`h-4 w-4 ${tone}`} />
      <span className="text-sm text-muted">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
