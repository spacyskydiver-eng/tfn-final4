/**
 * Modular report parser for Rise of Kingdoms battle reports.
 *
 * Architecture
 * ────────────
 * • Each report type is an independent `ParserDefinition` object.
 * • Parsers are registered in the PARSERS array, tried in priority order.
 * • `parseReport(raw)` iterates PARSERS and returns the first match.
 * • Adding a new report type requires only one new ParserDefinition + push to PARSERS.
 *
 * Supported types (MVP)
 * ─────────────────────
 * • BARBARIAN_KILL  – attacking a barbarian camp / tribe
 * • FORT_KILL       – destroying an alliance fort / fortress
 *
 * Adding more
 * ───────────
 * • Create a new `const xyzParser: ParserDefinition = { matches, parse }` block.
 * • Push it onto PARSERS before the fallback.
 */

// ─── Public Types ─────────────────────────────────────────────────────────────

export type ReportType =
  | 'BARBARIAN_KILL'
  | 'FORT_KILL'
  | 'PVP_KILL'          // Attacking another player's city
  | 'DEFENSE_REPORT'    // Someone attacked your city
  | 'SCOUT_REPORT'      // Scouting enemy city
  | 'GATHERING_COMPLETE' // Troops returning from gathering
  | 'UNKNOWN'

export interface ParsedReport {
  type: ReportType
  killCount: number   // Total enemy unit deaths (troops killed)
  fortKills: number   // Fort structures destroyed (usually 0 or 1)
  playerName?: string
  targetName?: string
  targetLevel?: number
  allianceTag?: string  // e.g. "TFN" from "[TFN] Fort"
  result?: 'Victory' | 'Defeat' | 'Unknown'
  resources?: {
    food?: number
    wood?: number
    stone?: number
    gold?: number
  }
  confidence: number  // 0–1: how confident the parser is
}

// ─── Internal Parser Contract ─────────────────────────────────────────────────

