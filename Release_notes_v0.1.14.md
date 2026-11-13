# Clean URL v0.1.14｜蝦皮圖片與 Threads 分享連結清理

本版本補齊蝦皮商品圖片選取及 Threads 貼文分享參數的清理規則。

### Added

- 蝦皮商品頁移除 `image_ids` 圖片選取參數，分享純商品入口；非商品頁保留。
- Threads 的 threads.com、threads.net（含 www）貼文頁移除 `xmt`、`slof`，保留其他參數與片段；非貼文頁不套用。

### Changed

- 更新 README 與網頁版支援網站及清理規則說明。
- 更新 PWA 快取版本，讓離線版取得最新清理核心。

### Tests

- 新增蝦皮圖片與 Threads 分享參數回歸案例，涵蓋非貼文頁、其他網域與功能參數保留。
- 96 項自動化測試與語法檢查通過，重新建置擴充功能與網頁版。

### 安裝與更新

1. 下載 `clean-url-extension-v0.1.14.zip` 並解壓縮。
2. 在 `chrome://extensions` 或 `edge://extensions` 啟用開發人員模式，載入解壓後的資料夾。
3. 已安裝未封裝版本者，更新原資料夾並按「重新載入」，確認版本為 `0.1.14`。

網頁版／PWA：[cleanlink.stack-base.com](https://cleanlink.stack-base.com/)

**完整變更比較**：[v0.1.13...v0.1.14](https://github.com/bruce-yang-422/clean-url-extension/compare/v0.1.13...v0.1.14)
