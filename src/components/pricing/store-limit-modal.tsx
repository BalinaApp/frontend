'use client';

import { Store, ArrowUpRight } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Store className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">Mağaza Limitine Ulaştınız</DialogTitle>
          <DialogDescription className="text-center">
            Mevcut planınızda maksimum <strong>{limit}</strong> mağaza ekleyebilirsiniz.
            Şu anda <strong>{currentCount}</strong> mağazanız var.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Daha fazla mağaza eklemek için planınızı yükseltin ve işletmenizi büyütün.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Vazgeç
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpgrade}
          >
            Planları Gör
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
