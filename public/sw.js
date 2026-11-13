// Increment the version whenever the offline page or approved icons change.
const CACHE_NAME = "trugen-foods-public-v1";
const OWNED_CACHE = /^trugen-foods-public-v\d+$/;
const OFFLINE_PAGE = "/offline.html";
const ICONS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  // No application HTML, JS, API data, credentials, or callback URLs.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(
    [OFFLINE_PAGE, ...ICONS].map((path) => new Request(path, {
      credentials: "omit", cache: "reload", redirect: "error",
    })),
  )));
});

self.addEventListener("activate", (event) => {
  // Normal waiting lifecycle: do not take over existing windows or reload them.
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => OWNED_CACHE.test(name) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)),
  )));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // All cross-origin requests (including Supabase) and mutations pass untouched.
  if (request.method !== "GET" || request.headers.has("authorization")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Preserve the original recovery URL for the app. Never retain navigation
    // requests/responses in Cache Storage or the browser HTTP cache.
    event.respondWith(fetch(request, { cache: "no-store" }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match(OFFLINE_PAGE) ?? Response.error();
    }));
    return;
  }

  // Exact public icon paths only; query-bearing URLs are never cache keys.
  if (!url.search && ICONS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
      await cache.match(url.pathname) ?? fetch(request),
    ));
  }
  // No runtime cache writes, background sync, or general GET caching.
});
