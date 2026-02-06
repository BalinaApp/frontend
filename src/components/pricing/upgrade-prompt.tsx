'use client';

import { useState } from 'react';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setShowModal(true)}
        >
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
      <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/30">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{featureLabel}</h3>
        <p className="text-muted-foreground text-center text-sm mb-4">
          Bu özellik <span className="font-medium text-primary">{planLabel}</span> planında kullanılabilir.
        </p>
        <Button onClick={() => setShowModal(true)} className="gap-2">
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
