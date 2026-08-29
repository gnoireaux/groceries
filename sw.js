/* Groceries service worker — offline after first load.
   Navigation = network-first (picks up updates when online, cache when offline).
   Other same-origin assets = cache-first. */
const CACHE = 'groceries-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(r => {
        if (r.ok && new URL(req.url).origin === self.location.origin) {
          const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp));
        }
        return r;
      }).catch(() => hit)
    )
  );
});
