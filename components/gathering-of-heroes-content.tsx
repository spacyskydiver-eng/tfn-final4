'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Star,
  Coins,
  Zap,
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const DAILY_TOKENS = 90 // 5 days × 18/day (fixed)

const CHALLENGE_MISSIONS = [
  { id: 'login1',      label: 'Login 1 day',              tokens: 10, group: 'Login' },
  { id: 'login3',      label: 'Login 3 days',             tokens: 20, group: 'Login' },
  { id: 'login5',      label: 'Login 5 days',             tokens: 30, group: 'Login' },
  { id: 'gems2000',    label: 'Spend 2,000 gems',         tokens: 30, group: 'Gems' },
  { id: 'gems5000',    label: 'Spend 5,000 gems',         tokens: 50, group: 'Gems' },
  { id: 'gems10000',   label: 'Spend 10,000 gems',        tokens: 80, group: 'Gems' },
  { id: 'power500k',   label: 'Reach 500K troop power',   tokens: 20, group: 'Power' },
  { id: 'power1m',     label: 'Reach 1M troop power',     tokens: 40, group: 'Power' },
  { id: 'power2m',     label: 'Reach 2M troop power',     tokens: 60, group: 'Power' },
  { id: 'daily5',      label: 'Complete 5 daily missions',  tokens: 15, group: 'Daily' },
  { id: 'daily10',     label: 'Complete 10 daily missions', tokens: 25, group: 'Daily' },
  { id: 'daily20',     label: 'Complete 20 daily missions', tokens: 40, group: 'Daily' },
] as const

type ChallengeId = (typeof CHALLENGE_MISSIONS)[number]['id']

const TIERS = [
  {
    tier: 1,
    label: 'Tier 1',
    minSpend: 3000,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    commanders: [
      'Minamoto no Yoshitsune',
      'Ramesses II',
      'Artemisia I',
      'Scipio Africanus Prime',
    ],
  },
  {
    tier: 2,
    label: 'Tier 2',
    minSpend: 5000,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    commanders: [
      'Saladin',
      'Chandragupta Maurya',
      'Harald Sigurdsson',
      'Seondeok',
    ],
  },
  {
    tier: 3,
    label: 'Tier 3',
    minSpend: 8000,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    commanders: [
      'Guan Yu',
      'Yi Seong-Gye',
      'Takeda Shingen',
      'El Cid',
    ],
  },
] as const

const TOKENS_PER_COMMANDER = 800
const SPEEDUP_MINUTES_PER_2_TOKENS = 480 // 480 min → 2 tokens
const GEMS_PER_30_TOKENS = 2000           // 2000 gems → 30 tokens

/* ------------------------------------------------------------------ */
/*  Helper                                                              */
/* ------------------------------------------------------------------ */

function calcSpeedupTokens(minutes: number): number {
  if (!minutes || minutes < 0) return 0
  return Math.floor(minutes / SPEEDUP_MINUTES_PER_2_TOKENS) * 2
}

function calcGemTokens(gems: number): number {
  if (!gems || gems < 0) return 0
  return Math.floor(gems / GEMS_PER_30_TOKENS) * 30
}

