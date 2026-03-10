import { createHash } from 'crypto'

/**
 * Returns the SHA-256 hex digest of any string.
 * Used for:
 *   - Content dedup:  sha256(normaliseReportText(raw)) → contentHash
 *   - Token lookup:   sha256(rawToken)                 → tokenHash in DB
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Normalises a raw report string before hashing so that minor whitespace
 * differences, copy-paste artefacts, or timestamp variations don't produce
 * different hashes for what is effectively the same report.
 *
 * Rules applied (in order):
 *  1. Lowercase everything
 *  2. Strip ISO / slash-separated timestamps  (2024-01-15 12:34:56)
 *  3. Collapse all whitespace runs to a single space
 *  4. Trim leading / trailing whitespace
 */
export function normaliseReportText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d{4}[-/]\d{2}[-/]\d{2}[\s_T]\d{2}:\d{2}:\d{2}/g, '') // strip timestamps
    .replace(/\s+/g, ' ')
    .trim()
}

/** Convenience: hash a report text ready for DB storage / comparison. */
export function hashReport(raw: string): string {
  return sha256(normaliseReportText(raw))
}
