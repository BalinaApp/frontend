'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@heroui/react';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { api } from '@/services/api';

/** Public unsubscribe page. JWT yok — token URL'de.
 *  Backend `GET /marketing/unsubscribe/:token` ile kontak email'i alınır,
 *  `POST /marketing/unsubscribe/:token` ile aboneliğin iptal edildiği
 *  onaylanır. */
export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{
        email: string;
        firstName: string | null;
        lastName: string | null;
        alreadyUnsubscribed: boolean;
      }>(`/marketing/unsubscribe/${token}`)
      .then((res) => {
        if (cancelled) return;
        setEmail(res.data.email);
        setFirstName(res.data.firstName);
        setAlreadyUnsubscribed(res.data.alreadyUnsubscribed);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Geçersiz veya süresi dolmuş link.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await api.post(`/marketing/unsubscribe/${token}`);
      setDone(true);
    } catch {
      setError('İşlem başarısız, tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-black/[0.04] p-4">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-5 rounded-2xl bg-surface p-6 shadow-[0_0_8px_-2px_rgba(0,0,0,0.04)]">
        <BalinaOsMark width={56} height={56} aria-label="balinaOS" />

        {loading ? (
          <div className="text-sm text-muted">Yükleniyor…</div>
        ) : error ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">
              Geçersiz link
            </h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </div>
        ) : done || alreadyUnsubscribed ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">
              Aboneliğiniz iptal edildi
            </h1>
            <p className="mt-2 text-sm text-muted">
              Artık {email} adresine pazarlama maili gönderilmeyecek.
              Tekrar abone olmak istersen herhangi bir sipariş sonrası
              otomatik olarak listeye dahil edilirsin.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-lg font-semibold text-foreground">
              Mailing servisinden çıkmak ister misiniz?
            </h1>
            <p className="mt-2 text-sm text-muted">
              {firstName ? `Merhaba ${firstName},` : 'Merhaba,'} aboneliğinizi
              iptal etmek üzeresiniz. Bundan sonra{' '}
              <span className="font-medium text-foreground">{email}</span>{' '}
              adresine pazarlama maili gönderilmeyecek.
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                variant="primary"
                onPress={confirm}
                isPending={submitting}
                isDisabled={submitting}
                fullWidth
              >
                Evet, aboneliği iptal et
              </Button>
              <Button
                variant="tertiary"
                onPress={() => window.close()}
                fullWidth
              >
                Vazgeç
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
