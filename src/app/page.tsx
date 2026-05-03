'use client';

// AuthGuard handles all redirects from `/` (to /login when not
// authenticated, or to /{companySlug} / /setup-company when authenticated).
// This page only renders a neutral placeholder until AuthGuard finishes its
// auth check.
export default function Home() {
  return <div className="min-h-svh bg-black/[0.04]" />;
}
