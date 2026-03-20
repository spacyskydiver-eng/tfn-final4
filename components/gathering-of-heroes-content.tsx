'use client'

import { useState, useMemo, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
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
/*  Constants — exact from gathering-of-heroes-calculator-main         */
/* ------------------------------------------------------------------ */

const T1_COST = 200
const T2_COST = 500
const T3_COST = 1000

// Minimum tokens that must be spent in lower tiers before unlocking
const T2_MIN_SPEND = 400   // must spend ≥400 in T1 to unlock T2
const T3_MIN_SPEND = 1400  // must spend ≥1400 in T1+T2 to unlock T3

const EVENT_DAYS = 5

// Daily missions: Login(2) + Defeat Barbarians(10) + Gather 2M Resources(6) = 18/day
const DAILY_TOKENS_PER_DAY = 18
const DAILY_TOKENS = DAILY_TOKENS_PER_DAY * EVENT_DAYS // 90

const CHALLENGE_MISSIONS = [
  { id: 'login5',     label: 'Log In 5 Days',                    tokens: 10  },
  { id: 'gems10k',    label: 'Spend 10,000 Gems',                tokens: 20  },
  { id: 'gems50k',    label: 'Spend 50,000 Gems',                tokens: 100 },
  { id: 'power600k',  label: 'Increase Troop Power (600K)',       tokens: 100 },
] as const

type ChallengeId = (typeof CHALLENGE_MISSIONS)[number]['id']

// Repeatable rates
const GEMS_RATE    = 2000 // 2000 gems = 30 tokens
const SPEEDUP_RATE = 480  // every 480 minutes of speedups = 2 tokens

type SpeedupMode = 'auto' | 'days' | 'minutes'
type SpeedupCategory = 'building' | 'research' | 'training' | 'healing' | 'universal'

const SPEEDUP_CATEGORIES: { id: SpeedupCategory; label: string }[] = [
  { id: 'building',   label: 'Building'   },
  { id: 'research',   label: 'Research'   },
  { id: 'training',   label: 'Training'   },
  { id: 'healing',    label: 'Healing'    },
  { id: 'universal',  label: 'Universal'  },
]

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
      // Infantry (8)
      { name: 'Bai Qi',                  category: 'Infantry'    },
      { name: 'William Wallace',          category: 'Infantry'    },
      { name: 'Guan Yu',                 category: 'Infantry'    },
      { name: 'Harald Sigurdsson',       category: 'Infantry'    },
      { name: 'Zenobia',                 category: 'Infantry'    },
      { name: "K'inich Janaab Pakal",    category: 'Infantry'    },
      { name: 'Leonidas I',              category: 'Infantry'    },
      { name: 'Ivar',                    category: 'Infantry'    },
      // Archer (7)
      { name: 'Qin Shi Huang',           category: 'Archer'      },
      { name: 'Shajar al-Durr',          category: 'Archer'      },
      { name: 'Ramesses II',             category: 'Archer'      },
      { name: 'Amanitore',               category: 'Archer'      },
      { name: 'Gilgamesh',               category: 'Archer'      },
      { name: 'Nebuchadnezzar II',       category: 'Archer'      },
      { name: 'Artemisia I',             category: 'Archer'      },
      // Cavalry (8)
      { name: 'Arthur Pendragon',        category: 'Cavalry'     },
      { name: 'Gang Gam-chan',           category: 'Cavalry'     },
      { name: 'Belisarius',              category: 'Cavalry'     },
      { name: 'Attila',                  category: 'Cavalry'     },
      { name: 'William I',               category: 'Cavalry'     },
      { name: 'Xiang Yu',                category: 'Cavalry'     },
      { name: 'Jadwiga',                 category: 'Cavalry'     },
      { name: 'Chandragupta Maurya',     category: 'Cavalry'     },
      // Leadership (8)
      { name: 'Philip II',               category: 'Leadership'  },
      { name: 'Hector',                  category: 'Leadership'  },
      { name: 'Honda Tadakatsu',         category: 'Leadership'  },
      { name: 'Yi Sun Sin',              category: 'Leadership'  },
      { name: 'Trajan',                  category: 'Leadership'  },
      { name: 'Theodora',                category: 'Leadership'  },
      { name: 'Moctezuma I',             category: 'Leadership'  },
      { name: 'Suleiman I',              category: 'Leadership'  },
      // Engineering (4)
      { name: 'John Hunyadi',            category: 'Engineering' },
      { name: 'Alfonso de Albuquerque',  category: 'Engineering' },
      { name: 'Mary I',                  category: 'Engineering' },
      { name: 'Archimedes',              category: 'Engineering' },
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
      // Infantry (5)
      { name: 'Liu Che',                 category: 'Infantry'    },
      { name: 'Gorgo',                   category: 'Infantry'    },
      { name: 'Tariq ibn Ziyad',         category: 'Infantry'    },
      { name: 'Sargon the Great',        category: 'Infantry'    },
      { name: 'Flavius Aetius',          category: 'Infantry'    },
      // Archer (6)
      { name: 'Zhuge Liang',             category: 'Archer'      },
      { name: 'Hermann',                 category: 'Archer'      },
      { name: 'Ashurbanipal',            category: 'Archer'      },
      { name: 'Boudica',                 category: 'Archer'      },
      { name: 'Henry V',                 category: 'Archer'      },
      { name: 'Dido',                    category: 'Archer'      },
      // Cavalry (5)
      { name: 'Huo Qubing',              category: 'Cavalry'     },
      { name: 'Joan of Arc',             category: 'Cavalry'     },
      { name: 'Alexander Nevsky',        category: 'Cavalry'     },
      { name: 'Justinian I',             category: 'Cavalry'     },
      { name: 'Jan Zizka',               category: 'Cavalry'     },
      // Leadership (2)
      { name: 'Heraclius',               category: 'Leadership'  },
      { name: 'Lapulapu',                category: 'Leadership'  },
      // Engineering (4)
      { name: 'Gonzalo de Córdoba',      category: 'Engineering' },
      { name: 'Gajah Mada',              category: 'Engineering' },
      { name: 'Margaret I',              category: 'Engineering' },
      { name: 'Babur',                   category: 'Engineering' },
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
      // Infantry (4)
      { name: 'Scipio Africanus',        category: 'Infantry'    },
      { name: 'Tokugawa Ieyasu',         category: 'Infantry'    },
      { name: 'Scipio Aemilianus',       category: 'Infantry'    },
      { name: 'Sun Tzu Prime',           category: 'Infantry'    },
      // Archer (2)
      { name: 'Choe Yeong',              category: 'Archer'      },
      { name: 'Shapur I',                category: 'Archer'      },
      // Cavalry (4)
      { name: 'Achilles',                category: 'Cavalry'     },
      { name: 'Subutai',                 category: 'Cavalry'     },
      { name: 'David IV',                category: 'Cavalry'     },
      { name: 'Eleanor of Aquitaine',    category: 'Cavalry'     },
      // Leadership (1)
      { name: 'Matthias I',              category: 'Leadership'  },
      // Engineering (1)
      { name: 'Stephen III',             category: 'Engineering' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Speedup time parser — matches original source exactly             */
/*  Accepts: "1d 2h 30m", "1:30:00", "1:30", "2400", "2.5" (days)   */
/* ------------------------------------------------------------------ */

function parseSpeedupTime(timeStr: string, mode: SpeedupMode = 'auto'): number {
  if (!timeStr) return 0
  const s = timeStr.trim()
  if (!s) return 0

  if (mode === 'days') {
    const d = parseFloat(s)
    return isNaN(d) ? 0 : Math.floor(d * 1440)
  }
  if (mode === 'minutes') {
    const m = parseFloat(s)
    return isNaN(m) ? 0 : Math.floor(m)
  }

  // auto mode
  let total = 0

  // HH:MM or HH:MM:SS
  const timeMatch = s.match(/(\d+):(\d+)(?::(\d+))?/)
  if (timeMatch) {
    total += parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2])
    return total
  }

  const dayMatch  = s.match(/(\d+)\s*d/i)
  const hourMatch = s.match(/(\d+)\s*h/i)
  const minMatch  = s.match(/(\d+)\s*m(?!s)/i)

  if (dayMatch)  total += parseInt(dayMatch[1]) * 1440
  if (hourMatch) total += parseInt(hourMatch[1]) * 60
  if (minMatch)  total += parseInt(minMatch[1])

  // plain number fallback → treat as minutes
  if (total === 0 && /^\d+(\.\d+)?$/.test(s)) {
    total = Math.floor(parseFloat(s))
  }

  return total
}

