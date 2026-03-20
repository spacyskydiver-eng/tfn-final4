'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants — BASE_TIME in SECONDS per troop (exact from codex)      */
/* ------------------------------------------------------------------ */

const BASE_TIME_T4 = 3.0
const BASE_TIME_T5 = 4.0
const HELP_COUNT   = 30

const RESOURCES = {
  t4: {
    infantry: { food: 120, wood: 120, stone: 0,   gold: 8   },
    cavalry:  { food: 120, wood: 0,   stone: 90,  gold: 8   },
    archer:   { food: 0,   wood: 120, stone: 90,  gold: 8   },
    siege:    { food: 80,  wood: 80,  stone: 60,  gold: 8   },
  },
  t5: {
    infantry: { food: 320, wood: 320, stone: 0,   gold: 160 },
    cavalry:  { food: 320, wood: 0,   stone: 240, gold: 160 },
    archer:   { food: 0,   wood: 320, stone: 240, gold: 160 },
    siege:    { food: 200, wood: 200, stone: 160, gold: 160 },
  },
} as const

const KP_PER_UNIT = { t4: 10, t5: 20 }

const RATIO_OPTIONS = [
  { value: 5,    display: '5:1'   },
  { value: 4,    display: '4:1'   },
  { value: 3,    display: '3:1'   },
  { value: 2,    display: '2:1'   },
  { value: 1,    display: '1:1'   },
  { value: 0.5,  display: '0.5:1' },
  { value: 0.25, display: '0.25:1'},
]

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'siege'
const TROOP_TYPES: TroopType[] = ['infantry', 'cavalry', 'archer', 'siege']

