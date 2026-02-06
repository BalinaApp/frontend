'use client';

import { CompanyProvider } from '@/components/providers/CompanyProvider';
import { RoleGuard } from '@/components/providers/RoleGuard';

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProvider>
      <RoleGuard>{children}</RoleGuard>
    </CompanyProvider>
  );
}
