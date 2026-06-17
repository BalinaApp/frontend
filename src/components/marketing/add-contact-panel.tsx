'use client';

import { useState } from 'react';
import { Xmark } from '@gravity-ui/icons';
import { BalinaButton, BalinaTextField, toast } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useMarketingStore } from '@/stores/marketingStore';

/** Sağdan açılan kontak ekleme drawer'ı — orders detail drawer ile aynı
 *  düzen (header + body + sticky footer). useSidePanel ile mount edilir. */
export function AddContactPanel({ onClose }: { onClose: () => void }) {
  const { currentCompany } = useCompanyStore();
  const createContact = useMarketingStore((s) => s.createContact);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!currentCompany?.id) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Geçerli bir e-posta girin');
      return;
    }
    setIsSaving(true);
    setError(null);
    const created = await createContact(currentCompany.id, {
      email: normalizedEmail,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setIsSaving(false);
    if (created) {
      toast.success('Kontak eklendi');
      onClose();
    } else {
      setError(useMarketingStore.getState().error ?? 'Eklenemedi');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header — drawer üst şeridi, close butonu sağda. */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-foreground/[0.06] px-4">
        <h2 className="text-sm font-medium text-foreground">Yeni kontak</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Paneli kapat"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <Xmark className="h-4 w-4" />
        </button>
      </div>

      {/* Body — form alanları. */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <BalinaTextField
          label="E-posta"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (error) setError(null);
          }}
          error={error || undefined}
          placeholder="ornek@adres.com"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <BalinaTextField
            label="Ad"
            value={firstName}
            onChange={setFirstName}
            placeholder="Ad"
          />
          <BalinaTextField
            label="Soyad"
            value={lastName}
            onChange={setLastName}
            placeholder="Soyad"
          />
        </div>

        <BalinaTextField
          label="Telefon (opsiyonel)"
          value={phone}
          onChange={setPhone}
          placeholder="+90 ..."
        />

        <p className="text-xs text-muted">
          Manuel eklenen kontaklar <code>source=&quot;manual&quot;</code>{' '}
          olarak işaretlenir. Aboneliği iptal ederseler tekrar mail
          alamayacaklar.
        </p>
      </div>

      {/* Sticky footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-foreground/[0.06] px-4 py-3">
        <BalinaButton
          variant="soft"
          size="large"
          onClick={onClose}
          disabled={isSaving}
        >
          Vazgeç
        </BalinaButton>
        <BalinaButton
          variant="primary"
          size="large"
          onClick={submit}
          disabled={isSaving || !email.trim()}
        >
          Ekle
        </BalinaButton>
      </div>
    </div>
  );
}
