/* ShopFlow service worker — offline-first app shell + runtime cache.
 * Strategy:
 *  - Precache: app shell ('/'), manifest, icons.
 *  - Navigations: network-first → fallback to cached '/' (SPA shell).
 *  - Same-origin static assets (JS/CSS/images/fonts): stale-while-revalidate.
 *  - Cross-origin (e.g. fonts.gstatic.com, Cloudinary images): cache-first with network fallback.
 *  - Never cache: POST/PUT/DELETE, /~oauth/*, supabase auth.
 */
const VERSION = "shopflow-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const isAsset = (url) =>
  /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept OAuth or auth endpoints
  if (url.pathname.startsWith("/~oauth")) return;
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/auth/")) return;

  // Navigations → network-first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () =>
          (await caches.match(req)) || (await caches.match("/")) || Response.error()
        )
    );
    return;
  }

  // Same-origin assets → stale-while-revalidate
  if (url.origin === self.location.origin && isAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin (fonts, Cloudinary images) → cache-first
  if (url.origin !== self.location.origin && isAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
  }
});
