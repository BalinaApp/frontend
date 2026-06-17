'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Alert — HeroUI v3 Alert'in balina token'lı portu. Compound API
 * (Indicator/Content/Title/Description) birebir korunur ki migrasyon sadece
 * Alert → BalinaAlert yeniden adlandırması olsun. */

export type BalinaAlertStatus = 'accent' | 'success' | 'warning' | 'danger';

const statusClasses: Record<BalinaAlertStatus, string> = {
  accent:
    'bg-[color-mix(in_oklch,var(--accent-blue)_10%,transparent)] text-[var(--accent-blue)]',
  success:
    'bg-[var(--color-success-soft)] text-[var(--color-success-soft-foreground)]',
  warning:
    'bg-[var(--color-warning-soft)] text-[var(--color-warning-soft-foreground)]',
  danger:
    'bg-[color-mix(in_oklch,var(--accent-red)_12%,transparent)] text-[var(--accent-red)]',
};

interface BalinaAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: BalinaAlertStatus;
}

function AlertRoot({ status = 'accent', className, ...rest }: BalinaAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'text-body-small-one-liner-regular flex items-start gap-2.5 rounded-[0.625rem] p-3',
        statusClasses[status],
        className,
      )}
      {...rest}
    />
  );
}

function Indicator({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('mt-0.5 flex shrink-0 items-center', className)} {...rest} />;
}

function Content({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-col gap-0.5', className)} {...rest} />;
}

function Title({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-body-small-one-liner-medium text-[var(--balina-text-strong)]',
        className,
      )}
      {...rest}
    />
  );
}

function Description({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-[var(--balina-text-muted)]', className)} {...rest} />
  );
}

export const BalinaAlert = Object.assign(AlertRoot, {
  Indicator,
  Content,
  Title,
  Description,
});
