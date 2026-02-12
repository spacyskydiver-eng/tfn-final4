'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Crown } from 'lucide-react'
import { useEvents } from '@/lib/event-context'
import type { AccountProfile, OccOutcome, MtgEventPlan } from '@/lib/engine/types'
import { buildOccurrenceRows, buildMtgRows, buildWheelRows, createDefaultMtgPlan, getMtgPlannedHeads } from '@/lib/engine/eventEngine'
import { calcCommanderNeeds, distributeHeadsByAllocation, calcTotalHeadsNeeded } from '@/lib/engine/commanderEngine'
import { calcVipHeads, VIP_HEADS_PER_DAY } from '@/lib/engine/incomeEngine'
import { calcTotalProjectedHeads } from '@/lib/engine/incomeEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

export function ProjectionSummary({ profile }: { profile: AccountProfile }) {
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

  /* ---------- Calculations ---------- */
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

  const vipHeads = calcVipHeads(profile.vipLevel, profile.daysUntilGoal)
  const totalHeadsExpected = calcTotalProjectedHeads(vipHeads, eventHeads, mtgHeads, wofHeads)
  const totalHeadsNeeded = calcTotalHeadsNeeded(profile.commanders)
  const headsMissing = Math.max(0, totalHeadsNeeded - totalHeadsExpected)
  const headProgressPct = totalHeadsNeeded > 0
    ? Math.min(100, Math.round((totalHeadsExpected / totalHeadsNeeded) * 100))
    : 0

  const commanderBreakdown = distributeHeadsByAllocation(totalHeadsExpected, profile.commanders)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Overall Gold Head Projection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">VIP Income</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{vipHeads}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Events</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{eventHeads}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MTG</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{mtgHeads}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wheel</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{wofHeads}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Expected</p>
                <p className="text-sm font-bold text-primary tabular-nums">{totalHeadsExpected}</p>
              </div>
            </div>
          </div>

          {totalHeadsNeeded > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Gold Head Coverage</span>
                <span className="text-sm font-bold text-primary tabular-nums">{headProgressPct}%</span>
              </div>
              <Progress value={headProgressPct} className="h-3" />
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Needed</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{totalHeadsNeeded}</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected</p>
                  <p className="text-sm font-bold text-primary tabular-nums">{totalHeadsExpected}</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Deficit</p>
                  <p className={`text-sm font-bold tabular-nums ${headsMissing > 0 ? 'text-destructive' : 'text-primary'}`}>
                    {headsMissing > 0 ? headsMissing : 'None'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {headsMissing <= 0 && totalHeadsNeeded > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="text-sm font-medium text-primary">Your gold head sources cover all commander goals!</p>
            </div>
          )}

          {headsMissing > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-destructive">
                You need {headsMissing} more gold heads. Add more event completions, win Ark, or plan more wheel spins.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-commander breakdown */}
      {commanderBreakdown.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-primary" />
              Commander Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commanderBreakdown.map((b) => (
              <div key={b.cmd.id} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {b.cmd.name || 'Unnamed'}{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({b.cmd.currentSkills.join('-')} to {b.cmd.targetSkills.join('-')})
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{b.cmd.allocationPct}% allocation</span>
                </div>
                <Progress value={b.pct} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {b.allocated} / {b.needed} heads allocated
                    {b.remaining > 0 && <span className="text-destructive ml-1">({b.remaining} short)</span>}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Add commanders in the Commanders tab to see gold head allocation and completion estimates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
