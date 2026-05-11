'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';

// Paths that don't require authentication
const publicPaths = ['/login', '/verify-email', '/auth/google-callback'];
// Paths that authenticated users without a company can access
const companySetupPaths = ['/setup-company'];
// Paths that handle their own auth flow — AuthGuard doesn't redirect to or
// away from these. /invite reads a token, optionally bounces to /login,
// then accepts the invite once the user is authenticated.
const selfManagedPaths = ['/invite'];

function DashboardLoadingSkeleton() {
  // Neutral placeholder — no skeleton bars. Matches the dashboard layout's
  // gray bg + 80-px sidebar gutter + rounded white content card so the user
  // doesn't see a flash before AuthGuard finishes routing.
  return (
    <div className="flex h-screen w-full bg-background">
      <aside className="hidden h-screen w-20 shrink-0 md:block" aria-hidden="true" />
      <main className="flex h-screen flex-1 flex-col p-1 pl-0">
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white/40 shadow-[0_0_8px_-2px_rgba(0,0,0,0.04)]" />
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

    // If the user has just landed on a public/auth surface but they had a
    // pending invite (token kept in sessionStorage from a previous /invite
    // visit), bounce them back to /invite so the acceptance flow can finish
    // before AuthGuard sends them to /setup-company or /{slug}.
    if (isAuthenticated) {
      const pendingInvite = sessionStorage.getItem('pendingInviteToken');
      if (pendingInvite) {
        router.replace('/invite');
        return;
      }
    }

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

  // While we don't know yet whether the user is authenticated, render a
  // neutral placeholder for ALL paths — including public ones (/login,
  // /verify-email). If we render the public page early, its own
  // useEffect can fire `router.replace('/login')` based on the stale
  // `isAuthenticated=false` value, and then once checkAuth() lands and
  // flips it to true, this guard fires `router.push('/{slug}')` — two
  // overlapping transitions that Next.js 16 Turbopack rejects with
  // InvalidStateError. When there's no accessToken, authCheckDone flips
  // synchronously (see effect above) so the placeholder is one frame.
  if (!isHydrated || !authCheckDone) {
    return <div className="min-h-svh bg-default/60" />;
  }

  // Just signed in on /login or /verify-email and waiting for the companies
  // fetch to settle. Don't keep rendering the auth surface (the OTP form,
  // the email entry) — show the same neutral placeholder so there's no
  // flash of stale auth chrome before AuthGuard redirects out.
  if (isPublicPath && isAuthenticated && !companiesFetched) {
    return <div className="min-h-svh bg-default/60" />;
  }

  // Once we know the user is authenticated but companies are still loading,
  // showing the dashboard skeleton is fine — there's no risk of bouncing
  // to /login any more.
  if (!isPublicPath && (isLoading || !isAuthenticated || (isAuthenticated && !companiesFetched))) {
    if (isDashboardPath) {
      return isAuthenticated ? <DashboardLoadingSkeleton /> : <div className="min-h-svh bg-default/60" />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
