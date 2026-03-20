'use client'

import { useState, useMemo, useCallback } from 'react'
import { Lock, RotateCcw, ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react'
import techTreeData from '@/lib/data/crystal-tech-tree.json'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type TechKey = string

interface TechLevelDef {
  level: number
  buff: string
  time: string
  crystals: number
  seasonCoins: number
}

interface TechReq {
  level: number
  tech?: string
  anyOf?: string[]
  allOf?: string[]
  techLevel: number
}

interface TechDef {
  name: string
  description: string
  buffType: string
  category: 'infantry' | 'archer' | 'cavalry' | 'siege' | 'utility'
  maxLevel: number
  levels: TechLevelDef[]
  requirements: TechReq[]
}

type TechMap = Record<TechKey, TechDef>
type Levels = Record<TechKey, number>

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const TECH_MAP = techTreeData.technologies as TechMap

// Visual column layout mirrors the actual tree
const TREE_COLUMNS: { label: string; keys: TechKey[] }[] = [
  {
    label: 'Tier I',
    keys: ['quenchedBladesI', 'improvedBowsI', 'mountedCombatTechniquesI', 'improvedProjectilesI', 'cuttingCornersI', 'leadershipI'],
  },
  {
    label: 'Tier I March',
    keys: ['swiftMarchingI', 'fleetOfFootI', 'swiftSteedsI', 'reinforcedAxlesI'],
  },
  {
    label: 'Core',
    keys: ['callToArmsI', 'culturalExchange', 'cuttingCornersII', 'callToArmsII'],
  },
  {
    label: 'CE Branches',
    keys: ['barbarianBounties', 'karakuReports', 'leadershipII'],
  },
  {
    label: 'Tier II',
    keys: ['quenchedBladesII', 'improvedBowsII', 'mountedCombatTechniquesII', 'improvedProjectilesII'],
  },
  {
    label: 'Starmetal',
    keys: ['starmetalShields', 'starmetalBracers', 'starmetalBarding', 'starmetalAxles'],
  },
  {
    label: 'Tier II March',
    keys: ['swiftMarchingII', 'fleetOfFootII', 'swiftSteedsII', 'reinforcedAxlesII'],
  },
  {
    label: 'Camps & Utils',
    keys: ['largerCamps', 'runecraft', 'specialConcoctionsI', 'expandedFormationsI', 'emergencySupport', 'rapidRetreat'],
  },
  {
    label: 'Elite Combat',
    keys: ['ironInfantry', 'archersFocus', 'ridersResilience', 'siegeProvisions'],
  },
  {
    label: 'Tier III March',
    keys: ['swiftMarchingIII', 'fleetOfFootIII', 'swiftSteedsIII', 'reinforcedAxlesIII'],
  },
  {
    label: 'Advanced',
    keys: ['specialConcoctionsII', 'celestialGuidance', 'expandedFormationsII'],
  },
  {
    label: 'Expert',
    keys: ['infantryExpert', 'archerExpert', 'cavalryExpert', 'siegeExpert', 'surpriseStrike'],
  },
]

/* ------------------------------------------------------------------ */
/*  Calculation helpers                                                 */
/* ------------------------------------------------------------------ */

function parseTimeStr(s: string): number {
  let total = 0
  const d = s.match(/(\d+)d/); if (d) total += parseInt(d[1]) * 86400
  const h = s.match(/(\d+)h/); if (h) total += parseInt(h[1]) * 3600
  const m = s.match(/(\d+)m/); if (m) total += parseInt(m[1]) * 60
  const sec = s.match(/(\d+)s/); if (sec) total += parseInt(sec[1])
  return total
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0s'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push(`${Math.floor(secs % 60)}s`)
  return parts.join(' ')
}

function fmtNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return n.toLocaleString()
}

function rcReduction(level: number): number {
  if (level <= 0) return 0
  if (level <= 10) return level * 0.1
  if (level <= 20) return 1.0 + (level - 10) * 0.2
  const extras = [3.3, 3.6, 4.0, 4.5, 5.0]
  return extras[Math.min(level - 21, 4)]
}

function applyHelps(secs: number, helpsPerResearch: number): number {
  if (secs <= 0) return 0
  let temp = Math.max(3, Math.ceil(secs))
  for (let i = 0; i < Math.min(helpsPerResearch, 30); i++) {
    if (temp <= 0) break
    temp = Math.max(0, temp - Math.max(180, temp * 0.01))
  }
  return Math.floor(temp)
}

// Check whether 'nextLevel' of a tech can be unlocked given current state
function canUnlock(key: TechKey, nextLevel: number, levels: Levels): boolean {
  const tech = TECH_MAP[key]
  if (!tech || nextLevel < 1 || nextLevel > tech.maxLevel) return false
  // Check all requirements that kick in at or below nextLevel
  for (const req of tech.requirements) {
    if (req.level > nextLevel) continue
    if (req.tech) {
      if ((levels[req.tech] ?? 0) < req.techLevel) return false
    } else if (req.anyOf) {
      if (!req.anyOf.some(k => (levels[k] ?? 0) >= req.techLevel)) return false
    } else if (req.allOf) {
      if (!req.allOf.every(k => (levels[k] ?? 0) >= req.techLevel)) return false
    }
  }
  return true
}

