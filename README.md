# Clean URL｜乾淨連結

一鍵移除已知網址追蹤參數，預覽並複製乾淨連結。適用於支援 Manifest V3 的 Chrome／Edge；使用原生 HTML、CSS、JavaScript，無須編譯或安裝套件。

**[網頁版／PWA：cleanlink.stack-base.com](https://cleanlink.stack-base.com/)**。貼上網址即可使用；可安裝到裝置，第一次連線完成離線準備後，就能離線清理。網頁版與擴充功能共用同一份清理規則。

**[從 Chrome 線上應用程式商店安裝擴充功能](https://chromewebstore.google.com/detail/clean-url%EF%BD%9C%E4%B9%BE%E6%B7%A8%E9%80%A3%E7%B5%90/ecfnblelamnokaknaepkjbhbckmakkka)**。也可從 [Releases](https://github.com/bruce-yang-422/clean-url-extension/releases) 下載 ZIP 手動安裝。

## 安裝與使用

### 商店安裝（建議）

1. 使用 Chrome 開啟 [Clean URL｜乾淨連結商店頁面](https://chromewebstore.google.com/detail/clean-url%EF%BD%9C%E4%B9%BE%E6%B7%A8%E9%80%A3%E7%B5%90/ecfnblelamnokaknaepkjbhbckmakkka)。
2. 點選「加到 Chrome」，依提示確認安裝。
3. 開啟一般網頁，點選工具列的 Clean URL 圖示，再按「複製乾淨連結」。可從擴充功能選單將圖示固定在工具列。

Edge 使用者也可開啟上述商店頁面，依瀏覽器提示允許來自其他商店的擴充功能後安裝。

### ZIP／開發者手動安裝

從 [Releases](https://github.com/bruce-yang-422/clean-url-extension/releases) 下載擴充功能 ZIP 並解壓縮，或使用本機專案檔案：

1. Chrome 開啟 `chrome://extensions`；Edge 開啟 `edge://extensions`。
2. 開啟「開發人員模式」，選擇「載入未封裝項目」。
3. 選取本專案資料夾（內含 `manifest.json`）。若使用 ZIP，請先解壓縮。
4. 開啟一般網頁，點選工具列的 Clean URL 圖示，再按「複製乾淨連結」。可從擴充功能選單將圖示固定在工具列。

開發後按擴充功能管理頁的「重新載入」，再重新開啟彈窗即可。

本機交付的未封裝檔案放在專案根目錄 `unpacked/`；載入時請選取此資料夾。彈窗品牌列會顯示實際執行版本。若清理結果與預期不符，先確認載入目錄與版本，避免使用舊版解壓縮副本。

## 清理行為

- 移除 `utm_*`（名稱不分大小寫）及 `fbclid`、`gclid`、`dclid`、`gbraid`、`wbraid`、`msclkid`、`ttclid`、`twclid`、`igshid`、`mc_cid`、`mc_eid`、`_ga`、`_gl`、`srsltid`、`gad_source`、`gad_campaignid`。
- 通用清理也涵蓋已知的 Google `gclsrc`、Facebook 來源欄位、Mailchimp `mc_tc`、Marketo `mkt_tok` 及 Matomo 行銷參數；不因名稱含有 `source`、`ref`、`id` 就整批刪除。
- 蝦皮台灣站的 `商品名稱-i.賣場ID.商品ID` 網址縮短為 `/product/賣場ID/商品ID`，保留功能參數與片段。其他網站的路徑維持原樣。
- 蝦皮商品頁的 `extraParams` 若只含有效的 `display_model_id` 及可選的 `model_selection_logic`，會移除以分享純商品入口，不再預選商品規格。若包含其他欄位或格式未知則保留。
- 蝦皮分類頁將 `分類名稱-cat.分類ID` 縮短為 `c-cat.分類ID`，保留一至三層完整 ID，以及篩選、排序、分頁參數。搜尋頁與賣場頁保留原路徑及功能參數，只移除已知追蹤參數。
- 蝦皮賣場頁含 `entryPoint=ShopByPDP` 時，移除此標記及有效數字格式的 `categoryId`、`itemId`，分享純賣場入口，不預選來源商品或分類。未知參數、賣場自訂分類與其他來源標記仍保留。
- 蝦皮各頁面一律清除 `sp_atk`、`xptdk`、`publish_id`、`uls_trackid` 等專屬歸因參數，不套用到其他網站。
- momo 支援 `/product/商品ID`、`/TP/商店ID/goodsDetail/商品ID` 及舊式 `GoodsDetail.jsp?i_code=商品ID`。保留商品路徑與編號，移除 `osm=Ad數字`、`content=personallist數字`、`mdiv=category` 及空值 `cc1`；未知值與非空分類值保留。
- momo 活動頁 `/edm/cmmedm.jsp` 帶有有效 `lpn` 時，移除入口參數 `mdiv`；保留 `lpn`、`n`、`ctype` 與未知參數，避免活動頁失效。
- momo 商品頁帶有 `Area=search` 時，移除搜尋入口資訊：此標記、數字 `mdiv`、位置格式 `oid`、`cid=index`、`kw` 與空值 `ecTagNos`。不將這套規則套用至搜尋頁，也不移除非空活動標記與未知規格參數。
- momo 商品頁也辨識首頁／分類入口與數字、橫幅格式的 `mdiv`；已知入口位置可移除，未知值保留。來源規則依頁面類型決定，不要求每筆網址恰好帶著相同一組參數。
- 酷澎台灣商品頁移除數字格式的 `itemId`、`vendorItemId` 及已知廣告歸因、來源與重複商品頁資訊，分享純商品入口，不再固定規格或賣家；未知參數保留。`pid`、`spec`、`src` 等同名參數不會從其他網站刪除。特力屋與 PChome 適用通用 UTM、Google 廣告參數清理。
- 酷澎有商品名稱的路徑會縮短為 `/products/商品ID`；商品頁的已知搜尋排序／歸因參數也會清除。只有 `sourceType=search` 或 `CATEGORY` 的來源情境才移除搜尋關鍵字／分類來源，實際搜尋頁的條件保留。
- momo 品牌搜尋的 `searchType`、`brand`、`brandNo`、`isBrandPage`、`serviceCode`、`_isFuzzy` 會影響搜尋／篩選，預設保留。不把所有長網址強制縮短。
- 保留商品編號、搜尋條件、未知參數與 `#` 片段。保留剩餘參數的原始順序、重複值及編碼，不重新序列化整段網址。
- 每次出現的追蹤參數各計為一項；已乾淨的網址維持原樣，仍可複製。
- 偵測到 `X-Amz-Signature`、`X-Goog-Signature`、`Signature` 或 `sig` 時保留整條連結，避免破壞簽章。這不是完整的簽章格式辨識器。
- 僅支援 HTTP／HTTPS；瀏覽器內部頁面、檔案頁面及其他特殊協定會顯示提示。
- 不展開短網址、不追蹤轉址、不清理巢狀連結，也不改動目前分頁。
- 長原始網址會縮略顯示，滑鼠停留可查看完整網址；清理結果可捲動、選取並手動複製，按鈕永遠複製完整結果。

## 權限與隱私

只要求 `activeTab`（使用者開啟擴充功能時讀取目前分頁網址）與 `clipboardWrite`（按鈕寫入剪貼簿）。沒有常駐背景程式、內容注入、全站存取、分析追蹤或儲存瀏覽紀錄。產品不讀取剪貼簿。詳見 [PRIVACY.md](PRIVACY.md)。

## 開發與驗證

### 網頁版與 GitHub Pages

根目錄 `index.html` 為網頁入口，`manifest.webmanifest` 為 PWA 設定，`sw.js` 只快取應用程式靜態資源，不快取輸入的連結。所有資源使用相對路徑，支援自訂網域根目錄與 GitHub Pages 專案子路徑。

```powershell
npm run build:web
```

輸出 `web-dist/`，只包含網站所需的靜態檔案。可用一般靜態 HTTP 伺服器預覽；離線與安裝功能需要 HTTPS 或 localhost，不支援直接雙擊 HTML 的 `file://` 模式。

GitHub Pages 從 `main` 分支的根目錄發布，入口為 `index.html`，`.nojekyll` 讓檔案直接作為靜態網站提供。儲存庫 Settings → Pages 的 Source 使用「Deploy from a branch」，Branch 選 `main`、`/(root)`。自訂網域為 `cleanlink.stack-base.com`，DNS CNAME 指向 `bruce-yang-422.github.io`，並啟用 HTTPS。相關設定見 [GitHub Pages 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-custom-domain-for-your-github-pages-site)。

PWA 使用獨立的 `manifest.webmanifest`，不影響擴充功能的 `manifest.json`。網站建置不包含擴充功能彈窗、測試、腳本或 ICO 原稿。

瀏覽器驗證需先建置網站，然後指定 Chromium：

```powershell
$env:BROWSER_PATH = 'C:\path\to\chromium\chrome.exe'
npm run test:web
```

測試涵蓋貼上／預覽／複製、無效輸入、安裝提示、手機寬度、輸入資料不持久化及停止伺服器後的完整離線重新載入。預設測試 Pages 子路徑；設定 `$env:WEB_BASE_PATH = '/'` 可驗證自訂網域的根路徑。

### 擴充功能

需要 Node.js 22 或更新版本，無第三方 JavaScript 相依套件：

```powershell
npm test
npm run check
```

核心測試使用虛構資料，涵蓋中文、原始編碼、重複與空值參數、長網址、片段、功能參數、簽章及不支援協定。

`tests/fixtures/site-matrix.json` 涵蓋 8 個網站／服務、30 種頁面情境。矩陣測試對每種類型同時驗證預期結果、通用追蹤清理、簽章保護與重複清理穩定性。瀏覽器整合測試共用同一份矩陣，直接檢查交付版本的預覽與剪貼簿。

更新後使用單一指令產生本機交付檔：

```powershell
npm run package
```

此指令先完成語法與核心測試，再同步 `unpacked/` 與 `Release/clean-url-extension-v版本.zip`，只放入必要執行檔；核對 manifest 與套件版本，移除舊版本 ZIP，不推送或發布。遇到 `unpacked/` 的未知檔案會停止，不擅自刪除。

可選的真實瀏覽器整合測試（需要支援 `--load-extension` 與 CDP `Extensions.triggerAction` 的 Chromium 測試版本）：

```powershell
$env:BROWSER_PATH = 'C:\path\to\chromium\chrome.exe'
$env:EXTENSION_PATH = (Resolve-Path unpacked).Path
node scripts/browser-check.mjs
```

此測試使用虛構資料、隔離的暫存設定檔與本機測試頁，透過實際擴充功能按鈕取得 `activeTab` 權限，驗證預覽、複製結果、複製失敗及重試、乾淨網址、簽章與受限頁面。網站網址由離線攔截頁回應，不讀取真實商品內容，也不產生截圖或瀏覽紀錄。測試會寫入測試連結至系統剪貼簿；剪貼簿讀取權限只由測試工具暫時授予，不在產品權限中。

圖示原稿為 `icons/clean-url.ico`，擴充功能與彈窗使用其中匯出的 16、32、48、128 px PNG，已隨專案提供。

## 檔案

`index.html`、`web.css`、`web.js` 為網頁版；`manifest.webmanifest`、`sw.js` 為 PWA 設定與離線功能；`manifest.json` 為擴充功能設定；`popup.html`、`popup.css`、`popup.js` 為擴充功能彈窗；`url-cleaner.js` 為兩個版本共用的純清理函式；`icons/` 為圖示。

隱私權政策： https://cleanlink.stack-base.com/privacy.html （擴充功能、網頁版與 PWA 共用；可填入 Chrome Web Store 開發者後台）。

### 從其他 App 分享網址

在支援 Web Share Target 的裝置與瀏覽器（例如 Android Chrome）安裝 PWA 後，可在其他 App 的分享選單選取 Clean URL，自動填入原始網址並產生清理結果，再按「複製乾淨連結」。分享的文字包含網址時也能辨識。iPhone／iPad 的 PWA 目前不支援此分享接收方式，可改用貼上網址。

若舊版安裝尚未出現在分享選單，請先連線開啟網站更新；仍未出現時可移除後重新安裝 PWA。分享內容以 POST 交由本機 Service Worker 接收，直接由本機回傳介面並填入網址，不將分享內容放入網址列、傳送至網站伺服器或儲存於離線快取與清理歷史。
