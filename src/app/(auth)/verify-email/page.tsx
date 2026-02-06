'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import {
  Field,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { setUser, setTokens } = useAuthStore();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check for email on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('verifyEmail');
    if (storedData) {
      try {
        const { email: storedEmail, timestamp } = JSON.parse(storedData);
        const fifteenMinutes = 15 * 60 * 1000;

        if (storedEmail && timestamp && (Date.now() - timestamp) < fifteenMinutes) {
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

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (code.length !== 6 || !email) {
      if (code.length !== 6) {
        toast.error('Lütfen 6 haneli kodu girin');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/verify-email', {
        email,
        code,
      });

      const { user, accessToken, refreshToken } = response.data;
      sessionStorage.removeItem('verifyEmail');
      setUser(user);
      setTokens(accessToken, refreshToken);

      toast.success('E-posta başarıyla doğrulandı!');

      if (!user.currentCompanyId) {
        router.push('/setup-company');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Doğrulama başarısız');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  }, [code, email, router, setUser, setTokens]);

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

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6 && email && !isLoading) {
      handleSubmit();
    }
  }, [code, email, isLoading, handleSubmit]);

  // Loading skeleton
  if (isChecking || !email) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-7 w-48 mt-2" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex justify-center gap-2">
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
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn('flex flex-col gap-6')}>
          <FieldGroup>
            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <BarChart3 className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">E-posta Doğrulama</h1>
              <FieldDescription className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="font-medium text-foreground">{email}</span>
              </FieldDescription>
              <p className="text-sm text-muted-foreground">
                E-posta adresinize gönderilen 6 haneli kodu girin
              </p>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={setCode}
                      disabled={isLoading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </Field>

                <Field>
                  <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Doğrulanıyor...
                      </>
                    ) : (
                      'Doğrula'
                    )}
                  </Button>
                </Field>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Kod almadınız mı?{' '}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending || resendCooldown > 0}
                      className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? (
                        'Gönderiliyor...'
                      ) : resendCooldown > 0 ? (
                        `Tekrar gönder (${resendCooldown}s)`
                      ) : (
                        'Tekrar gönder'
                      )}
                    </button>
                  </p>
                </div>
              </FieldGroup>
            </form>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
