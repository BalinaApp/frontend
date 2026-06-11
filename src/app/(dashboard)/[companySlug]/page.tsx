'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaceFun,
  ChartPie,
  ArrowRotateLeft,
  TriangleExclamation,
  ChartBar,
  ShoppingBasket,
  ChartDonut,
  ArrowUp,
  ArrowDown,
} from '@gravity-ui/icons';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui';
import { useCompanyStore } from '@/stores/companyStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useProfitStore } from '@/stores/profitStore';
import { useRefundStore } from '@/stores/refundStore';
import { useOrderStore } from '@/stores/orderStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';

const CHART_GRADIENTS = {
  sales: { id: 'gradient-sales', stroke: '#3B82F6' },
  orders: { id: 'gradient-orders', stroke: '#A855F7' },
  revenue: { id: 'gradient-revenue', stroke: '#22C55E' },
};

const KPI_GRADIENTS = {
  netProfit: { id: 'kpi-net-profit', stroke: '#22C55E' },
  profitMargin: { id: 'kpi-profit-margin', stroke: '#EF4444' },
  refundRate: { id: 'kpi-refund-rate', stroke: '#EF4444' },
  criticalStock: { id: 'kpi-critical-stock', stroke: '#22C55E' },
};

function formatCurrency(num: number): string {
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';
}

