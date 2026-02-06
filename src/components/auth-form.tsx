'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

type AuthStep = 'email' | 'login' | 'register';

interface AuthFormProps {
  className?: string;
}

export function AuthForm({ className }: AuthFormProps) {
  const router = useRouter();
  const { login, register } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Şifre en az 8 karakter olmalıdır';
    if (!/[A-Z]/.test(pwd)) return 'Şifre en az bir büyük harf içermelidir';
    if (!/[a-z]/.test(pwd)) return 'Şifre en az bir küçük harf içermelidir';
    if (!/\d/.test(pwd)) return 'Şifre en az bir rakam içermelidir';
    return '';
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await api.post('/auth/check-email', { email });
      const { exists, status } = response.data;

      if (!exists) {
        // New user - show register form
        setStep('register');
      } else if (status === 'needs_verification') {
        // Existing user but not verified - redirect to verify
        toast.info('E-posta doğrulaması gerekiyor');

        // Send new verification code
        await api.post('/auth/resend-verification', { email });

        sessionStorage.setItem('verifyEmail', JSON.stringify({
          email,
          timestamp: Date.now()
        }));
        router.push('/verify-email');
      } else {
        // Existing verified user - show login form
        setStep('login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bir hata oluştu');
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
        sessionStorage.setItem('verifyEmail', JSON.stringify({
          email,
          timestamp: Date.now()
        }));
        router.push('/verify-email');
      } else {
        toast.success('Giriş başarılı!');
        const currentUser = useAuthStore.getState().user;
        if (!currentUser?.currentCompanyId) {
          router.push('/setup-company');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdError = validatePassword(password);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(email, name, password);
      if (result.requiresVerification && result.email) {
        toast.success('Kayıt başarılı! Doğrulama kodu gönderildi.');
        sessionStorage.setItem('verifyEmail', JSON.stringify({
          email: result.email,
          timestamp: Date.now()
        }));
        router.push('/verify-email');
      } else {
        toast.success('Kayıt başarılı!');
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Kayıt başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">
            {step === 'email' && 'Hoş Geldiniz'}
            {step === 'login' && 'Tekrar Hoş Geldiniz'}
            {step === 'register' && 'Hesap Oluşturun'}
          </h1>
          <FieldDescription>
            {step === 'email' && 'WooCommerce Analytics hesabınıza giriş yapın veya kayıt olun'}
            {step === 'login' && (
              <>
                <span className="font-medium text-foreground">{email}</span> ile giriş yapın
              </>
            )}
            {step === 'register' && (
              <>
                <span className="font-medium text-foreground">{email}</span> ile hesap oluşturun
              </>
            )}
          </FieldDescription>
        </div>

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">E-posta</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={isLoading || !email}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kontrol ediliyor...
                    </>
                  ) : (
                    'Devam Et'
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">Şifre</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </Field>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Beni hatırla
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Şifremi unuttum
                </Link>
              </div>
              <Field>
                <Button type="submit" className="w-full" disabled={isLoading || !password}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    'Giriş Yap'
                  )}
                </Button>
              </Field>
              <Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Farklı e-posta kullan
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}

        {/* Register Step */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Ad Soyad</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Şifre</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam
                </p>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Şifre Tekrar</FieldLabel>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={isLoading || !name || !password || !confirmPassword}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kayıt yapılıyor...
                    </>
                  ) : (
                    'Kayıt Ol'
                  )}
                </Button>
              </Field>
              <Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Farklı e-posta kullan
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
      </FieldGroup>
    </div>
  );
}
