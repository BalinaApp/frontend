'use client';

import { useState } from 'react';
import { ShoppingBag as Store, ArrowUpRight } from '@gravity-ui/icons';
import { BalinaButton, BalinaModal } from '@/components/balina';
import { UpgradePlanModal } from './upgrade-plan-modal';

interface StoreLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCount: number;
  limit: number;
}

export function StoreLimitModal({
  open,
  onOpenChange,
  currentCount,
  limit,
}: StoreLimitModalProps) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const handleUpgrade = () => {
    onOpenChange(false);
    setIsUpgradeOpen(true);
  };

  return (
    <>
      <BalinaModal
        open={open}
        onOpenChange={onOpenChange}
        title="Mağaza Limitine Ulaştınız"
        titleIcon={<Store className="size-5" />}
        footer={
          <>
            <BalinaButton
              variant="soft"
              size="large"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Vazgeç
            </BalinaButton>
            <BalinaButton
              variant="primary"
              size="large"
              onClick={handleUpgrade}
              className="flex-1"
              rightIcon={<ArrowUpRight className="h-4 w-4" />}
            >
              Planı Yükselt
            </BalinaButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Mevcut planınızda maksimum <strong>{limit}</strong> mağaza ekleyebilirsiniz.
            Şu anda <strong>{currentCount}</strong> mağazanız var.
          </p>
          <div className="rounded-lg bg-surface-secondary p-4 text-center">
            <p className="text-sm text-muted">
              Daha fazla mağaza eklemek için planınızı yükseltin ve işletmenizi büyütün.
            </p>
          </div>
        </div>
      </BalinaModal>

      <UpgradePlanModal isOpen={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </>
  );
}
