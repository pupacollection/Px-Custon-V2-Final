// PX CUSTOM — Service Worker (Safe Mode)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpa qualquer cache antigo para evitar scripts defasados ou conflito com o Vite
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Em desenvolvimento ou em requisições de módulos/Vite, nunca interceptar
self.addEventListener('fetch', () => {
  return;
});
