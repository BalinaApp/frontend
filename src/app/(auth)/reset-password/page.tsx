'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, TextField } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/services/api';

const PRIMARY_BUTTON_CLASS =
  'w-full rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const FIELD_INPUT_CLASS =
  'h-9 w-[332px] rounded-xl bg-white px-3 text-sm placeholder:text-[#71717A] shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)]';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) router.push('/forgot-password');
  }, [token, router]);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Şifre en az 8 karakter olmalıdır';
    if (!/[A-Z]/.test(pwd)) return 'Şifre en az bir büyük harf içermelidir';
    if (!/[a-z]/.test(pwd)) return 'Şifre en az bir küçük harf içermelidir';
    if (!/\d/.test(pwd)) return 'Şifre en az bir rakam içermelidir';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      await api.post('/auth/reset-password', { token, password });
      setIsSuccess(true);
      toast.success('Şifreniz başarıyla güncellendi');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  if (isSuccess) {
    return (
      <AuthShell
        title="Şifre Güncellendi"
        subtitle="Şifreniz başarıyla güncellendi. Şimdi yeni şifrenizle giriş yapabilirsiniz."
      >
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <Link href="/login" className="w-full">
            <Button className={PRIMARY_BUTTON_CLASS}>Giriş Yap</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Yeni Şifre Belirle"
      subtitle="Hesabınız için yeni bir şifre oluşturun"
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-center gap-3"
      >
        <TextField
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          isRequired
          isDisabled={isLoading}
          aria-label="Yeni şifre"
        >
          <div className="relative">
            <Input placeholder="Yeni Şifre" className={FIELD_INPUT_CLASS} />
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
        <p className="w-[332px] text-xs text-black/60">
          En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam
        </p>
        <TextField
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={setConfirmPassword}
          isRequired
          isDisabled={isLoading}
          aria-label="Şifre tekrar"
        >
          <Input placeholder="Şifre Tekrar" className={FIELD_INPUT_CLASS} />
        </TextField>

        <Button
          type="submit"
          isPending={isLoading}
          isDisabled={isLoading}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Güncelleniyor...
            </>
          ) : (
            'Şifreyi Güncelle'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
