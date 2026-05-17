import type { MetadataRoute } from 'next';

/**
 * PWA web app manifest — Next App Router otomatik olarak
 * `/manifest.webmanifest` URL'sine bağlar. RootLayout `metadata.manifest`
 * bu yola işaret eder, böylece <link rel="manifest"> tag'i otomatik basılır.
 *
 * Yalnızca "installable" amaçlı: ana ekrana ekleme, standalone display,
 * icon ve isim. Tam offline desteği yok — service worker minimal app-shell
 * cache ile sınırlı.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'balinaOS',
    short_name: 'balinaOS',
    description:
      'Çok mağazalı e-ticaret operasyon yönetimi — balinaOS',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#e5e7eb',
    theme_color: '#18181b',
    lang: 'tr',
    icons: [
      // Yeni filename (v3 suffix) → bazı tarayıcılar/OS'lar query-string
      // cache bust'ı (?v=) ignore ediyor. Dosya adının kendisi farklı
      // olduğunda yeni resource olarak indirmek zorunda kalıyor.
      {
        src: '/icons/icon-192-v3.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-v3.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
