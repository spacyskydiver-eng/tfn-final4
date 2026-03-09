'use client'

import React, { useCallback, useEffect } from "react"

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Swords,
  Target,
  Pickaxe,
  TrendingUp,
  Crosshair,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  TreePine,
  Mountain,
  Coins,
  Zap,
  Shield,
  Save,
  Check,
} from 'lucide-react'
import {
  type Tier,
  type TroopType,
  TROOP_TYPES,
  TIERS,
  getPathsForTier,
  calcTraining,
  calcUpgrade,
  calcFromSpeedups,
  calcFromMgePoints,
  formatTime,
  type TrainingResult,
} from '@/lib/game/troops'
import { EventStatsPanel, type EventStats, type StagePoints } from '@/components/event-stats-panel'

/* ================================================================== */
/*  STAGE DEFINITIONS                                                  */
/* ================================================================== */

const STAGES = [
  { id: 'training', num: 'I', label: 'Troop Training', icon: Swords, color: 'hsl(210, 80%, 60%)' },
  { id: 'barbarians', num: 'II', label: 'Barbarian Killing', icon: Target, color: 'hsl(0, 75%, 60%)' },
  { id: 'gathering', num: 'III', label: 'Resource Gathering', icon: Pickaxe, color: 'hsl(145, 70%, 50%)' },
  { id: 'power', num: 'IV', label: 'Power Gain', icon: TrendingUp, color: 'hsl(35, 90%, 55%)' },
  { id: 'elimination', num: 'V', label: 'Enemy Elimination', icon: Crosshair, color: 'hsl(280, 65%, 60%)' },
  { id: 'finalSprint', num: 'VI', label: 'Final Sprint', icon: Zap, color: 'hsl(55, 90%, 55%)' },
] as const

type StageId = (typeof STAGES)[number]['id']

/* ================================================================== */
/*  BARBARIAN RANGE DATA                                               */
/* ================================================================== */

export const BARB_RANGES = [
  { key: '1-6',   label: 'Lvl 1–6',   points: 300 },
  { key: '7-9',   label: 'Lvl 7–9',   points: 600 },
  { key: '10-12', label: 'Lvl 10–12', points: 900 },
  { key: '13-15', label: 'Lvl 13–15', points: 1200 },
  { key: '16-17', label: 'Lvl 16–17', points: 1500 },
  { key: '18-19', label: 'Lvl 18–19', points: 1800 },
  { key: '20',    label: 'Lvl 20',     points: 2100 },
  { key: '21',    label: 'Lvl 21',     points: 2400 },
  { key: '22',    label: 'Lvl 22',     points: 2700 },
  { key: '23',    label: 'Lvl 23',     points: 3000 },
  { key: '24',    label: 'Lvl 24',     points: 3300 },
  { key: '25',    label: 'Lvl 25',     points: 3600 },
  { key: '26-30', label: 'Lvl 26–30', points: 4000 },
  { key: '31-35', label: 'Lvl 31–35', points: 4500 },
  { key: '36-40', label: 'Lvl 36–40', points: 5000 },
  { key: '41-55', label: 'Lvl 41–55', points: 10000 },
]

const FINAL_SPRINT_BARB_RANGES = [
  { key: '1-6',   label: 'Lvl 1–6',   points: 240 },
  { key: '7-9',   label: 'Lvl 7–9',   points: 480 },
  { key: '10-12', label: 'Lvl 10–12', points: 720 },
  { key: '13-15', label: 'Lvl 13–15', points: 960 },
  { key: '16-17', label: 'Lvl 16–17', points: 1200 },
  { key: '18-19', label: 'Lvl 18–19', points: 1440 },
  { key: '20',    label: 'Lvl 20',     points: 1680 },
  { key: '21',    label: 'Lvl 21',     points: 1920 },
  { key: '22',    label: 'Lvl 22',     points: 2160 },
  { key: '23',    label: 'Lvl 23',     points: 2400 },
  { key: '24',    label: 'Lvl 24',     points: 2640 },
  { key: '25',    label: 'Lvl 25',     points: 2880 },
  { key: '26-30', label: 'Lvl 26–30', points: 3200 },
  { key: '31-35', label: 'Lvl 31–35', points: 360 },
  { key: '36-40', label: 'Lvl 36–40', points: 4000 },
  { key: '41-55', label: 'Lvl 41–55', points: 10000 },
]

/* ================================================================== */
/*  PERSISTED STATE TYPES                                              */
/* ================================================================== */

type TierInputs = Record<string, Record<TroopType, number>>

interface TrainingStageState {
  mode: CalcMode
  speedBonus: string
  mainInputs: TierInputs
  mainExpandedTiers: Tier[]
  speedupsDays: string
  speedupsHours: string
  speedupsMinutes: string
  speedupsFood: string
  speedupsWood: string
  speedupsStone: string
  speedupsGold: string
  speedupsTroopType: TroopType
  speedupsTier: Tier
  speedupsFromTier: string
  mgeTargetPoints: string
  mgeTroopType: TroopType
  mgeTier: Tier
  mgeFromTier: string
}

interface BarbarianStageState {
  kills: Record<string, number>
}

interface GatheringStageState {
  food: string; wood: string; stone: string; gold: string; gems: string
}

interface PowerStageState {
  troopPower: string; buildingPower: string; techPower: string
}

interface EliminationStageState {
  t1: string; t2: string; t3: string; t4: string; t5: string
}

interface FinalSprintStageState {
  trainT1: string; trainT2: string; trainT3: string; trainT4: string; trainT5: string
  kills: Record<string, number>
  food: string; wood: string; stone: string; gold: string; gems: string
  buildingPower: string; techPower: string
  t1: string; t2: string; t3: string; t4: string; t5: string
}

interface AllStageData {
  training: TrainingStageState
  barbarians: BarbarianStageState
  gathering: GatheringStageState
  power: PowerStageState
  elimination: EliminationStageState
  finalSprint: FinalSprintStageState
}

