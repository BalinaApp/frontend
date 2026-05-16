'use client';

import { useState } from 'react';
import { UpgradePlanModal } from './upgrade-plan-modal';

interface UsageWarningProps {
  /** Subscription on_trial ise true. trial countdown butonu render edilir. */
  isOnTrial?: boolean;
  /** Trial bitişine kalan gün — Math.ceil ile yukarı yuvarlanmış pozitif tam sayı. */
  trialDaysLeft?: number;
  /** Trial progress 0..1 — geçen sürenin oranı (start→end). */
  trialProgress?: number;
  /** Aktif plan label'ı — "Pro", "Enterprise" gibi. */
  trialPlanLabel?: string;
  /** Limit/yaklaşma — trial dışındaki kullanıcılar için "Plan Yükselt" pillinin tetikleyicisi. */
  isAtLimit?: boolean;
  isNearLimit?: boolean;
  className?: string;
}

/**
 * Bottom strip pill. AI fab ile aynı yükseklikte (h-8) hizalanır.
 * - Trial aktif: gri pill içinde circular progress ring + kalan gün +
 *   "{Plan} Plan (Deneme Süreci)" etiketi.
 * - Trial dışı, limit dolu/yakın: chroma-border-upgrade'li "Plan Yükselt" pill.
 * Her iki click de UpgradePlanModal açar.
 */
export function UsageWarning({
  isOnTrial,
  trialDaysLeft,
  trialProgress = 0,
  trialPlanLabel = 'Pro',
  isAtLimit,
  isNearLimit,
  className,
}: UsageWarningProps) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  if (isOnTrial && typeof trialDaysLeft === 'number' && trialDaysLeft > 0) {
    // Circular progress — SVG stroke-dashoffset hesabı.
    const radius = 8;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - trialProgress);

    return (
      <>
        <button
          type="button"
          onClick={() => setIsUpgradeOpen(true)}
          aria-label={`${trialPlanLabel} Plan (Deneme Süreci) — ${trialDaysLeft} gün kaldı`}
          className={[
            'chroma-border-upgrade',
            'flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-1.5 pr-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-black/[0.04] hover:text-foreground',
            className ?? '',
          ].join(' ')}
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <svg
              className="absolute inset-0"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <circle
                cx="10"
                cy="10"
                r={radius}
                stroke="rgba(0,0,0,0.10)"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="10"
                cy="10"
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 10 10)"
              />
            </svg>
            <span className="relative z-10 text-[9px] font-semibold tabular-nums">
              {trialDaysLeft}
            </span>
          </span>
          <span>{trialPlanLabel} Plan (Deneme Süreci)</span>
        </button>
        <UpgradePlanModal isOpen={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
      </>
    );
  }

  if (isAtLimit || isNearLimit) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsUpgradeOpen(true)}
          className={[
            'chroma-border-upgrade',
            'flex h-8 cursor-pointer items-center rounded-full px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-black/[0.04] hover:text-foreground',
            className ?? '',
          ].join(' ')}
        >
          Plan Yükselt
        </button>
        <UpgradePlanModal isOpen={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
      </>
    );
  }

  return null;
}
