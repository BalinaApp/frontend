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
  CalendarIcon,
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
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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
import { useProfitStore } from '@/stores/profitStore';
import { cn } from '@/lib/utils';

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
  { value: 'custom', label: 'Özel Tarih' },
];

const trendChartConfig: ChartConfig = {
  grossProfit: { label: 'Brüt Kar', color: '#3b82f6' },
  netProfit: { label: 'Net Kar', color: '#10b981' },
};

const productChartConfig: ChartConfig = {
  netProfit: { label: 'Net Kar', color: '#10b981' },
};

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
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentCompany?.id) {
      fetchAllProfitAnalytics(currentCompany.id);
    }
  }, [currentCompany?.id, period, customDateRange, selectedStoreId, fetchAllProfitAnalytics]);

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

  const formatChartDate = (dateString: string) => {
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

  // Top 10 products by profit
  const topProducts = productProfits.slice(0, 10);

  // Filter products by search term
  const filteredProducts = productProfits.filter((product) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.productName.toLowerCase().includes(search) ||
      (product.sku && product.sku.toLowerCase().includes(search))
    );
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Kar Analizi</h1>
        </div>
        <div className="flex items-center gap-3">
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
            <span className="text-sm text-muted-foreground">Net Kar</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-28 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <p className={cn(
                'text-2xl font-semibold',
                (summary?.netProfit || 0) < 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {summary ? formatCurrency(summary.netProfit) : '0,00 TL'}
              </p>
              {summary && renderChangeIndicator(summary.profitChange)}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Brüt Kar</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-28 mt-1" />
          ) : (
            <p className={cn(
              'text-2xl font-semibold mt-1',
              (summary?.grossProfit || 0) < 0 ? 'text-red-600' : ''
            )}>
              {summary ? formatCurrency(summary.grossProfit) : '0,00 TL'}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-r">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Kar Marjı</span>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className={cn(
              'text-2xl font-semibold mt-1',
              (summary?.profitMargin || 0) < 0 ? 'text-red-600' : 'text-green-600'
            )}>
              %{summary?.profitMargin || 0}
            </p>
          )}
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toplam Gelir</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-8 w-28 mt-1" />
          ) : (
            <p className="text-2xl font-semibold mt-1">
              {summary ? formatCurrency(summary.totalRevenue) : '0,00 TL'}
            </p>
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-4 border-b bg-muted/30">
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-muted-foreground">Maliyet:</span>
          <span className="font-medium">
            {summary ? formatCurrency(summary.totalCost) : '0,00 TL'}
          </span>
        </div>
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <Percent className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-muted-foreground">Komisyon:</span>
          <span className="font-medium">
            {summary ? formatCurrency(summary.totalCommission) : '0,00 TL'}
          </span>
        </div>
        <div className="px-6 py-3 border-r flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-purple-600" />
          <span className="text-sm text-muted-foreground">Kargo:</span>
          <span className="font-medium">
            {summary ? formatCurrency(summary.totalShippingCost) : '0,00 TL'}
          </span>
        </div>
        <div className="px-6 py-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-green-600" />
          <span className="text-sm text-muted-foreground">Ort. Sipariş Karı:</span>
          <span className="font-medium">
            {summary ? formatCurrency(summary.avgOrderProfit) : '0,00 TL'}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 border-b">
        {/* Profit Trend */}
        <div className="border-r">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Kar Trendi</h3>
          </div>
          <div className="p-6">
            {isTrendLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : trend.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <ChartContainer config={trendChartConfig} className="h-[250px] w-full">
                <LineChart data={trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent labelFormatter={formatChartDate} />}
                  />
                  <Legend formatter={(value) => (value === 'grossProfit' ? 'Brüt Kar' : 'Net Kar')} />
                  <Line
                    type="monotone"
                    dataKey="grossProfit"
                    stroke="var(--color-grossProfit)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    stroke="var(--color-netProfit)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </div>

        {/* Top Products by Profit */}
        <div>
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium">En Karlı Ürünler</h3>
          </div>
          <div className="p-6">
            {isProductsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : topProducts.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadı
              </div>
            ) : (
              <ChartContainer config={productChartConfig} className="h-[250px] w-full">
                <BarChart
                  data={topProducts.slice(0, 5)}
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
                    dataKey="productName"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={95}
                    tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="netProfit" name="Net Kar (TL)" radius={[0, 4, 4, 0]}>
                    {topProducts.slice(0, 5).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.netProfit >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      </div>

      {/* Product Profit Table */}
      <div>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">Ürün Bazlı Kar Analizi</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-48"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredProducts.length}/{productProfits.length} ürün
            </span>
          </div>
        </div>
        <div className="overflow-auto max-h-[400px]">
          {isProductsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Ürün kar verisi bulunamadı'}
            </div>
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow className="hover:bg-transparent">
                  <DataTableHead className="pl-6">Ürün</DataTableHead>
                  <DataTableHead className="text-right">Satış Fiyatı</DataTableHead>
                  <DataTableHead className="text-right">Alış Fiyatı</DataTableHead>
                  <DataTableHead className="text-center">Satılan</DataTableHead>
                  <DataTableHead className="text-right">Brüt Kar</DataTableHead>
                  <DataTableHead className="text-right">Net Kar</DataTableHead>
                  <DataTableHead className="text-right pr-6">Kar Marjı</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {filteredProducts.map((product) => (
                  <DataTableRow key={product.productId}>
                    <DataTableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{product.productName}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          )}
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      {formatCurrency(product.salePrice)}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      {product.hasPurchasePrice ? (
                        formatCurrency(product.purchasePrice!)
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          Belirsiz
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-center">
                      {product.quantitySold}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <span className={product.grossProfit < 0 ? 'text-red-600' : ''}>
                        {formatCurrency(product.grossProfit)}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="text-right font-medium">
                      <span className={product.netProfit < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(product.netProfit)}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="text-right pr-6">
                      <Badge className={cn(
                        product.profitMargin < 0 ? 'bg-red-100 text-red-800' :
                        product.profitMargin < 20 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        %{product.profitMargin}
                      </Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}
