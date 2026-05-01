'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Checkbox,
  Description,
  Input,
  Label,
  TextField,
} from '@heroui/react';
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
        setStep('register');
      } else if (status === 'needs_verification') {
        toast.info('E-posta doğrulaması gerekiyor');
        await api.post('/auth/resend-verification', { email });
        sessionStorage.setItem(
          'verifyEmail',
          JSON.stringify({ email, timestamp: Date.now() })
        );
        router.push('/verify-email');
      } else {
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
        sessionStorage.setItem(
          'verifyEmail',
          JSON.stringify({ email, timestamp: Date.now() })
        );
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
        sessionStorage.setItem(
          'verifyEmail',
          JSON.stringify({ email: result.email, timestamp: Date.now() })
        );
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
    <div className={['flex flex-col gap-6', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">
          {step === 'email' && 'Hoş Geldiniz'}
          {step === 'login' && 'Tekrar Hoş Geldiniz'}
          {step === 'register' && 'Hesap Oluşturun'}
        </h1>
        <p className="text-sm text-muted">
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
        </p>
      </div>

      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <TextField
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            isRequired
            isDisabled={isLoading}
            autoFocus
          >
            <Label>E-posta</Label>
            <Input placeholder="ornek@email.com" />
          </TextField>
          <Button
            type="submit"
            fullWidth
            isPending={isLoading}
            isDisabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kontrol ediliyor...
              </>
            ) : (
              'Devam Et'
            )}
          </Button>
        </form>
      )}

      {step === 'login' && (
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <TextField
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            isRequired
            isDisabled={isLoading}
            autoFocus
          >
            <Label>Şifre</Label>
            <div className="relative">
              <Input placeholder="••••••••" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onPress={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted" />
                ) : (
                  <Eye className="h-4 w-4 text-muted" />
                )}
              </Button>
            </div>
          </TextField>
          <div className="flex items-center justify-between">
            <Checkbox
              isSelected={rememberMe}
              onChange={setRememberMe}
              isDisabled={isLoading}
            >
              Beni hatırla
            </Checkbox>
            <Link
              href="/forgot-password"
              className="text-sm text-accent hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>
          <Button
            type="submit"
            fullWidth
            isPending={isLoading}
            isDisabled={isLoading || !password}
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
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onPress={handleBack}
            isDisabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            Farklı e-posta kullan
          </Button>
        </form>
      )}

      {step === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            value={name}
            onChange={setName}
            isRequired
            isDisabled={isLoading}
            autoFocus
          >
            <Label>Ad Soyad</Label>
            <Input placeholder="John Doe" />
          </TextField>
          <TextField
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            isRequired
            isDisabled={isLoading}
          >
            <Label>Şifre</Label>
            <div className="relative">
              <Input placeholder="••••••••" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onPress={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted" />
                ) : (
                  <Eye className="h-4 w-4 text-muted" />
                )}
              </Button>
            </div>
            <Description>
              En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam
            </Description>
          </TextField>
          <TextField
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={setConfirmPassword}
            isRequired
            isDisabled={isLoading}
          >
            <Label>Şifre Tekrar</Label>
            <Input placeholder="••••••••" />
          </TextField>
          <Button
            type="submit"
            fullWidth
            isPending={isLoading}
            isDisabled={isLoading || !name || !password || !confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kayıt yapılıyor...
              </>
            ) : (
              'Kayıt Ol'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onPress={handleBack}
            isDisabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            Farklı e-posta kullan
          </Button>
        </form>
      )}
    </div>
  );
}
