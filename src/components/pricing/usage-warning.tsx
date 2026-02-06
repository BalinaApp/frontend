'use client';

import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  // Don't show if not near or at limit
  if (!isNearLimit && !isAtLimit) return null;

  // Don't show for unlimited plans
  if (storeLimit === 999) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 text-sm',
        isAtLimit
          ? 'bg-red-50 text-red-700 border-b border-red-100'
          : 'bg-yellow-50 text-yellow-700 border-b border-yellow-100',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {isAtLimit ? (
            <>
              Mağaza limitinize ulaştınız ({storeCount}/{storeLimit})
            </>
          ) : (
            <>
              Mağaza limitinize yaklaşıyorsunuz ({storeCount}/{storeLimit})
            </>
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 text-xs',
          isAtLimit ? 'hover:bg-red-100' : 'hover:bg-yellow-100'
        )}
        onClick={() => router.push(`/${companySlug}/pricing`)}
      >
        Plan Yükselt
        <ArrowUpRight className="ml-1 h-3 w-3" />
      </Button>
    </div>
  );
}
