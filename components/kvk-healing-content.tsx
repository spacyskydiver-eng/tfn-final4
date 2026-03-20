'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants — BASE_TIME in SECONDS per troop (exact from codex)      */
/* ------------------------------------------------------------------ */

const BASE_TIME_T4 = 3.0   // seconds per troop
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
  { value: 1.5,  display: '1.5:1' },
  { value: 1,    display: '1:1'   },
  { value: 0.5,  display: '0.5:1' },
  { value: 0.25, display: '0.25:1'},
]

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'siege'
const TROOP_TYPES: TroopType[] = ['infantry', 'cavalry', 'archer', 'siege']
type Res = { food: number; wood: number; stone: number; gold: number }

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

type Counts = Record<'t4' | 't5', Record<TroopType, string>>

interface CalcResult {
  totalTroops: number
  t4Total: number
  t5Total: number
  baseSeconds: number
  finalSeconds: number
  needed: Res
  // balance
  speedupCap: number | null      // max troops coverable by speedups
  resCap: Partial<Record<keyof Res, number>>  // max troops per resource
  bottleneck: 'speedups' | keyof Res | 'none' | null
  // KP
  expectedKills: number
  expectedKP: number
}

function calculate(
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

  // Balance — how many troops can each resource/speedup afford?
  let speedupCap: number | null = null
  const resCap: Partial<Record<keyof Res, number>> = {}
  let bottleneck: CalcResult['bottleneck'] = null

  if (totalTroops > 0) {
    const avgSecs = baseSeconds / totalTroops

    if (speedupSeconds !== null && avgSecs > 0) {
      speedupCap = Math.floor((speedupSeconds * speedMult) / avgSecs)
    }

    if (stockpile !== null) {
      for (const key of ['food', 'wood', 'stone', 'gold'] as (keyof Res)[]) {
        const avgCost = needed[key] / totalTroops
        resCap[key] = avgCost > 0 ? Math.floor(stockpile[key] / avgCost) : Infinity
      }

      const caps = [
        ...(speedupCap !== null ? [{ key: 'speedups' as const, cap: speedupCap }] : []),
        ...(['food', 'wood', 'stone', 'gold'] as (keyof Res)[]).map(k => ({ key: k as CalcResult['bottleneck'], cap: resCap[k] ?? Infinity })),
      ]
      const binding = caps.filter(c => (c.cap ?? Infinity) < totalTroops)
      bottleneck = binding.length > 0
        ? binding.reduce((a, b) => (a.cap ?? 0) < (b.cap ?? 0) ? a : b).key
        : 'none'
    }
  }

  let expectedKills = 0, expectedKP = 0
  if (tradeRatio !== null) {
    const k4 = t4Total * tradeRatio
    const k5 = t5Total * tradeRatio
    expectedKills = Math.floor(k4 + k5)
    expectedKP    = Math.floor(k4 * KP_PER_UNIT.t4 + k5 * KP_PER_UNIT.t5)
  }

  return { totalTroops, t4Total, t5Total, baseSeconds, finalSeconds, needed, speedupCap, resCap, bottleneck, expectedKills, expectedKP }
}

/* ------------------------------------------------------------------ */
/*  UI helpers                                                          */
/* ------------------------------------------------------------------ */

function RokImg({ src, alt, size = 22 }: { src: string; alt: string; size?: number }) {
  return <Image src={src} alt={alt} width={size} height={size} className="object-contain flex-shrink-0" />
}

