'use client';

import { useEffect } from 'react';

/**
 * `/sw.js` dosyasını kullanıcı navigasyonu sonrası kaydeder. Sadece prod'da
 * çalışır — dev modunda Next HMR ile çakışmasın diye atlanır. SW'nin amacı
 * "installable" PWA kriterini karşılamak; davranış network passthrough.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // SW kaydı başarısız olabilir (private mode, kapalı network vs.) —
          // PWA install özelliği kapanır ama uygulama çalışmaya devam eder.
          console.warn('[PWA] Service worker kaydı başarısız:', err);
        });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return null;
}
