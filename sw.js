/* AV2 Field Map — offline app shell.
   Bump CACHE when you edit index.html, or the phone will keep serving the old one. */
var CACHE = "av2-v5";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll fails the whole install if any one file 404s, so add them individually
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);

  // Never touch tile traffic — tiles are handled by the page's own IndexedDB store.
  if (url.hostname.indexOf("tile.") === 0 || url.pathname.indexOf(".png") > -1 && url.origin !== location.origin) {
    return;
  }
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return;

  // Cache first: on the trail there is no network, and the app shell never changes mid-trip.
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) {
        // Refresh in the background when there is signal, but serve the cache immediately.
        fetch(e.request).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(e.request, res); });
        }).catch(function () {});
        return hit;
      }
      return fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
