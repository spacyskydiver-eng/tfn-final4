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
  /** Maps wheel occurrence key → commander id for direct head assignment */
  wofCommanderAssignments?: Record<string, string>
  /** Whether to use SoC timeline mode in Wheel Tracker */
  wofUseSocTimeline?: boolean
  /** Profile tracking start date (YYYY-MM-DD). Events before this are ignored. */
  startDate?: string
  /** Current gold heads the user already owns */
  currentGoldHeads?: number
  /** User-recorded actual progress entries: { [YYYY-MM-DD]: totalGoldHeads } */
  actualProgress?: Record<string, number>
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
  date: string
  vip: number
  events: number
  wheel: number
  total: number
  actual?: number
}
