'use client';

import * as React from 'react';
import * as RTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/components/ui/cn';

/* Balina Tooltip — kaynak .Tooltip_* spec'inin portu (Radix Tooltip üzerine).
 * Kullanım: <BalinaTooltip content="...">{trigger}</BalinaTooltip> */

export interface BalinaTooltipProps {
  content: React.ReactNode;
  size?: 'small' | 'large';
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

export function BalinaTooltip({
  content,
  size = 'small',
  side = 'top',
  delay = 200,
  children,
}: BalinaTooltipProps) {
  return (
    <RTooltip.Provider delayDuration={delay}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            sideOffset={6}
            style={{ color: 'var(--balina-neutral-light-1000)' }}
            className={cn(
              'z-[999999] backdrop-blur-md bg-[var(--balina-neutral-dark-70)]',
              'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95',
              size === 'small'
                ? 'text-body-tiny-medium max-w-[12rem] rounded-md px-2 py-1'
                : 'text-body-small-medium max-w-[80vw] rounded-[0.625rem] px-2.5 py-1.5',
            )}
          >
            {content}
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
