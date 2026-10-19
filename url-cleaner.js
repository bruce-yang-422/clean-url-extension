// Keep this list narrow: ambiguous names such as ref, source, id and keyword
// can control page behavior and must remain intact.
const TRACKING_PARAMETERS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid",
  "ttclid", "twclid", "igshid", "mc_cid", "mc_eid", "_ga", "_gl",
]);
const SIGNATURE_PARAMETERS = new Set([
  "x-amz-signature", "x-goog-signature", "signature", "sig",
]);

/** Pure, local-only cleaner. Never follows redirects or rewrites the path/hash. */
export function cleanUrl(input) {
  if (typeof input !== "string" || !input || input !== input.trim()) {
    throw new TypeError("無法解析網址");
  }
  const parsed = new URL(input);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("此頁面無法讀取網址");
  }

  const result = { originalUrl: input, cleanedUrl: input, removedCount: 0, signed: false };
  // Use URLSearchParams to decode names, but retain original query bytes.
  // Serializing searchParams would change %20, +, ~, and other encodings.
  const hashIndex = input.indexOf("#");
  const queryEnd = hashIndex === -1 ? input.length : hashIndex;
  const queryIndex = input.indexOf("?");
  if (queryIndex === -1 || queryIndex >= queryEnd) return result;

  const parts = input.slice(queryIndex + 1, queryEnd).split("&");
  const entries = parts.map(raw => ({ raw, name: [...new URLSearchParams(raw).keys()][0]?.toLowerCase() ?? "" }));
  // Signed URLs may authenticate the entire query, including tracking fields.
  if (entries.some(({ name }) => SIGNATURE_PARAMETERS.has(name))) {
    return { ...result, signed: true };
  }
  const retained = entries.filter(({ name }) => {
    const tracking = name.startsWith("utm_") || TRACKING_PARAMETERS.has(name);
    if (tracking) result.removedCount++;
    return !tracking;
  });
  if (!result.removedCount) return result;
  const query = retained.map(({ raw }) => raw).join("&");
  result.cleanedUrl = input.slice(0, queryIndex) + (query ? `?${query}` : "") + input.slice(queryEnd);
  return result;
}
