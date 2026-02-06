'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCompany } from '@/components/providers/CompanyProvider';
import { Skeleton } from '@/components/ui/skeleton';

// Define which paths each role can access
// OWNER and ADMIN have full access (not listed here as they're unrestricted)
// MEMBER has full access except admin-only pages
// STOCKIST can only access inventory pages
const stockistAllowedPaths = ['/inventory'];

interface RoleGuardProps {
  children: React.ReactNode;
}

function RoleGuardLoadingSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`p-6 ${i < 2 ? 'lg:border-r' : ''} ${i === 0 ? 'md:border-r' : ''}`}>
            <Skeleton className="h-12 w-12 mb-4" />
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </>
  );
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

    // STOCKIST role - check if path is allowed
    if (role === 'STOCKIST') {
      // Get the path after company slug
      const pathAfterCompany = pathname.replace(`/${companySlug}`, '');

      // Check if path starts with any allowed path
      const isAllowed = stockistAllowedPaths.some(
        (allowedPath) => pathAfterCompany === '' || pathAfterCompany.startsWith(allowedPath)
      );

      if (!isAllowed) {
        // Redirect to inventory page
        router.replace(`/${companySlug}/inventory`);
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
