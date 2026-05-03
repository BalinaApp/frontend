'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, InputOTP, Skeleton, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/authStore';

const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const TERTIARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-black/[0.04] text-[#18181B] hover:bg-black/[0.08] data-[hovered=true]:bg-black/[0.08]';

type View = 'check-email' | 'otp';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyCode, requestCode } = useAuthStore();

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
        const result = await verifyCode(targetEmail, codeValue);
        sessionStorage.removeItem('verifyEmail');
        toast.success('Giriş başarılı');
        if (result.requiresProfile) {
          router.push('/complete-profile');
        } else if (!result.user.currentCompanyId) {
          router.push('/setup-company');
        } else {
          router.push('/dashboard');
        }
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
  }, [magicEmail, magicCode, finishVerification, router]);

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
      <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] p-4 md:p-10">
        <div className="flex w-full max-w-[332px] flex-col items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full" />
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
          <Button
            variant="tertiary"
            onPress={() => setView('otp')}
            className={TERTIARY_BUTTON_CLASS}
          >
            Manuel kod gir
          </Button>

          <hr className="w-8 border-t border-black/[0.12]" aria-hidden="true" />

          <Button
            variant="tertiary"
            onPress={handleResend}
            isDisabled={isResending || resendCooldown > 0}
            isPending={isResending}
            className={TERTIARY_BUTTON_CLASS}
          >
            {resendLabel}
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            isDisabled={isLoading}
            autoFocus
          >
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>

          <Button
            type="submit"
            isPending={isLoading}
            isDisabled={isLoading || code.length !== 6}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Doğrulanıyor...
              </>
            ) : (
              'Kodu onayla'
            )}
          </Button>

          <hr className="my-2 w-8 border-t border-black/[0.12]" aria-hidden="true" />

          <Button
            type="button"
            variant="tertiary"
            onPress={handleResend}
            isDisabled={isResending || resendCooldown > 0}
            isPending={isResending}
            className={TERTIARY_BUTTON_CLASS}
          >
            {resendLabel}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
