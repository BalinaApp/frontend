'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina MenuItem — kaynak .MenuItem_* spec'inin portu. Tek satır menü öğesi
 * (ikon + içerik + kısayol/chevron) ayrıca title ve divider varyantları. */

export interface BalinaMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  /** Sağda küçük kısayol rozeti (ör. "K"). */
  shortcut?: React.ReactNode;
  /** Sağda chevron ikonu (alt menü göstergesi). */
  chevron?: React.ReactNode;
  selected?: boolean;
}

export function BalinaMenuItem({
  icon,
  shortcut,
  chevron,
  selected,
  disabled,
  className,
  children,
  ...rest
}: BalinaMenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-selected={selected ? '' : undefined}
      className={cn(
        'group flex w-full select-none items-center justify-between rounded-[0.625rem] p-1 text-left',
        'text-[var(--balina-text-strong)] cursor-pointer outline-none',
        'transition-colors duration-[var(--transition-duration)] ease-[var(--transition-timing-function)]',
        'hover:enabled:bg-[var(--balina-background-dark-muted)] hover:enabled:text-[var(--balina-text-loud)]',
        selected &&
          'bg-[var(--balina-background-dark-muted)] text-[var(--balina-text-loud)]',
        disabled &&
          'pointer-events-none cursor-not-allowed text-[var(--balina-text-faint)]',
        className,
      )}
      {...rest}
    >
      {icon && (
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-strong)]',
            'group-hover:enabled:text-[var(--balina-icon-loud)]',
            selected && 'text-[var(--balina-icon-loud)]',
          )}
        >
          {icon}
        </span>
      )}
      <span className="text-body-small-medium flex-1 truncate px-2 py-0.5">{children}</span>
      {shortcut && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          <span className="text-body-tiny-medium flex h-4 w-4 items-center justify-center rounded text-[var(--balina-text-muted)] bg-[var(--balina-background-dark-muted)]">
            {shortcut}
          </span>
        </span>
      )}
      {chevron && (
        <span className="flex items-center justify-center text-[var(--balina-icon-muted)] group-hover:text-[var(--balina-icon-default)]">
          {chevron}
        </span>
      )}
    </button>
  );
}

/** Menü başlığı (tıklanamaz). */
export function BalinaMenuTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="select-none p-2 text-[var(--balina-text-muted)] text-body-tiny-medium">
      {children}
    </div>
  );
}

/** Menü ayırıcı. */
export function BalinaMenuDivider() {
  return (
    <div className="my-1 h-px w-full bg-[var(--balina-border-muted)]" aria-hidden />
  );
}
