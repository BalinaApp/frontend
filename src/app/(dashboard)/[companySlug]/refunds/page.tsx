'use client';

import { useEffect, useState } from 'react';
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Store,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useRefundStore } from '@/stores/refundStore';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
];

const REASON_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
];

const trendChartConfig = {
  count: {
    label: 'İade Sayısı',
    color: '#ef4444',
  },
  amount: {
    label: 'İade Tutarı',
    color: '#f97316',
  },
} satisfies ChartConfig;

const storeChartConfig = {
  refundRate: {
    label: 'İade Oranı',
    color: '#ef4444',
  },
} satisfies ChartConfig;

function formatCurrency(num: number): string {
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getRefundRateColor(rate: number): string {
  if (rate >= 10) return 'text-red-600';
  if (rate >= 5) return 'text-orange-500';
  return 'text-green-600';
}

function getRefundRateBgColor(rate: number): string {
  if (rate >= 10) return 'bg-red-100';
  if (rate >= 5) return 'bg-orange-100';
  return 'bg-green-100';
}

export default function RefundsPage() {
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    summary,
    reasons,
    trend,
    storeComparison,
    refundList,
    refundListTotal,
    refundListPage,
    refundListTotalPages,
    period,
    selectedStoreId,
    isSummaryLoading,
    isReasonsLoading,
    isTrendLoading,
    isComparisonLoading,
    isListLoading,
    setPeriod,
    setSelectedStoreId,
    fetchAllRefundData,
    fetchRefundList,
  } = useRefundStore();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentCompany?.id) {
      fetchStores(currentCompany.id);
      fetchAllRefundData(currentCompany.id);
      fetchRefundList(currentCompany.id);
    }
  }, [currentCompany?.id, fetchStores, fetchAllRefundData, fetchRefundList]);

  useEffect(() => {
    if (currentCompany?.id) {
      fetchAllRefundData(currentCompany.id);
      fetchRefundList(currentCompany.id, 1);
    }
  }, [currentCompany?.id, period, selectedStoreId, fetchAllRefundData, fetchRefundList]);

  const handlePageChange = (newPage: number) => {
    if (currentCompany?.id) {
      fetchRefundList(currentCompany.id, newPage);
    }
  };

  const filteredRefunds = refundList.filter((refund) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      refund.orderNumber.toLowerCase().includes(search) ||
      (refund.reason && refund.reason.toLowerCase().includes(search)) ||
      (refund.customerName && refund.customerName.toLowerCase().includes(search)) ||
      refund.storeName.toLowerCase().includes(search)
    );
  });

  // Prepare pie chart data
  const pieData = reasons.map((reason, index) => ({
    name: reason.reason,
    value: reason.count,
    percentage: reason.percentage,
    fill: REASON_COLORS[index % REASON_COLORS.length],
  }));

  return (
    <>
      {/* Header with Filters */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">İade Analizi</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStoreId || 'all'} onValueChange={(v) => setSelectedStoreId(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[160px]">
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
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b">
        {/* Total Refunds */}
        <div className="p-4 border-r">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Toplam İade</span>
            <Package className="h-5 w-5 text-red-500" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{summary?.totalRefunds || 0}</span>
              {summary?.refundCountChange !== undefined && summary.refundCountChange !== 0 && (
                <span className={cn(
                  'flex items-center text-xs font-medium',
                  summary.refundCountChange > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {summary.refundCountChange > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {summary.refundCountChange > 0 ? '+' : ''}{summary.refundCountChange}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Total Refund Amount */}
        <div className="p-4 border-r">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">İade Tutarı</span>
            <RotateCcw className="h-5 w-5 text-red-500" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(summary?.totalRefundAmount || 0)}
              </span>
              {summary?.refundAmountChange !== undefined && summary.refundAmountChange !== 0 && (
                <span className={cn(
                  'flex items-center text-xs font-medium',
                  summary.refundAmountChange > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {summary.refundAmountChange > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {summary.refundAmountChange > 0 ? '+' : ''}{summary.refundAmountChange}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Refund Rate */}
        <div className="p-4 border-r">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">İade Oranı</span>
            <AlertTriangle className={cn(
              'h-5 w-5',
              summary ? getRefundRateColor(summary.refundRate).replace('text-', 'text-') : 'text-muted-foreground'
            )} />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'text-2xl font-bold',
                summary ? getRefundRateColor(summary.refundRate) : ''
              )}>
                %{summary?.refundRate || 0}
              </span>
              <span className="text-xs text-muted-foreground">
                ({summary?.totalRefunds || 0}/{summary?.totalOrders || 0})
              </span>
            </div>
          )}
        </div>

        {/* Avg Refund Amount */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Ort. İade Tutarı</span>
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-bold">
              {formatCurrency(summary?.avgRefundAmount || 0)}
            </span>
          )}
        </div>
      </div>

      {/* Refund Trend Chart */}
      <div className="border-b">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">İade Trendi</h3>
        </div>
        <div className="p-4">
          {isTrendLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ChartContainer config={trendChartConfig} className="h-48 w-full">
              <AreaChart data={trend} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  dataKey="count"
                  type="monotone"
                  fill="var(--color-count)"
                  fillOpacity={0.2}
                  stroke="var(--color-count)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border-b">
        {/* Refund Reasons Pie Chart */}
        <div className="border-r">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">İade Nedenleri</h3>
          </div>
          <div className="p-4 bg-muted/50">
            {isReasonsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : reasons.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ChartContainer config={{}} className="h-48 w-48">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-2">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.value} adet (%{data.percentage})
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex-1 space-y-2">
                  {reasons.slice(0, 5).map((reason, index) => (
                    <div key={reason.reason} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: REASON_COLORS[index % REASON_COLORS.length] }}
                      />
                      <span className="text-sm flex-1 truncate">{reason.reason}</span>
                      <span className="text-sm text-muted-foreground">%{reason.percentage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Store Comparison Bar Chart */}
        <div>
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
            <Store className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Mağaza Karşılaştırması</h3>
          </div>
          <div className="p-4 bg-muted/50">
            {isComparisonLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : storeComparison.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <ChartContainer config={storeChartConfig} className="h-48 w-full">
                <BarChart data={storeComparison} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `%${v}`} fontSize={12} />
                  <YAxis
                    dataKey="storeName"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={100}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-2">
                          <p className="text-sm font-medium">{data.storeName}</p>
                          <p className="text-xs">İade: {data.refundCount} / {data.totalOrders}</p>
                          <p className="text-xs">Oran: %{data.refundRate}</p>
                          <p className="text-xs">Tutar: {formatCurrency(data.refundAmount)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="refundRate" radius={4}>
                    {storeComparison.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.refundRate >= 10 ? '#ef4444' : entry.refundRate >= 5 ? '#f97316' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      </div>

      {/* Refund List Table */}
      <div>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">İade Listesi</h3>
            <span className="text-xs text-muted-foreground">({refundListTotal} kayıt)</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {isListLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'Arama sonucu bulunamadı' : 'İade kaydı bulunamadı'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Sipariş No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Tarih</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Müşteri</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Mağaza</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Neden</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Sipariş Tutarı</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">İade Tutarı</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((refund, index) => (
                    <tr key={refund.id} className={index % 2 === 0 ? '' : 'bg-muted/30'}>
                      <td className="px-4 py-2 text-sm font-medium">{refund.orderNumber}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{formatDate(refund.refundDate)}</td>
                      <td className="px-4 py-2 text-sm">{refund.customerName || '-'}</td>
                      <td className="px-4 py-2 text-sm">{refund.storeName}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-block max-w-[200px] truncate" title={refund.reason || ''}>
                          {refund.reason || 'Belirtilmemiş'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(refund.orderTotal)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-red-600">
                        -{formatCurrency(refund.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {refundListTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Sayfa {refundListPage} / {refundListTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(refundListPage - 1)}
                    disabled={refundListPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(refundListPage + 1)}
                    disabled={refundListPage >= refundListTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