function ChartTooltip({
  active,
  payload,
  formatter,
  labelKey = 'date',
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    payload: Record<string, string | number>;
  }>;
  formatter?: (value: number) => string;
  labelKey?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const labelValue = payload[0]?.payload?.[labelKey];
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      {labelValue !== undefined && labelValue !== '' && (
        <p className="mb-1 text-[11px] font-medium text-muted">{labelValue}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground tabular-nums">
            {formatter ? formatter(entry.value) : entry.value.toLocaleString('tr-TR')}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TrendChipValue {
  value: number;
  /** When true, a *negative* delta is treated as good (e.g. refund rate). */
  invert?: boolean;
}

function TrendChip({ change }: { change?: TrendChipValue }) {
  if (!change || change.value === 0) {
    return (
      <div className="flex items-center gap-1 py-1">
        <span className="text-[10px] font-medium leading-[1.34] text-muted">—</span>
      </div>
    );
  }
  const positive = change.invert ? change.value < 0 : change.value > 0;
  const Arrow = change.value > 0 ? ArrowUp : ArrowDown;
  const color = positive ? 'text-green-500' : 'text-red-500';
  return (
    <div className="flex items-center gap-1 py-1">
      <Arrow className={`h-2.5 w-2.5 ${color}`} />
      <span className={`text-[10px] font-medium leading-[1.34] ${color}`}>
        {Math.abs(change.value).toFixed(1)}
      </span>
    </div>
  );
}

function KpiCard({
  Icon,
  title,
  value,
  loading,
  change,
  spark,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string;
  loading: boolean;
  change?: TrendChipValue;
  spark?: {
    data: Array<Record<string, string | number>>;
    dataKey: string;
    gradient: { id: string; stroke: string };
  };
}) {
  return (
    // Mobilde sparkline alanı (sağ yarı) gizlenir; sol içerik tüm kart
    // genişliğini alır ki başlıklar tek satıra otursun. Sparkline lg+
    // viewport'larda görünmeye devam eder.
    <div className="flex h-28 items-stretch overflow-hidden rounded-2xl bg-surface lg:h-32">
      <div className="flex flex-1 flex-col justify-between gap-3 py-4">
        <div className="flex items-center gap-2 px-4">
          <Icon className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate text-xs font-medium text-muted">{title}</span>
        </div>
        <div className="px-4">
          {loading ? null : (
            <span className="text-xl font-semibold leading-tight text-foreground">{value}</span>
          )}
        </div>
        <div className="flex items-center gap-2 px-4">
          <span className="truncate text-xs text-muted">son 30 güne göre</span>
          {!loading && <TrendChip change={change} />}
        </div>
      </div>
      <div className="hidden h-full flex-1 lg:block">
        {!loading &&
          spark &&
          spark.data.length > 0 &&
          spark.data.some((d) => Number(d[spark.dataKey] ?? 0) !== 0) && (() => {
          const values = spark.data.map((d) => Number(d[spark.dataKey] ?? 0));
          const isFlat = Math.min(...values) === Math.max(...values);
          return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.data} margin={{ top: 12, right: 0, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={spark.gradient.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={spark.gradient.stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={spark.gradient.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area
                type="monotone"
                dataKey={spark.dataKey}
                stroke={spark.gradient.stroke}
                strokeWidth={isFlat ? 1.5 : 1.75}
                strokeOpacity={isFlat ? 0.5 : 0.9}
                fill={isFlat ? 'transparent' : `url(#${spark.gradient.id})`}
                fillOpacity={1}
                baseValue="dataMin"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          );
        })()}
      </div>
    </div>
  );
}

function TrendCard({
  Icon,
  title,
  value,
  loading,
  change,
  data,
  dataKey,
  gradient,
  valueFormatter,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string;
  loading: boolean;
  change?: TrendChipValue;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  gradient: { id: string; stroke: string };
  valueFormatter?: (value: number) => string;
}) {
  const empty =
    data.length === 0 || data.every((d) => Number(d[dataKey] ?? 0) === 0);
  return (
    <div className="flex h-[372px] flex-col overflow-hidden rounded-2xl bg-surface">
      <div className="flex items-center gap-2 p-4">
        <Icon className="h-4 w-4 text-muted" />
        <span className="text-xs font-medium text-muted">{title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 p-4 pt-0">
        {loading ? null : (
          <>
            <span className="text-2xl font-bold leading-tight text-foreground">{value}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">son 30 güne göre</span>
              <TrendChip change={change} />
            </div>
          </>
        )}
      </div>
      <div className="flex-1">
        {!loading && !empty && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradient.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradient.stroke} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={gradient.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{
                  stroke: 'currentColor',
                  strokeOpacity: 0.15,
                  strokeWidth: 1,
                  strokeDasharray: '3 3',
                }}
                content={<ChartTooltip formatter={valueFormatter} />}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={gradient.stroke}
                strokeWidth={2}
                fill={`url(#${gradient.id})`}
                fillOpacity={1}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'var(--surface)',
                  fill: gradient.stroke,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle('Anasayfa');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const companySlug = currentCompany?.slug ?? '';
  const { summary, isLoading, fetchSummary } = useInventoryStore();
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
    trend: refundTrend,
    fetchTrend: fetchRefundTrend,
  } = useRefundStore();
  const {
    trend: orderTrend,
    isTrendLoading: isOrderTrendLoading,
    fetchTrend: fetchOrderTrend,
  } = useOrderStore();

  useEffect(() => {
    if (currentCompany?.id) {
      fetchSummary(currentCompany.id);
      fetchProfitSummary(currentCompany.id);
      fetchRefundSummary(currentCompany.id);
      fetchOrderTrend(currentCompany.id);
      fetchProfitTrend(currentCompany.id);
      fetchRefundTrend(currentCompany.id);
    }
  }, [
    currentCompany?.id,
    fetchSummary,
    fetchProfitSummary,
    fetchRefundSummary,
    fetchOrderTrend,
    fetchProfitTrend,
    fetchRefundTrend,
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

  const profitMarginSpark = useMemo(
    () =>
      profitTrend?.map((item) => ({
        date: formatDateLabel(item.date),
        margin: item.revenue > 0 ? (item.netProfit / item.revenue) * 100 : 0,
      })) ?? [],
    [profitTrend]
  );

  const refundSpark = useMemo(
    () =>
      refundTrend?.map((item) => ({
        date: formatDateLabel(item.date),
        count: item.count,
      })) ?? [],
    [refundTrend]
  );

  const totalSales = useMemo(
    () => salesChartData.reduce((sum, d) => sum + (d.sales as number), 0),
    [salesChartData]
  );
  const totalOrders = useMemo(
    () => ordersChartData.reduce((sum, d) => sum + (d.orders as number), 0),
    [ordersChartData]
  );
  const totalNetProfit = useMemo(
    () => revenueChartData.reduce((sum, d) => sum + (d.revenue as number), 0),
    [revenueChartData]
  );

  const kpis = [
    {
      key: 'net-profit',
      icon: FaceFun,
      title: 'Net Kar',
      value: profitSummary ? formatCurrency(profitSummary.netProfit) : '-',
      loading: isProfitLoading,
      change:
        profitSummary?.profitChange !== undefined
          ? { value: profitSummary.profitChange }
          : undefined,
      spark: {
        data: revenueChartData,
        dataKey: 'revenue',
        gradient: KPI_GRADIENTS.netProfit,
      },
    },
    {
      key: 'profit-margin',
      icon: ChartPie,
      title: 'Kar Marjı',
      value: profitSummary ? `%${profitSummary.profitMargin}` : '-',
      loading: isProfitLoading,
      change: undefined,
      spark: {
        data: profitMarginSpark,
        dataKey: 'margin',
        gradient: KPI_GRADIENTS.profitMargin,
      },
    },
    {
      key: 'refund-rate',
      icon: ArrowRotateLeft,
      title: 'İade Oranı',
      value: refundSummary ? `%${refundSummary.refundRate}` : '-',
      loading: isRefundLoading,
      change:
        refundSummary?.refundCountChange !== undefined
          ? { value: refundSummary.refundCountChange, invert: true }
          : undefined,
      spark: {
        data: refundSpark,
        dataKey: 'count',
        gradient: KPI_GRADIENTS.refundRate,
      },
    },
    {
      key: 'critical-stock',
      icon: TriangleExclamation,
      title: 'Kritik Stok',
      value: summary ? String(summary.criticalStockCount) : '-',
      loading: isLoading,
      change: undefined,
      spark: undefined,
    },
  ];

  return (
    <>
      <PageHeader
        title="Anasayfa"
        action={
          <Button
            variant="tertiary"
            size="sm"
            onPress={() => router.push(`/${companySlug}/stores`)}
            className="h-8 cursor-pointer rounded-full bg-black/[0.06] px-3 text-sm font-medium text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
          >
            Mağaza Bağla
          </Button>
        }
      />

      {/* Frame 26 — column, gap 8, p-16 (Figma 12106:3968) */}
      <div className="flex flex-col gap-2 p-4">
        {/* KPI row — Frame 1 (Figma 12106:4816), 4 cards, gap 8 */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              Icon={kpi.icon}
              title={kpi.title}
              value={kpi.value}
              loading={kpi.loading}
              change={kpi.change}
              spark={kpi.spark}
            />
          ))}
        </div>

        {/* Trend cards — Frame 2 (Figma 12106:4903), row-wrap, gap 8 */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <TrendCard
          Icon={ChartBar}
          title="Satış Trendi"
          value={formatCurrency(totalSales)}
          loading={isOrderTrendLoading}
          data={salesChartData}
          dataKey="sales"
          gradient={CHART_GRADIENTS.sales}
          valueFormatter={formatCurrency}
        />
        <TrendCard
          Icon={ShoppingBasket}
          title="Sipariş Trendi"
          value={totalOrders.toLocaleString('tr-TR')}
          loading={isOrderTrendLoading}
          data={ordersChartData}
          dataKey="orders"
          gradient={CHART_GRADIENTS.orders}
          valueFormatter={(v) => v.toLocaleString('tr-TR')}
        />
        <TrendCard
          Icon={ChartDonut}
          title="Net Kar Trendi"
          value={formatCurrency(totalNetProfit)}
          loading={isProfitTrendLoading}
          data={revenueChartData}
          dataKey="revenue"
          gradient={CHART_GRADIENTS.revenue}
          valueFormatter={formatCurrency}
        />
        </div>
      </div>
    </>
  );
}