function formatSpeedupValue(val: number, mode: SpeedupMode): string {
  if (!val) return ''
  if (mode === 'days') {
    const d = val / 1440
    return d % 1 === 0 ? d.toString() : d.toFixed(2)
  }
  return val.toString()
}

/* ------------------------------------------------------------------ */
/*  Cost calculation — matches original calculateTotalCost exactly    */
/* ------------------------------------------------------------------ */

interface CostInfo {
  baseCost: number
  total: number
  t1Count: number
  t2Count: number
  t3Count: number
  t1Cost: number
  t2Cost: number
  t3Cost: number
  shortfall: number   // tokens needed beyond selections (to meet minSpend)
}

function calcCost(selected: Set<string>): CostInfo {
  const t1Cmds = TIERS_DATA[0].commanders.filter((c) => selected.has(c.name))
  const t2Cmds = TIERS_DATA[1].commanders.filter((c) => selected.has(c.name))
  const t3Cmds = TIERS_DATA[2].commanders.filter((c) => selected.has(c.name))

  const t1Cost = t1Cmds.length * T1_COST
  const t2Cost = t2Cmds.length * T2_COST
  const t3Cost = t3Cmds.length * T3_COST
  const baseCost = t1Cost + t2Cost + t3Cost

  // Find highest tier selected and its minSpend
  let maxMinSpend = 0
  let highestTierId = 0
  let highestTierCost = 0

  if (t3Cmds.length > 0) { maxMinSpend = T3_MIN_SPEND; highestTierId = 3; highestTierCost = t3Cost }
  else if (t2Cmds.length > 0) { maxMinSpend = T2_MIN_SPEND; highestTierId = 2; highestTierCost = t2Cost }

  // Total cost = max(baseCost, minSpend + highestTierCost)
  const total = highestTierId > 0
    ? Math.max(baseCost, maxMinSpend + highestTierCost)
    : baseCost

  return {
    baseCost,
    total,
    t1Count: t1Cmds.length,
    t2Count: t2Cmds.length,
    t3Count: t3Cmds.length,
    t1Cost,
    t2Cost,
    t3Cost,
    shortfall: total - baseCost,
  }
}

