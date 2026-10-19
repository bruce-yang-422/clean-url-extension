import { cleanUrl } from "./url-cleaner.js";

const input = document.getElementById("url-input");
const output = document.getElementById("url-output");
const copy = document.getElementById("web-copy-button");
const copyLabel = document.getElementById("web-copy-label");
const clear = document.getElementById("clear-button");
const status = document.getElementById("web-status");
const ready = document.getElementById("ready-label");
const install = document.getElementById("install-button");
const installDialog = document.getElementById("install-dialog");
const offlineLabel = document.getElementById("offline-label");
let currentUrl = "";
let feedbackTimer;
let installPrompt = null;
let offlineReady = false;

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}

function update() {
  clearTimeout(feedbackTimer);
  copy.classList.remove("copied");
  copyLabel.textContent = "複製乾淨連結";
  currentUrl = "";
  output.value = "";
  ready.hidden = true;
  copy.disabled = true;
  clear.disabled = !input.value;
  input.removeAttribute("aria-invalid");
  message("");
  if (!input.value.trim()) return;
  try {
    const result = cleanUrl(input.value.trim());
    currentUrl = result.cleanedUrl;
    output.value = currentUrl;
    ready.hidden = false;
    copy.disabled = false;
    if (result.signed) message("簽章連結保留原樣，避免連結失效。");
    else if (result.originalUrl === result.cleanedUrl) message("網址已經很乾淨，可以直接分享。");
  } catch {
    input.setAttribute("aria-invalid", "true");
    message("請輸入完整的 HTTP 或 HTTPS 網址。", true);
  }
}
input.addEventListener("input", update);
clear.addEventListener("click", () => { input.value = ""; update(); input.focus(); });
document.getElementById("example-button").addEventListener("click", () => {
  input.value = "https://example.com/article?utm_source=newsletter&utm_medium=email";
  update();
  input.focus();
});
copy.addEventListener("click", async () => {
  if (!currentUrl) return;
  const value = currentUrl;
  copy.disabled = true;
  try {
    await navigator.clipboard.writeText(value);
    if (value !== currentUrl) return;
    copy.classList.add("copied");
    copyLabel.textContent = "已複製乾淨連結";
    message("已複製，貼上就能分享。");
    feedbackTimer = setTimeout(update, 2200);
  } catch {
    if (value !== currentUrl) return;
    output.focus();
    output.select();
    message("無法自動複製，已選取連結，請手動複製或重試。", true);
  } finally {
    copy.disabled = !currentUrl;
  }
});

const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
install.hidden = standalone();
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  install.hidden = standalone();
});
window.addEventListener("appinstalled", () => { install.hidden = true; installPrompt = null; });
install.addEventListener("click", async () => {
  if (!installPrompt) { installDialog.showModal(); return; }
  const prompt = installPrompt;
  installPrompt = null;
  try { await prompt.prompt(); await prompt.userChoice; }
  catch { installDialog.showModal(); }
});

function connectionState() {
  offlineLabel.textContent = !navigator.onLine ? "離線模式" : offlineReady ? "已可離線使用" : "本機清理";
}
window.addEventListener("online", connectionState);
window.addEventListener("offline", connectionState);
connectionState();
// Cache only the app shell. Input URLs never become requests or cache entries.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(new URL("./sw.js", import.meta.url), { scope: "./" })
    .then(() => navigator.serviceWorker.ready)
    .then(() => { offlineReady = true; connectionState(); })
    .catch(() => { offlineLabel.textContent = "離線準備未完成，請連線重試"; });
}
update();
