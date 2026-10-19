import { cleanUrl } from "./url-cleaner.js";

const original = document.getElementById("original-url");
const cleaned = document.getElementById("clean-url");
const status = document.getElementById("clean-status");
const statusText = document.getElementById("status-text");
const button = document.getElementById("copy-button");
const copyLabel = document.getElementById("copy-label");
const feedback = document.getElementById("copy-feedback");
let cleanedUrl = null;
let feedbackTimer;

function showUrl(element, value) {
  element.textContent = value;
  element.title = value;
  element.tabIndex = 0;
}

button.addEventListener("click", async () => {
  if (!cleanedUrl) return;
  button.disabled = true;
  clearTimeout(feedbackTimer);
  button.classList.remove("copied");
  feedback.textContent = "";
  feedback.className = "";
  try {
    await navigator.clipboard.writeText(cleanedUrl);
    copyLabel.textContent = "已複製乾淨連結";
    button.classList.add("copied");
    feedback.textContent = "已複製乾淨連結";
    feedbackTimer = setTimeout(() => {
      button.classList.remove("copied");
      copyLabel.textContent = "複製乾淨連結";
      feedback.textContent = "";
    }, 2200);
  } catch {
    copyLabel.textContent = "重新複製乾淨連結";
    feedback.className = "error";
    feedback.textContent = "複製失敗，請重試，或選取上方連結手動複製。";
  } finally {
    button.disabled = false;
  }
});

async function initialize() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error("Unavailable tab");
    const result = cleanUrl(tab.url);
    showUrl(original, result.originalUrl);
    showUrl(cleaned, result.cleanedUrl);
    cleanedUrl = result.cleanedUrl;
    if (result.signed) {
      status.classList.add("neutral");
      status.querySelector(".status-icon").textContent = "i";
      statusText.textContent = "簽章連結保留原樣，避免連結失效";
    } else {
      status.hidden = result.removedCount > 0;
      statusText.textContent = result.removedCount ? "" : "網址已經很乾淨";
    }
    button.disabled = false;
  } catch {
    original.textContent = "無法取得可清理的網頁網址";
    cleaned.textContent = "—";
    document.getElementById("clean-section").hidden = true;
    copyLabel.textContent = "此頁面不支援";
    status.classList.add("error");
    status.querySelector(".status-icon").textContent = "!";
    statusText.textContent = "此頁面無法讀取網址";
    feedback.className = "error";
    feedback.textContent = "請切換至一般 HTTP 或 HTTPS 網頁後再開啟。";
  }
}

initialize();
