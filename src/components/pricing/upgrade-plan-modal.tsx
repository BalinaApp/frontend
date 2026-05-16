'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from '@gravity-ui/icons';
import { Button, Modal, toast } from '@heroui/react';
import { usePricingStore, type Plan } from '@/stores/pricingStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { LemonCheckoutModal } from './lemon-checkout-modal';

type Cycle = 'MONTHLY' | 'YEARLY';

const featureLabels: Record<string, string> = {
  csvExport: 'CSV dışa aktarma',
  pdfExport: 'PDF dışa aktarma',
  emailReports: 'E-posta raporları',
  apiAccess: 'API erişimi',
  prioritySupport: 'Öncelikli destek',
};

function formatTRY(value: number | string, fractionDigits = 0): string {
  // Prisma Decimal alanları JSON üzerinden string olarak geliyor — Number'a
  // cast etmezsek toLocaleString grouping uygulamıyor.
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function buildBenefits(plan: Plan): string[] {
  const items: string[] = [];
  items.push(
    plan.storeLimit === 999
      ? 'Sınırsız mağaza'
      : `${plan.storeLimit} mağazaya kadar bağlantı`,
  );
  items.push(`${plan.refreshInterval} dk veri yenileme`);
  items.push(`${plan.historyDays} gün geçmiş veri`);
  for (const [key, label] of Object.entries(featureLabels)) {
    if (plan.features?.[key as keyof typeof plan.features]) {
      items.push(label);
    }
  }
  return items;
}

interface UpgradePlanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  description?: string;
  defaultPlan?: 'PRO' | 'ENTERPRISE';
}

/**
 * Figma node 12299:13180 — glassmorphic upgrade modal.
 * 496px sabit genişlik, rgba beyaz fill + backdrop blur, body padding 24px.
 * Aylık/Yıllık toggle ve seçili plan kartı + "Neler dahil" listesi.
 */
