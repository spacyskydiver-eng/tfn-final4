'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Zap,
  Award,
  Star,
  Crown,
  Building2,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { expandBuildingsForCH } from '@/lib/game/buildings'
import { economyTree } from '@/lib/tech-tree/economy'
import { militaryTree } from '@/lib/tech-tree/military'
import { EquipmentCalculator } from '@/components/equipment-calculator'
import { MgeCalculator } from '@/components/mge-calculator'
import { GemsPlanner } from '@/components/commander/GemsPlanner'
import { WheelOfFortuneSection } from '@/components/commander/WheelOfFortuneSection'
import { Sword, Trophy } from 'lucide-react'
import type { AccountProfile } from '@/lib/engine/types'

/* ------------------------------------------------------------------ */
/*  TOOL TABS                                                          */
/* ------------------------------------------------------------------ */
const TOOLS = [
  { id: 'action-points', label: 'Action Points', icon: Zap },
  { id: 'skill-upgrades', label: 'Skill Upgrades', icon: Award },
  { id: 'commander-exp', label: 'Commander EXP', icon: Star },
  { id: 'vip-level', label: 'VIP Level', icon: Crown },
  { id: 'buildings', label: 'Buildings', icon: Building2 },
  { id: 'technology', label: 'Technology', icon: FlaskConical },
  { id: 'equipment', label: 'Equipment', icon: Sword },
  { id: 'mge', label: 'MGE Calculator', icon: Trophy },
  { id: 'gems', label: 'Gems Planner', icon: Star },
  { id: 'wheel', label: 'Wheel of Fortune', icon: Award },
] as const

type ToolId = (typeof TOOLS)[number]['id']

/* ------------------------------------------------------------------ */
/*  ACTION POINT DATA                                                  */
/* ------------------------------------------------------------------ */
const AP_POTIONS = [
  { label: '50 AP', value: 50 },
  { label: '100 AP', value: 100 },
  { label: '500 AP', value: 500 },
  { label: '1000 AP', value: 1000 },
]

/* ------------------------------------------------------------------ */
/*  SKILL UPGRADE DATA                                                 */
/* ------------------------------------------------------------------ */
// Skill upgrade costs: 16 sequential upgrades for legendary commanders
// Costs are the same regardless of which skill receives the upgrade
const SKILL_UPGRADE_COSTS = [
  10, 10, 15, 15,  // Upgrades 1-4
  30, 30, 40, 40,  // Upgrades 5-8
  45, 45, 50, 50,  // Upgrades 9-12
  75, 75, 80, 80,  // Upgrades 13-16
]

function getSkillDigits(skillStr: string): number[] | null {
  const n = Number(skillStr)
  if (!Number.isFinite(n) || n < 1111 || n > 5555) return null
  const digits = String(n).split('').map(Number)
  if (digits.length !== 4 || digits.some(d => d < 1 || d > 5)) return null
  return digits
}

function getTotalUpgradesUsed(digits: number[]): number {
  // Calculate total number of upgrades used across all skills
  // Each skill level X uses (X-1) upgrades
  let total = 0
  for (let i = 0; i < 4; i++) {
    total += digits[i] - 1
  }
  return total
}

function calcSkillCost(startStr: string, endStr: string): number | string {
  const startDigits = getSkillDigits(startStr)
  const endDigits = getSkillDigits(endStr)
  
  if (!startDigits || !endDigits) return 'Invalid skill level format (use e.g. 1111 to 5555)'
  
  // Check that we're only going up
  for (let i = 0; i < 4; i++) {
    if (endDigits[i] < startDigits[i]) {
      return 'Cannot decrease skill levels'
    }
  }
  
  const startUpgrades = getTotalUpgradesUsed(startDigits)
  const endUpgrades = getTotalUpgradesUsed(endDigits)
  
  if (endUpgrades <= startUpgrades) {
    return 'Desired level must be higher than starting level'
  }
  
  // Sum costs for upgrades from (startUpgrades + 1) to endUpgrades
  let total = 0
  for (let i = startUpgrades; i < endUpgrades; i++) {
    total += SKILL_UPGRADE_COSTS[i]
  }
  
  return total
}

/* ------------------------------------------------------------------ */
/*  COMMANDER EXP DATA                                                 */
/* ------------------------------------------------------------------ */

