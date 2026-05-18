'use client';

import { useEffect, useMemo, useState } from 'react';
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
  CircleDollar,
  ChartColumn,
  Box as PackageIcon,
  Clock,
  CircleCheck,
  CircleXmark,
  CreditCard,
} from '@gravity-ui/icons';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ListBox, Select, Tooltip as UITooltip } from '@heroui/react';
import { Globe } from '@gravity-ui/icons';
import { DateRangeInput, type DateRange } from '@/components/date-range-input';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useOrderStore } from '@/stores/orderStore';
import { useProfitStore } from '@/stores/profitStore';
import { useRefundStore } from '@/stores/refundStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';

// ---------- styling tokens (anasayfa ile aynı) ----------

const KPI_GRADIENTS = {
  orders: { id: 'rep-kpi-orders', stroke: '#A855F7' },
  revenue: { id: 'rep-kpi-revenue', stroke: '#3B82F6' },
  avgOrder: { id: 'rep-kpi-avg-order', stroke: '#F59E0B' },
  completed: { id: 'rep-kpi-completed', stroke: '#10B981' },
  netProfit: { id: 'rep-kpi-net-profit', stroke: '#22C55E' },
  profitMargin: { id: 'rep-kpi-profit-margin', stroke: '#EF4444' },
  refundRate: { id: 'rep-kpi-refund-rate', stroke: '#EF4444' },
  pending: { id: 'rep-kpi-pending', stroke: '#06B6D4' },
};

const TREND_GRADIENTS = {
  sales: { id: 'rep-trend-sales', stroke: '#3B82F6' },
  orders: { id: 'rep-trend-orders', stroke: '#A855F7' },
  revenue: { id: 'rep-trend-revenue', stroke: '#22C55E' },
  refund: { id: 'rep-trend-refund', stroke: '#EF4444' },
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const STATUS_COLORS: Record<string, string> = {
  Tamamlandı: '#10b981',
  İşleniyor: '#3b82f6',
  Beklemede: '#f59e0b',
  İptal: '#ef4444',
  İade: '#8b5cf6',
  Başarısız: '#6b7280',
  Bekletiliyor: '#f97316',
};

// ---------- formatters ----------

function formatCurrency(num: number): string {
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';
}

function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR');
}

// Y-axis için kısa sayı (1.2K / 3.4M); detayda tooltip tam değeri gösterir.
function compactNumber(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}K`;
  return num.toLocaleString('tr-TR');
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${day} ${months[date.getMonth()]}`;
}

