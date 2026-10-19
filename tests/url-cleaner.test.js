import test from "node:test";
import assert from "node:assert/strict";
import { cleanUrl } from "../url-cleaner.js";

// All identifiers and values below are synthetic fixtures.
const cases = [
  ["通用追蹤參數不受網域限制", "https://example.com/?id=42&utm_source=mail&gad_source=1&gad_campaignid=7&srsltid=test", "https://example.com/?id=42", 4],
  ["大小寫與編碼名稱", "https://example.com/?UTM_Source=x&%66bclid=y&Keep=Yes", "https://example.com/?Keep=Yes", 2],
  ["重複參數逐項清理", "https://example.com/?utm_source=a&id=1&utm_source=b&id=2&fbclid=c", "https://example.com/?id=1&id=2", 3],
  ["空值追蹤參數", "https://example.com/?utm_source&x=&utm_medium=", "https://example.com/?x=", 2],
  ["未知參數不誤刪", "https://example.com/?ref=a&source=b&spm=c&id=1&keyword=tea&utm_term=x", "https://example.com/?ref=a&source=b&spm=c&id=1&keyword=tea", 1],
  ["原始編碼與順序不變", "https://EXAMPLE.com:443/a%2fb?q=a%20b&x=~&q=a+b#part", "https://EXAMPLE.com:443/a%2fb?q=a%20b&x=~&q=a+b#part", 0],
  ["中文與編碼不變", "https://example.com/商品?q=測試%20資料&fbclid=test&token=a%2Fb%3D#規格", "https://example.com/商品?q=測試%20資料&token=a%2Fb%3D#規格", 1],
  ["片段內參數不清理", "https://example.com/#/search?utm_source=keep", "https://example.com/#/search?utm_source=keep", 0],
  ["query 清理後完整保留片段", "https://example.com/?gclid=x#/?utm_source=keep", "https://example.com/#/?utm_source=keep", 1],
  ["空查詢保持原樣", "https://example.com/?#", "https://example.com/?#", 0],
  ["空白 query 項目保留", "https://example.com/?a=1&&utm_source=x&b=2&", "https://example.com/?a=1&&b=2&", 1],
  ["蝦皮大整數 ID 不失真", "https://shopee.tw/title-i.90071992547409931.90071992547409933", "https://shopee.tw/product/90071992547409931/90071992547409933", 0],
  ["蝦皮 www 與尾端斜線", "https://www.shopee.tw/title-i.123.456/", "https://www.shopee.tw/product/123/456", 0],
  ["蝦皮不完整商品 ID 不改路徑", "https://shopee.tw/title-i.123.456extra", "https://shopee.tw/title-i.123.456extra", 0],
  ["蝦皮非商品路徑不改寫", "https://shopee.tw/blog/title-i.123.456", "https://shopee.tw/blog/title-i.123.456", 0],
  ["蝦皮仿冒網域不套用", "https://shopee.tw.example.com/title-i.123.456", "https://shopee.tw.example.com/title-i.123.456", 0],
  ["蝦皮非標準連接埠不改寫", "https://shopee.tw:444/title-i.123.456", "https://shopee.tw:444/title-i.123.456", 0],
  ["蝦皮空查詢與片段保留", "https://shopee.tw/title-i.123.456?#", "https://shopee.tw/product/123/456?#", 0],
  ["蝦皮單層分類", "https://shopee.tw/title-cat.1", "https://shopee.tw/c-cat.1", 0],
  ["蝦皮雙層分類", "https://shopee.tw/title-cat.1.2/", "https://shopee.tw/c-cat.1.2", 0],
  ["蝦皮無效分類 ID 保留", "https://shopee.tw/title-cat.1.bad", "https://shopee.tw/title-cat.1.bad", 0],
  ["蝦皮未知分類層級保留", "https://shopee.tw/title-cat.1.2.3.4", "https://shopee.tw/title-cat.1.2.3.4", 0],
  ["蝦皮商品規格包裝清理", 'https://shopee.tw/product/123/456?extraParams={"display_model_id":789}', "https://shopee.tw/product/123/456", 1],
  ["蝦皮規格選取邏輯清理", 'https://shopee.tw/title-i.123.456?extraParams={"model_selection_logic":3,"display_model_id":"789"}&page=2', "https://shopee.tw/product/123/456?page=2", 1],
  ["規格包裝未知欄位保留", 'https://shopee.tw/product/123/456?extraParams={"display_model_id":789,"other":1}', 'https://shopee.tw/product/123/456?extraParams={"display_model_id":789,"other":1}', 0],
  ["規格包裝無效 JSON 保留", "https://shopee.tw/product/123/456?extraParams=invalid", "https://shopee.tw/product/123/456?extraParams=invalid", 0],
  ["規格 ID 無效值保留", 'https://shopee.tw/product/123/456?extraParams={"display_model_id":null}', 'https://shopee.tw/product/123/456?extraParams={"display_model_id":null}', 0],
  ["缺少規格 ID 不清理", 'https://shopee.tw/product/123/456?extraParams={"model_selection_logic":3}', 'https://shopee.tw/product/123/456?extraParams={"model_selection_logic":3}', 0],
  ["無效選取邏輯保留", 'https://shopee.tw/product/123/456?extraParams={"display_model_id":789,"model_selection_logic":null}', 'https://shopee.tw/product/123/456?extraParams={"display_model_id":789,"model_selection_logic":null}', 0],
  ["非商品頁不清理規格包裝", 'https://shopee.tw/search?extraParams={"display_model_id":789}', 'https://shopee.tw/search?extraParams={"display_model_id":789}', 0],
  ["其他網站不清理規格包裝", 'https://example.com/product/123?extraParams={"display_model_id":789}', 'https://example.com/product/123?extraParams={"display_model_id":789}', 0],
  ["賣場未知入口保留", "https://shopee.tw/test_shop?categoryId=1&entryPoint=Other&itemId=2", "https://shopee.tw/test_shop?categoryId=1&entryPoint=Other&itemId=2", 0],
  ["搜尋頁不套用賣場規則", "https://shopee.tw/search?categoryId=1&entryPoint=ShopByPDP&itemId=2", "https://shopee.tw/search?categoryId=1&entryPoint=ShopByPDP&itemId=2", 0],
  ["momo 商品廣告來源", "https://www.momoshop.com.tw/product/123?osm=Ad01&content=personallist01&mdiv=category&cc1=", "https://www.momoshop.com.tw/product/123", 4],
  ["momo 搜尋來源清理", "https://www.momoshop.com.tw/product/123?Area=search&mdiv=100&oid=1_2&cid=index&kw=test&ecTagNos=", "https://www.momoshop.com.tw/product/123", 6],
  ["momo 未知參數與活動標記保留", "https://www.momoshop.com.tw/product/123?Area=search&kw=test&ecTagNos=42&sku=a%20b#spec", "https://www.momoshop.com.tw/product/123?ecTagNos=42&sku=a%20b#spec", 2],
  ["momo 商品未知來源值保留", "https://www.momoshop.com.tw/product/123?osm=other&content=description&mdiv=unknown&cc1=42", "https://www.momoshop.com.tw/product/123?osm=other&content=description&mdiv=unknown&cc1=42", 0],
  ["momo 非商品頁保留來源參數", "https://www.momoshop.com.tw/search/test?Area=search&mdiv=100&oid=1_2&cid=index&kw=test&ecTagNos=", "https://www.momoshop.com.tw/search/test?Area=search&mdiv=100&oid=1_2&cid=index&kw=test&ecTagNos=", 0],
  ["momo 活動頁缺少活動碼不改", "https://www.momoshop.com.tw/edm/cmmedm.jsp?n=1&mdiv=banner&ctype=B", "https://www.momoshop.com.tw/edm/cmmedm.jsp?n=1&mdiv=banner&ctype=B", 0],
  ["其他網站不套用 momo 規則", "https://example.com/product/123?osm=Ad01&content=personallist01&mdiv=category&cc1=", "https://example.com/product/123?osm=Ad01&content=personallist01&mdiv=category&cc1=", 0],
  ["酷澎純商品入口", "https://www.tw.coupang.com/products/123?itemId=456&vendorItemId=789", "https://www.tw.coupang.com/products/123", 2],
  ["酷澎未知參數保留原始編碼", "https://www.tw.coupang.com/products/123?pid=test&unknown=a%20b&af_custom=keep#spec", "https://www.tw.coupang.com/products/123?unknown=a%20b&af_custom=keep#spec", 1],
  ["酷澎未知轉址與頁面類型保留", "https://www.tw.coupang.com/products/123?pageType=OTHER&pageValue=456&redirect=custom", "https://www.tw.coupang.com/products/123?pageType=OTHER&pageValue=456&redirect=custom", 0],
  ["酷澎非商品路徑不套用", "https://www.tw.coupang.com/products/123/other?pid=keep&src=keep", "https://www.tw.coupang.com/products/123/other?pid=keep&src=keep", 0],
  ["其他網站規格 ID 保留", "https://example.com/products/123?itemId=456&vendorItemId=789&pid=keep&src=keep", "https://example.com/products/123?itemId=456&vendorItemId=789&pid=keep&src=keep", 0],
];