/** Returns the total required spend (tier minimums + commander costs) */
function calcCost(selected: Set<string>): {
  tierMinimums: number
  commanderTokens: number
  total: number
  highestTier: number | null
} {
  if (selected.size === 0) return { tierMinimums: 0, commanderTokens: 0, total: 0, highestTier: null }

  let highestTier: number | null = null

  for (const tier of [...TIERS].reverse()) {
    const anyInTier = tier.commanders.some((c) => selected.has(c))
    if (anyInTier) {
      highestTier = tier.tier
      break
    }
  }

  if (highestTier === null) return { tierMinimums: 0, commanderTokens: 0, total: 0, highestTier: null }

  // The minimum spend for the highest tier includes all lower tier minimums
  const tierObj = TIERS.find((t) => t.tier === highestTier)!
  const tierMinimums = tierObj.minSpend

  // Commander tokens are on top of tier minimums
  const commanderTokens = selected.size * TOKENS_PER_COMMANDER

  // Total cost: tier minimum + commander tokens
  // (tier minimum already "includes" lower tier unlocks)
  const total = tierMinimums + commanderTokens

  return { tierMinimums, commanderTokens, total, highestTier }
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function GatheringOfHeroesContent() {
  const [checkedChallenges, setCheckedChallenges] = useState<Set<ChallengeId>>(new Set())
  const [speedupMinutes, setSpeedupMinutes] = useState('')
  const [gemsInput, setGemsInput] = useState('')
  const [selectedCommanders, setSelectedCommanders] = useState<Set<string>>(new Set())
  const [showChallenges, setShowChallenges] = useState(true)

  /* ---- derived ---- */
  const challengeTokens = useMemo(
    () =>
      CHALLENGE_MISSIONS.filter((m) => checkedChallenges.has(m.id)).reduce(
        (sum, m) => sum + m.tokens,
        0,
      ),
    [checkedChallenges],
  )

  const speedupTokens = useMemo(
    () => calcSpeedupTokens(parseFloat(speedupMinutes) || 0),
    [speedupMinutes],
  )

  const gemTokens = useMemo(
    () => calcGemTokens(parseFloat(gemsInput) || 0),
    [gemsInput],
  )

  const totalTokens = DAILY_TOKENS + challengeTokens + speedupTokens + gemTokens

  const { total: totalCost, highestTier } = useMemo(
    () => calcCost(selectedCommanders),
    [selectedCommanders],
  )

  const remaining = totalTokens - totalCost
  const canAfford = remaining >= 0

  /* ---- toggle helpers ---- */
  const toggleChallenge = (id: ChallengeId) => {
    setCheckedChallenges((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCommander = (name: string) => {
    setSelectedCommanders((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  /* ---- group challenges by group label ---- */
  const groups = useMemo(() => {
    const map = new Map<string, typeof CHALLENGE_MISSIONS[number][]>()
    for (const m of CHALLENGE_MISSIONS) {
      if (!map.has(m.group)) map.set(m.group, [])
      map.get(m.group)!.push(m)
    }
    return map
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Gathering of Heroes Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Calculate your tokens and plan which commanders to unlock during the event.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ============================================================ */}
        {/*  Left column: Token sources                                  */}
        {/* ============================================================ */}
        <div className="xl:col-span-2 space-y-4">

          {/* 1. Daily Missions (fixed) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                Daily Missions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <div className="text-sm">
                  <span className="text-foreground font-medium">90 tokens</span>
                  <span className="text-muted-foreground ml-2">
                    (5 days × 18 tokens/day — automatically included)
                  </span>
                </div>
                <span className="ml-auto text-primary font-bold tabular-nums">+90</span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Challenge Missions */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Challenge Missions
                  {checkedChallenges.size > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      +{challengeTokens} tokens
                    </span>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChallenges((v) => !v)}
                  className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  {showChallenges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showChallenges && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                  {Array.from(groups.entries()).map(([group, missions]) => (
                    <div key={group} className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">
                        {group}
                      </p>
                      {missions.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-secondary/50 transition-colors group"
                        >
                          <Checkbox
                            checked={checkedChallenges.has(m.id)}
                            onCheckedChange={() => toggleChallenge(m.id)}
                          />
                          <span className="text-sm text-foreground flex-1 group-hover:text-primary transition-colors">
                            {m.label}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            +{m.tokens}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 3. Speedups */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Speedups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="speedup-input" className="text-sm text-muted-foreground">
                    Total speedup minutes
                  </Label>
                  <Input
                    id="speedup-input"
                    type="number"
                    min={0}
                    value={speedupMinutes}
                    onChange={(e) => setSpeedupMinutes(e.target.value)}
                    placeholder="e.g. 2400"
                    className="bg-background border-border"
                  />
                </div>
                <div className="text-right pb-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    +{speedupTokens}
                  </span>
                  <p className="text-xs text-muted-foreground">tokens</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Conversion rate: <span className="text-foreground">480 minutes = 2 tokens</span>
              </p>
            </CardContent>
          </Card>

          {/* 4. Gems */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                Gems
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="gems-input" className="text-sm text-muted-foreground">
                    Gems to spend
                  </Label>
                  <Input
                    id="gems-input"
                    type="number"
                    min={0}
                    value={gemsInput}
                    onChange={(e) => setGemsInput(e.target.value)}
                    placeholder="e.g. 5000"
                    className="bg-background border-border"
                  />
                </div>
                <div className="text-right pb-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    +{gemTokens}
                  </span>
                  <p className="text-xs text-muted-foreground">tokens</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Conversion rate: <span className="text-foreground">2,000 gems = 30 tokens</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/*  Right column: Commander selection + Results                  */}
        {/* ============================================================ */}
        <div className="space-y-4">

          {/* Token summary */}
          <Card className="bg-card border-border sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Token breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Daily missions</span>
                  <span className="tabular-nums text-foreground">+{DAILY_TOKENS}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Challenges</span>
                  <span className="tabular-nums text-foreground">+{challengeTokens}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Speedups</span>
                  <span className="tabular-nums text-foreground">+{speedupTokens}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Gems</span>
                  <span className="tabular-nums text-foreground">+{gemTokens}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                  <span>Total earned</span>
                  <span className="tabular-nums text-primary text-lg">{totalTokens.toLocaleString()}</span>
                </div>
              </div>

              {selectedCommanders.size > 0 && (
                <>
                  <div className="border-t border-border pt-3 space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Commanders × {selectedCommanders.size}
                        <span className="text-xs ml-1">(@800 each)</span>
                      </span>
                      <span className="tabular-nums">{(selectedCommanders.size * TOKENS_PER_COMMANDER).toLocaleString()}</span>
                    </div>
                    {highestTier !== null && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          Tier {highestTier} minimum spend
                        </span>
                        <span className="tabular-nums">
                          {TIERS.find((t) => t.tier === highestTier)!.minSpend.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-foreground">
                      <span>Total cost</span>
                      <span className="tabular-nums">{totalCost.toLocaleString()}</span>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg px-4 py-3 flex items-center gap-3 border ${
                      canAfford
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    {canAfford ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {canAfford ? (
                        <>
                          <p className="text-sm font-semibold text-green-400">Enough tokens</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {remaining.toLocaleString()} remaining after purchase
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-red-400">
                            Need {Math.abs(remaining).toLocaleString()} more tokens
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Earn more or select fewer commanders
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedCommanders.size === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Select commanders below to see cost analysis.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Commander selection */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Commander Selection
                <span className="text-xs text-muted-foreground font-normal ml-auto">
                  800 tokens each
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {TIERS.map((tier) => (
                <div key={tier.tier} className={`rounded-lg border ${tier.borderColor} ${tier.bgColor} p-3 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${tier.color}`}>
                      {tier.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      min. {tier.minSpend.toLocaleString()} tokens
                    </span>
                  </div>
                  {tier.commanders.map((name) => (
                    <label
                      key={name}
                      className="flex items-center gap-2.5 cursor-pointer rounded-md px-1 py-1 hover:bg-secondary/50 transition-colors group"
                    >
                      <Checkbox
                        checked={selectedCommanders.has(name)}
                        onCheckedChange={() => toggleCommander(name)}
                      />
                      <span className={`text-sm flex-1 transition-colors ${selectedCommanders.has(name) ? tier.color : 'text-foreground'} group-hover:${tier.color}`}>
                        {name}
                      </span>
                    </label>
                  ))}
                </div>
              ))}

              {selectedCommanders.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCommanders(new Set())}
                  className="w-full border-border hover:border-red-500 hover:text-red-400 text-xs"
                >
                  Clear selection
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
