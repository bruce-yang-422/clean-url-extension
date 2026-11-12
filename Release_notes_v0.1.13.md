# Clean URL v0.1.13｜PChome 商品網址清理・首頁 SEO 優化

本版本新增 PChome 24h 商品網址清理規則，並改善網頁版的搜尋與社群分享資訊。

### Added

- 新增 PChome 24h `/prod/商品代碼` 商品頁專屬規則，移除全部查詢參數，包括 `recommend_id`、`prid`、`prt` 及未知參數，保留商品路徑與 `#` 片段。
- 新增首頁 WebApplication JSON-LD 結構化資料。

### Changed

- 更新首頁標題、搜尋摘要及介紹文案。
- 補齊 Open Graph 與 Twitter 分享預覽資訊，包含圖示、替代文字與語系設定。
- 更新首頁清理規則說明，明確標示 PChome 商品頁的處理方式。

### Documentation

- 更新 README、隱私說明與 v0.1.13 版本紀錄。
- 為網址清理核心、Service Worker、分享接收及網頁程式與樣式補充繁體中文註解。

### Tests

- 新增 PChome 推薦來源與訂單活動連結的清理案例。
- 驗證未知查詢參數、空查詢、片段保留及非商品頁／仿冒網域不套用專屬規則。
- 更新網站矩陣測試，涵蓋 PChome 商品頁的簽章處理例外。
- 語法檢查與 90 項自動化測試全部通過；擴充功能封裝與網站建置成功。

### 注意事項

- PChome 商品頁會移除**全部查詢參數**，此規則優先於簽章保護；搜尋、分類與商店頁仍只套用通用追蹤清理。
- 其他網站維持既有清理規則與可辨識的簽章保護。
- 擴充功能權限維持 `activeTab` 與 `clipboardWrite`。網址清理在本機完成，不增加資料收集或上傳行為。

### 安裝與更新

1. 下載附件 `clean-url-extension-v0.1.13.zip` 並解壓縮。
2. 開啟 `chrome://extensions` 或 `edge://extensions`，啟用「開發人員模式」。
3. 選擇「載入未封裝項目」，選取解壓後包含 `manifest.json` 的資料夾。
4. 確認彈窗版本為 `0.1.13`。

已使用未封裝版本的使用者，請更新原載入資料夾的檔案，再於擴充功能管理頁按「重新載入」。

網頁版／PWA：[cleanlink.stack-base.com](https://cleanlink.stack-base.com/)

**完整變更比較**：[v0.1.12...v0.1.13](https://github.com/bruce-yang-422/clean-url-extension/compare/v0.1.12...v0.1.13)
