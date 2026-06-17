'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/components/ui/cn';
import { BalinaTooltip } from './balina-tooltip';

/* Balina Popover — kaynak .Tab_tabInfoPreview spec'i tarzı önizleme kartı
 * (Radix Popover üzerine, balina token'larıyla). */

export interface BalinaPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Açılışta içeriğe otomatik odaklanmayı engeller (tetikleyici tooltip'i
   *  açılır açılmaz görünmesin diye). */
  noAutoFocus?: boolean;
  /** Tetikleyici üzerine gelince gösterilecek tooltip metni. */
  tooltip?: React.ReactNode;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function BalinaPopover({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  open,
  onOpenChange,
  noAutoFocus,
  tooltip,
  tooltipSide = 'top',
  className,
}: BalinaPopoverProps) {
  // Tooltip + Popover.Trigger asChild iç içe: tooltip dıştan trigger'ı sarar,
  // Popover.Trigger asChild butona ref aktarır (Slot kompozisyonu).
  const triggerNode = tooltip ? (
    <BalinaTooltip content={tooltip} side={tooltipSide}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    </BalinaTooltip>
  ) : (
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
  );
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {triggerNode}
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={6}
          onOpenAutoFocus={noAutoFocus ? (e) => e.preventDefault() : undefined}
          className={cn(
            'z-[999999] max-w-[17rem] rounded-2xl p-3.5 shadow-elevation-medium outline-none',
            'bg-[var(--balina-background-light-shout)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-100',
            className,
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Önizleme içeriği — başlık + sağda meta + 2 satır gövde (kaynak tabInfoPreview). */
export function BalinaPopoverPreview({
  title,
  meta,
  body,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  body?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-small-medium truncate text-[var(--balina-text-shout)]">
          {title}
        </span>
        {meta && (
          <span className="text-body-small-regular shrink-0 text-[var(--balina-text-muted)]">
            {meta}
          </span>
        )}
      </div>
      {body && (
        <span className="text-body-small-regular line-clamp-2 text-[var(--balina-text-muted)]">
          {body}
        </span>
      )}
    </div>
  );
}
