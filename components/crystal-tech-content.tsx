'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Image from 'next/image'
import { RotateCcw, Info } from 'lucide-react'
import techTreeData from '@/lib/data/crystal-tech-tree.json'

/* ------------------------------------------------------------------ */
/*  Layout constants (mirrors codexhelper techLayout.ts exactly)       */
/* ------------------------------------------------------------------ */

const NODE_W      = 230
const NODE_H      = 80
const H_GAP       = 70
const LINE_SP     = 140
const PAD_LEFT    = 40
const PAD_TOP     = 110
const PAD_BOTTOM  = 110

// Column pattern: tile count per column
const COL_PATTERN = [4, 4, 1, 3, 3, 2, 4, 4, 4, 1, 3, 2, 4, 4, 1, 2, 4, 1] as const

function rowsForCount(n: number): number[] {
  if (n === 4) return [0, 1, 2, 3]
  if (n === 3) return [0.5, 1.5, 2.5]
  if (n === 2) return [0.5, 2.5]
  return [1.5]
}

// Tech key → slot assignments (mirrors techLayout.ts)
const ASSIGNMENTS: Record<string, string> = {
  col0_slot0: 'quenchedBladesI',       col0_slot1: 'improvedBowsI',
  col0_slot2: 'mountedCombatTechniquesI', col0_slot3: 'improvedProjectilesI',
  col1_slot0: 'swiftMarchingI',        col1_slot1: 'fleetOfFootI',
  col1_slot2: 'swiftSteedsI',          col1_slot3: 'reinforcedAxlesI',
  col2_slot0: 'callToArmsI',
  col3_slot0: 'cuttingCornersI',       col3_slot1: 'culturalExchange',     col3_slot2: 'leadershipI',
  col4_slot0: 'barbarianBounties',     col4_slot1: 'callToArmsII',         col4_slot2: 'karakuReports',
  col5_slot0: 'cuttingCornersII',      col5_slot1: 'leadershipII',
  col6_slot0: 'quenchedBladesII',      col6_slot1: 'improvedBowsII',
  col6_slot2: 'mountedCombatTechniquesII', col6_slot3: 'improvedProjectilesII',
  col7_slot0: 'starmetalShields',      col7_slot1: 'starmetalBracers',
  col7_slot2: 'starmetalBarding',      col7_slot3: 'starmetalAxles',
  col8_slot0: 'swiftMarchingII',       col8_slot1: 'fleetOfFootII',
  col8_slot2: 'swiftSteedsII',         col8_slot3: 'reinforcedAxlesII',
  col9_slot0: 'largerCamps',
  col10_slot0: 'runecraft',            col10_slot1: 'specialConcoctionsI',  col10_slot2: 'expandedFormationsI',
  col11_slot0: 'emergencySupport',     col11_slot1: 'rapidRetreat',
  col12_slot0: 'ironInfantry',         col12_slot1: 'archersFocus',
  col12_slot2: 'ridersResilience',     col12_slot3: 'siegeProvisions',
  col13_slot0: 'swiftMarchingIII',     col13_slot1: 'fleetOfFootIII',
  col13_slot2: 'swiftSteedsIII',       col13_slot3: 'reinforcedAxlesIII',
  col14_slot0: 'specialConcoctionsII',
  col15_slot0: 'celestialGuidance',    col15_slot1: 'expandedFormationsII',
  col16_slot0: 'infantryExpert',       col16_slot1: 'archerExpert',
  col16_slot2: 'cavalryExpert',        col16_slot3: 'siegeExpert',
  col17_slot0: 'surpriseStrike',
}

// Build pixel coordinates for each slot (top-left corner of node)
const SLOT_POS: Record<string, { x: number; y: number }> = {}
COL_PATTERN.forEach((count, col) => {
  rowsForCount(count).forEach((row, si) => {
    SLOT_POS[`col${col}_slot${si}`] = {
      x: PAD_LEFT + col * (NODE_W + H_GAP),
      y: PAD_TOP  + row * LINE_SP,
    }
  })
})

// Reverse map: techKey → slot name
const TECH_SLOT: Record<string, string> = Object.fromEntries(
  Object.entries(ASSIGNMENTS).map(([slot, key]) => [key, slot])
)

