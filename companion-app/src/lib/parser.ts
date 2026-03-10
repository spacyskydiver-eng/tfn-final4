/**
 * parser.ts — client-side report parser for the Tauri companion app.
 *
 * This is a direct TypeScript port of lib/report-parser.ts from the website.
 * Both files MUST stay in sync. If you add a new parser on the website, add
 * the same parser here so the companion app sends the correct reportType and counts.
 *
 * Modular design: each report type is an isolated ParserDefinition object.
 * Adding a new type = add one object + push onto PARSERS.
 */

// ─── Public Types ─────────────────────────────────────────────────────────────

export type ReportType =
  | "BARBARIAN_KILL"
  | "FORT_KILL"
  | "PVP_KILL"
  | "DEFENSE_REPORT"
  | "SCOUT_REPORT"
  | "GATHERING_COMPLETE"
  | "UNKNOWN";

export interface ParsedReport {
  type: ReportType;
  killCount: number;
  fortKills: number;
  playerName?: string;
  targetName?: string;
  targetLevel?: number;
  allianceTag?: string;
  result?: "Victory" | "Defeat" | "Unknown";
  resources?: {
    food?: number;
    wood?: number;
    stone?: number;
    gold?: number;
  };
  confidence: number; // 0–1
}

// ─── Internal Contract ────────────────────────────────────────────────────────

interface ParserDefinition {
  matches: (raw: string) => boolean;
  parse:   (raw: string) => ParsedReport;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractNumber(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ""), 10) || 0;
}

function extractResult(text: string): "Victory" | "Defeat" | "Unknown" {
  if (/\b(victory|win|success|won)\b/i.test(text)) return "Victory";
  if (/\b(defeat|loss|failed|lost)\b/i.test(text)) return "Defeat";
  return "Unknown";
}

function sumLabelledNumbers(section: string): number {
  let total = 0;
  const pattern = /:\s*([\d,]+)\s*(?:\n|$)/gim;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(section)) !== null) {
    total += parseInt(m[1].replace(/,/g, ""), 10) || 0;
  }
  return total;
}

