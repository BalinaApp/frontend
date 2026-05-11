'use client';

import * as React from 'react';
import { Switch } from '@heroui/react';

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
    <Switch
      isSelected={value}
      onChange={handleChange}
      isDisabled={disabled || pending}
      aria-label={ariaLabel}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}
