'use client';

import { Zap, Crown, Lock } from 'lucide-react';

interface ProBadgeProps {
  plan: 'PRO' | 'ENTERPRISE';
  size?: 'sm' | 'md';
  className?: string;
  showLock?: boolean;
}

export function ProBadge({
  plan,
  size = 'sm',
  className,
  showLock = false,
}: ProBadgeProps) {
  const isPro = plan === 'PRO';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const toneClass = isPro ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${toneClass} ${sizeClass} ${className ?? ''}`}
    >
      {showLock ? (
        <Lock className={iconSize} />
      ) : isPro ? (
        <Zap className={iconSize} />
      ) : (
        <Crown className={iconSize} />
      )}
      {isPro ? 'Pro' : 'Enterprise'}
    </span>
  );
}
