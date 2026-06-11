'use client';

import * as React from 'react';
import * as RSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from '@gravity-ui/icons';
import { cn } from './cn';

/* HeroUI v3 Select (+ ListBox option'ları) drop-in — Radix Select üzerine.
 * <Select selectedKey onSelectionChange><Select.Trigger><Select.Value/>
 * <Select.Indicator/></Select.Trigger><Select.Popover><ListBox>
 * <ListBox.Item id textValue>…<ListBox.ItemIndicator/></ListBox.Item>… */

interface SelectProps {
  selectedKey?: string | null;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  isDisabled?: boolean;
  className?: string;
  'aria-label'?: string;
  name?: string;
  children?: React.ReactNode;
}

function SelectRoot({
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  isDisabled,
  className,
  name,
  children,
  ...rest
}: SelectProps) {
  return (
    <RSelect.Root
      value={selectedKey ?? undefined}
      defaultValue={defaultSelectedKey}
      onValueChange={(v) => onSelectionChange?.(v)}
      disabled={isDisabled}
      name={name}
      {...rest}
    >
      <div className={cn('select', className)}>{children}</div>
    </RSelect.Root>
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
    <RSelect.Trigger
      className={cn(
        'select__trigger flex h-10 w-full items-center justify-between gap-2 rounded-field border border-field-border bg-field px-3 text-sm text-field-foreground shadow-field outline-none md:h-9',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/30 disabled:opacity-50',
        'data-[placeholder]:text-field-placeholder',
        className,
      )}
    >
      {children}
    </RSelect.Trigger>
  );
}

function Value({
  placeholder,
  children,
}: {
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return <RSelect.Value placeholder={placeholder}>{children}</RSelect.Value>;
}

function Indicator({ className }: { className?: string }) {
  return (
    <RSelect.Icon className={cn('shrink-0 text-muted', className)}>
      <ChevronDown className="h-4 w-4" />
    </RSelect.Icon>
  );
}

function Popover({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RSelect.Portal>
      <RSelect.Content
        position="popper"
        sideOffset={6}
        className={cn(
          'select__popover z-50 max-h-[--radix-select-content-available-height] min-w-[--radix-select-trigger-width] overflow-hidden outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95',
          className,
        )}
      >
        <RSelect.Viewport data-slot="list-box" className="p-1">
          {children}
        </RSelect.Viewport>
      </RSelect.Content>
    </RSelect.Portal>
  );
}

/* ---------- ListBox ---------- */

function ListBoxRoot({ children }: { className?: string; children?: React.ReactNode }) {
  // Radix Viewport zaten kapsayıcı; ListBox şeffaf geçiş.
  return <>{children}</>;
}

function ListBoxItem({
  id,
  textValue,
  className,
  children,
  isDisabled,
}: {
  id: string;
  textValue?: string;
  className?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
}) {
  return (
    <RSelect.Item
      value={id}
      textValue={textValue}
      disabled={isDisabled}
      data-slot="list-box-item"
      className={cn(
        'list-box-item relative flex min-h-9 w-full cursor-pointer select-none items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-default data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
    >
      <RSelect.ItemText className="sr-only">{textValue}</RSelect.ItemText>
      {children}
    </RSelect.Item>
  );
}

function ListBoxItemIndicator({ className }: { className?: string }) {
  return (
    <RSelect.ItemIndicator
      data-slot="list-box-item-indicator--checkmark"
      className={cn('ml-auto inline-flex h-4 w-4 items-center justify-center', className)}
    >
      <Check className="h-4 w-4" />
    </RSelect.ItemIndicator>
  );
}

export const Select = Object.assign(SelectRoot, {
  Trigger,
  Value,
  Indicator,
  Popover,
});

export const ListBox = Object.assign(ListBoxRoot, {
  Item: ListBoxItem,
  ItemIndicator: ListBoxItemIndicator,
});
