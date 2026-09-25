// Service worker: bikin game bisa dipasang ke home screen, bisa dimainin offline,
// dan menampilkan notifikasi streak.
const CACHE = 'love-quest-v9';
const FONT_CACHE = 'love-quest-fonts';

// Semua file game disimpan dari awal, biar bisa dibuka offline walaupun belum pernah dimainin.
// (Kalau nambah file baru, tambahin juga di sini.)
const PRECACHE = [
  '/', '/index.html', '/manifest.webmanifest', '/css/style.css',
  '/js/main.js', '/js/config.js', '/js/audio.js', '/js/confetti.js', '/js/util.js', '/js/streak.js', '/js/kita.js',
  '/js/games/memory.js', '/js/games/catch.js', '/js/games/pop.js', '/js/games/quiz.js', '/js/games/puzzle.js',
  '/js/games/odd.js', '/js/games/simon.js', '/js/games/fly.js', '/js/games/stack.js', '/js/games/runner.js',
  '/js/games/throw.js', '/js/games/maze.js', '/js/games/timing.js',
  '/img/fall-kecil.jpg', '/img/aidan-kecil.jpg', '/img/aidan-kecil-2.jpg', '/img/berdua.jpg',
  '/img/fall-head.jpg', '/img/aidan-head.jpg',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png', '/icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // satu file gagal nggak bikin semuanya gagal
      .then((c) => Promise.allSettled(PRECACHE.map((url) => c.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Font Google: simpan sekali, pakai terus (biar tulisan tetap lucu pas offline)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      }))),
    );
    return;
  }

  // Lagu (mp3) dilewatkan: browser mintanya sepotong-sepotong, nggak cocok disimpan di cache
  if (url.origin !== location.origin || url.pathname.startsWith('/audio/')) return;

  const fromCache = () => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : null));
  const saveCopy = (res) => {
    if (res.ok && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };

  // Foto & ikon jarang berubah: langsung pakai simpanan di HP (cepat, nggak nunggu internet)
  if (/\.(?:jpg|jpeg|png|webp|gif)$/i.test(url.pathname)) {
    e.respondWith(fromCache().then((hit) => hit || fetch(req).then(saveCopy)).catch(() => Response.error()));
    return;
  }

  // Kode game: coba versi terbaru dulu, tapi kalau internet lemot/putus maksimal nunggu 3 detik
  e.respondWith(new Promise((resolve) => {
    let settled = false;
    const useCache = () => fromCache().then((hit) => {
      if (hit && !settled) { settled = true; resolve(hit); }
      return hit;
    });
    const timer = setTimeout(useCache, 3000);
    fetch(req)
      .then((res) => {
        clearTimeout(timer);
        saveCopy(res);
        if (!settled) { settled = true; resolve(res); }
      })
      .catch(() => {
        clearTimeout(timer);
        useCache().then((hit) => { if (!settled) { settled = true; resolve(hit || Response.error()); } });
      });
  }));
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
