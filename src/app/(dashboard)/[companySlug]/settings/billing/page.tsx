'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  Star,
} from '@gravity-ui/icons';
import { AlertDialog, Avatar, Button, toast } from '@heroui/react';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { userDisplayName } from '@/lib/user-display';
import { UpgradePlanModal } from '@/components/pricing/upgrade-plan-modal';

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Ücretsiz',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

const STATUS_LABELS: Record<string, string> = {
  on_trial: 'Deneme süresi',
  active: 'Aktif',
  paused: 'Duraklatıldı',
  past_due: 'Vadesi geçmiş',
  unpaid: 'Ödenmemiş',
  cancelled: 'İptal edildi',
  expired: 'Süresi doldu',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function BillingSettingsPage() {
  usePageTitle('Abonelik');

  const router = useRouter();
  const { user } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';
  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const {
    subscription,
    isLoading,
    isMutating,
    fetchCurrent,
    cancel,
    resume,
  } = useSubscriptionStore();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const planTitle = useMemo(() => {
    if (subscription) return PLAN_LABELS[subscription.planType] ?? subscription.planType;
    return user?.plan?.displayName || PLAN_LABELS.FREE;
  }, [subscription, user]);

  // Subscription aktifse/trial'daysa Planı Yükselt butonu gizlenmeli — kullanıcı
  // zaten paralı plan'da.
  const isOnPaidPlan =
    !!subscription &&
    (subscription.status === 'active' || subscription.status === 'on_trial') &&
    subscription.planType !== 'FREE';

  const statusLabel = subscription ? STATUS_LABELS[subscription.status] : null;
  const cycleLabel =
    subscription?.billingCycle === 'YEARLY'
      ? 'Yıllık'
      : subscription?.billingCycle === 'MONTHLY'
        ? 'Aylık'
        : null;

  const renewalLine = useMemo(() => {
    if (!subscription) return 'Ücretli plana geçerek tüm özelliklere erişin.';
    if (subscription.status === 'on_trial' && subscription.trialEndsAt) {
      return `Deneme ${formatDate(subscription.trialEndsAt)} tarihinde sona eriyor.`;
    }
    if (subscription.status === 'cancelled' && subscription.endsAt) {
      return `${formatDate(subscription.endsAt)} tarihinde sona erecek. O tarihe kadar tam erişim devam eder.`;
    }
    if (subscription.renewsAt) {
      return `${formatDate(subscription.renewsAt)} tarihinde otomatik yenilenir.`;
    }
    return STATUS_LABELS[subscription.status] ?? '';
  }, [subscription]);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const handleCancelConfirm = async () => {
    setIsCancelDialogOpen(false);
    const ok = await cancel();
    if (ok) toast.success('Abonelik iptal edildi');
    else toast.danger('İptal başarısız');
  };

  const handleResume = async () => {
    const ok = await resume();
    if (ok) toast.success('Abonelik devam ettiriliyor');
    else toast.danger('İşlem başarısız');
  };

  const showCancel =
    subscription &&
    (subscription.status === 'active' || subscription.status === 'on_trial');
  const showResume = subscription && subscription.status === 'cancelled';

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Abonelik</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Avatar */}
          <Avatar className="h-[116px] w-[116px] rounded-full">
            <Avatar.Fallback className="rounded-full bg-zinc-500 text-3xl font-semibold text-white">
              {userInitial}
            </Avatar.Fallback>
          </Avatar>

          {/* Name + email */}
          <div className="flex w-full flex-col items-center gap-1">
            <h3 className="text-xl font-semibold text-foreground">
              {userDisplayName(user)}
            </h3>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>

          {/* Plan + actions card */}
          <div className="flex w-full flex-col rounded-xl bg-surface">
            <div className="flex items-center gap-3 border-b border-black/[0.04] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
                <Star className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {planTitle}
                  </span>
                  {statusLabel && (
                    <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                      {statusLabel}
                    </span>
                  )}
                  {cycleLabel && (
                    <span className="text-[10px] font-medium text-muted">
                      · {cycleLabel}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {isLoading ? 'Yükleniyor…' : renewalLine}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeOpen(true)}
                className="flex h-8 items-center gap-1 rounded-full bg-foreground/[0.06] px-3 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.10]"
              >
                {isOnPaidPlan ? 'Plan Değiştir' : 'Planı Yükselt'}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Payment + Invoices */}
            <button
              type="button"
              onClick={() => router.push(`/${slug}/settings/billing/payment`)}
              className="flex cursor-pointer items-center gap-3 border-b border-black/[0.04] p-3 text-left"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    Ödeme Detayları
                  </span>
                  <span className="text-xs text-muted">
                    Kart bilgilerinizi LemonSqueezy üzerinden yönetin.
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted" />
            </button>

            <button
              type="button"
              onClick={() => router.push(`/${slug}/settings/billing/invoices`)}
              className="flex cursor-pointer items-center gap-3 p-3 text-left"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    Faturalar
                  </span>
                  <span className="text-xs text-muted">
                    Fatura geçmişiniz ve PDF indirme.
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted" />
            </button>
          </div>

          {/* Cancel / resume */}
          {(showCancel || showResume) && (
            <div className="flex w-full justify-center gap-2">
              {showCancel && (
                <Button
                  variant="tertiary"
                  onPress={() => setIsCancelDialogOpen(true)}
                  isDisabled={isMutating}
                  className="h-8 cursor-pointer rounded-full bg-black/[0.06] px-3 text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
                >
                  Aboneliği iptal et
                </Button>
              )}
              {showResume && (
                <Button
                  variant="primary"
                  onPress={handleResume}
                  isDisabled={isMutating}
                  className="h-8 cursor-pointer rounded-full px-3"
                >
                  İptali geri al
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <UpgradePlanModal
        isOpen={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
      />

      <AlertDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning" />
                <AlertDialog.Heading>Aboneliği iptal et</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Aboneliği iptal etmek istediğinize emin misiniz? Dönem sonuna
                  kadar tam erişim devam eder, sonrasında plan FREE&apos;ye düşer.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" slot="close" isDisabled={isMutating}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={handleCancelConfirm}
                  isPending={isMutating}
                >
                  Aboneliği iptal et
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
