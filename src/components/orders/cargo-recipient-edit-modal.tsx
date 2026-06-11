'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from '@/components/ui';
import { api } from '@/services/api';

/**
 * Kargo alıcı bilgileri düzeltme modal'ı. Orders list'te "Adres hatalı"
 * rozetine basıldığında açılır.
 *
 * Akış:
 *   1. Open olunca `GET /cargo/recipient/:referenceId` ile mevcut değerleri
 *      ve validation durumunu çeker, form'u prefill eder.
 *   2. Kullanıcı düzeltir, kaydet → `PATCH /cargo/recipient/:referenceId`.
 *   3. onSaved callback (parent re-validate eder ve modal'ı kapatır).
 */
type RecipientPreview = {
  recipient: {
    fullName: string;
    cityName: string;
    districtName: string;
    address: string;
    email: string;
    mobilePhoneNumber: string;
  };
  corrections: Array<{
    field: 'city' | 'district';
    original: string;
    resolved: string;
    kind: 'exact' | 'fuzzy' | 'no-match';
  }>;
  valid: boolean;
  source: 'override' | 'woo';
};

export function CargoRecipientEditModal({
  isOpen,
  onClose,
  companyId,
  referenceId,
  orderNumber,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  referenceId: string;
  orderNumber: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    cityName: '',
    districtName: '',
    address: '',
    email: '',
    mobilePhoneNumber: '',
  });
  const [err, setErr] = useState<string | null>(null);

  // Modal her açılışta fresh GET çek.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const { data } = await api.get<RecipientPreview>(
          `/company/${companyId}/cargo/recipient/${referenceId}`,
        );
        if (cancelled) return;
        setPreview(data);
        setForm({
          fullName: data.recipient.fullName ?? '',
          cityName: data.recipient.cityName ?? '',
          districtName: data.recipient.districtName ?? '',
          address: data.recipient.address ?? '',
          email: data.recipient.email ?? '',
          mobilePhoneNumber: data.recipient.mobilePhoneNumber ?? '',
        });
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { message?: string } } }).response?.data
            ?.message ||
          (e instanceof Error ? e.message : 'Bilgiler çekilemedi');
        setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId, referenceId]);

  const handleSave = async () => {
    // Basit validasyon — backend zaten class-validator ile zorlayacak ama
    // form'da inline mesaj göstermek daha hızlı UX.
    if (!form.fullName.trim()) return setErr('Ad Soyad gerekli');
    if (!form.cityName.trim()) return setErr('İl gerekli');
    if (!form.districtName.trim()) return setErr('İlçe gerekli');
    if (!form.address.trim()) return setErr('Adres gerekli');
    if (!form.email.includes('@')) return setErr('Geçerli e-posta gerekli');
    const phoneDigits = form.mobilePhoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      return setErr('Telefon 10 hane olmalı (5XXXXXXXXX)');
    }

    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/company/${companyId}/cargo/recipient/${referenceId}`, {
        fullName: form.fullName.trim(),
        cityName: form.cityName.trim(),
        districtName: form.districtName.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
        mobilePhoneNumber: phoneDigits,
      });
      toast.success(`#${orderNumber} alıcı bilgileri güncellendi`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { message?: unknown } } })
        .response?.data;
      const msg = data?.message;
      const text = Array.isArray(msg)
        ? msg.map(String).join(', ')
        : typeof msg === 'string'
          ? msg
          : 'Kaydedilemedi';
      setErr(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
            <Modal.Heading>Adresi Düzelt — #{orderNumber}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              MNG kargo için alıcı bilgilerini düzelt. Kaydedince bir sonraki
              etiket basımında bu değerler kullanılacak.
            </p>
            {loading ? (
              <div className="text-sm text-muted">Yükleniyor...</div>
            ) : (
              <>
                {preview && preview.source === 'woo' ? (
                  <div className="rounded-md bg-default px-3 py-2 text-xs text-muted">
                    Mevcut değerler WooCommerce siparişinden alındı. Kaydet
                    butonuna basana kadar değişiklik yapılmaz.
                  </div>
                ) : null}
                {preview?.corrections
                  .filter((c) => c.kind !== 'exact')
                  .map((c, idx) => (
                    <div
                      key={`${c.field}-${idx}`}
                      className={
                        c.kind === 'no-match'
                          ? 'rounded-md bg-warning/10 px-3 py-2 text-xs text-warning'
                          : 'rounded-md bg-accent/10 px-3 py-2 text-xs text-accent-foreground'
                      }
                    >
                      {c.kind === 'no-match'
                        ? `${c.field === 'city' ? 'İl' : 'İlçe'} "${c.original}" tanınmadı — lütfen düzeltin.`
                        : `${c.field === 'city' ? 'İl' : 'İlçe'} "${c.original}" → "${c.resolved}" olarak düzeltildi.`}
                    </div>
                  ))}

                <TextField
                  value={form.fullName}
                  onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
                  isRequired
                >
                  <Label>Ad Soyad</Label>
                  <Input />
                </TextField>

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    value={form.cityName}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, cityName: v.toLocaleUpperCase('tr-TR') }))
                    }
                    isRequired
                  >
                    <Label>İl</Label>
                    <Input placeholder="İSTANBUL" />
                  </TextField>
                  <TextField
                    value={form.districtName}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        districtName: v.toLocaleUpperCase('tr-TR'),
                      }))
                    }
                    isRequired
                  >
                    <Label>İlçe</Label>
                    <Input placeholder="KADIKÖY" />
                  </TextField>
                </div>

                <TextField
                  value={form.address}
                  onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                  isRequired
                >
                  <Label>Açık Adres</Label>
                  <Input placeholder="Mahalle, sokak, no" />
                </TextField>

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    value={form.email}
                    onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                    isRequired
                  >
                    <Label>E-posta</Label>
                    <Input type="email" />
                  </TextField>
                  <TextField
                    value={form.mobilePhoneNumber}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        mobilePhoneNumber: v.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    isRequired
                  >
                    <Label>Cep Telefonu</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="5XXXXXXXXX"
                    />
                  </TextField>
                </div>

                {err ? (
                  <FieldError className="block text-xs text-danger">
                    {err}
                  </FieldError>
                ) : null}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="ghost" isDisabled={saving}>
              İptal
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              isDisabled={loading || saving}
              isPending={saving}
            >
              Kaydet
            </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
