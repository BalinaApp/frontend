'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';

const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';

const PENDING_INVITE_KEY = 'pendingInviteToken';

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteInner />
    </Suspense>
  );
}

function InviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { fetchCompanies } = useCompanyStore();

  const tokenFromUrl = searchParams.get('token');
  // Pending tokens that arrive before login flow completion are persisted in
  // sessionStorage so we can resume after the user signs in.
  const [token, setToken] = useState<string | null>(tokenFromUrl);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const acceptedRef = useRef(false);

  // Pull token from sessionStorage if URL didn't carry it (post-login bounce).
  useEffect(() => {
    if (!token) {
      const stored = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (stored) setToken(stored);
    }
  }, [token]);

  // Persist token + redirect to login if user isn't authenticated.
  useEffect(() => {
    if (!token) return;
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_INVITE_KEY, token);
      router.replace('/login');
    }
  }, [token, isAuthenticated, router]);

  // Once authenticated, accept the invite (idempotent via acceptedRef).
  useEffect(() => {
    if (!token || !isAuthenticated || acceptedRef.current) return;
    acceptedRef.current = true;
    (async () => {
      try {
        const res = await api.post(`/company/accept-invite/${token}`);
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        setCompanyName(res.data?.company?.name || res.data?.name || '');
        setStatus('success');
        // Refresh company list so the sidebar/dashboard pick up the new
        // membership immediately when the user clicks "Devam et".
        fetchCompanies().catch(() => {});
      } catch (err: any) {
        acceptedRef.current = false;
        const message =
          err.response?.data?.message ||
          err.message ||
          'Davet kabul edilemedi';
        setErrorMessage(message);
        setStatus('error');
        toast.danger(message);
      }
    })();
  }, [token, isAuthenticated, fetchCompanies]);

  if (!token) {
    return (
      <AuthShell
        title="Davet bulunamadı"
        subtitle="Bu davet bağlantısı geçersiz veya süresi dolmuş olabilir."
      >
        <Button
          className={PRIMARY_BUTTON_CLASS}
          onPress={() => router.replace('/login')}
        >
          Giriş sayfasına dön
        </Button>
      </AuthShell>
    );
  }

  if (status === 'pending') {
    return (
      <AuthShell
        title="Davet işleniyor"
        subtitle="Davetiniz onaylanıyor, lütfen bekleyin..."
      >
        <Loader2 className="h-6 w-6 animate-spin text-black/60" />
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell
        title="Davet kabul edilemedi"
        subtitle={errorMessage}
      >
        <Button
          className={PRIMARY_BUTTON_CLASS}
          onPress={() => router.replace('/login')}
        >
          Giriş sayfasına dön
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Davetiniz kabul edildi!"
      subtitle={
        companyName ? (
          <>
            <span className="font-medium text-black">{companyName}</span>{' '}
            takımına başarıyla katıldınız.
          </>
        ) : (
          'Takıma başarıyla katıldınız.'
        )
      }
    >
      <Button
        className={PRIMARY_BUTTON_CLASS}
        onPress={() => router.replace('/')}
      >
        Devam et
      </Button>
    </AuthShell>
  );
}
