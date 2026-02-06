'use client';

import { useRouter } from 'next/navigation';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePricingStore, PlanFeatures } from '@/stores/pricingStore';
import { useCompanyStore } from '@/stores/companyStore';

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

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredPlan,
}: UpgradeModalProps) {
  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const { plans, myPlan } = usePricingStore();

  const handleUpgrade = (planType: 'PRO' | 'ENTERPRISE') => {
    onOpenChange(false);
    if (currentCompany) {
      router.push(`/${currentCompany.slug}/pricing?upgrade=${planType}`);
    }
  };

  const currentPlanName = myPlan?.plan.name || 'FREE';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Planınızı Yükseltin
          </DialogTitle>
          <DialogDescription>
            {feature
              ? `${featureLabels[feature]} özelliğini kullanmak için planınızı yükseltin.`
              : 'Daha fazla özellik ve limit için planınızı yükseltin.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          {/* Pro Plan */}
          <div
            className={`relative rounded-lg border p-4 ${
              requiredPlan === 'PRO'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border'
            }`}
          >
            {requiredPlan === 'PRO' && (
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">
                Önerilen
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Zap className="h-4 w-4 text-blue-500" />
              </div>
              <h3 className="font-semibold">Pro</h3>
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold">99 TL</span>
              <span className="text-muted-foreground text-sm">/ay</span>
            </div>
            <ul className="space-y-2 mb-4">
              {planFeatures.PRO.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={requiredPlan === 'PRO' ? 'default' : 'outline'}
              onClick={() => handleUpgrade('PRO')}
              disabled={currentPlanName === 'PRO' || currentPlanName === 'ENTERPRISE'}
            >
              {currentPlanName === 'PRO' ? 'Mevcut Plan' : 'Pro\'ya Yükselt'}
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div
            className={`relative rounded-lg border p-4 ${
              requiredPlan === 'ENTERPRISE'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border'
            }`}
          >
            {requiredPlan === 'ENTERPRISE' && (
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">
                Önerilen
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-purple-500/10">
                <Crown className="h-4 w-4 text-purple-500" />
              </div>
              <h3 className="font-semibold">Enterprise</h3>
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold">299 TL</span>
              <span className="text-muted-foreground text-sm">/ay</span>
            </div>
            <ul className="space-y-2 mb-4">
              {planFeatures.ENTERPRISE.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={requiredPlan === 'ENTERPRISE' ? 'default' : 'outline'}
              onClick={() => handleUpgrade('ENTERPRISE')}
              disabled={currentPlanName === 'ENTERPRISE'}
            >
              {currentPlanName === 'ENTERPRISE' ? 'Mevcut Plan' : 'Enterprise\'a Yükselt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
