'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { Skeleton } from '@heroui/react';

// Paths that don't require authentication
const publicPaths = ['/login', '/verify-email'];
// Paths that authenticated users without a company can access
const companySetupPaths = ['/setup-company'];
// Paths that handle their own auth flow — AuthGuard doesn't redirect to or
// away from these. /invite reads a token, optionally bounces to /login,
// then accepts the invite once the user is authenticated.
const selfManagedPaths = ['/invite'];

function DashboardLoadingSkeleton() {
  return (
    <div className="flex h-screen w-full bg-sidebar">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-64 flex-col p-2">
        {/* Team switcher */}
        <div className="p-2">
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        {/* Nav items */}
        <div className="flex-1 p-2 space-y-1">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
        {/* User */}
        <div className="p-2">
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>
      {/* Main content skeleton - matches SidebarInset */}
      <main className="relative flex w-full flex-1 flex-col bg-background md:m-2 md:ml-0 md:rounded-xl md:border">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-4 w-px bg-border" />
          <Skeleton className="h-4 w-16 mr-1" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </header>
        {/* Page header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        {/* Content grid */}
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
        {/* Secondary section */}
        <div className="px-4 py-3 border-b">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex-1" />
      </main>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, accessToken } = useAuthStore();
  const { companies, currentCompany, fetchCompanies } = useCompanyStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [authCheckDone, setAuthCheckDone] = useState(false);
  const [companiesFetched, setCompaniesFetched] = useState(false);
  const authCheckTriggered = useRef(false);

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check auth on mount - only once
  useEffect(() => {
    if (!isHydrated) return;
    if (authCheckTriggered.current) return;
    authCheckTriggered.current = true;

    if (accessToken) {
      checkAuth().finally(() => {
        setAuthCheckDone(true);
      });
    } else {
      // No token, auth check is done (user is not authenticated)
      setAuthCheckDone(true);
    }
  }, [isHydrated, accessToken, checkAuth]);

  // Fetch companies when authenticated
  useEffect(() => {
    if (isHydrated && authCheckDone && isAuthenticated && !companiesFetched) {
      fetchCompanies().then(() => {
        setCompaniesFetched(true);
      });
    }
  }, [isHydrated, authCheckDone, isAuthenticated, companiesFetched, fetchCompanies]);

  // Redirect logic - only run after auth check is complete
  useEffect(() => {
    if (!isHydrated || !authCheckDone || isLoading) return;

    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
    const isCompanySetupPath = companySetupPaths.some((path) => pathname.startsWith(path));
    const isSelfManagedPath = selfManagedPaths.some((path) => pathname.startsWith(path));

    // /invite (and friends) handles its own redirects.
    if (isSelfManagedPath) return;

    if (!isAuthenticated && !isPublicPath) {
      // Not authenticated and trying to access protected route
      router.push('/login');
      return;
    }

    // Wait for companies to be fetched before making company-related redirect decisions
    if (isAuthenticated && !companiesFetched) {
      return;
    }

    if (isAuthenticated && isPublicPath) {
      // Authenticated and on login/register pages - redirect based on company status
      if (companies.length === 0) {
        router.push('/setup-company');
      } else if (currentCompany) {
        router.push(`/${currentCompany.slug}`);
      } else if (companies.length > 0) {
        router.push(`/${companies[0].slug}`);
      }
    } else if (isAuthenticated && companies.length === 0 && !isCompanySetupPath && !isPublicPath) {
      // Authenticated but no company and not on setup page - redirect to setup
      router.push('/setup-company');
    } else if (isAuthenticated && companies.length > 0 && isCompanySetupPath) {
      // Authenticated with company but on setup page - redirect to company dashboard
      if (currentCompany) {
        router.push(`/${currentCompany.slug}`);
      } else {
        router.push(`/${companies[0].slug}`);
      }
    } else if (isAuthenticated && pathname === '/') {
      // On root path, redirect to company dashboard or setup
      if (companies.length === 0) {
        router.push('/setup-company');
      } else if (currentCompany) {
        router.push(`/${currentCompany.slug}`);
      } else {
        router.push(`/${companies[0].slug}`);
      }
    }
  }, [isHydrated, authCheckDone, isAuthenticated, isLoading, pathname, router, companies, currentCompany, companiesFetched]);

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isCompanySetupPath = companySetupPaths.some((path) => pathname.startsWith(path));
  const isSelfManagedPath = selfManagedPaths.some((path) => pathname.startsWith(path));
  const isDashboardPath =
    !isPublicPath && !isCompanySetupPath && !isSelfManagedPath;

  // While we don't know yet whether the user is authenticated, never show
  // the dashboard chrome — it would briefly flash before the redirect to
  // /login lands. Public auth surfaces render their own static content.
  if (!isHydrated || !authCheckDone) {
    if (isDashboardPath) return <div className="min-h-svh bg-black/[0.04]" />;
    return <>{children}</>;
  }

  // Once we know the user is authenticated but companies are still loading,
  // showing the dashboard skeleton is fine — there's no risk of bouncing
  // to /login any more.
  if (!isPublicPath && (isLoading || !isAuthenticated || (isAuthenticated && !companiesFetched))) {
    if (isDashboardPath) {
      return isAuthenticated ? <DashboardLoadingSkeleton /> : <div className="min-h-svh bg-black/[0.04]" />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
