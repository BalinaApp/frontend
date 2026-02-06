'use client';

import { useEffect, useState } from 'react';
import { Check, X, Zap, Building2, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { usePricingStore, Plan } from '@/stores/pricingStore';
import { cn } from '@/lib/utils';

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
  isFirst,
  isLast,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  isYearly: boolean;
  onSelect: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const Icon = planIcons[plan.name];
  const price = isYearly ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquivalent = isYearly ? plan.priceYearly / 12 : plan.priceMonthly;

  return (
    <div
      className={cn(
        'flex flex-col border-r last:border-r-0 bg-card',
        isFirst && 'rounded-l-lg',
        isLast && 'rounded-r-lg',
        plan.name === 'PRO' && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
    >
      {/* Plan Header */}
      <div className="p-4 border-b text-center relative">
        {plan.name === 'PRO' && (
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Popüler
            </span>
          </div>
        )}
        {isCurrentPlan && (
          <div className="absolute top-2 right-2">
            <span className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Mevcut
            </span>
          </div>
        )}

        <div
          className={cn(
            'inline-flex items-center justify-center w-10 h-10 rounded-full mb-2',
            plan.name === 'FREE'
              ? 'bg-gray-100 dark:bg-gray-800'
              : plan.name === 'PRO'
              ? 'bg-blue-100 dark:bg-blue-900'
              : 'bg-purple-100 dark:bg-purple-900'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              plan.name === 'FREE'
                ? 'text-gray-600 dark:text-gray-400'
                : plan.name === 'PRO'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-purple-600 dark:text-purple-400'
            )}
          />
        </div>

        <h3 className="text-lg font-bold">{plan.displayName}</h3>

        <div className="mt-2">
          <span className="text-2xl font-bold">
            {price === 0 ? '0' : formatPrice(monthlyEquivalent)}
          </span>
          <span className="text-muted-foreground text-sm"> TL/ay</span>
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 p-4 space-y-3">
        {/* Store Limit */}
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            <strong>{plan.storeLimit}</strong> Mağaza
          </span>
        </div>

        {/* Refresh Interval */}
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            <strong>{plan.refreshInterval}</strong> dk güncelleme
          </span>
        </div>

        {/* History Days */}
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            <strong>{plan.historyDays}</strong> gün geçmiş veri
          </span>
        </div>

        <hr />

        {/* Plan Features */}
        {Object.entries(featureLabels).map(([key, label]) => {
          const hasFeature = plan.features[key as keyof typeof plan.features];
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              {hasFeature ? (
                <Check className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={hasFeature ? '' : 'text-muted-foreground'}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="p-4 border-t">
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : plan.name === 'PRO' ? 'default' : 'outline'}
          disabled={isCurrentPlan}
          onClick={onSelect}
        >
          {isCurrentPlan ? 'Mevcut Planınız' : 'Planı Seç'}
        </Button>
      </div>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="flex flex-col border-r last:border-r-0">
      <div className="p-4 border-b text-center">
        <Skeleton className="w-10 h-10 rounded-full mx-auto mb-2" />
        <Skeleton className="h-5 w-16 mx-auto mb-2" />
        <Skeleton className="h-8 w-24 mx-auto" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
      <div className="p-4 border-t">
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export default function PricingPage() {
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Planlar</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Usage Badge */}
          {usage && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
              <span>
                Kullanım: <strong>{usage.storeCount}</strong> /{' '}
                {usage.storeLimit === 999 ? '∞' : usage.storeLimit}
              </span>
              {usage.isNearLimit && !usage.isAtLimit && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                  Limite Yakın
                </span>
              )}
              {usage.isAtLimit && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                  Limit Doldu
                </span>
              )}
            </div>
          )}

          {/* Billing Toggle */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm',
                !isYearly ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              Aylık
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span
              className={cn(
                'text-sm',
                isYearly ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              Yıllık
            </span>
            {isYearly && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                %17 Tasarruf
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b">
        {isPlansLoading || isMyPlanLoading ? (
          <>
            <PlanSkeleton />
            <PlanSkeleton />
            <PlanSkeleton />
          </>
        ) : (
          plans.map((plan, index) => (
            <PlanColumn
              key={plan.id}
              plan={plan}
              isCurrentPlan={myPlan?.plan.name === plan.name}
              isYearly={isYearly}
              onSelect={() => handleSelectPlan(plan.name)}
              isFirst={index === 0}
              isLast={index === plans.length - 1}
            />
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 text-center text-sm text-muted-foreground">
        <p>
          Tüm planlar 14 gün ücretsiz deneme içerir. İstediğiniz zaman iptal
          edebilirsiniz.
        </p>
      </div>
    </>
  );
}
