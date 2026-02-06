import { create } from 'zustand';
import { api } from '@/services/api';

export interface PlanFeatures {
  csvExport: boolean;
  pdfExport: boolean;
  emailReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: string;
  name: 'FREE' | 'PRO' | 'ENTERPRISE';
  displayName: string;
  storeLimit: number;
  refreshInterval: number;
  historyDays: number;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeatures;
  isActive: boolean;
}

export interface UserPlanInfo {
  plan: {
    id: string;
    name: 'FREE' | 'PRO' | 'ENTERPRISE';
    displayName: string;
    storeLimit: number;
    refreshInterval: number;
    historyDays: number;
    priceMonthly: number;
    priceYearly: number;
  };
  isGrandfathered: boolean;
  features: PlanFeatures;
}

export interface UsageInfo {
  storeCount: number;
  storeLimit: number;
  usagePercentage: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
}

interface PricingState {
  // State
  plans: Plan[];
  myPlan: UserPlanInfo | null;
  usage: UsageInfo | null;
  isPricingEnabled: boolean;
  isLoading: boolean;
  isPlansLoading: boolean;
  error: string | null;

  // Actions
  fetchPlans: () => Promise<void>;
  fetchMyPlan: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  fetchPricingStatus: () => Promise<void>;
  requestUpgrade: (planType: 'FREE' | 'PRO' | 'ENTERPRISE') => Promise<boolean>;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  getRequiredPlanForFeature: (feature: keyof PlanFeatures) => 'PRO' | 'ENTERPRISE' | null;
  reset: () => void;
}

export const usePricingStore = create<PricingState>((set, get) => ({
  // Initial state
  plans: [],
  myPlan: null,
  usage: null,
  isPricingEnabled: false,
  isLoading: false,
  isPlansLoading: false,
  error: null,

  // Fetch all available plans
  fetchPlans: async () => {
    set({ isPlansLoading: true, error: null });
    try {
      const response = await api.get('/pricing/plans');
      set({ plans: response.data.plans, isPlansLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Planlar yüklenemedi';
      set({ error: message, isPlansLoading: false });
    }
  },

  // Fetch current user's plan info
  fetchMyPlan: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/pricing/my-plan');
      set({ myPlan: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Plan bilgisi yüklenemedi';
      set({ error: message, isLoading: false });
    }
  },

  // Fetch usage info
  fetchUsage: async () => {
    try {
      const response = await api.get('/pricing/usage');
      set({ usage: response.data });
    } catch (error: unknown) {
      console.error('Usage fetch error:', error);
    }
  },

  // Fetch pricing status (enabled/disabled)
  fetchPricingStatus: async () => {
    try {
      const response = await api.get('/pricing/status');
      set({ isPricingEnabled: response.data.enabled });
    } catch (error: unknown) {
      console.error('Pricing status fetch error:', error);
    }
  },

  // Request plan upgrade
  requestUpgrade: async (planType: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/pricing/upgrade', { planType });
      if (response.data.success) {
        // Refresh plan info after upgrade
        await get().fetchMyPlan();
        await get().fetchUsage();
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Plan yükseltme başarısız';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Check if user has access to a feature
  hasFeature: (feature: keyof PlanFeatures): boolean => {
    const { myPlan, isPricingEnabled } = get();

    // If pricing is disabled, all features are available
    if (!isPricingEnabled) return true;

    // If no plan info, assume no access
    if (!myPlan) return false;

    // Grandfathered users have all features
    if (myPlan.isGrandfathered) return true;

    return myPlan.features[feature] === true;
  },

  // Get the minimum plan required for a feature
  getRequiredPlanForFeature: (feature: keyof PlanFeatures): 'PRO' | 'ENTERPRISE' | null => {
    // Feature to plan mapping
    const featurePlanMap: Record<keyof PlanFeatures, 'PRO' | 'ENTERPRISE'> = {
      csvExport: 'PRO',
      pdfExport: 'PRO',
      emailReports: 'ENTERPRISE',
      apiAccess: 'ENTERPRISE',
      prioritySupport: 'ENTERPRISE',
    };

    return featurePlanMap[feature] || null;
  },

  // Reset store
  reset: () => {
    set({
      plans: [],
      myPlan: null,
      usage: null,
      isPricingEnabled: false,
      isLoading: false,
      isPlansLoading: false,
      error: null,
    });
  },
}));
