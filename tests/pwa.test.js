import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
function worker({ offline = false } = {}) {
  const handlers = new Map();
  const entries = new Map();
  const cacheNames = ["unrelated-app-v1", "clean-url-%2Fclean-url-extension%2F-old"];
  const removed = [];
  const cache = {
    async addAll(requests) { for (const request of requests) entries.set(request.url, new Response("app-shell")); },
    async put(request, response) { entries.set(request.url, response); },
    async match(request) { return entries.get(request.url)?.clone(); },
  };
  vm.runInNewContext(source, {
    URL, Request, Response, Set,
    self: { registration: { scope: "https://example.test/clean-url-extension/" },
      addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => cacheNames, delete: async name => removed.push(name) },
    fetch: async () => { if (offline) throw new Error("Offline fixture"); return new Response("network-shell"); },
  });
  return { handlers, entries, removed };
}

test("PWA manifest 使用相對路徑以支援 Pages 子目錄", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  const base = "https://example.test/clean-url-extension/manifest.webmanifest";
  assert.equal(new URL(manifest.start_url, base).pathname, "/clean-url-extension/");
  assert.equal(new URL(manifest.scope, base).pathname, "/clean-url-extension/");
  assert.equal(new URL(manifest.id, base).pathname, "/clean-url-extension/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.share_target.method, "POST");
  assert.equal(new URL(manifest.share_target.action, base).pathname, "/clean-url-extension/share-target");
  for (const icon of manifest.icons) {
    const data = readFileSync(new URL(`../${icon.src}`, import.meta.url));
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.equal(data.readUInt32BE(16), width);
    assert.equal(data.readUInt32BE(20), height);
  }
});

test("離線殼層只快取目前 Pages 專案", async () => {
  const { handlers, entries } = worker();
  await new Promise((resolve, reject) => handlers.get("install")({ waitUntil: promise => promise.then(resolve, reject) }));
  assert.ok(entries.has("https://example.test/clean-url-extension/index.html"));
  assert.ok(entries.has("https://example.test/clean-url-extension/privacy.html"));
  assert.ok(entries.has("https://example.test/clean-url-extension/url-cleaner.js"));
  assert.ok([...entries.keys()].every(url => url.startsWith("https://example.test/clean-url-extension/")));
});

test("清理快取不刪除同網域其他專案", async () => {
  const { handlers, removed } = worker();
  await new Promise((resolve, reject) => handlers.get("activate")({ waitUntil: promise => promise.then(resolve, reject) }));
  assert.deepEqual(removed, ["clean-url-%2Fclean-url-extension%2F-old"]);
});

test("外部連結與含 query 的網址不被 service worker 快取", () => {
  const { handlers } = worker();
  for (const url of ["https://example.com/product/123?utm_source=test", "https://example.test/another-project/index.html", "https://example.test/clean-url-extension/?url=private"]) {
    let intercepted = false;
    handlers.get("fetch")({ request: new Request(url), respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});

test("完全離線時可讀取已快取的清理核心", async () => {
  const { handlers } = worker({ offline: true });
  await new Promise((resolve, reject) => handlers.get("install")({ waitUntil: promise => promise.then(resolve, reject) }));
  const response = await new Promise(resolve => handlers.get("fetch")({ request: new Request("https://example.test/clean-url-extension/url-cleaner.js"), respondWith: resolve }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "app-shell");
});

test("離線分享 POST 只回傳未快取的本機介面，不發送或快取分享內容", async () => {
  const { handlers, entries } = worker({ offline: true });
  const shellUrl = "https://example.test/clean-url-extension/index.html";
  entries.set(shellUrl, new Response("<!doctype html><html><head></head><body></body></html>"));
  const url = "https://example.com/article?utm_source=share";
  const response = await new Promise(resolve => handlers.get("fetch")({
    request: new Request("https://example.test/clean-url-extension/share-target", {
      method: "POST", body: new URLSearchParams({ text: `文章 ${url}` }),
    }), respondWith: resolve,
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const html = await response.text();
  const payload = html.match(/name="clean-url-share" content="([^"]*)"/)[1];
  assert.deepEqual(JSON.parse(decodeURIComponent(payload)), { text: `文章 ${url}` });
  assert.equal(entries.size, 1);
  assert.ok(!(await entries.get(shellUrl).text()).includes("clean-url-share"));
});
