'use client';

import { ReactNode } from 'react';
import { usePricingStore, PlanFeatures } from '@/stores/pricingStore';
import { UpgradePrompt } from './upgrade-prompt';

interface FeatureGateProps {
  /** The feature to check access for */
  feature: keyof PlanFeatures;
  /** Content to render when feature is available */
  children: ReactNode;
  /** Optional fallback when feature is not available (defaults to UpgradePrompt) */
  fallback?: ReactNode;
  /** If true, shows children but disabled */
  showDisabled?: boolean;
}

/**
 * FeatureGate - Conditionally renders content based on feature access
 *
 * @example
 * // Hide content if no access
 * <FeatureGate feature="csvExport">
 *   <ExportButton />
 * </FeatureGate>
 *
 * @example
 * // Show disabled state
 * <FeatureGate feature="csvExport" showDisabled>
 *   <ExportButton />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showDisabled = false,
}: FeatureGateProps) {
  const { hasFeature, getRequiredPlanForFeature, isPricingEnabled } = usePricingStore();

  // If pricing is disabled, show everything
  if (!isPricingEnabled) {
    return <>{children}</>;
  }

  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show disabled state with overlay
  if (showDisabled) {
    const requiredPlan = getRequiredPlanForFeature(feature);
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-lg">
          <UpgradePrompt feature={feature} requiredPlan={requiredPlan} compact />
        </div>
      </div>
    );
  }

  // Show fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredPlan = getRequiredPlanForFeature(feature);
  return <UpgradePrompt feature={feature} requiredPlan={requiredPlan} />;
}
