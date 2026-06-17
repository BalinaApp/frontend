'use client';

import * as React from 'react';
import { Xmark, Plus } from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';

/* Balina TabBar — kaynak .Tab_* spec'inin portu: kapatılabilir, connector'lı
 * tarayıcı-stili sekme şeridi (balina token'larıyla, "define" ismi olmadan).
 * Not: segmented control için ayrı `BalinaTabs` bileşeni vardır. */

export interface BalinaTabBarItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface BalinaTabBarProps {
  items: BalinaTabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Verilirse sekmelerde kapatma (×) butonu görünür. */
  onClose?: (id: string) => void;
  /** Verilirse şeridin sonunda ekleme (+) butonu görünür. */
  onAdd?: () => void;
  className?: string;
}

// Aktif sekme: düz beyaz (seçili değil → şeffaf).
const activeWrapperBg: React.CSSProperties = {
  backgroundColor: 'var(--balina-background-light-shout)',
};

export function BalinaTabBar({
  items,
  activeId,
  onSelect,
  onClose,
  onAdd,
  className,
}: BalinaTabBarProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'relative flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item, i) => {
        const isActive = item.id === activeId;
        const next = items[i + 1];
        // Ayraç kutusu hep var (genişlik sabit → kayma olmaz); yalnızca çizgi
        // aktif sekmenin yanındayken gizlenir.
        const showLine = !!next && item.id !== activeId && next.id !== activeId;

        return (
          <div key={item.id} className="flex items-center">
            <div
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onSelect(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(item.id);
                }
              }}
              style={isActive ? activeWrapperBg : undefined}
              className={cn(
                'group/tab relative flex min-w-[9.5rem] max-w-[11.25rem] cursor-pointer items-center justify-center',
                'rounded-t-[0.625rem] pb-[0.1875rem] transition-colors duration-[var(--transition-duration)]',
                isActive ? 'z-10' : 'bg-transparent',
              )}
            >
              <div
                className={cn(
                  'flex max-h-8 w-full max-w-full items-center gap-1 rounded-[0.625rem] p-1',
                  'transition-colors duration-[var(--transition-duration)]',
                  isActive
                    ? 'bg-transparent'
                    : 'bg-transparent group-hover/tab:bg-[var(--balina-background-dark-default)]',
                )}
              >
                {item.icon && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center p-0.5 text-[var(--balina-icon-strong)]">
                    {item.icon}
                  </span>
                )}
                <span className="pointer-events-none flex min-w-0 flex-1 px-1 py-0.5">
                  <span className="text-body-small-medium w-full select-none truncate text-[var(--balina-text-strong)]">
                    {item.label}
                  </span>
                </span>
                {onClose && (
                  <button
                    type="button"
                    aria-label="Sekmeyi kapat"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(item.id);
                    }}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-0.5 opacity-0',
                      'text-[var(--balina-icon-default)] transition-opacity duration-[var(--transition-duration)]',
                      'hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)]',
                      'group-hover/tab:opacity-100',
                    )}
                  >
                    <Xmark className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {next && (
              <div className="flex min-w-[3px] items-center justify-center px-px">
                <div
                  className={cn(
                    'h-3 w-px rounded-full',
                    showLine ? 'bg-[var(--balina-border-strong)]' : 'bg-transparent',
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      {onAdd && (
        <button
          type="button"
          aria-label="Yeni sekme"
          onClick={onAdd}
          className={cn(
            'z-10 ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            'text-[var(--balina-icon-default)] transition-colors duration-[var(--transition-duration)]',
            'hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)]',
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