const TROOP_EMOJI: Record<TroopType, string> = {
  infantry: '⚔️', cavalry: '🐴', archer: '🏹', siege: '💣',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toLocaleString()
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0s'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

function applyHelps(secs: number): number {
  if (secs <= 0) return 0
  let temp = Math.max(3, Math.ceil(secs))
  for (let i = 0; i < HELP_COUNT; i++) {
    if (temp <= 0) break
    temp = Math.max(0, temp - Math.max(180, temp * 0.01))
  }
  return Math.floor(temp)
}

function parseCount(s: string): number {
  const v = parseInt(s.replace(/,/g, '').replace(/\D/g, '') || '0')
  return isNaN(v) ? 0 : v
}

function parseStockpile(s: string): number {
  const clean = s.trim().toLowerCase().replace(/,/g, '')
  if (!clean) return 0
  const bMatch = clean.match(/^([\d.]+)\s*b$/)
  if (bMatch) return parseFloat(bMatch[1]) * 1_000_000_000
  const mMatch = clean.match(/^([\d.]+)\s*m$/)
  if (mMatch) return parseFloat(mMatch[1]) * 1_000_000
  const kMatch = clean.match(/^([\d.]+)\s*k$/)
  if (kMatch) return parseFloat(kMatch[1]) * 1_000
  return parseFloat(clean) || 0
}

/* ------------------------------------------------------------------ */
/*  Core calculation                                                    */
/* ------------------------------------------------------------------ */

type Counts = Record<'t4' | 't5', Record<TroopType, string>>

interface Res { food: number; wood: number; stone: number; gold: number }

interface Result {
  totalTroops: number; t4Total: number; t5Total: number
  baseSeconds: number; finalSeconds: number
  needed: Res
  // balance (null if no stockpile entered)
  speedupCap: number | null       // troops affordable by speedups
  resCap: Partial<Record<keyof Res, number>>  // troops affordable by each resource
  bottleneck: 'speedups' | keyof Res | 'none' | null
  // KP
  expectedKills: number; expectedKP: number
}

function calcResult(
  counts: Counts,
  healingSpeed: number,
  costReduction: number,
  stockpile: Res | null,
  speedupSeconds: number | null,
  tradeRatio: number | null,
): Result | null {
  const speedMult = 1 + healingSpeed / 100
  const costMult  = 1 - costReduction / 100

  let baseSeconds = 0
  const needed: Res = { food: 0, wood: 0, stone: 0, gold: 0 }
  let t4Total = 0; let t5Total = 0; let hasInput = false

  for (const type of TROOP_TYPES) {
    const c4 = parseCount(counts.t4[type])
    const c5 = parseCount(counts.t5[type])
    if (c4 > 0) {
      hasInput = true; t4Total += c4
      baseSeconds += (BASE_TIME_T4 * c4) / speedMult
      needed.food  += RESOURCES.t4[type].food  * c4 * costMult
      needed.wood  += RESOURCES.t4[type].wood  * c4 * costMult
      needed.stone += RESOURCES.t4[type].stone * c4 * costMult
      needed.gold  += RESOURCES.t4[type].gold  * c4 * costMult
    }
    if (c5 > 0) {
      hasInput = true; t5Total += c5
      baseSeconds += (BASE_TIME_T5 * c5) / speedMult
      needed.food  += RESOURCES.t5[type].food  * c5 * costMult
      needed.wood  += RESOURCES.t5[type].wood  * c5 * costMult
      needed.stone += RESOURCES.t5[type].stone * c5 * costMult
      needed.gold  += RESOURCES.t5[type].gold  * c5 * costMult
    }
  }

  if (!hasInput) return null

  const finalSeconds = applyHelps(baseSeconds)
  const totalTroops  = t4Total + t5Total

  needed.food  = Math.ceil(needed.food)
  needed.wood  = Math.ceil(needed.wood)
  needed.stone = Math.ceil(needed.stone)
  needed.gold  = Math.ceil(needed.gold)

  // Balance analysis
  let speedupCap: number | null = null
  const resCap: Partial<Record<keyof Res, number>> = {}
  let bottleneck: Result['bottleneck'] = null

  if (totalTroops > 0) {
    const avgSecs = baseSeconds / totalTroops  // seconds per troop (before helps)

    if (speedupSeconds !== null && avgSecs > 0) {
      // speedupSeconds available → apply speedMult to get raw healing time covered
      speedupCap = Math.floor((speedupSeconds * speedMult) / avgSecs)
    }

    if (stockpile !== null) {
      const RES_KEYS: (keyof Res)[] = ['food', 'wood', 'stone', 'gold']
      for (const key of RES_KEYS) {
        const avgCost = needed[key] / totalTroops
        resCap[key] = avgCost > 0
          ? Math.floor(stockpile[key] / avgCost)
          : Infinity
      }

      // Bottleneck = whichever cap is tightest relative to totalTroops
      const caps: { key: Result['bottleneck']; cap: number }[] = [
        ...(speedupCap !== null ? [{ key: 'speedups' as const, cap: speedupCap }] : []),
        ...(Object.entries(resCap) as [keyof Res, number][]).map(([key, cap]) => ({ key: key as Result['bottleneck'], cap })),
      ]
      const binding = caps.filter(c => (c.cap ?? Infinity) < totalTroops)
      bottleneck = binding.length > 0
        ? binding.reduce((a, b) => (a.cap ?? 0) < (b.cap ?? 0) ? a : b).key
        : 'none'
    }
  }

  // KP
  let expectedKills = 0; let expectedKP = 0
  if (tradeRatio !== null) {
    const k4 = t4Total * tradeRatio
    const k5 = t5Total * tradeRatio
    expectedKills = Math.floor(k4 + k5)
    expectedKP    = Math.floor(k4 * KP_PER_UNIT.t4 + k5 * KP_PER_UNIT.t5)
  }

  return { totalTroops, t4Total, t5Total, baseSeconds, finalSeconds, needed, speedupCap, resCap, bottleneck, expectedKills, expectedKP }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function RokImg({ src, alt, size = 22 }: { src: string; alt: string; size?: number }) {
  return <Image src={src} alt={alt} width={size} height={size} className="object-contain flex-shrink-0" />
}

function TroopInput({ tier, type, value, onChange }: {
  tier: 't4' | 't5'; type: TroopType; value: string
  onChange: (v: string) => void
}) {
  const isT5 = tier === 't5'
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border ${isT5 ? 'border-violet-500/30 bg-violet-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
      <span className="text-base">{TROOP_EMOJI[type]}</span>
      <span className="text-[10px] text-muted-foreground">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
      <input
        type="text" inputMode="numeric" placeholder="0" value={value}
        onChange={e => {
          let v = e.target.value.replace(/,/g, '').replace(/\D/g, '')
          if (v) v = parseInt(v).toLocaleString()
          onChange(v)
        }}
        className="w-full text-center text-sm font-semibold bg-transparent border-0 border-b border-border/50 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/30 pb-0.5"
      />
    </div>
  )
}

function StockpileInput({ icon, alt, label, value, onChange }: {
  icon: string; alt: string; label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <RokImg src={icon} alt={alt} size={18} />
        <label className="text-xs text-muted-foreground">{label}</label>
      </div>
      <input
        type="text" placeholder="e.g. 50M or 50000000" value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}

function BalanceBar({ label, icon, available, needed, cap, totalTroops, isSpeedup }: {
  label: string; icon?: string; available: number; needed: number
  cap: number | null | undefined; totalTroops: number; isSpeedup?: boolean
}) {
  if (needed <= 0 && !isSpeedup) return null
  const pct = needed > 0 ? Math.min(100, (available / needed) * 100) : 100
  const ok  = cap == null || cap >= totalTroops
  const capPct = isSpeedup && cap != null && totalTroops > 0
    ? Math.min(100, (cap / totalTroops) * 100)
    : pct

  return (
    <div className="flex items-center gap-2.5">
      {icon
        ? <RokImg src={icon} alt={label} size={20} />
        : <span className="text-sm">⚡</span>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={`text-xs font-semibold tabular-nums ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(available)} / {fmt(needed)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${capPct}%` }}
          />
        </div>
      </div>
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        : <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
      }
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

type InputTab = 'direct' | 'estimate'
type SpeedupUnit = 'hours' | 'days'
type TroopFocus = 'infantry' | 'cavalry' | 'archer' | 'mixed'

const EMPTY_COUNTS: Counts = {
  t4: { infantry: '', cavalry: '', archer: '', siege: '' },
  t5: { infantry: '', cavalry: '', archer: '', siege: '' },
}

export function KvkHealingContent() {
  // Mode
  const [inputTab, setInputTab] = useState<InputTab>('direct')

  // Direct inputs
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)

  // Estimator
  const [marchSize,  setMarchSize]  = useState('')
  const [woundRate,  setWoundRate]  = useState('25')
  const [tierSplit,  setTierSplit]  = useState('30')  // % T5
  const [troopFocus, setTroopFocus] = useState<TroopFocus>('infantry')

  // Buffs
  const [healingSpeed, setHealingSpeed] = useState('90')
  const [costReduction, setCostReduction] = useState('10')

  // Stockpile
  const [sFood,  setSFood]  = useState('')
  const [sWood,  setSWood]  = useState('')
  const [sStone, setSStone] = useState('')
  const [sGold,  setSGold]  = useState('')
  const [speedupVal,  setSpeedupVal]  = useState('')
  const [speedupUnit, setSpeedupUnit] = useState<SpeedupUnit>('hours')

  // Trade ratio
  const [tradeRatio, setTradeRatio] = useState<number | null>(null)

  /* Derived wounded counts from estimator */
  const estimatedCounts = useMemo((): Counts => {
    const march = parseCount(marchSize)
    if (march <= 0) return EMPTY_COUNTS
    const totalWounded = Math.round(march * (parseFloat(woundRate) || 25) / 100)
    const t5Pct = (parseFloat(tierSplit) || 0) / 100
    const t5w = Math.round(totalWounded * t5Pct)
    const t4w = totalWounded - t5w

    const split = (n: number, focus: TroopFocus): Record<TroopType, string> => {
      if (focus === 'infantry') return { infantry: n.toLocaleString(), cavalry: '', archer: '', siege: '' }
      if (focus === 'cavalry')  return { infantry: '', cavalry: n.toLocaleString(), archer: '', siege: '' }
      if (focus === 'archer')   return { infantry: '', cavalry: '', archer: n.toLocaleString(), siege: '' }
      // mixed — equal split
      const q = Math.floor(n / 4)
      const r = n - q * 3
      return { infantry: r.toLocaleString(), cavalry: q.toLocaleString(), archer: q.toLocaleString(), siege: q.toLocaleString() }
    }

    return { t4: split(t4w, troopFocus), t5: split(t5w, troopFocus) }
  }, [marchSize, woundRate, tierSplit, troopFocus])

  const activeCounts = inputTab === 'estimate' ? estimatedCounts : counts
  const setCount = (tier: 't4' | 't5', type: TroopType, v: string) =>
    setCounts(prev => ({ ...prev, [tier]: { ...prev[tier], [type]: v } }))

  /* Stockpile & speedup parsing */
  const stockpile = useMemo((): typeof import('./kvk-healing-content') extends never ? never : {food:number,wood:number,stone:number,gold:number} | null => {
    const f = parseStockpile(sFood)
    const w = parseStockpile(sWood)
    const s = parseStockpile(sStone)
    const g = parseStockpile(sGold)
    if (f === 0 && w === 0 && s === 0 && g === 0) return null
    return { food: f, wood: w, stone: s, gold: g }
  }, [sFood, sWood, sStone, sGold])

  const speedupSeconds = useMemo(() => {
    const v = parseFloat(speedupVal)
    if (!speedupVal || isNaN(v)) return null
    return speedupUnit === 'days' ? v * 86400 : v * 3600
  }, [speedupVal, speedupUnit])

  const result = useMemo(() => calcResult(
    activeCounts,
    parseFloat(healingSpeed) || 0,
    parseFloat(costReduction) || 0,
    stockpile,
    speedupSeconds,
    tradeRatio,
  ), [activeCounts, healingSpeed, costReduction, stockpile, speedupSeconds, tradeRatio])

  const hasStockpile = stockpile !== null || speedupSeconds !== null

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Image src="/images/bundle/healing_speed.png" alt="" width={28} height={28} className="object-contain" />
            KvK Healing Calculator
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Know exactly how much resources and speedups you need — and whether they're balanced.
          </p>
        </div>
        <button
          onClick={() => { setCounts(EMPTY_COUNTS); setMarchSize(''); setSFood(''); setSWood(''); setSStone(''); setSGold(''); setSpeedupVal(''); setTradeRatio(null) }}
          className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
        >
          Reset all
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* ===== LEFT INPUTS ===== */}
        <div className="xl:col-span-3 space-y-4">

          {/* Buffs */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Healing Buffs</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Healing Speed %</label>
                <input type="number" placeholder="90" value={healingSpeed} onChange={e => setHealingSpeed(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Resource Cost Reduction %</label>
                <input type="number" placeholder="10" value={costReduction} onChange={e => setCostReduction(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>

          {/* Wounded troops */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Wounded Troops</p>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                <button onClick={() => setInputTab('direct')}
                  className={`px-3 py-1.5 transition-colors ${inputTab === 'direct' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary'}`}>
                  Enter directly
                </button>
                <button onClick={() => setInputTab('estimate')}
                  className={`px-3 py-1.5 transition-colors border-l border-border ${inputTab === 'estimate' ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary'}`}>
                  Estimate from army
                </button>
              </div>
            </div>

            {inputTab === 'estimate' ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                  Not sure how many get wounded? Enter your march size and estimate based on a typical fight.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">March / Army Size</label>
                    <input type="text" placeholder="e.g. 280,000" value={marchSize}
                      onChange={e => { let v = e.target.value.replace(/,/g, '').replace(/\D/g, ''); if (v) v = parseInt(v).toLocaleString(); setMarchSize(v) }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Wound Rate % <span className="text-muted-foreground/50">(avg per battle)</span></label>
                    <input type="number" placeholder="25" value={woundRate} onChange={e => setWoundRate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">T5 % of wounded</label>
                    <input type="number" placeholder="30" value={tierSplit} onChange={e => setTierSplit(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Troop focus</label>
                    <select value={troopFocus} onChange={e => setTroopFocus(e.target.value as TroopFocus)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="infantry">Infantry</option>
                      <option value="cavalry">Cavalry</option>
                      <option value="archer">Archer</option>
                      <option value="mixed">Mixed (equal split)</option>
                    </select>
                  </div>
                </div>
                {/* Preview of estimated counts */}
                {parseCount(marchSize) > 0 && (
                  <div className="rounded-lg bg-secondary/20 px-3 py-2 text-xs text-muted-foreground space-y-1">
                    <span className="font-medium text-foreground">Estimated: </span>
                    {(['t4', 't5'] as const).map(tier => {
                      const total = TROOP_TYPES.reduce((s, t) => s + parseCount(estimatedCounts[tier][t]), 0)
                      return total > 0 ? (
                        <span key={tier} className={`ml-2 ${tier === 't5' ? 'text-violet-400' : 'text-amber-400'}`}>
                          {total.toLocaleString()} {tier.toUpperCase()}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* T4 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Tier 4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TROOP_TYPES.map(t => (
                      <TroopInput key={t} tier="t4" type={t} value={counts.t4[t]} onChange={v => setCount('t4', t, v)} />
                    ))}
                  </div>
                </div>
                {/* T5 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Tier 5</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TROOP_TYPES.map(t => (
                      <TroopInput key={t} tier="t5" type={t} value={counts.t5[t]} onChange={v => setCount('t5', t, v)} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stockpile */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Stockpile</p>
              <span className="text-[10px] text-muted-foreground">Supports M/B suffixes (e.g. 50M)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StockpileInput icon="/images/bundle/food.png"  alt="Food"  label="Food"  value={sFood}  onChange={setSFood}  />
              <StockpileInput icon="/images/bundle/wood.png"  alt="Wood"  label="Wood"  value={sWood}  onChange={setSWood}  />
              <StockpileInput icon="/images/bundle/stone.png" alt="Stone" label="Stone" value={sStone} onChange={setSStone} />
              <StockpileInput icon="/images/bundle/gold.png"  alt="Gold"  label="Gold"  value={sGold}  onChange={setSGold}  />
            </div>
            <div className="space-y-1 pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Image src="/images/bundle/healing_speed.png" alt="Speedups" width={18} height={18} className="object-contain" />
                <label className="text-xs text-muted-foreground">Healing Speedups available</label>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="0" value={speedupVal} onChange={e => setSpeedupVal(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  <button onClick={() => setSpeedupUnit('hours')}
                    className={`px-3 py-1.5 transition-colors ${speedupUnit === 'hours' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
                    Hours
                  </button>
                  <button onClick={() => setSpeedupUnit('days')}
                    className={`px-3 py-1.5 border-l border-border transition-colors ${speedupUnit === 'days' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
                    Days
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Trade ratio */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kill:Death Ratio <span className="normal-case font-normal text-muted-foreground/60">(optional — for KP estimate)</span></p>
            <div className="flex flex-wrap gap-2">
              {RATIO_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setTradeRatio(tradeRatio === opt.value ? null : opt.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                    tradeRatio === opt.value ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  }`}>
                  {opt.display}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== RIGHT RESULTS ===== */}
        <div className="xl:col-span-2 space-y-4">

          {result ? (
            <>
              {/* Hero stat — healing time */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Speedups Needed</p>
                <div className="flex items-center gap-3">
                  <Image src="/images/bundle/healing_speed.png" alt="" width={36} height={36} className="object-contain" />
                  <div>
                    <div className="text-2xl font-bold text-primary leading-none">{fmtTime(result.finalSeconds)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">after 30 alliance helps</div>
                  </div>
                </div>
                {result.baseSeconds > 0 && (
                  <p className="text-xs text-muted-foreground">Base (no helps): {fmtTime(Math.ceil(result.baseSeconds))}</p>
                )}
                <div className="flex gap-2 pt-1 text-xs text-muted-foreground">
                  <span>{result.totalTroops.toLocaleString()} troops total</span>
                  {result.t4Total > 0 && <span className="text-amber-400">· {result.t4Total.toLocaleString()} T4</span>}
                  {result.t5Total > 0 && <span className="text-violet-400">· {result.t5Total.toLocaleString()} T5</span>}
                </div>
              </div>

              {/* Resources needed */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources Needed</p>
                {[
                  { icon: '/images/bundle/food.png',  alt: 'Food',  key: 'food'  as const },
                  { icon: '/images/bundle/wood.png',  alt: 'Wood',  key: 'wood'  as const },
                  { icon: '/images/bundle/stone.png', alt: 'Stone', key: 'stone' as const },
                  { icon: '/images/bundle/gold.png',  alt: 'Gold',  key: 'gold'  as const },
                ].filter(r => result.needed[r.key] > 0).map(r => (
                  <div key={r.key} className="flex items-center gap-2.5">
                    <RokImg src={r.icon} alt={r.alt} size={24} />
                    <span className="text-base font-bold tabular-nums text-foreground">{fmt(result.needed[r.key])}</span>
                    <span className="text-xs text-muted-foreground">{r.alt}</span>
                  </div>
                ))}
              </div>

              {/* Balance check — the key feature */}
              {hasStockpile && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resource vs Speedup Balance</p>
                    {result.bottleneck === 'none' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> All covered
                      </span>
                    )}
                    {result.bottleneck && result.bottleneck !== 'none' && (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Short on {result.bottleneck}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Speedups */}
                    {speedupSeconds !== null && (
                      <BalanceBar
                        label="Healing Speedups"
                        available={speedupSeconds / 3600}
                        needed={result.finalSeconds / 3600}
                        cap={result.speedupCap}
                        totalTroops={result.totalTroops}
                        isSpeedup
                      />
                    )}
                    {/* Resources */}
                    {stockpile !== null && [
                      { icon: '/images/bundle/food.png',  alt: 'Food',  key: 'food'  as const },
                      { icon: '/images/bundle/wood.png',  alt: 'Wood',  key: 'wood'  as const },
                      { icon: '/images/bundle/stone.png', alt: 'Stone', key: 'stone' as const },
                      { icon: '/images/bundle/gold.png',  alt: 'Gold',  key: 'gold'  as const },
                    ].filter(r => result.needed[r.key] > 0).map(r => (
                      <BalanceBar
                        key={r.key}
                        label={r.alt}
                        icon={r.icon}
                        available={stockpile[r.key]}
                        needed={result.needed[r.key]}
                        cap={result.resCap[r.key]}
                        totalTroops={result.totalTroops}
                      />
                    ))}
                  </div>

                  {/* Balance insight */}
                  {result.bottleneck !== null && result.bottleneck !== 'none' && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
                      <strong>{result.bottleneck === 'speedups' ? 'Speedups' : result.bottleneck.charAt(0).toUpperCase() + result.bottleneck.slice(1)}</strong> is your bottleneck.
                      {result.bottleneck !== 'speedups' && result.speedupCap != null && result.resCap[result.bottleneck as keyof Res] != null && (
                        <span> Your speedups could heal {fmt(result.speedupCap ?? 0)} troops but {result.bottleneck} only covers {fmt(result.resCap[result.bottleneck as keyof Res] ?? 0)}.</span>
                      )}
                      {result.bottleneck === 'speedups' && (
                        <span> Your resources could heal more troops than your speedups allow.</span>
                      )}
                    </div>
                  )}
                  {result.bottleneck === 'none' && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                      You have enough of everything to fully heal your troops.
                    </div>
                  )}
                </div>
              )}

              {/* KP */}
              {tradeRatio !== null && result.expectedKills > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expected KP at {RATIO_OPTIONS.find(r => r.value === tradeRatio)?.display} ratio</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary/40 p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{fmt(result.expectedKills)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Enemy Kills</div>
                    </div>
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
                      <div className="text-xl font-bold text-primary">{fmt(result.expectedKP)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Kill Points</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center gap-3">
              <Image src="/images/bundle/healing_speed.png" alt="" width={44} height={44} className="object-contain opacity-60" />
              <div>
                <p className="text-sm font-medium text-foreground">Enter your wounded troops above</p>
                <p className="text-xs text-muted-foreground mt-1">Add stockpile to check if resources and speedups are balanced</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-2.5">
        Time shown is after 30 alliance helps (each reduces remaining time by the greater of 1% or 3 minutes). Healing speed and cost reduction buffs apply before helps.
      </p>
    </div>
  )
}