function extractTotalKills(raw: string): number {
  const sectionMatch = raw.match(
    /(?:kills?|enemy\s+deaths?|killed)[:\s\-─]*\n([\s\S]*?)(?:\n\s*\n|\n\s*[─\-\[*]|$)/i
  );
  if (sectionMatch) {
    const total = sumLabelledNumbers(sectionMatch[1]);
    if (total > 0) return total;
  }
  const total = extractNumber(raw, /total\s+kills?\s*:?\s*([\d,]+)/i);
  if (total > 0) return total;
  return extractNumber(raw, /(?:enemy\s+)?deaths?\s*:?\s*([\d,]+)/i);
}

function extractResources(raw: string) {
  return {
    food:  extractNumber(raw, /food\s*:?\s*([\d,]+)/i)  || undefined,
    wood:  extractNumber(raw, /wood\s*:?\s*([\d,]+)/i)  || undefined,
    stone: extractNumber(raw, /stone\s*:?\s*([\d,]+)/i) || undefined,
    gold:  extractNumber(raw, /gold\s*:?\s*([\d,]+)/i)  || undefined,
  };
}

function extractAttacker(raw: string): string | undefined {
  const patterns = [
    /attacker\s*:?\s*([^\n\r\[(]+)/i,
    /from\s*:?\s*([^\n\r\[(]+)/i,
    /commander\s*:?\s*([^\n\r\[(]+)/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) return m[1].trim();
  }
  return undefined;
}

// ─── Parser: Barbarian Kill ───────────────────────────────────────────────────

const barbarianKillParser: ParserDefinition = {
  matches: (raw) => /\bbarbarian\b/i.test(raw),
  parse: (raw): ParsedReport => {
    const levelMatch  = raw.match(/barbarian[^)(\n]*\(?\s*lv\.?\s*(\d+)/i);
    const targetLevel = levelMatch ? parseInt(levelMatch[1], 10) : undefined;
    const killCount   = extractTotalKills(raw);
    const resources   = extractResources(raw);
    return {
      type: "BARBARIAN_KILL",
      killCount,
      fortKills: 0,
      playerName: extractAttacker(raw),
      targetName: `Barbarian${targetLevel ? ` Lv.${targetLevel}` : ""}`,
      targetLevel,
      result: extractResult(raw),
      resources: Object.values(resources).some(Boolean) ? resources : undefined,
      confidence: 0.90,
    };
  },
};

// ─── Parser: Fort Kill ────────────────────────────────────────────────────────

const fortKillParser: ParserDefinition = {
  matches: (raw) => /\bfort(ress)?\b/i.test(raw),
  parse: (raw): ParsedReport => {
    const tagMatch    = raw.match(/\[([A-Z0-9]{1,5})\]\s*fort/i);
    const allianceTag = tagMatch ? tagMatch[1].toUpperCase() : undefined;
    const levelMatch  = raw.match(/fort(?:ress)?\s*\(?\s*lv\.?\s*(\d+)/i);
    const targetLevel = levelMatch ? parseInt(levelMatch[1], 10) : undefined;
    const explicitForts = extractNumber(raw, /fort[^s]*\s+(?:destroyed|levelled?)\s*:?\s*([\d,]+)/i);
    return {
      type: "FORT_KILL",
      killCount: extractTotalKills(raw),
      fortKills: explicitForts || 1,
      playerName: extractAttacker(raw),
      targetName: `${allianceTag ? `[${allianceTag}] ` : ""}Fort${targetLevel ? ` Lv.${targetLevel}` : ""}`,
      targetLevel,
      allianceTag,
      result: extractResult(raw),
      confidence: 0.85,
    };
  },
};

// ─── Parser: PvP Kill ─────────────────────────────────────────────────────────

const pvpKillParser: ParserDefinition = {
  matches: (raw) => {
    if (/\bbarbarian\b/i.test(raw)) return false;
    if (/\bfort(ress)?\b/i.test(raw)) return false;
    return (
      /\bdefender\s*:/i.test(raw) ||
      /\bplayer\s*city\b/i.test(raw) ||
      /\bcapital\s*(city)?\b/i.test(raw) ||
      /\[([A-Z0-9]{1,5})\]/i.test(raw)
    );
  },
  parse: (raw): ParsedReport => {
    const defenderMatch = raw.match(/defender\s*:?\s*([^\n\r\[(]+)/i);
    const tagMatch      = raw.match(/\[([A-Z0-9]{1,5})\]\s*([^\n\r]+)/i);
    const allianceTag   = tagMatch ? tagMatch[1].toUpperCase() : undefined;
    return {
      type: "PVP_KILL",
      killCount:  extractTotalKills(raw),
      fortKills:  0,
      playerName: extractAttacker(raw),
      targetName: defenderMatch
        ? defenderMatch[1].trim()
        : allianceTag ? `[${allianceTag}] Player` : "Player",
      allianceTag,
      result: extractResult(raw),
      resources: (() => { const r = extractResources(raw); return Object.values(r).some(Boolean) ? r : undefined; })(),
      confidence: 0.80,
    };
  },
};

// ─── Parser: Defense Report ───────────────────────────────────────────────────

const defenseReportParser: ParserDefinition = {
  matches: (raw) => (
    /your\s+(city|troops?)\s+(was|were)\s+attacked/i.test(raw) ||
    /\battacked\s+by\b/i.test(raw) ||
    /\bincoming\s+attack\b/i.test(raw) ||
    (/\battacker\s*:/i.test(raw) && /\bdefender\s*:/i.test(raw) && /your/i.test(raw))
  ),
  parse: (raw): ParsedReport => {
    const attackerMatch = raw.match(/attacker\s*:?\s*([^\n\r\[(]+)/i);
    const tagMatch      = raw.match(/\[([A-Z0-9]{1,5})\]/i);
    const allianceTag   = tagMatch ? tagMatch[1].toUpperCase() : undefined;
    return {
      type: "DEFENSE_REPORT",
      killCount:  extractTotalKills(raw),
      fortKills:  0,
      playerName: attackerMatch
        ? attackerMatch[1].trim()
        : allianceTag ? `[${allianceTag}] Attacker` : undefined,
      allianceTag,
      result: extractResult(raw),
      confidence: 0.82,
    };
  },
};

// ─── Parser: Scout Report ─────────────────────────────────────────────────────

const scoutReportParser: ParserDefinition = {
  matches: (raw) => (
    /\bscout(?:ing)?\s+report\b/i.test(raw) ||
    /\bscouted\b/i.test(raw) ||
    (/\btroop(s)?\b/i.test(raw) && /\bscout\b/i.test(raw))
  ),
  parse: (raw): ParsedReport => {
    const targetMatch = raw.match(/(?:scouted|target|city)\s*:?\s*([^\n\r\[(]+)/i);
    const tagMatch    = raw.match(/\[([A-Z0-9]{1,5})\]/i);
    return {
      type: "SCOUT_REPORT",
      killCount: 0,
      fortKills: 0,
      targetName:   targetMatch ? targetMatch[1].trim() : undefined,
      allianceTag:  tagMatch ? tagMatch[1].toUpperCase() : undefined,
      resources: (() => { const r = extractResources(raw); return Object.values(r).some(Boolean) ? r : undefined; })(),
      confidence: 0.88,
    };
  },
};

// ─── Parser: Gathering Complete ───────────────────────────────────────────────

const gatheringCompleteParser: ParserDefinition = {
  matches: (raw) => (
    /\bgathering\b/i.test(raw) ||
    /troops?\s+have\s+returned\s+with/i.test(raw) ||
    /\bresource[s]?\s+gathered\b/i.test(raw)
  ),
  parse: (raw): ParsedReport => {
    const resources = extractResources(raw);
    return {
      type: "GATHERING_COMPLETE",
      killCount: 0,
      fortKills: 0,
      resources: Object.values(resources).some(Boolean) ? resources : undefined,
      confidence: 0.85,
    };
  },
};

// ─── Parser Registry ──────────────────────────────────────────────────────────
// Add new parsers here — they are tried in order, first match wins.

const PARSERS: ParserDefinition[] = [
  barbarianKillParser,
  fortKillParser,
  pvpKillParser,
  defenseReportParser,
  scoutReportParser,
  gatheringCompleteParser,
];

// ─── Public API ───────────────────────────────────────────────────────────────

/** Parse a raw report string. Never throws — always returns a valid ParsedReport. */
export function parseReport(raw: string): ParsedReport {
  try {
    for (const parser of PARSERS) {
      if (parser.matches(raw)) {
        return parser.parse(raw);
      }
    }
  } catch (err) {
    console.error("[parser] error:", err);
  }
  return { type: "UNKNOWN", killCount: 0, fortKills: 0, confidence: 0 };
}

/**
 * Quick pre-filter: returns true only if the text has enough signals to be
 * worth parsing. Must be cheap — called on every screen-capture tick or
 * clipboard change.
 */
export function looksLikeReport(text: string): boolean {
  if (!text || text.length < 20 || text.length > 60_000) return false;

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
  ];

  return signals.filter((r) => r.test(text)).length >= 2;
}
