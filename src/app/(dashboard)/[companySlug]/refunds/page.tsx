'use client';

import { useEffect, useState } from 'react';
import { Box as Package, TriangleExclamation as AlertTriangle, ShoppingBag as Store, ChevronLeft } from '@gravity-ui/icons';
import { ArrowRotateLeft as RotateCcw, ChartLineArrowUp as TrendingUp, ChartLine as TrendingDown, Magnifier as Search, ChevronRight } from '@gravity-ui/icons';
import {
  Area,
  AreaChart,
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
import { Button, Input, ListBox, Select, TextField } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useRefundStore } from '@/stores/refundStore';
import { usePageTitle } from '@/hooks/use-page-title';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
];

const REASON_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

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

function refundRateTone(rate: number) {
  if (rate >= 10) return 'text-danger';
  if (rate >= 5) return 'text-warning';
  return 'text-success';
}

function refundRateFill(rate: number) {
  if (rate >= 10) return '#ef4444';
  if (rate >= 5) return '#f97316';
  return '#22c55e';
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-overlay p-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex gap-2 text-sm">
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="font-medium">{entry.value.toLocaleString('tr-TR')}</span>
        </p>
      ))}
    </div>
  );
}

export default function RefundsPage() {
  usePageTitle('İadeler');

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
    if (currentCompany?.id) fetchRefundList(currentCompany.id, newPage);
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

  const pieData = reasons.map((reason, index) => ({
    name: reason.reason,
    value: reason.count,
    percentage: reason.percentage,
    fill: REASON_COLORS[index % REASON_COLORS.length],
  }));

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">İade Analizi</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            selectedKey={selectedStoreId || 'all'}
            onSelectionChange={(key) =>
              setSelectedStoreId(key === 'all' ? null : String(key))
            }
            aria-label="Mağaza filtresi"
            className="w-[160px]"
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
          <Select
            selectedKey={period}
            onSelectionChange={(key) => setPeriod(String(key))}
            aria-label="Dönem"
            className="w-[140px]"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {PERIOD_OPTIONS.map((opt) => (
                  <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        <div className="border-r border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Toplam İade</span>
            <Package className="h-5 w-5 text-danger" />
          </div>
          {isSummaryLoading ? null : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{summary?.totalRefunds || 0}</span>
              {summary?.refundCountChange !== undefined && summary.refundCountChange !== 0 && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    summary.refundCountChange > 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {summary.refundCountChange > 0 ? (
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                  )}
                  {summary.refundCountChange > 0 ? '+' : ''}
                  {summary.refundCountChange}%
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-r border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">İade Tutarı</span>
            <RotateCcw className="h-5 w-5 text-danger" />
          </div>
          {isSummaryLoading ? null : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-danger">
                {formatCurrency(summary?.totalRefundAmount || 0)}
              </span>
              {summary?.refundAmountChange !== undefined && summary.refundAmountChange !== 0 && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    summary.refundAmountChange > 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {summary.refundAmountChange > 0 ? (
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                  )}
                  {summary.refundAmountChange > 0 ? '+' : ''}
                  {summary.refundAmountChange}%
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-r border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">İade Oranı</span>
            <AlertTriangle
              className={`h-5 w-5 ${summary ? refundRateTone(summary.refundRate) : 'text-muted'}`}
            />
          </div>
          {isSummaryLoading ? null : (
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  summary ? refundRateTone(summary.refundRate) : ''
                }`}
              >
                %{summary?.refundRate || 0}
              </span>
              <span className="text-xs text-muted">
                ({summary?.totalRefunds || 0}/{summary?.totalOrders || 0})
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Ort. İade Tutarı</span>
            <Store className="h-5 w-5 text-muted" />
          </div>
          {isSummaryLoading ? null : (
            <span className="text-2xl font-bold">
              {formatCurrency(summary?.avgRefundAmount || 0)}
            </span>
          )}
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <TrendingUp className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium">İade Trendi</h3>
        </div>
        <div className="p-4">
          {isTrendLoading ? null : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={trend} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
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
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Area
                  dataKey="count"
                  name="İade Sayısı"
                  type="monotone"
                  fill="#ef4444"
                  fillOpacity={0.2}
                  stroke="#ef4444"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-border lg:grid-cols-2">
        <div className="border-r border-border">
          <div className="flex items-center gap-2 border-b border-border bg-surface-secondary/50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-medium">İade Nedenleri</h3>
          </div>
          <div className="bg-surface-secondary/50 p-4">
            {isReasonsLoading ? null : reasons.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted">
                Veri bulunamadı
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={192} height={192}>
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
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = (payload[0] as { payload: typeof pieData[number] }).payload;
                        return (
                          <div className="rounded-lg border border-border bg-overlay p-2 shadow-md">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted">
                              {data.value} adet (%{data.percentage})
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-2">
                  {reasons.slice(0, 5).map((reason, index) => (
                    <div key={reason.reason} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: REASON_COLORS[index % REASON_COLORS.length] }}
                      />
                      <span className="flex-1 truncate text-sm">{reason.reason}</span>
                      <span className="text-sm text-muted">%{reason.percentage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 border-b border-border bg-surface-secondary/50 px-4 py-3">
            <Store className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-medium">Mağaza Karşılaştırması</h3>
          </div>
          <div className="bg-surface-secondary/50 p-4">
            {isComparisonLoading ? null : storeComparison.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted">
                Veri bulunamadı
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={storeComparison} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickFormatter={(v) => `%${v}`} fontSize={12} />
                  <YAxis
                    dataKey="storeName"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = (payload[0] as { payload: typeof storeComparison[number] }).payload;
                      return (
                        <div className="rounded-lg border border-border bg-overlay p-2 shadow-md">
                          <p className="text-sm font-medium">{data.storeName}</p>
                          <p className="text-xs">
                            İade: {data.refundCount} / {data.totalOrders}
                          </p>
                          <p className="text-xs">Oran: %{data.refundRate}</p>
                          <p className="text-xs">Tutar: {formatCurrency(data.refundAmount)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="refundRate" radius={4}>
                    {storeComparison.map((entry, index) => (
                      <Cell key={index} fill={refundRateFill(entry.refundRate)} />
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
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-medium">İade Listesi</h3>
            <span className="text-xs text-muted">({refundListTotal} kayıt)</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted" />
            <TextField value={searchTerm} onChange={setSearchTerm}>
              <Input placeholder="Ara..." className="h-8 pl-8" />
            </TextField>
          </div>
        </div>

        {isListLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => null)}
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {searchTerm ? 'Arama sonucu bulunamadı' : 'İade kaydı bulunamadı'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Sipariş No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Tarih</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Müşteri</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Mağaza</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted">Neden</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted">
                      Sipariş Tutarı
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted">
                      İade Tutarı
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((refund, index) => (
                    <tr
                      key={refund.id}
                      className={index % 2 === 0 ? '' : 'bg-surface-secondary/30'}
                    >
                      <td className="px-4 py-2 text-sm font-medium">{refund.orderNumber}</td>
                      <td className="px-4 py-2 text-sm text-muted">
                        {formatDate(refund.refundDate)}
                      </td>
                      <td className="px-4 py-2 text-sm">{refund.customerName || '-'}</td>
                      <td className="px-4 py-2 text-sm">{refund.storeName}</td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className="inline-block max-w-[200px] truncate"
                          title={refund.reason || ''}
                        >
                          {refund.reason || 'Belirtilmemiş'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        {formatCurrency(refund.orderTotal)}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-danger">
                        -{formatCurrency(refund.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {refundListTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-sm text-muted">
                  Sayfa {refundListPage} / {refundListTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isIconOnly
                    aria-label="Önceki sayfa"
                    onPress={() => handlePageChange(refundListPage - 1)}
                    isDisabled={refundListPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    isIconOnly
                    aria-label="Sonraki sayfa"
                    onPress={() => handlePageChange(refundListPage + 1)}
                    isDisabled={refundListPage >= refundListTotalPages}
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
