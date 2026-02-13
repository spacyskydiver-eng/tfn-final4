/* ------------------------------------------------------------------ */
/*  Projection Engine — chart data builder & gems planner              */
/* ------------------------------------------------------------------ */

import type { OccRow, ChartRow, MtgEventPlan } from './types'
import { getMtgPlannedHeads } from './eventEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

/**
 * Build daily cumulative head data for the progress graph.
 * Starts from currentGoldHeads baseline.
 * Merges actual progress entries onto chart rows.
 */
export function buildChartData(
  daysUntilGoal: number,
  vipPerDay: number,
  occRows: OccRow[],
  mtgEvents: { startDate: string; plan: MtgEventPlan }[],
  wheelOccs: { startDate: string; spins: number }[],
  anchorDate: Date, // IMPORTANT: day 0 anchor (profile.startDate)
  currentGoldHeads: number = 0,
  actualProgress: Record<string, number> = {},
): ChartRow[] {
  const dayMs = 86400000

  // Event heads by day offset (relative to anchorDate)
  const eventByOffset = new Map<number, number>()
  for (const r of occRows) {
    const start = new Date(r.startDate)
    const offset = Math.floor((start.getTime() - anchorDate.getTime()) / dayMs)
    if (offset < 0) continue
    eventByOffset.set(offset, (eventByOffset.get(offset) ?? 0) + r.headsCounted)
  }

  // MTG heads by day offset (split across 2 days, relative to anchorDate)
  for (const m of mtgEvents) {
    const start = new Date(m.startDate)
    const offset = Math.floor((start.getTime() - anchorDate.getTime()) / dayMs)
    if (offset < 0) continue

    const heads = getMtgPlannedHeads(m.plan)

    const day1Heads =
      m.plan.actualHeadsLogged !== null
        ? Math.floor(heads / 2)
        : m.plan.day1.heads

    const day2Heads =
      m.plan.actualHeadsLogged !== null
        ? heads - day1Heads
        : m.plan.day2.heads

    eventByOffset.set(offset, (eventByOffset.get(offset) ?? 0) + day1Heads)
    eventByOffset.set(offset + 1, (eventByOffset.get(offset + 1) ?? 0) + day2Heads)
  }

  // Wheel heads by day offset (relative to anchorDate)
  const wheelByOffset = new Map<number, number>()
  for (const w of wheelOccs) {
    if (w.spins <= 0) continue
    const start = new Date(w.startDate)
    const offset = Math.floor((start.getTime() - anchorDate.getTime()) / dayMs)
    if (offset < 0) continue

    const h = Math.floor(
      calcWofPlan({ targetSpins: w.spins, useBundles: {} }).expectedHeads,
    )

    wheelByOffset.set(offset, (wheelByOffset.get(offset) ?? 0) + h)
  }

  // Actual progress by day offset (relative to anchorDate)
  const actualByOffset = new Map<number, number>()
  for (const [dateStr, headsRaw] of Object.entries(actualProgress)) {
    const d = new Date(dateStr)
    const offset = Math.floor((d.getTime() - anchorDate.getTime()) / dayMs)
    if (offset < 0 || offset > daysUntilGoal) continue
    actualByOffset.set(offset, Number(headsRaw))
  }

  let vipCum = 0
  let eventCum = 0
  let wheelCum = 0

  const rows: ChartRow[] = []
  const numDays = Math.max(1, daysUntilGoal)

  for (let d = 0; d <= numDays; d++) {
    // ✅ Day 0 should be baseline only
    if (d > 0) {
      vipCum += vipPerDay
      eventCum += eventByOffset.get(d) ?? 0
      wheelCum += wheelByOffset.get(d) ?? 0
    } else {
      // include any day-0 events if you want them counted on day 0:
      // eventCum += eventByOffset.get(0) ?? 0
      // wheelCum += wheelByOffset.get(0) ?? 0
    }

    const dateForDay = new Date(anchorDate.getTime() + d * dayMs)
    const dateStr = dateForDay.toISOString().slice(0, 10)

    const row: ChartRow = {
      day: d,
      date: dateStr,
      vip: vipCum,
      events: eventCum,
      wheel: wheelCum,
      total: Number(currentGoldHeads) + vipCum + eventCum + wheelCum,
    }

    if (actualByOffset.has(d)) row.actual = actualByOffset.get(d)

    rows.push(row)
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
