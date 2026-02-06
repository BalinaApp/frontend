import { act, renderHook } from '@testing-library/react';
import { useProfitStore } from './profitStore';

// Mock the API
jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

import { api } from '@/services/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('profitStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useProfitStore());
    act(() => {
      useProfitStore.setState({
        summary: null,
        productProfits: [],
        orderProfits: [],
        orderProfitsTotal: 0,
        orderProfitsPage: 1,
        orderProfitsTotalPages: 0,
        trend: [],
        period: '30d',
        customDateRange: null,
        selectedStoreId: null,
        isLoading: false,
        isSummaryLoading: false,
        isProductsLoading: false,
        isOrdersLoading: false,
        isTrendLoading: false,
        error: null,
      });
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useProfitStore());

      expect(result.current.summary).toBeNull();
      expect(result.current.productProfits).toEqual([]);
      expect(result.current.orderProfits).toEqual([]);
      expect(result.current.trend).toEqual([]);
      expect(result.current.period).toBe('30d');
      expect(result.current.customDateRange).toBeNull();
      expect(result.current.selectedStoreId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setPeriod', () => {
    it('should update period and clear custom date range', () => {
      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.setCustomDateRange({
          from: new Date(),
          to: new Date(),
        });
      });

      act(() => {
        result.current.setPeriod('7d');
      });

      expect(result.current.period).toBe('7d');
      expect(result.current.customDateRange).toBeNull();
    });
  });

  describe('setCustomDateRange', () => {
    it('should update date range and set period to custom', () => {
      const { result } = renderHook(() => useProfitStore());
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-15');

      act(() => {
        result.current.setCustomDateRange({ from, to });
      });

      expect(result.current.customDateRange).toEqual({ from, to });
      expect(result.current.period).toBe('custom');
    });

    it('should not set period to custom if dates are incomplete', () => {
      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.setCustomDateRange({ from: new Date(), to: undefined });
      });

      expect(result.current.period).toBe('30d');
    });
  });

  describe('setSelectedStoreId', () => {
    it('should update selected store ID', () => {
      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.setSelectedStoreId('store-123');
      });

      expect(result.current.selectedStoreId).toBe('store-123');
    });

    it('should allow clearing store ID', () => {
      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.setSelectedStoreId('store-123');
      });

      act(() => {
        result.current.setSelectedStoreId(null);
      });

      expect(result.current.selectedStoreId).toBeNull();
    });
  });

  describe('fetchSummary', () => {
    const mockSummary = {
      totalRevenue: 10000,
      totalCost: 4000,
      totalCommission: 1000,
      totalShippingCost: 300,
      grossProfit: 6000,
      netProfit: 4700,
      profitMargin: 47,
      ordersCount: 50,
      itemsCount: 120,
      avgOrderProfit: 94,
      previousNetProfit: 4000,
      profitChange: 17.5,
    };

    it('should fetch and store profit summary', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchSummary('company-123');
      });

      expect(result.current.summary).toEqual(mockSummary);
      expect(result.current.isSummaryLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.get.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.fetchSummary('company-123');
      });

      expect(result.current.isSummaryLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: mockSummary });
        await promise;
      });

      expect(result.current.isSummaryLoading).toBe(false);
    });

    it('should handle errors', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { message: 'Server error' } },
      });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchSummary('company-123');
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.isSummaryLoading).toBe(false);
    });

    it('should include period in API call', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary });

      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.setPeriod('7d');
      });

      await act(async () => {
        await result.current.fetchSummary('company-123');
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('period=7d')
      );
    });

    it('should include store filter in API call', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockSummary });

      const { result } = renderHook(() => useProfitStore());

      act(() => {
        result.current.setSelectedStoreId('store-456');
      });

      await act(async () => {
        await result.current.fetchSummary('company-123');
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('storeId=store-456')
      );
    });
  });

  describe('fetchProductProfits', () => {
    const mockProducts = [
      {
        productId: 'prod-1',
        productName: 'Product A',
        sku: 'SKU-A',
        imageUrl: null,
        salePrice: 100,
        purchasePrice: 40,
        quantitySold: 50,
        totalRevenue: 5000,
        totalCost: 2000,
        grossProfit: 3000,
        netProfit: 2400,
        profitMargin: 48,
        hasPurchasePrice: true,
      },
    ];

    it('should fetch and store product profits', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockProducts });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchProductProfits('company-123');
      });

      expect(result.current.productProfits).toEqual(mockProducts);
      expect(result.current.isProductsLoading).toBe(false);
    });

    it('should pass limit parameter', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockProducts });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchProductProfits('company-123', 25);
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=25')
      );
    });
  });

  describe('fetchOrderProfits', () => {
    const mockOrdersResponse = {
      orders: [
        {
          orderId: 'order-1',
          orderNumber: '#1001',
          orderDate: '2025-01-15',
          storeName: 'Test Store',
          customerName: 'Test Customer',
          itemsCount: 2,
          revenue: 200,
          cost: 80,
          commission: 20,
          shippingCost: 15,
          grossProfit: 120,
          netProfit: 85,
          profitMargin: 42.5,
        },
      ],
      total: 50,
      page: 1,
      totalPages: 3,
    };

    it('should fetch and store order profits with pagination', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockOrdersResponse });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchOrderProfits('company-123');
      });

      expect(result.current.orderProfits).toEqual(mockOrdersResponse.orders);
      expect(result.current.orderProfitsTotal).toBe(50);
      expect(result.current.orderProfitsPage).toBe(1);
      expect(result.current.orderProfitsTotalPages).toBe(3);
    });

    it('should pass pagination parameters', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockOrdersResponse });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchOrderProfits('company-123', 2, 30);
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=30')
      );
    });
  });

  describe('fetchTrend', () => {
    const mockTrend = [
      {
        date: '2025-01-15',
        revenue: 1000,
        cost: 400,
        grossProfit: 600,
        netProfit: 485,
      },
      {
        date: '2025-01-16',
        revenue: 1200,
        cost: 480,
        grossProfit: 720,
        netProfit: 582,
      },
    ];

    it('should fetch and store trend data', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockTrend });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchTrend('company-123');
      });

      expect(result.current.trend).toEqual(mockTrend);
      expect(result.current.isTrendLoading).toBe(false);
    });
  });

  describe('fetchAllProfitAnalytics', () => {
    it('should fetch all data in parallel', async () => {
      const mockSummary = { netProfit: 1000 };
      const mockProducts = [{ productId: 'prod-1' }];
      const mockTrend = [{ date: '2025-01-15' }];

      mockApi.get
        .mockResolvedValueOnce({ data: mockSummary })
        .mockResolvedValueOnce({ data: mockProducts })
        .mockResolvedValueOnce({ data: mockTrend });

      const { result } = renderHook(() => useProfitStore());

      await act(async () => {
        await result.current.fetchAllProfitAnalytics('company-123');
      });

      expect(mockApi.get).toHaveBeenCalledTimes(3);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