// Build tech-key → pixel center position
const TECH_POS: Record<string, { cx: number; cy: number }> = {}
for (const [slot, key] of Object.entries(ASSIGNMENTS)) {
  const p = SLOT_POS[slot]
  if (p) TECH_POS[key] = { cx: p.x + NODE_W / 2, cy: p.y + NODE_H / 2 }
}

// Direct connections (slot → slot)
const DIRECT_CONNECTIONS: [string, string][] = [
  ['col0_slot0','col1_slot0'], ['col0_slot1','col1_slot1'],
  ['col0_slot2','col1_slot2'], ['col0_slot3','col1_slot3'],
  ['col1_slot0','col2_slot0'], ['col1_slot1','col2_slot0'],
  ['col1_slot2','col2_slot0'], ['col1_slot3','col2_slot0'],
  ['col2_slot0','col3_slot0'], ['col2_slot0','col3_slot1'], ['col2_slot0','col3_slot2'],
  ['col3_slot1','col4_slot0'], ['col3_slot1','col4_slot1'], ['col3_slot1','col4_slot2'],
  ['col4_slot1','col5_slot0'], ['col4_slot1','col5_slot1'],
  ['col6_slot0','col7_slot0'], ['col6_slot1','col7_slot1'],
  ['col6_slot2','col7_slot2'], ['col6_slot3','col7_slot3'],
  ['col7_slot0','col8_slot0'], ['col7_slot1','col8_slot1'],
  ['col7_slot2','col8_slot2'], ['col7_slot3','col8_slot3'],
  ['col8_slot0','col9_slot0'], ['col8_slot1','col9_slot0'],
  ['col8_slot2','col9_slot0'], ['col8_slot3','col9_slot0'],
  ['col9_slot0','col10_slot0'], ['col9_slot0','col10_slot1'], ['col9_slot0','col10_slot2'],
  ['col10_slot1','col11_slot0'], ['col10_slot1','col11_slot1'],
  ['col12_slot0','col13_slot0'], ['col12_slot1','col13_slot1'],
  ['col12_slot2','col13_slot2'], ['col12_slot3','col13_slot3'],
  ['col13_slot0','col14_slot0'], ['col13_slot1','col14_slot0'],
  ['col13_slot2','col14_slot0'], ['col13_slot3','col14_slot0'],
  ['col14_slot0','col15_slot0'], ['col14_slot0','col15_slot1'],
  ['col16_slot0','col17_slot0'], ['col16_slot1','col17_slot0'],
  ['col16_slot2','col17_slot0'], ['col16_slot3','col17_slot0'],
]

// Pass-through connections: middle of fromCol fans out to all of toCol
const PASS_THROUGHS: { fromSlot: string; toSlots: string[] }[] = [
  { fromSlot: 'col4_slot1',  toSlots: ['col6_slot0','col6_slot1','col6_slot2','col6_slot3'] },
  { fromSlot: 'col10_slot1', toSlots: ['col12_slot0','col12_slot1','col12_slot2','col12_slot3'] },
  { fromSlot: 'col14_slot0', toSlots: ['col16_slot0','col16_slot1','col16_slot2','col16_slot3'] },
]

const CANVAS_W = PAD_LEFT + COL_PATTERN.length * (NODE_W + H_GAP) + 50
const CANVAS_H = PAD_TOP + 3 * LINE_SP + NODE_H + PAD_BOTTOM

/* ------------------------------------------------------------------ */
/*  Data types                                                          */
/* ------------------------------------------------------------------ */

interface TechLevelDef { level: number; buff: string; time: string; crystals: number; seasonCoins: number }
interface TechReq { level: number; tech?: string; anyOf?: string[]; allOf?: string[]; techLevel: number }
interface TechDef {
  name: string; description: string; buffType: string
  category: 'infantry' | 'archer' | 'cavalry' | 'siege' | 'utility'
  maxLevel: number; levels: TechLevelDef[]; requirements: TechReq[]
}
type TechMap = Record<string, TechDef>
type Levels  = Record<string, number>

const TECH_MAP = techTreeData.technologies as TechMap

/* ------------------------------------------------------------------ */
/*  Icon map: tech name → public image path                            */
/* ------------------------------------------------------------------ */

const ICON_OVERRIDES: Record<string, string> = {
  expandedFormationsI:  'Expanded Formation I',
  expandedFormationsII: 'Expanded Formation II',
}

