'use client';

import * as React from 'react';
import * as RTooltip from '@radix-ui/react-tooltip';
import { cn } from './cn';

/* HeroUI v3 Tooltip drop-in — Radix Tooltip. Kullanım: <Tooltip delay={0}>{trigger}
 * <Tooltip.Content/></Tooltip>. İlk çocuk(lar) trigger, .Content içerik. */

function Content({
  className,
  children,
  sideOffset = 6,
  ...rest
}: React.ComponentPropsWithoutRef<typeof RTooltip.Content>) {
  return (
    <RTooltip.Portal>
      <RTooltip.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-xs rounded-lg bg-overlay px-2.5 py-1.5 text-xs text-overlay-foreground shadow-md',
          'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95',
          className,
        )}
        {...rest}
      >
        {children}
      </RTooltip.Content>
    </RTooltip.Portal>
  );
}

function Trigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RTooltip.Trigger asChild>
      <span className={cn('inline-flex', className)}>{children}</span>
    </RTooltip.Trigger>
  );
}

interface TooltipProps {
  delay?: number;
  children?: React.ReactNode;
}

function TooltipRoot({ delay = 200, children }: TooltipProps) {
  const arr = React.Children.toArray(children);
  const hasExplicitTrigger = arr.some(
    (c) => React.isValidElement(c) && c.type === Trigger,
  );
  const content = arr.find((c) => React.isValidElement(c) && c.type === Content);
  const rest = arr.filter(
    (c) => !(React.isValidElement(c) && c.type === Content),
  );
  return (
    <RTooltip.Provider delayDuration={delay}>
      <RTooltip.Root>
        {hasExplicitTrigger ? (
          rest
        ) : (
          <RTooltip.Trigger asChild>
            <span className="inline-flex">{rest}</span>
          </RTooltip.Trigger>
        )}
        {content}
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

export const Tooltip = Object.assign(TooltipRoot, { Trigger, Content });