// Legendary commander upgrade level costs - index is the target level
// Value is cumulative cost from level 1 to reach that level
const LEGENDARY_UPGRADE_COSTS = [
  0,        // Index 0 (not used)
  0,        // Index 1: Level 1 (starting point - no cost)
  120,      // Index 2: Cumulative cost to reach level 2
  480,      // Index 3: Cumulative cost to reach level 3
  1200,     // Index 4: Cumulative cost to reach level 4
  2400,     // Index 5: Cumulative cost to reach level 5
  6000,     // Index 6: Cumulative cost to reach level 6
  13200,    // Index 7: Cumulative cost to reach level 7
  24000,    // Index 8: Cumulative cost to reach level 8
  38400,    // Index 9: Cumulative cost to reach level 9
  56400,    // Index 10: Cumulative cost to reach level 10
  78600,    // Index 11: Cumulative cost to reach level 11
  105600,   // Index 12: Cumulative cost to reach level 12
  138000,   // Index 13: Cumulative cost to reach level 13
  176400,   // Index 14: Cumulative cost to reach level 14
  221400,   // Index 15: Cumulative cost to reach level 15
  273600,   // Index 16: Cumulative cost to reach level 16
  333600,   // Index 17: Cumulative cost to reach level 17
  401400,   // Index 18: Cumulative cost to reach level 18
  477000,   // Index 19: Cumulative cost to reach level 19
  561000,   // Index 20: Cumulative cost to reach level 20
  651000,   // Index 21: Cumulative cost to reach level 21
  747000,   // Index 22: Cumulative cost to reach level 22
  850200,   // Index 23: Cumulative cost to reach level 23
  960600,   // Index 24: Cumulative cost to reach level 24
  1080000,  // Index 25: Cumulative cost to reach level 25
  1200000,  // Index 26: Cumulative cost to reach level 26
  1340000,  // Index 27: Cumulative cost to reach level 27
  1480000,  // Index 28: Cumulative cost to reach level 28
  1630000,  // Index 29: Cumulative cost to reach level 29
  1790000,  // Index 30: Cumulative cost to reach level 30
  1970000,  // Index 31: Cumulative cost to reach level 31
  2180000,  // Index 32: Cumulative cost to reach level 32
  2410000,  // Index 33: Cumulative cost to reach level 33
  2680000,  // Index 34: Cumulative cost to reach level 34
  2990000,  // Index 35: Cumulative cost to reach level 35
  3350000,  // Index 36: Cumulative cost to reach level 36
  3770000,  // Index 37: Cumulative cost to reach level 37
  4240000,  // Index 38: Cumulative cost to reach level 38
  4780000,  // Index 39: Cumulative cost to reach level 39
  5440000,  // Index 40: Cumulative cost to reach level 40
  6250000,  // Index 41: Cumulative cost to reach level 41
  7210000,  // Index 42: Cumulative cost to reach level 42
  8350000,  // Index 43: Cumulative cost to reach level 43
  9670000,  // Index 44: Cumulative cost to reach level 44
  11200000, // Index 45: Cumulative cost to reach level 45
  12940000, // Index 46: Cumulative cost to reach level 46
  14920000, // Index 47: Cumulative cost to reach level 47
  17140000, // Index 48: Cumulative cost to reach level 48
  19660000, // Index 49: Cumulative cost to reach level 49
  22480000, // Index 50: Cumulative cost to reach level 50
  25300000, // Index 51: Cumulative cost to reach level 51
  28120000, // Index 52: Cumulative cost to reach level 52
  30940000, // Index 53: Cumulative cost to reach level 53
  33760000, // Index 54: Cumulative cost to reach level 54
  36580000, // Index 55: Cumulative cost to reach level 55
  39400000, // Index 56: Cumulative cost to reach level 56
  42220000, // Index 57: Cumulative cost to reach level 57
  45040000, // Index 58: Cumulative cost to reach level 58
  47860000, // Index 59: Cumulative cost to reach level 59
  50680000, // Index 60: Cumulative cost to reach level 60
]

function getLegendaryUpgradeCost(fromLevel: number, toLevel: number): number {
  if (fromLevel < 1 || toLevel > 60 || toLevel <= fromLevel) {
    return 0
  }
  // Get cumulative costs and subtract
  const fromCost = LEGENDARY_UPGRADE_COSTS[fromLevel] || 0
  const toCost = LEGENDARY_UPGRADE_COSTS[toLevel] || 0
  return Math.max(0, toCost - fromCost)
}

const EXP_TOMES = [
  { label: '100 EXP', value: 100 },
  { label: '500 EXP', value: 500 },
  { label: '1K EXP', value: 1000 },
  { label: '5K EXP', value: 5000 },
  { label: '10K EXP', value: 10000 },
  { label: '20K EXP', value: 20000 },
  { label: '50K EXP', value: 50000 },
]

/* ------------------------------------------------------------------ */
/*  VIP LEVEL DATA                                                     */
/* ------------------------------------------------------------------ */
const VIP_LEVELS = [
  { level: 'VIP 0', points: 0 },
  { level: 'VIP 1', points: 200 },
  { level: 'VIP 2', points: 400 },
  { level: 'VIP 3', points: 1200 },
  { level: 'VIP 4', points: 3500 },
  { level: 'VIP 5', points: 6000 },
  { level: 'VIP 6', points: 11500 },
  { level: 'VIP 7', points: 35000 },
  { level: 'VIP 8', points: 75000 },
  { level: 'VIP 9', points: 150000 },
  { level: 'VIP 10', points: 250000 },
  { level: 'VIP 11', points: 350000 },
  { level: 'VIP 12', points: 500000 },
  { level: 'VIP 13', points: 750000 },
  { level: 'VIP 14', points: 1000000 },
  { level: 'VIP 15', points: 1500000 },
  { level: 'VIP 16', points: 2500000 },
]

const VIP_TOKENS = [
  { label: '100 VIP', value: 100 },
  { label: '1K VIP', value: 1000 },
  { label: '10K VIP', value: 10000 },
  { label: '50K VIP', value: 50000 },
  { label: '100K VIP', value: 100000 },
]

/* ------------------------------------------------------------------ */
/*  BUILDING DATA (reusing user's rules)                               */
/* ------------------------------------------------------------------ */
const BUILDING_DEFS = [
  { id: 'city_hall', name: 'City Hall' },
  { id: 'wall', name: 'Wall' },
  { id: 'watchtower', name: 'Watchtower' },
  { id: 'castle', name: 'Castle' },
  { id: 'academy', name: 'Academy' },
  { id: 'hospital', name: 'Hospital' },
  { id: 'barracks', name: 'Barracks' },
  { id: 'archery_range', name: 'Archery Range' },
  { id: 'stable', name: 'Stable' },
  { id: 'siege_workshop', name: 'Siege Workshop' },
  { id: 'storehouse', name: 'Storehouse' },
  { id: 'tavern', name: 'Tavern' },
  { id: 'scout_camp', name: 'Scout Camp' },
  { id: 'alliance_center', name: 'Alliance Center' },
  { id: 'trading_post', name: 'Trading Post' },
  { id: 'farm', name: 'Farm' },
  { id: 'lumber_mill', name: 'Lumber Mill' },
  { id: 'quarry', name: 'Quarry' },
  { id: 'goldmine', name: 'Gold Mine' },
]

