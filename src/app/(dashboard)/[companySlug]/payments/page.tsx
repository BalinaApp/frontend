'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from '@gravity-ui/icons';
import { ChartLineArrowUp as TrendingUp, ChartLine as TrendingDown, CircleDollar as DollarSign, Clock, CircleCheck as CheckCircle, CircleXmark as XCircle, ArrowRotateLeft as RotateCcw } from '@gravity-ui/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ListBox, Select } from '@/components/ui';
import { DateRangeInput, type DateRange } from '@/components/date-range-input';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { usePageTitle } from '@/hooks/use-page-title';

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
  { value: 'custom', label: 'Özel Tarih' },
];

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'Kredi Kartı': '#3b82f6',
  'Kapıda Ödeme': '#f59e0b',
  'Banka Havalesi': '#10b981',
  PayPal: '#6366f1',
  Çek: '#8b5cf6',
  Diğer: '#6b7280',
};

const getPaymentMethodColor = (method: string) =>
  PAYMENT_METHOD_COLORS[method] || '#6b7280';

export default function PaymentsPage() {
  usePageTitle('Ödemeler');

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
    customDateRange?.from && customDateRange?.to
      ? { from: customDateRange.from, to: customDateRange.to }
      : undefined
  );

  useEffect(() => {
    if (currentCompany?.id) fetchAllPaymentAnalytics(currentCompany.id);
  }, [
    currentCompany?.id,
    period,
    customDateRange,
    selectedStoreId,
    fetchAllPaymentAnalytics,
  ]);

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

  const statusPieData = summary
    ? [
        { name: 'Tamamlanan', value: summary.completedRevenue, color: '#10b981' },
        { name: 'Bekleyen', value: summary.pendingRevenue, color: '#f59e0b' },
        { name: 'Başarısız', value: summary.failedRevenue, color: '#ef4444' },
        { name: 'İade', value: summary.refundedRevenue, color: '#8b5cf6' },
      ].filter((item) => item.value > 0)
    : [];

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
    <div className="flex h-full flex-col overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Ödemeler</h1>
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
        <div className="border-r border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Toplam Gelir</span>
            <DollarSign className="h-4 w-4 text-muted" />
          </div>
          {isSummaryLoading ? null : (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-semibold">
                {summary ? formatCurrency(summary.completedRevenue) : '0,00 TL'}
              </p>
              {summary && renderChange(summary.revenueChange)}
            </div>
          )}
        </div>
        <div className="border-r border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Bekleyen Ödeme</span>
            <Clock className="h-4 w-4 text-muted" />
          </div>
          {isSummaryLoading ? null : (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-warning-foreground">
                {summary ? formatCurrency(summary.pendingRevenue) : '0,00 TL'}
              </p>
              <span className="text-xs text-muted">
                ({summary?.pendingPayments || 0} işlem)
              </span>
            </div>
          )}
        </div>
        <div className="border-r border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Başarı Oranı</span>
            <CheckCircle className="h-4 w-4 text-muted" />
          </div>
          {isSummaryLoading ? null : (
            <p className="mt-1 text-2xl font-semibold text-success">
              %{summary?.successRate || 0}
            </p>
          )}
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Ort. Ödeme</span>
            <TrendingUp className="h-4 w-4 text-muted" />
          </div>
          {isSummaryLoading ? null : (
            <p className="mt-1 text-2xl font-semibold">
              {summary ? formatCurrency(summary.avgPaymentValue) : '0,00 TL'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 border-b border-border bg-surface-secondary/30">
        <div className="flex items-center gap-2 border-r border-border px-6 py-3">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm text-muted">Tamamlanan:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.completedPayments) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-2 border-r border-border px-6 py-3">
          <Clock className="h-4 w-4 text-warning" />
          <span className="text-sm text-muted">Bekleyen:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.pendingPayments) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-2 border-r border-border px-6 py-3">
          <XCircle className="h-4 w-4 text-danger" />
          <span className="text-sm text-muted">Başarısız:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.failedPayments) : '0'}
          </span>
        </div>
        <div className="flex items-center gap-2 px-6 py-3">
          <RotateCcw className="h-4 w-4 text-accent" />
          <span className="text-sm text-muted">İade:</span>
          <span className="font-medium">
            {summary ? formatNumber(summary.refundedPayments) : '0'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border">
        <div className="border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Ödeme Yöntemi Dağılımı</h3>
          </div>
          <div className="p-6">
            {sortedMethodDistribution.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted">
                Veri bulunamadı
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={sortedMethodDistribution}
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
                      dataKey="method"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={95}
                    />
                    <Tooltip
                      cursor={false}
                      formatter={(value: number) => [formatCurrency(value), 'Tutar']}
                    />
                    <Bar dataKey="revenue" name="Tutar (TL)" radius={[0, 4, 4, 0]}>
                      {sortedMethodDistribution.map((entry) => (
                        <Cell
                          key={entry.method}
                          fill={getPaymentMethodColor(entry.method)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-col gap-2">
                  {sortedMethodDistribution.map((method) => (
                    <div
                      key={method.method}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: getPaymentMethodColor(method.method) }}
                        />
                        <span>{method.method}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted">
                        <span>{method.count} işlem</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(method.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Durum Dağılımı</h3>
          </div>
          <div className="p-6">
            {statusPieData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted">
                Veri bulunamadı
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
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
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      formatter={(value: number) => [formatCurrency(value), 'Tutar']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-col gap-2">
                  {statusPieData.map((status) => (
                    <div
                      key={status.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
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
