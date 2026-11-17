// Smart Network-First Service Worker: keeps PWA installability (beforeinstallprompt) active,
// always fetches fresh HTML/logic from the network first, bypasses live audio streams,
// and caches static assets (fonts, backgrounds, icons, muxer scripts) for fast repeat loads.
const SW_VERSION = 'refa3y-smart-cache-v3';
const STATIC_ASSET_REGEX = /\.(woff2?|ttf|otf|jpg|jpeg|png|webp|svg|css|min\.js)$/i;
const STREAM_BYPASS_REGEX = /(\.m3u8|\.mp3|mp3quran|everyayah|radiojar|qurango|archive\.org)/i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url || '';
  if (STREAM_BYPASS_REGEX.test(url)) {
    return;
  }

  const isStaticAsset = STATIC_ASSET_REGEX.test(url);

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (isStaticAsset && networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(SW_VERSION).then((cache) => {
            try { cache.put(event.request, responseClone); } catch (e) {}
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
