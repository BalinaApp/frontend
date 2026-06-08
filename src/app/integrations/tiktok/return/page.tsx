'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';

/** TikTok Login Kit callback'ten sonra balinaOS'a redirect olur ve burası açılır.
 *  Backend (`/webhook/tiktok/auth/callback`) sonucu doğrudan query string ile
 *  taşır:
 *    - başarı:  ?success=1&state=...&openId=...&displayName=...
 *    - hata:    ?success=0&state=...&error=...
 *  Bu yüzden ayrıca status polling'e gerek yok — query'yi okuyup gösteriyoruz.
 *  Bağlama akışı `/stores` sayfasından modal ile başlıyorsa, geri dönüş linki
 *  için slug'ı sessionStorage'dan (varsa) okuyoruz. */
interface ReturnView {
  status: 'loading' | 'completed' | 'failed';
  message: string;
  account: { openId: string; displayName: string | null } | null;
  redirectHref: string | null;
}

export default function TiktokReturnPage() {
  const [view, setView] = useState<ReturnView>({
    status: 'loading',
    message: 'Bağlantı doğrulanıyor…',
    account: null,
    redirectHref: null,
  });
  const { status, message, account, redirectHref } = view;

  useEffect(() => {
    // OAuth callback sonucu sadece client mount'unda okunabilir (query string +
    // sessionStorage browser-only). Bu yüzden render'da türetilemez; effect tek
    // sefer parse edip view'i bir kez set eder.
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const openId = params.get('openId');
    const displayName = params.get('displayName');

    // Bağlama akışı `/stores`'tan başlıyorsa geri oraya dön.
    const slug = sessionStorage.getItem('ttAuthSlug');
    sessionStorage.removeItem('ttAuthSlug');
    const href = slug ? `/${slug}/stores?tiktok=connected` : null;

    const next: ReturnView =
      success === '1' && openId
        ? {
            status: 'completed',
            message: 'TikTok başarıyla bağlandı.',
            account: { openId, displayName: displayName || null },
            redirectHref: href,
          }
        : {
            status: 'failed',
            message: error
              ? decodeURIComponent(error)
              : 'Bağlantı tamamlanamadı. Lütfen tekrar deneyin.',
            account: null,
            redirectHref: href,
          };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only callback verisi, mount'ta tek sefer set ediliyor
    setView(next);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-white/80 p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
        <BalinaOsMark className="h-10 w-10" />
        <h1 className="text-base font-semibold text-foreground">
          TikTok bağlantısı
        </h1>
        {status === 'loading' && (
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
                {account.displayName
                  ? `${account.displayName} `
                  : ''}
                (ID: {account.openId})
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
