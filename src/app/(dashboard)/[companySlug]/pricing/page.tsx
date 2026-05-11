'use client';

import { useEffect, useState } from 'react';
import { Check, Xmark as X, Thunderbolt as Zap, House as Building2, Sparkles, CrownDiamond as Crown } from '@gravity-ui/icons';
import { Button, Switch } from '@heroui/react';
import { usePricingStore, Plan } from '@/stores/pricingStore';
import { usePageTitle } from '@/hooks/use-page-title';

const planIcons = {
  FREE: Zap,
  PRO: Sparkles,
  ENTERPRISE: Building2,
};

const featureLabels: Record<string, string> = {
  csvExport: 'CSV Dışa Aktarma',
  pdfExport: 'PDF Dışa Aktarma',
  emailReports: 'E-posta Raporları',
  apiAccess: 'API Erişimi',
  prioritySupport: 'Öncelikli Destek',
};

function formatPrice(price: number): string {
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function PlanColumn({
  plan,
  isCurrentPlan,
  isYearly,
  onSelect,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  isYearly: boolean;
  onSelect: () => void;
}) {
  const Icon = planIcons[plan.name];
  const price = isYearly ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquivalent = isYearly ? plan.priceYearly / 12 : plan.priceMonthly;

  const accentBg =
    plan.name === 'FREE'
      ? 'bg-default'
      : plan.name === 'PRO'
        ? 'bg-accent/10 text-accent'
        : 'bg-success/10 text-success';

  return (
    <div
      className={`flex flex-col border-r border-border bg-surface last:border-r-0 ${
        plan.name === 'PRO' ? 'bg-accent/5' : ''
      }`}
    >
      <div className="relative border-b border-border p-4 text-center">
        {plan.name === 'PRO' && (
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Popüler
            </span>
          </div>
        )}
        {isCurrentPlan && (
          <div className="absolute right-2 top-2">
            <span className="rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
              Mevcut
            </span>
          </div>
        )}

        <div
          className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full ${accentBg}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <h3 className="text-lg font-bold">{plan.displayName}</h3>

        <div className="mt-2">
          <span className="text-2xl font-bold">
            {price === 0 ? '0' : formatPrice(monthlyEquivalent)}
          </span>
          <span className="text-sm text-muted"> TL/ay</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-success" />
          <span>
            <strong>{plan.storeLimit}</strong> Mağaza
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-success" />
          <span>
            <strong>{plan.refreshInterval}</strong> dk güncelleme
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-success" />
          <span>
            <strong>{plan.historyDays}</strong> gün geçmiş veri
          </span>
        </div>

        <hr className="border-border" />

        {Object.entries(featureLabels).map(([key, label]) => {
          const hasFeature = plan.features[key as keyof typeof plan.features];
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              {hasFeature ? (
                <Check className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-muted/40" />
              )}
              <span className={hasFeature ? '' : 'text-muted'}>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-4">
        <Button
          fullWidth
          variant={
            isCurrentPlan ? 'outline' : plan.name === 'PRO' ? 'primary' : 'outline'
          }
          isDisabled={isCurrentPlan}
          onPress={onSelect}
        >
          {isCurrentPlan ? 'Mevcut Planınız' : 'Planı Seç'}
        </Button>
      </div>
    </div>
  );
}

function PlanSkeleton() {
  return null;
}

export default function PricingPage() {
  usePageTitle('Planlar');

  const [isYearly, setIsYearly] = useState(false);
  const {
    plans,
    myPlan,
    usage,
    isLoading: isMyPlanLoading,
    isPlansLoading,
    fetchPlans,
    fetchMyPlan,
    fetchUsage,
    requestUpgrade,
  } = usePricingStore();

  useEffect(() => {
    fetchPlans();
    fetchMyPlan();
    fetchUsage();
  }, [fetchPlans, fetchMyPlan, fetchUsage]);

  const handleSelectPlan = async (planName: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    if (planName === myPlan?.plan.name) return;
    await requestUpgrade(planName);
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">Planlar</h1>
        </div>
        <div className="flex items-center gap-3">
          {usage && (
            <div className="flex items-center gap-2 rounded-full bg-default px-3 py-1.5 text-sm">
              <span>
                Kullanım: <strong>{usage.storeCount}</strong> /{' '}
                {usage.storeLimit === 999 ? '∞' : usage.storeLimit}
              </span>
              {usage.isNearLimit && !usage.isAtLimit && (
                <span className="rounded bg-warning/15 px-1.5 py-0.5 text-xs text-warning-foreground">
                  Limite Yakın
                </span>
              )}
              {usage.isAtLimit && (
                <span className="rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">
                  Limit Doldu
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className={`text-sm ${!isYearly ? 'font-medium' : 'text-muted'}`}>
              Aylık
            </span>
            <Switch
              isSelected={isYearly}
              onChange={setIsYearly}
              aria-label="Yıllık fatura"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
            <span className={`text-sm ${isYearly ? 'font-medium' : 'text-muted'}`}>
              Yıllık
            </span>
            {isYearly && (
              <span className="rounded bg-success/15 px-1.5 py-0.5 text-xs text-success">
                %17 Tasarruf
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-border md:grid-cols-3">
        {isPlansLoading || isMyPlanLoading ? (
          <>
            <PlanSkeleton />
            <PlanSkeleton />
            <PlanSkeleton />
          </>
        ) : (
          plans.map((plan) => (
            <PlanColumn
              key={plan.id}
              plan={plan}
              isCurrentPlan={myPlan?.plan.name === plan.name}
              isYearly={isYearly}
              onSelect={() => handleSelectPlan(plan.name)}
            />
          ))
        )}
      </div>

      <div className="px-4 py-3 text-center text-sm text-muted">
        <p>
          Tüm planlar 14 gün ücretsiz deneme içerir. İstediğiniz zaman iptal
          edebilirsiniz.
        </p>
      </div>
    </>
  );
}
