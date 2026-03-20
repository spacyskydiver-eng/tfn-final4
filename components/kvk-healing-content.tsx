'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts'

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
  { value: 5,    display: '5:1'    },
  { value: 4,    display: '4:1'    },
  { value: 3,    display: '3:1'    },
  { value: 2,    display: '2:1'    },
  { value: 1.5,  display: '1.5:1'  },
  { value: 1,    display: '1:1'    },
  { value: 0.5,  display: '0.5:1'  },
  { value: 0.25, display: '0.25:1' },
]

const RES_COLORS = {
  food:    '#f59e0b',
  wood:    '#22c55e',
  stone:   '#94a3b8',
  gold:    '#fbbf24',
  speedup: '#818cf8',
}

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'siege'
const TROOP_TYPES: TroopType[] = ['infantry', 'cavalry', 'archer', 'siege']
type Res = { food: number; wood: number; stone: number; gold: number }
type Counts = Record<'t4' | 't5', Record<TroopType, string>>

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
  const b = clean.match(/^([\d.]+)\s*b$/); if (b) return parseFloat(b[1]) * 1e9
  const m = clean.match(/^([\d.]+)\s*m$/); if (m) return parseFloat(m[1]) * 1e6
  const k = clean.match(/^([\d.]+)\s*k$/); if (k) return parseFloat(k[1]) * 1e3
  return parseFloat(clean) || 0
}

/* ------------------------------------------------------------------ */
/*  Core calculation                                                    */
/* ------------------------------------------------------------------ */

interface CalcResult {
  totalTroops: number
  t4Total: number
  t5Total: number
  baseSeconds: number
  finalSeconds: number
  needed: Res
  // per-troop rates (for chart + capacity)
  secondsPerTroop: number
  costPerTroop: Res
  // capacity (null if no stockpile/speedup given)
  speedupCap: number | null
  resCap: Partial<Record<keyof Res, number>>
  bottleneck: 'speedups' | keyof Res | 'none' | null
  maxAffordable: number | null   // min of all caps
  // KP
  expectedKills: number
  expectedKP: number
}

function calcResult(
  counts: Counts,
  healingSpeed: number,
  costReduction: number,
  stockpile: Res | null,
  speedupSeconds: number | null,
  tradeRatio: number | null,
): CalcResult | null {
  const speedMult = 1 + healingSpeed / 100
  const costMult  = 1 - costReduction / 100

  let baseSeconds = 0
  const needed: Res = { food: 0, wood: 0, stone: 0, gold: 0 }
  let t4Total = 0, t5Total = 0, hasInput = false

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

  needed.food  = Math.ceil(needed.food)
  needed.wood  = Math.ceil(needed.wood)
  needed.stone = Math.ceil(needed.stone)
  needed.gold  = Math.ceil(needed.gold)

  const finalSeconds = applyHelps(baseSeconds)
  const totalTroops  = t4Total + t5Total

  // Per-troop rates for scaling chart
  const secondsPerTroop = totalTroops > 0 ? baseSeconds / totalTroops : 0
  const costPerTroop: Res = {
    food:  totalTroops > 0 ? needed.food  / totalTroops : 0,
    wood:  totalTroops > 0 ? needed.wood  / totalTroops : 0,
    stone: totalTroops > 0 ? needed.stone / totalTroops : 0,
    gold:  totalTroops > 0 ? needed.gold  / totalTroops : 0,
  }

  // Capacity analysis
  let speedupCap: number | null = null
  const resCap: Partial<Record<keyof Res, number>> = {}
  let bottleneck: CalcResult['bottleneck'] = null
  let maxAffordable: number | null = null

  if (totalTroops > 0) {
    if (speedupSeconds !== null && secondsPerTroop > 0) {
      // Binary search: max N where applyHelps(N * secondsPerTroop) <= speedupSeconds
      let lo = 0, hi = 10_000_000
      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2)
        if (applyHelps(mid * secondsPerTroop) <= speedupSeconds) lo = mid
        else hi = mid - 1
      }
      speedupCap = lo
    }

    if (stockpile !== null) {
      for (const key of ['food', 'wood', 'stone', 'gold'] as (keyof Res)[]) {
        const cpt = costPerTroop[key]
        resCap[key] = cpt > 0 ? Math.floor(stockpile[key] / cpt) : Infinity
      }

      const caps = [
        ...(speedupCap !== null ? [{ key: 'speedups' as const, cap: speedupCap }] : []),
        ...(['food', 'wood', 'stone', 'gold'] as (keyof Res)[])
          .map(k => ({ key: k as CalcResult['bottleneck'], cap: resCap[k] ?? Infinity })),
      ]
      const finiteAndBinding = caps.filter(c => isFinite(c.cap ?? Infinity) && (c.cap ?? Infinity) < totalTroops)
      bottleneck = finiteAndBinding.length > 0
        ? finiteAndBinding.reduce((a, b) => (a.cap ?? 0) < (b.cap ?? 0) ? a : b).key
        : 'none'

      const allCaps = caps.map(c => c.cap ?? Infinity)
      maxAffordable = allCaps.some(c => isFinite(c)) ? Math.min(...allCaps.filter(isFinite)) : null
    }
  }

  let expectedKills = 0, expectedKP = 0
  if (tradeRatio !== null) {
    const k4 = t4Total * tradeRatio; const k5 = t5Total * tradeRatio
    expectedKills = Math.floor(k4 + k5)
    expectedKP    = Math.floor(k4 * KP_PER_UNIT.t4 + k5 * KP_PER_UNIT.t5)
  }

  return {
    totalTroops, t4Total, t5Total, baseSeconds, finalSeconds, needed,
    secondsPerTroop, costPerTroop, speedupCap, resCap, bottleneck, maxAffordable,
    expectedKills, expectedKP,
  }
}

