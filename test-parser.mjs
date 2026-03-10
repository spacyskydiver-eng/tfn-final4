/**
 * test-parser.mjs
 * Run with: node test-parser.mjs
 * Tests the report parser with sample barbarian and fort kill reports.
 * No database or server needed.
 */

// ─── Inline the parser (mirrors lib/report-parser.ts) ────────────────────────

function extractNumber(text, pattern) {
  const m = text.match(pattern);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ""), 10) || 0;
}
function extractResult(text) {
  if (/\b(victory|win|success|won)\b/i.test(text)) return "Victory";
  if (/\b(defeat|loss|failed|lost)\b/i.test(text)) return "Defeat";
  return "Unknown";
}
function sumLabelledNumbers(section) {
  let total = 0;
  const pattern = /:\s*([\d,]+)\s*(?:\n|$)/gim;
  let m;
  while ((m = pattern.exec(section)) !== null) total += parseInt(m[1].replace(/,/g, ""), 10) || 0;
  return total;
}
function extractTotalKills(raw) {
  const sec = raw.match(/(?:kills?|enemy\s+deaths?|killed)[:\s\-─]*\n([\s\S]*?)(?:\n\s*\n|\n\s*[─\-\[*]|$)/i);
  if (sec) { const t = sumLabelledNumbers(sec[1]); if (t > 0) return t; }
  const total = extractNumber(raw, /total\s+kills?\s*:?\s*([\d,]+)/i);
  if (total > 0) return total;
  return extractNumber(raw, /(?:enemy\s+)?deaths?\s*:?\s*([\d,]+)/i);
}
function extractResources(raw) {
  return {
    food:  extractNumber(raw, /food\s*:?\s*([\d,]+)/i)  || undefined,
    wood:  extractNumber(raw, /wood\s*:?\s*([\d,]+)/i)  || undefined,
    stone: extractNumber(raw, /stone\s*:?\s*([\d,]+)/i) || undefined,
    gold:  extractNumber(raw, /gold\s*:?\s*([\d,]+)/i)  || undefined,
  };
}
function extractAttacker(raw) {
  for (const p of [/attacker\s*:?\s*([^\n\r\[(]+)/i, /from\s*:?\s*([^\n\r\[(]+)/i, /commander\s*:?\s*([^\n\r\[(]+)/i]) {
    const m = raw.match(p); if (m) return m[1].trim();
  }
}
function looksLikeReport(text) {
  if (!text || text.length < 20 || text.length > 60000) return false;
  const signals = [/battle\s+report/i, /\bbarbarian\b/i, /\bfort(ress)?\b/i, /\battacker\s*:/i,
    /\bdefender\s*:/i, /\bkills?\s*:/i, /\b(victory|defeat)\b/i, /rise\s+of\s+kingdoms/i, /lv\.\s*\d+/i];
  return signals.filter(r => r.test(text)).length >= 2;
}
function parseReport(raw) {
  if (/\bbarbarian\b/i.test(raw)) {
    const lm = raw.match(/barbarian[^)(\n]*\(?\s*lv\.?\s*(\d+)/i);
    const targetLevel = lm ? parseInt(lm[1], 10) : undefined;
    return {
      type: "BARBARIAN_KILL", killCount: extractTotalKills(raw), fortKills: 0,
      playerName: extractAttacker(raw),
      targetName: `Barbarian${targetLevel ? ` Lv.${targetLevel}` : ""}`,
      targetLevel, result: extractResult(raw),
      resources: Object.values(extractResources(raw)).some(Boolean) ? extractResources(raw) : undefined,
      confidence: 0.90,
    };
  }
  if (/\bfort(ress)?\b/i.test(raw)) {
    const tagMatch = raw.match(/\[([A-Z0-9]{1,5})\]\s*fort/i);
    const lm = raw.match(/fort(?:ress)?\s*\(?\s*lv\.?\s*(\d+)/i);
    const targetLevel = lm ? parseInt(lm[1], 10) : undefined;
    const allianceTag = tagMatch ? tagMatch[1].toUpperCase() : undefined;
    return {
      type: "FORT_KILL", killCount: extractTotalKills(raw),
      fortKills: extractNumber(raw, /fort[^s]*\s+(?:destroyed|levelled?)\s*:?\s*([\d,]+)/i) || 1,
      playerName: extractAttacker(raw),
      targetName: `${allianceTag ? `[${allianceTag}] ` : ""}Fort${targetLevel ? ` Lv.${targetLevel}` : ""}`,
      targetLevel, allianceTag, result: extractResult(raw), confidence: 0.85,
    };
  }
  return { type: "UNKNOWN", killCount: 0, fortKills: 0, confidence: 0 };
}

// ─── Sample Reports ───────────────────────────────────────────────────────────

const REPORTS = [
  {
    name: "Barbarian Lv.25 — Victory",
    text: `Battle Report
Rise of Kingdoms
Attacker: PlayerOne
Target: Barbarian (Lv.25)
Result: Victory

Kills:
Infantry T1: 150
Cavalry T2: 30
Archer T3: 20

Food: 12,000
Wood: 8,500`,
  },
  {
    name: "Fort Kill — [TFN] Fort Lv.3",
    text: `Battle Report
Rise of Kingdoms
Attacker: AlexTaylor
[TFN] Fort (Lv.3)
Result: Victory

Total Kills: 2,450
Fort destroyed: 1`,
  },
  {
    name: "Barbarian — kill section parsing",
    text: `Battle Report Barbarian Lv.30
Attacker: TestUser
Defender: Barbarian
Victory

Enemy Deaths:
Infantry T1: 500
Cavalry T2: 200
Archer T1: 100
`,
  },
  {
    name: "Unknown report (should return UNKNOWN type)",
    text: `Hello this is just some random text copied`,
  },
  {
    name: "Barbarian — exact Deaths field",
    text: `Battle Report Rise of Kingdoms barbarian Lv.15
From: MyCommander
Defeat
Enemy Deaths: 75`,
  },
];

// ─── Run ──────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const { name, text } of REPORTS) {
  const looks   = looksLikeReport(text);
  const parsed  = parseReport(text);

  console.log(`\n─── ${name}`);
  console.log(`  looksLikeReport : ${looks}`);
  console.log(`  type            : ${parsed.type}`);
  console.log(`  killCount       : ${parsed.killCount}`);
  console.log(`  fortKills       : ${parsed.fortKills}`);
  if (parsed.targetName) console.log(`  targetName      : ${parsed.targetName}`);
  if (parsed.playerName) console.log(`  playerName      : ${parsed.playerName}`);
  if (parsed.result)     console.log(`  result          : ${parsed.result}`);
  if (parsed.resources)  console.log(`  resources       : ${JSON.stringify(parsed.resources)}`);
  console.log(`  confidence      : ${parsed.confidence}`);

  // Basic assertions
  const ok = name.includes("Unknown")
    ? parsed.type === "UNKNOWN"
    : parsed.type !== "UNKNOWN" && parsed.confidence > 0;

  console.log(`  ✓ test          : ${ok ? "PASS" : "FAIL ← check parser"}`);
  ok ? passed++ : failed++;
}

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);

// ─── Hash dedup demo ──────────────────────────────────────────────────────────

import { createHash } from "crypto";

function normalise(raw) {
  return raw.toLowerCase()
    .replace(/\d{4}[-/]\d{2}[-/]\d{2}[\s_T]\d{2}:\d{2}:\d{2}/g, "")
    .replace(/\s+/g, " ").trim();
}
function hashReport(raw) { return createHash("sha256").update(normalise(raw), "utf8").digest("hex"); }

const base  = REPORTS[0].text;
const extra = REPORTS[0].text + "\n2026-01-15 12:34:56"; // same content + a timestamp
const h1 = hashReport(base);
const h2 = hashReport(extra);
console.log("─── Dedup hash test");
console.log(`  hash(report)            : ${h1.slice(0, 16)}…`);
console.log(`  hash(report+timestamp)  : ${h2.slice(0, 16)}…`);
console.log(`  hashes match (dedup OK) : ${h1 === h2 ? "✓ YES" : "✗ NO — normalisation broken"}\n`);