const DEFAULT_TRAINING_STATE: TrainingStageState = {
  mode: 'main',
  speedBonus: '',
  mainInputs: {},
  mainExpandedTiers: [5],
  speedupsDays: '',
  speedupsHours: '',
  speedupsMinutes: '',
  speedupsFood: '',
  speedupsWood: '',
  speedupsStone: '',
  speedupsGold: '',
  speedupsTroopType: 'infantry',
  speedupsTier: 4,
  speedupsFromTier: 'scratch',
  mgeTargetPoints: '',
  mgeTroopType: 'infantry',
  mgeTier: 4,
  mgeFromTier: 'scratch',
}

const DEFAULT_BARBARIAN_STATE: BarbarianStageState = { kills: {} }
const DEFAULT_GATHERING_STATE: GatheringStageState = { food: '', wood: '', stone: '', gold: '', gems: '' }
const DEFAULT_POWER_STATE: PowerStageState = { troopPower: '', buildingPower: '', techPower: '' }
const DEFAULT_ELIMINATION_STATE: EliminationStageState = { t1: '', t2: '', t3: '', t4: '', t5: '' }
const DEFAULT_FINAL_SPRINT_STATE: FinalSprintStageState = {
  trainT1: '', trainT2: '', trainT3: '', trainT4: '', trainT5: '',
  kills: {},
  food: '', wood: '', stone: '', gold: '', gems: '',
  buildingPower: '', techPower: '',
  t1: '', t2: '', t3: '', t4: '', t5: '',
}

const DEFAULT_ALL_STAGE_DATA: AllStageData = {
  training: { ...DEFAULT_TRAINING_STATE },
  barbarians: { ...DEFAULT_BARBARIAN_STATE },
  gathering: { ...DEFAULT_GATHERING_STATE },
  power: { ...DEFAULT_POWER_STATE },
  elimination: { ...DEFAULT_ELIMINATION_STATE },
  finalSprint: { ...DEFAULT_FINAL_SPRINT_STATE },
}

const STORAGE_KEY = 'mge_calculator_data'

/* ================================================================== */
/*  MAIN EXPORT                                                        */
/* ================================================================== */