function calcGemTokens(gems: number): number {
  if (!gems || gems < 0) return 0
  return Math.floor(gems / GEMS_RATE) * 30
}

/* ------------------------------------------------------------------ */
/*  Token sources donut chart                                           */
/* ------------------------------------------------------------------ */

const TOKEN_COLORS = {
  Daily:      '#4ade80',
  Challenges: '#60a5fa',
  Speedups:   '#a78bfa',
  Gems:       '#facc15',
}

function TokenDonut({
  daily, challenges, speedups, gems, total,
}: { daily: number; challenges: number; speedups: number; gems: number; total: number }) {
  const raw = [
    { name: 'Daily',      value: daily      },
    { name: 'Challenges', value: challenges },
    { name: 'Speedups',   value: speedups   },
    { name: 'Gems',       value: gems       },
  ].filter((d) => d.value > 0)

  if (raw.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground/40 text-xs">
        No tokens yet
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={raw}
            dataKey="value"
            innerRadius={52}
            outerRadius={76}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
          >
            {raw.map((entry) => (
              <Cell key={entry.name} fill={TOKEN_COLORS[entry.name as keyof typeof TOKEN_COLORS]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
            formatter={(value: number, name: string) => [
              `${value} (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold text-foreground tabular-nums">{total.toLocaleString()}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">tokens</span>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
        {raw.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: TOKEN_COLORS[entry.name as keyof typeof TOKEN_COLORS] }}
            />
            <span>{entry.name}</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function GatheringOfHeroesContent() {
  // Challenge missions
  const [checkedChallenges, setCheckedChallenges] = useState<Set<ChallengeId>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('goh:challenges') ?? '[]') as ChallengeId[]) } catch { return new Set() }
  })

  // Gems
  const [gemsInput, setGemsInput] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem('goh:gems') ?? '' } catch { return '' }
  })

  // Speedup per-category (manual entry)
  const [speedupMode, setSpeedupMode] = useState<SpeedupMode>(() => {
    if (typeof window === 'undefined') return 'auto'
    try { return (localStorage.getItem('goh:speedupMode') as SpeedupMode) ?? 'auto' } catch { return 'auto' }
  })
  const [speedupCats, setSpeedupCats] = useState<Record<SpeedupCategory, number>>(() => {
    if (typeof window === 'undefined') return { building: 0, research: 0, training: 0, healing: 0, universal: 0 }
    try { return JSON.parse(localStorage.getItem('goh:speedupCats') ?? 'null') ?? { building: 0, research: 0, training: 0, healing: 0, universal: 0 } } catch { return { building: 0, research: 0, training: 0, healing: 0, universal: 0 } }
  })
  // Speedup calculator (paste from external tool)
  const [calcStr, setCalcStr] = useState('')

  // Commander selection
  const [selectedCommanders, setSelectedCommanders] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('goh:commanders') ?? '[]') as string[]) } catch { return new Set() }
  })
  const [showChallenges, setShowChallenges] = useState(true)
  const [showSpeedupCats, setShowSpeedupCats] = useState(false)
  const [expandedTiers, setExpandedTiers] = useState<Set<number>>(new Set([1, 2, 3]))
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  useEffect(() => { localStorage.setItem('goh:challenges', JSON.stringify([...checkedChallenges])) }, [checkedChallenges])
  useEffect(() => { localStorage.setItem('goh:gems', gemsInput) }, [gemsInput])
  useEffect(() => { localStorage.setItem('goh:speedupMode', speedupMode) }, [speedupMode])
  useEffect(() => { localStorage.setItem('goh:speedupCats', JSON.stringify(speedupCats)) }, [speedupCats])
  useEffect(() => { localStorage.setItem('goh:commanders', JSON.stringify([...selectedCommanders])) }, [selectedCommanders])

  /* ---- derived values ---- */
  const challengeTokens = useMemo(
    () => CHALLENGE_MISSIONS.filter((m) => checkedChallenges.has(m.id)).reduce((s, m) => s + m.tokens, 0),
    [checkedChallenges],
  )

  const gemTokens = useMemo(() => calcGemTokens(parseFloat(gemsInput) || 0), [gemsInput])

  // speedup = (sum of per-category minutes + parsed calculator minutes) / 480 * 2
  const speedupMinutesTotal = useMemo(
    () => Object.values(speedupCats).reduce((a, b) => a + b, 0),
    [speedupCats],
  )
  const calcMinutes = useMemo(() => parseSpeedupTime(calcStr, speedupMode), [calcStr, speedupMode])
  const speedupTokens = useMemo(
    () => Math.floor((speedupMinutesTotal + calcMinutes) / SPEEDUP_RATE) * 2,
    [speedupMinutesTotal, calcMinutes],
  )

  const totalTokens = DAILY_TOKENS + challengeTokens + gemTokens + speedupTokens

  const costInfo = useMemo(() => calcCost(selectedCommanders), [selectedCommanders])
  const remaining = totalTokens - costInfo.total
  const canAfford = remaining >= 0
  const progress = costInfo.total > 0 ? Math.min(100, (totalTokens / costInfo.total) * 100) : 0

  /* ---- handlers ---- */
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

  const updateSpeedupCat = (cat: SpeedupCategory, raw: string) => {
    const minutes = parseSpeedupTime(raw, speedupMode)
    setSpeedupCats((prev) => ({ ...prev, [cat]: Math.max(0, minutes) }))
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
                <div className="text-sm flex-1">
                  <span className="text-foreground font-medium">{DAILY_TOKENS} tokens</span>
                  <span className="text-muted-foreground ml-2">
                    ({EVENT_DAYS} days × {DAILY_TOKENS_PER_DAY}/day — Login +2, Barbarians +10, Gather +6)
                  </span>
                </div>
                <span className="text-primary font-bold tabular-nums">+{DAILY_TOKENS}</span>
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
                {speedupTokens > 0 && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    +{speedupTokens} tokens
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rate info */}
              <p className="text-xs text-muted-foreground">
                Rate: <span className="text-foreground">480 minutes = 2 tokens</span> (repeatable)
              </p>

              {/* Calculator text input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Speedup Time
                  </Label>
                  {/* Mode tabs */}
                  <div className="flex gap-0.5 bg-secondary rounded-md p-0.5">
                    {(['auto', 'days', 'minutes'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSpeedupMode(mode)}
                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                          speedupMode === mode
                            ? 'bg-primary/20 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  type="text"
                  value={calcStr}
                  onChange={(e) => setCalcStr(e.target.value)}
                  placeholder={
                    speedupMode === 'days'    ? 'e.g. 3.5 (days)' :
                    speedupMode === 'minutes' ? 'e.g. 2400 (minutes)' :
                    'e.g. 1d 2h 30m  or  2400  or  1:30:00'
                  }
                  className="bg-background border-border font-mono text-sm"
                />
                {calcMinutes > 0 && (
                  <p className="text-xs text-blue-400">
                    = {calcMinutes.toLocaleString()} minutes parsed
                  </p>
                )}
              </div>

              {/* Per-category breakdown (collapsible) */}
              <div>
                <button
                  onClick={() => setShowSpeedupCats((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSpeedupCats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Per-category breakdown (building, research, training…)
                </button>
                {showSpeedupCats && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SPEEDUP_CATEGORIES.map(({ id, label }) => (
                      <div key={id} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {label}
                        </Label>
                        <Input
                          type="text"
                          value={formatSpeedupValue(speedupCats[id], speedupMode)}
                          onChange={(e) => updateSpeedupCat(id, e.target.value)}
                          placeholder={speedupMode === 'days' ? '0d' : '0'}
                          className="h-8 bg-background border-border font-mono text-xs"
                        />
                      </div>
                    ))}
                    {speedupMinutesTotal > 0 && (
                      <div className="col-span-full rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Category total
                        </span>
                        <span className="text-xs font-bold text-blue-400">
                          {speedupMinutesTotal.toLocaleString()}m
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary */}
              {(speedupMinutesTotal + calcMinutes) > 0 && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Total: {(speedupMinutesTotal + calcMinutes).toLocaleString()} minutes
                  </div>
                  <span className="text-lg font-bold text-blue-400 tabular-nums">
                    +{speedupTokens} tokens
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Gems (Repeatable) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                Gems Spent
                {gemTokens > 0 && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                    +{gemTokens} tokens
                  </span>
                )}
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
                  <span className="text-2xl font-bold text-yellow-400 tabular-nums">+{gemTokens}</span>
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
                const tierSelCount = tier.commanders.filter((c) => selectedCommanders.has(c.name)).length

                return (
                  <div key={tier.tier} className={`rounded-lg border ${tier.borderColor} ${tier.bgColor}`}>
                    <button
                      onClick={() => toggleTier(tier.tier)}
                      className="flex w-full items-center justify-between px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-wider ${tier.color}`}>
                          {tier.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tier.cost} tokens/commander
                        </span>
                        {tier.minSpend > 0 && (
                          <span className="text-xs text-muted-foreground/70">
                            · requires {tier.minSpend.toLocaleString()} spent first
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tierSelCount > 0 && (
                          <span className={`text-xs font-medium tabular-nums ${tier.color}`}>
                            {tierSelCount} selected
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
                                <span className="text-xs text-muted-foreground/60 ml-1">
                                  ({catCommanders.length})
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
                                      className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-1 hover:bg-secondary/50 transition-colors"
                                    >
                                      <Checkbox
                                        checked={selectedCommanders.has(c.name)}
                                        onCheckedChange={() => toggleCommander(c.name)}
                                      />
                                      <span className={`text-sm flex-1 transition-colors ${
                                        selectedCommanders.has(c.name) ? tier.color : 'text-foreground'
                                      }`}>
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
        <div className="space-y-4">
          {/* Token summary card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Token donut chart */}
              <TokenDonut
                daily={DAILY_TOKENS}
                challenges={challengeTokens}
                speedups={speedupTokens}
                gems={gemTokens}
                total={totalTokens}
              />

              {/* Token breakdown */}
              <div className="space-y-2 text-sm border-t border-border pt-3">
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
                  <span>Total tokens</span>
                  <span className="tabular-nums text-primary text-lg">{totalTokens.toLocaleString()}</span>
                </div>
              </div>

              {/* Cost breakdown */}
              {selCount > 0 && (
                <>
                  <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                    {costInfo.t1Count > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>T1 ×{costInfo.t1Count} @ 200</span>
                        <span className="tabular-nums">{costInfo.t1Cost.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.t2Count > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>T2 ×{costInfo.t2Count} @ 500</span>
                        <span className="tabular-nums">{costInfo.t2Cost.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.t3Count > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>T3 ×{costInfo.t3Count} @ 1000</span>
                        <span className="tabular-nums">{costInfo.t3Cost.toLocaleString()}</span>
                      </div>
                    )}
                    {costInfo.shortfall > 0 && (
                      <div className="flex justify-between text-yellow-400/80 text-xs">
                        <span>Tier unlock cost</span>
                        <span className="tabular-nums">+{costInfo.shortfall.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
                      <span>Total cost</span>
                      <span className="tabular-nums">{costInfo.total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${canAfford ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Can afford / shortfall */}
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
                            Deselect commanders or earn more tokens
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selected commanders list */}
                  <div className="border-t border-border pt-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Selected ({selCount})
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {TIERS_DATA.map((tier) =>
                        tier.commanders
                          .filter((c) => selectedCommanders.has(c.name))
                          .map((c) => {
                            const CatIcon = CATEGORY_ICONS[c.category]
                            return (
                              <div
                                key={c.name}
                                className="flex items-center gap-2 text-xs rounded px-2 py-1 bg-secondary/30"
                              >
                                <CatIcon className={`h-3 w-3 shrink-0 ${CATEGORY_COLORS[c.category]}`} />
                                <span className="flex-1 truncate text-foreground">{c.name}</span>
                                <span className={`tabular-nums font-medium ${tier.color}`}>
                                  {tier.cost}
                                </span>
                              </div>
                            )
                          })
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

              {/* Tier requirements */}
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tier Unlock Requirements
                </p>
                {TIERS_DATA.map((t) => (
                  <div key={t.tier} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`font-medium ${t.color}`}>{t.label}</span>
                    <span className="text-muted-foreground/60">—</span>
                    <span>
                      {t.minSpend === 0
                        ? 'available immediately'
                        : `spend ${t.minSpend.toLocaleString()} tokens in lower tiers first`}
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
