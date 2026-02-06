'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login - auth is now unified
    router.replace('/login');
  }, [router]);

  return null;
}
