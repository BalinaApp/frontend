'use client';

import { Zap, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProBadgeProps {
  plan: 'PRO' | 'ENTERPRISE';
  size?: 'sm' | 'md';
  className?: string;
  showLock?: boolean;
}

/**
 * ProBadge - Shows a badge indicating which plan is required
 */
export function ProBadge({
  plan,
  size = 'sm',
  className,
  showLock = false,
}: ProBadgeProps) {
  const isPro = plan === 'PRO';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        isPro
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        className
      )}
    >
      {showLock ? (
        <Lock className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      ) : isPro ? (
        <Zap className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      ) : (
        <Crown className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
      {isPro ? 'Pro' : 'Enterprise'}
    </span>
  );
}
