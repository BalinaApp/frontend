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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Skeleton } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useProfitStore } from '@/stores/profitStore';
import { useRefundStore } from '@/stores/refundStore';
import { useOrderStore } from '@/stores/orderStore';

const CHART_COLORS = {
  sales: '#3b82f6',
  orders: '#8b5cf6',
  revenue: '#10b981',
  stock: '#f59e0b',
};

function SetupAlert() {
  const router = useRouter();
  const params = useParams();
  const companySlug = params.companySlug as string;

  return (
    <div className="flex items-center justify-between bg-success px-4 py-2 text-success-foreground">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4" />
        <span className="text-sm font-medium">İlk mağazanızı bağlayın</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onPress={() => router.push(`/${companySlug}/stores`)}
      >
        Mağaza Bağla
      </Button>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString('tr-TR');
}

function formatCurrency(num: number): string {
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-overlay p-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 text-sm" style={{ color: entry.color }}>
          <span>{entry.name}:</span>
          <span className="font-medium">
            {formatter ? formatter(entry.value) : entry.value.toLocaleString('tr-TR')}
          </span>
        </p>
      ))}
    </div>
  );
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
  }, [
    currentCompany?.id,
    fetchStores,
    fetchSummary,
    fetchProfitSummary,
    fetchRefundSummary,
    fetchOrderTrend,
    fetchProfitTrend,
    fetchByStore,
  ]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = [
      'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
      'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
    ];
    return `${day} ${months[date.getMonth()]}`;
  };

  const salesChartData = useMemo(
    () =>
      orderTrend?.map((item) => ({
        date: formatDateLabel(item.date),
        sales: item.revenue,
      })) ?? [],
    [orderTrend]
  );

  const ordersChartData = useMemo(
    () =>
      orderTrend?.map((item) => ({
        date: formatDateLabel(item.date),
        orders: item.orders,
      })) ?? [],
    [orderTrend]
  );

  const revenueChartData = useMemo(
    () =>
      profitTrend?.map((item) => ({
        date: formatDateLabel(item.date),
        revenue: item.netProfit,
      })) ?? [],
    [profitTrend]
  );

  const stockChartData = useMemo(
    () =>
      storeInventories?.map((store) => ({
        name:
          store.storeName.length > 15
            ? store.storeName.substring(0, 15) + '...'
            : store.storeName,
        stock: store.totalStock,
      })) ?? [],
    [storeInventories]
  );

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
      invertChange: true,
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
      {!hasStores && <SetupAlert />}

      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const iconTone = stat.positive
            ? 'text-success'
            : stat.negative
              ? 'text-danger'
              : stat.alert
                ? 'text-warning'
                : 'text-muted';
          const valueTone = stat.positive
            ? 'text-success'
            : stat.negative
              ? 'text-danger'
              : stat.alert
                ? 'text-warning-foreground'
                : hasStores
                  ? 'text-foreground'
                  : 'text-muted';

          return (
            <div
              key={stat.name}
              className={`p-4 ${index < stats.length - 1 ? 'border-r border-border' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted">{stat.name}</span>
                <stat.icon className={`h-5 w-5 ${iconTone}`} />
              </div>
              <div className="flex items-baseline gap-2">
                {stat.loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <span className={`text-2xl font-bold ${valueTone}`}>{stat.value}</span>
                    {stat.change !== undefined && stat.change !== 0 && (
                      <span
                        className={`flex items-center text-xs font-medium ${
                          (stat.invertChange ? stat.change < 0 : stat.change > 0)
                            ? 'text-success'
                            : 'text-danger'
                        }`}
                      >
                        {stat.change > 0 ? (
                          <TrendingUp className="mr-0.5 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-0.5 h-3 w-3" />
                        )}
                        {stat.change > 0 ? '+' : ''}
                        {stat.change}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ChartCard
        title="Satış Trendi (Son 30 Gün)"
        Icon={BarChart3}
        loading={isOrderTrendLoading}
        empty={salesChartData.length === 0}
        emptyMessage="Henüz satış verisi yok"
      >
        <AreaChart data={salesChartData} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            tickFormatter={formatNumber}
          />
          <Tooltip
            cursor={false}
            content={
              <ChartTooltip formatter={(v) => formatCurrency(v)} />
            }
          />
          <Area
            dataKey="sales"
            name="Satış"
            type="natural"
            fill={CHART_COLORS.sales}
            fillOpacity={0.2}
            stroke={CHART_COLORS.sales}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartCard>

      <ChartCard
        title="Sipariş Trendi (Son 30 Gün)"
        Icon={ShoppingCart}
        loading={isOrderTrendLoading}
        empty={ordersChartData.length === 0}
        emptyMessage="Henüz sipariş verisi yok"
        muted
      >
        <AreaChart data={ordersChartData} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <Tooltip cursor={false} content={<ChartTooltip />} />
          <Area
            dataKey="orders"
            name="Sipariş"
            type="natural"
            fill={CHART_COLORS.orders}
            fillOpacity={0.2}
            stroke={CHART_COLORS.orders}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartCard>

      <ChartCard
        title="Net Kar Trendi (Son 30 Gün)"
        Icon={TrendingUp}
        loading={isProfitTrendLoading}
        empty={revenueChartData.length === 0}
        emptyMessage="Henüz kar verisi yok"
      >
        <AreaChart data={revenueChartData} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            tickFormatter={formatNumber}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
          />
          <Area
            dataKey="revenue"
            name="Net Kar"
            type="natural"
            fill={CHART_COLORS.revenue}
            fillOpacity={0.2}
            stroke={CHART_COLORS.revenue}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartCard>

      <ChartCard
        title="Mağaza Bazında Stok"
        Icon={Package}
        loading={isLoading}
        empty={stockChartData.length === 0}
        emptyMessage="Henüz stok verisi yok"
        muted
      >
        <BarChart data={stockChartData} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            tickFormatter={formatNumber}
          />
          <Tooltip cursor={false} content={<ChartTooltip />} />
          <Bar dataKey="stock" name="Stok" fill={CHART_COLORS.stock} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
    </>
  );
}

function ChartCard({
  title,
  Icon,
  loading,
  empty,
  emptyMessage,
  muted,
  children,
}: {
  title: string;
  Icon: React.ElementType;
  loading: boolean;
  empty: boolean;
  emptyMessage: string;
  muted?: boolean;
  children: React.ReactElement;
}) {
  return (
    <div className="border-t border-border">
      <div
        className={`flex items-center gap-2 border-b border-border px-4 py-3 ${
          muted ? 'bg-surface-secondary/50' : ''
        }`}
      >
        <Icon className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className={`p-4 ${muted ? 'bg-surface-secondary/50' : ''}`}>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : empty ? (
          <div className="flex h-48 items-center justify-center text-muted">{emptyMessage}</div>
        ) : (
          <ResponsiveContainer width="100%" height={192}>
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