function techIcon(key: string): string {
  const tech = TECH_MAP[key]
  if (!tech) return ''
  const filename = ICON_OVERRIDES[key] ?? tech.name
  return `/images/crystal/tech_icons/${encodeURIComponent(filename)}.webp`
}

/* ------------------------------------------------------------------ */
/*  Calculation helpers                                                 */
/* ------------------------------------------------------------------ */

function parseTimeStr(s: string): number {
  let t = 0
  const d = s.match(/(\d+)d/); if (d) t += +d[1] * 86400
  const h = s.match(/(\d+)h/); if (h) t += +h[1] * 3600
  const m = s.match(/(\d+)m/); if (m) t += +m[1] * 60
  const sc = s.match(/(\d+)s/); if (sc) t += +sc[1]
  return t
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0 Days'
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const parts: string[] = []
  if (d) parts.push(`${d}d`); if (h) parts.push(`${h}h`); if (m) parts.push(`${m}m`)
  return parts.length ? parts.join(' ') : '<1m'
}

function fmtNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k'
  return n.toLocaleString()
}

function rcReduction(level: number): number {
  if (level <= 0) return 0
  if (level <= 10) return level * 0.1
  if (level <= 20) return 1.0 + (level - 10) * 0.2
  return [3.3, 3.6, 4.0, 4.5, 5.0][Math.min(level - 21, 4)]
}

function applyHelps(secs: number, helps: number): number {
  if (secs <= 0) return 0
  let t = Math.max(3, Math.ceil(secs))
  for (let i = 0; i < Math.min(helps, 30); i++) {
    if (t <= 0) break
    t = Math.max(0, t - Math.max(180, t * 0.01))
  }
  return Math.floor(t)
}

function canUnlock(key: string, nextLevel: number, levels: Levels): boolean {
  const tech = TECH_MAP[key]
  if (!tech || nextLevel < 1 || nextLevel > tech.maxLevel) return false
  for (const req of tech.requirements) {
    if (req.level > nextLevel) continue
    if (req.tech && (levels[req.tech] ?? 0) < req.techLevel) return false
    if (req.anyOf && !req.anyOf.some(k => (levels[k] ?? 0) >= req.techLevel)) return false
    if (req.allOf && !req.allOf.every(k => (levels[k] ?? 0) >= req.techLevel)) return false
  }
  return true
}

function maxReachable(key: string, levels: Levels): number {
  const tech = TECH_MAP[key]
  if (!tech) return 0
  let lv = levels[key] ?? 0
  while (lv < tech.maxLevel && canUnlock(key, lv + 1, levels)) lv++
  return lv
}

/* ------------------------------------------------------------------ */
/*  SVG connection path helper                                          */
/* ------------------------------------------------------------------ */

function makePath(fromSlot: string, toSlot: string): string {
  const a = SLOT_POS[fromSlot], b = SLOT_POS[toSlot]
  if (!a || !b) return ''
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2
  const x2 = b.x,          y2 = b.y + NODE_H / 2
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
}

function makePassPath(fromSlot: string, toSlot: string): string {
  // Route through center of intervening column gap
  const a = SLOT_POS[fromSlot], b = SLOT_POS[toSlot]
  if (!a || !b) return ''
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2
  const x2 = b.x,          y2 = b.y + NODE_H / 2
  // midpoint at 1/3 and 2/3 for S-curve through gap
  const mx1 = x1 + (x2 - x1) * 0.35
  const mx2 = x1 + (x2 - x1) * 0.65
  return `M ${x1} ${y1} C ${mx1} ${y1} ${mx2} ${y2} ${x2} ${y2}`
}

/* ------------------------------------------------------------------ */
/*  Tech Node component                                                 */
/* ------------------------------------------------------------------ */