/* ------------------------------------------------------------------ */
/*  Chart data generation                                               */
/* ------------------------------------------------------------------ */

interface ChartPoint {
  troops: number
  food?: number; wood?: number; stone?: number; gold?: number; speedup?: number
}

function buildScalingChart(
  costPerTroop: Res,
  secondsPerTroop: number,
  stockpile: Res | null,
  speedupSeconds: number | null,
  refTroops: number,  // current troop count for domain
  resCap: Partial<Record<keyof Res, number>>,
  speedupCap: number | null,
): ChartPoint[] {
  const caps = [
    ...(speedupCap !== null ? [speedupCap] : []),
    ...Object.values(resCap).filter(v => v !== undefined && isFinite(v as number)) as number[],
  ]
  const maxCap = caps.length > 0 ? Math.max(...caps) : 0
  const domain = Math.max(refTroops * 1.5, maxCap * 1.2, 50_000)

  const points: ChartPoint[] = []
  const steps = 50
  for (let i = 0; i <= steps; i++) {
    const n = Math.round((i / steps) * domain)
    const pt: ChartPoint = { troops: n }
    if (stockpile) {
      if (stockpile.food  > 0 && costPerTroop.food  > 0) pt.food  = (n * costPerTroop.food  / stockpile.food)  * 100
      if (stockpile.wood  > 0 && costPerTroop.wood  > 0) pt.wood  = (n * costPerTroop.wood  / stockpile.wood)  * 100
      if (stockpile.stone > 0 && costPerTroop.stone > 0) pt.stone = (n * costPerTroop.stone / stockpile.stone) * 100
      if (stockpile.gold  > 0 && costPerTroop.gold  > 0) pt.gold  = (n * costPerTroop.gold  / stockpile.gold)  * 100
    }
    if (speedupSeconds !== null && speedupSeconds > 0 && secondsPerTroop > 0) {
      pt.speedup = (applyHelps(n * secondsPerTroop) / speedupSeconds) * 100
    }
    points.push(pt)
  }
  return points
}

function buildCapacityBar(
  resCap: Partial<Record<keyof Res, number>>,
  speedupCap: number | null,
  totalTroops: number,
): { name: string; troops: number; fill: string }[] {
  const bars: { name: string; troops: number; fill: string }[] = []
  const add = (name: string, cap: number | undefined | null, fill: string) => {
    if (cap == null || !isFinite(cap)) return
    bars.push({ name, troops: Math.min(cap, totalTroops * 2), fill })
  }
  add('Food',    resCap.food,  RES_COLORS.food)
  add('Wood',    resCap.wood,  RES_COLORS.wood)
  add('Stone',   resCap.stone, RES_COLORS.stone)
  add('Gold',    resCap.gold,  RES_COLORS.gold)
  add('Speedups', speedupCap,  RES_COLORS.speedup)
  return bars.sort((a, b) => a.troops - b.troops)
}

