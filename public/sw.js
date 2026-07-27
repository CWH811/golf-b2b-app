const CACHE_NAME = 'gcore-offline-v1';
const APP_SHELL = ['/', '/login', '/manifest.webmanifest'];
const CART_STATE_URL = '/offline/cart-state';

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

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === CART_STATE_URL) {
    event.respondWith(caches.match(CART_STATE_URL).then((cached) => cached || new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_CART_STATE') {
    event.waitUntil(cacheCartState(event.data.payload));
  }
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
