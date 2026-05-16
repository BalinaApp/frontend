'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCompany } from '@/components/providers/CompanyProvider';
// Define which paths each role can access
// OWNER and ADMIN have full access (not listed here as they're unrestricted)
// STOCKIST: yalnızca ürünler + kendi profili (anasayfa yok)
// PRODUCT_UPLOADER: ürünler + AI Creator + kendi profili (anasayfa yok)

/** STOCKIST için path izni — startsWith yerine spesifik kurallar, aksi halde
 *  /settings izni /settings/company gibi her şeyi de açar. */
function isStockistPathAllowed(pathAfterCompany: string): boolean {
  // Home (`/[slug]`) → izin yok, /products'a yönlendirilecek.
  if (pathAfterCompany === '' || pathAfterCompany === '/') return false;
  if (pathAfterCompany.startsWith('/products')) return true;
  if (pathAfterCompany.startsWith('/product-mappings')) return true;
  // /settings index ve sadece /settings/profile alt-sayfası açık.
  if (pathAfterCompany === '/settings') return true;
  if (pathAfterCompany.startsWith('/settings/profile')) return true;
  return false;
}

/** PRODUCT_UPLOADER: STOCKIST'in izinleri + /ai-creator. */
function isProductUploaderPathAllowed(pathAfterCompany: string): boolean {
  if (pathAfterCompany.startsWith('/ai-creator')) return true;
  return isStockistPathAllowed(pathAfterCompany);
}

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

    // STOCKIST and PRODUCT_UPLOADER are limited roles — restricted to a
    // small whitelist of paths. Anything else bounces to /products (their
    // landing page).
    if (role === 'STOCKIST') {
      const pathAfterCompany = pathname.replace(`/${companySlug}`, '');
      if (!isStockistPathAllowed(pathAfterCompany)) {
        router.replace(`/${companySlug}/products`);
        return;
      }
    } else if (role === 'PRODUCT_UPLOADER') {
      const pathAfterCompany = pathname.replace(`/${companySlug}`, '');
      if (!isProductUploaderPathAllowed(pathAfterCompany)) {
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