function TechNode({
  techKey, levels, mode, onClick, onInfo,
}: {
  techKey: string
  levels: Levels
  mode: 'single' | 'max' | 'remove'
  onClick: (k: string) => void
  onInfo: (k: string) => void
}) {
  const tech   = TECH_MAP[techKey]
  const pos    = SLOT_POS[TECH_SLOT[techKey]]
  if (!tech || !pos) return null

  const current = levels[techKey] ?? 0
  const maxed   = current === tech.maxLevel
  const canUp   = !maxed && canUnlock(techKey, current + 1, levels)
  const locked  = current === 0 && !canUp
  const pct     = (current / tech.maxLevel) * 100

  const CAT_ACCENT: Record<string, string> = {
    infantry: '#E63946', archer: '#2A9D8F', cavalry: '#E9C46A',
    siege: '#9B59B6', utility: '#3498DB',
  }
  const accent = CAT_ACCENT[tech.category] ?? '#3498DB'

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top:  pos.y,
        width: NODE_W,
        height: NODE_H,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.4 : 1,
        transition: 'opacity 0.2s, transform 0.15s',
      }}
      className="group"
      onClick={() => !locked && onClick(techKey)}
    >
      {/* Node card */}
      <div
        style={{
          width: '100%', height: '100%',
          background: maxed
            ? 'linear-gradient(135deg, #0e3a4a 0%, #0b2d3a 100%)'
            : 'linear-gradient(135deg, #1a3a5c 0%, #0f2744 100%)',
          border: `1.5px solid ${maxed ? '#00e5ff' : 'rgba(100,200,255,0.25)'}`,
          borderRadius: 10,
          boxShadow: maxed
            ? '0 0 14px rgba(0,229,255,0.3), inset 0 1px 0 rgba(255,255,255,0.07)'
            : 'inset 0 1px 0 rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Icon area */}
        <div style={{
          width: 64, height: '100%', flexShrink: 0,
          background: 'rgba(0,0,0,0.25)',
          borderRight: '1px solid rgba(100,200,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src={techIcon(techKey)}
            alt={tech.name}
            width={48} height={48}
            style={{ objectFit: 'contain', imageRendering: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
          />
        </div>

        {/* Text + bar */}
        <div style={{ flex: 1, padding: '6px 8px 6px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div>
            <p style={{
              color: '#e2f0ff', fontSize: 11.5, fontWeight: 600, lineHeight: 1.25,
              marginBottom: 2, maxWidth: 148,
            }}>
              {tech.name}
            </p>
            {current > 0 && (
              <p style={{ color: accent, fontSize: 10, opacity: 0.9 }}>
                {tech.levels[current - 1]?.buff} {tech.buffType}
              </p>
            )}
          </div>

          {/* Level bar */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 5, overflow: 'hidden', marginBottom: 3,
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 3,
                background: maxed ? '#00e5ff' : accent,
                transition: 'width 0.2s',
              }} />
            </div>
            <p style={{ color: maxed ? '#00e5ff' : 'rgba(200,220,255,0.5)', fontSize: 10, textAlign: 'right' }}>
              {current}/{tech.maxLevel}
            </p>
          </div>
        </div>

        {/* Category accent strip */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: accent, borderRadius: '10px 0 0 10px',
        }} />

        {/* Info button */}
        <button
          style={{
            position: 'absolute', top: 4, right: 4,
            background: 'rgba(0,180,255,0.2)', border: '1px solid rgba(0,180,255,0.3)',
            borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#7dd3fc',
          }}
          onClick={e => { e.stopPropagation(); onInfo(techKey) }}
        >
          <Info style={{ width: 10, height: 10 }} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Info tooltip                                                        */
/* ------------------------------------------------------------------ */

function TechInfoPanel({ techKey, onClose }: { techKey: string; onClose: () => void }) {
  const tech = TECH_MAP[techKey]
  if (!tech) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 max-w-sm w-full rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <img src={techIcon(techKey)} alt={tech.name} width={40} height={40} className="object-contain" />
          <div>
            <p className="font-bold text-foreground">{tech.name}</p>
            <p className="text-xs text-muted-foreground">{tech.buffType}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{tech.description}</p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tech.levels.map(l => (
            <div key={l.level} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Lvl {l.level}</span>
              <span className="text-foreground font-medium">{l.buff}</span>
              <span className="text-muted-foreground">{fmtNum(l.crystals)} crystals</span>
              <span className="text-muted-foreground">{l.time}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-secondary text-sm py-1.5 text-muted-foreground hover:bg-secondary/80">
          Close
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function CrystalTechContent() {
  const [levels, setLevels]       = useState<Levels>({})
  const [rcLevel, setRcLevel]     = useState(25)
  const [speedPct, setSpeedPct]   = useState(0)
  const [helps, setHelps]         = useState(30)
  const [mode, setMode]           = useState<'single' | 'max' | 'remove'>('single')
  const [infoKey, setInfoKey]     = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((key: string) => {
    setLevels(prev => {
      const cur = prev[key] ?? 0
      const tech = TECH_MAP[key]
      if (!tech) return prev
      if (mode === 'remove') return cur > 0 ? { ...prev, [key]: cur - 1 } : prev
      if (mode === 'max') {
        const target = maxReachable(key, prev)
        return target > cur ? { ...prev, [key]: target } : prev
      }
      // single
      return canUnlock(key, cur + 1, prev) ? { ...prev, [key]: cur + 1 } : prev
    })
  }, [mode])

  const totals = useMemo(() => {
    const rcRed = rcReduction(rcLevel) / 100
    const cc1   = Math.min(levels['cuttingCornersI']  ?? 0, 5)
    const cc2   = Math.min(levels['cuttingCornersII'] ?? 0, 10)
    const costRed = Math.min(rcRed + cc1 / 100 + cc2 / 100, 0.5)
    let crystals = 0, rawCrystals = 0, coins = 0, secs = 0
    for (const [key, lv] of Object.entries(levels)) {
      if (!lv || lv <= 0) continue
      const tech = TECH_MAP[key]; if (!tech) continue
      for (let i = 0; i < lv; i++) {
        const ld = tech.levels[i]; if (!ld) continue
        rawCrystals += ld.crystals
        crystals    += Math.floor(ld.crystals * (1 - costRed))
        coins       += ld.seasonCoins
        const base   = parseTimeStr(ld.time)
        const speed  = speedPct > 0 ? base / (1 + speedPct / 100) : base
        secs        += applyHelps(speed, helps)
      }
    }
    return { crystals, rawCrystals, savings: rawCrystals - crystals, coins, secs, costRedPct: (costRed * 100).toFixed(1) }
  }, [levels, rcLevel, speedPct, helps])

  // Build SVG paths
  const svgPaths = useMemo(() => {
    const paths: { d: string; isPass: boolean }[] = []
    for (const [a, b] of DIRECT_CONNECTIONS) {
      const d = makePath(a, b)
      if (d) paths.push({ d, isPass: false })
    }
    for (const pt of PASS_THROUGHS) {
      for (const toSlot of pt.toSlots) {
        const d = makePassPath(pt.fromSlot, toSlot)
        if (d) paths.push({ d, isPass: true })
      }
    }
    return paths
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* Settings bar */}
      <div
        style={{ background: 'linear-gradient(to right, #0f2030, #0a1929)', border: '1px solid rgba(100,200,255,0.15)' }}
        className="rounded-xl p-4 flex flex-wrap gap-4 items-end"
      >
        {/* RC Level */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.7)' }}>
            Research Centre Level
          </label>
          <select
            value={rcLevel}
            onChange={e => setRcLevel(+e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Level {n} ({rcReduction(n).toFixed(1)}% off)</option>
            ))}
          </select>
        </div>

        {/* Mode */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.7)' }}>
            Mode
          </label>
          <div className="flex rounded-lg overflow-hidden border border-border text-xs">
            {(['single', 'max', 'remove'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 capitalize border-l border-border first:border-0 transition-colors font-medium ${mode === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
                {m === 'single' ? '+ Single' : m === 'max' ? '⤒ Max' : '− Remove'}
              </button>
            ))}
          </div>
        </div>

        {/* Speed + Helps */}
        <div className="flex gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.7)' }}>
              Research Speed %
            </label>
            <input type="number" min={0} max={500} value={speedPct}
              onChange={e => setSpeedPct(Math.max(0, +e.target.value || 0))}
              className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.7)' }}>
              Helps / Research
            </label>
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} max={30} value={helps}
                onChange={e => setHelps(Math.max(0, Math.min(30, +e.target.value || 0)))}
                className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <span className="text-xs text-muted-foreground">/ 30</span>
            </div>
          </div>
        </div>

        {/* Clear */}
        <div className="ml-auto flex items-end">
          {confirmClear ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Reset all techs?</span>
              <button onClick={() => { setLevels({}); setConfirmClear(false) }}
                className="rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 px-3 py-1.5 font-semibold transition-colors">
                Yes
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground hover:bg-secondary">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Canvas hint */}
      <p className="text-xs text-muted-foreground text-center">← Drag to scroll →  ·  Click a tech to level it up  ·  Faded = prereqs not met</p>

      {/* Tree canvas */}
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', overflowY: 'hidden', cursor: 'grab', borderRadius: 12,
          border: '1px solid rgba(100,200,255,0.15)' }}
        onMouseDown={e => {
          const el = scrollRef.current; if (!el) return
          let startX = e.pageX - el.offsetLeft, scrollLeft = el.scrollLeft
          const onMove = (ev: MouseEvent) => { el.scrollLeft = scrollLeft - (ev.pageX - el.offsetLeft - startX) }
          const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        }}
      >
        <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H,
          background: 'linear-gradient(180deg, #0d1e32 0%, #0a1624 50%, #0d1e32 100%)' }}>

          {/* Grid pattern overlay */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connection lines */}
            {svgPaths.map((p, i) => (
              <path key={i} d={p.d} fill="none"
                stroke={p.isPass ? 'rgba(0,200,255,0.35)' : 'rgba(100,180,255,0.45)'}
                strokeWidth={p.isPass ? 1.5 : 2}
                strokeDasharray={p.isPass ? '6 3' : undefined}
              />
            ))}
          </svg>

          {/* Tech nodes */}
          {Object.keys(ASSIGNMENTS).map(slot => {
            const key = ASSIGNMENTS[slot]
            return key ? (
              <TechNode key={key} techKey={key} levels={levels} mode={mode}
                onClick={handleClick} onInfo={setInfoKey} />
            ) : null
          })}
        </div>
      </div>

      {/* Footer totals */}
      <div
        style={{ background: 'linear-gradient(to right, #0a1929, #0f2030)', border: '1px solid rgba(100,200,255,0.15)' }}
        className="rounded-xl"
      >
        <div className="grid grid-cols-3 divide-x divide-border/30">
          {/* Speedups */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src="/images/crystal/research_speedup.webp" alt="Speedup" width={20} height={20} className="object-contain" onError={e => (e.target as HTMLImageElement).style.opacity='0'} />
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.6)' }}>
                Total Speedups Spent
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#7dd3fc' }}>{fmtTime(totals.secs)}</p>
            {(speedPct > 0 || helps > 0) && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{speedPct > 0 ? `${speedPct}% speed` : ''}{speedPct > 0 && helps > 0 ? ' · ' : ''}{helps > 0 ? `${helps} helps` : ''}</p>
            )}
          </div>

          {/* Season Coins */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src="/images/crystal/season_coin.webp" alt="Coins" width={20} height={20} className="object-contain" onError={e => (e.target as HTMLImageElement).style.opacity='0'} />
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.6)' }}>
                Total Season Coins
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{fmtNum(totals.coins)}</p>
          </div>

          {/* Crystals */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src="/images/crystal/crystal.webp" alt="Crystal" width={20} height={20} className="object-contain" onError={e => (e.target as HTMLImageElement).style.opacity='0'} />
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(100,200,255,0.6)' }}>
                Total Crystals Used
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#00e5ff' }}>{fmtNum(totals.crystals)}</p>
            {totals.savings > 0 && (
              <p className="text-[10px] text-emerald-400 mt-0.5">−{fmtNum(totals.savings)} saved ({totals.costRedPct}% off)</p>
            )}
          </div>
        </div>

        {/* Expanded time breakdown */}
        <div className="border-t border-border/30 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-center">
          <div>
            <p className="text-muted-foreground mb-0.5">Cost Reduction</p>
            <p className="font-semibold text-foreground">{totals.costRedPct}%</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">RC Discount</p>
            <p className="font-semibold text-foreground">{rcReduction(rcLevel).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">CC Discount</p>
            <p className="font-semibold text-foreground">
              {((Math.min(levels['cuttingCornersI'] ?? 0, 5)) + (Math.min(levels['cuttingCornersII'] ?? 0, 10)))}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Raw Crystal Cost</p>
            <p className="font-semibold text-muted-foreground/60">{fmtNum(totals.rawCrystals)}</p>
          </div>
        </div>
      </div>

      {/* Info modal */}
      {infoKey && <TechInfoPanel techKey={infoKey} onClose={() => setInfoKey(null)} />}
    </div>
  )
}