function buildingCostPerLevel(level: number) {
  return {
    food: Math.round(1000 * Math.pow(1.25, level - 1)),
    wood: Math.round(1000 * Math.pow(1.25, level - 1)),
    stone: Math.round(800 * Math.pow(1.25, level - 1)),
    gold: Math.round(500 * Math.pow(1.25, level - 1)),
    time: Math.round(60 * Math.pow(1.15, level - 1)),
  }
}

/* ================================================================== */
/*  PROFILE MANAGEMENT FOR GEMS/WHEEL PLANNERS                        */
/* ================================================================== */

const STORAGE_KEY = 'general_tools_profile_v1'

function loadProfile(): AccountProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  
  // Return a default profile if none exists
  return {
    id: `profile-${Date.now()}`,
    name: 'General Tools',
    kingdom: '',
    vipLevel: 10,
    currentGems: 0,
    dailyGemIncome: 0,
    daysUntilGoal: 30,
    commanders: [],
    wofTargetSpins: 0,
    wofBundles: {},
    startDate: new Date().toISOString().slice(0, 10),
    currentGoldHeads: 0,
    actualProgress: {},
  }
}

function saveProfile(profile: AccountProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch { /* ignore */ }
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export function GeneralToolsContent() {
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>('action-points')
  const currentIdx = TOOLS.findIndex(t => t.id === activeTool)

  useEffect(() => {
    const loaded = loadProfile()
    setProfile(loaded)
  }, [])

  const updateProfile = (updated: AccountProfile) => {
    setProfile(updated)
    saveProfile(updated)
  }

  const goPrev = () => {
    const idx = (currentIdx - 1 + TOOLS.length) % TOOLS.length
    setActiveTool(TOOLS[idx].id)
  }
  const goNext = () => {
    const idx = (currentIdx + 1) % TOOLS.length
    setActiveTool(TOOLS[idx].id)
  }

  return (
    <div className="space-y-6">
      {/* Tool tabs */}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(tool => {
          const Icon = tool.icon
          const active = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tool.label}
            </button>
          )
        })}
      </div>

      {/* Tool content area with navigation arrows */}
      <div className="flex items-center gap-4">
        <button
          onClick={goPrev}
          className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          aria-label="Previous tool"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex-1 min-w-0">
          {activeTool === 'action-points' && <ActionPointsCalc />}
          {activeTool === 'skill-upgrades' && <SkillUpgradesCalc />}
          {activeTool === 'commander-exp' && <CommanderExpCalc />}
          {activeTool === 'vip-level' && <VipLevelCalc />}
          {activeTool === 'buildings' && <BuildingsCalc />}
          {activeTool === 'technology' && <TechnologyCalc />}
          {activeTool === 'equipment' && <EquipmentCalculator />}
          {activeTool === 'mge' && <MgeCalculator />}
          {activeTool === 'gems' && profile && <GemsPlanner profile={profile} onUpdate={updateProfile} />}
          {activeTool === 'wheel' && profile && <WheelOfFortuneSection profile={profile} onUpdate={updateProfile} />}
        </div>

        <button
          onClick={goNext}
          className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          aria-label="Next tool"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  ACTION POINTS CALCULATOR                                           */
/* ================================================================== */

