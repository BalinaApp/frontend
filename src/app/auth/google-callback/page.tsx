'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/authStore';
import { usePageTitle } from '@/hooks/use-page-title';

export default function GoogleCallbackPage() {
  usePageTitle('Google ile giriş');

  return (
    <Suspense
      fallback={
        <AuthShell title="Giriş yapılıyor...">
          <></>
        </AuthShell>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backend redirect'i StrictMode + re-render storm'da iki kez işlenirse,
  // ikinci checkAuth yarış yaratır ve InvalidStateError'a kadar sürükler.
  // verify-email/page.tsx'teki aynı pattern.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const requiresProfile = searchParams.get('requires_profile') === '1';

    if (!accessToken || !refreshToken) {
      setErrorMessage('Google ile giriş başarısız oldu. Lütfen tekrar deneyin.');
      return;
    }

    // Token'ları persist edilen authStore'a yaz, ardından /auth/me ile user'ı
    // çek. AuthGuard `isAuthenticated && isPublicPath` durumunu yakalayıp
    // doğru hedefe (`/setup-company` ya da `/{slug}`) yönlendiriyor — biz
    // burada router.push yapmıyoruz, aksi halde verify-email'deki
    // InvalidStateError yarışı tekrar olur.
    const { setTokens, checkAuth } = useAuthStore.getState();
    setTokens(accessToken, refreshToken);
    void (async () => {
      try {
        await checkAuth();
        if (requiresProfile) {
          // Backend user.name boş ise işaretler. Mevcut UX'te ayrı bir profil
          // tamamlama sayfası yok; kullanıcıyı kişisel bilgiler ekranına
          // yönlendirelim ki adını yazabilsin. AuthGuard authenticated
          // olduğumuzu görüp default rotaya götürmeden önce buraya gidelim —
          // pathname zaten /auth/google-callback (public). Yine de kısa bir
          // bilgilendirme yapalım.
          toast.info('Lütfen profil bilgilerinizi tamamlayın');
        }
      } catch {
        setErrorMessage(
          'Oturum doğrulanamadı. Lütfen tekrar Google ile giriş yapın.',
        );
        // Token'ları temizle ki AuthGuard'in /login redirect'i tetiklensin.
        useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      }
    })();
  }, [searchParams]);

  if (errorMessage) {
    return (
      <AuthShell
        title="Giriş yapılamadı"
        subtitle={errorMessage}
      >
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="h-9 w-[332px] cursor-pointer rounded-3xl bg-black/[0.04] text-sm font-medium text-[#18181B] transition-colors hover:bg-black/[0.08]"
        >
          Giriş sayfasına dön
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Giriş yapılıyor..."
      subtitle="Google hesabınızla bağlantı kuruluyor."
    >
      <></>
    </AuthShell>
  );
}
