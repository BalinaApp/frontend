'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Percent,
  AlertTriangle,
  Search,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Chip,
  Input,
  ListBox,
  Select,
  Skeleton,
  TextField,
} from '@heroui/react';
import { DateRangeInput, type DateRange } from '@/components/date-range-input';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useProfitStore } from '@/stores/profitStore';

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
  { value: 'custom', label: 'Özel Tarih' },
];

export default function ReportsPage() {
  const { currentCompany } = useCompanyStore();
  const { stores } = useStoreStore();
  const {
    summary,
    productProfits,
    trend,
    period,
    customDateRange,
    selectedStoreId,
    isSummaryLoading,
    isProductsLoading,
    isTrendLoading,
    setPeriod,
    setCustomDateRange,
    setSelectedStoreId,
    fetchAllProfitAnalytics,
  } = useProfitStore();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange?.from && customDateRange?.to
      ? { from: customDateRange.from, to: customDateRange.to }
      : undefined
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentCompany?.id) fetchAllProfitAnalytics(currentCompany.id);
  }, [currentCompany?.id, period, customDateRange, selectedStoreId, fetchAllProfitAnalytics]);

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

  const formatChartDate = (dateString: string) => {
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

  const topProducts = productProfits.slice(0, 10);
  const filteredProducts = productProfits.filter((product) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.productName.toLowerCase().includes(search) ||
      (product.sku && product.sku.toLowerCase().includes(search))
    );
  });

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Kar Analizi</h1>
        </div>
        <div className="flex items-center gap-3">
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
        <SummaryCell
          label="Net Kar"
          Icon={DollarSign}
          loading={isSummaryLoading}
          extra={summary && renderChange(summary.profitChange)}
        >
          <span
            className={
              (summary?.netProfit || 0) < 0 ? 'text-danger' : 'text-success'
            }
          >
            {summary ? formatCurrency(summary.netProfit) : '0,00 TL'}
          </span>
        </SummaryCell>
        <SummaryCell label="Brüt Kar" Icon={TrendingUp} loading={isSummaryLoading}>
          <span className={(summary?.grossProfit || 0) < 0 ? 'text-danger' : ''}>
            {summary ? formatCurrency(summary.grossProfit) : '0,00 TL'}
          </span>
        </SummaryCell>
        <SummaryCell label="Kar Marjı" Icon={Percent} loading={isSummaryLoading}>
          <span
            className={
              (summary?.profitMargin || 0) < 0 ? 'text-danger' : 'text-success'
            }
          >
            %{summary?.profitMargin || 0}
          </span>
        </SummaryCell>
        <SummaryCell label="Toplam Gelir" Icon={ShoppingCart} loading={isSummaryLoading} last>
          {summary ? formatCurrency(summary.totalRevenue) : '0,00 TL'}
        </SummaryCell>
      </div>

      <div className="grid grid-cols-4 border-b border-border bg-surface-secondary/30">
        <CostRow Icon={Package} iconTone="text-accent" label="Maliyet:">
          {summary ? formatCurrency(summary.totalCost) : '0,00 TL'}
        </CostRow>
        <CostRow Icon={Percent} iconTone="text-warning" label="Komisyon:">
          {summary ? formatCurrency(summary.totalCommission) : '0,00 TL'}
        </CostRow>
        <CostRow Icon={ShoppingCart} iconTone="text-accent" label="Kargo:">
          {summary ? formatCurrency(summary.totalShippingCost) : '0,00 TL'}
        </CostRow>
        <CostRow Icon={BarChart3} iconTone="text-success" label="Ort. Sipariş Karı:" last>
          {summary ? formatCurrency(summary.avgOrderProfit) : '0,00 TL'}
        </CostRow>
      </div>

      <div className="grid grid-cols-2 border-b border-border">
        <div className="border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Kar Trendi</h3>
          </div>
          <div className="p-6">
            {isTrendLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : trend.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted">
                Veri bulunamadı
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    cursor={false}
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend
                    formatter={(value) => (value === 'grossProfit' ? 'Brüt Kar' : 'Net Kar')}
                  />
                  <Line
                    type="monotone"
                    dataKey="grossProfit"
                    name="grossProfit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="netProfit"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">En Karlı Ürünler</h3>
          </div>
          <div className="p-6">
            {isProductsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : topProducts.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted">
                Veri bulunamadı
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={topProducts.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={95}
                    tickFormatter={(value) =>
                      value.length > 15 ? value.slice(0, 15) + '...' : value
                    }
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: number) => [formatCurrency(value), 'Net Kar']}
                  />
                  <Bar dataKey="netProfit" radius={[0, 4, 4, 0]}>
                    {topProducts.slice(0, 5).map((entry, i) => (
                      <Cell key={i} fill={entry.netProfit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium">Ürün Bazlı Kar Analizi</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted" />
              <TextField value={searchTerm} onChange={setSearchTerm}>
                <Input placeholder="Ürün ara..." className="h-8 w-48 pl-8" />
              </TextField>
            </div>
            <span className="text-xs text-muted">
              {filteredProducts.length}/{productProfits.length} ürün
            </span>
          </div>
        </div>
        <div className="max-h-[400px] overflow-auto">
          {isProductsLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-muted">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Ürün kar verisi bulunamadı'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-6 py-2 text-left text-xs font-medium text-muted">Ürün</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted">
                    Satış Fiyatı
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted">
                    Alış Fiyatı
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted">Satılan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted">Brüt Kar</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted">Net Kar</th>
                  <th className="px-4 py-2 pr-6 text-right text-xs font-medium text-muted">
                    Kar Marjı
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.productId} className="border-b border-border">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-default">
                            <Package className="h-5 w-5 text-muted" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{product.productName}</p>
                          {product.sku && (
                            <p className="text-xs text-muted">SKU: {product.sku}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(product.salePrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.hasPurchasePrice ? (
                        formatCurrency(product.purchasePrice!)
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-muted">
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          Belirsiz
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{product.quantitySold}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={product.grossProfit < 0 ? 'text-danger' : ''}>
                        {formatCurrency(product.grossProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span
                        className={product.netProfit < 0 ? 'text-danger' : 'text-success'}
                      >
                        {formatCurrency(product.netProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 pr-6 text-right">
                      <Chip
                        variant="primary"
                        size="sm"
                        className={
                          product.profitMargin < 0
                            ? 'bg-danger/15 text-danger'
                            : product.profitMargin < 20
                              ? 'bg-warning/15 text-warning-foreground'
                              : 'bg-success/15 text-success'
                        }
                      >
                        %{product.profitMargin}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCell({
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
        <Skeleton className="mt-1 h-8 w-28" />
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold">{children}</p>
          {extra}
        </div>
      )}
    </div>
  );
}

function CostRow({
  Icon,
  iconTone,
  label,
  last,
  children,
}: {
  Icon: React.ElementType;
  iconTone: string;
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 px-6 py-3 ${!last ? 'border-r border-border' : ''}`}>
      <Icon className={`h-4 w-4 ${iconTone}`} />
      <span className="text-sm text-muted">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
