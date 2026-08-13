/* Service Worker — App-Shell zwischenspeichern, damit offline gespielt werden kann. */
var CACHE = 'blocktris-v1';
var ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/engine.js',
  './js/audio.js',
  './js/shop.js',
  './js/render.js',
  './js/input.js',
  './js/ui.js',
  './js/main.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) {
        // Im Hintergrund auffrischen (stale-while-revalidate).
        fetch(e.request).then(function (res) {
          if (res && res.ok) { caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); }); }
        }).catch(function () { /* offline */ });
        return hit;
      }
      return fetch(e.request).then(function (res) {
        if (res && res.ok && e.request.url.indexOf('http') === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
