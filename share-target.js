// 分享資料僅在記憶體解析，不寫入儲存空間，也不發送網路請求。
// 非分享片段回傳 null；分享內容無效或空白時回傳空字串。
export function sharedInput(hash) {
  if (!hash.startsWith("#share=")) return null;
  let data;
  try { data = JSON.parse(decodeURIComponent(hash.slice(7))); }
  catch { return ""; }
  if (!data || typeof data !== "object") return "";
  // 依網址、分享文字、標題的順序尋找可用連結。
  const values = [data.url, data.text, data.title].filter(value => typeof value === "string");
  for (const value of values) {
    const match = value.match(/https?:\/\/[^\s<>"「」『』]+/i);
    if (!match) continue;
    let candidate = match[0].replace(/[，。；！、]+$/u, "");
    // 移除文句或 Markdown 多出的右括號，保留網址內成對的括號。
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (candidate.endsWith(close) && candidate.split(close).length > candidate.split(open).length) candidate = candidate.slice(0, -1);
    }
    try { new URL(candidate); return candidate; } catch { /* 網址無效時繼續檢查下一個分享欄位。 */ }
  }
  // 未找到網址時保留非空文字，交由介面顯示輸入錯誤。
  return values.find(value => value.trim())?.trim() ?? "";
}
