/**
 * APhim Super — Enterprise Service Worker
 * Version: 3.0.0
 * Features: Static Assets Cache + Ultra-Fast Movie Poster & Image Caching (Cache-First 0ms)
 */

const STATIC_CACHE = 'aphim-static-v46';
const IMAGE_CACHE = 'aphim-images-v2';
const MAX_IMAGE_ENTRIES = 60;

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/manifest.json',
  '/css/movie-cards-v2.css?v=10014',
  '/css/light-mode.css?v=20261031b'
];

// Domains of movie image CDNs eligible for high-speed local caching
const IMAGE_HOSTS = [
  'phimimg.com',
  'img.phimapi.com',
  'img.ophimimg.com',
  'image.tmdb.org',
  'vsmov.com'
];

// Helper: Trim cache to prevent taking excess storage
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map(k => cache.delete(k)));
    }
  } catch (_) {}
}

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        if (err && err.name === 'QuotaExceededError') {
          try { await caches.delete(IMAGE_CACHE); } catch (_) {}
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== IMAGE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Fetch Event: Dual-pipeline (Ultra-Fast Image Caching + Network-First Static)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Bỏ qua các scheme lạ và Range request (video streaming / audio chunks để trình duyệt tự xử lý)
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) return;
  if (req.headers && req.headers.has('range')) return;

  const url = new URL(req.url);

  // Bỏ qua các file media streaming
  if (/\.(?:m3u8|ts|mp4|m4s|webm|mp3|aac)(?:\?.*)?$/i.test(url.pathname)) {
    return;
  }

  // 🚀 PIPELINE 1: MOVIE POSTER & THUMBNAIL IMAGES (Cache-First with Background Fallback)
  const isImageHost = IMAGE_HOSTS.some(host => url.hostname.includes(host));
  const isImageFile = /\.(?:jpg|jpeg|png|webp|avif)(?:\?.*)?$/i.test(url.pathname);

  if (isImageHost || (req.destination === 'image' && isImageFile)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          return cachedResponse; // ⚡ Tức thì 0ms từ bộ nhớ đệm
        }

        try {
          const networkResponse = await fetch(req);
          // Opaque response (type === 'opaque') từ cross-origin CDN vẫn lưu cache hợp lệ
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(req, networkResponse.clone()).catch(() => {});
            // Dọn bớt nếu vượt quá giới hạn
            setTimeout(() => trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES), 2000);
          }
          return networkResponse;
        } catch (fetchErr) {
          // Nếu mất mạng hoặc server CDN lỗi, thử tìm lại cache
          const fallback = await cache.match(req);
          return fallback || new Response('', { status: 408, statusText: 'Request Timeout' });
        }
      })
    );
    return;
  }

  // 🛡️ Bỏ qua API routes, trang chi tiết phim SSR, video player, admin
  // Giúp trình duyệt trực tiếp nạp từ Server với HTTP Cache siêu tốc, không bao giờ bị lỗi 504
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/phim') ||
    url.pathname.startsWith('/xem-phim') ||
    url.pathname.startsWith('/phim-song-ngu') ||
    url.pathname.startsWith('/aphim-quan-tri') ||
    url.pathname.startsWith('/admin')
  ) {
    return;
  }

  // 🚀 PIPELINE 2: STATIC PAGES & LOCAL ASSETS (Network-First with Cache Fallback)
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(req, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(req);
        return cachedResponse || Response.error();
      })
  );
});