// Check if incrementing the level is currently allowed
function canIncrement(key: TechKey, currentLevel: number, levels: Levels): boolean {
  return canUnlock(key, currentLevel + 1, levels)
}

// Max level reachable given current state (for "max" mode)
function maxReachableLevel(key: TechKey, levels: Levels): number {
  const tech = TECH_MAP[key]
  if (!tech) return 0
  let max = levels[key] ?? 0
  while (max < tech.maxLevel && canUnlock(key, max + 1, levels)) max++
  return max
}

/* ------------------------------------------------------------------ */
/*  Category colours                                                    */
/* ------------------------------------------------------------------ */

const CAT_COLOR: Record<string, string> = {
  infantry: 'border-amber-500/40 bg-amber-500/5',
  archer:   'border-emerald-500/40 bg-emerald-500/5',
  cavalry:  'border-sky-500/40 bg-sky-500/5',
  siege:    'border-rose-500/40 bg-rose-500/5',
  utility:  'border-violet-500/40 bg-violet-500/5',
}
const CAT_TEXT: Record<string, string> = {
  infantry: 'text-amber-400',
  archer:   'text-emerald-400',
  cavalry:  'text-sky-400',
  siege:    'text-rose-400',
  utility:  'text-violet-400',
}
const CAT_LABEL: Record<string, string> = {
  infantry: 'Inf', archer: 'Arc', cavalry: 'Cav', siege: 'Sge', utility: 'Util',
}

/* ------------------------------------------------------------------ */
/*  Tech card                                                           */
/* ------------------------------------------------------------------ */

