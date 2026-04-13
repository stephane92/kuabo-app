// Kuabo Service Worker — PWA
const CACHE_NAME = 'kuabo-v1';

// Fichiers à mettre en cache pour le mode offline
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Installation — mise en cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore les erreurs de cache
      });
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stratégie Network First avec fallback cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et Firebase
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firestore') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('anthropic')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse fraîche
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache si offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Page offline par défaut
          return caches.match('/dashboard');
        });
      })
  );
});

// Notifications push (pour FCM plus tard)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kuabo', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: data.url || '/dashboard',
      vibrate: [200, 100, 200],
    })
  );
});

// Clic sur notification → ouvrir l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/dashboard')
  );
});
