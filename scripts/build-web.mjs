import assert from "node:assert/strict";
import { readFile, writeFile, readdir, mkdir, lstat } from "node:fs/promises";
import { resolve, join, dirname, relative, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "web-dist");
const files = ["index.html", "privacy.html", "web.css", "web.js", "url-cleaner.js", "share-target.js", "sw.js", "manifest.webmanifest", ".nojekyll", "CNAME",
  "icons/icon-32.png", "icons/icon-128.png", "icons/apple-touch-icon.png", "icons/pwa-192.png", "icons/pwa-512.png"];
try { assert.ok(!(await lstat(output)).isSymbolicLink(), "Refusing linked output directory"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(output, { recursive: true });
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), "Refusing linked output asset");
    if (entry.isDirectory()) await inspect(full);
    else assert.ok(files.includes(relative(output, full).split(sep).join("/")), `Unexpected web output: ${entry.name}`);
  }
}
await inspect(output);
for (const file of files) {
  assert.ok((await lstat(join(root, file))).isFile(), `Missing static asset: ${file}`);
  const target = join(output, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await readFile(join(root, file)));
}
console.log(`Built GitHub Pages/PWA site: web-dist/ (${files.length} static files)`);
