// Repeatable local delivery: validate sources, copy runtime assets, write ZIP.
// ZIP uses Node built-ins; no Python, external archiver, or runtime dependency.
import assert from "node:assert/strict";
import { readFile, writeFile, readdir, mkdir, lstat, unlink, rename } from "node:fs/promises";
import { resolve, dirname, join, relative, sep, isAbsolute } from "node:path";
import { deflateRawSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const unpacked = join(root, "unpacked");
const releases = join(root, "Release");
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const metadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.equal(manifest.version, metadata.version, "Manifest/package versions must match");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
const files = [...new Set([
  "manifest.json", manifest.action.default_popup, "popup.css", "popup.js", "url-cleaner.js",
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
])].sort();

function within(parent, child) {
  const tail = relative(parent, child);
  assert.ok(tail && !isAbsolute(tail) && tail !== ".." && !tail.startsWith(`..${sep}`));
  assert.equal(resolve(parent, tail), resolve(child));
  // Absolute paths on another volume must never be accepted as relative assets.
  assert.ok(!tail.includes(":"));
}
async function plainDirectory(path) {
  assert.equal(dirname(resolve(path)), root);
  try { assert.ok(!(await lstat(path)).isSymbolicLink(), `Refusing symlink: ${path}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(path, { recursive: true });
}
await plainDirectory(unpacked);
await plainDirectory(releases);
async function inspectOutput(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    within(unpacked, full);
    assert.ok(!entry.isSymbolicLink(), `Refusing output symlink: ${full}`);
    if (entry.isDirectory()) await inspectOutput(full);
    else assert.ok(files.includes(relative(unpacked, full).split(sep).join("/")), `Unexpected file in unpacked: ${full}`);
  }
}
await inspectOutput(unpacked);
const assets = [];
for (const name of files) {
  const source = resolve(root, name);
  const destination = resolve(unpacked, name);
  within(root, source);
  within(unpacked, destination);
  assert.ok((await lstat(source)).isFile(), `Missing regular source file: ${name}`);
  const data = await readFile(source);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, data);
  assert.deepEqual(await readFile(destination), data);
  assets.push({ name, data });
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
const local = [], central = [];
let offset = 0;
for (const { name, data } of assets) {
  const filename = Buffer.from(name, "utf8");
  const compressed = deflateRawSync(data);
  const crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6); // UTF-8 filename
  header.writeUInt16LE(8, 8); // DEFLATE
  header.writeUInt16LE(33, 12); // 1980-01-01, reproducible ZIP timestamp
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(filename.length, 26);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50, 0);
  directory.writeUInt16LE(20, 4);
  header.copy(directory, 6, 4, 30);
  directory.writeUInt32LE(offset, 42);
  central.push(directory, filename);
  local.push(header, filename, compressed);
  offset += header.length + filename.length + compressed.length;
}
const directory = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(assets.length, 8);
end.writeUInt16LE(assets.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const filename = `clean-url-extension-v${manifest.version}.zip`;
const archive = join(releases, filename);
const temporary = join(releases, `.${filename}.tmp`);
within(releases, archive);
within(releases, temporary);
try {
  await writeFile(temporary, Buffer.concat([...local, directory, end]), { flag: "wx" });
  await rename(temporary, archive);
} catch (error) {
  // This exact temporary filename is always inside the checked Release path.
  if (error.code !== "EEXIST") await unlink(temporary).catch(() => {});
  throw error;
}
const current = manifest.version.split(".").map(Number);
for (const entry of await readdir(releases, { withFileTypes: true })) {
  const match = entry.name.match(/^clean-url-extension-v(\d+)\.(\d+)\.(\d+)\.zip$/);
  if (!match || !entry.isFile() || entry.isSymbolicLink()) continue;
  const candidate = match.slice(1).map(Number);
  const difference = candidate.map((value, i) => value - current[i]).find(value => value !== 0) ?? 0;
  if (difference < 0) {
    const previous = resolve(releases, entry.name);
    within(releases, previous);
    assert.equal(dirname(previous), releases);
    await unlink(previous);
  }
}
console.log(`Packaged v${manifest.version}: ${assets.length} runtime files in unpacked/ and Release/${filename}`);
