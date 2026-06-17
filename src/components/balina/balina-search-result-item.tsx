'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina SearchResultItem — kaynak .SearchResultItem_* spec'inin portu.
 * İkon + başlık + opsiyonel komut-rozeti (pill) + sağda aksiyon etiketi. */

export interface BalinaSearchResultItemProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  pill?: React.ReactNode;
  action?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function BalinaSearchResultItem({
  icon,
  title,
  pill,
  action,
  active,
  onClick,
}: BalinaSearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? '' : undefined}
      className={cn(
        'relative flex h-10 w-full cursor-pointer select-none items-center gap-3 rounded-[0.625rem] px-3 py-1.5 text-left',
        'transition-colors duration-100',
        active
          ? 'bg-[var(--balina-background-dark-muted)]'
          : 'hover:bg-[var(--balina-background-dark-muted)]',
      )}
    >
      {icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center overflow-hidden">
        <span className="text-body-mail truncate text-[var(--balina-text-loud)]">
          {title}
        </span>
        {pill && (
          <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--balina-background-dark-muted)] px-1.5 py-0.5">
            {pill}
          </span>
        )}
      </span>
      {action && (
        <span className="text-body-small-regular flex min-w-14 shrink-0 items-center justify-end text-[var(--balina-text-muted)]">
          {action}
        </span>
      )}
    </button>
  );
}
