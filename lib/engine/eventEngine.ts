/* ------------------------------------------------------------------ */
/*  Event Engine — calendar event filtering & gold head calculations   */
/* ------------------------------------------------------------------ */

import type { OccOutcome, OccRow, MtgDayPlan, MtgEventPlan, WheelOcc } from './types'

/** The 5 tracked gold head event categories */
export const GH_CATEGORIES = new Set([
  'Ark of Osiris',
  'Champions of Olympia',
  'More Than Gems',
  'Silk Road',
  'Wheel of Fortune',
])

export function isGoldHeadEvent(category: string): boolean {
  return GH_CATEGORIES.has(category)
}

export function getEventStatus(
  startDate: string,
  endDate: string,
  todayStr: string,
): 'upcoming' | 'active' | 'past' {
  if (startDate > todayStr) return 'upcoming'
  if (endDate < todayStr) return 'past'
  return 'active'
}

/** Default assumed heads for a category (before user logs outcome) */
export function getDefaultHeads(category: string): number {
  switch (category) {
    case 'Ark of Osiris': return 10   // assume win
    case 'Champions of Olympia': return 2
    case 'More Than Gems': return 26  // 14k per day x 2 days = 13+13
    case 'Silk Road': return 5
    default: return 0
  }
}

/** Heads for a specific logged outcome */
export function getOutcomeHeads(category: string, outcome: OccOutcome): number {
  if (!outcome || outcome === 'default') return getDefaultHeads(category)

  if (category === 'Ark of Osiris') {
    if (outcome === 'win') return 10
    if (outcome === 'loss') return 5
    if (outcome === 'skip') return 0
    return 0
  }

  if (category === 'Champions of Olympia') {
    if (outcome === 'complete') return 2
    if (outcome === 'skip') return 0
    return 0
  }

  if (category === 'Silk Road') {
    return outcome === 'complete' ? 5 : 0
  }

  // MTG is handled separately via MtgEventPlan
  if (category === 'More Than Gems') {
    if (outcome === 'complete') return 26
    if (outcome === 'skip') return 0
    return 0
  }

  return 0
}

/** Build occurrence rows from calendar events (excluding Wheel and MTG which are handled separately) */
export function buildOccurrenceRows(
  events: { title: string; category: string; startDate: string; endDate: string }[],
  todayStr: string,
  goalDateStr: string,
  outcomes: Record<string, OccOutcome>,
): OccRow[] {
  return events
    .filter((e) => e.startDate <= goalDateStr)
    .filter((e) => isGoldHeadEvent(e.category))
    .filter((e) => e.category !== 'Wheel of Fortune')
    .filter((e) => e.category !== 'More Than Gems')
    .map((e) => {
      const status = getEventStatus(e.startDate, e.endDate, todayStr)
      const key = `${e.category}_${e.startDate}_${e.endDate}`
      const loggedOutcome = outcomes[key] ?? null
      const needsInput = status === 'active' && loggedOutcome === null

      // Active events = 0 until logged
      const headsCounted =
        status === 'active' && loggedOutcome === null
          ? 0
          : getOutcomeHeads(e.category, loggedOutcome ?? 'default')

      return {
        id: key,
        title: e.title,
        category: e.category,
        startDate: e.startDate,
        endDate: e.endDate,
        status,
        defaultHeads: getDefaultHeads(e.category),
        loggedOutcome,
        headsCounted,
        needsInput,
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/* ------------------------------------------------------------------ */
/*  MTG Per-Day Logic                                                  */
/* ------------------------------------------------------------------ */

export const MTG_TIERS: Record<MtgDayPlan['gemTier'], { heads: number; gems: number }> = {
  skip: { heads: 0, gems: 0 },
  '7k': { heads: 5, gems: 7000 },
  '14k': { heads: 13, gems: 14000 },
}

export function createDefaultMtgPlan(): MtgEventPlan {
  return {
    day1: { gemTier: '14k', heads: 13, gems: 14000 },
    day2: { gemTier: '14k', heads: 13, gems: 14000 },
    actualHeadsLogged: null,
  }
}

export function setMtgDayTier(
  plan: MtgEventPlan,
  day: 'day1' | 'day2',
  tier: MtgDayPlan['gemTier'],
): MtgEventPlan {
  const vals = MTG_TIERS[tier]
  return { ...plan, [day]: { gemTier: tier, heads: vals.heads, gems: vals.gems } }
}

export function getMtgPlannedHeads(plan: MtgEventPlan): number {
  if (plan.actualHeadsLogged !== null) return plan.actualHeadsLogged
  return plan.day1.heads + plan.day2.heads
}

export function getMtgPlannedGems(plan: MtgEventPlan): number {
  return plan.day1.gems + plan.day2.gems
}

/** Build MTG occurrence rows from calendar events */
export function buildMtgRows(
  events: { title: string; category: string; startDate: string; endDate: string }[],
  todayStr: string,
  goalDateStr: string,
) {
  return events
    .filter((e) => e.startDate <= goalDateStr)
    .filter((e) => e.category === 'More Than Gems')
    .map((e) => {
      const status = getEventStatus(e.startDate, e.endDate, todayStr)
      const key = `mtg_${e.startDate}_${e.endDate}`
      return {
        key,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        status,
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** Build wheel occurrence rows from calendar events */
export function buildWheelRows(
  events: { title: string; category: string; startDate: string; endDate: string }[],
  todayStr: string,
  goalDateStr: string,
): WheelOcc[] {
  return events
    .filter((e) => e.startDate <= goalDateStr)
    .filter((e) => e.category === 'Wheel of Fortune')
    .map((e) => {
      const status = getEventStatus(e.startDate, e.endDate, todayStr)
      const key = `wof_${e.startDate}_${e.endDate}`
      return { key, title: e.title, startDate: e.startDate, endDate: e.endDate, status }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}
