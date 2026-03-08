'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Save } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useEvents } from '@/lib/event-context'
import type { AccountProfile, OccOutcome, MtgEventPlan } from '@/lib/engine/types'
import { buildOccurrenceRows, buildMtgRows, buildWheelRows, createDefaultMtgPlan, getMtgPlannedHeads } from '@/lib/engine/eventEngine'
import { buildChartData } from '@/lib/engine/projectionEngine'
import { calcTotalHeadsNeeded, calcCommanderNeeds } from '@/lib/engine/commanderEngine'
import { calcVipHeads, VIP_HEADS_PER_DAY } from '@/lib/engine/incomeEngine'
import { calcTotalProjectedHeads } from '@/lib/engine/incomeEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

export function ProgressGraph({
  profile,
  onUpdate,
}: {
  profile: AccountProfile
  onUpdate: (p: AccountProfile) => void
}) {
  const { events } = useEvents()

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const goalDate = new Date(today.getTime() + profile.daysUntilGoal * 86400000)
  const goalDateStr = goalDate.toISOString().slice(0, 10)
  const profileStartDate = profile.startDate

  /* ---------- Load persisted state ---------- */
  const OUTCOME_KEY = `gh_outcomes_${profile.id}`
  const MTG_KEY = `mtg_plans_${profile.id}`
  const WOF_SPINS_KEY = `wof_spins_${profile.id}`

  const [outcomes, setOutcomes] = useState<Record<string, OccOutcome>>({})
  const [mtgPlans, setMtgPlans] = useState<Record<string, MtgEventPlan>>({})
  const [wofSpinsByOcc, setWofSpinsByOcc] = useState<Record<string, number>>({})

  useEffect(() => {
    if (profile.ghOutcomes) {
      setOutcomes(profile.ghOutcomes)
    } else {
      try { setOutcomes(JSON.parse(localStorage.getItem(OUTCOME_KEY) || '{}')) } catch { setOutcomes({}) }
    }
    try { setMtgPlans(JSON.parse(localStorage.getItem(MTG_KEY) || '{}')) } catch { setMtgPlans({}) }
    try { setWofSpinsByOcc(JSON.parse(localStorage.getItem(WOF_SPINS_KEY) || '{}')) } catch { setWofSpinsByOcc({}) }
  }, [OUTCOME_KEY, MTG_KEY, WOF_SPINS_KEY, profile.ghOutcomes])

  /* ---------- Actual progress input ---------- */
  const actualProgress = profile.actualProgress ?? {}
  const anchorStr = profile.startDate ?? todayStr
const anchorDate = new Date(anchorStr)
  const [actualInput, setActualInput] = useState<string>('')

  useEffect(() => {
    setActualInput(
  actualProgress[todayStr] !== undefined
    ? String(actualProgress[todayStr])
    : ''
)
  }, [todayStr, profile.id])

  const saveActualProgress = () => {
    const val = Number(actualInput)
    if (isNaN(val) || val < 0) return
    const updated = {
  ...actualProgress,
  [todayStr]: Number(val),
}
    onUpdate({ ...profile, actualProgress: updated })
  }

  /* ---------- Build chart data ---------- */
  const occRows = useMemo(
    () => buildOccurrenceRows(events, todayStr, goalDateStr, outcomes, profileStartDate),
    [events, todayStr, goalDateStr, outcomes, profileStartDate],
  )
  const mtgRows = useMemo(
    () => buildMtgRows(events, todayStr, goalDateStr, profileStartDate),
    [events, todayStr, goalDateStr, profileStartDate],
  )
  const wheelRows = useMemo(
    () => buildWheelRows(events, todayStr, goalDateStr, profileStartDate),
    [events, todayStr, goalDateStr, profileStartDate],
  )

  const vipPerDay = VIP_HEADS_PER_DAY[profile.vipLevel] ?? 0
  const currentGoldHeads = Number(profile.currentGoldHeads ?? 0)

  const chartData = useMemo(() => {
    const mtgEventsForChart = mtgRows.map((m) => ({
      startDate: m.startDate,
      plan: mtgPlans[m.key] ?? createDefaultMtgPlan(),
    }))

    const wheelOccsForChart = wheelRows.map((w) => ({
      startDate: w.startDate,
      spins: wofSpinsByOcc[w.key] ?? 0,
    }))

return buildChartData(
  profile.daysUntilGoal,
  vipPerDay,
  occRows,
  mtgEventsForChart,
  wheelOccsForChart,
  anchorDate,
  currentGoldHeads,
  actualProgress,
)

  }, [profile.daysUntilGoal, vipPerDay, occRows, mtgRows, mtgPlans, wheelRows, wofSpinsByOcc, today, currentGoldHeads, actualProgress])

  /* ---------- Summary ---------- */
  const vipHeads = calcVipHeads(profile.vipLevel, profile.daysUntilGoal)
  const eventHeads = occRows.reduce((s, r) => s + r.headsCounted, 0)
  const mtgHeads = mtgRows.reduce(
    (s, r) => s + getMtgPlannedHeads(mtgPlans[r.key] ?? createDefaultMtgPlan()),
    0,
  )
  const totalWheelSpins = wheelRows.reduce(
    (sum, w) => sum + (wofSpinsByOcc[w.key] ?? 0),
    0,
  )
  const wofHeads = useMemo(() => {
    if (totalWheelSpins <= 0) return 0
    return Math.floor(calcWofPlan({ targetSpins: totalWheelSpins, useBundles: {} }).expectedHeads)
  }, [totalWheelSpins])

  const totalHeadsExpected = currentGoldHeads + calcTotalProjectedHeads(vipHeads, eventHeads, mtgHeads, wofHeads)
  const totalHeadsNeeded = calcTotalHeadsNeeded(profile.commanders)
  const completionPct = totalHeadsNeeded > 0
    ? Math.min(100, Math.round((totalHeadsExpected / totalHeadsNeeded) * 100))
    : 0

  /* ---------- Commander breakdown for individual progress chart ---------- */
  const wofAssignments = profile.wofCommanderAssignments ?? {}

  const commanderProgressData = useMemo(() => {
    const dayMs = 86400000
    const allocationMode = profile.allocationMode ?? 'percent'

    // Build per-day universal heads (vip + events + mtg + unassigned wheel) and per-commander injections
    const universalByDay = new Map<number, number>()
    const wheelByCommander = new Map<string, Map<number, number>>()

    const addToMap = (map: Map<number, number>, day: number, value: number) => {
      map.set(day, (map.get(day) ?? 0) + value)
    }

    // Occurrence rows (events)
    for (const r of occRows) {
      const start = new Date(r.startDate)
      const offset = Math.floor((start.getTime() - anchorDate.getTime()) / dayMs)
      if (offset < 0) continue
      addToMap(universalByDay, offset, r.headsCounted)
    }

    // MTG rows (two-day split or actual logged)
    for (const m of mtgRows) {
      const start = new Date(m.startDate)
      const offset = Math.floor((start.getTime() - anchorDate.getTime()) / dayMs)
      if (offset < 0) continue

      const plan = mtgPlans[m.key] ?? createDefaultMtgPlan()
      const heads = getMtgPlannedHeads(plan)
      const day1Heads = plan.actualHeadsLogged !== null ? Math.floor(heads / 2) : plan.day1.heads
      const day2Heads = plan.actualHeadsLogged !== null ? heads - day1Heads : plan.day2.heads
      addToMap(universalByDay, offset, day1Heads)
      addToMap(universalByDay, offset + 1, day2Heads)
    }

    // Wheel rows: assigned go to commander, otherwise universal
    for (const w of wheelRows) {
      const spins = wofSpinsByOcc[w.key] ?? 0
      if (spins <= 0) continue
      const start = new Date(w.startDate)
      const offset = Math.floor((start.getTime() - anchorDate.getTime()) / dayMs)
      if (offset < 0) continue
      const heads = Math.floor(calcWofPlan({ targetSpins: spins, useBundles: {} }).expectedHeads)
      const cmdId = wofAssignments[w.key]
      if (cmdId) {
        const map = wheelByCommander.get(cmdId) ?? new Map<number, number>()
        addToMap(map, offset, heads)
        wheelByCommander.set(cmdId, map)
      } else {
        addToMap(universalByDay, offset, heads)
      }
    }

    // Helper to allocate universal pool to commanders based on mode
    const allocateUniversal = (
      pool: number,
      remaining: Map<string, number>,
      mode: 'percent' | 'sequential',
    ) => {
      const allocated: Record<string, number> = {}
      if (pool <= 0) return { allocated, leftover: 0 }

      if (mode === 'percent') {
        const active = profile.commanders.filter((c) => (remaining.get(c.id) ?? 0) > 0)
        const totalPct = active.reduce((s, c) => s + c.allocationPct, 0)
        if (totalPct <= 0) return { allocated, leftover: pool }

        let spent = 0
        for (const c of active) {
          const rem = remaining.get(c.id) ?? 0
          if (rem <= 0) continue
          const share = (pool * c.allocationPct) / totalPct
          const give = Math.min(rem, Math.floor(share))
          if (give > 0) {
            allocated[c.id] = give
            remaining.set(c.id, rem - give)
            spent += give
          }
        }

        // If there is leftover because of flooring, push it sequentially to active commanders
        let leftover = pool - spent
        if (leftover > 0) {
          for (const c of active) {
            const rem = remaining.get(c.id) ?? 0
            if (rem <= 0) continue
            const give = Math.min(rem, leftover)
            if (give > 0) {
              allocated[c.id] = (allocated[c.id] ?? 0) + give
              remaining.set(c.id, rem - give)
              leftover -= give
            }
            if (leftover <= 0) break
          }
        }
        return { allocated, leftover: Math.max(0, leftover) }
      }

      // Sequential fill (list order)
      let leftover = pool
      for (const c of profile.commanders) {
        const rem = remaining.get(c.id) ?? 0
        if (rem <= 0) continue
        const give = Math.min(rem, leftover)
        if (give > 0) {
          allocated[c.id] = give
          remaining.set(c.id, rem - give)
          leftover -= give
        }
        if (leftover <= 0) break
      }
      return { allocated, leftover }
    }

    // Initialize per-commander tracking
    const needs = new Map<string, number>()
    const allocatedTotal = new Map<string, number>()
    for (const cmd of profile.commanders) {
      const n = calcCommanderNeeds(cmd).needed
      needs.set(cmd.id, n)
      allocatedTotal.set(cmd.id, 0)
    }

    // Baseline heads (latest actual or current) treated as day 0 universal pool
    const latestActualHeads = Object.entries(profile.actualProgress ?? {})
      .sort(([a], [b]) => b.localeCompare(a))[0]?.[1]
    const baselineHeads = latestActualHeads !== undefined
      ? Number(latestActualHeads)
      : Number(profile.currentGoldHeads ?? 0)

    const rows: Array<{ day: number; date: string; [key: string]: number }> = []
    const numDays = Math.max(1, profile.daysUntilGoal)

    for (let d = 0; d <= numDays; d++) {
      const dateStr = new Date(anchorDate.getTime() + d * dayMs).toISOString().slice(0, 10)

      // Add baseline on day 0
      let universalPool = 0
      if (d === 0) {
        universalPool += baselineHeads
      }

      // Apply planned heads per commander as a day-0 injection
      if (d === 0) {
        for (const cmd of profile.commanders) {
          const planned = Math.max(0, Number(cmd.plannedHeads) || 0)
          if (planned <= 0) continue
          const rem = needs.get(cmd.id) ?? 0
          const give = Math.min(rem, planned)
          allocatedTotal.set(cmd.id, (allocatedTotal.get(cmd.id) ?? 0) + give)
          needs.set(cmd.id, Math.max(0, rem - give))
        }
      }

      // Add VIP per day (only after day 0) and scheduled sources
      if (d > 0) universalPool += vipPerDay
      universalPool += universalByDay.get(d) ?? 0

      // Apply wheel direct heads
      for (const cmd of profile.commanders) {
        const map = wheelByCommander.get(cmd.id)
        const add = map?.get(d) ?? 0
        if (add > 0) {
          const rem = needs.get(cmd.id) ?? 0
          const give = Math.min(rem, add)
          allocatedTotal.set(cmd.id, (allocatedTotal.get(cmd.id) ?? 0) + give)
          needs.set(cmd.id, Math.max(0, rem - give))
        }
      }

      // Allocate universal pool according to rule
      const remainingCopy = new Map(needs)
      const { allocated } = allocateUniversal(universalPool, remainingCopy, allocationMode)
      for (const [cmdId, amt] of Object.entries(allocated)) {
        allocatedTotal.set(cmdId, (allocatedTotal.get(cmdId) ?? 0) + amt)
        needs.set(cmdId, Math.max(0, (needs.get(cmdId) ?? 0) - amt))
      }

      const entry: Record<string, number> = { day: d, date: dateStr }
      for (const cmd of profile.commanders) {
        const need = calcCommanderNeeds(cmd).needed || 1
        const have = allocatedTotal.get(cmd.id) ?? 0
        const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100
        const label = cmd.name || `Commander ${cmd.id.substring(0, 8)}`
        entry[label] = pct
      }

      rows.push(entry)
    }

    return rows
  }, [
    profile.commanders,
    profile.daysUntilGoal,
    profile.actualProgress,
    profile.currentGoldHeads,
    profile.allocationMode,
    occRows,
    mtgRows,
    mtgPlans,
    wheelRows,
    wofSpinsByOcc,
    wofAssignments,
    anchorDate,
    vipPerDay,
  ])

  const COMMANDER_COLORS = [
    'hsl(var(--chart-1, 12 76% 61%))',   // Red
    'hsl(var(--chart-2, 173 58% 39%))',  // Blue
    'hsl(var(--chart-3, 197 37% 24%))',  // Purple
    'hsl(var(--chart-4, 142 71% 45%))',  // Green
    'hsl(var(--chart-5, 43 74% 66%))',   // Yellow
  ]

  /* ---------- Actual progress history ---------- */
  const progressEntries = Object.entries(actualProgress)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10)

  // Check if we have any actual data points for the legend
  const hasActualData = chartData.some((r) => r.actual !== undefined)

  return (
    <div className="space-y-6">


      {/* Graph */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Progress Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  label={{ value: 'Gold Heads', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const row = chartData[label as number]
                    return (
                      <div className="rounded-lg border border-border bg-card p-3 shadow-md space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                          Day {label} {row?.date ? `(${row.date})` : ''}
                        </p>
                        {payload.map((entry: any) => (
                          <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-semibold tabular-nums">{entry.value}</span>
                          </p>
                        ))}
                        {row?.actual !== undefined && !payload.some((p: any) => p?.name === 'Actual') && (
                          <p className="text-xs text-emerald-500">
                            {'Actual: '}<span className="font-semibold tabular-nums">{row.actual}</span>
                          </p>
                        )}
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="vip" name="VIP" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="events" name="Events" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="wheel" name="Wheel" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="total" name="Expected Total" stroke="hsl(var(--primary))" dot={false} strokeWidth={2.5} />
                {hasActualData && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke="hsl(var(--chart-4, 142 71% 45%))"
                    dot={{ r: 3, fill: 'hsl(var(--chart-4, 142 71% 45%))' }}
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {totalHeadsNeeded > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{currentGoldHeads} starting</span>
                <span className="font-semibold text-foreground">{completionPct}% of goal</span>
                <span>{totalHeadsNeeded} needed</span>
              </div>
              <Progress value={completionPct} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commander Progress Chart */}
      {profile.commanders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Commander Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Each line shows a commander's completion percentage based on projected gold head allocation.
            </p>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commanderProgressData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    label={{ value: 'Completion %', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    domain={[0, 100]}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const row = commanderProgressData[label as number]
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-md space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            Day {label} {row?.date ? `(${row.date})` : ''}
                          </p>
                          {payload.map((entry: any) => (
                            <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
                              {entry.name}: <span className="font-semibold tabular-nums">{entry.value}%</span>
                            </p>
                          ))}
                        </div>
                      )
                    }}
                    contentStyle={{ backgroundColor: 'transparent', border: 'none' }}
                  />
                  <Legend />
                  {profile.commanders.map((cmd, idx) => {
                    const cmdLabel = cmd.name || `Commander ${cmd.id.substring(0, 8)}`
                    return (
                      <Line
                        key={cmd.id}
                        type="monotone"
                        dataKey={cmdLabel}
                        name={cmdLabel}
                        stroke={COMMANDER_COLORS[idx % COMMANDER_COLORS.length]}
                        dot={false}
                        strokeWidth={2.5}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
