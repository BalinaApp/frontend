'use client';

import { useState } from 'react';
import { Xmark } from '@gravity-ui/icons';
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  toast,
} from '@/components/ui';
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
        <TextField
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (error) setError(null);
          }}
          isInvalid={!!error}
          isRequired
          autoFocus
        >
          <Label>E-posta</Label>
          <Input
            placeholder="ornek@adres.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
          {error && <FieldError>{error}</FieldError>}
        </TextField>

        <div className="grid grid-cols-2 gap-2">
          <TextField value={firstName} onChange={setFirstName}>
            <Label>Ad</Label>
            <Input placeholder="Ad" />
          </TextField>
          <TextField value={lastName} onChange={setLastName}>
            <Label>Soyad</Label>
            <Input placeholder="Soyad" />
          </TextField>
        </div>

        <TextField value={phone} onChange={setPhone}>
          <Label>Telefon (opsiyonel)</Label>
          <Input placeholder="+90 ..." />
        </TextField>

        <p className="text-xs text-muted">
          Manuel eklenen kontaklar <code>source=&quot;manual&quot;</code>{' '}
          olarak işaretlenir. Aboneliği iptal ederseler tekrar mail
          alamayacaklar.
        </p>
      </div>

      {/* Sticky footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-foreground/[0.06] px-4 py-3">
        <Button variant="tertiary" onPress={onClose} isDisabled={isSaving}>
          Vazgeç
        </Button>
        <Button
          variant="primary"
          onPress={submit}
          isPending={isSaving}
          isDisabled={isSaving || !email.trim()}
        >
          Ekle
        </Button>
      </div>
    </div>
  );
}
