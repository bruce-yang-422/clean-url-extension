import { cleanUrl } from "./url-cleaner.js";
import { t, localize } from "./i18n.js";

const original = document.getElementById("original-url");
const cleaned = document.getElementById("clean-url");
const status = document.getElementById("clean-status");
const statusText = document.getElementById("status-text");
const button = document.getElementById("copy-button");
const copyLabel = document.getElementById("copy-label");
const feedback = document.getElementById("copy-feedback");
let feedbackTimer;

localize();

function showOriginal(value) {
  original.textContent = value.length > 90 ? `${value.slice(0, 45)}…${value.slice(-32)}` : value;
  original.title = value;
  original.setAttribute("aria-label", value);
  original.tabIndex = 0;
}

// 清理結果可直接編輯；內容清空時停用複製按鈕。
cleaned.addEventListener("input", () => {
  button.disabled = !cleaned.value.trim();
});

button.addEventListener("click", async () => {
  const value = cleaned.value.trim();
  if (!value) return;
  button.disabled = true;
  clearTimeout(feedbackTimer);
  button.classList.remove("copied");
  feedback.textContent = "";
  feedback.className = "";
  try {
    await navigator.clipboard.writeText(value);
    copyLabel.textContent = t("copied");
    button.classList.add("copied");
    feedback.textContent = t("copied");
    feedbackTimer = setTimeout(() => {
      button.classList.remove("copied");
      copyLabel.textContent = t("copyClean");
      feedback.textContent = "";
    }, 2200);
  } catch {
    copyLabel.textContent = t("copyRetry");
    feedback.className = "error";
    feedback.textContent = t("copyFailed");
  } finally {
    button.disabled = !cleaned.value.trim();
  }
});

async function initialize() {
  try {
    document.getElementById("extension-version").textContent = `v${chrome.runtime.getManifest().version}`;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error("Unavailable tab");
    const result = cleanUrl(tab.url);
    showOriginal(result.originalUrl);
    cleaned.value = result.cleanedUrl;
    if (result.signed) {
      status.classList.add("neutral");
      status.querySelector(".status-icon").textContent = "i";
      statusText.textContent = t("signed");
    } else {
      const changed = result.cleanedUrl !== result.originalUrl;
      status.hidden = changed;
      statusText.textContent = changed ? "" : t("alreadyClean");
    }
    button.disabled = false;
  } catch {
    original.textContent = t("unsupportedTitle");
    cleaned.value = "";
    document.getElementById("clean-section").hidden = true;
    copyLabel.textContent = t("unsupportedButton");
    status.classList.add("error");
    status.querySelector(".status-icon").textContent = "!";
    statusText.textContent = t("unsupportedStatus");
    feedback.className = "error";
    feedback.textContent = t("unsupportedHint");
  }
}

initialize();
