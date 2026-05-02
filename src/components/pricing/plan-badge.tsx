'use client';

import { Zap, Sparkles, Building2, Crown } from 'lucide-react';

interface PlanBadgeProps {
  planName: 'FREE' | 'PRO' | 'ENTERPRISE';
  isGrandfathered?: boolean;
  size?: 'sm' | 'md';
}

const planConfig = {
  FREE: {
    icon: Zap,
    label: 'Free',
    className: 'bg-default text-foreground border-border',
  },
  PRO: {
    icon: Sparkles,
    label: 'Pro',
    className: 'bg-accent/15 text-accent border-accent/30',
  },
  ENTERPRISE: {
    icon: Building2,
    label: 'Enterprise',
    className: 'bg-success/15 text-success border-success/30',
  },
};

export function PlanBadge({ planName, isGrandfathered, size = 'sm' }: PlanBadgeProps) {
  const config = planConfig[planName];
  const Icon = isGrandfathered ? Crown : config.icon;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${sizeClass}`}
    >
      <Icon className={iconSize} />
      <span>{isGrandfathered ? 'Grandfathered' : config.label}</span>
    </div>
  );
}