export function MgeCalculator() {
  const [activeStage, setActiveStage] = useState<StageId>('training')
  const [stageData, setStageData] = useState<AllStageData>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_ALL_STAGE_DATA }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>
        const result = { ...DEFAULT_ALL_STAGE_DATA }
        if (parsed.training) result.training = { ...DEFAULT_TRAINING_STATE, ...(parsed.training as Partial<TrainingStageState>) }
        // Migrate old placeholder format (had 'points' field) to new typed state
        if (parsed.barbarians && typeof (parsed.barbarians as BarbarianStageState).kills === 'object')
          result.barbarians = parsed.barbarians as BarbarianStageState
        if (parsed.gathering && typeof (parsed.gathering as GatheringStageState).food === 'string')
          result.gathering = { ...DEFAULT_GATHERING_STATE, ...(parsed.gathering as GatheringStageState) }
        if (parsed.power && typeof (parsed.power as PowerStageState).troopPower === 'string')
          result.power = { ...DEFAULT_POWER_STATE, ...(parsed.power as PowerStageState) }
        if (parsed.elimination && typeof (parsed.elimination as EliminationStageState).t1 === 'string')
          result.elimination = { ...DEFAULT_ELIMINATION_STATE, ...(parsed.elimination as EliminationStageState) }
        if (parsed.finalSprint)
          result.finalSprint = { ...DEFAULT_FINAL_SPRINT_STATE, ...(parsed.finalSprint as Partial<FinalSprintStageState>) }
        return result
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_ALL_STAGE_DATA }
  })
  const [saveFlash, setSaveFlash] = useState<StageId | null>(null)

  const updateTrainingState = useCallback((updates: Partial<TrainingStageState>) => {
    setStageData(prev => ({
      ...prev,
      training: { ...prev.training, ...updates },
    }))
  }, [])

  const updateBarbarianState = useCallback((updates: Partial<BarbarianStageState>) => {
    setStageData(prev => ({ ...prev, barbarians: { ...prev.barbarians, ...updates } }))
  }, [])

  const updateGatheringState = useCallback((updates: Partial<GatheringStageState>) => {
    setStageData(prev => ({ ...prev, gathering: { ...prev.gathering, ...updates } }))
  }, [])

  const updatePowerState = useCallback((updates: Partial<PowerStageState>) => {
    setStageData(prev => ({ ...prev, power: { ...prev.power, ...updates } }))
  }, [])

  const updateEliminationState = useCallback((updates: Partial<EliminationStageState>) => {
    setStageData(prev => ({ ...prev, elimination: { ...prev.elimination, ...updates } }))
  }, [])

  const updateFinalSprintState = useCallback((updates: Partial<FinalSprintStageState>) => {
    setStageData(prev => ({ ...prev, finalSprint: { ...prev.finalSprint, ...updates } }))
  }, [])

  const handleSaveStage = useCallback((stageId: StageId) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stageData))
      setSaveFlash(stageId)
      setTimeout(() => setSaveFlash(null), 1500)
    } catch { /* ignore */ }
  }, [stageData])

  // Compute training points from the training stage data
  const trainingResult = useMemo(() => {
    const state = stageData.training
    const speedBonus = Number(state.speedBonus) || 0
    const total: TrainingResult = { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }

    // Main mode results
    for (const tier of TIERS) {
      const paths = getPathsForTier(tier)
      for (const path of paths) {
        const pathInputs = state.mainInputs[path.key]
        if (!pathInputs) continue
        for (const tt of TROOP_TYPES) {
          const count = pathInputs[tt.id] || 0
          if (count <= 0) continue
          let result: TrainingResult | null = null
          if (path.from === null) {
            result = calcTraining(tier, count, speedBonus, tt.id)
          } else {
            result = calcUpgrade(path.from, tier, count, speedBonus, tt.id)
          }
          if (result) {
            total.troops += result.troops
            total.time += result.time
            total.food += result.food
            total.wood += result.wood
            total.stone += result.stone
            total.gold += result.gold
            total.power += result.power
            total.mgePoints += result.mgePoints
            total.kvkPoints += result.kvkPoints
          }
        }
      }
    }
    return total
  }, [stageData.training])

  const stagePoints: StagePoints = useMemo(() => {
    const barbarians = BARB_RANGES.reduce((sum, r) => sum + r.points * (stageData.barbarians.kills[r.key] ?? 0), 0)
    const gathering =
      Math.floor((Number(stageData.gathering.food)  || 0) / 100) * 1 +
      Math.floor((Number(stageData.gathering.wood)  || 0) / 100) * 1 +
      Math.floor((Number(stageData.gathering.stone) || 0) / 100) * 2 +
      Math.floor((Number(stageData.gathering.gold)  || 0) / 100) * 5 +
      (Number(stageData.gathering.gems) || 0) * 150
    const power =
      (Number(stageData.power.troopPower)    || 0) * 2 +
      (Number(stageData.power.buildingPower) || 0) * 2 +
      (Number(stageData.power.techPower)     || 0) * 2
    const elimination =
      (Number(stageData.elimination.t1) || 0) *  1 +
      (Number(stageData.elimination.t2) || 0) *  2 +
      (Number(stageData.elimination.t3) || 0) *  4 +
      (Number(stageData.elimination.t4) || 0) *  8 +
      (Number(stageData.elimination.t5) || 0) * 20
    const fs = stageData.finalSprint
    const finalSprint =
      (Number(fs.trainT1) || 0) *  4 + (Number(fs.trainT2) || 0) *  8 +
      (Number(fs.trainT3) || 0) * 16 + (Number(fs.trainT4) || 0) * 32 +
      (Number(fs.trainT5) || 0) * 80 +
      FINAL_SPRINT_BARB_RANGES.reduce((sum, r) => sum + r.points * (fs.kills[r.key] ?? 0), 0) +
      Math.floor((Number(fs.food)  || 0) / 125) * 1 +
      Math.floor((Number(fs.wood)  || 0) / 125) * 1 +
      Math.floor((Number(fs.stone) || 0) /  63) * 2 +
      Math.floor((Number(fs.gold)  || 0) /  25) * 5 +
      (Number(fs.gems) || 0) * 120 +
      (Number(fs.buildingPower) || 0) * 1 + (Number(fs.techPower) || 0) * 1 +
      Math.floor((Number(fs.t1) || 0) / 6) * 1 +
      (Number(fs.t2) || 0) * 2 + (Number(fs.t3) || 0) * 3 +
      (Number(fs.t4) || 0) * 8 + (Number(fs.t5) || 0) * 16
    return { training: trainingResult.mgePoints, barbarians, gathering, power, elimination, finalSprint }
  }, [trainingResult.mgePoints, stageData])

  const eventStats: EventStats = useMemo(() => ({
    stagePoints,
    totalPower: trainingResult.power,
    totalFood: trainingResult.food,
    totalWood: trainingResult.wood,
    totalStone: trainingResult.stone,
    totalGold: trainingResult.gold,
  }), [stagePoints, trainingResult])

  return (
    <div className="space-y-6 max-w-full">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-3">
          <Swords className="h-7 w-7 text-primary" />
          MGE Calculator
        </h2>
        <p className="text-muted-foreground">Mightiest Governor Event planner and calculator</p>
      </div>

      {/* Stage Progress Bar */}
      <StageProgressBar active={activeStage} onChange={setActiveStage} />

      {/* Stage Content + Stats Panel */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 min-h-[400px]">
          {activeStage === 'training' && (
            <TrainingStage
              state={stageData.training}
              onUpdate={updateTrainingState}
              onSave={() => handleSaveStage('training')}
              saved={saveFlash === 'training'}
            />
          )}
          {activeStage === 'barbarians' && (
            <BarbariansStage
              state={stageData.barbarians}
              onUpdate={updateBarbarianState}
              onSave={() => handleSaveStage('barbarians')}
              saved={saveFlash === 'barbarians'}
            />
          )}
          {activeStage === 'gathering' && (
            <GatheringStage
              state={stageData.gathering}
              onUpdate={updateGatheringState}
              onSave={() => handleSaveStage('gathering')}
              saved={saveFlash === 'gathering'}
            />
          )}
          {activeStage === 'power' && (
            <PowerStage
              state={stageData.power}
              onUpdate={updatePowerState}
              onSave={() => handleSaveStage('power')}
              saved={saveFlash === 'power'}
            />
          )}
          {activeStage === 'elimination' && (
            <EliminationStage
              state={stageData.elimination}
              onUpdate={updateEliminationState}
              onSave={() => handleSaveStage('elimination')}
              saved={saveFlash === 'elimination'}
            />
          )}
          {activeStage === 'finalSprint' && (
            <FinalSprintStage
              state={stageData.finalSprint}
              onUpdate={updateFinalSprintState}
              onSave={() => handleSaveStage('finalSprint')}
              saved={saveFlash === 'finalSprint'}
            />
          )}
        </div>

        {/* Event Stats Side Panel */}
        <div className="hidden lg:block w-[280px] flex-shrink-0 sticky top-4">
          <EventStatsPanel stats={eventStats} />
        </div>
      </div>

      {/* Mobile Stats Panel */}
      <div className="lg:hidden">
        <EventStatsPanel stats={eventStats} />
      </div>
    </div>
  )
}

/* ================================================================== */
/*  STAGE PROGRESS BAR                                                 */
/* ================================================================== */

