'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button, InputOTP, Skeleton } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const PRIMARY_BUTTON_CLASS =
  'w-full rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { setUser, setTokens } = useAuthStore();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const storedData = sessionStorage.getItem('verifyEmail');
    if (storedData) {
      try {
        const { email: storedEmail, timestamp } = JSON.parse(storedData);
        const fifteenMinutes = 15 * 60 * 1000;
        if (storedEmail && timestamp && Date.now() - timestamp < fifteenMinutes) {
          setEmail(storedEmail);
          setIsChecking(false);
        } else {
          sessionStorage.removeItem('verifyEmail');
          router.replace('/login');
        }
      } catch {
        sessionStorage.removeItem('verifyEmail');
        router.replace('/login');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

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
        if (code.length !== 6) toast.error('Lütfen 6 haneli kodu girin');
        return;
      }
      setIsLoading(true);
      try {
        const response = await api.post('/auth/verify-email', { email, code });
        const { user, accessToken, refreshToken } = response.data;
        sessionStorage.removeItem('verifyEmail');
        setUser(user);
        setTokens(accessToken, refreshToken);
        toast.success('E-posta başarıyla doğrulandı!');
        if (!user.currentCompanyId) router.push('/setup-company');
        else router.push('/dashboard');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Doğrulama başarısız');
        setCode('');
      } finally {
        setIsLoading(false);
      }
    },
    [code, email, router, setUser, setTokens]
  );

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResendCooldown(60);
      toast.success('Yeni doğrulama kodu gönderildi');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kod gönderilemedi');
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (code.length === 6 && email && !isLoading) handleSubmit();
  }, [code, email, isLoading, handleSubmit]);

  if (isChecking || !email) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] p-4 md:p-10">
        <div className="flex w-full max-w-[332px] flex-col items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-10" />
            <Skeleton className="h-12 w-10" />
            <Skeleton className="h-12 w-10" />
            <Skeleton className="h-4 w-4 self-center" />
            <Skeleton className="h-12 w-10" />
            <Skeleton className="h-12 w-10" />
            <Skeleton className="h-12 w-10" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="E-posta Doğrulama"
      subtitle={
        <span className="flex items-center justify-center gap-2">
          <Mail className="h-4 w-4" />
          <span className="font-medium text-black">{email}</span>
        </span>
      }
    >
      <p className="text-center text-sm text-black/60">
        E-posta adresinize gönderilen 6 haneli kodu girin
      </p>
      <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          isDisabled={isLoading}
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
            'Doğrula'
          )}
        </Button>

        <p className="text-sm text-black/60">
          Kod almadınız mı?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="text-[#0485F7] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending
              ? 'Gönderiliyor...'
              : resendCooldown > 0
                ? `Tekrar gönder (${resendCooldown}s)`
                : 'Tekrar gönder'}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
