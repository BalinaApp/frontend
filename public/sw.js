// BalinaOS — minimal service worker.
// Amaç: tarayıcının "ana ekrana ekle" install prompt'unu tetikleyebilmesi.
// Chrome bu prompt için kayıtlı bir SW + en az bir fetch handler bekler.
// Davranış: network passthrough (offline cache yok). Tam offline desteği
// gerektiğinde serwist/workbox ile genişletilebilir.

const CACHE_VERSION = 'balina-v1';

self.addEventListener('install', (event) => {
  // Yeni SW'yi hemen aktive et — eski sürüm beklemesin.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('balina-') && k !== CACHE_VERSION)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Network passthrough — istekler doğrudan ağa gider. Cache'leme yok.
// Listener'ın varlığı Chrome'un install prompt kriteri için yeterli.
self.addEventListener('fetch', (event) => {
  // Yalnızca aynı origin'deki GET isteklerini ele al; diğerleri tarayıcı
  // varsayılan davranışına düşsün.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(fetch(event.request));
});

// ---- Web Push -----------------------------------------------------------
// Backend `web-push` JSON payload yollar: { title, body, url?, tag? }.
// `notificationclick`: aynı URL'i açık bir tab varsa öne al, yoksa yeni
// pencere aç.

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BalinaOS', body: event.data.text() };
  }

  const title = payload.title || 'BalinaOS';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag,
    renotify: !!payload.tag,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Halihazırda hedef URL açıksa onu öne al
      const targetOrigin = self.location.origin;
      const target = new URL(targetUrl, targetOrigin);
      for (const client of all) {
        const url = new URL(client.url);
        if (url.origin === target.origin) {
          // Aynı origin'den bir tab varsa onu öne al ve hedef URL'e gönder
          await client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            try {
              await client.navigate(target.href);
            } catch {
              /* navigate başarısız olsa bile focus yeterli */
            }
          }
          return;
        }
      }
      // Tab yoksa yeni pencere
      await self.clients.openWindow(target.href);
    })(),
  );
});
