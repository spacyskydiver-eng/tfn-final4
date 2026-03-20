'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  Heart,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Swords,
  Shield,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants — exact from codexhelper HealingCalculator.svelte        */
/* ------------------------------------------------------------------ */

const BASE_TIME_T4 = 3.0 // hours per troop
const BASE_TIME_T5 = 4.0 // hours per troop
const HELP_COUNT   = 30  // max alliance helps

const HEALING_COSTS = {
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

const TRADE_RATIOS = [
  { label: 'Farm Killer', value: 3,   display: '3:1'   },
  { label: 'Optimistic',  value: 2,   display: '2:1'   },
  { label: 'Balanced',    value: 1,   display: '1:1'   },
  { label: 'Tanking',     value: 0.5, display: '0.5:1' },
]

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'siege'
const TROOP_TYPES: TroopType[] = ['infantry', 'cavalry', 'archer', 'siege']

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'k'
  return n.toLocaleString()
}

function formatTime(totalHours: number): string {
  const totalSecs = Math.floor(totalHours * 3600)
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push('< 1m')
  return parts.join(' ')
}

// Apply 30 alliance helps: each help reduces time by max(1%, 180 seconds)
// Exact logic from codexhelper HealingCalculator.svelte lines 114-118
function applyHelps(baseSeconds: number): number {
  const original = Math.max(3, Math.ceil(baseSeconds))
  let temp = original
  for (let i = 0; i < HELP_COUNT; i++) {
    if (temp <= 0) break
    const reduction = Math.max(180, temp * 0.01)
    temp = Math.max(0, temp - reduction)
  }
  return Math.floor(temp)
}

// Parse speedup input: "3d 12h", "84:00", "5040" (minutes), "3.5" (days mode)
function parseSpeedupHours(raw: string, mode: 'auto' | 'days' | 'hours'): number {
  if (!raw.trim()) return 0
  const s = raw.trim()

  if (mode === 'days')  { const v = parseFloat(s); return isNaN(v) ? 0 : v * 24 }
  if (mode === 'hours') { const v = parseFloat(s); return isNaN(v) ? 0 : v }

  // auto
  const timeMatch = s.match(/(\d+):(\d+)(?::(\d+))?/)
  if (timeMatch) return parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60

  let total = 0
  const d = s.match(/(\d+)\s*d/i); if (d) total += parseInt(d[1]) * 24
  const h = s.match(/(\d+)\s*h/i); if (h) total += parseInt(h[1])
  const m = s.match(/(\d+)\s*m/i); if (m) total += parseInt(m[1]) / 60
  if (total === 0 && /^\d+(\.\d+)?$/.test(s)) total = parseFloat(s) / 60 // plain = minutes
  return total
}

/* ------------------------------------------------------------------ */
/*  Core calculation                                                    */
/* ------------------------------------------------------------------ */

interface TroopCounts {
  t4: Record<TroopType, number>
  t5: Record<TroopType, number>
}

interface Resources { food: number; wood: number; stone: number; gold: number }

interface CalcResult {
  totalTroops: number
  t4Total: number
  t5Total: number
  // Raw resources needed (before checking stockpile)
  needed: Resources
  // Healing time in hours (base, before helps)
  baseHours: number
  // Healing time in hours (after 30 helps)
  afterHelpsHours: number
  // Speedup hours needed
  speedupHoursNeeded: number
  // Deficit per resource (negative = short)
  deficit: Resources
  // How many troops limited by each resource
  troopCapByResource: { food: number; wood: number; stone: number; gold: number }
  // Binding constraint
  bottleneck: 'food' | 'wood' | 'stone' | 'gold' | 'speedups' | 'none'
  maxTroopsAffordable: number
  // KP
  expectedKills: number
  expectedKP: number
}

