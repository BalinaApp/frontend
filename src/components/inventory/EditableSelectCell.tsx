'use client';

import * as React from 'react';
import { ChevronDown, Check } from '@gravity-ui/icons';
import { Dropdown } from '@/components/ui';

interface Option {
  value: string;
  label: string;
}

interface EditableSelectCellProps<TVal extends string | number | null> {
  value: TVal;
  options: Option[];
  /** value → option.value dönüşümü (örn. number → "20"). null/undefined → 'none'. */
  toKey: (v: TVal) => string;
  /** option.value → kaydedilecek değer (örn. "20" → 20). 'none' → null/undefined. */
  fromKey: (key: string) => TVal;
  onSave: (next: TVal) => Promise<boolean>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Hücrede kompakt seçim — tıklayınca dropdown popover açılır, seçim sonrası
 * onSave çağrılır. Optimistic update store tarafında yapılır; hata olursa
 * rollback olur ve burada hiçbir şey değişmez.
 */
export function EditableSelectCell<TVal extends string | number | null>({
  value,
  options,
  toKey,
  fromKey,
  onSave,
  placeholder = '—',
  className,
  disabled = false,
}: EditableSelectCellProps<TVal>) {
  const [open, setOpen] = React.useState(false);
  const currentKey = toKey(value);
  const current = options.find((o) => o.value === currentKey);

  const handleSelect = async (key: string) => {
    setOpen(false);
    if (key === currentKey) return;
    await onSave(fromKey(key));
  };

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Dropdown.Trigger
        isDisabled={disabled}
        className={[
          'inline-flex h-7 max-w-full items-center gap-1 rounded-md px-2 text-left transition-colors',
          disabled ? 'cursor-default' : 'hover:bg-surface-secondary/60',
          className ?? '',
        ].join(' ')}
      >
        <span className="truncate text-sm text-foreground">
          {current?.label ?? placeholder}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[160px] overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col py-1">
          {options.map((opt) => {
            const isSelected = opt.value === currentKey;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className="flex items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-secondary"
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
            );
          })}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
