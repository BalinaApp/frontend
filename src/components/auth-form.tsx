'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Input, TextField, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/authStore';

const SOCIAL_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-black/[0.04] text-[#18181B] hover:bg-black/[0.08] data-[hovered=true]:bg-black/[0.08]';
const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const FIELD_INPUT_CLASS =
  'auth-field-input h-9 w-[332px] rounded-xl px-3 text-sm placeholder:text-[#71717A]';

export function AuthForm() {
  const router = useRouter();
  const { requestCode } = useAuthStore();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await requestCode(email);
      sessionStorage.setItem(
        'verifyEmail',
        JSON.stringify({ email, timestamp: Date.now() })
      );
      toast.info('Giriş kodu e-posta adresinize gönderildi');
      router.push('/verify-email');
    } catch (err: any) {
      toast.danger(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    toast.info('Google ile giriş yakında eklenecek');
  };

  return (
    <AuthShell
      title="Balina'ya hoş geldiniz"
      subtitle="Başlamak için lütfen aşağıdaki seçeneklerden birini seçin!"
    >
      <Button
        variant="tertiary"
        onPress={handleGoogle}
        className={SOCIAL_BUTTON_CLASS}
      >
        <Image src="/figma/logo-google.svg" alt="" width={16} height={16} />
        Google ile giriş
      </Button>

      <hr className="w-8 border-t border-black/[0.12]" aria-hidden="true" />

      <form
        onSubmit={handleSubmit}
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
              Gönderiliyor...
            </>
          ) : (
            'E-posta ile ilerle'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
