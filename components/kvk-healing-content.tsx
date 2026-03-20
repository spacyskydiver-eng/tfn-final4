'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Image from 'next/image'

/* ------------------------------------------------------------------ */
/*  Constants — BASE_TIME is in SECONDS per troop (exact from codex)   */
/* ------------------------------------------------------------------ */

const BASE_TIME_T4 = 3.0   // seconds per troop
const BASE_TIME_T5 = 4.0   // seconds per troop
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
  { label: 'Farm Killer', value: 3,   ratio: '3:1'   },
  { label: 'Optimistic',  value: 2,   ratio: '2:1'   },
  { label: 'Balanced',    value: 1,   ratio: '1:1'   },
  { label: 'Tanking',     value: 0.5, ratio: '0.5:1' },
]

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'siege'
const TROOP_TYPES: TroopType[] = ['infantry', 'cavalry', 'archer', 'siege']

const TROOP_ICONS: Record<'t4' | 't5', Record<TroopType, string>> = {
  t4: {
    infantry: '⚔️',
    cavalry:  '🐴',
    archer:   '🏹',
    siege:    '💣',
  },
  t5: {
    infantry: '⚔️',
    cavalry:  '🐴',
    archer:   '🏹',
    siege:    '💣',
  },
}

const TROOP_LABELS: Record<TroopType, string> = {
  infantry: 'Infantry',
  cavalry:  'Cavalry',
  archer:   'Archer',
  siege:    'Siege',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'k'
  return n.toLocaleString()
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

// Apply 30 alliance helps — each reduces time by max(1%, 180 s)
function applyHelps(baseSeconds: number): number {
  if (baseSeconds <= 0) return 0
  const original = Math.max(3, Math.ceil(baseSeconds))
  let temp = original
  for (let i = 0; i < HELP_COUNT; i++) {
    if (temp <= 0) break
    const reduction = Math.max(180, temp * 0.01)
    temp = Math.max(0, temp - reduction)
  }
  return Math.floor(temp)
}

/* ------------------------------------------------------------------ */
/*  Calculation                                                         */
/* ------------------------------------------------------------------ */

function parseCount(s: string): number {
  const v = parseInt(s.replace(/,/g, '').replace(/\D/g, '') || '0')
  return isNaN(v) ? 0 : v
}

interface CalcResult {
  totalTroops: number
  t4Total: number
  t5Total: number
  baseSeconds: number
  finalSeconds: number
  totalRes: { food: number; wood: number; stone: number; gold: number }
  expectedKills: number
  expectedKP: number
}

function calculate(
  counts: Record<'t4' | 't5', Record<TroopType, string>>,
  healingSpeed: number,
  costReduction: number,
  tradeRatio: number | null,
): CalcResult | null {
  const speedMult = 1 + healingSpeed / 100
  const costMult  = 1 - costReduction / 100

  let baseSeconds = 0
  const res = { food: 0, wood: 0, stone: 0, gold: 0 }
  let t4Total = 0
  let t5Total = 0
  let hasInput = false

  for (const type of TROOP_TYPES) {
    const c4 = parseCount(counts.t4[type])
    const c5 = parseCount(counts.t5[type])

    if (c4 > 0) {
      hasInput = true
      t4Total += c4
      baseSeconds += (BASE_TIME_T4 * c4) / speedMult
      res.food  += RESOURCES.t4[type].food  * c4 * costMult
      res.wood  += RESOURCES.t4[type].wood  * c4 * costMult
      res.stone += RESOURCES.t4[type].stone * c4 * costMult
      res.gold  += RESOURCES.t4[type].gold  * c4 * costMult
    }
    if (c5 > 0) {
      hasInput = true
      t5Total += c5
      baseSeconds += (BASE_TIME_T5 * c5) / speedMult
      res.food  += RESOURCES.t5[type].food  * c5 * costMult
      res.wood  += RESOURCES.t5[type].wood  * c5 * costMult
      res.stone += RESOURCES.t5[type].stone * c5 * costMult
      res.gold  += RESOURCES.t5[type].gold  * c5 * costMult
    }
  }

  if (!hasInput) return null

  const finalSeconds = applyHelps(baseSeconds)
  const totalRes = {
    food:  Math.ceil(res.food),
    wood:  Math.ceil(res.wood),
    stone: Math.ceil(res.stone),
    gold:  Math.ceil(res.gold),
  }

  let expectedKills = 0
  let expectedKP    = 0
  if (tradeRatio !== null) {
    const kills4 = t4Total * tradeRatio
    const kills5 = t5Total * tradeRatio
    expectedKills = Math.floor(kills4 + kills5)
    expectedKP    = Math.floor(kills4 * KP_PER_UNIT.t4 + kills5 * KP_PER_UNIT.t5)
  }

  return {
    totalTroops: t4Total + t5Total,
    t4Total,
    t5Total,
    baseSeconds,
    finalSeconds,
    totalRes,
    expectedKills,
    expectedKP,
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function RokIcon({ src, alt, size = 22 }: { src: string; alt: string; size?: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
    />
  )
}

function ResourceRow({
  icon, label, value,
}: { icon: string; label: string; value: number }) {
  if (value <= 0) return null
  return (
    <div className="flex items-center gap-2.5">
      <RokIcon src={icon} alt={label} size={26} />
      <span className="text-foreground font-semibold text-base tabular-nums">{formatNumber(value)}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

function TroopInput({
  tier, type, value, onChange,
}: {
  tier: 't4' | 't5'
  type: TroopType
  value: string
  onChange: (v: string) => void
}) {
  const isT5 = tier === 't5'
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 border ${isT5 ? 'border-violet-500/30 bg-violet-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
      <span className="text-lg">{TROOP_ICONS[tier][type]}</span>
      <span className="text-[10px] text-muted-foreground font-medium">{TROOP_LABELS[type]}</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(e) => {
          let v = e.target.value.replace(/,/g, '').replace(/\D/g, '')
          if (v) v = parseInt(v).toLocaleString()
          onChange(v)
        }}
        className="w-full text-center text-sm font-semibold bg-transparent border-0 border-b border-border/50 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/40 pb-0.5"
      />
    </div>
  )
}

function NumberInput({
  label, value, onChange, placeholder, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <div className="relative">
        <input
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  )
}

/* Resource bar chart */
function ResourceChart({ totalRes }: { totalRes: { food: number; wood: number; stone: number; gold: number } }) {
  const data = [
    { name: 'Food',  value: totalRes.food,  fill: '#f59e0b' },
    { name: 'Wood',  value: totalRes.wood,  fill: '#10b981' },
    { name: 'Stone', value: totalRes.stone, fill: '#6b7280' },
    { name: 'Gold',  value: totalRes.gold,  fill: '#fbbf24' },
  ].filter(d => d.value > 0)

  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(d => d.value))

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resource Breakdown</p>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10 text-right">{d.name}</span>
            <div className="flex-1 bg-secondary/40 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: d.fill }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground tabular-nums w-14 text-right">{formatNumber(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

type CountsState = Record<'t4' | 't5', Record<TroopType, string>>

const EMPTY_COUNTS: CountsState = {
  t4: { infantry: '', cavalry: '', archer: '', siege: '' },
  t5: { infantry: '', cavalry: '', archer: '', siege: '' },
}

export function KvkHealingContent() {
  const [counts, setCounts]           = useState<CountsState>(EMPTY_COUNTS)
  const [healingSpeed, setHealingSpeed] = useState('90')
  const [costReduction, setCostReduction] = useState('10')
  const [tradeRatio, setTradeRatio]   = useState<number | null>(null)

  const result = useMemo(() => calculate(
    counts,
    parseFloat(healingSpeed) || 0,
    parseFloat(costReduction) || 0,
    tradeRatio,
  ), [counts, healingSpeed, costReduction, tradeRatio])

  const setCount = (tier: 't4' | 't5', type: TroopType, v: string) => {
    setCounts(prev => ({ ...prev, [tier]: { ...prev[tier], [type]: v } }))
  }

  const reset = () => {
    setCounts(EMPTY_COUNTS)
    setTradeRatio(null)
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RokIcon src="/images/bundle/healing_speed.png" alt="Healing" size={28} />
            KvK Healing Calculator
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Enter troops wounded — get exact speedup time and resource cost.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ---- Left: Inputs ---- */}
        <div className="lg:col-span-3 space-y-5">

          {/* Buffs */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Buffs</p>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="Healing Speed (%)"
                value={healingSpeed}
                onChange={setHealingSpeed}
                placeholder="90"
                suffix="%"
              />
              <NumberInput
                label="Resource Cost Reduction (%)"
                value={costReduction}
                onChange={setCostReduction}
                placeholder="10"
                suffix="%"
              />
            </div>
          </div>

          {/* T4 troops */}
          <div className="rounded-xl border border-amber-500/25 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tier 4 Troops Wounded</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TROOP_TYPES.map(type => (
                <TroopInput
                  key={type}
                  tier="t4"
                  type={type}
                  value={counts.t4[type]}
                  onChange={(v) => setCount('t4', type, v)}
                />
              ))}
            </div>
          </div>

          {/* T5 troops */}
          <div className="rounded-xl border border-violet-500/25 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Tier 5 Troops Wounded</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TROOP_TYPES.map(type => (
                <TroopInput
                  key={type}
                  tier="t5"
                  type={type}
                  value={counts.t5[type]}
                  onChange={(v) => setCount('t5', type, v)}
                />
              ))}
            </div>
          </div>

          {/* Trade ratio */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KP Trade Ratio <span className="normal-case font-normal">(optional)</span></p>
            <div className="grid grid-cols-4 gap-2">
              {RATIO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTradeRatio(tradeRatio === opt.value ? null : opt.value)}
                  className={`rounded-lg border py-2.5 px-1 text-center transition-all ${
                    tradeRatio === opt.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-bold text-sm">{opt.ratio}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Right: Results ---- */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 h-full">
            {result ? (
              <div className="space-y-5">
                {/* Speedup time — hero stat */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Healing Time Needed</p>
                  <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
                    <RokIcon src="/images/bundle/healing_speed.png" alt="Speedup" size={32} />
                    <div>
                      <div className="text-xl font-bold text-primary">{formatTime(result.finalSeconds)}</div>
                      <div className="text-xs text-muted-foreground">after 30 alliance helps</div>
                    </div>
                  </div>
                  {result.baseSeconds > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-1">
                      Base time: {formatTime(Math.ceil(result.baseSeconds))}
                    </p>
                  )}
                </div>

                {/* Resources */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resources Required</p>
                  <div className="space-y-2.5">
                    <ResourceRow icon="/images/bundle/food.png"  label="Food"  value={result.totalRes.food}  />
                    <ResourceRow icon="/images/bundle/wood.png"  label="Wood"  value={result.totalRes.wood}  />
                    <ResourceRow icon="/images/bundle/stone.png" label="Stone" value={result.totalRes.stone} />
                    <ResourceRow icon="/images/bundle/gold.png"  label="Gold"  value={result.totalRes.gold}  />
                  </div>
                  <ResourceChart totalRes={result.totalRes} />
                </div>

                {/* Troop summary */}
                <div className="rounded-lg bg-secondary/30 px-3 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{result.totalTroops.toLocaleString()} total troops</span>
                  <span className="flex gap-3">
                    {result.t4Total > 0 && <span className="text-amber-400">{result.t4Total.toLocaleString()} T4</span>}
                    {result.t5Total > 0 && <span className="text-violet-400">{result.t5Total.toLocaleString()} T5</span>}
                  </span>
                </div>

                {/* KP */}
                {tradeRatio !== null && result.expectedKills > 0 && (
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Outcome</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-secondary/30 px-3 py-2.5 text-center">
                        <div className="text-lg font-bold text-foreground">{formatNumber(result.expectedKills)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Enemy Kills</div>
                      </div>
                      <div className="rounded-lg bg-secondary/30 px-3 py-2.5 text-center">
                        <div className="text-lg font-bold text-primary">{formatNumber(result.expectedKP)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Kill Points</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                <RokIcon src="/images/bundle/healing_speed.png" alt="Healing" size={40} />
                <div>
                  <p className="text-sm font-medium text-foreground">Enter your wounded troops</p>
                  <p className="text-xs text-muted-foreground mt-1">Results update instantly as you type</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-2.5">
        <span className="font-medium text-foreground">How it works:</span> Healing time is calculated per troop using your healing speed buff, then all 30 alliance helps are applied — each reduces remaining time by the greater of 1% or 3 minutes.
      </p>
    </div>
  )
}
