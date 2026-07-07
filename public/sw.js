// public/sw.js - robust service worker for Tapas Grocery Store

self.addEventListener('install', (event) => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients as soon as possible
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network‑first strategy with a safe fallback if both network and cache fail
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) =>
        cached || new Response('Service unavailable', { status: 503, statusText: 'Service Unavailable' })
      )
    )
  );
});
