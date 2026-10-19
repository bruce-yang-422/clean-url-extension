import test from "node:test";
import assert from "node:assert/strict";
import { cleanUrl } from "../url-cleaner.js";

const cases = [
  ["移除蝦皮範例的追蹤參數", "https://shopee.tw/product/12345/67890?utm_source=shopee&utm_medium=social", "https://shopee.tw/product/12345/67890", 2],
  ["保留 momo 商品編號", "https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=123456&utm_source=line", "https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=123456", 1],
  ["保留 PChome 商品路徑及功能參數", "https://24h.pchome.com.tw/prod/DYAJ00-A900TEST?fq=/S/DYAJ00&gclid=abc", "https://24h.pchome.com.tw/prod/DYAJ00-A900TEST?fq=/S/DYAJ00", 1],
  ["保留 Dcard 文章與片段", "https://www.dcard.tw/f/travel/p/123456?utm_medium=app#comment-42", "https://www.dcard.tw/f/travel/p/123456#comment-42", 1],
  ["LINE 短網址不展開", "https://lin.ee/AbCd123", "https://lin.ee/AbCd123", 0],
  ["保留 LINE 分享目標參數", "https://social-plugins.line.me/lineit/share?url=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dline&utm_campaign=share", "https://social-plugins.line.me/lineit/share?url=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dline", 1],
  ["無追蹤時逐字保留", "https://EXAMPLE.com:443/a%2fb?q=a%20b&x=~&q=a+b#中文", "https://EXAMPLE.com:443/a%2fb?q=a%20b&x=~&q=a+b#中文", 0],
  ["中文與編碼保持不變", "https://example.com/商品?q=耳機%20藍牙&fbclid=123&token=a%2Fb%3D#規格", "https://example.com/商品?q=耳機%20藍牙&token=a%2Fb%3D#規格", 1],
  ["重複參數逐項計數", "https://example.com/?utm_source=a&id=1&utm_source=b&id=2&fbclid=c", "https://example.com/?id=1&id=2", 3],
  ["不分大小寫並解析編碼名稱", "https://example.com/?UTM_Source=x&%66bclid=y&Keep=Yes", "https://example.com/?Keep=Yes", 2],
  ["保留未知及功能參數", "https://example.com/?ref=a&source=b&id=1&si=foo&spm=bar&keyword=茶&utm_term=c", "https://example.com/?ref=a&source=b&id=1&si=foo&spm=bar&keyword=茶", 1],
  ["片段內 query 不清理", "https://example.com/#/search?utm_source=a", "https://example.com/#/search?utm_source=a", 0],
  ["清理 query 保留完整片段", "https://example.com/?gclid=x#/?utm_source=keep", "https://example.com/#/?utm_source=keep", 1],
  ["空白查詢符號保持不變", "https://example.com/?#", "https://example.com/?#", 0],
  ["空值追蹤參數也移除", "https://example.com/?utm_source&x=&utm_medium=", "https://example.com/?x=", 2],
  ["保留空白 query 項目", "https://example.com/?a=1&&utm_source=x&b=2&", "https://example.com/?a=1&&b=2&", 1],
  ["所有明確 click ID", "https://example.com/?gclid=1&dclid=2&gbraid=3&wbraid=4&msclkid=5&ttclid=6&twclid=7&igshid=8&mc_cid=9&mc_eid=10&_ga=11&_gl=12", "https://example.com/", 12],
];

for (const [name, input, expected, count] of cases) {
  test(name, () => {
    const actual = cleanUrl(input);
    assert.equal(actual.originalUrl, input);
    assert.equal(actual.cleanedUrl, expected);
    assert.equal(actual.removedCount, count);
    assert.equal(cleanUrl(actual.cleanedUrl).cleanedUrl, expected, "清理應具有冪等性");
  });
}

test("長網址完整保留", () => {
  const value = "中文%20a+".repeat(4000);
  const result = cleanUrl(`https://example.com/?q=${value}&utm_source=test#end`);
  assert.equal(result.cleanedUrl, `https://example.com/?q=${value}#end`);
});

test("簽章連結不修改", () => {
  for (const name of ["X-Amz-Signature", "X-Goog-Signature", "Signature", "sig"]) {
    const input = `https://example.com/?utm_source=a&${name}=abc`;
    assert.deepEqual(cleanUrl(input), { originalUrl: input, cleanedUrl: input, removedCount: 0, signed: true });
  }
});

test("拒絕不支援的網址與無效輸入", () => {
  for (const input of [null, undefined, 123, "", "bad url", "/relative", " https://example.com/", "chrome://extensions/", "edge://settings/", "about:blank", "file:///tmp/a", "javascript:alert(1)", "data:text/plain,hi", "ftp://example.com/"]) {
    assert.throws(() => cleanUrl(input));
  }
});
