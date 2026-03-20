'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, CheckCircle2, Zap, Package, Swords } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
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
  { value: 5, display: '5:1' }, { value: 4, display: '4:1' },
  { value: 3, display: '3:1' }, { value: 2, display: '2:1' },
  { value: 1.5, display: '1.5:1' }, { value: 1, display: '1:1' },
  { value: 0.5, display: '0.5:1' }, { value: 0.25, display: '0.25:1' },
]

const RES_META = [
  { key: 'food'  as const, label: 'Food',  icon: '/images/bundle/food.png',  color: '#f59e0b' },
  { key: 'wood'  as const, label: 'Wood',  icon: '/images/bundle/wood.png',  color: '#22c55e' },
  { key: 'stone' as const, label: 'Stone', icon: '/images/bundle/stone.png', color: '#94a3b8' },
  { key: 'gold'  as const, label: 'Gold',  icon: '/images/bundle/gold.png',  color: '#fbbf24' },
]

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'siege'
const TROOP_TYPES: TroopType[] = ['infantry', 'cavalry', 'archer', 'siege']
type Res = { food: number; wood: number; stone: number; gold: number }
type Counts = Record<'t4' | 't5', Record<TroopType, string>>
type TroopFocus = 'infantry' | 'cavalry' | 'archer' | 'mixed'
type Mode = 'cost' | 'from-speeds' | 'from-resources' | 'combined'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return Math.round(n).toLocaleString()
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0s'
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`); if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`); parts.push(`${s}s`)
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

function parseNum(s: string): number {
  const v = parseInt(s.replace(/,/g, '').replace(/\D/g, '') || '0')
  return isNaN(v) ? 0 : v
}

function parseStockpile(s: string): number {
  const c = s.trim().toLowerCase().replace(/,/g, '')
  if (!c) return 0
  const b = c.match(/^([\d.]+)b$/); if (b) return parseFloat(b[1]) * 1e9
  const m = c.match(/^([\d.]+)m$/); if (m) return parseFloat(m[1]) * 1e6
  const k = c.match(/^([\d.]+)k$/); if (k) return parseFloat(k[1]) * 1e3
  return parseFloat(c) || 0
}

// Given a focus type and T5%, build per-troop cost and seconds
function perTroopRates(focus: TroopFocus, t5Pct: number, healSpd: number, costRed: number) {
  const speedMult = 1 + healSpd / 100
  const costMult  = 1 - costRed / 100
  const t5f = Math.max(0, Math.min(1, t5Pct / 100))
  const t4f = 1 - t5f

  // distribute by focus
  const dist: Record<TroopType, number> =
    focus === 'infantry' ? { infantry: 1, cavalry: 0, archer: 0, siege: 0 } :
    focus === 'cavalry'  ? { infantry: 0, cavalry: 1, archer: 0, siege: 0 } :
    focus === 'archer'   ? { infantry: 0, cavalry: 0, archer: 1, siege: 0 } :
                           { infantry: 0.25, cavalry: 0.25, archer: 0.25, siege: 0.25 }

  let secsPerTroop = 0
  const costPerTroop: Res = { food: 0, wood: 0, stone: 0, gold: 0 }

  for (const type of TROOP_TYPES) {
    const frac = dist[type]
    if (frac === 0) continue
    // T4 portion
    secsPerTroop += (BASE_TIME_T4 * t4f * frac) / speedMult
    secsPerTroop += (BASE_TIME_T5 * t5f * frac) / speedMult
    for (const r of ['food', 'wood', 'stone', 'gold'] as (keyof Res)[]) {
      costPerTroop[r] += RESOURCES.t4[type][r] * t4f * frac * costMult
      costPerTroop[r] += RESOURCES.t5[type][r] * t5f * frac * costMult
    }
  }
  return { secsPerTroop, costPerTroop }
}

// Binary search: max troops where applyHelps(N * secsPerTroop) <= speedupSecs
function maxTroopsFromSpeeds(speedupSecs: number, secsPerTroop: number): number {
  if (secsPerTroop <= 0) return 0
  let lo = 0, hi = 100_000_000
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (applyHelps(mid * secsPerTroop) <= speedupSecs) lo = mid
    else hi = mid - 1
  }
  return lo
}

// Max troops from a single resource
function maxTroopsFromResource(available: number, costPerTroop: number): number {
  if (costPerTroop <= 0) return Infinity
  return Math.floor(available / costPerTroop)
}

/* ------------------------------------------------------------------ */
/*  Cost-mode calculation (enter troops → costs)                       */
/* ------------------------------------------------------------------ */

