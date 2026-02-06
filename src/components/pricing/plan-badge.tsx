'use client';

import { Zap, Sparkles, Building2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
  planName: 'FREE' | 'PRO' | 'ENTERPRISE';
  isGrandfathered?: boolean;
  size?: 'sm' | 'md';
}

const planConfig = {
  FREE: {
    icon: Zap,
    label: 'Free',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  PRO: {
    icon: Sparkles,
    label: 'Pro',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  ENTERPRISE: {
    icon: Building2,
    label: 'Enterprise',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
};

export function PlanBadge({ planName, isGrandfathered, size = 'sm' }: PlanBadgeProps) {
  const config = planConfig[planName];
  const Icon = isGrandfathered ? Crown : config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>{isGrandfathered ? 'Grandfathered' : config.label}</span>
    </div>
  );
}
