'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowsRotateRight as Loader2 } from '@gravity-ui/icons';
import { BalinaButton, BalinaInputOTP, toast } from '@/components/balina';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/authStore';
import { usePageTitle } from '@/hooks/use-page-title';

const PRIMARY_BUTTON_CLASS = 'w-[332px]';
const TERTIARY_BUTTON_CLASS = 'w-[332px]';

type View = 'check-email' | 'otp';

export default function VerifyEmailPage() {
  usePageTitle('E-postayı doğrula');

  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyCode, requestCode, isAuthenticated } = useAuthStore();

  const magicEmail = searchParams.get('email');
  const magicCode = searchParams.get('code');

  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [view, setView] = useState<View>('check-email');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Run verifyCode at most once across StrictMode double-effects and the
  // re-render storm that follows a successful login. Without this, the second
  // call lands on a code the backend has already consumed and surfaces as
  // "Doğrulama kodu bulunamadı".
  const verifyAttemptedRef = useRef(false);

  const finishVerification = useCallback(
    async (targetEmail: string, codeValue: string) => {
      if (verifyAttemptedRef.current) return;
      verifyAttemptedRef.current = true;
      try {
        await verifyCode(targetEmail, codeValue);
        sessionStorage.removeItem('verifyEmail');
        toast.success('Giriş başarılı');
        // Don't router.push from here. /verify-email is a public path; the
        // moment the auth state flips, AuthGuard's "authenticated && public
        // path" redirect branch picks the right destination (/setup-company
        // for new users, /{currentCompany.slug} for returning users). Two
        // simultaneous pushes are exactly what triggered the
        // "InvalidStateError: Transition was aborted" overlay.
      } catch (err: any) {
        verifyAttemptedRef.current = false;
        toast.danger(err.message || 'Doğrulama başarısız');
        setCode('');
      }
    },
    [verifyCode, router]
  );

  // Magic link auto-submit
  useEffect(() => {
    // If the user is already authenticated, /verify-email no longer applies —
    // they likely refreshed the magic-link URL after the code was consumed,
    // or hit Back into this page after signing in. AuthGuard handles the
    // redirect to /setup-company or /{companySlug}; we must NOT call
    // router.replace here, otherwise it races AuthGuard's own push and
    // Next.js 16 Turbopack throws "InvalidStateError: Transition was
    // aborted because of invalid state".
    if (isAuthenticated) {
      sessionStorage.removeItem('verifyEmail');
      return;
    }

    if (magicEmail && magicCode && magicCode.length === 6) {
      setEmail(magicEmail);
      setIsChecking(false);
      setIsLoading(true);
      finishVerification(magicEmail, magicCode).finally(() => setIsLoading(false));
      return;
    }

    const storedData = sessionStorage.getItem('verifyEmail');
    if (storedData) {
      try {
        const { email: storedEmail, timestamp } = JSON.parse(storedData);
        const fifteenMinutes = 15 * 60 * 1000;
        if (storedEmail && timestamp && Date.now() - timestamp < fifteenMinutes) {
          setEmail(storedEmail);
          setIsChecking(false);
          return;
        }
      } catch {
        /* fall through */
      }
      sessionStorage.removeItem('verifyEmail');
    }
    router.replace('/login');
  }, [isAuthenticated, magicEmail, magicCode, finishVerification, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (code.length !== 6 || !email) {
        if (code.length !== 6) toast.danger('Lütfen 6 haneli kodu girin');
        return;
      }
      setIsLoading(true);
      try {
        await finishVerification(email, code);
      } finally {
        setIsLoading(false);
      }
    },
    [code, email, finishVerification]
  );

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    try {
      await requestCode(email);
      setResendCooldown(60);
      toast.success('Yeni giriş kodu gönderildi');
    } catch (err: any) {
      toast.danger(err.message || 'Kod gönderilemedi');
    } finally {
      setIsResending(false);
    }
  };

  if (isChecking || !email) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-black/[0.04] p-4 md:p-10">
        <div className="flex w-full max-w-[332px] flex-col items-center gap-5">
          </div>
      </div>
    );
  }

  const resendLabel = isResending
    ? 'Gönderiliyor...'
    : resendCooldown > 0
      ? `Tekrar gönder (${resendCooldown}s)`
      : 'Sihirli bağlantıyı tekrar gönder';

  return (
    <AuthShell
      title="E-postalarınızı kontrol edin"
      subtitle={
        <>
          Lütfen <span className="font-medium text-black">{email}</span>{' '}
          adresindeki gelen kutunuzu kontrol edin.
        </>
      }
    >
      {view === 'check-email' ? (
        <>
          <BalinaButton
            variant="soft"
            onClick={() => setView('otp')}
            className={TERTIARY_BUTTON_CLASS}
          >
            Manuel kod gir
          </BalinaButton>

          <hr className="w-8 border-t border-black/[0.12]" aria-hidden="true" />

          <BalinaButton
            variant="soft"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className={TERTIARY_BUTTON_CLASS}
          >
            {resendLabel}
          </BalinaButton>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
          <BalinaInputOTP
            length={6}
            value={code}
            onChange={setCode}
            disabled={isLoading}
          />

          <BalinaButton
            type="submit"
            variant="primary"
            disabled={isLoading || code.length !== 6}
            className={PRIMARY_BUTTON_CLASS}
            leftIcon={
              isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
            }
          >
            {isLoading ? 'Doğrulanıyor...' : 'Kodu onayla'}
          </BalinaButton>

          <hr className="my-2 w-8 border-t border-black/[0.12]" aria-hidden="true" />

          <BalinaButton
            type="button"
            variant="soft"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className={TERTIARY_BUTTON_CLASS}
          >
            {resendLabel}
          </BalinaButton>
        </form>
      )}
    </AuthShell>
  );
}
