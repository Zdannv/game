// Service worker: bikin game bisa dipasang ke home screen, tetap kebuka pas sinyal jelek,
// dan menampilkan notifikasi streak.
const CACHE = 'love-quest-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Selalu ambil versi terbaru dari internet; cache cuma cadangan kalau offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/audio/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data?.text() }; }
  const jobs = [
    self.registration.showNotification(data.title || "Falicya's Love Quest 💖", {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || 'streak',
      renotify: true,
      data: { url: '/' },
    }),
  ];
  if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
    jobs.push(self.navigator.setAppBadge(data.badge).catch(() => {}));
  }
  e.waitUntil(Promise.all(jobs));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => 'focus' in w);
      return win ? win.focus() : self.clients.openWindow('/');
    }),
  );
});
