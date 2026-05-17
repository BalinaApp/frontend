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
    name: 'BalinaOS',
    short_name: 'BalinaOS',
    description:
      'Çok mağazalı e-ticaret operasyon yönetimi — BalinaOS',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#e5e7eb',
    theme_color: '#18181b',
    lang: 'tr',
    icons: [
      // ?v=2 → yeni logo rasterizasyonu için cache bust (PNG'ler değişti
      // ama eski PWA install'lar OS cache'inden eski ikonu gösteriyordu).
      {
        src: '/icons/icon-192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
