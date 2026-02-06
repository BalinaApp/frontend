'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Store,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useProfitStore } from '@/stores/profitStore';
import { useRefundStore } from '@/stores/refundStore';
import { useOrderStore } from '@/stores/orderStore';
import { cn } from '@/lib/utils';

const salesChartConfig = {
  sales: {
    label: 'Satış',
    color: '#3b82f6', // Blue
  },
} satisfies ChartConfig;

const ordersChartConfig = {
  orders: {
    label: 'Sipariş',
    color: '#8b5cf6', // Purple
  },
} satisfies ChartConfig;

const revenueChartConfig = {
  revenue: {
    label: 'Net Kar',
    color: '#10b981', // Green
  },
} satisfies ChartConfig;

const stockChartConfig = {
  stock: {
    label: 'Stok',
    color: '#f59e0b', // Orange/Amber
  },
} satisfies ChartConfig;

function SetupAlert() {
  const router = useRouter();
  const params = useParams();
  const companySlug = params.companySlug as string;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-green-600 text-white">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4" />
        <span className="text-sm font-medium">
          İlk mağazanızı bağlayın
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => router.push(`/${companySlug}/stores`)}
      >
        Mağaza Bağla
      </Button>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('tr-TR');
}

function formatCurrency(num: number): string {
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';
}

