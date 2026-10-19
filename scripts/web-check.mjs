// Built-site browser checks; all URLs are synthetic and stay in memory.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname, basename, extname, sep } from "node:path";

const root = resolve(import.meta.dirname, "../web-dist");
const browserPath = process.env.BROWSER_PATH;
assert.ok(browserPath, "Set BROWSER_PATH to a Chromium executable");
const profile = await mkdtemp(join(tmpdir(), "clean-url-web-"));
const sockets = [];
const requests = [];
const basePath = process.env.WEB_BASE_PATH ?? "/clean-url-extension/";
assert.ok(basePath.startsWith("/") && basePath.endsWith("/"));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    requests.push(pathname);
    if (!pathname.startsWith(basePath)) { response.writeHead(404); response.end(); return; }
    const relativePath = pathname.slice(basePath.length) || "index.html";
    const file = resolve(root, relativePath);
    if (!file.startsWith(root + sep)) throw new Error("Invalid path");
    const data = await readFile(file);
    response.writeHead(200, { "Content-Type": `${types[extname(file)] ?? "text/plain"}; charset=utf-8`, "Cache-Control": "no-store" });
    response.end(data);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const appUrl = origin + basePath;
const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
async function until(fn, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await fn()) return; await new Promise(done => setTimeout(done, 100)); }
  throw new Error("Browser check timed out");
}
async function connect(url) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const call = pending.get(message.id);
    if (!call) return;
    clearTimeout(call.timer);
    pending.delete(message.id);
    if (message.error) call.reject(new Error(JSON.stringify(message.error)));
    else call.resolve(message.result);
  };
  return (method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
    pending.set(++id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
try {
  let port;
  await until(async () => { try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; return port; } catch { return false; } });
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const cdp = await connect(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  const evaluate = async expression => {
    const response = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 940, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: appUrl });
  await until(() => evaluate("document.querySelector('#url-input') && navigator.serviceWorker.controller !== null"));
  const manifest = await cdp("Page.getAppManifest");
  assert.ok(!manifest.errors?.some(error => error.critical), JSON.stringify(manifest.errors));
  assert.equal(JSON.parse(manifest.data).display, "standalone");
  assert.equal(await evaluate("navigator.serviceWorker.controller.scriptURL"), `${appUrl}sw.js`);
  assert.equal(await evaluate("document.querySelector('#web-copy-button').disabled"), true);
  const version = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json());
  const browserCdp = await connect(version.webSocketDebuggerUrl);
  await cdp("Page.bringToFront");
  await browserCdp("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  async function input(value) {
    await evaluate(`document.querySelector('#url-input').value = ${JSON.stringify(value)}; document.querySelector('#url-input').dispatchEvent(new Event('input', {bubbles:true}));`);
  }
  const sample = "https://example.com/article?utm_source=fixture&gad_source=1&id=42#part";
  const expected = "https://example.com/article?id=42#part";
  await input(sample);
  assert.equal(await evaluate("document.querySelector('#url-output').value"), expected);
  await evaluate("document.querySelector('#web-copy-button').click()");
  await until(() => evaluate("document.querySelector('#web-copy-label').textContent === '已複製乾淨連結'"));
  assert.equal(await evaluate("navigator.clipboard.readText()"), expected);
  await evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic denial'); } } }); document.querySelector('#web-copy-button').click()");
  await until(() => evaluate("document.querySelector('#web-status').classList.contains('error')"));
  assert.equal(await evaluate("document.querySelector('#web-copy-button').disabled"), false);
  await evaluate("delete navigator.clipboard");
  await input("javascript:alert(1)");
  assert.equal(await evaluate("document.querySelector('#web-copy-button').disabled"), true);
  assert.equal(await evaluate("document.querySelector('#url-input').getAttribute('aria-invalid')"), "true");
  await input("https://example.com/?sig=test&utm_source=keep");
  assert.match(await evaluate("document.querySelector('#web-status').textContent"), /簽章/);
  await evaluate("document.querySelector('#clear-button').click()");
  assert.equal(await evaluate("document.querySelector('#url-output').value"), "");
  await evaluate("window.dispatchEvent(new Event('beforeinstallprompt')); document.querySelector('#install-button').click()");
  await until(() => evaluate("document.querySelector('#install-dialog').open"));
  await evaluate("document.querySelector('#install-dialog').close()");
  await evaluate("document.querySelector('#privacy-button').click()");
  await until(() => evaluate("document.querySelector('#policy-title') !== null"));
  assert.equal(await evaluate("location.href"), `${appUrl}privacy.html`);
  assert.equal(await evaluate("document.querySelectorAll('.policy section').length"), 4);
  await cdp("Page.navigate", { url: appUrl });
  await until(() => evaluate("document.querySelector('#url-input') !== null"));
  await input(sample);
  if (process.argv.includes("--preview")) {
    const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
    const path = join(profile, "desktop.png");
    await writeFile(path, Buffer.from(screenshot.data, "base64"));
    console.log(`Temporary desktop preview: ${path}`);
  }
  await cdp("Emulation.setDeviceMetricsOverride", { width: 375, height: 1000, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  if (process.argv.includes("--preview")) {
    const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
    const path = join(profile, "mobile.png");
    await writeFile(path, Buffer.from(screenshot.data, "base64"));
    console.log(`Temporary mobile preview: ${path}`);
  }
  assert.equal(await evaluate("localStorage.length + sessionStorage.length"), 0);
  const cacheUrls = await evaluate("(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(r => r.url)))).flat())()");
  assert.ok(cacheUrls.length >= 11);
  assert.ok(cacheUrls.every(url => url.startsWith(appUrl) && !url.includes("utm_") && !url.includes("example.com")));
  assert.ok(!requests.some(path => path.includes("article") || path.includes("utm_source")));
  // Take the server completely offline, so the service worker must supply
  // HTML, CSS, JS, core rules, and icons without any network fallback.
  await new Promise(done => { server.close(done); server.closeAllConnections(); });
  await cdp("Page.reload", { ignoreCache: true });
  await until(() => evaluate("document.querySelector('#url-input') && document.querySelector('#url-input').value === '' && typeof navigator.serviceWorker.controller?.scriptURL === 'string'"));
  await input(sample);
  await until(() => evaluate(`document.querySelector('#url-output').value === ${JSON.stringify(expected)}`));
  await evaluate("document.querySelector('#privacy-button').click()");
  await until(() => evaluate("document.querySelector('#policy-title') !== null"));
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  console.log("PASS: GitHub Pages subpath, manifest, input/preview/copy/errors, mobile layout, no URL persistence, shell-only cache, and complete offline reload/cleaning.");
  if (process.argv.includes("--preview")) await new Promise(done => setTimeout(done, 30000));
} finally {
  for (const socket of sockets) socket.close();
  browser.kill();
  await new Promise(done => { if (browser.exitCode !== null || browser.signalCode !== null) done(); else browser.once("exit", done); });
  server.closeAllConnections();
  server.close();
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  assert.ok(basename(profile).startsWith("clean-url-web-"));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