for (const [name, input, expected, count] of cases) {
  test(name, () => {
    const result = cleanUrl(input);
    assert.equal(result.originalUrl, input);
    assert.equal(result.cleanedUrl, expected);
    assert.equal(result.removedCount, count);
    assert.equal(cleanUrl(expected).cleanedUrl, expected);
  });
}

test("長網址完整保留", () => {
  const query = "中文%20a+".repeat(4000);
  assert.equal(cleanUrl(`https://example.com/?q=${query}&utm_source=test#end`).cleanedUrl, `https://example.com/?q=${query}#end`);
});

test("所有支援簽章保護一般網址與網站專屬路徑", () => {
  for (const name of ["X-Amz-Signature", "X-Goog-Signature", "Signature", "sig"]) {
    for (const base of ["https://example.com/", "https://shopee.tw/title-i.123.456", "https://www.momoshop.com.tw/product/123", "https://www.tw.coupang.com/products/title-123"]) {
      const input = `${base}?utm_source=test&${name}=synthetic`;
      assert.deepEqual(cleanUrl(input), { originalUrl: input, cleanedUrl: input, removedCount: 0, signed: true });
    }
  }
});

test("拒絕無效輸入與不支援協定", () => {
  for (const input of [null, undefined, 123, "", "invalid", "/relative", " https://example.com/", "chrome://extensions/", "edge://settings/", "about:blank", "file:///test", "javascript:alert(1)", "data:text/plain,test", "ftp://example.com/"]) {
    assert.throws(() => cleanUrl(input));
  }
});
