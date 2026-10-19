const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `clean-url-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}web-v1`;
const SHELL = ["./", "./index.html", "./web.css", "./web.js", "./url-cleaner.js", "./manifest.webmanifest",
  "./icons/icon-32.png", "./icons/icon-128.png", "./icons/apple-touch-icon.png", "./icons/pwa-192.png", "./icons/pwa-512.png"];
const ASSETS = new Set(SHELL.map(path => new URL(path, SCOPE).href));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL.map(path => new Request(new URL(path, SCOPE), { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !ASSETS.has(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) { await cache.put(request, response.clone()); return response; }
      return (await cache.match(request)) || response;
    } catch {
      return (await cache.match(request)) || new Response("離線檔案尚未準備完成，請連線後重新開啟。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
