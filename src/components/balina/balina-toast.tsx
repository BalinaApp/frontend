'use client';

import * as React from 'react';
import {
  CircleCheck,
  CircleInfo,
  CircleExclamation,
  TriangleExclamation,
} from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';

/* Balina Toast — kaynak .Toast_* spec'inin portu. Presentational; ikon +
 * metin + sağda opsiyonel aksiyon. Border yok, yalnızca shadow-toast. */

export type BalinaToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface BalinaToastProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: BalinaToastVariant;
}

const VARIANT_ICON: Record<BalinaToastVariant, React.ReactNode> = {
  default: null,
  success: <CircleCheck className="h-4 w-4" />,
  error: <CircleExclamation className="h-4 w-4" />,
  warning: <TriangleExclamation className="h-4 w-4" />,
  info: <CircleInfo className="h-4 w-4" />,
};

const VARIANT_ICON_COLOR: Record<BalinaToastVariant, string> = {
  default: 'var(--balina-icon-strong)',
  success: 'var(--accent-green)',
  error: 'var(--accent-red)',
  warning: 'var(--accent-amber)',
  info: 'var(--accent-blue)',
};

export function BalinaToast({
  icon,
  action,
  variant = 'default',
  className,
  children,
  ...rest
}: BalinaToastProps) {
  const resolvedIcon = icon ?? VARIANT_ICON[variant];
  return (
    <div
      className={cn(
        'flex min-h-9 max-w-[22rem] items-center gap-0.5 rounded-xl p-1 shadow-toast',
        'bg-[var(--balina-background-light-shout)]',
        className,
      )}
      {...rest}
    >
      {resolvedIcon && (
        <span
          className="flex shrink-0 items-center justify-center p-0.5"
          style={{ color: VARIANT_ICON_COLOR[variant] }}
        >
          {resolvedIcon}
        </span>
      )}
      <span className="text-body-small-medium min-w-0 flex-1 break-words px-1 text-[var(--balina-text-loud)]">
        {children}
      </span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}

/** Toast içinde vurgulanmış (kenarlıklı) metin/kısayol bloğu. */
export function BalinaToastHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 items-center justify-center rounded-lg border border-[var(--balina-border-muted)] px-2.5 text-[var(--balina-text-strong)]">
      {children}
    </span>
  );
}
