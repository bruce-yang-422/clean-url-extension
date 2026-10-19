// Run with BROWSER_PATH pointing to a Chromium executable supporting --load-extension.
// Uses only Node built-ins; opens an isolated profile and a local fixture page.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const extensionRoot = process.env.EXTENSION_PATH ? resolve(process.env.EXTENSION_PATH) : root;
const browserPath = process.env.BROWSER_PATH;
if (!browserPath) throw new Error("Set BROWSER_PATH to a Chromium executable.");
const profile = await mkdtemp(join(tmpdir(), "clean-url-test-"));
const server = createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end("<!doctype html><title>Clean URL local fixture</title><p>Local test page</p>"); });
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--disable-extensions-except=${extensionRoot}`, `--load-extension=${extensionRoot}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
browser.on("error", error => console.error(error));
const connections = [];
let stderr = "";
browser.stderr.on("data", chunk => { stderr += chunk; });
async function waitFor(fn, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await new Promise(done => setTimeout(done, 100));
  }
  throw new Error(`Timed out. ${stderr.slice(-2000)}`);
}
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((done, reject) => { const timer = setTimeout(() => reject(new Error('WebSocket connection timed out')), 10000); ws.onopen = () => { clearTimeout(timer); done(); }; ws.onerror = error => { clearTimeout(timer); reject(error); }; });
  connections.push(ws);
  let id = 0;
  const pending = new Map();
  let eventHandler = () => {};
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (!msg.id) { eventHandler(msg); return; }
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    clearTimeout(call.timer);
    if (msg.error) call.reject(new Error(JSON.stringify(msg.error)));
    else call.resolve(msg.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`CDP timed out: ${method}`)), 10000);
    pending.set(++id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
  send.onEvent = handler => { eventHandler = handler; };
  return send;
}
try {
  const port = await waitFor(async () => {
    try { return (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; } catch { return null; }
  });
  console.log(`Browser debugging port: ${port}`);
  const targets = () => fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const first = (await targets()).find(t => t.type === "page");
  console.log(`Connecting to ${first.url}`);
  const cdp = await connect(first.webSocketDebuggerUrl);
  console.log("Connected to browser page");
  async function evaluate(expression) {
    const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  console.log("Renderer check:", await evaluate("1 + 1"));
  // Verify shipped assets without overwriting the user's icon artwork.
  for (const size of [16, 32, 48, 128]) {
    const png = await readFile(join(extensionRoot, `icons/icon-${size}.png`));
    const dimensions = await evaluate(`(async () => { const img = new Image(); img.src = ${JSON.stringify(`data:image/png;base64,${png.toString("base64")}`)}; await img.decode(); return [img.naturalWidth, img.naturalHeight]; })()`);
    assert.deepEqual(dimensions, [size, size]);
  }
  console.log("Verified extension icons");
  await cdp("Page.navigate", { url: "chrome://extensions/" });
  await waitFor(() => evaluate("typeof chrome.developerPrivate !== 'undefined'"));
  let extension = await evaluate("new Promise(r => chrome.developerPrivate.getExtensionsInfo({includeDisabled:true}, r))");
  extension = extension.find(e => e.name === "Clean URL｜乾淨連結");
  if (!extension) throw new Error("Extension did not load. Ensure icons exist and rerun; use Chromium supporting --load-extension.");
  assert.equal(extension.state, "ENABLED");
  console.log(`Loaded extension ${extension.id}`);
  await cdp("Page.navigate", { url: `${base}/product/123?utm_source=shopee&utm_medium=social&id=42#規格` });
  await waitFor(() => evaluate("document.readyState === 'complete' && location.hostname === '127.0.0.1'"));
  // Open the real action popup so tabs.query sees the fixture as the active tab.
  const browserInfo = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json());
  const browserCdp = await connect(browserInfo.webSocketDebuggerUrl);
  const protocol = await fetch(`http://127.0.0.1:${port}/json/protocol`).then(r => r.json());
  const action = protocol.domains.find(d => d.domain === "Extensions")?.commands.find(c => c.name === "triggerAction");
  assert.ok(action, "Browser must support Extensions.triggerAction");
  const { targetInfos } = await browserCdp("Target.getTargets", { filter: [{ type: "tab", exclude: false }] });
  const tabTarget = targetInfos.find(t => t.url.startsWith(base));
  assert.ok(tabTarget, JSON.stringify(targetInfos));
  await browserCdp("Extensions.triggerAction", { id: extension.id, targetId: tabTarget.targetId });
  const actionTarget = await waitFor(async () => (await targets()).find(t => t.url === `chrome-extension://${extension.id}/popup.html`));
  const targetId = actionTarget.id;
  const popupTarget = await waitFor(async () => (await targets()).find(t => t.id === targetId));
  const popup = await connect(popupTarget.webSocketDebuggerUrl);
  async function inspect(expression) {
    const result = await popup("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await waitFor(() => inspect("document.querySelector('#status-text') && document.querySelector('#status-text').textContent !== '正在檢查網址…'"));
  assert.equal(await inspect("document.querySelector('#copy-button').disabled"), false);
  const state = await inspect("({ original: document.querySelector('#original-url').textContent, cleaned: document.querySelector('#clean-url').textContent, status: document.querySelector('#status-text').textContent, width: document.body.offsetWidth })");
  assert.equal(state.cleaned, `${base}/product/123?id=42#%E8%A6%8F%E6%A0%BC`);
  assert.equal(state.status, "");
  assert.equal(await inspect("document.querySelector('#clean-status').hidden"), true);
  assert.equal(state.width, 360);
  const installedVersion = JSON.parse(await readFile(join(extensionRoot, "manifest.json"), "utf8")).version;
  assert.equal(await inspect("document.querySelector('#extension-version').textContent"), `v${installedVersion}`);
  await browserCdp("Target.activateTarget", { targetId });
  await inspect("document.querySelector('#copy-button').click()");
  await waitFor(() => inspect("document.querySelector('#copy-feedback').textContent !== ''"));
  assert.equal(await inspect("document.querySelector('#copy-feedback').textContent"), "已複製乾淨連結");
  // Inspect actual clipboard content with an explicit testing-only CDP grant.
  await browserCdp("Browser.grantPermissions", { origin: `chrome-extension://${extension.id}`, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  assert.equal(await inspect("navigator.clipboard.readText()"), state.cleaned);
  // Force a clipboard failure to verify the error message and retry path.
  await inspect("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('test denial'); } } }); document.querySelector('#copy-button').click()");
  await waitFor(() => inspect("document.querySelector('#copy-feedback').classList.contains('error')"));
  assert.equal(await inspect("document.querySelector('#copy-button').disabled"), false);
  await inspect("delete navigator.clipboard; document.querySelector('#copy-button').click()");
  await waitFor(() => inspect("document.querySelector('#copy-feedback').textContent === '已複製乾淨連結'"));
  const scenarios = [
    [`${base}/?q=tea#keep`, "網址已經很乾淨", false],
    [`${base}/?utm_source=a&X-Amz-Signature=abc`, "簽章連結保留原樣，避免連結失效", false],
    ["chrome://settings/", "此頁面無法讀取網址", true],
  ];
  for (const [url, status, disabled] of scenarios) {
    await cdp("Page.navigate", { url });
    await waitFor(() => evaluate(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`));
    await popup("Page.reload");
    await waitFor(() => inspect(`document.querySelector('#status-text')?.textContent === ${JSON.stringify(status)}`));
    assert.equal(await inspect("document.querySelector('#copy-button').disabled"), disabled);
  }
  // All site URLs below are synthetic fixtures, intercepted locally.
  cdp.onEvent(message => {
    if (message.method === "Fetch.requestPaused") {
      cdp("Fetch.fulfillRequest", { requestId: message.params.requestId, responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
        body: Buffer.from("<!doctype html><title>Synthetic fixture</title>").toString("base64")
      }).catch(error => console.error(error.message));
    }
  });
  await cdp("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  const matrix = JSON.parse(await readFile(join(root, "tests/fixtures/site-matrix.json"), "utf8"));
  const previewTab = await browserCdp("Target.createTarget", { url: `chrome-extension://${extension.id}/popup.html`, background: true });
  const previewTarget = await waitFor(async () => (await targets()).find(t => t.id === previewTab.targetId));
  const preview = await connect(previewTarget.webSocketDebuggerUrl);
  async function inspectPreview(expression) {
    const result = await preview("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  for (const [, url, expected] of matrix) {
    await browserCdp("Target.activateTarget", { targetId: first.id });
    await cdp("Page.navigate", { url });
    await waitFor(() => evaluate(`document.readyState === 'complete' && location.href === ${JSON.stringify(url)}`));
    await browserCdp("Extensions.triggerAction", { id: extension.id, targetId: tabTarget.targetId });
    await preview("Page.reload");
    await waitFor(() => inspectPreview(`document.querySelector('#clean-url')?.textContent === ${JSON.stringify(expected)} && document.querySelector('#clean-status').hidden === ${url !== expected}`));
    await browserCdp("Target.activateTarget", { targetId: previewTab.targetId });
    await inspectPreview("document.querySelector('#copy-button').click()");
    await waitFor(() => inspectPreview("document.querySelector('#copy-feedback').textContent === '已複製乾淨連結'"));
    assert.equal(await inspectPreview("navigator.clipboard.readText()"), expected);
  }
  console.log(`PASS: installed v${installedVersion}, popup/clipboard/error states and ${matrix.length} synthetic site fixtures.`);
} finally {
  for (const ws of connections) ws.close();
  browser.kill();
  await new Promise(done => { if (browser.exitCode !== null || browser.signalCode !== null) done(); else browser.once("exit", done); });
  server.close();
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  assert.ok(basename(profile).startsWith("clean-url-test-"));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
