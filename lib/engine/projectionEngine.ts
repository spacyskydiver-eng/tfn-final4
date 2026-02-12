/* ------------------------------------------------------------------ */
/*  Projection Engine — chart data builder & gems planner              */
/* ------------------------------------------------------------------ */

import type { OccRow, ChartRow, MtgEventPlan } from './types'
import { getMtgPlannedHeads } from './eventEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

/**
 * Build daily cumulative head data for the progress graph.
 */
export function buildChartData(
  daysUntilGoal: number,
  vipPerDay: number,
  occRows: OccRow[],
  mtgEvents: { startDate: string; plan: MtgEventPlan }[],
  wheelOccs: { startDate: string; spins: number }[],
  today: Date,
): ChartRow[] {
  // Pre-compute event heads by day offset
  const eventByOffset = new Map<number, number>()
  for (const r of occRows) {
    const start = new Date(r.startDate)
    const offset = Math.max(0, Math.floor((start.getTime() - today.getTime()) / 86400000))
    eventByOffset.set(offset, (eventByOffset.get(offset) ?? 0) + r.headsCounted)
  }

  // MTG heads by day offset (split across 2 days)
  for (const m of mtgEvents) {
    const start = new Date(m.startDate)
    const offset = Math.max(0, Math.floor((start.getTime() - today.getTime()) / 86400000))
    const heads = getMtgPlannedHeads(m.plan)
    // Split across 2 days
    const day1Heads = m.plan.actualHeadsLogged !== null
      ? Math.floor(heads / 2)
      : m.plan.day1.heads
    const day2Heads = m.plan.actualHeadsLogged !== null
      ? heads - day1Heads
      : m.plan.day2.heads
    eventByOffset.set(offset, (eventByOffset.get(offset) ?? 0) + day1Heads)
    eventByOffset.set(offset + 1, (eventByOffset.get(offset + 1) ?? 0) + day2Heads)
  }

  // Wheel heads by day offset
  const wheelByOffset = new Map<number, number>()
  for (const w of wheelOccs) {
    if (w.spins <= 0) continue
    const start = new Date(w.startDate)
    const offset = Math.max(0, Math.floor((start.getTime() - today.getTime()) / 86400000))
    const h = Math.floor(calcWofPlan({ targetSpins: w.spins, useBundles: {} }).expectedHeads)
    wheelByOffset.set(offset, (wheelByOffset.get(offset) ?? 0) + h)
  }

  let vipCum = 0
  let eventCum = 0
  let wheelCum = 0

  const rows: ChartRow[] = []
  for (let d = 0; d <= Math.max(1, daysUntilGoal); d++) {
    vipCum += vipPerDay
    eventCum += eventByOffset.get(d) ?? 0
    wheelCum += wheelByOffset.get(d) ?? 0
    rows.push({
      day: d,
      vip: vipCum,
      events: eventCum,
      wheel: wheelCum,
      total: vipCum + eventCum + wheelCum,
    })
  }
  return rows
}

/**
 * Calculate gem budget plan
 */
export function calcGemsPlan(
  currentGems: number,
  dailyGemIncome: number,
  daysUntilGoal: number,
  mtgPlannedSpend: number,
  wheelPlannedSpend: number,
): {
  totalGemIncome: number
  totalPlannedSpend: number
  gemBalance: number
  gemsNeeded: number
} {
  const totalGemIncome = currentGems + dailyGemIncome * daysUntilGoal
  const totalPlannedSpend = mtgPlannedSpend + wheelPlannedSpend
  const gemBalance = totalGemIncome - totalPlannedSpend
  const gemsNeeded = Math.max(0, totalPlannedSpend - totalGemIncome)

  return { totalGemIncome, totalPlannedSpend, gemBalance, gemsNeeded }
}