// ---------- shared primitives (anasayfa ile birebir) ----------

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
    <div className="min-w-[120px] rounded-xl border border-border bg-surface px-3 py-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.16),0_2px_6px_-2px_rgba(0,0,0,0.08)] backdrop-blur-md">
      {labelValue !== undefined && labelValue !== '' && (
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {labelValue}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="font-semibold text-foreground tabular-nums">
              {formatter ? formatter(entry.value) : entry.value.toLocaleString('tr-TR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TrendChipValue {
  value: number;
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

// ---------- card variants (kutu yapıları aynı, içerik farklı diyagram) ----------

function KpiCard({
  Icon,
  title,
  value,
  loading,
  change,
  spark,
  compareLabel,
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
  compareLabel: string;
}) {
  return (
    // Mobilde sparkline alanı (sağ yarı) gizlenir; sol içerik tüm kart
    // genişliğini alır ki "Toplam Sipariş" gibi başlıklar tek satıra otursun.
    // Sparkline lg+ viewport'larda görünmeye devam eder.
    <div className="flex h-28 items-stretch overflow-hidden rounded-2xl bg-surface ring-1 ring-foreground/[0.04] lg:h-32">
      <div className="flex flex-1 flex-col justify-between gap-3 py-4">
        <div className="flex items-center gap-2 px-4">
          <Icon className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate text-xs font-medium text-muted">{title}</span>
        </div>
        <div className="px-4">
          {loading ? null : (
            <span className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
              {value}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 px-4">
          <span className="truncate text-[11px] text-muted">{compareLabel}</span>
          {!loading && <TrendChip change={change} />}
        </div>
      </div>
      <div className="hidden h-full flex-1 lg:block">
        {!loading && (!spark || spark.data.length === 0 || spark.data.every((d) => Number(d[spark.dataKey] ?? 0) === 0)) && (
          <FlatLine />
        )}
        {!loading &&
          spark &&
          spark.data.length > 0 &&
          spark.data.some((d) => Number(d[spark.dataKey] ?? 0) !== 0) &&
          (() => {
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

function CardHeader({
  Icon,
  title,
  value,
  change,
  loading,
  compareLabel,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value?: string;
  change?: TrendChipValue;
  loading?: boolean;
  compareLabel?: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        <Icon className="h-4 w-4 text-muted" />
        <span className="text-[13px] font-medium text-foreground">{title}</span>
      </div>
      {!loading && (value || change) && (
        <div className="flex flex-wrap items-baseline gap-3 px-4 pb-3">
          {value && (
            <span className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {value}
            </span>
          )}
          {change && compareLabel && (
            <div className="flex items-center gap-1.5">
              <TrendChip change={change} />
              <span className="text-[11px] text-muted">{compareLabel}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Boş veride çizilen düz gri çizgi — anasayfa stiliyle birebir kutu içinde
 * grafik yerine yatay bir ayraç gibi davranır. */
function FlatLine() {
  return (
    <div className="flex h-full items-center px-4">
      <div className="h-[2px] w-full rounded-full bg-default/40" />
    </div>
  );
}


function TrendAreaCard({
  Icon,
  title,
  value,
  loading,
  change,
  data,
  dataKey,
  gradient,
  valueFormatter,
  compareLabel,
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
  compareLabel?: string;
}) {
  const empty = data.length === 0 || data.every((d) => Number(d[dataKey] ?? 0) === 0);
  // Çok yoğun bir aralık varsa (örn. 60+ gün) tüm tarih etiketleri sığmaz —
  // dataset uzunluğuna göre interval ayarlıyoruz ki XAxis okunaklı kalsın.
  const tickInterval = data.length > 45 ? Math.ceil(data.length / 6) - 1 : data.length > 14 ? Math.ceil(data.length / 8) - 1 : 0;
  return (
    <div className="flex h-[372px] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-foreground/[0.04]">
      <CardHeader Icon={Icon} title={title} value={value} change={change} loading={loading} compareLabel={compareLabel} />
      <div className="flex-1 pl-1 pr-2 pb-2">
        {loading ? null : empty ? (
          <FlatLine />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradient.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradient.stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={gradient.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.07}
                strokeDasharray="3 3"
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={48}
                tickFormatter={(v: number) =>
                  valueFormatter ? compactNumber(v) : v.toLocaleString('tr-TR')
                }
              />
              <Tooltip
                cursor={{
                  stroke: 'currentColor',
                  strokeOpacity: 0.18,
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

function TrendBarCard({
  Icon,
  title,
  value,
  loading,
  change,
  data,
  dataKey,
  color,
  valueFormatter,
  compareLabel,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string;
  loading: boolean;
  change?: TrendChipValue;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
  valueFormatter?: (value: number) => string;
  compareLabel?: string;
}) {
  const empty = data.length === 0 || data.every((d) => Number(d[dataKey] ?? 0) === 0);
  const tickInterval = data.length > 45 ? Math.ceil(data.length / 6) - 1 : data.length > 14 ? Math.ceil(data.length / 8) - 1 : 0;
  return (
    <div className="flex h-[372px] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-foreground/[0.04]">
      <CardHeader Icon={Icon} title={title} value={value} change={change} loading={loading} compareLabel={compareLabel} />
      <div className="flex-1 pl-1 pr-2 pb-2">
        {loading ? null : empty ? (
          <FlatLine />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.07}
                strokeDasharray="3 3"
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={40}
                domain={[0, 'dataMax']}
                tickFormatter={(v: number) => compactNumber(v)}
              />
              <Tooltip
                cursor={{ fill: 'currentColor', fillOpacity: 0.04 }}
                content={<ChartTooltip formatter={valueFormatter} />}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function DonutCard({
  Icon,
  title,
  loading,
  data,
  valueFormatter,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  loading: boolean;
  data: Array<{ name: string; value: number; color?: string; sub?: string }>;
  valueFormatter?: (value: number) => string;
}) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const empty = data.length === 0 || total === 0;
  // Donut merkezindeki toplam etiketi (Mailchimp / Stripe stilinde).
  const centerLabel = valueFormatter ? valueFormatter(total) : compactNumber(total);
  return (
    <div className="flex h-[372px] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-foreground/[0.04]">
      <CardHeader Icon={Icon} title={title} loading={loading} />
      <div className="flex flex-1 items-center gap-4 px-4 pb-4">
        {loading ? null : empty ? (
          <div className="flex-1">
            <FlatLine />
          </div>
        ) : (
          <>
            <div className="relative h-full w-[52%] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="var(--surface)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                    <Label
                      position="center"
                      content={({ viewBox }) => {
                        const vb = viewBox as { cx?: number; cy?: number } | undefined;
                        if (!vb || vb.cx == null || vb.cy == null) return null;
                        return (
                          <g>
                            <text
                              x={vb.cx}
                              y={vb.cy - 6}
                              textAnchor="middle"
                              className="fill-foreground"
                              style={{ fontSize: 14, fontWeight: 600 }}
                            >
                              {centerLabel}
                            </text>
                            <text
                              x={vb.cx}
                              y={vb.cy + 10}
                              textAnchor="middle"
                              className="fill-muted"
                              style={{ fontSize: 10, opacity: 0.75 }}
                            >
                              toplam
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    cursor={false}
                    content={
                      <ChartTooltip
                        formatter={valueFormatter}
                        labelKey="name"
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex max-h-full w-[48%] flex-col gap-1.5 overflow-auto text-xs">
              {data.map((entry, i) => {
                const pct = total > 0 ? Math.round((entry.value / total) * 1000) / 10 : 0;
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/[0.04]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: entry.color ?? PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-foreground">{entry.name}</p>
                      {entry.sub && <p className="text-[10px] text-muted">{entry.sub}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted">
                      %{pct}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function HorizontalBarCard({
  Icon,
  title,
  loading,
  data,
  valueKey,
  labelKey,
  colorOf,
  valueFormatter,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  loading: boolean;
  data: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
  colorOf?: (entry: Record<string, string | number>) => string;
  valueFormatter?: (value: number) => string;
}) {
  const empty =
    data.length === 0 || data.every((d) => Number(d[valueKey] ?? 0) === 0);
  return (
    <div className="flex h-[372px] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-foreground/[0.04]">
      <CardHeader Icon={Icon} title={title} loading={loading} />
      <div className="flex-1 px-4 pb-4">
        {loading ? null : empty ? (
          <FlatLine />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
              barCategoryGap={6}
            >
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.06}
                strokeDasharray="3 3"
                horizontal={false}
                vertical
              />
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: 'currentColor', fillOpacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(v: number) => compactNumber(v)}
              />
              <YAxis
                type="category"
                dataKey={labelKey}
                tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.75 }}
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={(v: string) => (v && v.length > 16 ? v.slice(0, 16) + '…' : v)}
              />
              <Tooltip
                cursor={{ fill: 'currentColor', fillOpacity: 0.04 }}
                content={<ChartTooltip formatter={valueFormatter} labelKey={labelKey} />}
              />
              <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} maxBarSize={20}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={colorOf ? colorOf(entry) : PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ---------- store filter strip ----------
// Figma node 12234:7412 — stacked avatar chip. 24px circles, -10px overlap,
// 2px box-shadow ring in surface color for the carved-out separator effect.

type StripStore = {
  id: string;
  name: string;
  url?: string | null;
  shopDomain?: string | null;
  platform?: string | null;
};

function storeInitials(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Pure pazaryeri entegrasyonları — kendi site'leri yok, marka logosu gösterilir. */
const MARKETPLACE_LOGOS: Record<string, string> = {
  TRENDYOL: '/logos/trendyol.svg',
  HEPSIBURADA: '/logos/hepsiburada.svg',
  AMAZON: '/logos/amazon.svg',
  N11: '/logos/n11.svg',
  CICEKSEPETI: '/logos/ciceksepeti.png',
};

function storeFaviconUrl(store: StripStore): string | null {
  const candidate = store.shopDomain || store.url || '';
  if (!candidate) return null;
  let host: string;
  try {
    host = candidate.startsWith('http')
      ? new URL(candidate).hostname
      : candidate.replace(/^\/+/, '');
  } catch {
    host = candidate;
  }
  if (!host || host === 'example.com') return null;
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
}

/**
 * Mağaza için avatar kaynağı türetir:
 * 1. Pazaryeri (Trendyol vb.) → /logos/*.svg
 * 2. Site bazlı (WooCommerce/Shopify) → site favicon
 * 3. Hiçbiri yoksa null → initial fallback render edilir
 */
function storeAvatarSrc(store: StripStore): string | null {
  const platform = store.platform?.toUpperCase() ?? '';
  if (MARKETPLACE_LOGOS[platform]) return MARKETPLACE_LOGOS[platform];
  return storeFaviconUrl(store);
}

/**
 * Tek bir 24px daire — favicon, ikon veya initial'ları render eder.
 * Figma'daki `effect_EP0C4Y`: box-shadow 0 0 0 2px surface, dairenin etrafında
 * tabaka rengi halo'su oluşturup overlap eden komşusundan ayırır.
 */
function AvatarCircle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-[9px] font-semibold text-foreground ${className}`}
      style={{ boxShadow: '0 0 0 2px var(--surface)' }}
    >
      {children}
    </span>
  );
}

function StoreAvatar({ store }: { store: StripStore }) {
  const src = storeAvatarSrc(store);
  if (src) {
    return (
      <AvatarCircle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          className="h-full w-full object-contain p-0.5"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </AvatarCircle>
    );
  }
  return <AvatarCircle>{storeInitials(store.name)}</AvatarCircle>;
}

/**
 * Üst üste binen daire stack'i. -10px margin sol sıradan sonra; ilk circle
 * en üstte (yüksek z-index), her sonraki bir alt katmana iner ki halo doğru
 * sıralamayla render olsun.
 */
function AvatarStack({ children }: { children: React.ReactNode[] }) {
  return (
    <span className="relative inline-flex items-center">
      {children.map((node, i) => (
        <span
          key={i}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: children.length - i }}
        >
          {node}
        </span>
      ))}
    </span>
  );
}

/**
 * Tıklanabilir chip. Aktif state ring-2 ring-accent ile pill'i sarar (içeride
 * box-shadow halo'larıyla çakışmaması için 2px iç padding).
 */
function FilterChip({
  active,
  onSelect,
  tooltip,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <UITooltip delay={0}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={tooltip}
        aria-pressed={active}
        className={[
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-shadow',
          active ? 'ring-2 ring-accent' : 'hover:opacity-90',
        ].join(' ')}
      >
        {children}
      </button>
      <UITooltip.Content>{tooltip}</UITooltip.Content>
    </UITooltip>
  );
}

/**
 * Mağaza filtre şeridi.
 * - "Tümü" chip: globe + ilk 2 mağazanın favicon'u stack halinde
 * - Her mağaza için tek 24px avatar chip
 */
function StoreFilterChips({
  stores,
  selectedId,
  onSelect,
}: {
  stores: StripStore[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const previewStores = stores.slice(0, 2);
  return (
    <div className="flex max-w-[420px] items-center gap-1.5 overflow-x-auto">
      <FilterChip
        active={selectedId === null}
        onSelect={() => onSelect(null)}
        tooltip={`Tüm mağazalar (${stores.length})`}
      >
        <AvatarStack>
          {[
            <AvatarCircle key="globe">
              <Globe className="h-3.5 w-3.5" style={{ color: '#3B82F6' }} />
            </AvatarCircle>,
            ...previewStores.map((s) => <StoreAvatar key={s.id} store={s} />),
          ]}
        </AvatarStack>
      </FilterChip>
      {stores.map((store) => (
        <FilterChip
          key={store.id}
          active={selectedId === store.id}
          onSelect={() => onSelect(store.id)}
          tooltip={store.name}
        >
          <StoreAvatar store={store} />
        </FilterChip>
      ))}
    </div>
  );
}

// ---------- page ----------

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
  { value: 'custom', label: 'Özel Tarih' },
];

export default function ReportsPage() {
  usePageTitle('Raporlar');

  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();

  const order = useOrderStore();
  const profit = useProfitStore();
  const refund = useRefundStore();
  const payment = usePaymentStore();
  const inventory = useInventoryStore();

  // Tek filtre — order store'u referans olarak kullanıyoruz, değişikliği tüm store'lara yansıtıyoruz.
  const period = order.period;
  const selectedStoreId = order.selectedStoreId;
  const customDateRange = order.customDateRange;

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange?.from && customDateRange?.to
      ? { from: customDateRange.from, to: customDateRange.to }
      : undefined
  );

  const setPeriodAll = (value: string) => {
    order.setPeriod(value);
    profit.setPeriod(value);
    refund.setPeriod(value);
    payment.setPeriod(value);
  };

  const setStoreAll = (id: string | null) => {
    order.setSelectedStoreId(id);
    profit.setSelectedStoreId(id);
    refund.setSelectedStoreId(id);
    payment.setSelectedStoreId(id);
  };

  const setCustomRangeAll = (range: { from: Date; to: Date } | null) => {
    order.setCustomDateRange(range);
    profit.setCustomDateRange(range);
    refund.setCustomDateRange(range);
    payment.setCustomDateRange(range);
  };

  const handlePeriodChange = (value: string) => {
    if (value !== 'custom') setDateRange(undefined);
    setPeriodAll(value);
  };

  const handleDateRangeChange = (range: DateRange | null) => {
    setDateRange(range ?? undefined);
    if (range?.from && range?.to) {
      setCustomRangeAll({ from: range.from, to: range.to });
    }
  };

  // Mağaza listesi (favicon şeridi için) — bir kere çek.
  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  // Analytics verileri — period/store/range değişince yenile.
  useEffect(() => {
    if (!currentCompany?.id) return;
    order.fetchAllAnalytics(currentCompany.id);
    profit.fetchAllProfitAnalytics(currentCompany.id);
    refund.fetchAllRefundData(currentCompany.id);
    payment.fetchAllPaymentAnalytics(currentCompany.id);
    inventory.fetchSummary(currentCompany.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id, period, selectedStoreId, customDateRange]);

  // ---------- chart data ----------

  const orderTrendData = useMemo(
    () =>
      order.trend?.map((item) => ({
        date: formatDateLabel(item.date),
        orders: item.orders,
        revenue: item.revenue,
      })) ?? [],
    [order.trend]
  );

  const profitTrendData = useMemo(
    () =>
      profit.trend?.map((item) => ({
        date: formatDateLabel(item.date),
        netProfit: item.netProfit,
        grossProfit: item.grossProfit,
        margin: item.revenue > 0 ? Math.round((item.netProfit / item.revenue) * 1000) / 10 : 0,
      })) ?? [],
    [profit.trend]
  );

  const refundTrendData = useMemo(
    () =>
      refund.trend?.map((item) => ({
        date: formatDateLabel(item.date),
        count: item.count,
        amount: item.amount,
      })) ?? [],
    [refund.trend]
  );

  const totalSales = useMemo(
    () => orderTrendData.reduce((s, d) => s + (d.revenue as number), 0),
    [orderTrendData]
  );
  const totalOrdersTrend = useMemo(
    () => orderTrendData.reduce((s, d) => s + (d.orders as number), 0),
    [orderTrendData]
  );
  const totalNetProfit = useMemo(
    () => profitTrendData.reduce((s, d) => s + (d.netProfit as number), 0),
    [profitTrendData]
  );
  const totalRefundCount = useMemo(
    () => refundTrendData.reduce((s, d) => s + (d.count as number), 0),
    [refundTrendData]
  );

  // KPI cards
  const orderSummary = order.summary;
  const profitSummary = profit.summary;
  const refundSummary = refund.summary;
  const paymentSummary = payment.summary;

  const kpis = [
    {
      key: 'orders',
      icon: ShoppingBasket,
      title: 'Toplam Sipariş',
      value: orderSummary ? formatNumber(orderSummary.totalOrders) : '-',
      loading: order.isSummaryLoading,
      change: orderSummary?.ordersChange !== undefined ? { value: orderSummary.ordersChange } : undefined,
      spark: { data: orderTrendData, dataKey: 'orders', gradient: KPI_GRADIENTS.orders },
    },
    {
      key: 'revenue',
      icon: CircleDollar,
      title: 'Toplam Gelir',
      value: orderSummary ? formatCurrency(orderSummary.totalRevenue) : '-',
      loading: order.isSummaryLoading,
      change: orderSummary?.revenueChange !== undefined ? { value: orderSummary.revenueChange } : undefined,
      spark: { data: orderTrendData, dataKey: 'revenue', gradient: KPI_GRADIENTS.revenue },
    },
    {
      key: 'avg-order',
      icon: ChartBar,
      title: 'Ort. Sipariş',
      value: orderSummary ? formatCurrency(orderSummary.avgOrderValue) : '-',
      loading: order.isSummaryLoading,
      change:
        orderSummary?.avgOrderValueChange !== undefined
          ? { value: orderSummary.avgOrderValueChange }
          : undefined,
      spark: undefined,
    },
    {
      key: 'completed',
      icon: CircleCheck,
      title: 'Tamamlanan',
      value: orderSummary ? formatNumber(orderSummary.completedOrders) : '-',
      loading: order.isSummaryLoading,
      change: undefined,
      spark: undefined,
    },
    {
      key: 'net-profit',
      icon: FaceFun,
      title: 'Net Kar',
      value: profitSummary ? formatCurrency(profitSummary.netProfit) : '-',
      loading: profit.isSummaryLoading,
      change: profitSummary?.profitChange !== undefined ? { value: profitSummary.profitChange } : undefined,
      spark: { data: profitTrendData, dataKey: 'netProfit', gradient: KPI_GRADIENTS.netProfit },
    },
    {
      key: 'profit-margin',
      icon: ChartPie,
      title: 'Kar Marjı',
      value: profitSummary ? `%${profitSummary.profitMargin}` : '-',
      loading: profit.isSummaryLoading,
      change: undefined,
      spark: { data: profitTrendData, dataKey: 'margin', gradient: KPI_GRADIENTS.profitMargin },
    },
    {
      key: 'refund-rate',
      icon: ArrowRotateLeft,
      title: 'İade Oranı',
      value: refundSummary ? `%${refundSummary.refundRate}` : '-',
      loading: refund.isSummaryLoading,
      change:
        refundSummary?.refundCountChange !== undefined
          ? { value: refundSummary.refundCountChange, invert: true }
          : undefined,
      spark: { data: refundTrendData, dataKey: 'count', gradient: KPI_GRADIENTS.refundRate },
    },
    {
      key: 'pending-payments',
      icon: Clock,
      title: 'Bekleyen Ödeme',
      value: paymentSummary ? formatCurrency(paymentSummary.pendingRevenue) : '-',
      loading: payment.isSummaryLoading,
      change: undefined,
      spark: undefined,
    },
    {
      key: 'total-items',
      icon: PackageIcon,
      title: 'Toplam Ürün',
      value: orderSummary ? formatNumber(orderSummary.totalItems) : '-',
      loading: order.isSummaryLoading,
      change: undefined,
      spark: undefined,
    },
    {
      key: 'processing',
      icon: Clock,
      title: 'İşlenen',
      value: orderSummary ? formatNumber(orderSummary.processingOrders) : '-',
      loading: order.isSummaryLoading,
      change: undefined,
      spark: undefined,
    },
    {
      key: 'cancelled',
      icon: CircleXmark,
      title: 'İptal',
      value: orderSummary ? formatNumber(orderSummary.cancelledOrders) : '-',
      loading: order.isSummaryLoading,
      change: undefined,
      spark: undefined,
    },
    {
      key: 'refunded',
      icon: ArrowRotateLeft,
      title: 'İade',
      value: orderSummary ? formatNumber(orderSummary.refundedOrders) : '-',
      loading: order.isSummaryLoading,
      change: undefined,
      spark: undefined,
    },
  ];

  // Donut: store dağılımı
  const storeDistData = useMemo(
    () =>
      (order.storeDistribution ?? []).map((s) => ({
        name: s.storeName,
        value: s.revenue,
        sub: `${formatNumber(s.count)} sipariş`,
      })),
    [order.storeDistribution]
  );

  // Donut: ödeme yöntemi dağılımı
  const paymentMethodData = useMemo(
    () =>
      (payment.methodDistribution ?? []).map((p) => ({
        name: p.method || 'Diğer',
        value: p.revenue,
        sub: `${formatNumber(p.count)} işlem`,
      })),
    [payment.methodDistribution]
  );

  // Donut: iade sebepleri
  const refundReasonsData = useMemo(
    () =>
      (refund.reasons ?? []).map((r) => ({
        name: r.reason || 'Belirtilmemiş',
        value: r.count,
        sub: formatCurrency(r.totalAmount),
      })),
    [refund.reasons]
  );

  // Horizontal bar: en karlı ürünler
  const topProductsData = useMemo(
    () =>
      (profit.productProfits ?? []).slice(0, 6).map((p) => ({
        productName: p.productName,
        netProfit: p.netProfit,
      })),
    [profit.productProfits]
  );

  // Horizontal bar: sipariş durumu
  const statusData = useMemo(
    () =>
      (order.statusDistribution ?? []).map((s) => ({
        status: s.status,
        count: s.count,
      })),
    [order.statusDistribution]
  );

  // Horizontal bar: mağazaya göre iade oranı
  const refundByStoreData = useMemo(
    () =>
      (refund.storeComparison ?? []).map((s) => ({
        storeName: s.storeName,
        refundRate: s.refundRate,
      })),
    [refund.storeComparison]
  );

  // Karşılaştırma etiketi — period'a göre dinamik. KPI ve trend kartlarındaki
  // "son 30 güne göre" yerine seçili dönemi yansıtsın.
  const compareLabel = useMemo(() => {
    switch (period) {
      case 'today':
        return 'düne göre';
      case '7d':
        return 'son 7 güne göre';
      case '30d':
        return 'son 30 güne göre';
      case '90d':
        return 'son 90 güne göre';
      case '365d':
        return 'son 1 yıla göre';
      case 'custom':
        return 'önceki döneme göre';
      default:
        return 'önceki döneme göre';
    }
  }, [period]);

  // Seçili dönemin label'ı (dropdown trigger'da kısa gösterim için).
  const periodLabel = useMemo(
    () => periodOptions.find((p) => p.value === period)?.label ?? '',
    [period]
  );

  const periodFilter = (
    <>
      <Select
        selectedKey={period}
        onSelectionChange={(key) => handlePeriodChange(String(key))}
        aria-label="Dönem"
        className="w-36"
      >
        <Select.Trigger>
          <Select.Value>{periodLabel}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="border border-border bg-surface/70 shadow-lg backdrop-blur-xl">
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
          visibleMonths={2}
          className="w-[260px]"
        />
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="Raporlar"
        action={
          <div className="flex items-center gap-2">
            <StoreFilterChips
              stores={stores}
              selectedId={selectedStoreId}
              onSelect={setStoreAll}
            />
            <span className="h-6 w-px shrink-0 bg-separator" aria-hidden="true" />
            {periodFilter}
          </div>
        }
      />

      <div className="flex flex-col gap-4 p-4">

        {/* KPI Grid — 2 satır × 4 kolon */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard
              key={k.key}
              Icon={k.icon}
              title={k.title}
              value={k.value}
              loading={k.loading}
              change={k.change}
              spark={k.spark}
              compareLabel={compareLabel}
            />
          ))}
        </div>

        {/* Trend Grid — Area chart kutuları */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <TrendAreaCard
            Icon={ChartBar}
            title="Satış Trendi"
            value={formatCurrency(totalSales)}
            loading={order.isTrendLoading}
            data={orderTrendData}
            dataKey="revenue"
            gradient={TREND_GRADIENTS.sales}
            valueFormatter={formatCurrency}
            compareLabel={compareLabel}
          />
          <TrendAreaCard
            Icon={ShoppingBasket}
            title="Sipariş Trendi"
            value={formatNumber(totalOrdersTrend)}
            loading={order.isTrendLoading}
            data={orderTrendData}
            dataKey="orders"
            gradient={TREND_GRADIENTS.orders}
            valueFormatter={(v) => v.toLocaleString('tr-TR')}
            compareLabel={compareLabel}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <TrendAreaCard
            Icon={ChartDonut}
            title="Net Kar Trendi"
            value={formatCurrency(totalNetProfit)}
            loading={profit.isTrendLoading}
            data={profitTrendData}
            dataKey="netProfit"
            gradient={TREND_GRADIENTS.revenue}
            valueFormatter={formatCurrency}
            compareLabel={compareLabel}
          />
          <TrendBarCard
            Icon={ArrowRotateLeft}
            title="İade Trendi"
            value={formatNumber(totalRefundCount)}
            loading={refund.isTrendLoading}
            data={refundTrendData}
            dataKey="count"
            color={TREND_GRADIENTS.refund.stroke}
            valueFormatter={(v) => v.toLocaleString('tr-TR')}
            compareLabel={compareLabel}
          />
        </div>

        {/* Distribution Grid — Donut/Pie kutuları */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <DonutCard
            Icon={ChartPie}
            title="Mağaza Dağılımı (Gelir)"
            loading={order.isLoading}
            data={storeDistData}
            valueFormatter={formatCurrency}
          />
          <DonutCard
            Icon={CreditCard}
            title="Ödeme Yöntemleri"
            loading={payment.isSummaryLoading}
            data={paymentMethodData}
            valueFormatter={formatCurrency}
          />
          <DonutCard
            Icon={ArrowRotateLeft}
            title="İade Sebepleri"
            loading={refund.isReasonsLoading}
            data={refundReasonsData}
            valueFormatter={(v) => v.toLocaleString('tr-TR')}
          />
        </div>

        {/* Ranking Grid — Horizontal bar kutuları */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <HorizontalBarCard
            Icon={ChartColumn}
            title="Sipariş Durumu"
            loading={order.isLoading}
            data={statusData}
            valueKey="count"
            labelKey="status"
            colorOf={(e) => STATUS_COLORS[String(e.status)] || '#6b7280'}
            valueFormatter={(v) => v.toLocaleString('tr-TR')}
          />
          <HorizontalBarCard
            Icon={PackageIcon}
            title="En Karlı Ürünler"
            loading={profit.isProductsLoading}
            data={topProductsData}
            valueKey="netProfit"
            labelKey="productName"
            colorOf={(e) => (Number(e.netProfit) >= 0 ? '#10b981' : '#ef4444')}
            valueFormatter={formatCurrency}
          />
          <HorizontalBarCard
            Icon={TriangleExclamation}
            title="Mağaza Bazlı İade Oranı"
            loading={refund.isComparisonLoading}
            data={refundByStoreData}
            valueKey="refundRate"
            labelKey="storeName"
            colorOf={(e) => {
              const r = Number(e.refundRate);
              return r >= 10 ? '#ef4444' : r >= 5 ? '#f59e0b' : '#10b981';
            }}
            valueFormatter={(v) => `%${v}`}
          />
        </div>
      </div>
    </>
  );
}
