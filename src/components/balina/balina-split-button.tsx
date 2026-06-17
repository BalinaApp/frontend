'use client';

import * as React from 'react';
import { ChevronDown } from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';
import { BalinaDropdown } from './balina-dropdown';

/* Balina SplitButton — kaynak .PaneEmailsComposerActions_composerSplitButton* +
 * .buttonGroup spec'inin portu. Ana aksiyon (sol) + bitişik chevron tetikleyici
 * (sağ, 32×32, sol kenarda ince ayraç). chevron'a `menuContent` verilirse
 * Balina Dropdown açar; verilmezse `onMenuClick` çağrılır. */

export type BalinaSplitButtonVariant = 'primary' | 'soft';

export interface BalinaSplitButtonProps {
  children: React.ReactNode;
  onMainClick?: () => void;
  onMenuClick?: () => void;
  /** Verilirse chevron bir Balina Dropdown açar (onMenuClick yok sayılır). */
  menuContent?: React.ReactNode;
  leftIcon?: React.ReactNode;
  menuIcon?: React.ReactNode;
  variant?: BalinaSplitButtonVariant;
  disabled?: boolean;
  /** Chevron butonu için erişilebilirlik etiketi. */
  menuLabel?: string;
  className?: string;
}

const btnBase =
  'inline-flex items-center justify-center cursor-pointer border-none select-none whitespace-nowrap ' +
  'transition-all duration-[var(--transition-duration)] ease-[var(--transition-timing-function)] ' +
  'disabled:bg-[var(--balina-background-dark-faint)] disabled:text-[var(--balina-text-faint)] ' +
  'disabled:cursor-not-allowed disabled:pointer-events-none';

const variantClasses: Record<BalinaSplitButtonVariant, string> = {
  primary:
    'bg-[var(--balina-neutral-dark-90)] text-[var(--balina-neutral-light-100)] ' +
    'hover:enabled:bg-[var(--balina-neutral-dark-100)]',
  soft:
    'bg-[var(--balina-background-dark-default)] text-[var(--balina-text-strong)] ' +
    'hover:enabled:bg-[var(--balina-background-dark-strong)] hover:enabled:text-[var(--balina-text-loud)]',
};

// Sağ butonun sol kenarındaki ayraç: koyu (primary) zeminde açık çizgi, açık zeminde koyu.
const dividerClasses: Record<BalinaSplitButtonVariant, string> = {
  primary: 'border-l border-[var(--balina-neutral-light-8)]',
  soft: 'border-l border-[var(--balina-border-strong)]',
};

export function BalinaSplitButton({
  children,
  onMainClick,
  onMenuClick,
  menuContent,
  leftIcon,
  menuIcon,
  variant = 'primary',
  disabled,
  menuLabel = 'Daha fazla',
  className,
}: BalinaSplitButtonProps) {
  const menuButton = (
    <button
      type="button"
      disabled={disabled}
      aria-label={menuLabel}
      onClick={menuContent ? undefined : onMenuClick}
      className={cn(
        btnBase,
        variantClasses[variant],
        'h-8 w-8 shrink-0 rounded-l-none rounded-r-lg',
        dividerClasses[variant],
      )}
    >
      {menuIcon ?? <ChevronDown className="h-4 w-4" />}
    </button>
  );

  return (
    <div className={cn('inline-flex items-center', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={onMainClick}
        className={cn(btnBase, variantClasses[variant], 'h-8 rounded-l-lg rounded-r-none px-2 py-1')}
      >
        <span className="text-body-small-one-liner-medium inline-flex items-center gap-1">
          {leftIcon && (
            <span className="flex shrink-0 items-center justify-center">{leftIcon}</span>
          )}
          {children}
        </span>
      </button>
      {menuContent ? <BalinaDropdown trigger={menuButton}>{menuContent}</BalinaDropdown> : menuButton}
    </div>
  );
}
