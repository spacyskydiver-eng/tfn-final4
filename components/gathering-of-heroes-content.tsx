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
  Sword,
  Target,
  Crosshair,
  Crown,
  Wrench,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data — exact from gathering-of-heroes-calculator-main              */
/* ------------------------------------------------------------------ */

// Token costs per commander by tier
const T1_COST = 200
const T2_COST = 500
const T3_COST = 1000

// Minimum tokens that must be spent in T1 to unlock T2,
// and minimum T1+T2 combined spend to unlock T3
const T2_MIN_SPEND = 400   // must spend 400 in T1 first
const T3_MIN_SPEND = 1400  // must spend 1400 in T1+T2 combined first

const EVENT_DAYS = 5

// Daily missions: Login(2) + Defeat Barbarians(10) + Gather 2M Resources(6) = 18/day
const DAILY_TOKENS_PER_DAY = 18
const DAILY_TOKENS = DAILY_TOKENS_PER_DAY * EVENT_DAYS // 90

// Challenge missions (one-time)
const CHALLENGE_MISSIONS = [
  { id: 'login5',     label: 'Login 5 Days',                tokens: 10  },
  { id: 'gems10k',    label: 'Spend 10,000 Gems',           tokens: 20  },
  { id: 'gems50k',    label: 'Spend 50,000 Gems',           tokens: 100 },
  { id: 'power600k',  label: 'Increase Troop Power 600K',   tokens: 100 },
] as const

type ChallengeId = (typeof CHALLENGE_MISSIONS)[number]['id']

// Repeatable missions
const SPEEDUP_RATE = 480  // 480 min speedups = 2 tokens
const GEMS_RATE    = 2000 // 2000 gems = 30 tokens

type Category = 'Infantry' | 'Archer' | 'Cavalry' | 'Leadership' | 'Engineering'

interface CommanderEntry { name: string; category: Category }

const CATEGORY_ICONS: Record<Category, React.ElementType> = {
  Infantry:    Sword,
  Archer:      Crosshair,
  Cavalry:     Target,
  Leadership:  Crown,
  Engineering: Wrench,
}

const CATEGORY_COLORS: Record<Category, string> = {
  Infantry:    'text-blue-400',
  Archer:      'text-green-400',
  Cavalry:     'text-orange-400',
  Leadership:  'text-purple-400',
  Engineering: 'text-yellow-400',
}

interface TierData {
  tier: number
  label: string
  cost: number
  minSpend: number
  color: string
  borderColor: string
  bgColor: string
  commanders: CommanderEntry[]
}

