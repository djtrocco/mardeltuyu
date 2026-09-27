// Service Worker mínimo — Alquiler Mar del Tuyú
// Objetivo: que el ícono instalado abra rápido y no rompa nada de Firestore.
// No cachea nada de datos (reservas, config), solo el "cascarón" visual de la app.

const CACHE_NAME = 'mardeltuyu-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo intervenimos en pedidos GET a nuestro propio dominio.
  // Todo lo demás (Firestore, CallMeBot, Supabase, etc.) pasa directo,
  // sin que el Service Worker lo toque.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navegación (abrir la app): red primero, y si no hay conexión, el cascarón guardado.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Assets propios (íconos, manifest): cache primero, red de respaldo.
  if (SHELL_ASSETS.some((asset) => request.url.endsWith(asset))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
