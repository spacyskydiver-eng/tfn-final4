'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TrendingUp, Crown, Save } from 'lucide-react'
import { useEvents } from '@/lib/event-context'
import type { AccountProfile, OccOutcome, MtgEventPlan } from '@/lib/engine/types'
import {
  buildOccurrenceRows,
  buildMtgRows,
  buildWheelRows,
  createDefaultMtgPlan,
  getMtgPlannedHeads,
} from '@/lib/engine/eventEngine'
import { calcCommanderNeeds, calcTotalHeadsNeeded } from '@/lib/engine/commanderEngine'
import { calcVipHeads, calcTotalProjectedHeads } from '@/lib/engine/incomeEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

export function ProjectionSummary({
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

  /* ---------- Load persisted state ---------- */
  const OUTCOME_KEY = `gh_outcomes_${profile.id}`
  const MTG_KEY = `mtg_plans_${profile.id}`
  const WOF_SPINS_KEY = `wof_spins_${profile.id}`

  const [outcomes, setOutcomes] = useState<Record<string, OccOutcome>>({})
  const [mtgPlans, setMtgPlans] = useState<Record<string, MtgEventPlan>>({})
  const [wofSpinsByOcc, setWofSpinsByOcc] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      setOutcomes(JSON.parse(localStorage.getItem(OUTCOME_KEY) || '{}'))
    } catch {
      setOutcomes({})
    }
    try {
      setMtgPlans(JSON.parse(localStorage.getItem(MTG_KEY) || '{}'))
    } catch {
      setMtgPlans({})
    }
    try {
      setWofSpinsByOcc(JSON.parse(localStorage.getItem(WOF_SPINS_KEY) || '{}'))
    } catch {
      setWofSpinsByOcc({})
    }
  }, [OUTCOME_KEY, MTG_KEY, WOF_SPINS_KEY])

  /* ---------- Actual progress (from profile) ---------- */
  const actualProgress = profile.actualProgress ?? {}

  const [actualInput, setActualInput] = useState<string>('')

  useEffect(() => {
    setActualInput(
      actualProgress[todayStr] !== undefined ? String(actualProgress[todayStr]) : '',
    )
  }, [todayStr, profile.id]) // keep same as your graph version

  const saveActualProgress = () => {
    const val = Number(actualInput)
    if (isNaN(val) || val < 0) return
    onUpdate({
      ...profile,
      actualProgress: {
        ...actualProgress,
        [todayStr]: val,
      },
    })
  }

  const progressEntries = Object.entries(actualProgress)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10)

  // newest logged total GH (if any)
  const latestActualHeads = Object.entries(actualProgress)
    .sort(([a], [b]) => b.localeCompare(a))[0]?.[1]

  const currentGoldHeads = Number(profile.currentGoldHeads ?? 0)
  const effectiveCurrentHeads =
    latestActualHeads !== undefined ? Number(latestActualHeads) : currentGoldHeads

  /* ---------- Calculations ---------- */
  const profileStartDate = profile.startDate

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

  const eventHeads = occRows.reduce((s, r) => s + r.headsCounted, 0)

  const mtgHeads = mtgRows.reduce(
    (s, r) => s + getMtgPlannedHeads(mtgPlans[r.key] ?? createDefaultMtgPlan()),
    0,
  )

  const totalWheelSpins = wheelRows.reduce((sum, w) => sum + (wofSpinsByOcc[w.key] ?? 0), 0)

  const wofHeads = useMemo(() => {
    if (totalWheelSpins <= 0) return 0
    return Math.floor(calcWofPlan({ targetSpins: totalWheelSpins, useBundles: {} }).expectedHeads)
  }, [totalWheelSpins])

  const vipHeads = calcVipHeads(profile.vipLevel, profile.daysUntilGoal)
  const projectedHeads = calcTotalProjectedHeads(vipHeads, eventHeads, mtgHeads, wofHeads)

  const totalHeadsExpected = effectiveCurrentHeads + projectedHeads
  const totalHeadsNeeded = calcTotalHeadsNeeded(profile.commanders)

  const headsMissing = Math.max(0, totalHeadsNeeded - totalHeadsExpected)
  const headProgressPct =
    totalHeadsNeeded > 0
      ? Math.min(100, Math.round((totalHeadsExpected / totalHeadsNeeded) * 100))
      : 0

  /* ---------- Wheel heads per commander (direct assignment) ---------- */
  const wofAssignments = profile.wofCommanderAssignments ?? {}

  const wheelHeadsByCommander = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of wheelRows) {
      const spins = wofSpinsByOcc[w.key] ?? 0
      const cmdId = wofAssignments[w.key]
      if (spins > 0 && cmdId) {
        const heads = Math.floor(calcWofPlan({ targetSpins: spins, useBundles: {} }).expectedHeads)
        map[cmdId] = (map[cmdId] ?? 0) + heads
      }
    }
    return map
  }, [wheelRows, wofSpinsByOcc, wofAssignments])

  const totalDirectWheelHeads = Object.values(wheelHeadsByCommander).reduce((s, h) => s + h, 0)
  const universalHeads = totalHeadsExpected - totalDirectWheelHeads

  const commanderBreakdown = profile.commanders.map((cmd) => {
    const needs = calcCommanderNeeds(cmd)
    const allocatedFromUniversal = Math.floor(universalHeads * (cmd.allocationPct / 100))
    const directWheelHeads = wheelHeadsByCommander[cmd.id] ?? 0
    const totalAllocated = allocatedFromUniversal + directWheelHeads
    const remaining = Math.max(0, needs.needed - totalAllocated)
    const pct =
      needs.needed > 0 ? Math.min(100, Math.round((totalAllocated / needs.needed) * 100)) : 100
    return { cmd, allocated: totalAllocated, needed: needs.needed, remaining, pct, directWheelHeads }
  })

  return (
    <div className="space-y-6">
      {/* Actual Progress Input (moved here from Graph) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-primary" />
            Log Actual Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter your total gold heads right now. This becomes your “Starting” value in the overview and feeds the
            graph’s Actual line.
          </p>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Total Gold Heads (today: {todayStr})</Label>
              <Input
                type="number"
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
                placeholder="e.g. 150"
                min={0}
              />
            </div>
            <Button onClick={saveActualProgress} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>

          {progressEntries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Recent entries</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {progressEntries.map(([date, heads]) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-2.5 py-1.5 text-xs gap-2"
                  >
                    <span className="text-muted-foreground">{date}</span>

                    <Input
                      type="number"
                      className="h-7 w-24"
                      value={heads}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (isNaN(v) || v < 0) return
                        onUpdate({
                          ...profile,
                          actualProgress: {
                            ...actualProgress,
                            [date]: v,
                          },
                        })
                      }}
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const copy = { ...actualProgress }
                        delete copy[date]
                        onUpdate({ ...profile, actualProgress: copy })
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Overall Gold Head Projection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Starting</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{effectiveCurrentHeads}</p>
              </div>
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
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      headsMissing > 0 ? 'text-destructive' : 'text-primary'
                    }`}
                  >
                    {headsMissing > 0 ? headsMissing : 'None'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {headsMissing <= 0 && totalHeadsNeeded > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="text-sm font-medium text-primary">
                Your gold head sources cover all commander goals!
              </p>
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
              <div
                key={b.cmd.id}
                className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {b.cmd.name || 'Unnamed'}{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({b.cmd.currentSkills.join('-')} to {b.cmd.targetSkills.join('-')})
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {b.cmd.allocationPct}% allocation
                  </span>
                </div>

                <Progress value={b.pct} className="h-2" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {b.allocated} / {b.needed} heads allocated
                    {b.directWheelHeads > 0 && (
                      <span className="text-primary ml-1">(incl. {b.directWheelHeads} wheel)</span>
                    )}
                    {b.remaining > 0 && (
                      <span className="text-destructive ml-1">({b.remaining} short)</span>
                    )}
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