function ActionPointsCalc() {
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(AP_POTIONS.map(p => [p.value, 0]))
  )
  const [result, setResult] = useState<number | null>(null)

  const calculate = () => {
    let total = 0
    for (const p of AP_POTIONS) {
      total += (quantities[p.value] || 0) * p.value
    }
    setResult(total)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <Zap className="h-7 w-7 text-primary" />
          Action Points
        </h2>
        <p className="text-muted-foreground">Calculate the total Action Points available in your inventory.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Point Potions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {AP_POTIONS.map(p => (
              <div key={p.value} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/30 p-4">
                <span className="text-sm font-medium text-foreground">{p.label}</span>
                <Input
                  type="number"
                  min={0}
                  value={quantities[p.value] || ''}
                  onChange={e => setQuantities(prev => ({
                    ...prev,
                    [p.value]: Number(e.target.value) || 0,
                  }))}
                  className="w-24 text-center"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <Button onClick={calculate} className="w-full">
            Calculate
          </Button>

          {result !== null && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center">
              <span className="text-lg font-bold text-foreground">
                {'Total: '}{result.toLocaleString()}{' Action Points'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/*  SKILL UPGRADES CALCULATOR                                          */
/* ================================================================== */

function SkillUpgradesCalc() {
  const [startLevel, setStartLevel] = useState('')
  const [desiredLevel, setDesiredLevel] = useState('')
  const [result, setResult] = useState<string | number | null>(null)

  const calculate = () => {
    const r = calcSkillCost(startLevel, desiredLevel)
    setResult(r)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <Award className="h-7 w-7 text-primary" />
          Skill Upgrades
        </h2>
        <p className="text-muted-foreground">{"Calculate the total number of legendary sculptures required to upgrade a commander's skills."}</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Starting Skill Level</Label>
            <Input
              value={startLevel}
              onChange={e => setStartLevel(e.target.value)}
              placeholder="Example: 1111"
            />
          </div>

          <div className="space-y-2">
            <Label>Desired Skill Level</Label>
            <Input
              value={desiredLevel}
              onChange={e => setDesiredLevel(e.target.value)}
              placeholder="Example: 5555"
            />
          </div>

          <Button onClick={calculate} className="w-full">
            Calculate
          </Button>

          {result !== null && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center">
              <span className="text-lg font-bold text-foreground">
                {typeof result === 'number'
                  ? `${result.toLocaleString()} Legendary Sculptures Needed`
                  : result}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/*  COMMANDER EXP CALCULATOR                                           */
/* ================================================================== */

function CommanderExpCalc() {
  const [currentLevel, setCurrentLevel] = useState('')
  const [currentExp, setCurrentExp] = useState('')
  const [desiredLevel, setDesiredLevel] = useState('')
  const [useTomes, setUseTomes] = useState(false)
  const [tomeQuantities, setTomeQuantities] = useState<Record<number, number>>(
    Object.fromEntries(EXP_TOMES.map(t => [t.value, 0]))
  )
  const [result, setResult] = useState<{ expNeeded: number; tomeExp: number } | null>(null)

  const calculate = () => {
    const curLvl = Number(currentLevel) || 1
    const desLvl = Number(desiredLevel) || 60
    const curExp = Number(currentExp) || 0

    if (curLvl >= 60) {
      setResult({ expNeeded: 0, tomeExp: 0 })
      return
    }

    // Get costs from the table using getLegendaryUpgradeCost
    const totalCostNeeded = getLegendaryUpgradeCost(curLvl, desLvl)
    const expNeeded = Math.max(0, totalCostNeeded - curExp)

    let tomeExp = 0
    if (useTomes) {
      for (const t of EXP_TOMES) {
        tomeExp += (tomeQuantities[t.value] || 0) * t.value
      }
    }

    setResult({ expNeeded, tomeExp })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <Star className="h-7 w-7 text-primary" />
          Commander EXP
        </h2>
        <p className="text-muted-foreground">Calculate the total experience needed to level up your legendary commander.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Current Level</Label>
            <Input
              value={currentLevel}
              onChange={e => setCurrentLevel(e.target.value)}
              placeholder="Example: 45"
              type="number"
              min="1"
              max="60"
            />
          </div>

          <div className="space-y-2">
            <Label>Current EXP on Level</Label>
            <Input
              value={currentExp}
              onChange={e => setCurrentExp(e.target.value)}
              placeholder="Example: 500000"
              type="number"
            />
            <p className="text-xs text-muted-foreground">You can leave level info blank to only calculate EXP from tomes.</p>
          </div>

          <div className="space-y-2">
            <Label>Desired Level</Label>
            <Input
              value={desiredLevel}
              onChange={e => setDesiredLevel(e.target.value)}
              placeholder="Example: 60"
              type="number"
              min="1"
              max="60"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={useTomes} onCheckedChange={setUseTomes} id="calc-tomes" />
            <Label htmlFor="calc-tomes">Calculate Experience Tomes</Label>
          </div>

          {useTomes && (
            <div className="grid grid-cols-2 gap-3">
              {EXP_TOMES.map(t => (
                <div key={t.value} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={tomeQuantities[t.value] || ''}
                    onChange={e => setTomeQuantities(prev => ({
                      ...prev,
                      [t.value]: Number(e.target.value) || 0,
                    }))}
                    className="w-20 text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={calculate} className="w-full">
            Calculate
          </Button>

          {result !== null && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-2 text-center">
              <div className="text-lg font-bold text-foreground">
                {'EXP Needed: '}{result.expNeeded.toLocaleString()}
              </div>
              {useTomes && result.tomeExp > 0 && (
                <>
                  <div className="text-sm text-muted-foreground">
                    {'Tomes provide: '}{result.tomeExp.toLocaleString()}{' EXP'}
                  </div>
                  <div className={`text-sm font-semibold ${result.expNeeded - result.tomeExp > 0 ? 'text-destructive' : 'text-green-400'}`}>
                    {result.expNeeded - result.tomeExp > 0
                      ? `Still need ${(result.expNeeded - result.tomeExp).toLocaleString()} EXP`
                      : 'You have enough EXP!'}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/*  VIP LEVEL CALCULATOR                                               */
/* ================================================================== */

function VipLevelCalc() {
  const [currentPoints, setCurrentPoints] = useState('')
  const [desiredLevel, setDesiredLevel] = useState('SVIP')
  const [useTokens, setUseTokens] = useState(false)
  const [tokenQuantities, setTokenQuantities] = useState<Record<number, number>>(
    Object.fromEntries(VIP_TOKENS.map(t => [t.value, 0]))
  )
  const [result, setResult] = useState<{ pointsNeeded: number; tokenPoints: number } | null>(null)

  const calculate = () => {
    const target = VIP_LEVELS.find(v => v.level === desiredLevel)
    if (!target) return

    const cur = Number(currentPoints) || 0
    const needed = Math.max(0, target.points - cur)

    let tokenPts = 0
    if (useTokens) {
      for (const t of VIP_TOKENS) {
        tokenPts += (tokenQuantities[t.value] || 0) * t.value
      }
    }

    setResult({ pointsNeeded: needed, tokenPoints: tokenPts })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <Crown className="h-7 w-7 text-primary" />
          VIP Level
        </h2>
        <p className="text-muted-foreground">Calculate the VIP points needed to reach your desired VIP level.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Current VIP Points</Label>
            <Input
              value={currentPoints}
              onChange={e => setCurrentPoints(e.target.value)}
              placeholder="Example: 1,500,000"
              type="number"
            />
            <p className="text-xs text-muted-foreground">You can leave VIP points blank to only calculate VIP from tokens.</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={useTokens} onCheckedChange={setUseTokens} id="vip-tokens" />
            <Label htmlFor="vip-tokens">Calculate VIP Tokens</Label>
          </div>

          {useTokens && (
            <div className="grid grid-cols-2 gap-3">
              {VIP_TOKENS.map(t => (
                <div key={t.value} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={tokenQuantities[t.value] || ''}
                    onChange={e => setTokenQuantities(prev => ({
                      ...prev,
                      [t.value]: Number(e.target.value) || 0,
                    }))}
                    className="w-20 text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Desired VIP Level</Label>
            <Select value={desiredLevel} onValueChange={setDesiredLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIP_LEVELS.map(v => (
                  <SelectItem key={v.level} value={v.level}>
                    {v.level}{' ('}{v.points.toLocaleString()}{' pts)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={calculate} className="w-full">
            Calculate
          </Button>

          {result !== null && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-2 text-center">
              <div className="text-lg font-bold text-foreground">
                {'Points Needed: '}{result.pointsNeeded.toLocaleString()}
              </div>
              {useTokens && result.tokenPoints > 0 && (
                <>
                  <div className="text-sm text-muted-foreground">
                    {'Tokens provide: '}{result.tokenPoints.toLocaleString()}{' points'}
                  </div>
                  <div className={`text-sm font-semibold ${result.pointsNeeded - result.tokenPoints > 0 ? 'text-destructive' : 'text-green-400'}`}>
                    {result.pointsNeeded - result.tokenPoints > 0
                      ? `Still need ${(result.pointsNeeded - result.tokenPoints).toLocaleString()} points`
                      : 'You have enough points!'}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/*  BUILDING REQUIREMENT HELPERS                                       */
/* ================================================================== */

const BUILDING_REQUIREMENTS: Record<string, (level: number) => { id: string; level: number }[]> = {
  city_hall: (level) => {
    const reqs: { id: string; level: number }[] = [{ id: 'wall', level: level - 1 }]
    if (level >= 10) reqs.push({ id: 'academy', level: level - 1 })
    return reqs
  },
  academy: (level) => {
    const reqs: { id: string; level: number }[] = [{ id: 'city_hall', level }]
    if (level >= 25) reqs.push({ id: 'watchtower', level: 25 }, { id: 'trading_post', level: 25 })
    return reqs
  },
  castle: (level) => [{ id: 'alliance_center', level }],
  watchtower: (level) => [{ id: 'wall', level }],
  wall: (level) => level >= 5 ? [{ id: 'tavern', level }] : [],
  siege_workshop: (level) => [{ id: 'barracks', level }, { id: 'archery_range', level }, { id: 'stable', level }],
}

function getBuildingRequirements(buildingId: string, targetLevel: number, currentLevel: number): { id: string; name: string; currentLevel: number; requiredLevel: number }[] {
  const reqFn = BUILDING_REQUIREMENTS[buildingId]
  if (!reqFn) return []

  const results: { id: string; name: string; currentLevel: number; requiredLevel: number }[] = []
  for (let lvl = currentLevel + 1; lvl <= targetLevel; lvl++) {
    const deps = reqFn(lvl)
    for (const dep of deps) {
      const existing = results.find(r => r.id === dep.id)
      if (existing) {
        existing.requiredLevel = Math.max(existing.requiredLevel, dep.level)
      } else {
        const def = BUILDING_DEFS.find(b => b.id === dep.id)
        results.push({ id: dep.id, name: def?.name ?? dep.id, currentLevel: 1, requiredLevel: dep.level })
      }
    }
  }
  return results
}

/* ================================================================== */
/*  BUILDINGS CALCULATOR (multi-upgrade)                               */
/* ================================================================== */

type BuildingUpgrade = {
  id: string
  buildingId: string
  buildingName: string
  currentLevel: number
  desiredLevel: number
}

function BuildingsCalc() {
  const [search, setSearch] = useState('')
  const [upgrades, setUpgrades] = useState<BuildingUpgrade[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [currentLevel, setCurrentLevel] = useState('')
  const [desiredLevel, setDesiredLevel] = useState('')
  const [calculated, setCalculated] = useState(false)

  const filteredBuildings = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return BUILDING_DEFS
    return BUILDING_DEFS.filter(b => b.name.toLowerCase().includes(q))
  }, [search])

  const addUpgrade = () => {
    if (!selectedBuilding) return
    const def = BUILDING_DEFS.find(b => b.id === selectedBuilding)
    if (!def) return
    const cur = Math.max(1, Number(currentLevel) || 1)
    const des = Math.min(25, Number(desiredLevel) || 25)
    if (des === cur) return

    setUpgrades(prev => [...prev, {
      id: Date.now().toString(),
      buildingId: selectedBuilding,
      buildingName: def.name,
      currentLevel: cur,
      desiredLevel: des,
    }])
    setSelectedBuilding(null)
    setCurrentLevel('')
    setDesiredLevel('')
  }

  const removeUpgrade = (id: string) => {
    setUpgrades(prev => prev.filter(u => u.id !== id))
    setCalculated(false)
  }

  const addRequirement = (req: { id: string; name: string; currentLevel: number; requiredLevel: number }) => {
    setUpgrades(prev => {
      const exists = prev.find(u => u.buildingId === req.id)
      if (exists) {
        return prev.map(u => u.buildingId === req.id
          ? { ...u, desiredLevel: Math.max(u.desiredLevel, req.requiredLevel), currentLevel: req.currentLevel }
          : u
        )
      }
      return [...prev, {
        id: Date.now().toString() + req.id,
        buildingId: req.id,
        buildingName: req.name,
        currentLevel: req.currentLevel,
        desiredLevel: req.requiredLevel,
      }]
    })
  }

  const upgradeResults = useMemo(() => {
    if (!calculated) return null
    return upgrades.map(u => {
      const totals = { food: 0, wood: 0, stone: 0, gold: 0, time: 0 }
      if (u.desiredLevel > u.currentLevel) {
        // Upgrade: calculate costs from currentLevel+1 to desiredLevel
        for (let l = u.currentLevel + 1; l <= u.desiredLevel; l++) {
          const c = buildingCostPerLevel(l)
          totals.food += c.food
          totals.wood += c.wood
          totals.stone += c.stone
          totals.gold += c.gold
          totals.time += c.time
        }
      } else {
        // Downgrade: calculate costs from desiredLevel+1 to currentLevel (reversed, cost is same going down)
        for (let l = u.desiredLevel + 1; l <= u.currentLevel; l++) {
          const c = buildingCostPerLevel(l)
          totals.food += c.food
          totals.wood += c.wood
          totals.stone += c.stone
          totals.gold += c.gold
          totals.time += c.time
        }
      }
      const requirements = getBuildingRequirements(u.buildingId, u.desiredLevel, u.currentLevel)
      return { ...u, cost: totals, requirements }
    })
  }, [upgrades, calculated])

  const grandTotal = useMemo(() => {
    if (!upgradeResults) return null
    const totals = { food: 0, wood: 0, stone: 0, gold: 0, time: 0 }
    for (const r of upgradeResults) {
      totals.food += r.cost.food
      totals.wood += r.cost.wood
      totals.stone += r.cost.stone
      totals.gold += r.cost.gold
      totals.time += r.cost.time
    }
    return totals
  }, [upgradeResults])

  return (
    <div className="space-y-6 max-w-full">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          Buildings
        </h2>
        <p className="text-muted-foreground">Calculate resource costs for one or more building upgrades.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Search Building</Label>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for a building..."
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => { 
                setCurrentLevel('1');
                setDesiredLevel('25');
              }} 
              variant="outline" 
              className="flex-1"
            >
              Max All
            </Button>
            <Button 
              onClick={() => { 
                setUpgrades([]); 
                setSelectedBuilding(null);
                setCurrentLevel('');
                setDesiredLevel('');
                setSearch('');
                setCalculated(false);
              }} 
              variant="outline" 
              className="flex-1"
            >
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredBuildings.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBuilding(b.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors ${
                  selectedBuilding === b.id
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <Building2 className="h-5 w-5" />
                {b.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Current Level</Label>
              <Input
                value={currentLevel}
                onChange={e => setCurrentLevel(e.target.value)}
                placeholder="1"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label>Desired Level</Label>
              <Input
                value={desiredLevel}
                onChange={e => setDesiredLevel(e.target.value)}
                placeholder="25"
                type="number"
              />
            </div>
          </div>

          <Button onClick={addUpgrade} className="w-full gap-2" disabled={!selectedBuilding}>
            <Plus className="h-4 w-4" />
            Add Upgrade
          </Button>
        </CardContent>
      </Card>

      {/* Queued upgrades */}
      {upgrades.length > 0 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <Label className="text-base">Upgrade Queue ({upgrades.length})</Label>
              <Button variant="outline" size="sm" className="bg-transparent text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setUpgrades([]); setCalculated(false) }}>
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {upgrades.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{u.buildingName}</span>
                    <span className="text-xs text-muted-foreground">Lv {u.currentLevel} &rarr; Lv {u.desiredLevel}</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive bg-transparent" onClick={() => removeUpgrade(u.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={() => setCalculated(true)} className="w-full">
              Calculate All
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {upgradeResults && upgradeResults.length > 0 && (
        <div className="space-y-3">
          {upgradeResults.map(r => (
            <Card key={r.id}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{r.buildingName}</span>
                  <span className="text-xs text-muted-foreground">Lv {r.currentLevel} &rarr; Lv {r.desiredLevel}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Food:</span><span className="text-foreground font-medium">{r.cost.food.toLocaleString()}</span></div>
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Wood:</span><span className="text-foreground font-medium">{r.cost.wood.toLocaleString()}</span></div>
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Stone:</span><span className="text-foreground font-medium">{r.cost.stone.toLocaleString()}</span></div>
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Gold:</span><span className="text-foreground font-medium">{r.cost.gold.toLocaleString()}</span></div>
                </div>
                <div className="text-xs text-muted-foreground">{'Time: '}{Math.round(r.cost.time / 60)}{' hours'}</div>

                {/* Requirements */}
                {r.requirements.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Required Buildings
                    </div>
                    {r.requirements.map(req => {
                      const alreadyQueued = upgrades.some(u => u.buildingId === req.id && u.desiredLevel >= req.requiredLevel)
                      return (
                        <div key={req.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{req.name} Lv {req.requiredLevel}</span>
                          {!alreadyQueued ? (
                            <Button size="sm" variant="outline" className="h-7 gap-1 bg-transparent text-xs" onClick={() => addRequirement(req)}>
                              <Plus className="h-3 w-3" />
                              Add
                            </Button>
                          ) : (
                            <span className="text-xs text-green-400">In queue</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Grand total */}
          {grandTotal && upgrades.length > 1 && (
            <Card className="border-primary/30">
              <CardContent className="space-y-2 pt-4">
                <div className="text-center font-bold text-foreground">Total Cost (All Upgrades)</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Food:</span><span className="text-foreground font-medium">{grandTotal.food.toLocaleString()}</span></div>
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Wood:</span><span className="text-foreground font-medium">{grandTotal.wood.toLocaleString()}</span></div>
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Stone:</span><span className="text-foreground font-medium">{grandTotal.stone.toLocaleString()}</span></div>
                  <div className="flex justify-between px-2"><span className="text-muted-foreground">Gold:</span><span className="text-foreground font-medium">{grandTotal.gold.toLocaleString()}</span></div>
                </div>
                <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border">
                  {'Total Time: '}{Math.round(grandTotal.time / 60)}{' hours'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  TECHNOLOGY CALCULATOR (multi-upgrade)                              */
/* ================================================================== */

type TechUpgrade = {
  id: string
  techId: string
  techName: string
  currentLevel: number
  desiredLevel: number
  maxLevel: number
}

function TechnologyCalc() {
  const allTech = useMemo(() => [...economyTree, ...militaryTree], [])
  const [search, setSearch] = useState('')
  const [selectedTech, setSelectedTech] = useState<string | null>(null)
  const [currentLevel, setCurrentLevel] = useState('')
  const [desiredLevel, setDesiredLevel] = useState('')
  const [upgrades, setUpgrades] = useState<TechUpgrade[]>([])
  const [calculated, setCalculated] = useState(false)

  const filteredTech = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allTech
    return allTech.filter(t => t.name.toLowerCase().includes(q))
  }, [search, allTech])

  const selectedNode = allTech.find(t => t.id === selectedTech)

  const addUpgrade = () => {
    if (!selectedTech || !selectedNode) return
    const cur = Math.max(0, Number(currentLevel) || 0)
    const des = Math.min(selectedNode.maxLevel, Number(desiredLevel) || selectedNode.maxLevel)
    if (des <= cur) return

    setUpgrades(prev => [...prev, {
      id: Date.now().toString(),
      techId: selectedTech,
      techName: selectedNode.name,
      currentLevel: cur,
      desiredLevel: des,
      maxLevel: selectedNode.maxLevel,
    }])
    setSelectedTech(null)
    setCurrentLevel('')
    setDesiredLevel('')
    setCalculated(false)
  }

  const removeUpgrade = (id: string) => {
    setUpgrades(prev => prev.filter(u => u.id !== id))
    setCalculated(false)
  }

  const upgradeResults = useMemo(() => {
    if (!calculated) return null
    return upgrades.map(u => {
      const node = allTech.find(t => t.id === u.techId)
      if (!node) return { ...u, cost: { food: 0, wood: 0, stone: 0, gold: 0, time: 0, power: 0, mgePoints: 0 } }
      
      const totals = { food: 0, wood: 0, stone: 0, gold: 0, time: 0, power: 0, mgePoints: 0 }
      const numLevels = u.desiredLevel - u.currentLevel
      
      // Use node's costs per level, or 0 if not defined
      const timeCostPerLevel = node.timeCost || 0
      const powerPerLevel = node.power || 0
      const mgePointsPerLevel = node.mgePoints || 0
      const resourceCosts = node.resourceCosts || {}
      
      totals.time += timeCostPerLevel * numLevels
      totals.power += powerPerLevel * numLevels
      totals.mgePoints += mgePointsPerLevel * numLevels
      
      // Add resource costs
      for (const [resourceType, costPerLevel] of Object.entries(resourceCosts)) {
        if (!totals.hasOwnProperty(resourceType)) {
          (totals as any)[resourceType] = 0
        }
        (totals as any)[resourceType] += (costPerLevel as number) * numLevels
      }
      
      return { ...u, cost: totals }
    })
  }, [upgrades, calculated, allTech])

  const grandTotal = useMemo(() => {
    if (!upgradeResults) return null
    const totals: any = { food: 0, wood: 0, stone: 0, gold: 0, time: 0, power: 0, mgePoints: 0 }
    for (const r of upgradeResults) {
      totals.food += r.cost.food ?? 0
      totals.wood += r.cost.wood ?? 0
      totals.stone += r.cost.stone ?? 0
      totals.gold += r.cost.gold ?? 0
      totals.time += r.cost.time ?? 0
      totals.power += r.cost.power ?? 0
      totals.mgePoints += r.cost.mgePoints ?? 0
      // Add any other dynamic resource types
      for (const [key, value] of Object.entries(r.cost)) {
        if (!['food', 'wood', 'stone', 'gold', 'time', 'power', 'mgePoints'].includes(key)) {
          totals[key] = (totals[key] ?? 0) + (value as number)
        }
      }
    }
    return totals
  }, [upgradeResults])

  return (
    <div className="space-y-6 max-w-full">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <FlaskConical className="h-7 w-7 text-primary" />
          Technology
        </h2>
        <p className="text-muted-foreground">Calculate resource costs for one or more technology researches.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Search Technology</Label>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for a technology..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredTech.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTech(t.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors ${
                  selectedTech === t.id
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <FlaskConical className="h-4 w-4" />
                {t.name}
              </button>
            ))}
          </div>

          {selectedNode && (
            <p className="text-xs text-muted-foreground text-center">
              {'Max Level: '}{selectedNode.maxLevel}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Current Level</Label>
              <Input
                value={currentLevel}
                onChange={e => setCurrentLevel(e.target.value)}
                placeholder="0"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label>Desired Level</Label>
              <Input
                value={desiredLevel}
                onChange={e => setDesiredLevel(e.target.value)}
                placeholder={selectedNode ? String(selectedNode.maxLevel) : '10'}
                type="number"
              />
            </div>
          </div>

          <Button onClick={addUpgrade} className="w-full gap-2" disabled={!selectedTech}>
            <Plus className="h-4 w-4" />
            Add Research
          </Button>
        </CardContent>
      </Card>

      {/* Queued upgrades */}
      {upgrades.length > 0 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <Label className="text-base">Research Queue ({upgrades.length})</Label>
              <Button variant="outline" size="sm" className="bg-transparent text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setUpgrades([]); setCalculated(false) }}>
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {upgrades.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{u.techName}</span>
                    <span className="text-xs text-muted-foreground">Lv {u.currentLevel} &rarr; Lv {u.desiredLevel}</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive bg-transparent" onClick={() => removeUpgrade(u.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={() => setCalculated(true)} className="w-full">
              Calculate All
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {upgradeResults && upgradeResults.length > 0 && (
        <div className="space-y-3">
          {upgradeResults.map(r => (
            <Card key={r.id}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{r.techName}</span>
                  <span className="text-xs text-muted-foreground">Lv {r.currentLevel} &rarr; Lv {r.desiredLevel}</span>
                </div>
                {((r.cost.food ?? 0) > 0 || (r.cost.wood ?? 0) > 0 || (r.cost.stone ?? 0) > 0 || (r.cost.gold ?? 0) > 0 || Object.entries(r.cost).some(([key, val]) => !['food', 'wood', 'stone', 'gold', 'time', 'power', 'mgePoints'].includes(key) && (val as number) > 0)) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(r.cost.food ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Food:</span><span className="text-foreground font-medium">{(r.cost.food ?? 0).toLocaleString()}</span></div>}
                    {(r.cost.wood ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Wood:</span><span className="text-foreground font-medium">{(r.cost.wood ?? 0).toLocaleString()}</span></div>}
                    {(r.cost.stone ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Stone:</span><span className="text-foreground font-medium">{(r.cost.stone ?? 0).toLocaleString()}</span></div>}
                    {(r.cost.gold ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Gold:</span><span className="text-foreground font-medium">{(r.cost.gold ?? 0).toLocaleString()}</span></div>}
                    {Object.entries(r.cost).filter(([key, val]) => !['food', 'wood', 'stone', 'gold', 'time', 'power', 'mgePoints'].includes(key) && (val as number) > 0).map(([key, val]) => (
                      <div key={key} className="flex justify-between px-2"><span className="text-muted-foreground">{key}:</span><span className="text-foreground font-medium">{(val as number).toLocaleString()}</span></div>
                    ))}
                  </div>
                )}
                {((r.cost.time ?? 0) > 0) && <div className="text-xs text-muted-foreground">{'Time: '}{Math.round((r.cost.time ?? 0) / 60)}{' hours'}</div>}
                {((r.cost.power ?? 0) > 0 || (r.cost.mgePoints ?? 0) > 0) && (
                  <div className="pt-2 border-t border-border text-xs">
                    {(r.cost.power ?? 0) > 0 && <div className="text-muted-foreground">Power: <span className="text-foreground font-medium">{(r.cost.power ?? 0).toLocaleString()}</span></div>}
                    {(r.cost.mgePoints ?? 0) > 0 && <div className="text-muted-foreground">MGE Points: <span className="text-foreground font-medium">{(r.cost.mgePoints ?? 0).toLocaleString()}</span></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {grandTotal && upgrades.length > 1 && (
            <Card className="border-primary/30">
              <CardContent className="space-y-2 pt-4">
                <div className="text-center font-bold text-foreground">Total Research Cost</div>
                {((grandTotal.food ?? 0) > 0 || (grandTotal.wood ?? 0) > 0 || (grandTotal.stone ?? 0) > 0 || (grandTotal.gold ?? 0) > 0 || Object.entries(grandTotal).some(([key, val]) => !['food', 'wood', 'stone', 'gold', 'time', 'power', 'mgePoints'].includes(key) && (val as number) > 0)) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(grandTotal.food ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Food:</span><span className="text-foreground font-medium">{(grandTotal.food ?? 0).toLocaleString()}</span></div>}
                    {(grandTotal.wood ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Wood:</span><span className="text-foreground font-medium">{(grandTotal.wood ?? 0).toLocaleString()}</span></div>}
                    {(grandTotal.stone ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Stone:</span><span className="text-foreground font-medium">{(grandTotal.stone ?? 0).toLocaleString()}</span></div>}
                    {(grandTotal.gold ?? 0) > 0 && <div className="flex justify-between px-2"><span className="text-muted-foreground">Gold:</span><span className="text-foreground font-medium">{(grandTotal.gold ?? 0).toLocaleString()}</span></div>}
                    {Object.entries(grandTotal).filter(([key, val]) => !['food', 'wood', 'stone', 'gold', 'time', 'power', 'mgePoints'].includes(key) && (val as number) > 0).map(([key, val]) => (
                      <div key={key} className="flex justify-between px-2"><span className="text-muted-foreground">{key}:</span><span className="text-foreground font-medium">{(val as number).toLocaleString()}</span></div>
                    ))}
                  </div>
                )}
                {((grandTotal.time ?? 0) > 0) && <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border">
                  {'Total Time: '}{Math.round((grandTotal.time ?? 0) / 60)}{' hours'}
                </div>}
                {((grandTotal.power ?? 0) > 0 || (grandTotal.mgePoints ?? 0) > 0) && (
                  <div className="pt-2 border-t border-border text-sm">
                    {(grandTotal.power ?? 0) > 0 && <div className="text-muted-foreground">Total Power: <span className="text-foreground font-medium">{(grandTotal.power ?? 0).toLocaleString()}</span></div>}
                    {(grandTotal.mgePoints ?? 0) > 0 && <div className="text-muted-foreground">Total MGE Points: <span className="text-foreground font-medium">{(grandTotal.mgePoints ?? 0).toLocaleString()}</span></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
