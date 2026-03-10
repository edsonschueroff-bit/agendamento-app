// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAaCSMvGi6eAqeYAapyUXiPn8mcmHsV-4k',
  authDomain: 'agendamento-app-2e4e2.firebaseapp.com',
  projectId: 'agendamento-app-2e4e2',
  storageBucket: 'agendamento-app-2e4e2.firebasestorage.app',
  messagingSenderId: '288645485154',
  appId: '1:288645485154:web:41cce074616cbf5e5cb73b',
});

const messaging = firebase.messaging();

// Keep this SW focused on push notifications only.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('agenda-facil-'))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Nova notificacao';
  const notificationOptions = {
    body: payload.notification?.body || 'Voce recebeu uma nova atualizacao.',
    icon: '/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
