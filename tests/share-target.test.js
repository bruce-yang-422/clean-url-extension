import test from "node:test";
import assert from "node:assert/strict";
import { sharedInput } from "../share-target.js";

const share = data => `#share=${encodeURIComponent(JSON.stringify(data))}`;
test("分享接收支援網址、Android 文字與附帶標題的訊息", () => {
  const url = "https://example.com/read?utm_source=share&id=42#part";
  assert.equal(sharedInput(share({ url, text: "另一個 https://other.test/" })), url);
  assert.equal(sharedInput(share({ text: `分享好文章：${url}` })), url);
  assert.equal(sharedInput(share({ title: `好文章 (${url})` })), url);
  assert.equal(sharedInput(share({ text: "看看 https://example.com/a_(b)" })), "https://example.com/a_(b)");
  assert.equal(sharedInput(share({ text: "[文章](https://example.com/read)。" })), "https://example.com/read");
});
test("一般片段不被處理，無效分享不會執行內容", () => {
  assert.equal(sharedInput("#part"), null);
  assert.equal(sharedInput("#share=%invalid"), "");
  assert.equal(sharedInput(share(null)), "");
  assert.equal(sharedInput(share({ text: "javascript:alert(1)" })), "javascript:alert(1)");
  assert.equal(sharedInput(share({ text: 42 })), "");
});
