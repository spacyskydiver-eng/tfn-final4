'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AccountProfile, MtgEventPlan, OccOutcome } from '@/lib/engine/types'
import { useCommanderPlanner } from '@/lib/engine/useCommanderPlanner'
import { CommanderGridSelector } from './CommanderGridSelector'
import { CommanderStatePanel } from './CommanderStatePanel'
import { CommanderStatsComparison } from './CommanderStatsComparison'
import {
  UpgradeCostBreakdown,
  calcEquipmentCosts,
  calcLevelCosts,
  calcSkillCosts,
} from './UpgradeCostBreakdown'
import { PlannerSummaryPanel } from './PlannerSummaryPanel'
import { useEvents } from '@/lib/event-context'
import { buildMtgRows, buildOccurrenceRows, buildWheelRows } from '@/lib/engine/eventEngine'
import { buildChartData } from '@/lib/engine/projectionEngine'
import { VIP_HEADS_PER_DAY } from '@/lib/kvk-engine'

type CommanderPlannerSectionProps = {
  profile: AccountProfile
  onUpdate: (p: AccountProfile) => void
  onNavigateToInvestments?: () => void
}

export function CommanderPlannerSection({ profile, onNavigateToInvestments }: CommanderPlannerSectionProps) {
  const { loaded, state, selectedEntry, selectCommander, updateSide } = useCommanderPlanner(
    profile.id,
    profile.commanders,
  )
  const { events } = useEvents()

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const goalDate = new Date(today.getTime() + profile.daysUntilGoal * 86400000)
  const goalDateStr = goalDate.toISOString().slice(0, 10)

  // Reuse the same storage keys as ProjectionSummary for outcomes/mtg/wheel data
  const OUTCOME_KEY = `gh_outcomes_${profile.id}`
  const MTG_KEY = `mtg_plans_${profile.id}`
  const WOF_SPINS_KEY = `wof_spins_${profile.id}`

  const [outcomes, mtgPlans, wofSpinsByOcc] = useMemo(() => {
    try {
      const o: Record<string, OccOutcome> = JSON.parse(localStorage.getItem(OUTCOME_KEY) || '{}')
      const m: Record<string, MtgEventPlan> = JSON.parse(localStorage.getItem(MTG_KEY) || '{}')
      const w: Record<string, number> = JSON.parse(localStorage.getItem(WOF_SPINS_KEY) || '{}')
      return [o, m, w]
    } catch {
      return [{}, {}, {}] as [Record<string, OccOutcome>, Record<string, MtgEventPlan>, Record<string, number>]
    }
  }, [OUTCOME_KEY, MTG_KEY, WOF_SPINS_KEY])

  const profileStartDate = profile.startDate
  const anchorDate = profileStartDate ? new Date(profileStartDate) : today

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

  const chartRows = useMemo(() => {
    const vipHeadsPerDay = VIP_HEADS_PER_DAY[profile.vipLevel] ?? 0

    // Map MTG + wheel rows into the shape buildChartData expects.
    const mtgEvents = mtgRows.map((r) => ({
      startDate: r.startDate,
      plan:
        mtgPlans[r.key] ??
        ({
          day1: { gemTier: 'skip', heads: 0, gems: 0 },
          day2: { gemTier: 'skip', heads: 0, gems: 0 },
          actualHeadsLogged: null,
        } as MtgEventPlan),
    }))

    const wheelOccs = wheelRows.map((w) => ({
      startDate: w.startDate,
      spins: wofSpinsByOcc[w.key] ?? 0,
    }))

    // Baseline heads mirrors ProjectionSummary: prefer latest actualProgress entry if present.
    const actualProgress = profile.actualProgress ?? {}
    const latestActualHeads = Object.entries(actualProgress)
      .sort(([a], [b]) => b.localeCompare(a))[0]?.[1]
    const baseHeads =
      latestActualHeads !== undefined ? Number(latestActualHeads) : Number(profile.currentGoldHeads ?? 0)
    const rows = buildChartData(
      profile.daysUntilGoal,
      vipHeadsPerDay,
      occRows,
      mtgEvents,
      wheelOccs,
      anchorDate,
      baseHeads,
      profile.actualProgress ?? {},
    )

    return rows.map((r) => ({ date: r.date, total: r.total }))
  }, [
    profile.daysUntilGoal,
    profile.vipLevel,
    profile.currentGoldHeads,
    profile.actualProgress,
    occRows,
    mtgRows,
    wheelRows,
    mtgPlans,
    wofSpinsByOcc,
    anchorDate,
  ])

  // Same baseline as ProjectionSummary / ProgressGraph: latest actualProgress entry or profile.currentGoldHeads
  const actualProgress = profile.actualProgress ?? {}
  const latestActualHeads = Object.entries(actualProgress)
    .sort(([a], [b]) => b.localeCompare(a))[0]?.[1]
  const commanderBaselineHeads =
    latestActualHeads !== undefined ? Number(latestActualHeads) : Number(profile.currentGoldHeads ?? 0)

  if (!loaded) {
    return null
  }

  return (
    <div className="space-y-6">
      <CommanderGridSelector
        commanders={profile.commanders}
        plannerEntries={state.entries}
        selectedCommanderId={state.selectedCommanderId}
        onSelect={(commanderId) => selectCommander(commanderId)}
        onNavigateToInvestments={onNavigateToInvestments}
      />

      {!selectedEntry ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-4">
            {profile.commanders.length === 0 ? (
              <>
                <p>Add commanders in the Investments tab first. The planner only works with commanders you are actively investing in.</p>
                {onNavigateToInvestments && (
                  <Button variant="default" className="gap-2" onClick={onNavigateToInvestments}>
                    Go to Investments tab
                  </Button>
                )}
              </>
            ) : (
              <p>Select a commander above to start planning their progression.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CommanderStatePanel
              mode="current"
              title="Current State"
              side={selectedEntry.current}
              onChange={(patch) => updateSide(selectedEntry.commanderId, 'current', patch)}
              commanderName={selectedEntry.commanderName}
            />
            <CommanderStatePanel
              mode="target"
              title="Target State"
              side={selectedEntry.target}
              onChange={(patch) => updateSide(selectedEntry.commanderId, 'target', patch)}
              commanderName={selectedEntry.commanderName}
            />
          </div>

          <CommanderStatsComparison current={selectedEntry.current} target={selectedEntry.target} />

          {(() => {
            const skillCosts = calcSkillCosts(
              selectedEntry.rarity,
              selectedEntry.current.skills,
              selectedEntry.target.skills,
            )
            const levelCosts = calcLevelCosts(
              selectedEntry.current.level,
              selectedEntry.target.level,
            )
            const equipmentCosts = calcEquipmentCosts(
              selectedEntry.current,
              selectedEntry.target,
            )

            return (
              <>
                <UpgradeCostBreakdown
                  rarity={selectedEntry.rarity}
                  current={selectedEntry.current}
                  target={selectedEntry.target}
                />

                {/* Summary using shared chart/projection engine for head timing */}
                <PlannerSummaryPanel
                  rarity={selectedEntry.rarity}
                  current={selectedEntry.current}
                  target={selectedEntry.target}
                  skillHeads={skillCosts}
                  levelXpRequired={levelCosts.xpRequired}
                  equipment={{
                    gold: equipmentCosts.totals.gold,
                    timeMinutes: equipmentCosts.totals.time,
                  }}
                  baselineHeads={commanderBaselineHeads}
                  chartRows={chartRows}
                />
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}

