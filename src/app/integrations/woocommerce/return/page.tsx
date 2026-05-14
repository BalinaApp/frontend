'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button } from '@heroui/react';
import {
  ArrowsRotateRight as Loader2,
  Check,
  CircleExclamation as AlertCircle,
} from '@gravity-ui/icons';
import { api } from '@/services/api';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { usePageTitle } from '@/hooks/use-page-title';

type WcStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED';

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 60_000;

export default function WoocommerceReturnPage() {
  usePageTitle('WooCommerce bağlanıyor');

  return (
    <Suspense fallback={<Centered><Spinner /></Centered>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentCompany, companies } = useCompanyStore();
  const { fetchStores, syncStore } = useStoreStore();

  const stateParam = searchParams.get('state');

  const [status, setStatus] = useState<WcStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // start fonksiyonu sessionStorage'a yazmıştı. WP roundtrip'i sırasında
  // kullanıcı tab değiştirip currentCompany'i değiştirmiş olabilir; bu yüzden
  // sessionStorage'ı önceliyoruz.
  const persistedCompanyId =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('wcAuthCompanyId')
      : null;
  const companyId = persistedCompanyId || currentCompany?.id || null;

  const stoppedRef = useRef(false);
  const completedStoreIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!stateParam || !companyId) return;

    stoppedRef.current = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await api.get(
          `/company/${companyId}/stores/woocommerce/auth/status/${stateParam}`,
        );
        const data = res.data as {
          status: WcStatus;
          storeId?: string;
          error?: string;
        };

        if (data.storeId) completedStoreIdRef.current = data.storeId;

        if (data.status !== 'PENDING') {
          stoppedRef.current = true;
          setStatus(data.status);
          if (data.error) setErrorMsg(data.error);
          return;
        }

        setStatus('PENDING');
        if (Date.now() - startedAt > POLL_MAX_MS) {
          stoppedRef.current = true;
          setStatus('EXPIRED');
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error: unknown) {
        stoppedRef.current = true;
        const err = error as {
          response?: { status?: number; data?: { message?: string; error?: string } };
        };
        const apiError = err.response?.data?.message || err.response?.data?.error;
        if (err.response?.status === 404) {
          setStatus('EXPIRED');
          setErrorMsg('Bağlantı kaydı bulunamadı veya süresi dolmuş.');
        } else {
          setStatus('FAILED');
          setErrorMsg(apiError || 'Durum sorgusu başarısız.');
        }
      }
    };

    poll();
    return () => {
      stoppedRef.current = true;
    };
  }, [stateParam, companyId]);

  // COMPLETED — store listesini tazele, ilk sync'i başlat, mağaza sayfasına geç.
  useEffect(() => {
    if (status !== 'COMPLETED' || !companyId) return;
    const storeId = completedStoreIdRef.current;

    void (async () => {
      try {
        await fetchStores(companyId);
        if (storeId) {
          // Yeni mağaza için initial sync — eski form akışındaki davranışla
          // tutarlı. Başlatılamazsa kullanıcı stores sayfasından elle deneyebilir.
          syncStore(companyId, storeId).catch(() => undefined);
        }
      } catch {
        // sessiz — mağaza listesi sayfasında zaten yeniden fetch oluyor.
      }
    })();

    const slug = currentCompany?.slug || companies[0]?.slug;
    const target = slug ? `/${slug}/stores` : '/';
    const t = setTimeout(() => {
      sessionStorage.removeItem('wcAuthCompanyId');
      sessionStorage.removeItem('wcAuthState');
      router.replace(target);
    }, 1200);
    return () => clearTimeout(t);
  }, [status, companyId, currentCompany, companies, router, fetchStores, syncStore]);

  const goBackToStores = () => {
    sessionStorage.removeItem('wcAuthCompanyId');
    sessionStorage.removeItem('wcAuthState');
    const slug = currentCompany?.slug || companies[0]?.slug;
    router.replace(slug ? `/${slug}/stores` : '/');
  };

  if (!stateParam) {
    return (
      <Centered>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Geçersiz dönüş bağlantısı</Alert.Title>
            <Alert.Description>
              `state` parametresi bulunamadı. Mağaza bağlama akışını yeniden başlatın.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Button onPress={goBackToStores} fullWidth>
          Mağazalara dön
        </Button>
      </Centered>
    );
  }

  if (!companyId) {
    return (
      <Centered>
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Şirket bilgisi yüklenemedi</Alert.Title>
            <Alert.Description>
              Lütfen tekrar giriş yapıp WooCommerce bağlantısını yeniden başlatın.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </Centered>
    );
  }

  return (
    <Centered>
      {(!status || status === 'PENDING') && (
        <>
          <Spinner />
          <div className="text-center">
            <h1 className="text-lg font-medium">WooCommerce bilgileri kaydediliyor</h1>
            <p className="mt-1 text-sm text-muted">
              Bu birkaç saniye sürebilir. Sayfayı kapatmayın.
            </p>
          </div>
        </>
      )}

      {status === 'COMPLETED' && (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-medium">Mağaza bağlandı</h1>
            <p className="mt-1 text-sm text-muted">
              Mağaza listesine yönlendiriliyorsunuz…
            </p>
          </div>
          <Button onPress={goBackToStores} variant="outline" fullWidth>
            Mağazalara dön
          </Button>
        </>
      )}

      {status === 'FAILED' && (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-medium">Bağlantı başarısız</h1>
            <p className="mt-1 text-sm text-muted">
              {errorMsg || 'WooCommerce bağlantısı tamamlanamadı.'}
            </p>
          </div>
          <Button onPress={goBackToStores} fullWidth>
            Tekrar dene
          </Button>
        </>
      )}

      {status === 'EXPIRED' && (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-medium">Süre doldu</h1>
            <p className="mt-1 text-sm text-muted">
              {errorMsg || 'Onay süresi 10 dakika içinde tamamlanmadı.'}
            </p>
          </div>
          <Button onPress={goBackToStores} fullWidth>
            Yeniden başlat
          </Button>
        </>
      )}
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-lg bg-white/80 p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <Loader2 className="h-10 w-10 animate-spin text-muted" />;
}