export function UpgradePlanModal({
  isOpen,
  onOpenChange,
  description = 'Daha fazla mağaza, hızlı veri yenileme ve gelişmiş özelliklerle BalinaOS deneyiminizi büyütün.',
  defaultPlan = 'PRO',
}: UpgradePlanModalProps) {
  const { plans, fetchPlans, myPlan } = usePricingStore();
  const createCheckout = useSubscriptionStore((s) => s.createCheckout);
  const isMutating = useSubscriptionStore((s) => s.isMutating);
  const previewChangePlan = useSubscriptionStore((s) => s.previewChangePlan);
  const changePlan = useSubscriptionStore((s) => s.changePlan);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const [cycle, setCycle] = useState<Cycle>('YEARLY');
  const [selectedPlanName, setSelectedPlanName] = useState<'PRO' | 'ENTERPRISE'>(
    defaultPlan,
  );
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const syncFromLemon = useSubscriptionStore((s) => s.syncFromLemon);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchCurrent);
  const [preview, setPreview] = useState<{
    isUpgrade: boolean;
    currentPrice: number;
    newPrice: number;
    remainingCredit: number;
    netCharge: number;
    effectiveAt: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && plans.length === 0) {
      fetchPlans();
    }
  }, [isOpen, plans.length, fetchPlans]);

  // Modal açıldığında LS ile sync et — DB'de yoksa ama LS'de varsa
  // 'Plan Değiştir' akışına girilir (PATCH), yanlışlıkla yeni checkout açmaz.
  useEffect(() => {
    if (!isOpen) return;
    // Sub state belirsizse veya yoksa LS'den çek; başarısız olursa sessiz fail.
    syncFromLemon().catch(() => {
      // sessiz — modal yine de açılır, sadece sub durumu sync edilmemiş kalır.
    });
  }, [isOpen, syncFromLemon]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) setSelectedPlanName(defaultPlan);
  }, [isOpen, defaultPlan]);

  const selectedPlan = useMemo<Plan | null>(
    () => plans.find((p) => p.name === selectedPlanName) ?? null,
    [plans, selectedPlanName],
  );

  const yearlyDiscountPct = useMemo(() => {
    if (!selectedPlan) return 0;
    const fullYear = selectedPlan.priceMonthly * 12;
    if (!fullYear || selectedPlan.priceYearly >= fullYear) return 0;
    return Math.round(((fullYear - selectedPlan.priceYearly) / fullYear) * 100);
  }, [selectedPlan]);

  // Cycle'a göre gösterilecek net fiyat: aylık → priceMonthly, yıllık → priceYearly.
  const displayPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    return cycle === 'YEARLY' ? selectedPlan.priceYearly : selectedPlan.priceMonthly;
  }, [selectedPlan, cycle]);

  const benefits = useMemo(
    () => (selectedPlan ? buildBenefits(selectedPlan) : []),
    [selectedPlan],
  );
  // Aktif planı subscription'tan oku — myPlan ile out-of-sync olabiliyor.
  // Subscription LS'in canonical state'i; myPlan ise feature gating için
  // user.planId üzerinden gelir ve webhook gecikmesinden etkilenir.
  const isCurrentPlan =
    !!subscription &&
    subscription.planType === selectedPlanName &&
    subscription.billingCycle === cycle;
  // Aktif (paid) subscription varsa Plan Değiştir akışı; yoksa yeni checkout.
  const hasActiveSubscription =
    !!subscription &&
    (subscription.status === 'active' || subscription.status === 'on_trial' || subscription.status === 'past_due');
  const modalTitle = hasActiveSubscription ? 'Plan Değiştir' : 'Plan Yükselt';

  // Plan Değiştir akışı: seçim değiştikçe backend'den prorated preview iste.
  useEffect(() => {
    if (!isOpen || !hasActiveSubscription || isCurrentPlan) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const p = await previewChangePlan(selectedPlanName, cycle);
      if (!cancelled) setPreview(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    hasActiveSubscription,
    isCurrentPlan,
    selectedPlanName,
    cycle,
    previewChangePlan,
  ]);

  const handleUpgrade = async () => {
    if (!selectedPlan || isCurrentPlan) return;

    // Aktif subscription varsa → plan değişimi (LS PATCH proration).
    if (hasActiveSubscription) {
      const ok = await changePlan(selectedPlan.name, cycle);
      if (ok) {
        if (preview?.isUpgrade) {
          const credit = preview.remainingCredit > 0
            ? ` Mevcut planınızdan kalan ₺${formatTRY(preview.remainingCredit)} kredi düşürülerek ₺${formatTRY(preview.netCharge)} tahsil edildi.`
            : ' Prorated tutar kart üzerinden tahsil edildi.';
          toast.success(
            `${selectedPlan.displayName} planına yükseltildi.${credit}`,
          );
        } else {
          const effectiveDate = preview?.effectiveAt
            ? new Date(preview.effectiveAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'sonraki yenileme';
          // Default variant (siyah icon + siyah text) — info accent rengi yerine.
          toast(
            `${selectedPlan.displayName} planı ${effectiveDate} tarihinde devreye girer. Mevcut dönem için ödenen tutar iade edilmez, o tarihe kadar tam erişim devam eder.`,
          );
        }
        onOpenChange(false);
      } else {
        toast.danger('Plan değişimi başarısız');
      }
      return;
    }

    // Aboneliği yok → yeni checkout.
    const url = await createCheckout(selectedPlan.name, cycle);
    if (!url) {
      toast.danger('Ödeme sayfası açılamadı, lütfen tekrar deneyin');
      return;
    }
    setCheckoutUrl(url);
    onOpenChange(false);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    toast.success('Ödemeniz alındı, abonelik aktive ediliyor…');
    try {
      const synced = await syncFromLemon();
      if (synced) {
        toast.success('Aboneliğiniz aktif!');
      } else {
        toast.info('Abonelik henüz LS tarafında görünmüyor, biraz sonra tekrar deneyin.');
        await fetchSubscription();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Senkronizasyon başarısız';
      // Genelde "variant ID eşleşmedi" — admin müdahalesi gerekir.
      toast.danger(msg);
      await fetchSubscription();
    }
  };

  // Toggle stil — Figma'da Switch Toggle [1.0]; active state bg-black/4, default transparent.
  const toggleClass = (active: boolean) =>
    [
      'rounded-[4px] px-1 py-1 text-[12px] font-medium leading-[1.333] transition-colors',
      active ? 'bg-black/[0.04] text-black' : 'text-black/60 hover:text-black/80',
    ].join(' ');

  return (
    <>
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog
            className="sm:max-w-[496px] !rounded-[12px] !bg-white/[0.24] !shadow-[0_8px_32px_-2px_rgba(0,0,0,0.16)] backdrop-blur-[40px]"
          >
            <Modal.CloseTrigger />

            {/* Header + body unified — Figma layout_4HAZKT: column, padding 24px, gap 12px */}
            <div className="flex flex-col gap-3 p-6">
              {/* Inner column — gap 24px */}
              <div className="flex flex-col gap-6">
                {/* Header text block */}
                <div className="flex flex-col gap-3">
                  <h2 className="text-[18px] font-medium leading-[1.333] tracking-[-0.015em] text-black">
                    {modalTitle}
                  </h2>
                  <p className="text-[14px] font-normal leading-[1.428] tracking-[-0.006em] text-black">
                    {description}
                  </p>
                </div>

                {/* Plans toggle — Figma Frame 2: padding 10, border 1 rgba(0,0,0,0.02), radius 10 */}
                <div className="flex items-center justify-between gap-2.5 rounded-[10px] border border-black/[0.02] p-2.5">
                  <span className="text-[16px] font-medium leading-[1.5] tracking-[-0.011em] text-black">
                    Planlar
                  </span>
                  <div className="flex items-center gap-1 rounded-[8px] bg-white/[0.56] p-1">
                    <button
                      type="button"
                      onClick={() => setCycle('MONTHLY')}
                      className={toggleClass(cycle === 'MONTHLY')}
                    >
                      <span className="px-1">Aylık</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycle('YEARLY')}
                      className={toggleClass(cycle === 'YEARLY')}
                    >
                      <span className="px-1">Yıllık</span>
                    </button>
                  </div>
                </div>

                {/* Plan switcher — segmented control: tek container içinde
                    sliding active. Mevcut plan "Mevcut" rozetiyle işaretli. */}
                {plans.filter((p) => p.name !== 'FREE').length > 0 && (
                  <div className="flex items-center gap-1 rounded-full bg-black/[0.04] p-1">
                    {plans
                      .filter((p) => p.name !== 'FREE')
                      .map((p) => {
                        const active = selectedPlanName === p.name;
                        const isCurrent = subscription?.planType === p.name;
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() =>
                              setSelectedPlanName(p.name as 'PRO' | 'ENTERPRISE')
                            }
                            className={[
                              'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition-all',
                              active
                                ? 'bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.05)]'
                                : 'text-black/55 hover:text-black/80',
                            ].join(' ')}
                          >
                            <span>{p.displayName}</span>
                            {isCurrent && (
                              <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                                Mevcut
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Plan card — Figma Frame 3 + plan değişimi durumunda prorated
                    fiyat ve açıklama notu kart içinde gösterilir. */}
                {(() => {
                  const showProration =
                    hasActiveSubscription && !isCurrentPlan && preview;
                  const hasNetDiscount =
                    showProration &&
                    preview?.isUpgrade &&
                    preview.remainingCredit > 0 &&
                    preview.netCharge < preview.newPrice;
                  const PLAN_DISPLAY: Record<string, string> = {
                    FREE: 'Free',
                    PRO: 'Pro',
                    ENTERPRISE: 'Enterprise',
                  };
                  const currentCycleLabel =
                    subscription?.billingCycle === 'YEARLY' ? 'Yıllık' : 'Aylık';
                  const newCycleLabel = cycle === 'YEARLY' ? 'Yıllık' : 'Aylık';
                  const currentPlanLabel =
                    PLAN_DISPLAY[subscription?.planType ?? 'PRO'] ?? 'Pro';
                  const newPlanLabel = selectedPlan?.displayName ?? 'Pro';
                  const samePlan = subscription?.planType === selectedPlanName;
                  const sameCycle = subscription?.billingCycle === cycle;
                  const effectiveDateLabel = preview?.effectiveAt
                    ? new Date(preview.effectiveAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <div className="flex flex-col gap-2.5 rounded-[10px] border border-black/[0.02] bg-white/[0.56] p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[16px] font-medium leading-[1.5] tracking-[-0.011em] text-black">
                          {selectedPlan?.displayName ?? 'Pro'}
                        </span>
                        {isCurrentPlan && (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                            Mevcut Planınız
                          </span>
                        )}
                        {hasNetDiscount && (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                            Prorated
                          </span>
                        )}
                        {cycle === 'YEARLY' &&
                          yearlyDiscountPct > 0 &&
                          !isCurrentPlan &&
                          !hasNetDiscount && (
                            <span className="rounded-full bg-black/[0.04] px-1 py-0.5">
                              <span className="px-1 text-[12px] font-medium leading-[1.333] text-black/60">
                                -%{yearlyDiscountPct} İndirim
                              </span>
                            </span>
                          )}
                      </div>

                      {hasNetDiscount && preview ? (
                        <div className="flex items-baseline gap-3">
                          <span
                            className="text-[18px] font-medium leading-[1.25] text-black/40 line-through tabular-nums"
                            style={{
                              fontFamily: 'Helvetica Neue, Inter, sans-serif',
                            }}
                          >
                            ₺{formatTRY(preview.newPrice)}
                          </span>
                          <span
                            className="text-[32px] font-medium leading-[1.25] tabular-nums text-black"
                            style={{
                              fontFamily: 'Helvetica Neue, Inter, sans-serif',
                            }}
                          >
                            ₺{formatTRY(preview.netCharge)}
                          </span>
                          <span className="px-1 py-0.5 text-[12px] font-medium leading-[1.333] text-black/60">
                            {cycle === 'YEARLY' ? '/ yıl' : '/ ay'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[32px] font-medium leading-[1.25] tabular-nums text-black"
                            style={{
                              fontFamily: 'Helvetica Neue, Inter, sans-serif',
                            }}
                          >
                            ₺{formatTRY(displayPrice)}
                          </span>
                          <span className="px-1 py-0.5 text-[12px] font-medium leading-[1.333] text-black/60">
                            {cycle === 'YEARLY' ? '/ yıl' : '/ ay'}
                          </span>
                        </div>
                      )}

                      {/* Not — proration/downgrade açıklaması */}
                      {showProration && preview && (
                        <p className="pt-1 text-[12px] leading-[1.4] text-black/60">
                          {preview.isUpgrade ? (
                            hasNetDiscount ? (
                              <>
                                <strong>{currentPlanLabel} {currentCycleLabel}</strong>
                                &apos;dan kalan{' '}
                                <strong>
                                  ₺{formatTRY(preview.remainingCredit)}
                                </strong>{' '}
                                kredi düşürüldü. Sonraki yenilemede tam ücret
                                tahsil edilir.
                              </>
                            ) : (
                              <>
                                Yükseltme onaylandığında prorated tutar kart
                                üzerinden tahsil edilir.
                              </>
                            )
                          ) : samePlan && !sameCycle ? (
                            <>
                              Mevcut <strong>{currentCycleLabel}</strong> döneminiz{' '}
                              <strong>{effectiveDateLabel}</strong> tarihinde sona
                              erdiğinde plan <strong>{newCycleLabel}</strong> olarak
                              yenilenir. Ödenen tutar iade edilmez, o tarihe kadar
                              tam erişim devam eder.
                            </>
                          ) : (
                            <>
                              <strong>
                                {newPlanLabel} {newCycleLabel}
                              </strong>{' '}
                              planı <strong>{effectiveDateLabel}</strong> tarihinde
                              devreye girer. Mevcut dönem için ödenen tutar iade
                              edilmez, o tarihe kadar tam erişim devam eder.
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* What's included — Figma Frame 1 (inner): gap 12 */}
                <div className="flex flex-col gap-3">
                  <span className="text-[14px] font-normal leading-[1.428] tracking-[-0.006em] text-black">
                    Neler dahil
                  </span>
                  <div className="flex flex-col gap-2.5 rounded-[10px] border border-black/[0.02] p-4">
                    {benefits.map((b) => (
                      <div key={b} className="flex items-center gap-3">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-[0.6px] ring-[#009A51]">
                          <Check className="h-2.5 w-2.5 text-[#009A51]" />
                        </span>
                        <span className="text-[14px] font-normal leading-[1.428] tracking-[-0.006em] text-black">
                          {b}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — tek aksiyon butonu. Modal'ın sağ üst X'i (CloseTrigger)
                zaten kapatma sağladığı için ayrı "Kapat" butonu kaldırıldı. */}
            <div className="flex items-center justify-end px-6 py-4">
              <Button
                variant="primary"
                fullWidth
                isDisabled={!selectedPlan || isCurrentPlan || isMutating}
                isPending={isMutating}
                onPress={handleUpgrade}
              >
                {isCurrentPlan
                  ? 'Mevcut Planınız'
                  : hasActiveSubscription
                    ? preview?.isUpgrade
                      ? `${selectedPlan?.displayName ?? 'Pro'}'a Yükselt`
                      : `${selectedPlan?.displayName ?? 'Pro'}'a Geç`
                    : `${selectedPlan?.displayName ?? 'Pro'}'ya Geç`}
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>

    {/* LemonSqueezy checkout — iframe overlay; upgrade modal'dan ayrı tutuluyor
        ki parent modal kapansa bile iframe modal mount'ta kalsın. */}
    <LemonCheckoutModal
      url={checkoutUrl}
      isOpen={isCheckoutOpen}
      onOpenChange={setIsCheckoutOpen}
      onSuccess={handleCheckoutSuccess}
    />
    </>
  );
}
