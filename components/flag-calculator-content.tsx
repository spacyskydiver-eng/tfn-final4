'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Flag,
  Wheat,
  TreePine,
  Mountain,
  Coins,
  Gem,
  CreditCard,
  Zap,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  BarChart3,
  Target,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Core Algorithm (exact spec)                                         */
/* ------------------------------------------------------------------ */

const ARCH1_DISCOUNT = [0, 0.01, 0.025, 0.04, 0.06, 0.10]
const ARCH2_DISCOUNT = [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.075, 0.09, 0.11, 0.15]

interface FlagCost {
  food: number
  wood: number
  stone: number
  gold: number
  crystals: number
  credits: number
}

function getFlagCost(flagNumber: number, discount: number): FlagCost {
  const mult = 1 - discount
  const tier20 = Math.floor((flagNumber - 1) / 20)
  const baseFood = 100_000 + 25_000 * tier20
  return {
    food: Math.round(baseFood * mult),
    wood: Math.round(baseFood * mult),
    stone: Math.round(baseFood * 0.75 * mult),
    gold: Math.round(baseFood * 0.5 * mult),
    crystals:
      flagNumber <= 20
        ? 0
        : Math.round(5_000 * Math.floor((flagNumber - 1) / 10) * mult),
    credits:
      flagNumber <= 10
        ? Math.round(100_000 * mult)
        : flagNumber <= 20
        ? Math.round(200_000 * mult)
        : 0,
  }
}

/* ------------------------------------------------------------------ */
/*  Number Formatting Helpers                                           */
/* ------------------------------------------------------------------ */

function parseResourceInput(val: string): number {
  const trimmed = val.trim().toUpperCase().replace(/,/g, '')
  if (!trimmed) return 0
  const numPart = parseFloat(trimmed)
  if (isNaN(numPart)) return 0
  if (trimmed.endsWith('B')) return Math.round(numPart * 1_000_000_000)
  if (trimmed.endsWith('M')) return Math.round(numPart * 1_000_000)
  if (trimmed.endsWith('K')) return Math.round(numPart * 1_000)
  return Math.round(numPart)
}

function formatResourceDisplay(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'B'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.?0+$/, '') + 'K'
  return n.toLocaleString()
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ResourceKey = 'food' | 'wood' | 'stone' | 'gold' | 'crystals' | 'credits'

interface ResourceSet {
  food: string
  wood: string
  stone: string
  gold: string
  crystals: string
  credits: string
}

const EMPTY_RESOURCES: ResourceSet = {
  food: '',
  wood: '',
  stone: '',
  gold: '',
  crystals: '',
  credits: '',
}

const RESOURCE_META: { key: ResourceKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'food', label: 'Food', icon: <Wheat className="h-3.5 w-3.5" />, color: 'text-yellow-400' },
  { key: 'wood', label: 'Wood', icon: <TreePine className="h-3.5 w-3.5" />, color: 'text-green-400' },
  { key: 'stone', label: 'Stone', icon: <Mountain className="h-3.5 w-3.5" />, color: 'text-slate-400' },
  { key: 'gold', label: 'Gold', icon: <Coins className="h-3.5 w-3.5" />, color: 'text-amber-400' },
  { key: 'crystals', label: 'Crystals', icon: <Gem className="h-3.5 w-3.5" />, color: 'text-cyan-400' },
  { key: 'credits', label: 'Credits', icon: <CreditCard className="h-3.5 w-3.5" />, color: 'text-purple-400' },
]

/* ------------------------------------------------------------------ */
/*  Calculation Logic                                                   */
/* ------------------------------------------------------------------ */

interface CalcResult {
  flagsAffordable: number
  bottleneck: ResourceKey | null
  costs: Array<{ flagNumber: number; cost: FlagCost }>
}

