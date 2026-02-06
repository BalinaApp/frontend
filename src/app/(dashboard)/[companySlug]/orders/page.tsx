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
  PieChart as PieChartIcon,
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
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from '@/components/ui/data-table';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useOrderStore, Order, DateDetailOrders } from '@/stores/orderStore';
import { cn } from '@/lib/utils';

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

const statusLabels: Record<string, { label: string; color: string }> = {
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  processing: { label: 'İşleniyor', color: 'bg-blue-100 text-blue-800' },
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'İade', color: 'bg-purple-100 text-purple-800' },
  failed: { label: 'Başarısız', color: 'bg-gray-100 text-gray-800' },
  'on-hold': { label: 'Bekletiliyor', color: 'bg-orange-100 text-orange-800' },
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_COLORS: Record<string, string> = {
  'Tamamlandı': '#10b981',
  'İşleniyor': '#3b82f6',
  'Beklemede': '#f59e0b',
  'İptal': '#ef4444',
  'İade': '#8b5cf6',
  'Başarısız': '#6b7280',
  'Bekletiliyor': '#f97316',
};

// Chart configs for consistent tooltip styling
const trendChartConfig: ChartConfig = {
  orders: { label: 'Sipariş', color: '#3b82f6' },
  revenue: { label: 'Gelir', color: '#10b981' },
};

const statusChartConfig: ChartConfig = {
  count: { label: 'Sipariş', color: '#3b82f6' },
};

