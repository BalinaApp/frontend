'use client';

import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';

export default function LoginPage() {
  return (
    <AuthShell
      title="Balina'ya hoş geldiniz"
      subtitle="Başlamak için lütfen aşağıdaki seçeneklerden birini seçin!"
    >
      <AuthForm />
    </AuthShell>
  );
}