function calcFromTroops(
  counts: Counts, healSpd: number, costRed: number, tradeRatio: number | null,
) {
  const speedMult = 1 + healSpd / 100
  const costMult  = 1 - costRed / 100
  let baseSeconds = 0
  const needed: Res = { food: 0, wood: 0, stone: 0, gold: 0 }
  let t4Total = 0, t5Total = 0, hasInput = false

  for (const type of TROOP_TYPES) {
    const c4 = parseNum(counts.t4[type]), c5 = parseNum(counts.t5[type])
    if (c4 > 0) {
      hasInput = true; t4Total += c4
      baseSeconds += (BASE_TIME_T4 * c4) / speedMult
      for (const r of ['food','wood','stone','gold'] as (keyof Res)[])
        needed[r] += RESOURCES.t4[type][r] * c4 * costMult
    }
    if (c5 > 0) {
      hasInput = true; t5Total += c5
      baseSeconds += (BASE_TIME_T5 * c5) / speedMult
      for (const r of ['food','wood','stone','gold'] as (keyof Res)[])
        needed[r] += RESOURCES.t5[type][r] * c5 * costMult
    }
  }
  if (!hasInput) return null

  for (const r of ['food','wood','stone','gold'] as (keyof Res)[])
    needed[r] = Math.ceil(needed[r])

  const finalSeconds = applyHelps(baseSeconds)
  const totalTroops = t4Total + t5Total
  const secsPerTroop = totalTroops > 0 ? baseSeconds / totalTroops : 0
  const costPerTroop: Res = {
    food:  totalTroops > 0 ? needed.food  / totalTroops : 0,
    wood:  totalTroops > 0 ? needed.wood  / totalTroops : 0,
    stone: totalTroops > 0 ? needed.stone / totalTroops : 0,
    gold:  totalTroops > 0 ? needed.gold  / totalTroops : 0,
  }
  let expectedKills = 0, expectedKP = 0
  if (tradeRatio) {
    const k4 = t4Total * tradeRatio, k5 = t5Total * tradeRatio
    expectedKills = Math.floor(k4 + k5)
    expectedKP = Math.floor(k4 * KP_PER_UNIT.t4 + k5 * KP_PER_UNIT.t5)
  }
  return { totalTroops, t4Total, t5Total, baseSeconds, finalSeconds, needed, secsPerTroop, costPerTroop, expectedKills, expectedKP }
}

/* ------------------------------------------------------------------ */
/*  Chart helpers                                                       */
/* ------------------------------------------------------------------ */

function buildScalingData(
  secsPerTroop: number, costPerTroop: Res,
  stockpile: Res | null, speedupSecs: number | null,
  maxTroops: number,
) {
  const steps = 60
  return Array.from({ length: steps + 1 }, (_, i) => {
    const n = Math.round((i / steps) * maxTroops)
    const pt: Record<string, number> = { troops: n }
    if (stockpile) {
      for (const r of RES_META)
        if (stockpile[r.key] > 0 && costPerTroop[r.key] > 0)
          pt[r.label] = parseFloat(((n * costPerTroop[r.key] / stockpile[r.key]) * 100).toFixed(1))
    }
    if (speedupSecs && speedupSecs > 0 && secsPerTroop > 0)
      pt['Speedups'] = parseFloat(((applyHelps(n * secsPerTroop) / speedupSecs) * 100).toFixed(1))
    return pt
  })
}

const LINE_COLORS: Record<string, string> = {
  Food: '#f59e0b', Wood: '#22c55e', Stone: '#94a3b8', Gold: '#fbbf24', Speedups: '#818cf8',
}

