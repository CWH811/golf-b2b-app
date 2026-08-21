const CACHE_NAME = 'gcore-offline-v2';
const APP_SHELL = ['/', '/login', '/admin', '/manifest.webmanifest'];
const CART_STATE_URL = '/offline/cart-state';
const ADMIN_API_PREFIX = '/api/admin/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cart state: serve from cache or return empty
  if (url.pathname === CART_STATE_URL) {
    event.respondWith(
      caches.match(CART_STATE_URL).then(
        (cached) => cached || new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Admin API calls: network-first with no cache fallback for data freshness
  if (url.pathname.startsWith(ADMIN_API_PREFIX)) {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => {
        return caches.match(request).then(
          (cached) => cached || new Response(JSON.stringify({ error: 'You are offline. Admin data requires a network connection.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      })
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: stale-while-revalidate
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_CART_STATE') {
    event.waitUntil(cacheCartState(event.data.payload));
  }
  if (event.data?.type === 'CACHE_SCAN_QUEUE') {
    event.waitUntil(cacheScanQueue(event.data.payload));
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('controllerchange', () => {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'GCORE_SW_UPDATE' }));
  });
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/') || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((networkResponse) => {
    const copy = networkResponse.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return networkResponse;
  }).catch(() => cached);

  return cached || networkPromise;
}

async function cacheCartState(payload) {
  const cache = await caches.open(CACHE_NAME);
  const response = new Response(JSON.stringify(payload || { items: [] }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
  await cache.put(CART_STATE_URL, response);
}

const SCAN_QUEUE_URL = '/offline/scan-queue';

async function cacheScanQueue(payload) {
  const cache = await caches.open(CACHE_NAME);
  const response = new Response(JSON.stringify(payload || []), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
  await cache.put(SCAN_QUEUE_URL, response);
}
