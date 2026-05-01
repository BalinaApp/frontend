'use client';

import { Store, ArrowUpRight } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Modal } from '@heroui/react';

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
  const router = useRouter();
  const params = useParams();
  const companySlug = params.companySlug as string;

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(`/${companySlug}/pricing`);
  };

  return (
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
                Planları Gör
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
