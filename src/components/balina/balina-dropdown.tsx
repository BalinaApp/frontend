'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight, Check } from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';
import { useBalinaScrollbar } from './use-balina-scrollbar';

/* Balina Dropdown — kaynak .Dropdown_* + .MenuItem_* spec'lerinin portu
 * (Radix DropdownMenu üzerine, balina token'larıyla). */

type DropdownSize = 'default' | 'medium' | 'large';

const sizeWidth: Record<DropdownSize, string> = {
  default: 'w-60', // 15rem
  medium: 'w-[15.75rem]',
  large: 'w-80', // 20rem
};

const contentClasses =
  'z-[999999] p-1 rounded-[0.875rem] outline-none shadow-elevation-medium ' +
  'bg-[var(--balina-background-light-shout)] ' +
  'data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95';

const itemClasses =
  'group flex w-full cursor-pointer select-none items-center justify-between rounded-[0.625rem] p-1 text-left outline-none ' +
  'text-[var(--balina-text-strong)] transition-colors duration-[var(--transition-duration)] ' +
  'data-[highlighted]:bg-[var(--balina-background-dark-muted)] data-[highlighted]:text-[var(--balina-text-loud)] ' +
  'data-[disabled]:pointer-events-none data-[disabled]:text-[var(--balina-text-faint)]';

const iconWrap =
  'flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-strong)] ' +
  'group-data-[highlighted]:text-[var(--balina-icon-loud)]';

interface BalinaDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  size?: DropdownSize;
}

export function BalinaDropdown({
  trigger,
  children,
  side = 'bottom',
  align = 'end',
  size = 'default',
}: BalinaDropdownProps) {
  const scrollRef = useBalinaScrollbar<HTMLDivElement>();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          ref={scrollRef}
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            contentClasses,
            sizeWidth[size],
            'max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto balina-scrollbar',
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface BalinaDropdownItemProps {
  icon?: React.ReactNode;
  shortcut?: React.ReactNode;
  /** İkincil alt satır (ör. e-posta). Verilirse iki satırlı zengin öğe olur. */
  subtitle?: React.ReactNode;
  /** Sağda ✓ göstergesi (seçili öğe). */
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

export function BalinaDropdownItem({
  icon,
  shortcut,
  subtitle,
  selected,
  onSelect,
  disabled,
  danger,
  children,
}: BalinaDropdownItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(itemClasses, subtitle && 'items-center')}
    >
      {icon && (
        <span
          className={cn(
            iconWrap,
            danger && 'text-[var(--accent-red)] group-data-[highlighted]:text-[var(--accent-red)]',
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col px-2">
        <span className="text-body-small-medium truncate">{children}</span>
        {subtitle && (
          <span className="text-body-tiny-regular truncate text-[var(--balina-text-muted)]">
            {subtitle}
          </span>
        )}
      </span>
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-loud)]">
          <Check className="h-4 w-4" />
        </span>
      )}
      {!selected && shortcut && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          <span className="text-body-tiny-medium flex h-4 w-4 items-center justify-center rounded text-[var(--balina-text-muted)] bg-[var(--balina-background-dark-muted)]">
            {shortcut}
          </span>
        </span>
      )}
    </DropdownMenu.Item>
  );
}

/** Dropdown bölüm başlığı (tıklanamaz). */
export function BalinaDropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label className="text-body-tiny-medium select-none px-2 py-1.5 text-[var(--balina-text-muted)]">
      {children}
    </DropdownMenu.Label>
  );
}

export function BalinaDropdownSeparator() {
  return (
    <DropdownMenu.Separator className="my-1 h-px w-[calc(100%+0.5rem)] -translate-x-1 bg-[var(--balina-border-muted)]" />
  );
}

/** Alt menü (sub-menu). trigger içeriği + alt content. */
export function BalinaDropdownSub({
  icon,
  label,
  size = 'default',
  children,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  size?: DropdownSize;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={itemClasses}>
        {icon && <span className={iconWrap}>{icon}</span>}
        <span className="text-body-small-medium flex-1 truncate px-2">{label}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-muted)] group-data-[highlighted]:text-[var(--balina-icon-default)]">
          <ChevronRight className="h-4 w-4" />
        </span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          sideOffset={6}
          className={cn(contentClasses, sizeWidth[size])}
        >
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}
