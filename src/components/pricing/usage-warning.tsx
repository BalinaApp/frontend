'use client';

import { TriangleExclamation as AlertTriangle, ArrowUpRight } from '@gravity-ui/icons';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@heroui/react';

interface UsageWarningProps {
  storeCount: number;
  storeLimit: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  className?: string;
}

export function UsageWarning({
  storeCount,
  storeLimit,
  isAtLimit,
  isNearLimit,
  className,
}: UsageWarningProps) {
  const router = useRouter();
  const params = useParams();
  const companySlug = params.companySlug as string;

  if (!isNearLimit && !isAtLimit) return null;
  if (storeLimit === 999) return null;

  const baseClass =
    'flex items-center justify-between border-b px-4 py-2 text-sm';
  const stateClass = isAtLimit
    ? 'bg-danger/10 text-danger border-danger/20'
    : 'bg-warning/10 text-warning-foreground border-warning/20';

  return (
    <div className={[baseClass, stateClass, className].filter(Boolean).join(' ')}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {isAtLimit ? (
            <>Mağaza limitinize ulaştınız ({storeCount}/{storeLimit})</>
          ) : (
            <>Mağaza limitinize yaklaşıyorsunuz ({storeCount}/{storeLimit})</>
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onPress={() => router.push(`/${companySlug}/pricing`)}
      >
        Plan Yükselt
        <ArrowUpRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