function TroopInput({ tier, type, value, onChange }: {
  tier: 't4' | 't5'; type: TroopType; value: string; onChange: (v: string) => void
}) {
  const emoji = { infantry: '⚔️', cavalry: '🐴', archer: '🏹', siege: '💣' }
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

function BalanceRow({ icon, label, available, needed, isSpeedup }: {
  icon: string; label: string; available: number; needed: number; isSpeedup?: boolean
}) {
  if (needed <= 0) return null
  const pct = Math.min(100, (available / needed) * 100)
  const ok  = available >= needed
  const shortBy = needed - available

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <RokImg src={icon} alt={label} size={18} />
          <span className="text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {ok
            ? <span className="text-emerald-400 font-medium">+{fmt(available - needed)} spare</span>
            : <span className="text-red-400 font-medium">−{fmt(shortBy)} short</span>
          }
          {ok
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            : <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          }
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Have: {fmt(available)}</span>
        <span>Need: {fmt(needed)}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

const EMPTY: Counts = {
  t4: { infantry: '', cavalry: '', archer: '', siege: '' },
  t5: { infantry: '', cavalry: '', archer: '', siege: '' },
}

export function KvkHealingContent() {
  const [counts, setCounts]             = useState<Counts>(EMPTY)
  const [healingSpeed, setHealingSpeed] = useState('90')
  const [costReduction, setCostReduction] = useState('10')

  // Stockpile
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

  const result = useMemo(() => calculate(
    counts,
    parseFloat(healingSpeed) || 0,
    parseFloat(costReduction) || 0,
    stockpile,
    speedupSeconds,
    tradeRatio,
  ), [counts, healingSpeed, costReduction, stockpile, speedupSeconds, tradeRatio])

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
          <p className="text-sm text-muted-foreground mt-0.5">
            See exactly what your wounds will cost — and whether your resources and speedups balance out.
          </p>
        </div>
        <button
          onClick={() => { setCounts(EMPTY); setSFood(''); setSWood(''); setSStone(''); setSGold(''); setSpeedupVal(''); setTradeRatio(null) }}
          className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* ===== INPUTS ===== */}
        <div className="xl:col-span-3 space-y-4">

          {/* Buffs */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Healing Buffs</p>
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
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Stockpile <span className="normal-case font-normal opacity-60">(optional)</span></p>
              <span className="text-[10px] text-muted-foreground">Supports M / B (e.g. 50M, 1.2B)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '/images/bundle/food.png',  alt: 'Food',  val: sFood,  set: setSFood  },
                { icon: '/images/bundle/wood.png',  alt: 'Wood',  val: sWood,  set: setSWood  },
                { icon: '/images/bundle/stone.png', alt: 'Stone', val: sStone, set: setSStone },
                { icon: '/images/bundle/gold.png',  alt: 'Gold',  val: sGold,  set: setSGold  },
              ].map(r => (
                <div key={r.alt} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <RokImg src={r.icon} alt={r.alt} size={16} />
                    <label className="text-xs text-muted-foreground">{r.alt}</label>
                  </div>
                  <input type="text" placeholder="0" value={r.val} onChange={e => r.set(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
            </div>

            {/* Speedups */}
            <div className="space-y-1.5 pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Image src="/images/bundle/healing_speed.png" alt="Speedups" width={16} height={16} className="object-contain" />
                <label className="text-xs text-muted-foreground">Healing speedups available</label>
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
            <div className="flex flex-wrap gap-2">
              {RATIO_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setTradeRatio(tradeRatio === opt.value ? null : opt.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition-all ${
                    tradeRatio === opt.value ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  }`}>
                  {opt.display}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== RESULTS ===== */}
        <div className="xl:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Speedup needed */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Speedups Needed</p>
                <div className="flex items-center gap-3">
                  <Image src="/images/bundle/healing_speed.png" alt="" width={38} height={38} className="object-contain" />
                  <div>
                    <div className="text-2xl font-bold text-primary leading-none">{fmtTime(result.finalSeconds)}</div>
                    <div className="text-xs text-muted-foreground mt-1">after 30 alliance helps</div>
                    <div className="text-xs text-muted-foreground">base: {fmtTime(Math.ceil(result.baseSeconds))}</div>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
                  <span>{result.totalTroops.toLocaleString()} troops</span>
                  {result.t4Total > 0 && <span className="text-amber-400">{result.t4Total.toLocaleString()} T4</span>}
                  {result.t5Total > 0 && <span className="text-violet-400">{result.t5Total.toLocaleString()} T5</span>}
                </div>
              </div>

              {/* Resources needed */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources Needed</p>
                {([
                  { icon: '/images/bundle/food.png',  alt: 'Food',  key: 'food'  },
                  { icon: '/images/bundle/wood.png',  alt: 'Wood',  key: 'wood'  },
                  { icon: '/images/bundle/stone.png', alt: 'Stone', key: 'stone' },
                  { icon: '/images/bundle/gold.png',  alt: 'Gold',  key: 'gold'  },
                ] as const).filter(r => result.needed[r.key] > 0).map(r => (
                  <div key={r.key} className="flex items-center gap-2.5">
                    <RokImg src={r.icon} alt={r.alt} size={26} />
                    <span className="text-lg font-bold tabular-nums text-foreground">{fmt(result.needed[r.key])}</span>
                    <span className="text-xs text-muted-foreground">{r.alt}</span>
                  </div>
                ))}
              </div>

              {/* Balance check */}
              {hasStockpile && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resource vs Speedup Balance</p>
                    {result.bottleneck === 'none' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                      </span>
                    )}
                    {result.bottleneck && result.bottleneck !== 'none' && (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {result.bottleneck === 'speedups' ? 'Short on speedups' : `Short on ${result.bottleneck}`}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {speedupSeconds !== null && (
                      <BalanceRow
                        icon="/images/bundle/healing_speed.png"
                        label="Speedups"
                        available={speedupSeconds / 3600}
                        needed={result.finalSeconds / 3600}
                        isSpeedup
                      />
                    )}
                    {stockpile !== null && ([
                      { icon: '/images/bundle/food.png',  alt: 'Food',  key: 'food'  },
                      { icon: '/images/bundle/wood.png',  alt: 'Wood',  key: 'wood'  },
                      { icon: '/images/bundle/stone.png', alt: 'Stone', key: 'stone' },
                      { icon: '/images/bundle/gold.png',  alt: 'Gold',  key: 'gold'  },
                    ] as const).filter(r => result.needed[r.key] > 0).map(r => (
                      <BalanceRow
                        key={r.key}
                        icon={r.icon}
                        label={r.alt}
                        available={stockpile[r.key]}
                        needed={result.needed[r.key]}
                      />
                    ))}
                  </div>

                  {result.bottleneck && result.bottleneck !== 'none' && (
                    <div className="rounded-lg px-3 py-2.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      {result.bottleneck === 'speedups'
                        ? 'Your resources can cover more troops than your speedups allow. Save those resources — you\'ll run out of speedups first.'
                        : `Your speedups can cover more troops than your ${result.bottleneck} allows. Stock up on ${result.bottleneck} or you'll waste speedups.`
                      }
                    </div>
                  )}
                </div>
              )}

              {/* KP */}
              {tradeRatio !== null && result.expectedKills > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Expected KP <span className="normal-case font-normal opacity-60">at {RATIO_OPTIONS.find(r => r.value === tradeRatio)?.display}</span>
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
            <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center gap-3">
              <Image src="/images/bundle/healing_speed.png" alt="" width={44} height={44} className="object-contain opacity-50" />
              <p className="text-sm font-medium text-foreground">Enter your wounded troops</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add your stockpile to see if your resources and speedups are balanced for KvK.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-2.5">
        Time is calculated after 30 alliance helps — each help reduces remaining time by the greater of 1% or 3 minutes. Healing speed and cost reduction apply before helps.
      </p>
    </div>
  )
}
