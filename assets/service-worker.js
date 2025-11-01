self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('boda-cache-v2').then(cache => cache.addAll([
      'index.html','invite.html','admin.html',
      'assets/api.js','assets/app.js','assets/admin.js','assets/manifest.json'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
