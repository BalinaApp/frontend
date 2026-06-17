'use client';

import * as React from 'react';
import { BalinaSwitch } from '@/components/balina';

interface EditableSwitchCellProps {
  value: boolean;
  onSave: (next: boolean) => Promise<boolean>;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Tablo hücresinde Switch — değişim anında onSave çağırır.
 * Optimistic update store tarafında; backend hata verirse rollback olur ve
 * state buradan otomatik senkronlanır.
 */
export function EditableSwitchCell({
  value,
  onSave,
  ariaLabel,
  disabled = false,
}: EditableSwitchCellProps) {
  const [pending, setPending] = React.useState(false);
  const handleChange = async (next: boolean) => {
    if (pending) return;
    setPending(true);
    try {
      await onSave(next);
    } finally {
      setPending(false);
    }
  };

  return (
    <BalinaSwitch
      checked={value}
      onCheckedChange={handleChange}
      disabled={disabled || pending}
    >
      {ariaLabel ? <span className="sr-only">{ariaLabel}</span> : undefined}
    </BalinaSwitch>
  );
}
