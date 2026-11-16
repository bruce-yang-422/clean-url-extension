import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { LANGUAGES, pickLanguage, t } from "../i18n.js";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("介面語言對應", () => {
  assert.equal(pickLanguage("zh-TW"), "zh-TW");
  assert.equal(pickLanguage("zh-HK"), "zh-TW");
  assert.equal(pickLanguage("zh-Hant"), "zh-TW");
  assert.equal(pickLanguage("zh-CN"), "zh-CN");
  assert.equal(pickLanguage("ja-JP"), "ja");
  assert.equal(pickLanguage("ko"), "ko");
  assert.equal(pickLanguage("fr-CA"), "fr");
  assert.equal(pickLanguage("de-DE"), "en");
  assert.equal(LANGUAGES.length, 7);
});

test("每種語言都有完整的介面文字", () => {
  const keys = new Set();
  for (const file of ["popup.html", "popup.js", "background.js"]) {
    for (const match of read(file).matchAll(/(?:data-i18n(?:-placeholder)?="|\bt\(")(\w+)"/g)) keys.add(match[1]);
  }
  assert.ok(keys.size >= 15);
  for (const lang of LANGUAGES) {
    for (const key of keys) assert.notEqual(t(key, lang), key, `${lang} 缺少 ${key}`);
  }
  // 非中文語言不應退回繁體中文。
  for (const lang of ["en", "ja", "ko", "es", "fr"]) {
    for (const key of keys) assert.notEqual(t(key, lang), t(key, "zh-TW"), `${lang} 的 ${key} 尚未翻譯`);
  }
});

test("manifest 語系字串齊全", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const used = [...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map(match => match[1]);
  const locales = readdirSync(new URL("_locales/", root));
  assert.ok(locales.includes(manifest.default_locale));
  assert.equal(locales.length, 7);
  for (const locale of locales) {
    const messages = JSON.parse(read(`_locales/${locale}/messages.json`));
    for (const key of used) assert.ok(messages[key]?.message, `${locale} 缺少 ${key}`);
  }
  assert.equal(JSON.parse(read("package.json")).version, manifest.version);
});
