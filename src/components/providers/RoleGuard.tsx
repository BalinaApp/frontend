'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCompany } from '@/components/providers/CompanyProvider';
// Define which paths each role can access
// OWNER and ADMIN have full access (not listed here as they're unrestricted)
// MEMBER has full access except admin-only pages
// STOCKIST can only access products pages
// PRODUCT_UPLOADER can access products and AI Creator (their primary tool)
const stockistAllowedPaths = ['/products'];
const productUploaderAllowedPaths = ['/products', '/ai-creator'];

interface RoleGuardProps {
  children: React.ReactNode;
}

function RoleGuardLoadingSkeleton() {
  return null;
}

export function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { company, isLoading } = useCompany();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading || !company) {
      return;
    }

    const role = company.role;
    const companySlug = company.slug;

    // OWNER and ADMIN have full access
    if (role === 'OWNER' || role === 'ADMIN') {
      setIsChecking(false);
      return;
    }

    // MEMBER has full access
    if (role === 'MEMBER') {
      setIsChecking(false);
      return;
    }

    // STOCKIST and PRODUCT_UPLOADER are limited roles — restricted to a
    // small whitelist of paths. Anything else bounces to /products (their
    // landing page).
    if (role === 'STOCKIST' || role === 'PRODUCT_UPLOADER') {
      const pathAfterCompany = pathname.replace(`/${companySlug}`, '');
      const allowedPaths =
        role === 'STOCKIST'
          ? stockistAllowedPaths
          : productUploaderAllowedPaths;

      const isAllowed = allowedPaths.some(
        (allowedPath) =>
          pathAfterCompany === '' || pathAfterCompany.startsWith(allowedPath),
      );

      if (!isAllowed) {
        router.replace(`/${companySlug}/products`);
        return;
      }
    }

    setIsChecking(false);
  }, [company, isLoading, pathname, router]);

  if (isLoading || isChecking) {
    return <RoleGuardLoadingSkeleton />;
  }

  return <>{children}</>;
}
