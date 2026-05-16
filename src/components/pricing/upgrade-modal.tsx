'use client';

import { useState } from 'react';
import { Check, Sparkles, Thunderbolt as Zap, CrownDiamond as Crown } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';
import { usePricingStore, PlanFeatures } from '@/stores/pricingStore';
import { UpgradePlanModal } from './upgrade-plan-modal';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: keyof PlanFeatures;
  requiredPlan?: 'PRO' | 'ENTERPRISE' | null;
}

const featureLabels: Record<keyof PlanFeatures, string> = {
  csvExport: 'CSV Dışa Aktarma',
  pdfExport: 'PDF Dışa Aktarma',
  emailReports: 'E-posta Raporları',
  apiAccess: 'API Erişimi',
  prioritySupport: 'Öncelikli Destek',
};

const planFeatures = {
  PRO: [
    '5 mağaza bağlantısı',
    '5 dakikada veri güncelleme',
    '1 yıllık geçmiş veri',
    'CSV dışa aktarma',
    'PDF dışa aktarma',
  ],
  ENTERPRISE: [
    '10 mağaza bağlantısı',
    '1 dakikada veri güncelleme',
    '2 yıllık geçmiş veri',
    'Tüm dışa aktarma seçenekleri',
    'E-posta raporları',
    'API erişimi',
    'Öncelikli destek',
  ],
};

function PlanCard({
  type,
  title,
  price,
  features,
  iconBg,
  Icon,
  isRecommended,
  isCurrent,
  onUpgrade,
}: {
  type: 'PRO' | 'ENTERPRISE';
  title: string;
  price: string;
  features: string[];
  iconBg: string;
  Icon: React.ElementType;
  isRecommended: boolean;
  isCurrent: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div
      className={`relative rounded-lg border p-4 ${
        isRecommended ? 'border-accent ring-2 ring-accent/20' : 'border-border'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-4 rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          Önerilen
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mb-4">
        <span className="text-2xl font-bold">{price}</span>
        <span className="text-sm text-muted">/ay</span>
      </div>
      <ul className="mb-4 flex flex-col gap-2">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>
      <Button
        fullWidth
        variant={isRecommended ? 'primary' : 'outline'}
        onPress={onUpgrade}
        isDisabled={isCurrent}
      >
        {isCurrent
          ? 'Mevcut Plan'
          : type === 'PRO'
            ? "Pro'ya Yükselt"
            : "Enterprise'a Yükselt"}
      </Button>
    </div>
  );
}

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredPlan,
}: UpgradeModalProps) {
  const { myPlan } = usePricingStore();
  const [upgradePlan, setUpgradePlan] = useState<'PRO' | 'ENTERPRISE' | null>(null);

  const handleUpgrade = (planType: 'PRO' | 'ENTERPRISE') => {
    onOpenChange(false);
    setUpgradePlan(planType);
  };

  const currentPlanName = myPlan?.plan.name || 'FREE';

  return (
    <>
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Planınızı Yükseltin
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-4 text-sm text-muted">
                {feature
                  ? `${featureLabels[feature]} özelliğini kullanmak için planınızı yükseltin.`
                  : 'Daha fazla özellik ve limit için planınızı yükseltin.'}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <PlanCard
                  type="PRO"
                  title="Pro"
                  price="99 TL"
                  features={planFeatures.PRO}
                  iconBg="bg-accent/10 text-accent"
                  Icon={Zap}
                  isRecommended={requiredPlan === 'PRO'}
                  isCurrent={
                    currentPlanName === 'PRO' || currentPlanName === 'ENTERPRISE'
                  }
                  onUpgrade={() => handleUpgrade('PRO')}
                />
                <PlanCard
                  type="ENTERPRISE"
                  title="Enterprise"
                  price="299 TL"
                  features={planFeatures.ENTERPRISE}
                  iconBg="bg-success/10 text-success"
                  Icon={Crown}
                  isRecommended={requiredPlan === 'ENTERPRISE'}
                  isCurrent={currentPlanName === 'ENTERPRISE'}
                  onUpgrade={() => handleUpgrade('ENTERPRISE')}
                />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>

    {upgradePlan && (
      <UpgradePlanModal
        isOpen={!!upgradePlan}
        onOpenChange={(open) => !open && setUpgradePlan(null)}
        defaultPlan={upgradePlan}
      />
    )}
    </>
  );
}