function calcFlagsRightNow(
  currentFlags: number,
  available: Record<ResourceKey, number>,
  discount: number,
  caps: Record<ResourceKey, number> | null
): CalcResult {
  const effective = caps
    ? ({
        food: Math.min(available.food, caps.food),
        wood: Math.min(available.wood, caps.wood),
        stone: Math.min(available.stone, caps.stone),
        gold: Math.min(available.gold, caps.gold),
        crystals: Math.min(available.crystals, caps.crystals),
        credits: Math.min(available.credits, caps.credits),
      } as Record<ResourceKey, number>)
    : { ...available }

  const remaining = { ...effective }
  let count = 0
  const costs: Array<{ flagNumber: number; cost: FlagCost }> = []

  for (let i = currentFlags + 1; i <= currentFlags + 500; i++) {
    const cost = getFlagCost(i, discount)
    if (costs.length < 10) costs.push({ flagNumber: i, cost })

    const canAfford =
      remaining.food >= cost.food &&
      remaining.wood >= cost.wood &&
      remaining.stone >= cost.stone &&
      remaining.gold >= cost.gold &&
      remaining.crystals >= cost.crystals &&
      remaining.credits >= cost.credits

    if (!canAfford) break

    remaining.food -= cost.food
    remaining.wood -= cost.wood
    remaining.stone -= cost.stone
    remaining.gold -= cost.gold
    remaining.crystals -= cost.crystals
    remaining.credits -= cost.credits
    count++
  }

  // Find bottleneck: which resource would run out first for the next flag
  const nextFlagNumber = currentFlags + count + 1
  const nextCost = getFlagCost(nextFlagNumber, discount)
  let bottleneck: ResourceKey | null = null
  let worstRatio = Infinity

  for (const key of Object.keys(nextCost) as ResourceKey[]) {
    const cost = nextCost[key]
    if (cost <= 0) continue
    const ratio = remaining[key] / cost
    if (ratio < worstRatio) {
      worstRatio = ratio
      bottleneck = key
    }
  }

  return { flagsAffordable: count, bottleneck, costs }
}

function calcFlagsByTargetTime(
  currentFlags: number,
  available: Record<ResourceKey, number>,
  production: Record<ResourceKey, number>,
  targetDate: Date,
  discount: number,
  caps: Record<ResourceKey, number> | null
): CalcResult {
  const now = new Date()
  const hoursUntil = Math.max(0, (targetDate.getTime() - now.getTime()) / 3_600_000)

  const totalAvailable: Record<ResourceKey, number> = {} as Record<ResourceKey, number>
  for (const key of Object.keys(available) as ResourceKey[]) {
    const gained = production[key] * hoursUntil
    const total = available[key] + gained
    totalAvailable[key] = caps ? Math.min(total, caps[key]) : total
  }

  return calcFlagsRightNow(currentFlags, totalAvailable, discount, null)
}

/* ------------------------------------------------------------------ */
/*  Resource Input Row                                                  */
/* ------------------------------------------------------------------ */