/* ------------------------------------------------------------------ */
/*  Small UI helpers                                                    */
/* ------------------------------------------------------------------ */

function RokImg({ src, alt, size = 22 }: { src: string; alt: string; size?: number }) {
  return <Image src={src} alt={alt} width={size} height={size} className="object-contain flex-shrink-0" />
}

function TroopInput({ tier, type, value, onChange }: {
  tier: 't4' | 't5'; type: TroopType; value: string; onChange: (v: string) => void
}) {
  const emoji: Record<TroopType, string> = { infantry: '⚔️', cavalry: '🐴', archer: '🏹', siege: '💣' }
  const isT5 = tier === 't5'
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 border ${isT5 ? 'border-violet-500/30 bg-violet-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
      <span className="text-base leading-none">{emoji[type]}</span>
      <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{fmt(label ?? 0)} troops</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value.toFixed(1)}% used</p>
      ))}
    </div>
  )
}

const CapTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-foreground font-semibold">{fmt(payload[0].value)} troops</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

const EMPTY: Counts = {
  t4: { infantry: '', cavalry: '', archer: '', siege: '' },
  t5: { infantry: '', cavalry: '', archer: '', siege: '' },
}

export function KvkHealingContent() {
  const [counts, setCounts]               = useState<Counts>(EMPTY)
  const [healingSpeed, setHealingSpeed]   = useState('90')
  const [costReduction, setCostReduction] = useState('10')

  const [sFood,  setSFood]  = useState('')
  const [sWood,  setSWood]  = useState('')
  const [sStone, setSStone] = useState('')
  const [sGold,  setSGold]  = useState('')
  const [speedupVal,  setSpeedupVal]  = useState('')
  const [speedupUnit, setSpeedupUnit] = useState<'hours' | 'days'>('hours')

  const [tradeRatio, setTradeRatio] = useState<number | null>(null)

  const setCount = (tier: 't4' | 't5', type: TroopType, v: string) =>
    setCounts(prev => ({ ...prev, [tier]: { ...prev[tier], [type]: v } }))

  const stockpile = useMemo((): Res | null => {
    const f = parseStockpile(sFood), w = parseStockpile(sWood)
    const s = parseStockpile(sStone), g = parseStockpile(sGold)
    return (f || w || s || g) ? { food: f, wood: w, stone: s, gold: g } : null
  }, [sFood, sWood, sStone, sGold])

  const speedupSeconds = useMemo(() => {
    const v = parseFloat(speedupVal)
    if (!speedupVal || isNaN(v) || v <= 0) return null
    return speedupUnit === 'days' ? v * 86400 : v * 3600
  }, [speedupVal, speedupUnit])

  const result = useMemo(() => calcResult(
    counts,
    parseFloat(healingSpeed) || 0,
    parseFloat(costReduction) || 0,
    stockpile, speedupSeconds, tradeRatio,
  ), [counts, healingSpeed, costReduction, stockpile, speedupSeconds, tradeRatio])

  const hasStockpile = stockpile !== null || speedupSeconds !== null

  const chartData = useMemo(() => {
    if (!result || !hasStockpile) return null
    return buildScalingChart(
      result.costPerTroop, result.secondsPerTroop,
      stockpile, speedupSeconds,
      result.totalTroops, result.resCap, result.speedupCap,
    )
  }, [result, stockpile, speedupSeconds, hasStockpile])

  const capBars = useMemo(() => {
    if (!result || !hasStockpile) return null
    return buildCapacityBar(result.resCap, result.speedupCap, result.totalTroops)
  }, [result, hasStockpile])

  const reset = () => {
    setCounts(EMPTY); setSFood(''); setSWood(''); setSStone(''); setSGold('')
    setSpeedupVal(''); setTradeRatio(null)
  }

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Image src="/images/bundle/healing_speed.png" alt="" width={28} height={28} className="object-contain" />
            KvK Healing Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calculate healing costs, then enter your stockpile to see if your resources and speedups balance out.
          </p>
        </div>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">Reset</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* ===== LEFT — INPUTS ===== */}
        <div className="xl:col-span-2 space-y-4">

          {/* Buffs */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Healing Buffs</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Healing Speed %', val: healingSpeed, set: setHealingSpeed, ph: '90' },
                { label: 'Cost Reduction %', val: costReduction, set: setCostReduction, ph: '10' },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <input type="number" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>
          </div>

          {/* T4 */}
          <div className="rounded-xl border border-amber-500/25 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Tier 4 Wounded</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TROOP_TYPES.map(t => (
                <TroopInput key={t} tier="t4" type={t} value={counts.t4[t]} onChange={v => setCount('t4', t, v)} />
              ))}
            </div>
          </div>

          {/* T5 */}
          <div className="rounded-xl border border-violet-500/25 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Tier 5 Wounded</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TROOP_TYPES.map(t => (
                <TroopInput key={t} tier="t5" type={t} value={counts.t5[t]} onChange={v => setCount('t5', t, v)} />
              ))}
            </div>
          </div>

          {/* Stockpile */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Stockpile</p>
              <span className="text-[10px] text-muted-foreground opacity-60">50M, 1.2B etc</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { icon: '/images/bundle/food.png',  alt: 'Food',  val: sFood,  set: setSFood  },
                { icon: '/images/bundle/wood.png',  alt: 'Wood',  val: sWood,  set: setSWood  },
                { icon: '/images/bundle/stone.png', alt: 'Stone', val: sStone, set: setSStone },
                { icon: '/images/bundle/gold.png',  alt: 'Gold',  val: sGold,  set: setSGold  },
              ] as const).map(r => (
                <div key={r.alt} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <RokImg src={r.icon} alt={r.alt} size={15} />
                    <label className="text-xs text-muted-foreground">{r.alt}</label>
                  </div>
                  <input type="text" placeholder="0" value={r.val} onChange={e => r.set(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5 pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Image src="/images/bundle/healing_speed.png" alt="Speedups" width={15} height={15} className="object-contain" />
                <label className="text-xs text-muted-foreground">Healing speedups</label>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="0" value={speedupVal} onChange={e => setSpeedupVal(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="flex rounded-lg border border-border text-xs overflow-hidden">
                  {(['hours', 'days'] as const).map(u => (
                    <button key={u} onClick={() => setSpeedupUnit(u)}
                      className={`px-3 py-1.5 capitalize transition-colors border-l border-border first:border-0 ${speedupUnit === u ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* KP ratio */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Kill:Death Ratio <span className="normal-case font-normal opacity-60">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RATIO_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setTradeRatio(tradeRatio === opt.value ? null : opt.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-sm font-bold transition-all ${
                    tradeRatio === opt.value ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  }`}>
                  {opt.display}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== RIGHT — RESULTS ===== */}
        <div className="xl:col-span-3 space-y-4">
          {result ? (
            <>
              {/* Cost summary row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Speedup needed */}
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Speedups Needed</p>
                  <div className="flex items-center gap-2.5">
                    <Image src="/images/bundle/healing_speed.png" alt="" width={32} height={32} className="object-contain" />
                    <div>
                      <div className="text-xl font-bold text-primary leading-none">{fmtTime(result.finalSeconds)}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">after 30 helps</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Base: {fmtTime(Math.ceil(result.baseSeconds))}</p>
                </div>

                {/* Troop summary */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Troops</p>
                  <div className="text-xl font-bold text-foreground">{result.totalTroops.toLocaleString()}</div>
                  <div className="flex gap-2 mt-1.5 text-[11px]">
                    {result.t4Total > 0 && <span className="text-amber-400">{result.t4Total.toLocaleString()} T4</span>}
                    {result.t5Total > 0 && <span className="text-violet-400">{result.t5Total.toLocaleString()} T5</span>}
                  </div>
                  {tradeRatio !== null && result.expectedKP > 0 && (
                    <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                      ~{fmt(result.expectedKP)} KP at {RATIO_OPTIONS.find(r => r.value === tradeRatio)?.display}
                    </div>
                  )}
                </div>
              </div>

              {/* Resources needed */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resources Needed</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {([
                    { icon: '/images/bundle/food.png',  alt: 'Food',  key: 'food'  as const },
                    { icon: '/images/bundle/wood.png',  alt: 'Wood',  key: 'wood'  as const },
                    { icon: '/images/bundle/stone.png', alt: 'Stone', key: 'stone' as const },
                    { icon: '/images/bundle/gold.png',  alt: 'Gold',  key: 'gold'  as const },
                  ]).filter(r => result.needed[r.key] > 0).map(r => (
                    <div key={r.key} className="flex items-center gap-2">
                      <RokImg src={r.icon} alt={r.alt} size={24} />
                      <span className="text-base font-bold tabular-nums text-foreground">{fmt(result.needed[r.key])}</span>
                      <span className="text-xs text-muted-foreground">{r.alt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capacity bar chart — how many troops each resource can cover */}
              {hasStockpile && capBars && capBars.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">How Many Troops You Can Afford</p>
                    {result.bottleneck && result.bottleneck !== 'none' && (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-semibold">
                        <AlertTriangle className="h-3 w-3" />
                        {result.bottleneck === 'speedups' ? 'Speedups' : result.bottleneck.charAt(0).toUpperCase() + result.bottleneck.slice(1)} is your limit
                      </span>
                    )}
                    {result.bottleneck === 'none' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> You can cover all
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Each bar = how many troops that resource alone could fund. The shortest bar is your bottleneck.</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={capBars} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" dataKey="troops" tickFormatter={v => fmt(v)} tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={52} />
                      <Tooltip content={<CapTooltip />} />
                      <ReferenceLine x={result.totalTroops} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Target', fill: '#9ca3af', fontSize: 10 }} />
                      <Bar dataKey="troops" radius={[0, 4, 4, 0]}>
                        {capBars.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Scaling line chart — % of stockpile consumed at each troop count */}
              {hasStockpile && chartData && chartData.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resource Consumption vs Troop Count</p>
                  <p className="text-xs text-muted-foreground mb-3">How much of each stockpile you use at different troop counts. 100% = stockpile empty.</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="troops" tickFormatter={v => fmt(v)} tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 150]} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: 'Stockpile limit', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                      <ReferenceLine x={result.totalTroops} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Your troops', fill: '#9ca3af', fontSize: 10 }} />
                      {chartData[0]?.food    !== undefined && <Line type="monotone" dataKey="food"    name="Food"    stroke={RES_COLORS.food}    dot={false} strokeWidth={2} />}
                      {chartData[0]?.wood    !== undefined && <Line type="monotone" dataKey="wood"    name="Wood"    stroke={RES_COLORS.wood}    dot={false} strokeWidth={2} />}
                      {chartData[0]?.stone   !== undefined && <Line type="monotone" dataKey="stone"   name="Stone"   stroke={RES_COLORS.stone}   dot={false} strokeWidth={2} />}
                      {chartData[0]?.gold    !== undefined && <Line type="monotone" dataKey="gold"    name="Gold"    stroke={RES_COLORS.gold}    dot={false} strokeWidth={2} />}
                      {chartData[0]?.speedup !== undefined && <Line type="monotone" dataKey="speedup" name="Speedups" stroke={RES_COLORS.speedup} dot={false} strokeWidth={2} strokeDasharray="6 3" />}
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Bottleneck plain text */}
                  {result.bottleneck && result.bottleneck !== 'none' && (
                    <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-300">
                      {result.bottleneck === 'speedups'
                        ? `Your resources can heal more than your speedups allow. You${'\u2019'}ll burn out speedups first — either get more healing speedups or reduce your target troop count.`
                        : `Your ${result.bottleneck} runs out before your other resources${speedupSeconds ? ' and speedups' : ''}. Stock up on ${result.bottleneck} — everything else is in surplus.`
                      }
                    </div>
                  )}
                  {result.bottleneck === 'none' && (
                    <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs text-emerald-300">
                      Your stockpile covers all {result.totalTroops.toLocaleString()} troops. You${'\u2019'}re balanced.
                    </div>
                  )}
                </div>
              )}

              {/* KP detail */}
              {tradeRatio !== null && result.expectedKills > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Expected KP at {RATIO_OPTIONS.find(r => r.value === tradeRatio)?.display}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary/40 p-3 text-center">
                      <div className="text-xl font-bold">{fmt(result.expectedKills)}</div>
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
            <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center gap-3">
              <Image src="/images/bundle/healing_speed.png" alt="" width={44} height={44} className="object-contain opacity-40" />
              <p className="text-sm font-medium text-foreground">Enter your wounded troops to start</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                Then add your stockpile to see the balance charts — which resource or speedup runs out first.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-2.5">
        Time is calculated after 30 alliance helps — each reduces remaining time by the greater of 1% or 3 minutes. Healing speed and cost reduction apply before helps.
      </p>
    </div>
  )
}
