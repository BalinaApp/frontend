'use client';

import { useState } from 'react';
import {
  BalinaButton,
  BalinaCloseIcon,
  BalinaTextField,
  BalinaTooltip,
} from '@/components/balina';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

/** Sağdan açılan "İsim ve soyisim" düzenleme paneli — AI drawer (BalinaChat) ile
 *  birebir aynı chrome: h-12 başlık (balinaOS markası + balina token'lı başlık +
 *  balina-styled kapat), panel-surface gövde, alt aksiyon barı. */
export function ProfileNamePanel({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header — AI paneli (BalinaChat) ile aynı stil. */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-1 border-b border-[var(--balina-background-light-default)] p-2.5">
        <div className="flex h-7 items-center gap-1.5 px-1">
          <BalinaOsMark className="h-5 w-5" aria-label="balinaOS" />
          <span className="text-body-small-one-liner-medium text-[var(--balina-text-strong)]">
            İsim ve soyisim
          </span>
        </div>
        <BalinaTooltip content="Kapat" side="bottom">
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--balina-icon-strong)] outline-none transition-colors hover:bg-[var(--balina-background-dark-default)] hover:text-[var(--balina-icon-loud)] focus-visible:outline-none"
          >
            <BalinaCloseIcon className="h-4 w-4" />
          </button>
        </BalinaTooltip>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <BalinaTextField
          label="Adınız"
          value={name}
          onChange={setName}
          autoFocus
          placeholder="Ad ve soyadınız"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--balina-background-light-default)] p-2.5">
        <BalinaButton variant="soft" size="large" onClick={onClose} disabled={saving}>
          Vazgeç
        </BalinaButton>
        <BalinaButton
          variant="primary"
          size="large"
          onClick={submit}
          disabled={saving || !name.trim()}
        >
          Kaydet
        </BalinaButton>
      </div>
    </div>
  );
}