function StageProgressBar({ active, onChange }: { active: StageId; onChange: (id: StageId) => void }) {
  return (
    <div className="relative">
      {/* Connection line */}
      <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-border" />

      <div className="relative flex items-start justify-between">
        {STAGES.map((stage) => {
          const Icon = stage.icon
          const isActive = active === stage.id
          return (
            <button
              key={stage.id}
              onClick={() => onChange(stage.id)}
              className="group flex flex-col items-center gap-2 relative z-10"
              style={{ width: '18%' }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isActive
                    ? 'border-primary bg-primary/20 shadow-[0_0_20px_-2px_hsl(var(--primary)/0.4)]'
                    : 'border-border bg-card hover:border-muted-foreground'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={`text-lg font-bold transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {stage.num}
                </span>
                <span
                  className={`text-[10px] font-medium text-center leading-tight transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  BARBARIANS STAGE                                                   */
/* ================================================================== */

function BarbariansStage({
  state, onUpdate, onSave, saved,
}: {
  state: BarbarianStageState
  onUpdate: (updates: Partial<BarbarianStageState>) => void
  onSave: () => void
  saved: boolean
}) {
  const setKill = (key: string, val: number) =>
    onUpdate({ kills: { ...state.kills, [key]: Math.max(0, val) } })

  const total = useMemo(() =>
    BARB_RANGES.reduce((sum, r) => sum + r.points * (state.kills[r.key] ?? 0), 0),
  [state.kills])

  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-foreground">Barbarian Kills</Label>
          <button onClick={() => onUpdate({ kills: {} })} className="text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {BARB_RANGES.map(r => (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{r.label}</Label>
                <span className="text-[10px] text-muted-foreground/60">{r.points.toLocaleString()}pts</span>
              </div>
              <Input type="number" min={0}
                value={state.kills[r.key] || ''}
                onChange={e => setKill(r.key, Number(e.target.value) || 0)}
                placeholder="0" className="h-7 text-sm" />
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground">Total: </span>
            <span className="text-sm font-bold text-primary">{total.toLocaleString()} pts</span>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onSave}
            className={`gap-2 transition-colors ${saved ? 'border-green-500/50 text-green-400' : ''}`}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save Stage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================== */
/*  GATHERING STAGE                                                    */
/* ================================================================== */

function GatheringStage({
  state, onUpdate, onSave, saved,
}: {
  state: GatheringStageState
  onUpdate: (updates: Partial<GatheringStageState>) => void
  onSave: () => void
  saved: boolean
}) {
  const total = useMemo(() =>
    Math.floor((Number(state.food)  || 0) / 100) * 1 +
    Math.floor((Number(state.wood)  || 0) / 100) * 1 +
    Math.floor((Number(state.stone) || 0) / 100) * 2 +
    Math.floor((Number(state.gold)  || 0) / 100) * 5 +
    (Number(state.gems) || 0) * 150,
  [state])

  const fields: { key: keyof GatheringStageState; label: string; rate: string; color: string }[] = [
    { key: 'food',  label: 'Food',  rate: '100 = 1 pt',   color: 'text-green-400' },
    { key: 'wood',  label: 'Wood',  rate: '100 = 1 pt',   color: 'text-amber-600' },
    { key: 'stone', label: 'Stone', rate: '100 = 2 pts',  color: 'text-zinc-400'  },
    { key: 'gold',  label: 'Gold',  rate: '100 = 5 pts',  color: 'text-yellow-400'},
    { key: 'gems',  label: 'Gems',  rate: '1 = 150 pts',  color: 'text-violet-400'},
  ]

  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map(f => (
            <div key={f.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className={`text-xs font-medium ${f.color}`}>{f.label}</Label>
                <span className="text-[10px] text-muted-foreground/60">{f.rate}</span>
              </div>
              <Input type="number" min={0} value={state[f.key]}
                onChange={e => onUpdate({ [f.key]: e.target.value })}
                placeholder="0" className="h-8 text-sm" />
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground">Total: </span>
            <span className="text-sm font-bold text-primary">{total.toLocaleString()} pts</span>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onSave}
            className={`gap-2 transition-colors ${saved ? 'border-green-500/50 text-green-400' : ''}`}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save Stage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================== */
/*  POWER STAGE                                                        */
/* ================================================================== */

function PowerStage({
  state, onUpdate, onSave, saved,
}: {
  state: PowerStageState
  onUpdate: (updates: Partial<PowerStageState>) => void
  onSave: () => void
  saved: boolean
}) {
  const total = useMemo(() =>
    (Number(state.troopPower)    || 0) * 2 +
    (Number(state.buildingPower) || 0) * 2 +
    (Number(state.techPower)     || 0) * 2,
  [state])

  const fields: { key: keyof PowerStageState; label: string }[] = [
    { key: 'troopPower',    label: 'Troop Power Gained' },
    { key: 'buildingPower', label: 'Building Power Gained' },
    { key: 'techPower',     label: 'Technology Power Gained' },
  ]

  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-4">
        <p className="text-xs text-muted-foreground">Enter total power gained from each source. Every +1 power = 2 pts.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input type="number" min={0} value={state[f.key]}
                onChange={e => onUpdate({ [f.key]: e.target.value })}
                placeholder="0" className="h-8 text-sm" />
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground">Total: </span>
            <span className="text-sm font-bold text-primary">{total.toLocaleString()} pts</span>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onSave}
            className={`gap-2 transition-colors ${saved ? 'border-green-500/50 text-green-400' : ''}`}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save Stage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================== */
/*  ENEMY ELIMINATION STAGE                                            */
/* ================================================================== */

function EliminationStage({
  state, onUpdate, onSave, saved,
}: {
  state: EliminationStageState
  onUpdate: (updates: Partial<EliminationStageState>) => void
  onSave: () => void
  saved: boolean
}) {
  const total = useMemo(() =>
    (Number(state.t1) || 0) *  1 +
    (Number(state.t2) || 0) *  2 +
    (Number(state.t3) || 0) *  4 +
    (Number(state.t4) || 0) *  8 +
    (Number(state.t5) || 0) * 20,
  [state])

  const tiers: { key: keyof EliminationStageState; label: string; rate: string }[] = [
    { key: 't1', label: 'Tier 1', rate: '1 pt each' },
    { key: 't2', label: 'Tier 2', rate: '2 pts each' },
    { key: 't3', label: 'Tier 3', rate: '4 pts each' },
    { key: 't4', label: 'Tier 4', rate: '8 pts each' },
    { key: 't5', label: 'Tier 5', rate: '20 pts each' },
  ]

  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-4">
        <p className="text-xs text-muted-foreground">Enter total severely wounded / killed enemies per tier.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tiers.map(t => (
            <div key={t.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{t.label}</Label>
                <span className="text-[10px] text-muted-foreground/60">{t.rate}</span>
              </div>
              <Input type="number" min={0} value={state[t.key]}
                onChange={e => onUpdate({ [t.key]: e.target.value })}
                placeholder="0" className="h-7 text-sm" />
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground">Total: </span>
            <span className="text-sm font-bold text-primary">{total.toLocaleString()} pts</span>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onSave}
            className={`gap-2 transition-colors ${saved ? 'border-green-500/50 text-green-400' : ''}`}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save Stage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================== */
/*  FINAL SPRINT STAGE (VI)                                            */
/* ================================================================== */

function FinalSprintStage({
  state, onUpdate, onSave, saved,
}: {
  state: FinalSprintStageState
  onUpdate: (updates: Partial<FinalSprintStageState>) => void
  onSave: () => void
  saved: boolean
}) {
  const setKill = (key: string, val: number) =>
    onUpdate({ kills: { ...state.kills, [key]: Math.max(0, val) } })

  const subtotals = useMemo(() => {
    const training =
      (Number(state.trainT1) || 0) *  4 + (Number(state.trainT2) || 0) *  8 +
      (Number(state.trainT3) || 0) * 16 + (Number(state.trainT4) || 0) * 32 +
      (Number(state.trainT5) || 0) * 80
    const barbs = FINAL_SPRINT_BARB_RANGES.reduce((sum, r) => sum + r.points * (state.kills[r.key] ?? 0), 0)
    const gathering =
      Math.floor((Number(state.food)  || 0) / 125) * 1 +
      Math.floor((Number(state.wood)  || 0) / 125) * 1 +
      Math.floor((Number(state.stone) || 0) /  63) * 2 +
      Math.floor((Number(state.gold)  || 0) /  25) * 5 +
      (Number(state.gems) || 0) * 120
    const power = (Number(state.buildingPower) || 0) + (Number(state.techPower) || 0)
    const kills =
      Math.floor((Number(state.t1) || 0) / 6) * 1 +
      (Number(state.t2) || 0) * 2 + (Number(state.t3) || 0) * 3 +
      (Number(state.t4) || 0) * 8 + (Number(state.t5) || 0) * 16
    return { training, barbs, gathering, power, kills, total: training + barbs + gathering + power + kills }
  }, [state])

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground px-1">
        Final Sprint combines all event types at reduced rates. Each stage lasts 24 hours.
      </p>

      {/* Training */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" /> Troop Training
            </Label>
            {subtotals.training > 0 && <span className="text-xs font-bold text-primary">{subtotals.training.toLocaleString()} pts</span>}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {([['trainT1','T1','4'], ['trainT2','T2','8'], ['trainT3','T3','16'], ['trainT4','T4','32'], ['trainT5','T5','80']] as const).map(([key, label, pts]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <span className="text-[10px] text-muted-foreground/60">{pts}pt</span>
                </div>
                <Input type="number" min={0} value={state[key as keyof FinalSprintStageState] as string}
                  onChange={e => onUpdate({ [key]: e.target.value })}
                  placeholder="0" className="h-7 text-xs" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Barbarian Kills */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-red-400" /> Barbarian Kills
            </Label>
            <div className="flex items-center gap-2">
              {subtotals.barbs > 0 && <span className="text-xs font-bold text-primary">{subtotals.barbs.toLocaleString()} pts</span>}
              <button onClick={() => onUpdate({ kills: {} })} className="text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FINAL_SPRINT_BARB_RANGES.map(r => (
              <div key={r.key} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">{r.label}</Label>
                  <span className="text-[9px] text-muted-foreground/50">{r.points}pt</span>
                </div>
                <Input type="number" min={0} value={state.kills[r.key] || ''}
                  onChange={e => setKill(r.key, Number(e.target.value) || 0)}
                  placeholder="0" className="h-6 text-xs" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gathering */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Pickaxe className="h-4 w-4 text-green-400" /> Resource Gathering
            </Label>
            {subtotals.gathering > 0 && <span className="text-xs font-bold text-primary">{subtotals.gathering.toLocaleString()} pts</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {([
              ['food', 'Food', '125=1pt', 'text-green-400'], ['wood', 'Wood', '125=1pt', 'text-amber-600'],
              ['stone', 'Stone', '63=2pts', 'text-zinc-400'], ['gold', 'Gold', '25=5pts', 'text-yellow-400'],
              ['gems', 'Gems', '1=120pts', 'text-violet-400'],
            ] as const).map(([key, label, rate, color]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className={`text-xs font-medium ${color}`}>{label}</Label>
                  <span className="text-[9px] text-muted-foreground/50">{rate}</span>
                </div>
                <Input type="number" min={0} value={state[key as keyof FinalSprintStageState] as string}
                  onChange={e => onUpdate({ [key]: e.target.value })}
                  placeholder="0" className="h-7 text-sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Power & Kills (2-column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Power */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" /> Power Gain
              </Label>
              {subtotals.power > 0 && <span className="text-xs font-bold text-primary">{subtotals.power.toLocaleString()} pts</span>}
            </div>
            <p className="text-[10px] text-muted-foreground">+1 building or tech power = 1 pt each</p>
            {([['buildingPower','Building Power'],['techPower','Tech Power']] as const).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-28">{label}</Label>
                <Input type="number" min={0} value={state[key]}
                  onChange={e => onUpdate({ [key]: e.target.value })}
                  placeholder="0" className="h-7 text-sm" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Enemy Kills */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-purple-400" /> Enemy Elimination
              </Label>
              {subtotals.kills > 0 && <span className="text-xs font-bold text-primary">{subtotals.kills.toLocaleString()} pts</span>}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {([['t1','T1','6=1pt'],['t2','T2','2pt'],['t3','T3','3pt'],['t4','T4','8pt'],['t5','T5','16pt']] as const).map(([key, label, rate]) => (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">{label}</Label>
                    <span className="text-[9px] text-muted-foreground/50">{rate}</span>
                  </div>
                  <Input type="number" min={0} value={state[key as keyof FinalSprintStageState] as string}
                    onChange={e => onUpdate({ [key]: e.target.value })}
                    placeholder="0" className="h-6 text-xs" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grand total */}
      {subtotals.total > 0 && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-center">
          <span className="text-xs text-muted-foreground">Final Sprint Total: </span>
          <span className="text-lg font-bold text-primary">{subtotals.total.toLocaleString()} pts</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onSave}
          className={`gap-2 transition-colors ${saved ? 'border-green-500/50 text-green-400' : ''}`}>
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved' : 'Save Stage'}
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  TROOP TRAINING STAGE                                               */
/* ================================================================== */

type CalcMode = 'main' | 'speedups' | 'mge-points'

function TrainingStage({
  state,
  onUpdate,
  onSave,
  saved,
}: {
  state: TrainingStageState
  onUpdate: (updates: Partial<TrainingStageState>) => void
  onSave: () => void
  saved: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'main' as CalcMode, label: 'Main' },
          { id: 'speedups' as CalcMode, label: 'Based on Speedups' },
          { id: 'mge-points' as CalcMode, label: 'Based on MGE Points' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => onUpdate({ mode: m.id })}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              state.mode === m.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Speed bonus input (shared) */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Training Speed Bonus:</Label>
            <Input
              type="number"
              value={state.speedBonus}
              onChange={e => onUpdate({ speedBonus: e.target.value })}
              placeholder="0"
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      {/* Mode content */}
      {state.mode === 'main' && (
        <MainCalcMode
          speedBonus={Number(state.speedBonus) || 0}
          inputs={state.mainInputs}
          expandedTiers={state.mainExpandedTiers}
          onInputsChange={(inputs) => onUpdate({ mainInputs: inputs })}
          onExpandedChange={(tiers) => onUpdate({ mainExpandedTiers: tiers })}
        />
      )}
      {state.mode === 'speedups' && (
        <SpeedupsCalcMode
          speedBonus={Number(state.speedBonus) || 0}
          state={state}
          onUpdate={onUpdate}
        />
      )}
      {state.mode === 'mge-points' && (
        <MgePointsCalcMode
          speedBonus={Number(state.speedBonus) || 0}
          state={state}
          onUpdate={onUpdate}
        />
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          className={`gap-2 transition-colors ${saved ? 'border-green-500/50 text-green-400' : ''}`}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved' : 'Save Stage'}
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  MAIN CALC MODE - Training by troop count per tier                  */
/* ================================================================== */

function MainCalcMode({
  speedBonus,
  inputs,
  expandedTiers,
  onInputsChange,
  onExpandedChange,
}: {
  speedBonus: number
  inputs: TierInputs
  expandedTiers: Tier[]
  onInputsChange: (inputs: TierInputs) => void
  onExpandedChange: (tiers: Tier[]) => void
}) {
  const expandedSet = useMemo(() => new Set(expandedTiers), [expandedTiers])

  const toggleTier = (t: Tier) => {
    const next = new Set(expandedSet)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    onExpandedChange(Array.from(next))
  }

  const setInput = (pathKey: string, troopType: TroopType, value: number) => {
    onInputsChange({
      ...inputs,
      [pathKey]: {
        ...(inputs[pathKey] || { infantry: 0, archer: 0, cavalry: 0, siege: 0 }),
        [troopType]: value,
      },
    })
  }

  const resetPath = (pathKey: string) => {
    const next = { ...inputs }
    delete next[pathKey]
    onInputsChange(next)
  }

  // Calculate all results for a tier section
  const tierResults = useMemo(() => {
    const results: Record<Tier, TrainingResult> = {} as Record<Tier, TrainingResult>
    for (const tier of TIERS) {
      const paths = getPathsForTier(tier)
      const total: TrainingResult = { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }

      for (const path of paths) {
        const pathInputs = inputs[path.key]
        if (!pathInputs) continue

        for (const tt of TROOP_TYPES) {
          const count = pathInputs[tt.id] || 0
          if (count <= 0) continue

          let result: TrainingResult | null = null
          if (path.from === null) {
            result = calcTraining(tier, count, speedBonus)
          } else {
            result = calcUpgrade(path.from, tier, count, speedBonus)
          }
          if (result) {
            total.troops += result.troops
            total.time += result.time
            total.food += result.food
            total.wood += result.wood
            total.stone += result.stone
            total.gold += result.gold
            total.power += result.power
            total.mgePoints += result.mgePoints
            total.kvkPoints += result.kvkPoints
          }
        }
      }
      results[tier] = total
    }
    return results
  }, [inputs, speedBonus])

  const grandTotal = useMemo(() => {
    const total: TrainingResult = { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }
    for (const tier of TIERS) {
      const t = tierResults[tier]
      total.troops += t.troops
      total.time += t.time
      total.food += t.food
      total.wood += t.wood
      total.stone += t.stone
      total.gold += t.gold
      total.power += t.power
      total.mgePoints += t.mgePoints
      total.kvkPoints += t.kvkPoints
    }
    return total
  }, [tierResults])

  return (
    <div className="space-y-3">
      {TIERS.map(tier => {
        const expanded = expandedSet.has(tier)
        const paths = getPathsForTier(tier)
        const totals = tierResults[tier]

        return (
          <div key={tier} className="space-y-2">
            {/* Tier header */}
            <button
              onClick={() => toggleTier(tier)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/20">
                {expanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                <span className="text-sm font-bold text-primary">T{tier}</span>
              </div>
              {!expanded && totals.mgePoints > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totals.mgePoints.toLocaleString()} MGE pts
                </span>
              )}
            </button>

            {/* Tier content */}
            {expanded && (
              <div className="space-y-3">
                {/* Path cards in a horizontal scroll */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {paths.map(path => {
                    const pathInputs = inputs[path.key] || { infantry: 0, archer: 0, cavalry: 0, siege: 0 }
                    const tierColor = tier === 5 ? 'text-amber-400' : tier === 4 ? 'text-violet-400' : tier === 3 ? 'text-sky-400' : tier === 2 ? 'text-emerald-400' : 'text-zinc-400'

                    return (
                      <Card key={path.key} className="flex-shrink-0 w-[200px] border-border">
                        <CardContent className="pt-3 pb-3 px-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${tierColor}`}>{path.label}</span>
                            <button
                              onClick={() => resetPath(path.key)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          </div>

                          {TROOP_TYPES.map(tt => (
                            <div key={tt.id} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground w-14">{tt.label}</span>
                              <Input
                                type="number"
                                min={0}
                                value={pathInputs[tt.id] || ''}
                                onChange={e => setInput(path.key, tt.id, Number(e.target.value) || 0)}
                                className="h-7 text-xs"
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Tier totals */}
                {totals.mgePoints > 0 && (
                  <ResultsBar result={totals} compact />
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Grand total */}
      {grandTotal.mgePoints > 0 && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 pb-4">
            <div className="text-sm font-bold text-foreground mb-3">Overall Totals</div>
            <ResultsBar result={grandTotal} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ================================================================== */
/*  SPEEDUPS CALC MODE                                                 */
/* ================================================================== */

function SpeedupsCalcMode({
  speedBonus,
  state,
  onUpdate,
}: {
  speedBonus: number
  state: TrainingStageState
  onUpdate: (updates: Partial<TrainingStageState>) => void
}) {
  const result = useMemo(() => {
    const speedupSec = (Number(state.speedupsDays) || 0) * 86400 + (Number(state.speedupsHours) || 0) * 3600 + (Number(state.speedupsMinutes) || 0) * 60
    const res = {
      food: Number(state.speedupsFood) || 0,
      wood: Number(state.speedupsWood) || 0,
      stone: Number(state.speedupsStone) || 0,
      gold: Number(state.speedupsGold) || 0,
    }
    const from = state.speedupsFromTier === 'scratch' ? null : (Number(state.speedupsFromTier) as Tier)
    return calcFromSpeedups(state.speedupsTier, from, speedBonus, speedupSec, res, state.speedupsTroopType)
  }, [state.speedupsDays, state.speedupsHours, state.speedupsMinutes, state.speedupsFood, state.speedupsWood, state.speedupsStone, state.speedupsGold, state.speedupsTier, state.speedupsFromTier, speedBonus])

  const resetSpeedups = () => { onUpdate({ speedupsDays: '', speedupsHours: '', speedupsMinutes: '' }) }
  const resetResources = () => { onUpdate({ speedupsFood: '', speedupsWood: '', speedupsStone: '', speedupsGold: '' }) }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Speedups */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">Speedups Available</Label>
              <button onClick={resetSpeedups} className="text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /></button>
            </div>
            {[
              { label: 'Days', value: state.speedupsDays, key: 'speedupsDays' as const },
              { label: 'Hours', value: state.speedupsHours, key: 'speedupsHours' as const },
              { label: 'Minutes', value: state.speedupsMinutes, key: 'speedupsMinutes' as const },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-14">{f.label}</span>
                <Input type="number" min={0} value={f.value} onChange={e => onUpdate({ [f.key]: e.target.value })} placeholder="0" className="h-8 text-sm" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">Resources Available</Label>
              <button onClick={resetResources} className="text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /></button>
            </div>
            {[
              { label: 'Food', value: state.speedupsFood, key: 'speedupsFood' as const, color: 'text-green-400' },
              { label: 'Wood', value: state.speedupsWood, key: 'speedupsWood' as const, color: 'text-amber-600' },
              { label: 'Stone', value: state.speedupsStone, key: 'speedupsStone' as const, color: 'text-zinc-400' },
              { label: 'Gold', value: state.speedupsGold, key: 'speedupsGold' as const, color: 'text-yellow-400' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <span className={`text-xs font-medium w-14 ${f.color}`}>{f.label}</span>
                <Input type="number" min={0} value={f.value} onChange={e => onUpdate({ [f.key]: e.target.value })} placeholder="0" className="h-8 text-sm" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Troop selection */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <Label className="text-sm font-semibold text-foreground">Troop Selection</Label>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Troops Type</Label>
              <Select value={state.speedupsTroopType} onValueChange={v => onUpdate({ speedupsTroopType: v as TroopType })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TROOP_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Training Type</Label>
              <Select value={`${state.speedupsTier}-${state.speedupsFromTier}`} onValueChange={v => {
                const [t, f] = v.split('-')
                onUpdate({ speedupsTier: Number(t) as Tier, speedupsFromTier: f })
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map(t => (
                    <SelectItem key={`${t}-scratch`} value={`${t}-scratch`}>T{t} From Scratch</SelectItem>
                  ))}
                  {[
                    { from: 4, to: 5 }, { from: 3, to: 5 }, { from: 2, to: 5 }, { from: 1, to: 5 },
                    { from: 3, to: 4 }, { from: 2, to: 4 }, { from: 1, to: 4 },
                    { from: 2, to: 3 }, { from: 1, to: 3 },
                    { from: 1, to: 2 },
                  ].map(p => (
                    <SelectItem key={`${p.to}-${p.from}`} value={`${p.to}-${p.from}`}>T{p.from} to T{p.to}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card className="border-primary/30">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="text-sm font-bold text-foreground">You can train</div>
          <div className="text-3xl font-bold text-primary">{result.troops.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">troops</span></div>

          <div className="border-t border-border pt-3">
            <div className="text-sm font-bold text-foreground mb-2">You will receive</div>
            <div className="grid grid-cols-3 gap-3">
              <StatChip icon={Zap} label="MGE Points" value={result.mgePoints.toLocaleString()} />
              <StatChip icon={Shield} label="Power" value={result.power.toLocaleString()} />
              <StatChip icon={Swords} label="KvK Points" value={result.kvkPoints.toLocaleString()} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-sm font-bold text-foreground mb-2">You will spend</div>
            <ResourceBar result={result} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/*  MGE POINTS CALC MODE                                               */
/* ================================================================== */

function MgePointsCalcMode({
  speedBonus,
  state,
  onUpdate,
}: {
  speedBonus: number
  state: TrainingStageState
  onUpdate: (updates: Partial<TrainingStageState>) => void
}) {
  const result = useMemo(() => {
    const from = state.mgeFromTier === 'scratch' ? null : (Number(state.mgeFromTier) as Tier)
    return calcFromMgePoints(state.mgeTier, from, speedBonus, Number(state.mgeTargetPoints) || 0, state.mgeTroopType)
  }, [state.mgeTargetPoints, state.mgeTier, state.mgeFromTier, speedBonus])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MGE target */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <Label className="text-sm font-semibold text-foreground">Target MGE Points</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-20">MGE Points:</span>
              <Input type="number" min={0} value={state.mgeTargetPoints} onChange={e => onUpdate({ mgeTargetPoints: e.target.value })} placeholder="0" className="h-8 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Troop selection */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <Label className="text-sm font-semibold text-foreground">Troop Selection</Label>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Troops Type</Label>
              <Select value={state.mgeTroopType} onValueChange={v => onUpdate({ mgeTroopType: v as TroopType })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TROOP_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Training Type</Label>
              <Select value={`${state.mgeTier}-${state.mgeFromTier}`} onValueChange={v => {
                const [t, f] = v.split('-')
                onUpdate({ mgeTier: Number(t) as Tier, mgeFromTier: f })
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map(t => (
                    <SelectItem key={`${t}-scratch`} value={`${t}-scratch`}>T{t} From Scratch</SelectItem>
                  ))}
                  {[
                    { from: 4, to: 5 }, { from: 3, to: 5 }, { from: 2, to: 5 }, { from: 1, to: 5 },
                    { from: 3, to: 4 }, { from: 2, to: 4 }, { from: 1, to: 4 },
                    { from: 2, to: 3 }, { from: 1, to: 3 },
                    { from: 1, to: 2 },
                  ].map(p => (
                    <SelectItem key={`${p.to}-${p.from}`} value={`${p.to}-${p.from}`}>T{p.from} to T{p.to}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card className="border-primary/30">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="text-sm font-bold text-foreground">You need to train</div>
          <div className="text-3xl font-bold text-primary">{result.troops.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">troops</span></div>

          <div className="border-t border-border pt-3">
            <div className="text-sm font-bold text-foreground mb-2">You will receive</div>
            <div className="grid grid-cols-3 gap-3">
              <StatChip icon={Zap} label="MGE Points" value={result.mgePoints.toLocaleString()} />
              <StatChip icon={Shield} label="Power" value={result.power.toLocaleString()} />
              <StatChip icon={Swords} label="KvK Points" value={result.kvkPoints.toLocaleString()} />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-sm font-bold text-foreground mb-2">You will spend</div>
            <ResourceBar result={result} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ================================================================== */
/*  SHARED UI COMPONENTS                                               */
/* ================================================================== */

function StatChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
}

function ResourceBar({ result }: { result: TrainingResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Time:</span>
        <span className="font-medium text-foreground">{formatTime(result.time)}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs text-green-400">{result.food.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TreePine className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs text-amber-600">{result.wood.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mountain className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-400">{result.stone.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-xs text-yellow-400">{result.gold.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function ResultsBar({ result, compact }: { result: TrainingResult; compact?: boolean }) {
  return (
    <div className={`rounded-lg bg-secondary/30 border border-border ${compact ? 'px-3 py-2' : 'px-4 py-3'} space-y-1.5`}>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span className="text-muted-foreground">Time: <span className="text-foreground font-medium">{formatTime(result.time)}</span></span>
        <span className="text-muted-foreground">MGE Points: <span className="text-foreground font-medium">{result.mgePoints.toLocaleString()}</span></span>
        <span className="text-muted-foreground">Power: <span className="text-foreground font-medium">{result.power.toLocaleString()}</span></span>
        <span className="text-muted-foreground">KvK Points: <span className="text-foreground font-medium">{result.kvkPoints.toLocaleString()}</span></span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span className="text-green-400">Food: {result.food.toLocaleString()}</span>
        <span className="text-amber-600">Wood: {result.wood.toLocaleString()}</span>
        <span className="text-zinc-400">Stone: {result.stone.toLocaleString()}</span>
        <span className="text-yellow-400">Gold: {result.gold.toLocaleString()}</span>
      </div>
    </div>
  )
}
