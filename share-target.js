// Share payloads stay in memory; neither storage nor network is used.
export function sharedInput(hash) {
  if (!hash.startsWith("#share=")) return null;
  let data;
  try { data = JSON.parse(decodeURIComponent(hash.slice(7))); }
  catch { return ""; }
  if (!data || typeof data !== "object") return "";
  const values = [data.url, data.text, data.title].filter(value => typeof value === "string");
  for (const value of values) {
    const match = value.match(/https?:\/\/[^\s<>"「」『』]+/i);
    if (!match) continue;
    let candidate = match[0].replace(/[，。；！、]+$/u, "");
    // Remove surrounding prose/Markdown delimiters without altering paired URL characters.
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (candidate.endsWith(close) && candidate.split(close).length > candidate.split(open).length) candidate = candidate.slice(0, -1);
    }
    try { new URL(candidate); return candidate; } catch { /* Try the next shared field. */ }
  }
  return values.find(value => value.trim())?.trim() ?? "";
}
