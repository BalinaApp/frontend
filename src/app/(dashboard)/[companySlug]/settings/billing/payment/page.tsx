'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRightFromSquare,
  ChevronLeft,
  CreditCard,
} from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { UpgradePlanModal } from '@/components/pricing/upgrade-plan-modal';
import { LemonCheckoutModal } from '@/components/pricing/lemon-checkout-modal';

const STATUS_LABELS: Record<string, string> = {
  on_trial: 'Deneme süresi',
  active: 'Aktif',
  paused: 'Duraklatıldı',
  past_due: 'Vadesi geçmiş',
  unpaid: 'Ödenmemiş',
  cancelled: 'İptal edildi',
  expired: 'Süresi doldu',
};

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Ücretsiz',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export default function PaymentSettingsPage() {
  usePageTitle('Ödeme Detayları');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const {
    subscription,
    isLoading,
    fetchCurrent,
    getCustomerPortalUrl,
  } = useSubscriptionStore();
  const [isOpening, setIsOpening] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [isPortalOpen, setIsPortalOpen] = useState(false);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const handleOpenPortal = async () => {
    setIsOpening(true);
    // Önce subscription'a bağlı update_payment_method URL — daha hızlı / spesifik.
    const direct = subscription?.urlUpdatePaymentMethod;
    if (direct) {
      setPortalUrl(direct);
      setIsPortalOpen(true);
      setIsOpening(false);
      return;
    }
    const url = await getCustomerPortalUrl();
    setIsOpening(false);
    if (url) {
      setPortalUrl(url);
      setIsPortalOpen(true);
    } else {
      // Abonelik yok → portal yerine plan yükselt modali aç.
      setIsUpgradeOpen(true);
    }
  };

  const planLabel = subscription
    ? PLAN_LABELS[subscription.planType] ?? subscription.planType
    : null;
  const statusLabel = subscription ? STATUS_LABELS[subscription.status] : null;

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings/billing`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Ödeme Detayları</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col gap-3 px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {/* Plan özeti */}
            <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {isLoading
                    ? 'Yükleniyor…'
                    : subscription
                      ? `${planLabel} planı — ${statusLabel}`
                      : 'Aktif abonelik yok'}
                </span>
                <span className="text-xs text-muted">
                  Kart bilgileri PCI uyumluluğu nedeniyle LemonSqueezy
                  tarafında yönetilir.
                </span>
              </div>
            </div>

            {/* Portal redirect */}
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={isOpening || isLoading}
              className="flex cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-black/[0.02] disabled:cursor-default disabled:opacity-60"
            >
              <span className="flex-1 text-sm font-medium text-foreground/85">
                {isOpening ? 'Açılıyor…' : 'Ödeme yöntemini güncelle'}
              </span>
              <ArrowUpRightFromSquare className="h-4 w-4 text-muted" />
            </button>
          </div>
        </div>
      </div>

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        description="Ödeme yöntemini güncellemek için önce bir abonelik başlatmanız gerekiyor."
      />

      <LemonCheckoutModal
        url={portalUrl}
        isOpen={isPortalOpen}
        onOpenChange={setIsPortalOpen}
        onSuccess={fetchCurrent}
      />
    </>
  );
}
