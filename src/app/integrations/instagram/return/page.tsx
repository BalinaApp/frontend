'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import { useInstagramIntegrationStore } from '@/stores/instagramIntegrationStore';

/** Meta OAuth callback'ten sonra balinaOS'a redirect olur ve burası açılır.
 *  sessionStorage'dan companyId + storeId + state'i okur, status polling ile
 *  bağlantının tamamlanmasını bekler. Tamam olunca Sohbetler / Setup'a
 *  yönlendirir. */
export default function InstagramReturnPage() {
  const [status, setStatus] = useState<
    'idle' | 'polling' | 'completed' | 'failed'
  >('idle');
  const [message, setMessage] = useState('Bağlantı doğrulanıyor…');
  const [account, setAccount] = useState<{
    accountId: string;
    username: string;
  } | null>(null);
  const [redirectHref, setRedirectHref] = useState<string | null>(null);
  const getAuthStatus = useInstagramIntegrationStore((s) => s.getAuthStatus);

  useEffect(() => {
    const companyId = sessionStorage.getItem('igAuthCompanyId');
    const storeId = sessionStorage.getItem('igAuthStoreId');
    const state = sessionStorage.getItem('igAuthState');
    const slug = sessionStorage.getItem('igAuthSlug');

    if (!companyId || !storeId || !state) {
      setStatus('failed');
      setMessage(
        'Oturum bilgisi bulunamadı. Bu sekmeyi kapatıp tekrar deneyin.',
      );
      return;
    }

    setRedirectHref(slug ? `/${slug}/conversations/setup` : null);
    setStatus('polling');

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~ 40 * 1.5s = 60sn

    const poll = async () => {
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        attempts++;
        const result = await getAuthStatus(companyId, storeId, state);
        if (cancelled) return;
        if (!result) {
          await delay(1500);
          continue;
        }
        if (result.status === 'completed' && result.instagram) {
          setAccount(result.instagram);
          setStatus('completed');
          setMessage('Instagram başarıyla bağlandı.');
          // Temizlik
          sessionStorage.removeItem('igAuthCompanyId');
          sessionStorage.removeItem('igAuthStoreId');
          sessionStorage.removeItem('igAuthState');
          sessionStorage.removeItem('igAuthSlug');
          return;
        }
        if (result.status === 'failed') {
          setStatus('failed');
          setMessage(result.error ?? 'Bağlantı başarısız oldu');
          return;
        }
        await delay(1500);
      }
      if (!cancelled) {
        setStatus('failed');
        setMessage(
          'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.',
        );
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [getAuthStatus]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-white/80 p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
        <BalinaOsMark className="h-10 w-10" />
        <h1 className="text-base font-semibold text-foreground">
          Instagram bağlantısı
        </h1>
        {status === 'polling' && (
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <p className="text-xs text-muted">{message}</p>
          </div>
        )}
        {status === 'completed' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
              ✓
            </div>
            <p className="text-sm font-medium text-foreground">{message}</p>
            {account && (
              <p className="text-xs text-muted">
                @{account.username} (ID: {account.accountId})
              </p>
            )}
            {redirectHref && (
              <Link
                href={redirectHref}
                className="mt-3 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-medium text-background"
              >
                Mağaza ayarlarına dön
              </Link>
            )}
          </div>
        )}
        {status === 'failed' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-2xl text-danger">
              ✕
            </div>
            <p className="text-sm font-medium text-foreground">
              Bağlantı tamamlanamadı
            </p>
            <p className="text-xs text-muted">{message}</p>
            {redirectHref && (
              <Link
                href={redirectHref}
                className="mt-3 inline-flex h-9 items-center rounded-full bg-foreground/[0.06] px-4 text-xs font-medium text-foreground"
              >
                Geri dön
              </Link>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => window.close()}
          className="text-[11px] text-muted hover:text-foreground"
        >
          Bu sekmeyi kapat
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
