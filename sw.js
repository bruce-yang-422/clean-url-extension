const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `clean-url-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}web-v3`;
const SHELL = ["./", "./index.html", "./privacy.html", "./web.css", "./web.js", "./url-cleaner.js", "./share-target.js", "./manifest.webmanifest",
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
  if (request.method === "POST" && request.url === new URL("./share-target", SCOPE).href) {
    event.respondWith((async () => {
      let payload = {};
      try {
        const form = await request.formData();
        for (const key of ["url", "text", "title"]) {
          const value = form.get(key);
          if (typeof value === "string") payload[key] = value;
        }
      } catch { /* Let the page explain that no usable URL was received. */ }
      // Return the cached UI directly: redirects can bypass the worker offline.
      // The encoded payload only exists in this uncached response, never in a URL.
      const cache = await caches.open(CACHE_NAME);
      const shell = await cache.match(new Request(new URL("./index.html", SCOPE)));
      if (!shell) return new Response("請連線開啟 Clean URL 完成離線準備後，再重新分享。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      const marker = `<meta name="clean-url-share" content="${encodeURIComponent(JSON.stringify(payload)).replace(/'/g, "%27")}">`;
      const html = (await shell.text()).replace("<head>", `<head>${marker}`);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    })());
    return;
  }
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