export default function DashboardPage() {
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores, isLoading: isStoresLoading } = useStoreStore();
  const { summary, isLoading, fetchSummary, storeInventories, fetchByStore } = useInventoryStore();
  const {
    summary: profitSummary,
    isSummaryLoading: isProfitLoading,
    fetchSummary: fetchProfitSummary,
    trend: profitTrend,
    isTrendLoading: isProfitTrendLoading,
    fetchTrend: fetchProfitTrend,
  } = useProfitStore();
  const {
    summary: refundSummary,
    isSummaryLoading: isRefundLoading,
    fetchSummary: fetchRefundSummary,
  } = useRefundStore();
  const {
    trend: orderTrend,
    isTrendLoading: isOrderTrendLoading,
    fetchTrend: fetchOrderTrend,
  } = useOrderStore();

  // Fetch stores, inventory, profit, refund, and trends on mount
  useEffect(() => {
    if (currentCompany?.id) {
      fetchStores(currentCompany.id);
      fetchSummary(currentCompany.id);
      fetchProfitSummary(currentCompany.id);
      fetchRefundSummary(currentCompany.id);
      fetchOrderTrend(currentCompany.id);
      fetchProfitTrend(currentCompany.id);
      fetchByStore(currentCompany.id);
    }
  }, [currentCompany?.id, fetchStores, fetchSummary, fetchProfitSummary, fetchRefundSummary, fetchOrderTrend, fetchProfitTrend, fetchByStore]);

  // Format date for chart display
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${day} ${months[date.getMonth()]}`;
  };

  // Transform order trend data for sales chart (revenue)
  const salesChartData = useMemo(() => {
    if (!orderTrend || orderTrend.length === 0) {
      return [];
    }
    return orderTrend.map(item => ({
      date: formatDateLabel(item.date),
      sales: item.revenue,
    }));
  }, [orderTrend]);

  // Transform order trend data for orders chart
  const ordersChartData = useMemo(() => {
    if (!orderTrend || orderTrend.length === 0) {
      return [];
    }
    return orderTrend.map(item => ({
      date: formatDateLabel(item.date),
      orders: item.orders,
    }));
  }, [orderTrend]);

  // Transform profit trend data for revenue chart
  const revenueChartData = useMemo(() => {
    if (!profitTrend || profitTrend.length === 0) {
      return [];
    }
    return profitTrend.map(item => ({
      date: formatDateLabel(item.date),
      revenue: item.netProfit,
    }));
  }, [profitTrend]);

  // Transform store inventories for stock chart
  const stockChartData = useMemo(() => {
    if (!storeInventories || storeInventories.length === 0) {
      return [];
    }
    return storeInventories.map(store => ({
      name: store.storeName.length > 15 ? store.storeName.substring(0, 15) + '...' : store.storeName,
      stock: store.totalStock,
    }));
  }, [storeInventories]);

  // Don't show "no stores" alert while loading or before company/stores are loaded
  const hasStores = !currentCompany?.id || isStoresLoading || stores.length > 0;

  const stats = [
    {
      name: 'Net Kar (30 Gün)',
      value: profitSummary ? formatCurrency(profitSummary.netProfit) : '-',
      icon: DollarSign,
      loading: isProfitLoading,
      positive: profitSummary && profitSummary.netProfit >= 0,
      negative: profitSummary && profitSummary.netProfit < 0,
      change: profitSummary?.profitChange,
    },
    {
      name: 'Kar Marjı',
      value: profitSummary ? `%${profitSummary.profitMargin}` : '-',
      icon: TrendingUp,
      loading: isProfitLoading,
      positive: profitSummary && profitSummary.profitMargin >= 20,
      alert: profitSummary && profitSummary.profitMargin < 20 && profitSummary.profitMargin >= 0,
      negative: profitSummary && profitSummary.profitMargin < 0,
    },
    {
      name: 'İade Oranı',
      value: refundSummary ? `%${refundSummary.refundRate}` : '-',
      icon: RotateCcw,
      loading: isRefundLoading,
      positive: refundSummary && refundSummary.refundRate < 5,
      alert: refundSummary && refundSummary.refundRate >= 5 && refundSummary.refundRate < 10,
      negative: refundSummary && refundSummary.refundRate >= 10,
      change: refundSummary?.refundCountChange,
      invertChange: true, // İade için artış kötü
    },
    {
      name: 'Kritik Stok',
      value: summary ? String(summary.criticalStockCount) : '-',
      icon: AlertTriangle,
      loading: isLoading,
      alert: summary && summary.criticalStockCount > 0,
    },
  ];

  return (
    <>
      {/* Setup Alert - show only if no store connected */}
      {!hasStores && <SetupAlert />}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className={`p-4 ${index < stats.length - 1 ? 'border-r' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </span>
              <stat.icon className={cn(
                'h-5 w-5',
                stat.positive ? 'text-green-500' :
                stat.negative ? 'text-red-500' :
                stat.alert ? 'text-orange-500' : 'text-muted-foreground'
              )} />
            </div>
            <div className="flex items-baseline gap-2">
              {stat.loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <span className={cn(
                    'text-2xl font-bold',
                    stat.positive ? 'text-green-600' :
                    stat.negative ? 'text-red-600' :
                    stat.alert ? 'text-orange-500' :
                    hasStores ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {stat.value}
                  </span>
                  {stat.change !== undefined && stat.change !== 0 && (
                    <span className={cn(
                      'flex items-center text-xs font-medium',
                      (stat.invertChange ? stat.change < 0 : stat.change > 0) ? 'text-green-600' : 'text-red-600'
                    )}>
                      {stat.change > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      )}
                      {stat.change > 0 ? '+' : ''}{stat.change}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts - Single Column with Alternating Backgrounds */}
      {/* Sales Chart - White */}
      <div className="border-t">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Satış Trendi (Son 30 Gün)</h3>
        </div>
        <div className="p-4">
          {isOrderTrendLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : salesChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Henüz satış verisi yok
            </div>
          ) : (
            <ChartContainer config={salesChartConfig} className="h-48 w-full">
              <AreaChart data={salesChartData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Area
                  dataKey="sales"
                  type="natural"
                  fill="var(--color-sales)"
                  fillOpacity={0.2}
                  stroke="var(--color-sales)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Orders Chart - Gray */}
      <div className="border-t">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Sipariş Trendi (Son 30 Gün)</h3>
        </div>
        <div className="p-4 bg-muted/50">
          {isOrderTrendLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : ordersChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Henüz sipariş verisi yok
            </div>
          ) : (
            <ChartContainer config={ordersChartConfig} className="h-48 w-full">
              <AreaChart data={ordersChartData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
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
                  dataKey="orders"
                  type="natural"
                  fill="var(--color-orders)"
                  fillOpacity={0.2}
                  stroke="var(--color-orders)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Revenue/Profit Chart - White */}
      <div className="border-t">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Net Kar Trendi (Son 30 Gün)</h3>
        </div>
        <div className="p-4">
          {isProfitTrendLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : revenueChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Henüz kar verisi yok
            </div>
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-48 w-full">
              <AreaChart data={revenueChartData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Area
                  dataKey="revenue"
                  type="natural"
                  fill="var(--color-revenue)"
                  fillOpacity={0.2}
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Stock Chart - Gray */}
      <div className="border-t">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Mağaza Bazında Stok</h3>
        </div>
        <div className="p-4 bg-muted/50">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : stockChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Henüz stok verisi yok
            </div>
          ) : (
            <ChartContainer config={stockChartConfig} className="h-48 w-full">
              <BarChart data={stockChartData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="stock"
                  fill="var(--color-stock)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </>
  );
}
