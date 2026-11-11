// 依註冊範圍區分快取，避免影響同網域其他專案，並支援子目錄部署。
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `clean-url-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}web-v3`;
const SHELL = ["./", "./index.html", "./privacy.html", "./web.css", "./web.js", "./url-cleaner.js", "./share-target.js", "./manifest.webmanifest",
  "./icons/icon-32.png", "./icons/icon-128.png", "./icons/apple-touch-icon.png", "./icons/pwa-192.png", "./icons/pwa-512.png"];
const ASSETS = new Set(SHELL.map(path => new URL(path, SCOPE).href));

// 安裝時下載離線介面資源，完成後立即啟用新版。
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL.map(path => new Request(new URL(path, SCOPE), { cache: "reload" })))).then(() => self.skipWaiting()));
});
// 僅清除本專案的舊版快取，並接管已開啟的頁面。
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
      } catch { /* 交由頁面提示未收到可用網址。 */ }
      // 直接回傳快取介面，避免離線時重新導向繞過 Service Worker。
      // 分享資料僅注入本次回應的 meta 標籤，不寫入網址或快取。
      const cache = await caches.open(CACHE_NAME);
      const shell = await cache.match(new Request(new URL("./index.html", SCOPE)));
      if (!shell) return new Response("請連線開啟 Clean URL 完成離線準備後，再重新分享。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      const marker = `<meta name="clean-url-share" content="${encodeURIComponent(JSON.stringify(payload)).replace(/'/g, "%27")}">`;
      const html = (await shell.text()).replace("<head>", `<head>${marker}`);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    })());
    return;
  }
  // 僅處理白名單中的靜態資源；外部網址與帶查詢參數的請求不快取。
  if (request.method !== "GET" || !ASSETS.has(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // 優先取得網路新版，連線或回應失敗時退回既有快取。
      const response = await fetch(request);
      if (response.ok) { await cache.put(request, response.clone()); return response; }
      return (await cache.match(request)) || response;
    } catch {
      return (await cache.match(request)) || new Response("離線檔案尚未準備完成，請連線後重新開啟。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