function calcHealing(
  troops: TroopCounts,
  healingSpeed: number,
  costReduction: number,
  stockpile: Resources,
  speedupHoursAvailable: number,
  tradeRatio: number | null,
): CalcResult {
  const speedMult = 1 + healingSpeed / 100
  const costMult  = 1 - costReduction / 100

  let totalBaseSeconds = 0
  const needed: Resources = { food: 0, wood: 0, stone: 0, gold: 0 }
  let t4Total = 0
  let t5Total = 0

  for (const type of TROOP_TYPES) {
    const c4 = troops.t4[type]
    const c5 = troops.t5[type]
    if (c4 > 0) {
      totalBaseSeconds += (BASE_TIME_T4 * 3600 * c4) / speedMult
      needed.food  += HEALING_COSTS.t4[type].food  * c4 * costMult
      needed.wood  += HEALING_COSTS.t4[type].wood  * c4 * costMult
      needed.stone += HEALING_COSTS.t4[type].stone * c4 * costMult
      needed.gold  += HEALING_COSTS.t4[type].gold  * c4 * costMult
      t4Total += c4
    }
    if (c5 > 0) {
      totalBaseSeconds += (BASE_TIME_T5 * 3600 * c5) / speedMult
      needed.food  += HEALING_COSTS.t5[type].food  * c5 * costMult
      needed.wood  += HEALING_COSTS.t5[type].wood  * c5 * costMult
      needed.stone += HEALING_COSTS.t5[type].stone * c5 * costMult
      needed.gold  += HEALING_COSTS.t5[type].gold  * c5 * costMult
      t5Total += c5
    }
  }

  // Round resource needs
  needed.food  = Math.ceil(needed.food)
  needed.wood  = Math.ceil(needed.wood)
  needed.stone = Math.ceil(needed.stone)
  needed.gold  = Math.ceil(needed.gold)

  const totalTroops = t4Total + t5Total

  // After-helps seconds
  const afterHelpsSeconds = applyHelps(totalBaseSeconds)
  const baseHours       = totalBaseSeconds / 3600
  const afterHelpsHours = afterHelpsSeconds / 3600
  const speedupHoursNeeded = afterHelpsHours

  // Resource deficits
  const deficit: Resources = {
    food:  stockpile.food  - needed.food,
    wood:  stockpile.wood  - needed.wood,
    stone: stockpile.stone - needed.stone,
    gold:  stockpile.gold  - needed.gold,
  }

  // Troops affordable per resource
  // For each resource, find how many troops (at average cost) we can support
  const avgCostPerTroop = (res: keyof Resources) => {
    if (totalTroops === 0) return 0
    return needed[res] / totalTroops
  }
  const troopCapByResource = {
    food:  avgCostPerTroop('food')  > 0 ? Math.floor(stockpile.food  / avgCostPerTroop('food'))  : Infinity,
    wood:  avgCostPerTroop('wood')  > 0 ? Math.floor(stockpile.wood  / avgCostPerTroop('wood'))  : Infinity,
    stone: avgCostPerTroop('stone') > 0 ? Math.floor(stockpile.stone / avgCostPerTroop('stone')) : Infinity,
    gold:  avgCostPerTroop('gold')  > 0 ? Math.floor(stockpile.gold  / avgCostPerTroop('gold'))  : Infinity,
  }

  // Troops affordable by speedups
  const avgSecondsPerTroop = totalTroops > 0 ? totalBaseSeconds / totalTroops : 0
  const speedupTroopCap = avgSecondsPerTroop > 0
    ? Math.floor((speedupHoursAvailable * 3600 * speedMult) / avgSecondsPerTroop)
    : Infinity

  const maxTroopsAffordable = Math.min(
    totalTroops,
    troopCapByResource.food,
    troopCapByResource.wood,
    troopCapByResource.stone,
    troopCapByResource.gold,
    speedupTroopCap,
  )

  // Find bottleneck
  let bottleneck: CalcResult['bottleneck'] = 'none'
  if (totalTroops > 0) {
    const caps = [
      { key: 'food'     as const, cap: troopCapByResource.food  },
      { key: 'wood'     as const, cap: troopCapByResource.wood  },
      { key: 'stone'    as const, cap: troopCapByResource.stone },
      { key: 'gold'     as const, cap: troopCapByResource.gold  },
      { key: 'speedups' as const, cap: speedupTroopCap          },
    ]
    const binding = caps.filter((c) => c.cap < totalTroops)
    if (binding.length > 0) {
      bottleneck = binding.reduce((a, b) => a.cap < b.cap ? a : b).key
    }
  }

  // KP
  let expectedKills = 0
  let expectedKP    = 0
  if (tradeRatio !== null && totalTroops > 0) {
    expectedKills = Math.floor((t4Total + t5Total) * tradeRatio)
    expectedKP    = Math.floor(t4Total * tradeRatio * KP_PER_UNIT.t4 + t5Total * tradeRatio * KP_PER_UNIT.t5)
  }

  return {
    totalTroops, t4Total, t5Total,
    needed, baseHours, afterHelpsHours, speedupHoursNeeded,
    deficit, troopCapByResource, bottleneck, maxTroopsAffordable,
    expectedKills, expectedKP,
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ResourceBar({
  label, needed, available, color,
}: { label: string; needed: number; available: number; color: string }) {
  const hasStockpile = available > 0
  const pct = hasStockpile ? Math.min(100, (available / needed) * 100) : 0
  const ok  = available >= needed

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={ok ? 'text-green-400' : 'text-red-400'}>
          {formatNumber(available)} / {formatNumber(needed)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: ok ? '#4ade80' : color }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

const emptyTroops = (): Record<TroopType, number> => ({
  infantry: 0, cavalry: 0, archer: 0, siege: 0,
})

const RESOURCE_COLORS = {
  food:  '#4ade80',
  wood:  '#a78bfa',
  stone: '#60a5fa',
  gold:  '#facc15',
}

const TROOP_LABELS: Record<TroopType, string> = {
  infantry: '🛡 Infantry',
  cavalry:  '⚔ Cavalry',
  archer:   '🏹 Archer',
  siege:    '💣 Siege',
}

export function KvkHealingContent() {
  // Buffs
  const [healingSpeed,   setHealingSpeed]   = useState('')
  const [costReduction,  setCostReduction]  = useState('')

  // Troops
  const [t4, setT4] = useState<Record<TroopType, number>>(emptyTroops())
  const [t5, setT5] = useState<Record<TroopType, number>>(emptyTroops())

  // Stockpile
  const [stockpile, setStockpile] = useState<Resources>({ food: 0, wood: 0, stone: 0, gold: 0 })
  const [showStockpile, setShowStockpile] = useState(true)

  // Speedups
  const [speedupStr,  setSpeedupStr]  = useState('')
  const [speedupMode, setSpeedupMode] = useState<'auto' | 'days' | 'hours'>('auto')

  // KP section
  const [showKP, setShowKP] = useState(false)
  const [tradeRatio, setTradeRatio] = useState<number | null>(null)

  const speedupHours = useMemo(
    () => parseSpeedupHours(speedupStr, speedupMode),
    [speedupStr, speedupMode],
  )

  const result = useMemo(() => {
    const troops: TroopCounts = { t4, t5 }
    const hs  = parseFloat(healingSpeed)  || 0
    const cr  = parseFloat(costReduction) || 0
    return calcHealing(troops, hs, cr, stockpile, speedupHours, tradeRatio)
  }, [t4, t5, healingSpeed, costReduction, stockpile, speedupHours, tradeRatio])

  const hasTroops  = result.totalTroops > 0
  const hasStockpile = stockpile.food > 0 || stockpile.wood > 0 || stockpile.stone > 0 || stockpile.gold > 0
  const hasSpeedups  = speedupHours > 0

  function setTroop(tier: 't4' | 't5', type: TroopType, raw: string) {
    const n = Math.max(0, parseInt(raw.replace(/\D/g, '')) || 0)
    if (tier === 't4') setT4((p) => ({ ...p, [type]: n }))
    else               setT5((p) => ({ ...p, [type]: n }))
  }

  function setRes(key: keyof Resources, raw: string) {
    const n = Math.max(0, parseInt(raw.replace(/[^0-9]/g, '')) || 0)
    setStockpile((p) => ({ ...p, [key]: n }))
  }

  // Chart data: resource comparison
  const resourceChartData = (['food', 'wood', 'stone', 'gold'] as const).map((res) => ({
    name: res.charAt(0).toUpperCase() + res.slice(1),
    Needed:    result.needed[res],
    Available: stockpile[res],
    color: RESOURCE_COLORS[res],
  })).filter((d) => d.Needed > 0 || d.Available > 0)

  const bottleneckLabel: Record<string, string> = {
    food: '🌾 Food', wood: '🪵 Wood', stone: '🪨 Stone',
    gold: '💰 Gold', speedups: '⚡ Speedups', none: '',
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-400" />
          KvK Healing Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your wounded troops to see exactly how much resources and speedups you need — and which one runs out first.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ============================================================ */}
        {/*  Left column: inputs                                          */}
        {/* ============================================================ */}
        <div className="xl:col-span-2 space-y-4">

          {/* Buffs */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Your Buffs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Healing Speed (%)</Label>
                  <Input
                    type="number" min={0} max={500}
                    value={healingSpeed}
                    onChange={(e) => setHealingSpeed(e.target.value)}
                    placeholder="e.g. 90"
                    className="bg-background border-border"
                  />
                  <p className="text-[10px] text-muted-foreground">From research, commanders, equipment</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Resource Cost Reduction (%)</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={costReduction}
                    onChange={(e) => setCostReduction(e.target.value)}
                    placeholder="e.g. 10"
                    className="bg-background border-border"
                  />
                  <p className="text-[10px] text-muted-foreground">From research &amp; buffs</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-400" />
                Speedup time shown assumes maximum 30 alliance helps applied — each help reduces time by 1% (min 180s).
              </div>
            </CardContent>
          </Card>

          {/* Troop Counts */}
          {(['t4', 't5'] as const).map((tier) => {
            const counts   = tier === 't4' ? t4 : t5
            const total    = Object.values(counts).reduce((a, b) => a + b, 0)
            const tierCost = tier === 't4' ? HEALING_COSTS.t4 : HEALING_COSTS.t5
            return (
              <Card key={tier} className={`bg-card border-border ${tier === 't4' ? 'border-blue-500/20' : 'border-purple-500/20'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${tier === 't4' ? 'text-blue-400' : 'text-purple-400'}`}>
                    <Shield className="h-4 w-4" />
                    {tier.toUpperCase()} Wounded Troops
                    {total > 0 && (
                      <span className={`ml-auto text-xs font-normal rounded-full px-2 py-0.5 ${tier === 't4' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {total.toLocaleString()} total
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TROOP_TYPES.map((type) => {
                      const cost = tierCost[type]
                      return (
                        <div key={type} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{TROOP_LABELS[type]}</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={counts[type] || ''}
                            onChange={(e) => setTroop(tier, type, e.target.value)}
                            placeholder="0"
                            className="bg-background border-border font-mono"
                          />
                          <p className="text-[9px] text-muted-foreground/60 leading-tight">
                            {[
                              cost.food  > 0 ? `🌾${formatNumber(cost.food)}`  : '',
                              cost.wood  > 0 ? `🪵${formatNumber(cost.wood)}`  : '',
                              cost.stone > 0 ? `🪨${formatNumber(cost.stone)}` : '',
                              `💰${formatNumber(cost.gold)}`,
                            ].filter(Boolean).join(' ')} /troop
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Speedups */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Healing Speedups Available
                {speedupHours > 0 && (
                  <span className="ml-auto text-xs font-normal text-blue-400 bg-blue-500/20 rounded-full px-2 py-0.5">
                    {formatTime(speedupHours)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Time available</Label>
                <div className="flex gap-0.5 bg-secondary rounded-md p-0.5">
                  {(['auto', 'days', 'hours'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSpeedupMode(m)}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                        speedupMode === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                value={speedupStr}
                onChange={(e) => setSpeedupStr(e.target.value)}
                placeholder={
                  speedupMode === 'days'  ? 'e.g. 14 (days)' :
                  speedupMode === 'hours' ? 'e.g. 336 (hours)' :
                  'e.g. 14d 6h  or  340  or  14:06:00'
                }
                className="bg-background border-border font-mono"
              />
              {speedupHours > 0 && (
                <p className="text-xs text-blue-400">= {formatTime(speedupHours)} of healing speedups</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Include universal + healing speedups. Healing speedups only work on troop healing.
              </p>
            </CardContent>
          </Card>

          {/* Stockpile */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Info className="h-4 w-4 text-green-400" />
                  Current Resource Stockpile
                  <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">(optional — shows what you can afford)</span>
                </CardTitle>
                <button onClick={() => setShowStockpile((v) => !v)} className="text-muted-foreground hover:text-foreground">
                  {showStockpile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </CardHeader>
            {showStockpile && (
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['food', 'wood', 'stone', 'gold'] as const).map((res) => (
                    <div key={res} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground capitalize">
                        {{ food: '🌾 Food', wood: '🪵 Wood', stone: '🪨 Stone', gold: '💰 Gold' }[res]}
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={stockpile[res] || ''}
                        onChange={(e) => setRes(res, e.target.value)}
                        placeholder="0"
                        className="bg-background border-border font-mono"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* KP section */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Swords className="h-4 w-4 text-orange-400" />
                  Expected Kill Points
                  <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">(optional)</span>
                </CardTitle>
                <button onClick={() => setShowKP((v) => !v)} className="text-muted-foreground hover:text-foreground">
                  {showKP ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </CardHeader>
            {showKP && (
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Select your expected trade ratio to estimate kill points earned from this battle.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TRADE_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setTradeRatio(tradeRatio === r.value ? null : r.value)}
                      className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-all ${
                        tradeRatio === r.value
                          ? 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                          : 'border-border hover:border-orange-500/30 text-muted-foreground'
                      }`}
                    >
                      <div className="font-bold text-xs">{r.label}</div>
                      <div className="text-[10px] opacity-70">{r.display}</div>
                    </button>
                  ))}
                </div>
                {tradeRatio !== null && hasTroops && (
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Enemy Kills</p>
                      <p className="text-xl font-bold text-orange-300">{result.expectedKills.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Kill Points Earned</p>
                      <p className="text-xl font-bold text-yellow-400">{formatNumber(result.expectedKP)}</p>
                      <p className="text-[10px] text-muted-foreground">T4×10 + T5×20 per unit</p>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* ============================================================ */}
        {/*  Right column: results                                        */}
        {/* ============================================================ */}
        <div className="space-y-4">
          {!hasTroops ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Heart className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Enter your wounded troop counts to see the healing plan.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Healing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Total Wounded</p>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {result.totalTroops.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {result.t4Total > 0 && `T4: ${result.t4Total.toLocaleString()}`}
                        {result.t4Total > 0 && result.t5Total > 0 && ' · '}
                        {result.t5Total > 0 && `T5: ${result.t5Total.toLocaleString()}`}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Time to Heal</p>
                      <p className="text-lg font-bold text-blue-400">{formatTime(result.afterHelpsHours)}</p>
                      <p className="text-[10px] text-muted-foreground">with 30 helps</p>
                    </div>
                  </div>

                  {/* Speedup check */}
                  {hasSpeedups && (
                    <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 ${
                      speedupHours >= result.speedupHoursNeeded
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      {speedupHours >= result.speedupHoursNeeded
                        ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      }
                      <div className="text-xs">
                        <span className="font-medium text-foreground">Speedups: </span>
                        <span className={speedupHours >= result.speedupHoursNeeded ? 'text-green-400' : 'text-red-400'}>
                          {formatTime(speedupHours)} available · {formatTime(result.speedupHoursNeeded)} needed
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottleneck */}
                  {result.bottleneck !== 'none' && (hasStockpile || hasSpeedups) && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-semibold text-yellow-300">Bottleneck: {bottleneckLabel[result.bottleneck]}</span>
                        <br />
                        <span className="text-muted-foreground">
                          You can fully heal {result.maxTroopsAffordable.toLocaleString()} of {result.totalTroops.toLocaleString()} troops with what you have.
                        </span>
                      </div>
                    </div>
                  )}

                  {result.bottleneck === 'none' && (hasStockpile || hasSpeedups) && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      <p className="text-xs text-green-300 font-medium">You have enough resources and speedups to heal everything.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resources needed */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Resources Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['food', 'wood', 'stone', 'gold'] as const)
                    .filter((r) => result.needed[r] > 0)
                    .map((res) => (
                      <div key={res}>
                        {hasStockpile ? (
                          <ResourceBar
                            label={{ food: '🌾 Food', wood: '🪵 Wood', stone: '🪨 Stone', gold: '💰 Gold' }[res]}
                            needed={result.needed[res]}
                            available={stockpile[res]}
                            color={RESOURCE_COLORS[res]}
                          />
                        ) : (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {{ food: '🌾 Food', wood: '🪵 Wood', stone: '🪨 Stone', gold: '💰 Gold' }[res]}
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {formatNumber(result.needed[res])}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Resource comparison chart — full width */}
      {hasTroops && hasStockpile && resourceChartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Resources: Available vs Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resourceChartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={52}
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Available" fill="#4ade80" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Needed"    fill="#f87171" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-2">
              Green bar longer than red = you have enough. Red bar longer = you're short. This is the ratio the streamer described.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
