/**
 * hash.ts — browser-compatible SHA-256 using the Web Crypto API.
 *
 * Tauri's WebView exposes the full Web Crypto API, so no Node.js deps are needed.
 * This mirrors the logic in the website's lib/hash-utils.ts.
 */

/**
 * Returns the hex SHA-256 digest of any UTF-8 string.
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(text);
  const buffer  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Normalises a report string to be resilient to:
 *   - Trailing whitespace / line-ending differences
 *   - Timestamps (which vary per copy)
 *   - Case differences
 *
 * Must match the normalisation in lib/hash-utils.ts exactly.
 */
function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d{4}[-/]\d{2}[-/]\d{2}[\s_T]\d{2}:\d{2}:\d{2}/g, "") // strip timestamps
    .replace(/\s+/g, " ")
    .trim();
}

/** Hash a report text the same way the server does. */
export async function hashText(raw: string): Promise<string> {
  return sha256(normalise(raw));
}