const TIERS_DATA: TierData[] = [
  {
    tier: 1,
    label: 'Tier 1',
    cost: T1_COST,
    minSpend: 0,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    commanders: [
      // Infantry
      { name: 'Bai Qi',               category: 'Infantry'    },
      { name: 'William Wallace',       category: 'Infantry'    },
      { name: 'Guan Yu',              category: 'Infantry'    },
      { name: 'Harald Sigurdsson',    category: 'Infantry'    },
      { name: 'Zenobia',              category: 'Infantry'    },
      { name: "K'inich Janaab Pakal", category: 'Infantry'    },
      { name: 'Leonidas I',           category: 'Infantry'    },
      { name: 'Ivar',                 category: 'Infantry'    },
      // Archer
      { name: 'Qin Shi Huang',        category: 'Archer'      },
      { name: 'Shajar al-Durr',       category: 'Archer'      },
      { name: 'Ramesses II',          category: 'Archer'      },
      { name: 'Amanitore',            category: 'Archer'      },
      { name: 'Gilgamesh',            category: 'Archer'      },
      { name: 'Nebuchadnezzar II',    category: 'Archer'      },
      { name: 'Artemisia I',          category: 'Archer'      },
      // Cavalry
      { name: 'Arthur Pendragon',     category: 'Cavalry'     },
      { name: 'Gang Gam-chan',        category: 'Cavalry'     },
      { name: 'Belisarius',           category: 'Cavalry'     },
      { name: 'Attila',              category: 'Cavalry'     },
      { name: 'William I',            category: 'Cavalry'     },
      { name: 'Xiang Yu',             category: 'Cavalry'     },
      { name: 'Jadwiga',              category: 'Cavalry'     },
      { name: 'Chandragupta Maurya',  category: 'Cavalry'     },
      // Leadership
      { name: 'Philip II',            category: 'Leadership'  },
      { name: 'Hector',               category: 'Leadership'  },
      { name: 'Honda Tadakatsu',      category: 'Leadership'  },
      { name: 'Yi Sun Sin',           category: 'Leadership'  },
      { name: 'Trajan',               category: 'Leadership'  },
      { name: 'Theodora',             category: 'Leadership'  },
      { name: 'Moctezuma I',          category: 'Leadership'  },
      { name: 'Suleiman I',           category: 'Leadership'  },
      // Engineering
      { name: 'John Hunyadi',         category: 'Engineering' },
      { name: 'Alfonso de Albuquerque', category: 'Engineering' },
      { name: 'Mary I',               category: 'Engineering' },
      { name: 'Archimedes',           category: 'Engineering' },
    ],
  },
  {
    tier: 2,
    label: 'Tier 2',
    cost: T2_COST,
    minSpend: T2_MIN_SPEND,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    commanders: [
      // Infantry
      { name: 'Liu Che',              category: 'Infantry'    },
      { name: 'Gorgo',                category: 'Infantry'    },
      { name: 'Tariq ibn Ziyad',      category: 'Infantry'    },
      { name: 'Sargon the Great',     category: 'Infantry'    },
      { name: 'Flavius Aetius',       category: 'Infantry'    },
      // Archer
      { name: 'Zhuge Liang',          category: 'Archer'      },
      { name: 'Hermann',              category: 'Archer'      },
      { name: 'Ashurbanipal',         category: 'Archer'      },
      { name: 'Boudica',              category: 'Archer'      },
      { name: 'Henry V',              category: 'Archer'      },
      { name: 'Dido',                 category: 'Archer'      },
      // Cavalry
      { name: 'Huo Qubing',           category: 'Cavalry'     },
      { name: 'Joan of Arc',          category: 'Cavalry'     },
      { name: 'Alexander Nevsky',     category: 'Cavalry'     },
      { name: 'Justinian I',          category: 'Cavalry'     },
      { name: 'Jan Zizka',            category: 'Cavalry'     },
      // Leadership
      { name: 'Heraclius',            category: 'Leadership'  },
      { name: 'Lapulapu',             category: 'Leadership'  },
      // Engineering
      { name: 'Gonzalo de Córdoba',   category: 'Engineering' },
      { name: 'Gajah Mada',           category: 'Engineering' },
      { name: 'Margaret I',           category: 'Engineering' },
      { name: 'Babur',                category: 'Engineering' },
    ],
  },
  {
    tier: 3,
    label: 'Tier 3',
    cost: T3_COST,
    minSpend: T3_MIN_SPEND,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    commanders: [
      // Infantry
      { name: 'Scipio Africanus',     category: 'Infantry'    },
      { name: 'Tokugawa Ieyasu',      category: 'Infantry'    },
      { name: 'Scipio Aemilianus',    category: 'Infantry'    },
      { name: 'Sun Tzu Prime',        category: 'Infantry'    },
      // Archer
      { name: 'Choe Yeong',           category: 'Archer'      },
      { name: 'Shapur I',             category: 'Archer'      },
      // Cavalry
      { name: 'Achilles',             category: 'Cavalry'     },
      { name: 'Subutai',              category: 'Cavalry'     },
      { name: 'David IV',             category: 'Cavalry'     },
      { name: 'Eleanor of Aquitaine', category: 'Cavalry'     },
      // Leadership
      { name: 'Matthias I',           category: 'Leadership'  },
      // Engineering
      { name: 'Stephen III',          category: 'Engineering' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Cost calculation                                                    */
/* ------------------------------------------------------------------ */

function calcCost(selected: Set<string>): {
  t1Cost: number
  t2Cost: number
  t3Cost: number
  t1Shortfall: number
  t2Shortfall: number
  total: number
} {
  const t1Sel = TIERS_DATA[0].commanders.filter((c) => selected.has(c.name)).length
  const t2Sel = TIERS_DATA[1].commanders.filter((c) => selected.has(c.name)).length
  const t3Sel = TIERS_DATA[2].commanders.filter((c) => selected.has(c.name)).length

  const t1Cost = t1Sel * T1_COST
  const t2Cost = t2Sel * T2_COST
  const t3Cost = t3Sel * T3_COST

  const needT2 = t2Sel > 0 || t3Sel > 0
  const needT3 = t3Sel > 0

  // If accessing T2, must have spent ≥400 in T1
  const t1Shortfall = needT2 ? Math.max(0, T2_MIN_SPEND - t1Cost) : 0
  const effectiveT1 = t1Cost + t1Shortfall

  // If accessing T3, T1+T2 combined must be ≥1400
  const t1t2Combined = effectiveT1 + t2Cost
  const t2Shortfall = needT3 ? Math.max(0, T3_MIN_SPEND - t1t2Combined) : 0

  const total = t1t2Combined + t2Shortfall + t3Cost

  return { t1Cost, t2Cost, t3Cost, t1Shortfall, t2Shortfall, total }
}

function calcSpeedupTokens(minutes: number): number {
  if (!minutes || minutes < 0) return 0
  return Math.floor(minutes / SPEEDUP_RATE) * 2
}

function calcGemTokens(gems: number): number {
  if (!gems || gems < 0) return 0
  return Math.floor(gems / GEMS_RATE) * 30
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
  const [expandedTiers, setExpandedTiers] = useState<Set<number>>(new Set([1, 2, 3]))
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const challengeTokens = useMemo(
    () => CHALLENGE_MISSIONS.filter((m) => checkedChallenges.has(m.id)).reduce((s, m) => s + m.tokens, 0),
    [checkedChallenges],
  )
  const speedupTokens = useMemo(() => calcSpeedupTokens(parseFloat(speedupMinutes) || 0), [speedupMinutes])
  const gemTokens     = useMemo(() => calcGemTokens(parseFloat(gemsInput) || 0), [gemsInput])
  const totalTokens   = DAILY_TOKENS + challengeTokens + speedupTokens + gemTokens

  const costInfo = useMemo(() => calcCost(selectedCommanders), [selectedCommanders])
  const remaining = totalTokens - costInfo.total
  const canAfford = remaining >= 0

  const toggleChallenge = (id: ChallengeId) => {
    setCheckedChallenges((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleCommander = (name: string) => {
    setSelectedCommanders((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const toggleTier = (tier: number) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev)
      next.has(tier) ? next.delete(tier) : next.add(tier)
      return next
    })
  }

  const toggleCat = (key: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const selCount = selectedCommanders.size

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Gathering of Heroes Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plan which commanders to unlock and calculate if you have enough tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ============================================================ */}
        {/*  Left column: Token sources                                  */}
        {/* ============================================================ */}
        <div className="xl:col-span-2 space-y-4">

          {/* 1. Daily Missions */}
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
                  <span className="text-foreground font-medium">{DAILY_TOKENS} tokens</span>
                  <span className="text-muted-foreground ml-2">
                    ({EVENT_DAYS} days × {DAILY_TOKENS_PER_DAY}/day — Login, Barbarians, Gather)
                  </span>
                </div>
                <span className="ml-auto text-primary font-bold tabular-nums">+{DAILY_TOKENS}</span>
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
                <div className="space-y-1">
                  {CHALLENGE_MISSIONS.map((m) => (
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
              </CardContent>
            )}
          </Card>

          {/* 3. Speedups (Repeatable) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Speedups Used
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
                  <span className="text-2xl font-bold text-primary tabular-nums">+{speedupTokens}</span>
                  <p className="text-xs text-muted-foreground">tokens</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Rate: <span className="text-foreground">480 minutes = 2 tokens</span> (repeatable)
              </p>
            </CardContent>
          </Card>

          {/* 4. Gems (Repeatable) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                Gems Spent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="gems-input" className="text-sm text-muted-foreground">
                    Total gems to spend
                  </Label>
                  <Input
                    id="gems-input"
                    type="number"
                    min={0}
                    value={gemsInput}
                    onChange={(e) => setGemsInput(e.target.value)}
                    placeholder="e.g. 10000"
                    className="bg-background border-border"
                  />
                </div>
                <div className="text-right pb-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">+{gemTokens}</span>
                  <p className="text-xs text-muted-foreground">tokens</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Rate: <span className="text-foreground">2,000 gems = 30 tokens</span> (repeatable)
              </p>
            </CardContent>
          </Card>

          {/* 5. Commander Selection */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Commander Selection
                {selCount > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-normal">
                    {selCount} selected
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TIERS_DATA.map((tier) => {
                const tierExpanded = expandedTiers.has(tier.tier)
                const categories = Array.from(new Set(tier.commanders.map((c) => c.category))) as Category[]

                return (
                  <div key={tier.tier} className={`rounded-lg border ${tier.borderColor} ${tier.bgColor}`}>
                    {/* Tier header */}
                    <button
                      onClick={() => toggleTier(tier.tier)}
                      className="flex w-full items-center justify-between px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${tier.color}`}>
                          {tier.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tier.cost} tokens/commander
                        </span>
                        {tier.minSpend > 0 && (
                          <span className="text-xs text-muted-foreground/70">
                            · unlocks after {tier.minSpend} spent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tier.commanders.some((c) => selectedCommanders.has(c.name)) && (
                          <span className={`text-xs font-medium tabular-nums ${tier.color}`}>
                            {tier.commanders.filter((c) => selectedCommanders.has(c.name)).length} selected
                          </span>
                        )}
                        {tierExpanded
                          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {tierExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {categories.map((cat) => {
                          const catKey = `${tier.tier}-${cat}`
                          const catExpanded = !expandedCats.has(catKey)
                          const catCommanders = tier.commanders.filter((c) => c.category === cat)
                          const CatIcon = CATEGORY_ICONS[cat]

                          return (
                            <div key={cat}>
                              <button
                                onClick={() => toggleCat(catKey)}
                                className="flex items-center gap-1.5 w-full text-left py-1"
                              >
                                <CatIcon className={`h-3 w-3 ${CATEGORY_COLORS[cat]}`} />
                                <span className={`text-xs font-semibold uppercase tracking-wider ${CATEGORY_COLORS[cat]}`}>
                                  {cat}
                                </span>
                                {catExpanded
                                  ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto" />
                                  : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
                                }
                              </button>
                              {catExpanded && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 pl-4">
                                  {catCommanders.map((c) => (
                                    <label
                                      key={c.name}
                                      className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-1 hover:bg-secondary/50 transition-colors group"
                                    >
                                      <Checkbox
                                        checked={selectedCommanders.has(c.name)}
                                        onCheckedChange={() => toggleCommander(c.name)}
                                      />
                                      <span className={`text-sm flex-1 transition-colors ${
                                        selectedCommanders.has(c.name) ? tier.color : 'text-foreground'
                                      } group-hover:${tier.color}`}>
                                        {c.name}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {selCount > 0 && (
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

        {/* ============================================================ */}
        {/*  Right column: Results summary                               */}
        {/* ============================================================ */}
        <div>
          <Card className="bg-card border-border">
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

              {/* Cost breakdown (only when commanders are selected) */}
              {selCount > 0 && (
                <>
                  <div className="border-t border-border pt-3 space-y-2 text-sm">
                    {costInfo.t1Cost > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tier 1 ×{TIERS_DATA[0].commanders.filter((c) => selectedCommanders.has(c.name)).length} @200</span>
                        <span className="tabular-nums">{costInfo.t1Cost.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.t1Shortfall > 0 && (
                      <div className="flex justify-between text-yellow-400/80">
                        <span className="text-xs">T1 unlock shortfall</span>
                        <span className="tabular-nums text-xs">+{costInfo.t1Shortfall.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.t2Cost > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tier 2 ×{TIERS_DATA[1].commanders.filter((c) => selectedCommanders.has(c.name)).length} @500</span>
                        <span className="tabular-nums">{costInfo.t2Cost.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.t2Shortfall > 0 && (
                      <div className="flex justify-between text-yellow-400/80">
                        <span className="text-xs">T2 unlock shortfall</span>
                        <span className="tabular-nums text-xs">+{costInfo.t2Shortfall.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.t3Cost > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tier 3 ×{TIERS_DATA[2].commanders.filter((c) => selectedCommanders.has(c.name)).length} @1000</span>
                        <span className="tabular-nums">{costInfo.t3Cost.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
                      <span>Total cost</span>
                      <span className="tabular-nums">{costInfo.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg px-4 py-3 flex items-center gap-3 border ${
                      canAfford ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    {canAfford
                      ? <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                      : <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      {canAfford ? (
                        <>
                          <p className="text-sm font-semibold text-green-400">Enough tokens</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {remaining.toLocaleString()} remaining
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-red-400">
                            Need {Math.abs(remaining).toLocaleString()} more
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Deselect some commanders or earn more tokens
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selCount === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Select commanders to see cost breakdown.
                </p>
              )}

              {/* Tier info */}
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tier Unlock Requirements</p>
                {TIERS_DATA.map((t) => (
                  <div key={t.tier} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`font-medium ${t.color}`}>{t.label}</span>
                    <span className="text-muted-foreground/60">—</span>
                    <span>
                      {t.minSpend === 0
                        ? 'available immediately'
                        : `spend ${t.minSpend.toLocaleString()} tokens first`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
