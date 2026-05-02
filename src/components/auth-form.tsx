'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button, Checkbox, Input, TextField, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

type AuthStep = 'email' | 'login';

const SOCIAL_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-black/[0.04] text-[#18181B] hover:bg-black/[0.08] data-[hovered=true]:bg-black/[0.08]';
const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const FIELD_INPUT_CLASS =
  'h-9 w-[332px] rounded-xl bg-white px-3 text-sm placeholder:text-[#71717A] shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)]';

const STEP_HEADERS: Record<
  AuthStep,
  { title: string; subtitle: React.ReactNode | ((email: string) => React.ReactNode) }
> = {
  email: {
    title: "Balina'ya hoş geldiniz",
    subtitle: 'Başlamak için lütfen aşağıdaki seçeneklerden birini seçin!',
  },
  login: {
    title: 'Tekrar hoş geldiniz',
    subtitle: (email: string) => (
      <>
        <span className="font-medium text-black">{email}</span> ile devam
      </>
    ),
  },
};

function persistVerifyEmail(email: string, pendingRegistration: boolean) {
  sessionStorage.setItem(
    'verifyEmail',
    JSON.stringify({ email, pendingRegistration, timestamp: Date.now() })
  );
}

export function AuthForm() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await api.post('/auth/check-email', { email });
      const { exists, status } = response.data;

      if (!exists) {
        // New user — request a verification code, then route to verify-email
        try {
          await api.post('/auth/resend-verification', { email });
        } catch {
          // Best effort; backend may not support this for unknown emails yet
        }
        persistVerifyEmail(email, true);
        toast.info('E-posta adresinize doğrulama kodu gönderildi');
        router.push('/verify-email');
      } else if (status === 'needs_verification') {
        toast.info('E-posta doğrulaması gerekiyor');
        await api.post('/auth/resend-verification', { email });
        persistVerifyEmail(email, false);
        router.push('/verify-email');
      } else {
        setStep('login');
      }
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.requiresVerification) {
        toast.info('E-posta doğrulaması gerekiyor');
        persistVerifyEmail(email, false);
        router.push('/verify-email');
      } else {
        toast.success('Giriş başarılı!');
        const currentUser = useAuthStore.getState().user;
        if (!currentUser?.currentCompanyId) router.push('/setup-company');
        else router.push('/dashboard');
      }
    } catch (err: any) {
      toast.danger(err.message || 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
  };

  const handleSocialLogin = (provider: 'apple' | 'google') => {
    toast.info(
      `${provider === 'apple' ? 'Apple' : 'Google'} ile giriş yakında eklenecek`
    );
  };

  const header = STEP_HEADERS[step];
  const subtitle =
    typeof header.subtitle === 'function' ? header.subtitle(email) : header.subtitle;

  return (
    <AuthShell title={header.title} subtitle={subtitle}>
      {step === 'email' && (
        <>
          <div className="flex flex-col gap-2">
            <Button
              variant="tertiary"
              onPress={() => handleSocialLogin('apple')}
              className={SOCIAL_BUTTON_CLASS}
            >
              <Image src="/figma/logo-apple.svg" alt="" width={16} height={16} />
              Apple ile giriş
            </Button>
            <Button
              variant="tertiary"
              onPress={() => handleSocialLogin('google')}
              className={SOCIAL_BUTTON_CLASS}
            >
              <Image src="/figma/logo-google.svg" alt="" width={16} height={16} />
              Google ile giriş
            </Button>
          </div>

          <hr className="w-8 border-t border-black/[0.12]" aria-hidden="true" />

          <form
            onSubmit={handleEmailSubmit}
            className="flex w-full flex-col items-center gap-2"
          >
            <TextField
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              isRequired
              isDisabled={isLoading}
              autoFocus
              aria-label="E-posta adresiniz"
            >
              <Input
                placeholder="E-posta Adresiniz"
                className={FIELD_INPUT_CLASS}
              />
            </TextField>
            <Button
              type="submit"
              isPending={isLoading}
              isDisabled={isLoading || !email}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kontrol ediliyor...
                </>
              ) : (
                'E-posta ile ilerle'
              )}
            </Button>
          </form>
        </>
      )}

      {step === 'login' && (
        <form
          onSubmit={handleLoginSubmit}
          className="flex w-full flex-col items-center gap-2"
        >
          <TextField
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            isRequired
            isDisabled={isLoading}
            autoFocus
            aria-label="Şifre"
          >
            <div className="relative">
              <Input placeholder="Şifre" className={FIELD_INPUT_CLASS} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-black"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </TextField>

          <div className="flex w-[332px] items-center justify-between">
            <Checkbox
              isSelected={rememberMe}
              onChange={setRememberMe}
              isDisabled={isLoading}
            >
              <span className="text-sm">Beni hatırla</span>
            </Checkbox>
            <Link
              href="/forgot-password"
              className="text-sm text-[#0485F7] hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>

          <Button
            type="submit"
            isPending={isLoading}
            isDisabled={isLoading || !password}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </Button>

          <button
            type="button"
            onClick={handleBack}
            disabled={isLoading}
            className="mt-1 flex items-center gap-1 text-sm text-black/60 hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Farklı e-posta kullan
          </button>
        </form>
      )}
    </AuthShell>
  );
}
