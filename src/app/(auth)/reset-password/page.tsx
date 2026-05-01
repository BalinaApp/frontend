'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  Description,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { api } from '@/services/api';

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
    if (!token) {
      router.push('/forgot-password');
    }
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <Card.Header className="items-center text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle className="h-7 w-7" />
            </div>
            <Card.Title className="text-2xl">Şifre Güncellendi</Card.Title>
            <Card.Description>
              Şifreniz başarıyla güncellendi. Şimdi yeni şifrenizle giriş yapabilirsiniz.
            </Card.Description>
          </Card.Header>
          <Card.Footer>
            <Link href="/login" className="block">
              <Button fullWidth>Giriş Yap</Button>
            </Link>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <Card.Header className="items-center text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <BarChart3 className="h-7 w-7" />
          </div>
          <Card.Title className="text-2xl">Yeni Şifre Belirle</Card.Title>
          <Card.Description>
            Hesabınız için yeni bir şifre oluşturun
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              isRequired
              isDisabled={isLoading}
            >
              <Label>Yeni Şifre</Label>
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
              isDisabled={isLoading}
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
        </Card.Content>
      </Card>
    </div>
  );
}
