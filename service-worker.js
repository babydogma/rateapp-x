const CACHE_NAME = 'rateappx-v1';
const OFFLINE_URL = '/';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev) => {
  // онлайн-первым, если не доступно — вернуть из кеша
  ev.respondWith(
    fetch(ev.request).catch(() => caches.match(ev.request).then(r => r || caches.match(OFFLINE_URL)))
  );
});