function ScalingChart({ data, refTroops }: { data: Record<string, number>[]; refTroops?: number }) {
  const keys = data[0] ? Object.keys(data[0]).filter(k => k !== 'troops') : []
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="troops" tickFormatter={v => fmt(v)} tick={{ fill: '#6b7280', fontSize: 10 }} />
        <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 150]} />
        <Tooltip
          contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
          labelFormatter={v => `${fmt(Number(v))} troops`}
          formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
        />
        <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5}
          label={{ value: '100% = empty', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
        {refTroops != null && (
          <ReferenceLine x={refTroops} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1}
            label={{ value: '▲', fill: '#9ca3af', fontSize: 10 }} />
        )}
        {keys.map(k => (
          <Line key={k} type="monotone" dataKey={k} stroke={LINE_COLORS[k] ?? '#888'}
            dot={false} strokeWidth={2} strokeDasharray={k === 'Speedups' ? '6 3' : undefined} />
        ))}
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                               */
/* ------------------------------------------------------------------ */

function RokImg({ src, alt, size = 20 }: { src: string; alt: string; size?: number }) {
  return <Image src={src} alt={alt} width={size} height={size} className="object-contain flex-shrink-0" />
}

function ResInput({ label, icon, value, onChange }: { label: string; icon: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <RokImg src={icon} alt={label} size={15} />
        <label className="text-xs text-muted-foreground">{label}</label>
      </div>
      <input type="text" placeholder="e.g. 50M" value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>
  )
}

function SpeedupInput({ val, setVal, unit, setUnit }: {
  val: string; setVal: (v: string) => void; unit: 'hours' | 'days'; setUnit: (u: 'hours' | 'days') => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Image src="/images/bundle/healing_speed.png" alt="Speedups" width={15} height={15} className="object-contain" />
        <label className="text-xs text-muted-foreground">Healing speedups</label>
      </div>
      <div className="flex gap-2">
        <input type="number" placeholder="0" value={val} onChange={e => setVal(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
        <div className="flex rounded-lg border border-border text-xs overflow-hidden">
          {(['hours','days'] as const).map(u => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-3 py-1.5 capitalize border-l border-border first:border-0 transition-colors ${unit === u ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TroopCompositionInputs({ t5Pct, setT5Pct, focus, setFocus }: {
  t5Pct: string; setT5Pct: (v: string) => void; focus: TroopFocus; setFocus: (v: TroopFocus) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">T5 % of wounded</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} value={t5Pct} onChange={e => setT5Pct(e.target.value)}
            className="flex-1 accent-violet-500" />
          <span className="text-sm font-bold text-foreground w-12 text-right tabular-nums">{t5Pct}%</span>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span className="text-amber-400">100% T4</span>
          <span className="text-violet-400">100% T5</span>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Troop type</label>
        <div className="grid grid-cols-4 gap-1.5">
          {(['infantry','cavalry','archer','mixed'] as TroopFocus[]).map(f => (
            <button key={f} onClick={() => setFocus(f)}
              className={`rounded-lg border py-1.5 text-[11px] capitalize transition-all ${focus === f ? 'border-primary bg-primary/15 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
              {f === 'infantry' ? '⚔️' : f === 'cavalry' ? '🐴' : f === 'archer' ? '🏹' : '🔀'}
              <br />{f}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TroopInput({ tier, type, value, onChange }: {
  tier: 't4' | 't5'; type: TroopType; value: string; onChange: (v: string) => void
}) {
  const emoji: Record<TroopType, string> = { infantry: '⚔️', cavalry: '🐴', archer: '🏹', siege: '💣' }
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 border ${tier === 't5' ? 'border-violet-500/30 bg-violet-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
      <span className="text-base leading-none">{emoji[type]}</span>
      <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
      <input type="text" inputMode="numeric" placeholder="0" value={value}
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

function ResultRes({ needed }: { needed: Res }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {RES_META.filter(r => needed[r.key] > 0).map(r => (
        <div key={r.key} className="flex items-center gap-2">
          <RokImg src={r.icon} alt={r.label} size={22} />
          <span className="text-base font-bold tabular-nums" style={{ color: r.color }}>{fmt(needed[r.key])}</span>
          <span className="text-xs text-muted-foreground">{r.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mode A — From Speeds: I have X hours of speedups, what can I heal? */
/* ------------------------------------------------------------------ */

function ModeFromSpeeds({ healSpd, costRed, tradeRatio }: { healSpd: string; costRed: string; tradeRatio: number | null }) {
  const [speedupVal, setSpeedupVal]   = useState('')
  const [speedupUnit, setSpeedupUnit] = useState<'hours' | 'days'>('hours')
  const [targetVal, setTargetVal]     = useState('')  // optional target troop goal
  const [t5Pct, setT5Pct]             = useState('30')
  const [focus, setFocus]             = useState<TroopFocus>('infantry')

  const speedupSecs = useMemo(() => {
    const v = parseFloat(speedupVal)
    return (!speedupVal || isNaN(v) || v <= 0) ? null : (speedupUnit === 'days' ? v * 86400 : v * 3600)
  }, [speedupVal, speedupUnit])

  const targetTroops = useMemo(() => {
    const v = parseNum(targetVal)
    return v > 0 ? v : null
  }, [targetVal])

  const result = useMemo(() => {
    if (!speedupSecs) return null
    const hs = parseFloat(healSpd) || 0, cr = parseFloat(costRed) || 0
    const { secsPerTroop, costPerTroop } = perTroopRates(focus, parseFloat(t5Pct) || 0, hs, cr)
    const maxTroops = maxTroopsFromSpeeds(speedupSecs, secsPerTroop)

    // Use target if set, otherwise max
    const displayTroops = targetTroops ?? maxTroops
    const needed: Res = {
      food:  Math.ceil(displayTroops * costPerTroop.food),
      wood:  Math.ceil(displayTroops * costPerTroop.wood),
      stone: Math.ceil(displayTroops * costPerTroop.stone),
      gold:  Math.ceil(displayTroops * costPerTroop.gold),
    }
    const speedupNeededForTarget = targetTroops
      ? fmtTime(applyHelps(targetTroops * secsPerTroop))
      : null
    const canAffordTarget = targetTroops ? targetTroops <= maxTroops : null
    const shortByTroops = targetTroops && !canAffordTarget ? targetTroops - maxTroops : 0

    const t5f = Math.max(0, Math.min(1, (parseFloat(t5Pct) || 0) / 100))
    const t5troops = Math.round(displayTroops * t5f), t4troops = displayTroops - t5troops
    const expectedKills = tradeRatio ? Math.floor((t4troops + t5troops) * tradeRatio) : 0
    const expectedKP    = tradeRatio ? Math.floor(t4troops * tradeRatio * KP_PER_UNIT.t4 + t5troops * tradeRatio * KP_PER_UNIT.t5) : 0

    return { maxTroops, displayTroops, needed, secsPerTroop, costPerTroop, speedupNeededForTarget, canAffordTarget, shortByTroops, expectedKills, expectedKP }
  }, [speedupSecs, healSpd, costRed, focus, t5Pct, tradeRatio, targetTroops])

  const chartData = useMemo(() => {
    if (!result || !speedupSecs) return null
    const domain = Math.max(result.maxTroops * 1.5, (targetTroops ?? 0) * 1.5, 50_000)
    return buildScalingData(result.secsPerTroop, result.costPerTroop, null, speedupSecs, domain)
  }, [result, speedupSecs, targetTroops])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Speedups Available</p>
          <SpeedupInput val={speedupVal} setVal={setSpeedupVal} unit={speedupUnit} setUnit={setSpeedupUnit} />
          <div className="space-y-1 pt-1 border-t border-border">
            <label className="text-xs text-muted-foreground">Target troop count <span className="opacity-50">(optional goal)</span></label>
            <input type="text" inputMode="numeric" placeholder="e.g. 200,000" value={targetVal}
              onChange={e => { let v = e.target.value.replace(/,/g,'').replace(/\D/g,''); if (v) v = parseInt(v).toLocaleString(); setTargetVal(v) }}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Troop Composition</p>
          <TroopCompositionInputs t5Pct={t5Pct} setT5Pct={setT5Pct} focus={focus} setFocus={setFocus} />
        </div>
      </div>

      {result ? (
        <div className="space-y-4">
          {/* Can you hit your target? */}
          {targetTroops && (
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${result.canAffordTarget ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              {result.canAffordTarget
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                : <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-semibold ${result.canAffordTarget ? 'text-emerald-300' : 'text-red-300'}`}>
                  {result.canAffordTarget
                    ? `Your speedups cover your target of ${fmt(targetTroops)} troops`
                    : `${fmt(result.shortByTroops)} troops short of your goal`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.canAffordTarget
                    ? `You can heal up to ${fmt(result.maxTroops)} — you have ${fmt(result.maxTroops - targetTroops)} spare`
                    : `Your speedups only cover ${fmt(result.maxTroops)} troops`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Hero stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
              <div className="text-2xl font-bold text-primary">{fmt(result.maxTroops)}</div>
              <div className="text-xs text-muted-foreground mt-1">Max you can heal</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{fmtTime(speedupSecs ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Speedups available</div>
            </div>
          </div>

          {targetTroops && result.speedupNeededForTarget && (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <Image src="/images/bundle/healing_speed.png" alt="" width={28} height={28} className="object-contain" />
              <div>
                <div className="text-xs text-muted-foreground">Speedups needed for {fmt(targetTroops)} troops</div>
                <div className="text-lg font-bold text-foreground">{result.speedupNeededForTarget} <span className="text-sm font-normal text-muted-foreground">after 30 helps</span></div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Resources Needed for {fmt(result.displayTroops)} troops
            </p>
            <ResultRes needed={result.needed} />
          </div>

          {/* Resource bar chart — no tooltip, values shown as axis labels */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resource Cost Breakdown</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={RES_META.filter(r => result.needed[r.key] > 0).map(r => ({ name: r.label, value: result.needed[r.key] }))}
                margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (v: number) => fmt(v), fill: '#9ca3af', fontSize: 10 }}>
                  {RES_META.filter(r => result.needed[r.key] > 0).map((r, i) => <Cell key={i} fill={r.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per 10k troops card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cost Per 10,000 Troops</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {RES_META.filter(r => result.costPerTroop[r.key] > 0).map(r => (
                <div key={r.key} className="flex items-center gap-2">
                  <RokImg src={r.icon} alt={r.label} size={18} />
                  <span className="text-sm font-semibold tabular-nums" style={{ color: r.color }}>{fmt(result.costPerTroop[r.key] * 10_000)}</span>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Image src="/images/bundle/healing_speed.png" alt="Speed" width={18} height={18} className="object-contain" />
                <span className="text-sm font-semibold tabular-nums text-indigo-400">{fmtTime(Math.ceil(applyHelps(result.secsPerTroop * 10_000)))}</span>
                <span className="text-xs text-muted-foreground">speedup</span>
              </div>
            </div>
          </div>

          {chartData && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Speedup Usage vs Troop Count</p>
              <p className="text-xs text-muted-foreground mb-3">100% = speedups fully used. Dashed line = your current max.</p>
              <ScalingChart data={chartData} refTroops={result.maxTroops} />
            </div>
          )}

          {tradeRatio && result.expectedKP > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-xl font-bold">{fmt(result.expectedKills)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Enemy Kills</div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                <div className="text-xl font-bold text-primary">{fmt(result.expectedKP)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Kill Points</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
          Enter your healing speedups above to see what you can heal
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mode B — From Resources: I have X food/wood etc, what can I heal?  */
/* ------------------------------------------------------------------ */

function ModeFromResources({ healSpd, costRed, tradeRatio }: { healSpd: string; costRed: string; tradeRatio: number | null }) {
  const [sFood, setSFood]   = useState('')
  const [sWood, setSWood]   = useState('')
  const [sStone, setSStone] = useState('')
  const [sGold, setSGold]   = useState('')
  const [t5Pct, setT5Pct]   = useState('30')
  const [focus, setFocus]   = useState<TroopFocus>('infantry')

  const stockpile: Res = useMemo(() => ({
    food: parseStockpile(sFood), wood: parseStockpile(sWood),
    stone: parseStockpile(sStone), gold: parseStockpile(sGold),
  }), [sFood, sWood, sStone, sGold])

  const result = useMemo(() => {
    const hasAny = stockpile.food || stockpile.wood || stockpile.stone || stockpile.gold
    if (!hasAny) return null
    const hs = parseFloat(healSpd) || 0, cr = parseFloat(costRed) || 0
    const { secsPerTroop, costPerTroop } = perTroopRates(focus, parseFloat(t5Pct) || 0, hs, cr)

    // Only include resources that are actually relevant to this troop type
    // (e.g. infantry uses food+wood, so stone/gold with 0 balance means those aren't constraints)
    const caps: { key: string; label: string; icon: string; color: string; cap: number }[] = []
    for (const r of RES_META) {
      if (costPerTroop[r.key] > 0) {
        // If user entered 0 for a resource that IS needed, that's a real constraint (0 troops)
        caps.push({ ...r, cap: stockpile[r.key] > 0 ? maxTroopsFromResource(stockpile[r.key], costPerTroop[r.key]) : 0 })
      }
    }

    const finiteCaps = caps.filter(c => isFinite(c.cap))
    const maxTroops = finiteCaps.length > 0 ? Math.min(...finiteCaps.map(c => c.cap)) : 0
    const bottleneck = finiteCaps.length > 0 ? finiteCaps.reduce((a, b) => a.cap < b.cap ? a : b) : null
    const speedupNeeded = secsPerTroop > 0 ? fmtTime(applyHelps(maxTroops * secsPerTroop)) : null

    // KP only makes sense if we have a real constrained result (at least one resource entered for each needed type)
    const allNeededEntered = RES_META.every(r => costPerTroop[r.key] === 0 || stockpile[r.key] > 0)
    const t5f = Math.max(0, Math.min(1, (parseFloat(t5Pct) || 0) / 100))
    const t5troops = Math.round(maxTroops * t5f), t4troops = maxTroops - t5troops
    const expectedKills = (tradeRatio && allNeededEntered) ? Math.floor((t4troops + t5troops) * tradeRatio) : 0
    const expectedKP    = (tradeRatio && allNeededEntered) ? Math.floor(t4troops * tradeRatio * KP_PER_UNIT.t4 + t5troops * tradeRatio * KP_PER_UNIT.t5) : 0

    return { maxTroops, caps, bottleneck, secsPerTroop, costPerTroop, speedupNeeded, expectedKills, expectedKP, allNeededEntered }
  }, [stockpile, healSpd, costRed, focus, t5Pct, tradeRatio])

  const chartData = useMemo(() => {
    if (!result || result.maxTroops <= 0) return null
    const domain = result.maxTroops * 2 || 100_000
    return buildScalingData(result.secsPerTroop, result.costPerTroop, stockpile, null, domain)
  }, [result, stockpile])

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Resources</p>
          <div className="grid grid-cols-2 gap-3">
            {RES_META.map(r => <ResInput key={r.key} label={r.label} icon={r.icon} value={r.key === 'food' ? sFood : r.key === 'wood' ? sWood : r.key === 'stone' ? sStone : sGold} onChange={r.key === 'food' ? setSFood : r.key === 'wood' ? setSWood : r.key === 'stone' ? setSStone : setSGold} />)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Troop Composition</p>
          <TroopCompositionInputs t5Pct={t5Pct} setT5Pct={setT5Pct} focus={focus} setFocus={setFocus} />
        </div>
      </div>

      {/* Results */}
      {result && result.maxTroops > 0 ? (
        <div className="space-y-4">
          {/* Hero + bottleneck */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
              <div className="text-3xl font-bold text-primary">{fmt(result.maxTroops)}</div>
              <div className="text-xs text-muted-foreground mt-1">Max troops you can heal</div>
            </div>
            <div className={`rounded-xl border p-4 text-center ${result.bottleneck ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-card'}`}>
              {result.bottleneck ? (
                <>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-semibold text-red-400">Bottleneck</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <RokImg src={result.bottleneck.icon} alt={result.bottleneck.label} size={24} />
                    <span className="text-lg font-bold text-red-300">{result.bottleneck.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">runs out first</div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Balanced</span>
                </div>
              )}
            </div>
          </div>

          {result.speedupNeeded && (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <Image src="/images/bundle/healing_speed.png" alt="" width={32} height={32} className="object-contain" />
              <div>
                <div className="text-xs text-muted-foreground">Speedups needed to heal {fmt(result.maxTroops)} troops</div>
                <div className="text-xl font-bold text-foreground">{result.speedupNeeded} <span className="text-sm font-normal text-muted-foreground">after 30 helps</span></div>
              </div>
            </div>
          )}

          {/* Per 10k troops card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cost Per 10,000 Troops</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {RES_META.filter(r => result.costPerTroop[r.key] > 0).map(r => (
                <div key={r.key} className="flex items-center gap-2">
                  <RokImg src={r.icon} alt={r.label} size={18} />
                  <span className="text-sm font-semibold tabular-nums" style={{ color: r.color }}>{fmt(result.costPerTroop[r.key] * 10_000)}</span>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Image src="/images/bundle/healing_speed.png" alt="Speed" width={18} height={18} className="object-contain" />
                <span className="text-sm font-semibold tabular-nums text-indigo-400">{fmtTime(Math.ceil(applyHelps(result.secsPerTroop * 10_000)))}</span>
                <span className="text-xs text-muted-foreground">speedup</span>
              </div>
            </div>
          </div>

          {/* Capacity bar chart — each resource's troop cap */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Troops Each Resource Can Fund</p>
            <p className="text-xs text-muted-foreground mb-3">The shortest bar is your limiting factor.</p>
            <ResponsiveContainer width="100%" height={result.caps.length * 40 + 20}>
              <BarChart data={result.caps.map(c => ({ name: c.label, troops: Math.min(c.cap, result.maxTroops * 3), fill: c.color }))}
                layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={56} />
                <ReferenceLine x={result.maxTroops} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="troops" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', formatter: (v: number) => fmt(v), fill: '#9ca3af', fontSize: 10 }}>
                  {result.caps.map((c, i) => <Cell key={i} fill={c.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scaling line chart */}
          {chartData && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">% of Stockpile Used vs Troop Count</p>
              <p className="text-xs text-muted-foreground mb-3">Lines show what % of each resource gets consumed. The first line to hit 100% is your limit.</p>
              <ScalingChart data={chartData} refTroops={result.maxTroops} />
            </div>
          )}

          {tradeRatio && result.expectedKP > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-xl font-bold">{fmt(result.expectedKills)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Enemy Kills</div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                <div className="text-xl font-bold text-primary">{fmt(result.expectedKP)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Kill Points</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
          Enter your resource stockpile to see how many troops you can heal
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mode C — Cost calc: enter troops → exact cost                      */
/* ------------------------------------------------------------------ */

function ModeCost({ healSpd, costRed, tradeRatio }: { healSpd: string; costRed: string; tradeRatio: number | null }) {
  const [counts, setCounts] = useState<Counts>({
    t4: { infantry: '', cavalry: '', archer: '', siege: '' },
    t5: { infantry: '', cavalry: '', archer: '', siege: '' },
  })
  const [sFood, setSFood]   = useState('')
  const [sWood, setSWood]   = useState('')
  const [sStone, setSStone] = useState('')
  const [sGold, setSGold]   = useState('')
  const [speedupVal, setSpeedupVal]   = useState('')
  const [speedupUnit, setSpeedupUnit] = useState<'hours' | 'days'>('hours')

  const setCount = (tier: 't4' | 't5', type: TroopType, v: string) =>
    setCounts(prev => ({ ...prev, [tier]: { ...prev[tier], [type]: v } }))

  const stockpile: Res | null = useMemo(() => {
    const f = parseStockpile(sFood), w = parseStockpile(sWood), s = parseStockpile(sStone), g = parseStockpile(sGold)
    return (f || w || s || g) ? { food: f, wood: w, stone: s, gold: g } : null
  }, [sFood, sWood, sStone, sGold])

  const speedupSecs = useMemo(() => {
    const v = parseFloat(speedupVal)
    return (!speedupVal || isNaN(v) || v <= 0) ? null : (speedupUnit === 'days' ? v * 86400 : v * 3600)
  }, [speedupVal, speedupUnit])

  const result = useMemo(() => calcFromTroops(counts, parseFloat(healSpd)||0, parseFloat(costRed)||0, tradeRatio), [counts, healSpd, costRed, tradeRatio])

  const hasStockpile = stockpile !== null || speedupSecs !== null

  const chartData = useMemo(() => {
    if (!result || !hasStockpile) return null
    const domain = result.totalTroops * 2 || 100_000
    return buildScalingData(result.secsPerTroop, result.costPerTroop, stockpile, speedupSecs, domain)
  }, [result, stockpile, speedupSecs, hasStockpile])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Troop inputs */}
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-500/25 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Tier 4 Wounded</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TROOP_TYPES.map(t => <TroopInput key={t} tier="t4" type={t} value={counts.t4[t]} onChange={v => setCount('t4', t, v)} />)}
            </div>
          </div>
          <div className="rounded-xl border border-violet-500/25 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Tier 5 Wounded</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TROOP_TYPES.map(t => <TroopInput key={t} tier="t5" type={t} value={counts.t5[t]} onChange={v => setCount('t5', t, v)} />)}
            </div>
          </div>
        </div>

        {/* Stockpile — optional for balance check */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Stockpile <span className="normal-case font-normal opacity-50">— optional, enables balance chart</span></p>
          <div className="grid grid-cols-2 gap-3">
            {RES_META.map(r => <ResInput key={r.key} label={r.label} icon={r.icon} value={r.key === 'food' ? sFood : r.key === 'wood' ? sWood : r.key === 'stone' ? sStone : sGold} onChange={r.key === 'food' ? setSFood : r.key === 'wood' ? setSWood : r.key === 'stone' ? setSStone : setSGold} />)}
          </div>
          <div className="pt-1 border-t border-border">
            <SpeedupInput val={speedupVal} setVal={setSpeedupVal} unit={speedupUnit} setUnit={setSpeedupUnit} />
          </div>
        </div>
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
              <p className="text-[11px] text-muted-foreground mb-2">Speedups Needed</p>
              <div className="flex items-center gap-2">
                <Image src="/images/bundle/healing_speed.png" alt="" width={30} height={30} className="object-contain" />
                <div>
                  <div className="text-xl font-bold text-primary">{fmtTime(result.finalSeconds)}</div>
                  <div className="text-[11px] text-muted-foreground">after 30 helps · base {fmtTime(Math.ceil(result.baseSeconds))}</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground mb-2">Troops</p>
              <div className="text-xl font-bold">{result.totalTroops.toLocaleString()}</div>
              <div className="flex gap-2 mt-1 text-[11px]">
                {result.t4Total > 0 && <span className="text-amber-400">{result.t4Total.toLocaleString()} T4</span>}
                {result.t5Total > 0 && <span className="text-violet-400">{result.t5Total.toLocaleString()} T5</span>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources Needed</p>
            <ResultRes needed={result.needed} />
          </div>

          {hasStockpile && chartData && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">% of Stockpile Used vs Troop Count</p>
              <p className="text-xs text-muted-foreground mb-3">First line to cross 100% is your bottleneck. Dashed line = your current wounded count.</p>
              <ScalingChart data={chartData} refTroops={result.totalTroops} />
            </div>
          )}

          {tradeRatio && result.expectedKP > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-xl font-bold">{fmt(result.expectedKills)}</div>
                <div className="text-[11px] text-muted-foreground">Enemy Kills</div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                <div className="text-xl font-bold text-primary">{fmt(result.expectedKP)}</div>
                <div className="text-[11px] text-muted-foreground">Kill Points</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
          Enter your wounded troop counts above
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mode D — Combined: enter both speedups AND resources               */
/* ------------------------------------------------------------------ */

function ModeCombined({ healSpd, costRed, tradeRatio }: { healSpd: string; costRed: string; tradeRatio: number | null }) {
  const [speedupVal, setSpeedupVal]   = useState('')
  const [speedupUnit, setSpeedupUnit] = useState<'hours' | 'days'>('hours')
  const [sFood, setSFood]   = useState('')
  const [sWood, setSWood]   = useState('')
  const [sStone, setSStone] = useState('')
  const [sGold, setSGold]   = useState('')
  const [t5Pct, setT5Pct]   = useState('30')
  const [focus, setFocus]   = useState<TroopFocus>('infantry')

  const speedupSecs = useMemo(() => {
    const v = parseFloat(speedupVal)
    return (!speedupVal || isNaN(v) || v <= 0) ? null : (speedupUnit === 'days' ? v * 86400 : v * 3600)
  }, [speedupVal, speedupUnit])

  const stockpile: Res = useMemo(() => ({
    food: parseStockpile(sFood), wood: parseStockpile(sWood),
    stone: parseStockpile(sStone), gold: parseStockpile(sGold),
  }), [sFood, sWood, sStone, sGold])

  const result = useMemo(() => {
    const hasRes = stockpile.food || stockpile.wood || stockpile.stone || stockpile.gold
    if (!speedupSecs && !hasRes) return null
    const hs = parseFloat(healSpd) || 0, cr = parseFloat(costRed) || 0
    const { secsPerTroop, costPerTroop } = perTroopRates(focus, parseFloat(t5Pct) || 0, hs, cr)

    // Speedup cap
    const speedupCap = speedupSecs ? maxTroopsFromSpeeds(speedupSecs, secsPerTroop) : Infinity

    // Resource caps (only for resources actually needed by this troop type)
    const caps: { key: string; label: string; icon: string; color: string; cap: number }[] = []
    for (const r of RES_META) {
      if (costPerTroop[r.key] > 0) {
        caps.push({ ...r, cap: stockpile[r.key] > 0 ? maxTroopsFromResource(stockpile[r.key], costPerTroop[r.key]) : 0 })
      }
    }

    const finiteCaps = caps.filter(c => isFinite(c.cap))
    const resCap = hasRes && finiteCaps.length > 0 ? Math.min(...finiteCaps.map(c => c.cap)) : Infinity

    const maxTroops = Math.min(speedupCap === Infinity ? resCap : speedupCap, resCap)
    if (!isFinite(maxTroops) || maxTroops <= 0) return null

    // What's the actual bottleneck?
    const speedupIsLimit = speedupCap <= resCap
    const resBottleneck = finiteCaps.length > 0 ? finiteCaps.reduce((a, b) => a.cap < b.cap ? a : b) : null
    const bottleneckLabel = speedupIsLimit && speedupSecs ? 'Speedups' : (resBottleneck?.label ?? 'Resources')
    const bottleneckIcon  = speedupIsLimit ? null : (resBottleneck?.icon ?? null)

    const needed: Res = {
      food:  Math.ceil(maxTroops * costPerTroop.food),
      wood:  Math.ceil(maxTroops * costPerTroop.wood),
      stone: Math.ceil(maxTroops * costPerTroop.stone),
      gold:  Math.ceil(maxTroops * costPerTroop.gold),
    }

    // Surplus/deficit for each resource relative to what the speedup cap needs
    const surpluses = RES_META.filter(r => costPerTroop[r.key] > 0).map(r => {
      const forSpeedupCap = isFinite(speedupCap) ? Math.ceil(speedupCap * costPerTroop[r.key]) : null
      const have = stockpile[r.key]
      return { ...r, need: forSpeedupCap, have, surplus: forSpeedupCap != null ? have - forSpeedupCap : null }
    })

    const speedupNeeded = secsPerTroop > 0 ? fmtTime(applyHelps(maxTroops * secsPerTroop)) : null
    const allNeededEntered = RES_META.every(r => costPerTroop[r.key] === 0 || stockpile[r.key] > 0)
    const t5f = Math.max(0, Math.min(1, (parseFloat(t5Pct) || 0) / 100))
    const t5troops = Math.round(maxTroops * t5f), t4troops = maxTroops - t5troops
    const expectedKills = (tradeRatio && allNeededEntered && speedupSecs) ? Math.floor((t4troops + t5troops) * tradeRatio) : 0
    const expectedKP    = (tradeRatio && allNeededEntered && speedupSecs) ? Math.floor(t4troops * tradeRatio * KP_PER_UNIT.t4 + t5troops * tradeRatio * KP_PER_UNIT.t5) : 0

    return { maxTroops, speedupCap, resCap, speedupIsLimit, bottleneckLabel, bottleneckIcon, needed, caps, surpluses, secsPerTroop, costPerTroop, speedupNeeded, speedupNeededFull: speedupSecs ? fmtTime(speedupSecs) : null, expectedKills, expectedKP, allNeededEntered }
  }, [speedupSecs, stockpile, healSpd, costRed, focus, t5Pct, tradeRatio])

  const chartData = useMemo(() => {
    if (!result) return null
    const domain = Math.max(result.maxTroops * 1.8, 50_000)
    return buildScalingData(result.secsPerTroop, result.costPerTroop, stockpile, speedupSecs, domain)
  }, [result, stockpile, speedupSecs])

  const hasInputs = speedupSecs || stockpile.food || stockpile.wood || stockpile.stone || stockpile.gold

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Speedups</p>
          <SpeedupInput val={speedupVal} setVal={setSpeedupVal} unit={speedupUnit} setUnit={setSpeedupUnit} />
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Resources</p>
            <div className="grid grid-cols-2 gap-3">
              {RES_META.map(r => (
                <ResInput key={r.key} label={r.label} icon={r.icon}
                  value={r.key === 'food' ? sFood : r.key === 'wood' ? sWood : r.key === 'stone' ? sStone : sGold}
                  onChange={r.key === 'food' ? setSFood : r.key === 'wood' ? setSWood : r.key === 'stone' ? setSStone : setSGold} />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Troop Composition</p>
          <TroopCompositionInputs t5Pct={t5Pct} setT5Pct={setT5Pct} focus={focus} setFocus={setFocus} />
        </div>
      </div>

      {result ? (
        <div className="space-y-4">
          {/* What's limiting you */}
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${result.speedupIsLimit ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            {result.speedupIsLimit
              ? <Image src="/images/bundle/healing_speed.png" alt="" width={28} height={28} className="object-contain flex-shrink-0" />
              : result.bottleneckIcon
                ? <RokImg src={result.bottleneckIcon} alt={result.bottleneckLabel} size={28} />
                : <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${result.speedupIsLimit ? 'text-indigo-300' : 'text-red-300'}`}>
                {result.bottleneckLabel} is your limiting factor
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.speedupIsLimit
                  ? `Speedups cap you at ${fmt(result.speedupCap)} — you have enough resources for more`
                  : `Resources cap you at ${fmt(result.resCap)} — you have enough speedups for more`
                }
              </p>
            </div>
          </div>

          {/* Hero stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
              <div className="text-2xl font-bold text-primary">{fmt(result.maxTroops)}</div>
              <div className="text-xs text-muted-foreground mt-1">Max healable</div>
            </div>
            <div className={`rounded-xl border p-4 text-center ${result.speedupIsLimit ? 'border-red-500/25 bg-red-500/5' : 'border-border bg-card'}`}>
              <div className={`text-2xl font-bold ${result.speedupIsLimit ? 'text-red-300' : 'text-foreground'}`}>
                {isFinite(result.speedupCap) ? fmt(result.speedupCap) : '∞'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Speedup cap</div>
            </div>
            <div className={`rounded-xl border p-4 text-center ${!result.speedupIsLimit ? 'border-red-500/25 bg-red-500/5' : 'border-border bg-card'}`}>
              <div className={`text-2xl font-bold ${!result.speedupIsLimit ? 'text-red-300' : 'text-foreground'}`}>
                {isFinite(result.resCap) ? fmt(result.resCap) : '∞'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Resource cap</div>
            </div>
          </div>

          {/* Surplus / deficit table — for each resource, how much you need vs have */}
          {result.surpluses.some(s => s.need != null) && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Resources vs Speedup Cap ({fmt(isFinite(result.speedupCap) ? result.speedupCap : result.maxTroops)} troops)
              </p>
              <div className="space-y-2">
                {result.surpluses.filter(s => s.need != null).map(s => {
                  const surplus = s.surplus ?? 0
                  const isShort = surplus < 0
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <RokImg src={s.icon} alt={s.label} size={18} />
                      <span className="text-xs text-muted-foreground w-10">{s.label}</span>
                      <div className="flex-1 flex items-center gap-2 text-xs">
                        <span className="tabular-nums text-foreground">{fmt(s.have)}</span>
                        <span className="text-muted-foreground">have</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="tabular-nums text-muted-foreground">{s.need != null ? fmt(s.need) : '—'}</span>
                        <span className="text-muted-foreground">need</span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${isShort ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isShort ? `−${fmt(-surplus)}` : `+${fmt(surplus)}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {result.speedupNeeded && (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <Image src="/images/bundle/healing_speed.png" alt="" width={28} height={28} className="object-contain" />
              <div>
                <div className="text-xs text-muted-foreground">Speedups needed for {fmt(result.maxTroops)} troops</div>
                <div className="text-lg font-bold text-foreground">{result.speedupNeeded} <span className="text-sm font-normal text-muted-foreground">after 30 helps</span></div>
              </div>
            </div>
          )}

          {/* Combined scaling chart — the key view */}
          {chartData && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Speedups & Resources Together — % Used vs Troop Count
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Every line starts at 0% and climbs as troop count increases. The first to hit 100% is your limit.
              </p>
              <ScalingChart data={chartData} refTroops={result.maxTroops} />
            </div>
          )}

          {tradeRatio && result.expectedKP > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-xl font-bold">{fmt(result.expectedKills)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Enemy Kills</div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                <div className="text-xl font-bold text-primary">{fmt(result.expectedKP)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Kill Points</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
          {hasInputs
            ? 'Enter both speedups and at least one resource to compare them'
            : 'Enter your speedups and resources to see what limits you'}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Root                                                                */
/* ------------------------------------------------------------------ */

export function KvkHealingContent() {
  const [mode, setMode]               = useState<Mode>('cost')
  const [healSpd, setHealSpd]         = useState('90')
  const [costRed, setCostRed]         = useState('10')
  const [tradeRatio, setTradeRatio]   = useState<number | null>(null)

  const MODES: { id: Mode; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: 'cost',           icon: <Swords className="h-4 w-4" />,  label: 'Cost Calculator',    desc: 'Enter troops → get speedup & resource cost' },
    { id: 'from-speeds',    icon: <Zap className="h-4 w-4" />,     label: 'From Speedups',      desc: 'Enter speedups → max troops you can heal & resources needed' },
    { id: 'from-resources', icon: <Package className="h-4 w-4" />, label: 'From Resources',     desc: 'Enter resources → max troops you can heal & speedup needed' },
    { id: 'combined',       icon: <Swords className="h-4 w-4" />,  label: 'Speedups + Resources', desc: 'Enter both — see what limits you and how they balance against each other' },
  ]

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <Image src="/images/bundle/healing_speed.png" alt="" width={28} height={28} className="object-contain" />
          KvK Healing Calculator
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Work from what you know — troops, speedups, or resources — and see the full picture.
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`rounded-xl border p-3 text-left transition-all ${mode === m.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}>
            <div className={`flex items-center gap-2 mb-1 ${mode === m.id ? 'text-primary' : 'text-muted-foreground'}`}>
              {m.icon}
              <span className="text-xs font-bold">{m.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Global buffs only */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Healing Buffs</p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Healing Speed %</label>
            <input type="number" placeholder="90" value={healSpd} onChange={e => setHealSpd(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cost Reduction %</label>
            <input type="number" placeholder="10" value={costRed} onChange={e => setCostRed(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      </div>

      {/* Mode content */}
      {mode === 'cost'           && <ModeCost           healSpd={healSpd} costRed={costRed} tradeRatio={tradeRatio} />}
      {mode === 'from-speeds'    && <ModeFromSpeeds     healSpd={healSpd} costRed={costRed} tradeRatio={tradeRatio} />}
      {mode === 'from-resources' && <ModeFromResources  healSpd={healSpd} costRed={costRed} tradeRatio={tradeRatio} />}
      {mode === 'combined'       && <ModeCombined       healSpd={healSpd} costRed={costRed} tradeRatio={tradeRatio} />}

      {/* KD ratio — bottom */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Kill:Death Ratio <span className="normal-case font-normal opacity-50">— select to see expected KP in results above</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RATIO_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setTradeRatio(tradeRatio === opt.value ? null : opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition-all ${tradeRatio === opt.value ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
              {opt.display}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-2.5">
        Healing time shown after 30 alliance helps — each reduces remaining time by the greater of 1% or 3 minutes.
      </p>
    </div>
  )
}
