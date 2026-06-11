'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowsRotateRight as Loader2 } from '@gravity-ui/icons';
import { Button, toast } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { type InvitableRoleId } from '@/lib/roles';

const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const TERTIARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-black/[0.04] text-[#18181B] hover:bg-black/[0.08] data-[hovered=true]:bg-black/[0.08]';

export const PENDING_INVITE_KEY = 'pendingInviteToken';

interface InvitePreview {
  email: string;
  role: InvitableRoleId;
  company: { id: string; name: string; slug: string };
  inviterName: string | null;
}

export default function InvitePage() {
  usePageTitle('Davet');

  return (
    <Suspense fallback={null}>
      <InviteInner />
    </Suspense>
  );
}

function InviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const { fetchCompanies } = useCompanyStore();

  const tokenFromUrl = searchParams.get('token');
  const [token, setToken] = useState<string | null>(tokenFromUrl);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedCompany, setAcceptedCompany] = useState<{
    name: string;
    slug: string;
  } | null>(null);

  const acceptedRef = useRef(false);

  // Pull token from sessionStorage if URL didn't carry it (post-login bounce).
  useEffect(() => {
    if (!token) {
      const stored = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (stored) setToken(stored);
    }
  }, [token]);

  // Public preview fetch (no auth required) — runs as soon as we have a token.
  useEffect(() => {
    if (!token) {
      setIsLoadingPreview(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/company/invite/${token}`);
        if (!cancelled) {
          setPreview(res.data);
          setPreviewError('');
        }
      } catch (err: any) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(
            err.response?.data?.message ||
              err.message ||
              'Davet bulunamadı veya süresi dolmuş'
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Once authenticated AND we already have a previewed invite, accept it.
  useEffect(() => {
    if (
      !token ||
      !isAuthenticated ||
      !preview ||
      acceptedCompany ||
      acceptedRef.current
    )
      return;
    // Only auto-accept if the signed-in user matches the invite recipient.
    if (
      user?.email &&
      preview.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return;
    }
    acceptedRef.current = true;
    setIsAccepting(true);
    (async () => {
      try {
        const res = await api.post(`/company/accept-invite/${token}`);
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        setAcceptedCompany({
          name: res.data?.company?.name || preview.company.name,
          slug: res.data?.company?.slug || preview.company.slug,
        });
        fetchCompanies().catch(() => {});
      } catch (err: any) {
        acceptedRef.current = false;
        const message =
          err.response?.data?.message ||
          err.message ||
          'Davet kabul edilemedi';
        setPreviewError(message);
        toast.danger(message);
      } finally {
        setIsAccepting(false);
      }
    })();
  }, [token, isAuthenticated, preview, user, acceptedCompany, fetchCompanies]);

  const handleAccept = () => {
    if (!token || !preview) return;
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_INVITE_KEY, token);
      router.replace('/login');
    }
    // If authenticated, the auto-accept effect above handles it.
  };

  // ---- Render branches ----

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

  if (isLoadingPreview) {
    return (
      <AuthShell title="Davet yükleniyor" subtitle="Lütfen bekleyin...">
        <Loader2 className="h-6 w-6 animate-spin text-black/60" />
      </AuthShell>
    );
  }

  if (acceptedCompany) {
    return (
      <AuthShell
        title="Davetiniz kabul edildi!"
        subtitle={
          <>
            <span className="font-medium text-black">
              {acceptedCompany.name}
            </span>{' '}
            takımına başarıyla katıldınız.
          </>
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

  if (!preview) {
    return (
      <AuthShell title="Davet kabul edilemedi" subtitle={previewError}>
        <Button
          className={PRIMARY_BUTTON_CLASS}
          onPress={() => router.replace('/login')}
        >
          Giriş sayfasına dön
        </Button>
      </AuthShell>
    );
  }

  // Authenticated but the email on the invite doesn't match the user's.
  if (
    isAuthenticated &&
    user?.email &&
    preview.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return (
      <AuthShell
        title="Bu davet size ait değil"
        subtitle={
          <>
            Davet{' '}
            <span className="font-medium text-black">{preview.email}</span>{' '}
            için gönderilmiş, ancak şu an{' '}
            <span className="font-medium text-black">{user.email}</span> ile
            giriş yapmış durumdasınız.
          </>
        }
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

  // Preview screen — shown to anyone (authenticated or not). For unauthenticated
  // visitors clicking "Daveti Kabul Et" persists the token and routes to /login;
  // after sign-in, AuthGuard returns them here and the auto-accept effect runs.
  const inviterLabel = preview.inviterName || preview.email;

  return (
    <AuthShell
      title="Takıma davet edildiniz."
      subtitle={
        <>
          <span className="font-medium text-black">{inviterLabel}</span> sizi{' '}
          <span className="font-medium text-black">{preview.company.name}</span>{' '}
          takımına davet ediyor.
        </>
      }
    >
      <Button
        className={PRIMARY_BUTTON_CLASS}
        onPress={handleAccept}
        isPending={isAccepting}
        isDisabled={isAccepting}
      >
        {isAccepting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Davet kabul ediliyor...
          </>
        ) : (
          'Daveti Kabul Et'
        )}
      </Button>
      <Button
        className={TERTIARY_BUTTON_CLASS}
        variant="tertiary"
        onPress={() => router.replace('/login')}
        isDisabled={isAccepting}
      >
        Daveti Reddet
      </Button>
    </AuthShell>
  );
}
