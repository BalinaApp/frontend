'use client';

import { useState } from 'react';
import { Sparkles, Lock, ArrowRight } from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { PlanFeatures } from '@/stores/pricingStore';
import { UpgradeModal } from './upgrade-modal';

interface UpgradePromptProps {
  feature: keyof PlanFeatures;
  requiredPlan: 'PRO' | 'ENTERPRISE' | null;
  compact?: boolean;
}

const featureLabels: Record<keyof PlanFeatures, string> = {
  csvExport: 'CSV Dışa Aktarma',
  pdfExport: 'PDF Dışa Aktarma',
  emailReports: 'E-posta Raporları',
  apiAccess: 'API Erişimi',
  prioritySupport: 'Öncelikli Destek',
};

const planLabels: Record<string, string> = {
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export function UpgradePrompt({
  feature,
  requiredPlan,
  compact = false,
}: UpgradePromptProps) {
  const [showModal, setShowModal] = useState(false);

  const featureLabel = featureLabels[feature];
  const planLabel = requiredPlan ? planLabels[requiredPlan] : 'Pro';

  if (compact) {
    return (
      <>
        <Button variant="outline" size="sm" onPress={() => setShowModal(true)}>
          <Lock className="h-3 w-3" />
          <span>{planLabel} Planı Gerekli</span>
        </Button>
        <UpgradeModal
          open={showModal}
          onOpenChange={setShowModal}
          feature={feature}
          requiredPlan={requiredPlan}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-secondary/30 p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{featureLabel}</h3>
        <p className="mb-4 text-center text-sm text-muted">
          Bu özellik <span className="font-medium text-accent">{planLabel}</span> planında kullanılabilir.
        </p>
        <Button onPress={() => setShowModal(true)}>
          Plan Yükselt
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <UpgradeModal
        open={showModal}
        onOpenChange={setShowModal}
        feature={feature}
        requiredPlan={requiredPlan}
      />
    </>
  );
}
