import { cleanUrl } from "./url-cleaner.js";
import { t } from "./i18n.js";

// 右鍵選單：只在使用者點選時讀取該網址，清理後寫入剪貼簿，不保存網址。
// 每次瀏覽器啟動也重建選單，讓更換 Chrome 顯示語言後的選單文字跟著更新。
function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "copy-page", title: t("menuPage"), contexts: ["page", "frame", "selection", "image", "video", "audio"] });
    chrome.contextMenus.create({ id: "copy-link", title: t("menuLink"), contexts: ["link"] });
  });
}
chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === "copy-link" ? info.linkUrl : (tab?.url || info.pageUrl);
  try {
    await writeClipboard(cleanUrl(url).cleanedUrl);
    badge(tab?.id, "✓", "#1d9a82");
  } catch {
    badge(tab?.id, "!", "#c0392b");
  }
});

// 以工具列徽章短暫顯示結果，不跳出通知。
function badge(tabId, text, color) {
  const target = tabId === undefined ? {} : { tabId };
  chrome.action.setBadgeBackgroundColor({ ...target, color }).catch(() => {});
  chrome.action.setBadgeText({ ...target, text }).catch(() => {});
  setTimeout(() => chrome.action.setBadgeText({ ...target, text: "" }).catch(() => {}), 1800);
}

// Service Worker 無法直接使用剪貼簿，改由 offscreen 文件寫入。
async function writeClipboard(text) {
  const url = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url] });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["CLIPBOARD"], justification: "Write the cleaned URL to the clipboard." });
  }
  const response = await chrome.runtime.sendMessage({ target: "offscreen", type: "copy", text });
  if (!response?.ok) throw new Error("Clipboard write failed");
}
