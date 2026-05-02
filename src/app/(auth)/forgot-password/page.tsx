'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, TextField, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/services/api';

const PRIMARY_BUTTON_CLASS =
  'w-full rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const FIELD_INPUT_CLASS =
  'h-9 w-[332px] rounded-xl bg-white px-3 text-sm placeholder:text-[#71717A] shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)]';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSuccess(true);
      toast.success('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthShell
        title="E-posta Gönderildi"
        subtitle="Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin."
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <Link href="/login" className="w-full">
            <Button className={PRIMARY_BUTTON_CLASS}>
              <ArrowLeft className="h-4 w-4" />
              Giriş sayfasına dön
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Şifremi Unuttum"
      subtitle="E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz"
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-center gap-3"
      >
        <TextField
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          isRequired
          isDisabled={isLoading}
          aria-label="E-posta adresi"
        >
          <Input placeholder="E-posta Adresiniz" className={FIELD_INPUT_CLASS} />
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
              Gönderiliyor...
            </>
          ) : (
            'Sıfırlama bağlantısı gönder'
          )}
        </Button>

        <Link
          href="/login"
          className="flex items-center gap-1 text-sm text-black/60 hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Giriş sayfasına dön
        </Link>
      </form>
    </AuthShell>
  );
}
