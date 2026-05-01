'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { api } from '@/services/api';

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
      toast.error(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <Card.Header className="items-center text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle className="h-7 w-7" />
            </div>
            <Card.Title className="text-2xl">E-posta Gönderildi</Card.Title>
            <Card.Description>
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.
              Lütfen gelen kutunuzu kontrol edin.
            </Card.Description>
          </Card.Header>
          <Card.Footer>
            <Link href="/login" className="block">
              <Button variant="outline" fullWidth>
                <ArrowLeft className="h-4 w-4" />
                Giriş sayfasına dön
              </Button>
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
          <Card.Title className="text-2xl">Şifremi Unuttum</Card.Title>
          <Card.Description>
            E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              isRequired
              isDisabled={isLoading}
            >
              <Label>E-posta</Label>
              <Input placeholder="ornek@email.com" />
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
                  Gönderiliyor...
                </>
              ) : (
                'Şifre Sıfırlama Bağlantısı Gönder'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Giriş sayfasına dön
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
