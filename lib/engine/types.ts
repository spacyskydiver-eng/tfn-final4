/* ------------------------------------------------------------------ */
/*  Commander Preparation Planner — Shared Types                       */
/* ------------------------------------------------------------------ */

import type { CommanderSkillSet } from '@/lib/kvk-engine'

export type CommanderGoal = {
  id: string
  name: string
  rarity: 'legendary' | 'epic'
  currentSkills: CommanderSkillSet
  targetSkills: CommanderSkillSet
  allocationPct: number
}

export type AccountProfile = {
  id: string
  name: string
  kingdom: string
  vipLevel: number
  currentGems: number
  dailyGemIncome: number
  daysUntilGoal: number
  commanders: CommanderGoal[]
  wofTargetSpins: number
  wofBundles: Record<string, boolean>
}

export type OccOutcome = 'default' | 'win' | 'loss' | 'complete' | 'skip' | null

export type OccRow = {
  id: string
  title: string
  category: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'past'
  defaultHeads: number
  loggedOutcome: OccOutcome
  headsCounted: number
  needsInput: boolean
}

export type MtgDayPlan = {
  gemTier: 'skip' | '7k' | '14k'
  heads: number
  gems: number
}

export type MtgEventPlan = {
  day1: MtgDayPlan
  day2: MtgDayPlan
  actualHeadsLogged: number | null
}

export type WheelOcc = {
  key: string
  title: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'past'
}

export type ChartRow = {
  day: number
  vip: number
  events: number
  wheel: number
  total: number
}
