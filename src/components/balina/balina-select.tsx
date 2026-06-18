'use client';

import * as React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from '@gravity-ui/icons';
import { cn } from '@/components/ui/cn';

/* Balina Select — kaynak .Select_selectTrigger* + .Dropdown_selectContent*
 * spec'lerinin portu (Radix Select üzerine, balina token'larıyla). */

export type BalinaSelectSize = 'default' | 'medium' | 'large';

const contentWidth: Record<BalinaSelectSize, string> = {
  default: 'w-60', // 15rem
  medium: 'w-[15.75rem]',
  large: 'w-80', // 20rem
};

export interface BalinaSelectOption {
  value: string;
  label: React.ReactNode;
  /** Açılır listede ad'ın altında gösterilen ikincil açıklama. Trigger'da
   *  gösterilmez (yalnızca `label` Select.Value'a yansır) — taşma olmaz. */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface BalinaSelectProps {
  options: BalinaSelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: React.ReactNode;
  size?: BalinaSelectSize;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

const triggerClasses =
  'group inline-flex max-w-40 cursor-pointer select-none items-center gap-1 rounded-[0.625rem] px-2 py-1 ' +
  'text-body-small-medium text-[var(--balina-text-strong)] outline-none ' +
  'transition-colors duration-[var(--transition-duration)] ' +
  'hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-text-loud)] ' +
  'data-[state=open]:bg-[var(--balina-background-dark-default)] ' +
  'data-[disabled]:pointer-events-none data-[disabled]:text-[var(--balina-text-faint)]';

const contentClasses =
  'z-[999999] max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] ' +
  'overflow-hidden rounded-[0.875rem] p-1 shadow-elevation-medium outline-none ' +
  'bg-[var(--balina-background-light-shout)] ' +
  // Yalnızca açılışta animasyon (hızlı); kapanış anında olur (seçimde gecikme olmasın).
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-100';

const itemClasses =
  'group flex w-full cursor-pointer select-none items-center justify-between rounded-[0.625rem] p-1 outline-none ' +
  'text-[var(--balina-text-strong)] transition-colors duration-[var(--transition-duration)] ' +
  'data-[highlighted]:bg-[var(--balina-background-dark-muted)] data-[highlighted]:text-[var(--balina-text-loud)] ' +
  'data-[disabled]:pointer-events-none data-[disabled]:text-[var(--balina-text-faint)]';

const iconWrap =
  'flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-strong)] ' +
  'group-data-[highlighted]:text-[var(--balina-icon-loud)]';

export function BalinaSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Seçin',
  size = 'default',
  disabled,
  className,
  contentClassName,
}: BalinaSelectProps) {
  return (
    <Select.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger className={cn(triggerClasses, className)}>
        <span className="flex-1 truncate px-1 text-left">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--balina-icon-default)] transition-transform duration-[var(--transition-duration)] group-data-[state=open]:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={cn(contentClasses, contentWidth[size], contentClassName)}
        >
          <Select.Viewport>
            {options.map((opt) => (
              <Select.Item key={opt.value} value={opt.value} disabled={opt.disabled} className={itemClasses}>
                {opt.icon && <span className={iconWrap}>{opt.icon}</span>}
                <span className="flex min-w-0 flex-1 flex-col px-2">
                  {/* Yalnızca ItemText trigger'a (Select.Value) yansır. */}
                  <Select.ItemText asChild>
                    <span className="text-body-small-medium truncate">{opt.label}</span>
                  </Select.ItemText>
                  {opt.description && (
                    <span className="text-[11px] text-[var(--balina-text-muted)] line-clamp-2">
                      {opt.description}
                    </span>
                  )}
                </span>
                <Select.ItemIndicator className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--balina-icon-loud)]">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
