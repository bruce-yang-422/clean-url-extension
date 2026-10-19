# Clean URL｜乾淨連結

一鍵移除已知網址追蹤參數，預覽並複製乾淨連結。適用於支援 Manifest V3 的 Chrome／Edge；使用原生 HTML、CSS、JavaScript，無須編譯或安裝套件。

## 安裝與使用

1. Chrome 開啟 `chrome://extensions`；Edge 開啟 `edge://extensions`。
2. 開啟「開發人員模式」，選擇「載入未封裝項目」。
3. 選取本專案資料夾（內含 `manifest.json`）。若使用 ZIP，請先解壓縮。
4. 開啟一般網頁，點選工具列的 Clean URL 圖示，再按「複製乾淨連結」。可從擴充功能選單將圖示固定在工具列。

開發後按擴充功能管理頁的「重新載入」，再重新開啟彈窗即可。

## 清理行為

- 移除 `utm_*`（名稱不分大小寫）及 `fbclid`、`gclid`、`dclid`、`gbraid`、`wbraid`、`msclkid`、`ttclid`、`twclid`、`igshid`、`mc_cid`、`mc_eid`、`_ga`、`_gl`。
- 保留商品編號、搜尋條件、未知參數、路徑與 `#` 片段。保留剩餘參數的原始順序、重複值及編碼，不重新序列化整段網址。
- 每次出現的追蹤參數各計為一項；已乾淨的網址維持原樣，仍可複製。
- 偵測到 `X-Amz-Signature`、`X-Goog-Signature`、`Signature` 或 `sig` 時保留整條連結，避免破壞簽章。這不是完整的簽章格式辨識器。
- 僅支援 HTTP／HTTPS；瀏覽器內部頁面、檔案頁面及其他特殊協定會顯示提示。
- 不展開短網址、不追蹤轉址、不清理巢狀連結，也不改動目前分頁。
- 網址可捲動、選取並手動複製；按鈕永遠複製完整結果。

## 權限與隱私

只要求 `activeTab`（使用者開啟擴充功能時讀取目前分頁網址）與 `clipboardWrite`（按鈕寫入剪貼簿）。沒有常駐背景程式、內容注入、全站存取、分析追蹤或儲存瀏覽紀錄。產品不讀取剪貼簿。詳見 [PRIVACY.md](PRIVACY.md)。

## 開發與驗證

需要 Node.js 22 或更新版本，無第三方 JavaScript 相依套件：

```powershell
npm test
npm run check
```

核心測試涵蓋中文、原始編碼、重複與空值參數、長網址、片段、功能參數、簽章及不支援協定。台灣網站案例是離線網址處理測試，不能代表網站目前的商品頁或分享流程已驗證。

可選的真實瀏覽器整合測試（需要支援 `--load-extension` 與 CDP `Extensions.triggerAction` 的 Chromium 測試版本）：

```powershell
$env:BROWSER_PATH = 'C:\path\to\chromium\chrome.exe'
node scripts/browser-check.mjs
```

此測試使用隔離的暫存設定檔與本機 HTTP 測試頁，透過實際擴充功能按鈕取得 `activeTab` 權限，驗證預覽、複製結果、複製失敗及重試、乾淨網址、簽章與受限頁面。測試會驗證 PNG 圖示尺寸、寫入測試連結至系統剪貼簿，並產生 `artifacts/popup.png`。剪貼簿讀取權限只由測試工具暫時授予，不在產品權限中。

圖示原稿為 `icons/clean-url.ico`，擴充功能與彈窗使用其中匯出的 PNG。若更新 ICO，可安裝 Python Pillow 後執行 `python scripts/generate-icons.py`，重新匯出 16、32、48、128 px 圖示；一般安裝及執行擴充功能不需要 Python。

目前驗證結果與發布前人工檢查項目見 [VALIDATION.md](VALIDATION.md)。

## 檔案

`manifest.json` 為擴充功能設定；`popup.html`、`popup.css`、`popup.js` 為介面與操作；`url-cleaner.js` 為純清理函式；`icons/` 為圖示。原始規劃與設計參考保留在專案根目錄。
