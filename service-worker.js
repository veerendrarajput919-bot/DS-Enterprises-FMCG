/* ==========================================================================
   DS ENTERPRISES — SERVICE WORKER
   File: service-worker.js
   Description: Caches application assets with Network-First strategy for
                immediate live updates and 100% offline capability
   ========================================================================== */

const CACHE_NAME = 'ds-enterprises-fmcg-v37';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/css/dashboard.css',
  './assets/css/responsive.css',
  './assets/css/print.css',
  './assets/js/storage.js',
  './assets/js/auth.js',
  './assets/js/app.js',
  './assets/js/api.js',
  './assets/js/whatsapp.js',
  './assets/js/filters.js',
  './assets/js/dashboard.js',
  './assets/js/orders.js',
  './assets/js/payments.js',
  './assets/js/sales.js',
  './assets/js/stock.js',
  './assets/js/dispatch.js',
  './assets/js/excel-import.js',
  './assets/js/route-assignment.js',
  './assets/js/sales-officers.js',
  './assets/images/logo.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './components/header.html',
  './components/sidebar.html',
  './components/footer.html',
  './components/modal.html',
  './components/notification.html',
  './pages/login.html',
  './pages/dashboard.html',
  './pages/sales-analysis.html',
  './pages/party-wise.html',
  './pages/route-analysis.html',
  './pages/route-assignment.html',
  './pages/item-brand-wise-sale.html',
  './pages/outstanding-party-wise.html',
  './pages/outstanding-brand-wise.html',
  './pages/payment-collections.html',
  './pages/stock.html',
  './pages/order-punching.html',
  './pages/order-report.html',
  './pages/sales-officers.html',
  './pages/order-approval.html',
  './pages/dispatch-challan.html',
  './pages/loading-sheet.html',
  './pages/upload-update.html',
  './pages/clear-old-data.html'
];

// Install Event — Pre-cache core files and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets v37...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event — Clean up stale cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging stale cache version:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network-First with Cache Fallback for real-time fresh updates
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.startsWith('http') || event.request.url.startsWith('https'))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline) -> serve from cache
        return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html', { ignoreSearch: true });
          }
        });
      })
  );
});
