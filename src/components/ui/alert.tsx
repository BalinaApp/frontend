'use client';

import * as React from 'react';
import { cn } from './cn';

/* HeroUI v3 Alert drop-in — status + compound Indicator/Content/Title/Description. */

type AlertStatus = 'accent' | 'success' | 'warning' | 'danger';

const statusClasses: Record<AlertStatus, string> = {
  accent: 'bg-accent-soft text-foreground',
  success: 'bg-success/10 text-foreground',
  warning: 'bg-warning/10 text-foreground',
  danger: 'bg-danger-soft text-foreground',
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: AlertStatus;
}

function AlertRoot({ status = 'accent', className, ...rest }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl p-3 text-sm',
        statusClasses[status],
        className,
      )}
      {...rest}
    />
  );
}

function Indicator({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('mt-0.5 shrink-0', className)} {...rest} />;
}

function Content({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-0.5', className)} {...rest} />;
}

function Title({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('font-medium', className)} {...rest} />;
}

function Description({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-muted', className)} {...rest} />;
}

export const Alert = Object.assign(AlertRoot, {
  Indicator,
  Content,
  Title,
  Description,
});