const storeChartConfig: ChartConfig = {
  revenue: { label: 'Gelir', color: '#3b82f6' },
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
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDateDetailOpen, setIsDateDetailOpen] = useState(false);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.date && currentCompany?.id) {
      const clickedDate = data.activePayload[0].payload.date;
      // Don't fetch for weekly data (contains 'W')
      if (clickedDate.includes('W')) return;

      fetchOrdersByDate(currentCompany.id, clickedDate);
      setIsDateDetailOpen(true);
    }
  };

  const handleDateDetailClose = (open: boolean) => {
    setIsDateDetailOpen(open);
    if (!open) {
      clearDateDetailOrders();
    }
  };

  // Fetch analytics on mount and when filters change
  useEffect(() => {
    if (currentCompany?.id) {
      fetchAllAnalytics(currentCompany.id);
    }
  }, [currentCompany?.id, period, customDateRange, selectedStoreId, fetchAllAnalytics]);

  // Fetch orders list
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
    if (value !== 'custom') {
      setDateRange(undefined);
    }
    setPeriod(value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setCustomDateRange({ from: range.from, to: range.to });
    }
  };

  const handleStoreChange = (value: string) => {
    setSelectedStoreId(value === 'all' ? null : value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrdersList();
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('tr-TR');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChartDate = (dateString: string) => {
    if (dateString.includes('W')) {
      // Weekly format: 2024-W01
      return dateString.replace('-W', ' H');
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  };

  const renderChangeIndicator = (change: number) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={cn(
        'flex items-center text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-600'
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
        {isPositive ? '+' : ''}{change}%
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

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Siparişler</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md">
            <button
              onClick={() => setViewMode('charts')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors',
                viewMode === 'charts' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-r-md transition-colors',
                viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Package className="h-4 w-4" />
            </button>
          </div>

          {/* Period Selector */}
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Date Range Picker */}
          {period === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[260px] justify-start text-left font-normal h-9',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd MMM yyyy', { locale: tr })} -{' '}
                        {format(dateRange.to, 'dd MMM yyyy', { locale: tr })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd MMM yyyy', { locale: tr })
                    )
                  ) : (
                    <span>Tarih seçin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Store Selector */}
          <Select value={selectedStoreId || 'all'} onValueChange={handleStoreChange}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Tüm Mağazalar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mağazalar</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats with Change Indicators */}
      <div className="grid grid-cols-4 border-b">
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toplam Sipariş</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-semibold">
                {summary ? formatNumber(summary.totalOrders) : '0'}
              </p>
              {summary && renderChangeIndicator(summary.ordersChange)}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toplam Gelir</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-28 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-semibold">
                {summary ? formatCurrency(summary.totalRevenue) : '0,00 TL'}
              </p>
              {summary && renderChangeIndicator(summary.revenueChange)}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ort. Sipariş</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-semibold">
                {summary ? formatCurrency(summary.avgOrderValue) : '0,00 TL'}
              </p>
              {summary && renderChangeIndicator(summary.avgOrderValueChange)}
            </div>
          )}
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toplam Ürün</span>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold mt-1">
              {summary ? formatNumber(summary.totalItems) : '0'}
            </p>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 border-b bg-muted/30">
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-muted-foreground">Tamamlanan:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.completedOrders) : '0'}
          </span>
        </div>
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-muted-foreground">İşlenen:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.processingOrders) : '0'}
          </span>
        </div>
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-muted-foreground">İptal:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.cancelledOrders) : '0'}
          </span>
        </div>
        <div className="px-6 py-3 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-purple-600" />
          <span className="text-sm text-muted-foreground">İade:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.refundedOrders) : '0'}
          </span>
        </div>
      </div>

      {viewMode === 'charts' ? (
        /* Charts View */
        <div className="flex-1">
          {/* Trend Chart */}
          <div className="border-b">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-medium">Sipariş Trendi</h3>
            </div>
            <div className="p-6">
              {isTrendLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trend.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Bu dönem için veri bulunamadı
                </div>
              ) : (
                <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                  <LineChart
                    data={trend}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent labelFormatter={formatChartDate} />}
                    />
                    <Legend
                      formatter={(value) => (value === 'orders' ? 'Sipariş Sayısı' : 'Gelir (TL)')}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="var(--color-orders)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-2">
            {/* Store Distribution Pie Chart */}
            <div className="border-r">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-medium">Mağaza Dağılımı</h3>
              </div>
              <div className="p-6">
                {storeDistribution.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Veri bulunamadı
                  </div>
                ) : (
                  <ChartContainer config={storeChartConfig} className="h-[250px] w-full">
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
                        label={({ storeName, percentage }) => `${storeName} (${percentage}%)`}
                        labelLine={false}
                      >
                        {storeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent nameKey="storeName" />}
                      />
                    </PieChart>
                  </ChartContainer>
                )}
                {storeDistribution.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {storeDistribution.map((store, index) => (
                      <div key={store.storeId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{store.storeName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{store.count} sipariş</span>
                          <span className="font-medium text-foreground">{store.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status Distribution Bar Chart */}
            <div>
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-medium">Durum Dağılımı</h3>
              </div>
              <div className="p-6">
                {statusDistribution.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Veri bulunamadı
                  </div>
                ) : (
                  <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                    <BarChart
                      data={statusDistribution}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="status"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="count"
                        name="Sipariş"
                        radius={[0, 4, 4, 0]}
                      >
                        {statusDistribution.map((entry) => (
                          <Cell
                            key={`cell-${entry.status}`}
                            fill={STATUS_COLORS[entry.status] || '#6b7280'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Table View */
        <>
          {/* Filters Row */}
          <div className="flex items-center justify-between px-6 py-3 border-b gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    statusFilter === tab.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Sipariş no veya müşteri ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-72 h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          {/* Orders Table */}
          <div className="flex-1 overflow-auto">
            <DataTable>
              <DataTableHeader>
                <DataTableRow className="hover:bg-transparent">
                  <DataTableHead className="pl-6">Sipariş No</DataTableHead>
                  <DataTableHead>Müşteri</DataTableHead>
                  <DataTableHead className="text-center">Durum</DataTableHead>
                  <DataTableHead className="text-center">Ürün</DataTableHead>
                  <DataTableHead className="text-right">Tutar</DataTableHead>
                  <DataTableHead className="text-right pr-6">Tarih</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <DataTableRow key={i}>
                      <DataTableCell className="pl-6">
                        <Skeleton className="h-4 w-20" />
                      </DataTableCell>
                      <DataTableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-center">
                        <Skeleton className="h-6 w-20 mx-auto" />
                      </DataTableCell>
                      <DataTableCell className="text-center">
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <Skeleton className="h-4 w-24 ml-auto" />
                      </DataTableCell>
                      <DataTableCell className="text-right pr-6">
                        <Skeleton className="h-4 w-28 ml-auto" />
                      </DataTableCell>
                    </DataTableRow>
                  ))
                ) : orders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Sipariş bulunamadı
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  orders.map((order) => {
                    const statusInfo = statusLabels[order.status] || {
                      label: order.status,
                      color: 'bg-gray-100 text-gray-800',
                    };
                    return (
                      <DataTableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() => handleOrderClick(order)}
                      >
                        <DataTableCell className="pl-6">
                          <span className="font-medium">#{order.orderNumber}</span>
                        </DataTableCell>
                        <DataTableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.customerName || 'Misafir'}
                            </p>
                            {order.customerEmail && (
                              <p className="text-sm text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            )}
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-center">
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </DataTableCell>
                        <DataTableCell className="text-center text-gray-600">
                          {order.itemsCount}
                        </DataTableCell>
                        <DataTableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </DataTableCell>
                        <DataTableCell className="text-right text-muted-foreground pr-6">
                          {formatDate(order.orderDate)}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })
                )}
              </DataTableBody>
            </DataTable>
          </div>

          {/* Pagination */}
          {ordersTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t bg-white">
              <span className="text-sm text-gray-500">Toplam {ordersTotal} sipariş</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersPage === 1}
                  onClick={() => handlePageChange(ordersPage - 1)}
                >
                  Önceki
                </Button>
                <span className="text-sm text-gray-600">
                  {ordersPage} / {ordersTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersPage === ordersTotalPages}
                  onClick={() => handlePageChange(ordersPage + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Sipariş #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Durum</span>
                <Badge className={statusLabels[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'}>
                  {statusLabels[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Müşteri Bilgileri</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Ad Soyad:</span>
                  <span>{selectedOrder.customerName || 'Misafir'}</span>
                  <span className="text-muted-foreground">E-posta:</span>
                  <span>{selectedOrder.customerEmail || '-'}</span>
                </div>
              </div>

              {/* Order Details */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Sipariş Detayları</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Tarih:</span>
                  <span>{formatDate(selectedOrder.orderDate)}</span>
                  <span className="text-muted-foreground">Mağaza:</span>
                  <span>{selectedOrder.store?.name || '-'}</span>
                  <span className="text-muted-foreground">Ürün Sayısı:</span>
                  <span>{selectedOrder.itemsCount}</span>
                  <span className="text-muted-foreground">Ödeme Yöntemi:</span>
                  <span>{selectedOrder.paymentMethod || '-'}</span>
                </div>
              </div>

              {/* Financial Details */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Tutar Bilgileri</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Ara Toplam:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  <span className="text-muted-foreground">Vergi:</span>
                  <span>{formatCurrency(selectedOrder.totalTax)}</span>
                  <span className="text-muted-foreground">Kargo:</span>
                  <span>{formatCurrency(selectedOrder.shippingTotal)}</span>
                  {selectedOrder.discountTotal > 0 && (
                    <>
                      <span className="text-muted-foreground">İndirim:</span>
                      <span className="text-red-600">-{formatCurrency(selectedOrder.discountTotal)}</span>
                    </>
                  )}
                  <span className="font-medium">Toplam:</span>
                  <span className="font-semibold text-lg">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Date Detail Modal - Shows orders for clicked date on chart */}
      <Dialog open={isDateDetailOpen} onOpenChange={handleDateDetailClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {dateDetailOrders?.date && (
                <>
                  {new Date(dateDetailOrders.date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })} Siparişleri
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {isDateDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : dateDetailOrders?.orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Bu tarihte sipariş bulunamadı
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toplam Sipariş:</span>
                <span className="font-semibold">{dateDetailOrders?.total || 0}</span>
              </div>

              <div className="space-y-3">
                {dateDetailOrders?.orders.map((order) => {
                  const statusInfo = statusLabels[order.status] || {
                    label: order.status,
                    color: 'bg-gray-100 text-gray-800',
                  };
                  return (
                    <div
                      key={order.id}
                      className="border rounded-lg p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDateDetailOpen(false);
                        setIsDetailOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">#{order.orderNumber}</span>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{order.customerName || 'Misafir'}</span>
                        <span className="font-medium text-foreground">{formatCurrency(order.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>{order.itemsCount} ürün</span>
                        <span>{order.store?.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