function TechCard({
  techKey, levels, mode, onClick,
}: {
  techKey: TechKey
  levels: Levels
  mode: 'single' | 'max' | 'remove'
  onClick: (key: TechKey) => void
}) {
  const tech = TECH_MAP[techKey]
  if (!tech) return null

  const current = levels[techKey] ?? 0
  const locked = current === 0 && !canIncrement(techKey, 0, levels)
  const maxed   = current === tech.maxLevel
  const canUp   = !maxed && canIncrement(techKey, current, levels)
  const canDown = current > 0

  const levelDef = current > 0 ? tech.levels[current - 1] : null

  let ringClass = ''
  if (maxed) ringClass = 'ring-1 ring-cyan-400/50'
  else if (current > 0) ringClass = 'ring-1 ring-primary/30'
  else if (locked) ringClass = 'opacity-50'

  return (
    <div
      className={`relative rounded-xl border p-2.5 transition-all cursor-pointer select-none ${CAT_COLOR[tech.category]} ${ringClass}`}
      onClick={() => onClick(techKey)}
      title={tech.description}
    >
      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 z-10">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${CAT_TEXT[tech.category]}`}>
          {CAT_LABEL[tech.category]}
        </span>
        {maxed && <span className="text-[9px] font-bold text-cyan-400 uppercase">MAX</span>}
      </div>

      {/* Name */}
      <p className="text-[11px] font-semibold text-foreground leading-tight mb-2" style={{ minHeight: 28 }}>
        {tech.name}
      </p>

      {/* Level bar */}
      <div className="flex items-center gap-1 mb-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${maxed ? 'bg-cyan-400' : 'bg-primary'}`}
            style={{ width: `${(current / tech.maxLevel) * 100}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
          {current}/{tech.maxLevel}
        </span>
      </div>

      {/* Current buff */}
      {levelDef && (
        <p className="text-[10px] text-muted-foreground">
          {levelDef.buff} <span className="opacity-60">{tech.buffType}</span>
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function CrystalTechContent() {
  const [levels, setLevels] = useState<Levels>({})
  const [rcLevel, setRcLevel]       = useState(25)
  const [speedPct, setSpeedPct]     = useState(0)
  const [helps, setHelps]           = useState(30)
  const [mode, setMode]             = useState<'single' | 'max' | 'remove'>('single')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClick = useCallback((key: TechKey) => {
    setLevels(prev => {
      const current = prev[key] ?? 0
      const tech = TECH_MAP[key]
      if (!tech) return prev
      if (mode === 'remove') {
        if (current <= 0) return prev
        return { ...prev, [key]: current - 1 }
      }
      if (mode === 'single') {
        if (!canIncrement(key, current, prev)) return prev
        return { ...prev, [key]: current + 1 }
      }
      // max mode
      const target = maxReachableLevel(key, prev)
      if (target <= current) return prev
      return { ...prev, [key]: target }
    })
  }, [mode])

  // Calculate totals
  const totals = useMemo(() => {
    const rcRed = rcReduction(rcLevel) / 100
    // CC reduction from current CC levels
    const cc1 = Math.min(levels['cuttingCornersI'] ?? 0, 5)   // 1% per level, max 5%
    const cc2 = Math.min(levels['cuttingCornersII'] ?? 0, 10) // 1% per level, max 10%
    const costRed = Math.min(rcRed + cc1 / 100 + cc2 / 100, 0.5) // cap at 50%

    let totalCrystals = 0, rawCrystals = 0, totalCoins = 0, totalSecs = 0

    for (const [key, lvl] of Object.entries(levels)) {
      if (!lvl || lvl <= 0) continue
      const tech = TECH_MAP[key]
      if (!tech) continue
      for (let i = 0; i < lvl; i++) {
        const ld = tech.levels[i]
        if (!ld) continue
        rawCrystals   += ld.crystals
        totalCrystals += Math.floor(ld.crystals * (1 - costRed))
        totalCoins    += ld.seasonCoins
        const baseSecs = parseTimeStr(ld.time)
        const afterSpeed = speedPct > 0 ? baseSecs / (1 + speedPct / 100) : baseSecs
        totalSecs += applyHelps(afterSpeed, helps)
      }
    }

    const savings = rawCrystals - totalCrystals
    const ccPct = (cc1 + cc2).toFixed(0)
    const totalCostRedPct = (costRed * 100).toFixed(1)
    return { totalCrystals, rawCrystals, savings, totalCoins, totalSecs, ccPct, totalCostRedPct }
  }, [levels, rcLevel, speedPct, helps])

  const activeTechCount = useMemo(
    () => Object.values(levels).filter(v => v > 0).length,
    [levels],
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Settings bar ── */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 flex flex-wrap gap-4 items-end">
        {/* RC Level */}
        <div className="space-y-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground">Research Centre Level</label>
          <select
            value={rcLevel}
            onChange={e => setRcLevel(parseInt(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>RC {n} ({rcReduction(n).toFixed(1)}% off)</option>
            ))}
          </select>
        </div>

        {/* Research speed */}
        <div className="space-y-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground">Research Speed Bonus %</label>
          <input
            type="number" min={0} max={500} value={speedPct}
            onChange={e => setSpeedPct(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Helps */}
        <div className="space-y-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground">Helps per research (0–30)</label>
          <input
            type="number" min={0} max={30} value={helps}
            onChange={e => setHelps(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Mode */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Click mode</label>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(['single', 'max', 'remove'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 capitalize border-l border-border first:border-0 transition-colors ${mode === m ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        <div className="ml-auto">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Reset all?</span>
              <button onClick={() => { setLevels({}); setShowClearConfirm(false) }}
                className="rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 px-3 py-1.5 font-semibold transition-colors">
                Yes, reset
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset all
            </button>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-muted-foreground">
        {(['infantry', 'archer', 'cavalry', 'siege', 'utility'] as const).map(cat => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm border ${CAT_COLOR[cat]}`} />
            <span className="capitalize">{cat}</span>
          </div>
        ))}
        <span className="ml-2">· Click a card to level up</span>
        <span>· <span className="text-cyan-400">Cyan glow</span> = maxed</span>
        <span>· <span className="opacity-40">Faded</span> = locked (prereqs not met)</span>
      </div>

      {/* ── Tree grid (horizontal scroll) ── */}
      <div className="flex-1 overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {TREE_COLUMNS.map(col => (
            <div key={col.label} className="flex flex-col gap-2" style={{ width: 148 }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 text-center pb-1 border-b border-border">
                {col.label}
              </p>
              {col.keys.map(k => (
                <TechCard key={k} techKey={k} levels={levels} mode={mode} onClick={handleClick} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-6 items-center">
          {/* Crystals */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Crystals</p>
            <p className="text-xl font-bold text-cyan-300 tabular-nums">{fmtNum(totals.totalCrystals)}</p>
            {totals.savings > 0 && (
              <p className="text-[10px] text-emerald-400">−{fmtNum(totals.savings)} saved ({totals.totalCostRedPct}% off)</p>
            )}
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Season Coins */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Season Coins</p>
            <p className="text-xl font-bold text-amber-300 tabular-nums">{fmtNum(totals.totalCoins)}</p>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Speedups */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Research Time</p>
            <p className="text-xl font-bold text-indigo-300 tabular-nums">{fmtTime(totals.totalSecs)}</p>
            {(speedPct > 0 || helps > 0) && (
              <p className="text-[10px] text-muted-foreground">
                {speedPct > 0 ? `${speedPct}% speed` : ''}
                {speedPct > 0 && helps > 0 ? ' + ' : ''}
                {helps > 0 ? `${helps} helps/research` : ''}
              </p>
            )}
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Reduction summary */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Cost Reduction</p>
            <p className="text-sm font-semibold text-foreground">
              {totals.totalCostRedPct}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              RC {rcReduction(rcLevel).toFixed(1)}% + CC {totals.ccPct}%
            </p>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Techs researched */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Techs Active</p>
            <p className="text-sm font-semibold text-foreground">{activeTechCount} / {Object.keys(TECH_MAP).length}</p>
          </div>

          {/* Raw crystal note */}
          {totals.rawCrystals > 0 && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-muted-foreground">Raw (no reduction)</p>
              <p className="text-xs tabular-nums text-muted-foreground/60">{fmtNum(totals.rawCrystals)} crystals</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
