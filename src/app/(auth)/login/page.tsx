'use client';

import { AuthForm } from '@/components/auth-form';
import { usePageTitle } from '@/hooks/use-page-title';

export default function LoginPage() {
  usePageTitle('Giriş yap');

  return <AuthForm />;
}
