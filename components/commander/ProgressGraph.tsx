'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useEvents } from '@/lib/event-context'
import type { AccountProfile, OccOutcome, MtgEventPlan } from '@/lib/engine/types'
import { buildOccurrenceRows, buildMtgRows, buildWheelRows, createDefaultMtgPlan, getMtgPlannedHeads } from '@/lib/engine/eventEngine'
import { buildChartData } from '@/lib/engine/projectionEngine'
import { calcTotalHeadsNeeded } from '@/lib/engine/commanderEngine'
import { calcVipHeads, VIP_HEADS_PER_DAY } from '@/lib/engine/incomeEngine'
import { calcTotalProjectedHeads } from '@/lib/engine/incomeEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

export function ProgressGraph({ profile }: { profile: AccountProfile }) {
  const { events } = useEvents()

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const goalDate = new Date(today.getTime() + profile.daysUntilGoal * 86400000)
  const goalDateStr = goalDate.toISOString().slice(0, 10)

  /* ---------- Load persisted state ---------- */
  const OUTCOME_KEY = `gh_outcomes_${profile.id}`
  const MTG_KEY = `mtg_plans_${profile.id}`
  const WOF_SPINS_KEY = `wof_spins_${profile.id}`

  const [outcomes, setOutcomes] = useState<Record<string, OccOutcome>>({})
  const [mtgPlans, setMtgPlans] = useState<Record<string, MtgEventPlan>>({})
  const [wofSpinsByOcc, setWofSpinsByOcc] = useState<Record<string, number>>({})

  useEffect(() => {
    try { setOutcomes(JSON.parse(localStorage.getItem(OUTCOME_KEY) || '{}')) } catch { setOutcomes({}) }
    try { setMtgPlans(JSON.parse(localStorage.getItem(MTG_KEY) || '{}')) } catch { setMtgPlans({}) }
    try { setWofSpinsByOcc(JSON.parse(localStorage.getItem(WOF_SPINS_KEY) || '{}')) } catch { setWofSpinsByOcc({}) }
  }, [OUTCOME_KEY, MTG_KEY, WOF_SPINS_KEY])

  /* ---------- Build chart data ---------- */
  const occRows = useMemo(
    () => buildOccurrenceRows(events, todayStr, goalDateStr, outcomes),
    [events, todayStr, goalDateStr, outcomes],
  )
  const mtgRows = useMemo(
    () => buildMtgRows(events, todayStr, goalDateStr),
    [events, todayStr, goalDateStr],
  )
  const wheelRows = useMemo(
    () => buildWheelRows(events, todayStr, goalDateStr),
    [events, todayStr, goalDateStr],
  )

  const vipPerDay = VIP_HEADS_PER_DAY[profile.vipLevel] ?? 0

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
      today,
    )
  }, [profile.daysUntilGoal, vipPerDay, occRows, mtgRows, mtgPlans, wheelRows, wofSpinsByOcc, today])

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

  const totalHeadsExpected = calcTotalProjectedHeads(vipHeads, eventHeads, mtgHeads, wofHeads)
  const totalHeadsNeeded = calcTotalHeadsNeeded(profile.commanders)
  const completionPct = totalHeadsNeeded > 0
    ? Math.min(100, Math.round((totalHeadsExpected / totalHeadsNeeded) * 100))
    : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Progress Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[280px] w-full">
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
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="vip" name="VIP" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="events" name="Events" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="wheel" name="Wheel" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" dot={false} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {totalHeadsNeeded > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0 heads</span>
              <span className="font-semibold text-foreground">{completionPct}% of goal</span>
              <span>{totalHeadsNeeded} needed</span>
            </div>
            <Progress value={completionPct} className="h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
