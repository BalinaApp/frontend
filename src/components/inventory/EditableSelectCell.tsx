'use client';

import * as React from 'react';
import { BalinaSelect } from '@/components/balina';

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
  const currentKey = toKey(value);

  const handleSelect = async (key: string) => {
    if (key === currentKey) return;
    await onSave(fromKey(key));
  };

  return (
    <BalinaSelect
      options={options}
      value={currentKey}
      onValueChange={handleSelect}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
