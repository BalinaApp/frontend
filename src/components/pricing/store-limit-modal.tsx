'use client';

import { useState } from 'react';
import { ShoppingBag as Store, ArrowUpRight } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';
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
      <Modal isOpen={open} onOpenChange={onOpenChange}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-danger/15 text-danger">
                  <Store className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Mağaza Limitine Ulaştınız</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  Mevcut planınızda maksimum <strong>{limit}</strong> mağaza ekleyebilirsiniz.
                  Şu anda <strong>{currentCount}</strong> mağazanız var.
                </p>
                <div className="rounded-lg bg-surface-secondary p-4 text-center">
                  <p className="text-sm text-muted">
                    Daha fazla mağaza eklemek için planınızı yükseltin ve işletmenizi büyütün.
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close" className="flex-1">
                  Vazgeç
                </Button>
                <Button onPress={handleUpgrade} className="flex-1">
                  Planı Yükselt
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <UpgradePlanModal isOpen={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </>
  );
}
