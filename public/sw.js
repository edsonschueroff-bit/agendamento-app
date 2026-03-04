// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAaCSMvGi6eAqeYAapyUXiPn8mcmHsV-4k",
    authDomain: "agendamento-app-2e4e2.firebaseapp.com",
    projectId: "agendamento-app-2e4e2",
    storageBucket: "agendamento-app-2e4e2.firebasestorage.app",
    messagingSenderId: "288645485154",
    appId: "1:288645485154:web:41cce074616cbf5e5cb73b"
});

const messaging = firebase.messaging();

const CACHE_NAME = 'agenda-facil-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Background Push handling
messaging.onBackgroundMessage((payload) => {
    console.log('Mensagem em background recebida:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