interface ParserDefinition {
  /** Returns true if this parser should handle the raw text. */
  matches: (raw: string) => boolean
  /** Parses the text and returns a complete ParsedReport. */
  parse: (raw: string) => ParsedReport
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Extract the first integer after a regex match (handles thousands commas). */
function extractNumber(text: string, pattern: RegExp): number {
  const m = text.match(pattern)
  if (!m) return 0
  return parseInt(m[1].replace(/,/g, ''), 10) || 0
}

/** Determine battle result from free text. */
function extractResult(text: string): 'Victory' | 'Defeat' | 'Unknown' {
  if (/\b(victory|win|success|won)\b/i.test(text)) return 'Victory'
  if (/\b(defeat|loss|failed|lost)\b/i.test(text)) return 'Defeat'
  return 'Unknown'
}

/**
 * Sum all the numbers that appear on "label: NNN" lines in a given text block.
 * ROK reports list kills by tier:
 *   "Infantry T1: 150\nCavalry T2: 30\n…"
 * We sum them all to get a total kills figure.
 */
function sumLabelledNumbers(section: string): number {
  let total = 0
  const pattern = /:\s*([\d,]+)\s*(?:\n|$)/gim
  let m: RegExpExecArray | null
  while ((m = pattern.exec(section)) !== null) {
    total += parseInt(m[1].replace(/,/g, ''), 10) || 0
  }
  return total
}

/**
 * Try to extract a kills sub-section (everything between a "Kills" header and
 * the next blank line / section header).  Falls back to scanning the whole text.
 */
function extractTotalKills(raw: string): number {
  // 1. Named section: "── Kills ──\n T1: 50\n T2: 20\n\n"
  const sectionMatch = raw.match(
    /(?:kills?|enemy\s+deaths?|killed)[:\s\-─]*\n([\s\S]*?)(?:\n\s*\n|\n\s*[─\-\[*]|$)/i
  )
  if (sectionMatch) {
    const total = sumLabelledNumbers(sectionMatch[1])
    if (total > 0) return total
  }

  // 2. "Total Kills: 150"
  const total = extractNumber(raw, /total\s+kills?\s*:?\s*([\d,]+)/i)
  if (total > 0) return total

  // 3. "Deaths: 150"
  const deaths = extractNumber(raw, /(?:enemy\s+)?deaths?\s*:?\s*([\d,]+)/i)
  return deaths
}

/** Extract plundered resources from any section of the text. */
function extractResources(raw: string) {
  return {
    food:  extractNumber(raw, /food\s*:?\s*([\d,]+)/i)  || undefined,
    wood:  extractNumber(raw, /wood\s*:?\s*([\d,]+)/i)  || undefined,
    stone: extractNumber(raw, /stone\s*:?\s*([\d,]+)/i) || undefined,
    gold:  extractNumber(raw, /gold\s*:?\s*([\d,]+)/i)  || undefined,
  }
}

/** Extract attacker/player name from common ROK patterns. */
function extractAttacker(raw: string): string | undefined {
  const patterns = [
    /attacker\s*:?\s*([^\n\r\[(]+)/i,
    /from\s*:?\s*([^\n\r\[(]+)/i,
    /commander\s*:?\s*([^\n\r\[(]+)/i,
  ]
  for (const p of patterns) {
    const m = raw.match(p)
    if (m) return m[1].trim()
  }
  return undefined
}

// ─── Parser: Barbarian Kill ───────────────────────────────────────────────────
/**
 * Handles reports where the target is a barbarian camp or tribe.
 *
 * Matching signals (any):
 *   "Barbarian (Lv.25)"  |  "Target: Barbarian"  |  "attacked Barbarian"
 */
const barbarianKillParser: ParserDefinition = {
  matches: (raw) => /\bbarbarian\b/i.test(raw),

  parse: (raw): ParsedReport => {
    const levelMatch = raw.match(/barbarian[^)(\n]*\(?\s*lv\.?\s*(\d+)/i)
    const targetLevel = levelMatch ? parseInt(levelMatch[1], 10) : undefined

    const killCount = extractTotalKills(raw)
    const resources = extractResources(raw)

    return {
      type: 'BARBARIAN_KILL',
      killCount,
      fortKills: 0,
      playerName: extractAttacker(raw),
      targetName: `Barbarian${targetLevel ? ` Lv.${targetLevel}` : ''}`,
      targetLevel,
      result: extractResult(raw),
      resources: Object.values(resources).some(Boolean) ? resources : undefined,
      confidence: 0.90,
    }
  },
}

// ─── Parser: Fort Kill ────────────────────────────────────────────────────────
/**
 * Handles reports where an alliance fort or fortress was attacked/destroyed.
 *
 * Matching signals (any):
 *   "[TAG] Fort"  |  "Alliance Fort"  |  "Fortress"  |  "fort (Lv.X)"
 */
const fortKillParser: ParserDefinition = {
  matches: (raw) => /\bfort(ress)?\b/i.test(raw),

  parse: (raw): ParsedReport => {
    // Alliance tag — "[TFN] Fort Lv.3"
    const tagMatch   = raw.match(/\[([A-Z0-9]{1,5})\]\s*fort/i)
    const allianceTag = tagMatch ? tagMatch[1].toUpperCase() : undefined

    const levelMatch = raw.match(/fort(?:ress)?\s*\(?\s*lv\.?\s*(\d+)/i)
    const targetLevel = levelMatch ? parseInt(levelMatch[1], 10) : undefined

    // Usually 1 fort destroyed per report; override if explicitly stated
    const explicitForts = extractNumber(raw, /fort[^s]*\s+(?:destroyed|levelled?)\s*:?\s*([\d,]+)/i)
    const fortKills = explicitForts || 1

    return {
      type: 'FORT_KILL',
      killCount: extractTotalKills(raw),
      fortKills,
      playerName: extractAttacker(raw),
      targetName: `${allianceTag ? `[${allianceTag}] ` : ''}Fort${targetLevel ? ` Lv.${targetLevel}` : ''}`,
      targetLevel,
      allianceTag,
      result: extractResult(raw),
      confidence: 0.85,
    }
  },
}

// ─── Parser: PvP Kill ─────────────────────────────────────────────────────────
/**
 * Handles reports where the player attacked another player's city.
 * Distinct from barbarian/fort attacks — target has an alliance tag and
 * is a named player.
 *
 * Matching signals: defender has an alliance tag  OR  "player city"  OR
 *   "Capital"  OR  "City" combined with "kills"
 */
const pvpKillParser: ParserDefinition = {
  matches: (raw) => {
    // Must not be a barbarian or fort report
    if (/\bbarbarian\b/i.test(raw)) return false
    if (/\bfort(ress)?\b/i.test(raw)) return false
    return (
      /\bdefender\s*:/i.test(raw) ||
      /\bplayer\s*city\b/i.test(raw) ||
      /\bcapital\s*(city)?\b/i.test(raw) ||
      /\[([A-Z0-9]{1,5})\]/i.test(raw)   // alliance tag on the target
    )
  },

  parse: (raw): ParsedReport => {
    const defenderMatch = raw.match(/defender\s*:?\s*([^\n\r\[(]+)/i)
    const targetName    = defenderMatch ? defenderMatch[1].trim() : undefined

    const tagMatch    = raw.match(/\[([A-Z0-9]{1,5})\]\s*([^\n\r]+)/i)
    const allianceTag = tagMatch ? tagMatch[1].toUpperCase() : undefined

    return {
      type: 'PVP_KILL',
      killCount:  extractTotalKills(raw),
      fortKills:  0,
      playerName: extractAttacker(raw),
      targetName: targetName ?? (allianceTag ? `[${allianceTag}] Player` : 'Player'),
      allianceTag,
      result:     extractResult(raw),
      resources:  (() => { const r = extractResources(raw); return Object.values(r).some(Boolean) ? r : undefined })(),
      confidence: 0.80,
    }
  },
}

// ─── Parser: Defense Report ───────────────────────────────────────────────────
/**
 * Handles incoming attack reports — someone attacked your city.
 * These appear in mail as "Your city was attacked by [TAG] PlayerName".
 */
const defenseReportParser: ParserDefinition = {
  matches: (raw) => (
    /your\s+(city|troops?)\s+(was|were)\s+attacked/i.test(raw) ||
    /\battacked\s+by\b/i.test(raw) ||
    /\bincoming\s+attack\b/i.test(raw) ||
    (/\battacker\s*:/i.test(raw) && /\bdefender\s*:/i.test(raw) && /your/i.test(raw))
  ),

  parse: (raw): ParsedReport => {
    const attackerMatch = raw.match(/attacker\s*:?\s*([^\n\r\[(]+)/i)
    const tagMatch      = raw.match(/\[([A-Z0-9]{1,5})\]\s*([^\n\r]+)/i)
    const allianceTag   = tagMatch ? tagMatch[1].toUpperCase() : undefined

    return {
      type: 'DEFENSE_REPORT',
      killCount:  extractTotalKills(raw),   // your troops killed
      fortKills:  0,
      playerName: attackerMatch ? attackerMatch[1].trim() : (allianceTag ? `[${allianceTag}] Attacker` : undefined),
      allianceTag,
      result:     extractResult(raw),
      confidence: 0.82,
    }
  },
}

// ─── Parser: Scout Report ─────────────────────────────────────────────────────
/**
 * Handles scouting results. These contain troop counts and often resource totals
 * for the scouted city.
 */
const scoutReportParser: ParserDefinition = {
  matches: (raw) => (
    /\bscout(?:ing)?\s+report\b/i.test(raw) ||
    /\bscouted\b/i.test(raw) ||
    (/\btroop(s)?\b/i.test(raw) && /\bscout\b/i.test(raw))
  ),

  parse: (raw): ParsedReport => {
    const targetMatch = raw.match(/(?:scouted|target|city)\s*:?\s*([^\n\r\[(]+)/i)
    const tagMatch    = raw.match(/\[([A-Z0-9]{1,5})\]/i)

    return {
      type: 'SCOUT_REPORT',
      killCount: 0,
      fortKills: 0,
      targetName: targetMatch ? targetMatch[1].trim() : undefined,
      allianceTag: tagMatch ? tagMatch[1].toUpperCase() : undefined,
      resources: (() => { const r = extractResources(raw); return Object.values(r).some(Boolean) ? r : undefined })(),
      confidence: 0.88,
    }
  },
}

// ─── Parser: Gathering Complete ───────────────────────────────────────────────
/**
 * Handles resource-gathering return mails.
 * "Your troops have returned with resources from [location]"
 */
const gatheringCompleteParser: ParserDefinition = {
  matches: (raw) => (
    /\bgathering\b/i.test(raw) ||
    /troops?\s+have\s+returned\s+with/i.test(raw) ||
    /\bresource[s]?\s+gathered\b/i.test(raw)
  ),

  parse: (raw): ParsedReport => {
    const resources = extractResources(raw)
    return {
      type: 'GATHERING_COMPLETE',
      killCount: 0,
      fortKills: 0,
      resources: Object.values(resources).some(Boolean) ? resources : undefined,
      confidence: 0.85,
    }
  },
}

// ─── Parser Registry ──────────────────────────────────────────────────────────
// Add new parsers here.  First match wins.
const PARSERS: ParserDefinition[] = [
  barbarianKillParser,
  fortKillParser,
  pvpKillParser,
  defenseReportParser,
  scoutReportParser,
  gatheringCompleteParser,
]

// ─── Public API ───────────────────────────────────────────────────────────────

/** Parse any raw report text.  Always returns a ParsedReport (never throws). */
export function parseReport(raw: string): ParsedReport {
  try {
    for (const parser of PARSERS) {
      if (parser.matches(raw)) {
        return parser.parse(raw)
      }
    }
  } catch (err) {
    console.error('[report-parser] parse error:', err)
  }

  return {
    type: 'UNKNOWN',
    killCount: 0,
    fortKills: 0,
    confidence: 0,
  }
}

/**
 * Returns true if the text looks like any ROK mail/report at all.
 * Used by the companion app to discard ordinary clipboard/OCR content.
 * Requires at least 2 of the listed signals — keeps false-positive rate low.
 */
export function looksLikeReport(text: string): boolean {
  if (!text || text.length < 20 || text.length > 60_000) return false

  const signals = [
    /battle\s+report/i,
    /\bbarbarian\b/i,
    /\bfort(ress)?\b/i,
    /\battacker\s*:/i,
    /\bdefender\s*:/i,
    /\bkills?\s*:/i,
    /\b(victory|defeat)\b/i,
    /rise\s+of\s+kingdoms/i,
    /lv\.\s*\d+/i,
    /\bscout(?:ing)?\s+report\b/i,
    /troops?\s+have\s+returned/i,
    /\bgathering\b/i,
    /your\s+(city|troops?)\s+(was|were)\s+attacked/i,
    /\battacked\s+by\b/i,
  ]

  return signals.filter(r => r.test(text)).length >= 2
}
