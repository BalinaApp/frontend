'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';

/** Base64URL → Uint8Array — `PushManager.subscribe(applicationServerKey)` Uint8Array bekler. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface State {
  /** Tarayıcı + SW + Push API destekliyor mu? */
  isSupported: boolean;
  /** Mevcut tarayıcı bu kullanıcı + şirket için abonelik kaydetmiş mi? */
  isSubscribed: boolean;
  isLoading: boolean;
  /** `Notification.permission` snapshot'ı. */
  permission: NotificationPermission | 'unsupported';
}

/** API destekleniyor mu? Synchronous detect — initial state için. */
function detectSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** SW kayıtlı değilse `/sw.js`'i kaydet, sonra `ready`'yi döndür. ServiceWorkerRegister
 *  dev modunda kayıt yapmıyor — bu yüzden hook kendi sorumluluğunu alır. */
async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Web push abonelik akışı için hook. `/settings/notifications` sayfasındaki
 * toggle bunu kullanır.
 *
 * - `subscribe(companyId)`: izin iste, PushManager.subscribe çağır, backend'e
 *   gönder. Idempotent — zaten kayıtlıysa no-op.
 * - `unsubscribe(companyId)`: SW subscription'ı pushManager'dan iptal eder,
 *   backend kaydını siler. Browser permission'ı yine "granted" kalır
 *   (kullanıcı tarayıcı ayarından geri alabilir).
 */
export function usePushNotifications(companyId: string | undefined) {
  // isSupported'i synchronously detect — toggle render'ı SW kaydını beklemesin.
  const [state, setState] = useState<State>(() => ({
    isSupported: detectSupport(),
    isSubscribed: false,
    isLoading: true,
    permission:
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'unsupported',
  }));

  const refreshSubscription = useCallback(async () => {
    if (typeof window === 'undefined' || !detectSupport()) {
      setState({
        isSupported: false,
        isSubscribed: false,
        isLoading: false,
        permission: 'unsupported',
      });
      return;
    }
    try {
      const reg = await ensureServiceWorkerReady();
      const existing = await reg.pushManager.getSubscription();
      setState({
        isSupported: true,
        isSubscribed: !!existing,
        isLoading: false,
        permission: Notification.permission,
      });
    } catch (err) {
      // SW kayıt edilemedi (örn. Next dev'in /_next interception'ı) —
      // isSupported true kalır ama subscribe çağrıldığında tekrar denenir.
      console.warn('[Push] SW ready failed:', err);
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !companyId) return false;

    // 1) İzin
    let perm: NotificationPermission = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
      setState((s) => ({ ...s, permission: perm }));
      return false;
    }

    // 2) VAPID public key
    const { data } = await api.get<{ publicKey: string }>(
      `/company/${companyId}/push/vapid-public-key`,
    );
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    // 3) PushManager.subscribe — mevcut varsa yeniden kullan
    const reg = await ensureServiceWorkerReady();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // TS lib.dom'da PushSubscriptionOptionsInit.applicationServerKey
        // BufferSource bekliyor; Uint8Array<ArrayBufferLike> ile cast hatası
        // veriyor (TS 5.7+ strict ArrayBuffer). BufferSource'a explicit cast.
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // 4) Backend'e kaydet
    const json = sub.toJSON();
    await api.post(`/company/${companyId}/push/subscribe`, {
      endpoint: sub.endpoint,
      keys: {
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      },
      userAgent: navigator.userAgent,
    });

    setState({
      isSupported: true,
      isSubscribed: true,
      isLoading: false,
      permission: perm,
    });
    return true;
  }, [companyId, state.isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !companyId) return false;
    const reg = await ensureServiceWorkerReady();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      setState((s) => ({ ...s, isSubscribed: false }));
      return true;
    }
    const endpoint = sub.endpoint;
    try {
      await sub.unsubscribe();
    } catch {
      // continue — backend'e silme isteği yine de yollanır
    }
    try {
      await api.delete(`/company/${companyId}/push/unsubscribe`, {
        data: { endpoint },
      });
    } catch {
      // silme başarısız olabilir — kullanıcı arayüzünde state güncellenir
    }
    setState((s) => ({ ...s, isSubscribed: false }));
    return true;
  }, [companyId, state.isSupported]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: refreshSubscription,
  };
}
