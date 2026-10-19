import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanUrl } from "../url-cleaner.js";

const matrix = JSON.parse(readFileSync(new URL("./fixtures/site-matrix.json", import.meta.url), "utf8"));
// This common campaign suffix is applied to every page type, independently
// of its site rules. Functional parameters must survive byte-for-byte.
const campaign = "UTM_Source=test&%75tm_medium=email&gad_source=1&gad_campaignid=42&gclid=abc&srsltid=xyz&mtm_campaign=sale&pk_campaign=mail&fb_source=ad";
function appendQuery(input, query) {
  const hash = input.indexOf("#");
  const end = hash === -1 ? input.length : hash;
  const head = input.slice(0, end);
  return head + (head.includes("?") ? "&" : "?") + query + input.slice(end);
}

for (const [name, input, expected, count] of matrix) {
  test(`網站矩陣：${name}`, () => {
    const result = cleanUrl(input);
    assert.equal(result.cleanedUrl, expected);
    assert.equal(result.removedCount, count);
    assert.equal(cleanUrl(expected).cleanedUrl, expected, "清理後再次清理不應改變");
    assert.equal(cleanUrl(appendQuery(input, campaign)).cleanedUrl, expected, "通用參數不得依網站漏刪");
    const signed = appendQuery(input, "X-Amz-Signature=do-not-change");
    assert.equal(cleanUrl(signed).cleanedUrl, signed, "簽章不可因網站規則被改寫");
  });
}

test("擴充通用歸因名稱，不擴大到功能參數", () => {
  const tracked = ["gclsrc", "fb_ref", "fb_action_ids", "fb_action_types", "mc_tc", "__twitter_impression", "mkt_tok",
    "mtm_campaign", "mtm_source", "mtm_medium", "mtm_content", "mtm_keyword", "mtm_kwd", "mtm_cid", "mtm_group", "mtm_placement", "pk_campaign", "pk_kwd"];
  const input = "https://example.com/?" + tracked.map(name => `${name}=test`).join("&") + "&source=keep&ref=keep&mtm_custom=keep&pk_custom=keep#part";
  assert.equal(cleanUrl(input).cleanedUrl, "https://example.com/?source=keep&ref=keep&mtm_custom=keep&pk_custom=keep#part");
});

test("蝦皮專屬名稱不從其他網站移除", () => {
  const input = "https://example.com/?sp_atk=a&xptdk=b&publish_id=c&uls_trackid=d";
  assert.equal(cleanUrl(input).cleanedUrl, input);
});

test("酷澎搜尋歸因不從其他網站移除", () => {
  const input = "https://example.com/products/123?searchId=abc&rank=1&searchRank=2&itemsCount=36&traceId=x&sourceType=search&q=keep";
  assert.equal(cleanUrl(input).cleanedUrl, input);
});