function ResourceInputRow({
  meta,
  value,
  onChange,
  placeholder,
  highlight,
}: {
  meta: (typeof RESOURCE_META)[number]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 w-24 shrink-0 ${meta.color}`}>
        {meta.icon}
        <span className="text-sm font-medium text-foreground">{meta.label}</span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        className={`bg-secondary border-border flex-1 ${
          highlight ? 'border-amber-500/60 ring-1 ring-amber-500/30' : ''
        }`}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                         */
/* ------------------------------------------------------------------ */

export function FlagCalculatorContent() {
  // Settings
  const [currentFlags, setCurrentFlags] = useState('0')
  const [arch1Level, setArch1Level] = useState('0')
  const [arch2Level, setArch2Level] = useState('0')

  // Resources
  const [resources, setResources] = useState<ResourceSet>({ ...EMPTY_RESOURCES })
  const [production, setProduction] = useState<ResourceSet>({ ...EMPTY_RESOURCES })

  // Caps
  const [capsEnabled, setCapsEnabled] = useState(false)
  const [caps, setCaps] = useState<ResourceSet>({ ...EMPTY_RESOURCES })

  // Target time
  const [targetDateTime, setTargetDateTime] = useState('')

  // Mode tab
  const [mode, setMode] = useState<'now' | 'target'>('now')

  // Derived discount
  const discount = useMemo(() => {
    const a1 = parseInt(arch1Level) || 0
    const a2 = parseInt(arch2Level) || 0
    const d1 = ARCH1_DISCOUNT[Math.min(a1, 5)] ?? 0
    const d2 = ARCH2_DISCOUNT[Math.min(a2, 10)] ?? 0
    return Math.min(0.99, d1 + d2)
  }, [arch1Level, arch2Level])

  // Parse helpers
  function parseRes(rs: ResourceSet): Record<ResourceKey, number> {
    return {
      food: parseResourceInput(rs.food),
      wood: parseResourceInput(rs.wood),
      stone: parseResourceInput(rs.stone),
      gold: parseResourceInput(rs.gold),
      crystals: parseResourceInput(rs.crystals),
      credits: parseResourceInput(rs.credits),
    }
  }

  function parseCaps(): Record<ResourceKey, number> | null {
    if (!capsEnabled) return null
    return parseRes(caps)
  }

  // Results
  const result = useMemo<CalcResult | null>(() => {
    const flagsOwned = parseInt(currentFlags) || 0
    const avail = parseRes(resources)
    const capsData = parseCaps()

    if (mode === 'now') {
      return calcFlagsRightNow(flagsOwned, avail, discount, capsData)
    }

    if (!targetDateTime) return null
    const targetDate = new Date(targetDateTime)
    if (isNaN(targetDate.getTime())) return null

    const prod = parseRes(production)
    return calcFlagsByTargetTime(flagsOwned, avail, prod, targetDate, discount, capsData)
  }, [currentFlags, resources, production, caps, capsEnabled, arch1Level, arch2Level, discount, mode, targetDateTime])

  function updateResource(key: ResourceKey, val: string) {
    setResources((prev) => ({ ...prev, [key]: val }))
  }
  function updateProduction(key: ResourceKey, val: string) {
    setProduction((prev) => ({ ...prev, [key]: val }))
  }
  function updateCap(key: ResourceKey, val: string) {
    setCaps((prev) => ({ ...prev, [key]: val }))
  }

  const flagsOwned = parseInt(currentFlags) || 0
  const nextFlagNumber = flagsOwned + 1

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Flag className="h-6 w-6 text-purple-400" />
          Lost Kingdom Flag Calculator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculate how many flags you can build based on your current resources and architecture discounts.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: settings + resources */}
        <div className="xl:col-span-2 space-y-5">
          {/* Settings Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">Current Flags Owned</Label>
                  <Input
                    type="number"
                    min={0}
                    value={currentFlags}
                    onChange={(e) => setCurrentFlags(e.target.value)}
                    placeholder="0"
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Architecture I Level (0-5)
                  </Label>
                  <Select value={arch1Level} onValueChange={setArch1Level}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5].map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          Level {l}
                          {l > 0 && (
                            <span className="text-muted-foreground ml-1.5">
                              ({(ARCH1_DISCOUNT[l] * 100).toFixed(1)}% off)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Architecture II Level (0-10)
                  </Label>
                  <Select value={arch2Level} onValueChange={setArch2Level}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          Level {l}
                          {l > 0 && (
                            <span className="text-muted-foreground ml-1.5">
                              ({(ARCH2_DISCOUNT[l] * 100).toFixed(1)}% off)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {discount > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2">
                  <Info className="h-4 w-4 text-purple-400 shrink-0" />
                  <p className="text-sm text-purple-300">
                    Total discount: <strong>{(discount * 100).toFixed(1)}%</strong> — all flag costs
                    reduced accordingly.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resources Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                Current Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Supports "9.7M", "500K" format.
              </p>
              {RESOURCE_META.map((meta) => (
                <ResourceInputRow
                  key={meta.key}
                  meta={meta}
                  value={resources[meta.key]}
                  onChange={(v) => updateResource(meta.key, v)}
                  highlight={result?.bottleneck === meta.key}
                />
              ))}
            </CardContent>
          </Card>

          {/* Production Card (only shown in target mode) */}
          {mode === 'target' && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  Production Per Hour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Optional. Leave blank if none.</p>
                {RESOURCE_META.map((meta) => (
                  <ResourceInputRow
                    key={meta.key}
                    meta={meta}
                    value={production[meta.key]}
                    onChange={(v) => updateProduction(meta.key, v)}
                    placeholder="0 / hr"
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Resource Caps */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Resource Caps
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() => setCapsEnabled((v) => !v)}
                >
                  {capsEnabled ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 mr-1" />
                      Disable Caps
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 mr-1" />
                      Enable Caps
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {capsEnabled && (
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Resources won't be counted above these caps.
                </p>
                {RESOURCE_META.map((meta) => (
                  <ResourceInputRow
                    key={meta.key}
                    meta={meta}
                    value={caps[meta.key]}
                    onChange={(v) => updateCap(meta.key, v)}
                    placeholder="No cap"
                  />
                ))}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right column: mode + results */}
        <div className="space-y-5">
          {/* Mode tabs */}
          <Card className="border-border">
            <CardContent className="pt-5 pb-4">
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as 'now' | 'target')}
              >
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="now" className="flex-1 text-xs">
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Right Now
                  </TabsTrigger>
                  <TabsTrigger value="target" className="flex-1 text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    By Target Time
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="now">
                  <p className="text-sm text-muted-foreground">
                    How many flags can you build with your current resources right now?
                  </p>
                </TabsContent>

                <TabsContent value="target" className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    How many flags can you build by a target time (including production)?
                  </p>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Target Date & Time (UTC)
                    </Label>
                    <Input
                      type="datetime-local"
                      value={targetDateTime}
                      onChange={(e) => setTargetDateTime(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Results */}
          {result === null && mode === 'target' && !targetDateTime ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Set a target date to see results.</p>
            </div>
          ) : result !== null ? (
            <div className="space-y-4">
              {/* Big result number */}
              <Card className="border-border">
                <CardContent className="py-5 px-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 shrink-0">
                      <Flag className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Flags you can build</p>
                      <p className="text-4xl font-bold tabular-nums text-foreground">
                        {result.flagsAffordable}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Flags {flagsOwned + 1} → {flagsOwned + result.flagsAffordable}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bottleneck */}
              {result.bottleneck && result.flagsAffordable < 500 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Bottleneck Resource</p>
                    <p className="text-sm text-amber-400/80 mt-0.5">
                      {RESOURCE_META.find((m) => m.key === result.bottleneck)?.label ?? result.bottleneck} will
                      run out first. Farm or purchase more to build additional flags.
                    </p>
                  </div>
                </div>
              )}

              {/* Cost breakdown table */}
              {result.costs.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-400" />
                      Next {result.costs.length} Flag Costs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                              Flag
                            </th>
                            {RESOURCE_META.filter(
                              (m) =>
                                result.costs.some((c) => c.cost[m.key] > 0)
                            ).map((m) => (
                              <th
                                key={m.key}
                                className={`px-3 py-2 text-right font-medium ${m.color}`}
                              >
                                <span className="flex items-center justify-end gap-1">
                                  {m.icon}
                                  {m.label}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.costs.map(({ flagNumber, cost }, rowIdx) => {
                            const isAffordable = rowIdx < result.flagsAffordable
                            return (
                              <tr
                                key={flagNumber}
                                className={`border-b border-border/50 last:border-0 ${
                                  isAffordable
                                    ? 'bg-transparent'
                                    : 'bg-red-500/5'
                                }`}
                              >
                                <td className="px-4 py-2 font-medium text-foreground">
                                  <span className="flex items-center gap-1.5">
                                    {isAffordable ? (
                                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                    ) : (
                                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                    )}
                                    #{flagNumber}
                                  </span>
                                </td>
                                {RESOURCE_META.filter(
                                  (m) =>
                                    result.costs.some((c) => c.cost[m.key] > 0)
                                ).map((m) => (
                                  <td
                                    key={m.key}
                                    className={`px-3 py-2 text-right tabular-nums ${
                                      result.bottleneck === m.key && !isAffordable
                                        ? 'text-amber-400 font-semibold'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {cost[m.key] > 0 ? formatResourceDisplay(cost[m.key]) : '—'}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                        Affordable &nbsp;
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                        Not affordable
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.flagsAffordable === 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-sm text-red-400">
                    You can't afford even one flag with your current resources.
                    {result.bottleneck && (
                      <> Get more {RESOURCE_META.find((m) => m.key === result.bottleneck)?.label}.</>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
