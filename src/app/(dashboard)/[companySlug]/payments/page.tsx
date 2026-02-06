'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  CalendarIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
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
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { cn } from '@/lib/utils';

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
  { value: 'custom', label: 'Özel Tarih' },
];

// Fixed colors for payment methods - always consistent regardless of order
const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'Kredi Kartı': '#3b82f6',      // Blue
  'Kapıda Ödeme': '#f59e0b',     // Amber
  'Banka Havalesi': '#10b981',   // Green
  'PayPal': '#6366f1',           // Indigo
  'Çek': '#8b5cf6',              // Purple
  'Diğer': '#6b7280',            // Gray
};

const getPaymentMethodColor = (method: string): string => {
  return PAYMENT_METHOD_COLORS[method] || '#6b7280';
};

const paymentMethodChartConfig: ChartConfig = {
  count: { label: 'İşlem', color: '#3b82f6' },
  revenue: { label: 'Tutar', color: '#10b981' },
};

const statusChartConfig: ChartConfig = {
  revenue: { label: 'Tutar', color: '#3b82f6' },
};

export default function PaymentsPage() {
  const { currentCompany } = useCompanyStore();
  const { stores } = useStoreStore();
  const {
    summary,
    methodDistribution,
    period,
    customDateRange,
    selectedStoreId,
    isSummaryLoading,
    setPeriod,
    setCustomDateRange,
    setSelectedStoreId,
    fetchAllPaymentAnalytics,
  } = usePaymentStore();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );

  // Fetch analytics on mount and when filters change
  useEffect(() => {
    if (currentCompany?.id) {
      fetchAllPaymentAnalytics(currentCompany.id);
    }
  }, [currentCompany?.id, period, customDateRange, selectedStoreId, fetchAllPaymentAnalytics]);

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

  const formatCurrency = (num: number) => {
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('tr-TR');
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

  // Prepare pie chart data for payment status distribution
  const statusPieData = summary ? [
    { name: 'Tamamlanan', value: summary.completedRevenue, color: '#10b981' },
    { name: 'Bekleyen', value: summary.pendingRevenue, color: '#f59e0b' },
    { name: 'Başarısız', value: summary.failedRevenue, color: '#ef4444' },
    { name: 'İade', value: summary.refundedRevenue, color: '#8b5cf6' },
  ].filter(item => item.value > 0) : [];

  // Sort method distribution by a fixed order for consistency
  const sortedMethodDistribution = [...methodDistribution].sort((a, b) => {
    const order = ['Kredi Kartı', 'Kapıda Ödeme', 'Banka Havalesi', 'PayPal', 'Çek', 'Diğer'];
    const aIndex = order.indexOf(a.method);
    const bIndex = order.indexOf(b.method);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Ödemeler</h1>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Summary Stats */}
      <div className="grid grid-cols-4 border-b">
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
                {summary ? formatCurrency(summary.completedRevenue) : '0,00 TL'}
              </p>
              {summary && renderChangeIndicator(summary.revenueChange)}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bekleyen Ödeme</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-semibold text-yellow-600">
                {summary ? formatCurrency(summary.pendingRevenue) : '0,00 TL'}
              </p>
              <span className="text-xs text-muted-foreground">
                ({summary?.pendingPayments || 0} işlem)
              </span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Başarı Oranı</span>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-green-600 mt-1">
              %{summary?.successRate || 0}
            </p>
          )}
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ort. Ödeme</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-semibold mt-1">
              {summary ? formatCurrency(summary.avgPaymentValue) : '0,00 TL'}
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
            {summary ? formatNumber(summary.completedPayments) : '0'}
          </span>
        </div>
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-muted-foreground">Bekleyen:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.pendingPayments) : '0'}
          </span>
        </div>
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-muted-foreground">Başarısız:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.failedPayments) : '0'}
          </span>
        </div>
        <div className="px-6 py-3 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-purple-600" />
          <span className="text-sm text-muted-foreground">İade:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.refundedPayments) : '0'}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 border-b">
        {/* Payment Method Distribution */}
        <div className="border-r">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Ödeme Yöntemi Dağılımı</h3>
          </div>
          <div className="p-6">
            {sortedMethodDistribution.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <>
                <ChartContainer config={paymentMethodChartConfig} className="h-[250px] w-full">
                  <BarChart
                    data={sortedMethodDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                      type="category"
                      dataKey="method"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={95}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Tutar (TL)"
                      radius={[0, 4, 4, 0]}
                    >
                      {sortedMethodDistribution.map((entry) => (
                        <Cell key={`cell-${entry.method}`} fill={getPaymentMethodColor(entry.method)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="mt-4 space-y-2">
                  {sortedMethodDistribution.map((method) => (
                    <div key={method.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getPaymentMethodColor(method.method) }}
                        />
                        <span>{method.method}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{method.count} işlem</span>
                        <span className="font-medium text-foreground">{formatCurrency(method.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div>
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Durum Dağılımı</h3>
          </div>
          <div className="p-6">
            {statusPieData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <>
                <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent nameKey="name" />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 space-y-2">
                  {statusPieData.map((status) => (
                    <div key={status.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(status.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
