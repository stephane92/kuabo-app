// Kuabo Service Worker — PWA + FCM
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyAfyqpqdUBixIz1_TmXzZsuoiatXfGLStQ",
  authDomain:        "kuabo-42d9c.firebaseapp.com",
  projectId:         "kuabo-42d9c",
  storageBucket:     "kuabo-42d9c.firebasestorage.app",
  messagingSenderId: "774805697",
  appId:             "1:774805697:web:1fa1a94076fd8e7c8f5c40",
});

const messaging = firebase.messaging();

// Notifications en arrière-plan (app fermée)
messaging.onBackgroundMessage((payload) => {
  const { title = "Kuabo", body = "" } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-96.png",
    vibrate: [200, 100, 200],
    data:    { url: payload.data?.url || "/dashboard" },
  });
});

// Clic sur notification → ouvrir l'app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});

// Cache statique
const CACHE_NAME = "kuabo-v2";
const STATIC_ASSETS = ["/", "/dashboard", "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("firestore") ||
    event.request.url.includes("firebase") ||
    event.request.url.includes("googleapis") ||
    event.request.url.includes("anthropic")
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((c) => c || caches.match("/dashboard"))
      )
  );
});
