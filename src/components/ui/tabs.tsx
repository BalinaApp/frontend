'use client';

import * as React from 'react';
import * as RTabs from '@radix-ui/react-tabs';
import { cn } from './cn';

/* HeroUI v3 Tabs drop-in — Radix Tabs. Compound: ListContainer/List/Tab/Indicator/Panel. */

interface TabsProps {
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  className?: string;
  children?: React.ReactNode;
}

function TabsRoot({
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  className,
  children,
}: TabsProps) {
  return (
    <RTabs.Root
      value={selectedKey}
      defaultValue={defaultSelectedKey}
      onValueChange={onSelectionChange}
      className={cn('tabs flex flex-col', className)}
    >
      {children}
    </RTabs.Root>
  );
}

function ListContainer({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn('relative', className)}>{children}</div>;
}

function List({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RTabs.List
      className={cn('inline-flex items-center gap-1 rounded-xl bg-default p-1', className)}
    >
      {children}
    </RTabs.List>
  );
}

function Tab({
  id,
  className,
  children,
  isDisabled,
}: {
  id: string;
  className?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
}) {
  return (
    <RTabs.Trigger
      value={id}
      disabled={isDisabled}
      className={cn(
        'relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted outline-none transition-colors',
        'data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </RTabs.Trigger>
  );
}

/** HeroUI sliding-indicator — Radix'te aktiflik data-state ile gösterildiği için
 *  görsel no-op (active tab kendi arka planını taşır). */
function Indicator({ className }: { className?: string }) {
  return <span aria-hidden className={cn('pointer-events-none', className)} />;
}

function Panel({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RTabs.Content value={id} className={cn('outline-none', className)}>
      {children}
    </RTabs.Content>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  ListContainer,
  List,
  Tab,
  Indicator,
  Panel,
});
