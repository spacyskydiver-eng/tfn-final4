/**
 * api.ts — HTTP client for submitting events to the website backend.
 *
 * Tauri's WebView can make standard fetch() calls to any URL.
 * No special Tauri IPC is needed for outbound HTTP.
 *
 * Design:
 *  • Only sends rawText and syncedVia — minimal footprint.
 *  • Authorization: Bearer <token> header for authentication.
 *  • Throws ApiError on non-2xx responses with a human-readable message.
 */

export interface ApiError extends Error {
  status?: number;
}

export interface SubmitOptions {
  serverUrl: string;   // e.g. "https://yoursite.com"
  apiToken:  string;   // e.g. "rok_abc123..."
  rawText:   string;   // Full copied report text
}

export interface SubmitResult {
  id?:       string;
  type?:     string;
  duplicate?: boolean;
}

/**
 * Submit a raw battle report to the backend.
 *
 * Returns { id, type } on success (201) or { duplicate: true } if already stored (200).
 * Throws an ApiError on auth failures, server errors, or network issues.
 */
export async function submitEvent(opts: SubmitOptions): Promise<SubmitResult> {
  const { serverUrl, apiToken, rawText } = opts;

  // Sanitise base URL — strip trailing slash
  const base = serverUrl.replace(/\/+$/, "");

  let response: Response;
  try {
    response = await fetch(`${base}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiToken}`,
        // Identify the source in server logs
        "X-Client":      "rok-companion/0.1",
      },
      body: JSON.stringify({ rawText, syncedVia: "clipboard" }),
    });
  } catch (err) {
    // Network-level failure (no connectivity, wrong URL, CORS, etc.)
    const e = new Error(
      err instanceof Error ? err.message : "Network request failed"
    ) as ApiError;
    throw e;
  }

  // Parse body regardless of status so we can include server error messages
  const body = await response.json().catch(() => ({})) as {
    error?: string;
    duplicate?: boolean;
    id?: string;
    type?: string;
  };

  if (!response.ok) {
    const e = new Error(
      body.error ?? `Server returned ${response.status}`
    ) as ApiError;
    e.status = response.status;
    throw e;
  }

  return { id: body.id, type: body.type, duplicate: body.duplicate };
}
