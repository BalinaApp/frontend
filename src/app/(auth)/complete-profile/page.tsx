'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Skeleton, TextField, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/authStore';

const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const FIELD_INPUT_CLASS =
  'h-9 w-[332px] rounded-xl bg-white px-3 text-sm placeholder:text-[#71717A] shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)]';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem('verifyEmail');
    if (storedData) {
      try {
        const {
          email: storedEmail,
          timestamp,
          pendingRegistration,
        } = JSON.parse(storedData);
        const fifteenMinutes = 15 * 60 * 1000;
        if (
          storedEmail &&
          timestamp &&
          pendingRegistration &&
          Date.now() - timestamp < fifteenMinutes
        ) {
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

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Şifre en az 8 karakter olmalıdır';
    if (!/[A-Z]/.test(pwd)) return 'Şifre en az bir büyük harf içermelidir';
    if (!/[a-z]/.test(pwd)) return 'Şifre en az bir küçük harf içermelidir';
    if (!/\d/.test(pwd)) return 'Şifre en az bir rakam içermelidir';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const pwdError = validatePassword(password);
    if (pwdError) {
      toast.danger(pwdError);
      return;
    }
    if (password !== confirmPassword) {
      toast.danger('Şifreler eşleşmiyor');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, name, password);
      if (result.requiresVerification && result.email) {
        // Backend may still want a fresh OTP — keep email but clear pending
        // flag so verify-email runs the real verification path next.
        sessionStorage.setItem(
          'verifyEmail',
          JSON.stringify({
            email: result.email,
            pendingRegistration: false,
            timestamp: Date.now(),
          })
        );
        toast.info('E-posta doğrulaması gerekiyor');
        router.push('/verify-email');
      } else {
        sessionStorage.removeItem('verifyEmail');
        toast.success('Kayıt başarılı!');
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.danger(err.message || 'Kayıt başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking || !email) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] p-4 md:p-10">
        <div className="flex w-full max-w-[332px] flex-col items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="Bilgilerinizi girin"
      subtitle="Lütfen kişisel bilgilerinizi doldurun."
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-center gap-2"
      >
        <TextField
          name="name"
          value={name}
          onChange={setName}
          isRequired
          isDisabled={isLoading}
          autoFocus
          aria-label="Ad ve soyad"
        >
          <Input placeholder="Ad ve Soyad" className={FIELD_INPUT_CLASS} />
        </TextField>

        <TextField
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          isRequired
          isDisabled={isLoading}
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

        <TextField
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={setConfirmPassword}
          isRequired
          isDisabled={isLoading}
          aria-label="Şifre tekrarı"
        >
          <Input placeholder="Şifre Tekrarı" className={FIELD_INPUT_CLASS} />
        </TextField>

        <Button
          type="submit"
          isPending={isLoading}
          isDisabled={isLoading || !name || !password || !confirmPassword}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kayıt yapılıyor...
            </>
          ) : (
            'Kayıt ol'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
