'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { PlannerCommanderSide } from '@/lib/engine/useCommanderPlanner'
import type { UpgradeCostBreakdownProps } from './UpgradeCostBreakdown'

export type PlannerSummaryInputs = {
  rarity: UpgradeCostBreakdownProps['rarity']
  current: PlannerCommanderSide
  target: PlannerCommanderSide
  skillHeads: { invested: number; needed: number; total: number }
  levelXpRequired: number
  equipment: {
    gold: number
    timeMinutes: number
  }
  /** Baseline total heads today (starting + projected so far). */
  baselineHeads: number
  /** Daily rows from buildChartData with .total heads. */
  chartRows: { date: string; total: number }[] | null
}

export function PlannerSummaryPanel({
  rarity,
  current,
  target,
  skillHeads,
  levelXpRequired,
  equipment,
  baselineHeads,
  chartRows,
}: PlannerSummaryInputs) {
  const { headCompletionDate, reachesTargetWithinGoal, headCompletionDays } = useMemo(() => {
    if (!chartRows || chartRows.length === 0) {
      return { headCompletionDate: null as string | null, reachesTargetWithinGoal: false, headCompletionDays: null as number | null }
    }

    const requiredTotal = baselineHeads + skillHeads.needed
    const found = chartRows.find((r) => r.total >= requiredTotal)
    if (!found) {
      return { headCompletionDate: null, reachesTargetWithinGoal: false, headCompletionDays: null }
    }

    const dayIndex = chartRows.indexOf(found)
    return { headCompletionDate: found.date, reachesTargetWithinGoal: true, headCompletionDays: dayIndex }
  }, [chartRows, baselineHeads, skillHeads.needed])

  const currentHeadsOwned = baselineHeads
  const remainingHeadsNeeded = skillHeads.needed
  const targetHeadsThreshold = baselineHeads + skillHeads.needed

  const overallPct = useMemo(() => {
    const skillPathPct = skillHeads.total > 0 ? skillHeads.invested / skillHeads.total : 0
    const levelPct = target.level > current.level ? current.level / target.level : 1
    const equipPct = equipment.timeMinutes > 0 ? 0 : 1
    return Math.round(((skillPathPct + levelPct + equipPct) / 3) * 100)
  }, [skillHeads, current.level, target.level, equipment.timeMinutes])

  const craftDays = Math.floor(equipment.timeMinutes / 1440)
  const craftHours = Math.floor((equipment.timeMinutes % 1440) / 60)

  const overallReadyDate = useMemo(() => {
    const now = new Date()
    const craftMs = equipment.timeMinutes * 60 * 1000
    const craftDate = craftMs > 0 ? new Date(now.getTime() + craftMs) : null

    if (!headCompletionDate && !craftDate) return null
    if (!headCompletionDate) return craftDate
    if (!craftDate) return new Date(headCompletionDate)

    const headDateObj = new Date(headCompletionDate)
    return headDateObj.getTime() >= craftDate.getTime() ? headDateObj : craftDate
  }, [headCompletionDate, equipment.timeMinutes])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Overall Progress Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-foreground">Commander Completion</span>
            <span className="font-semibold tabular-nums text-primary">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2.5" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryStat label="Rarity" value={rarity === 'legendary' ? 'Legendary' : 'Epic'} />
          <SummaryStat label="Remaining Heads Needed" value={remainingHeadsNeeded.toLocaleString()} />
          <SummaryStat label="XP Required" value={levelXpRequired.toLocaleString()} />
          <SummaryStat label="Gold for Equipment" value={equipment.gold.toLocaleString()} />
        </div>

        {/* Head timeline — explicit so baseline is not confusing */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Head timeline
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Current heads (today): </span>
                <span className="font-semibold tabular-nums">{currentHeadsOwned.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining heads needed: </span>
                <span className="font-semibold tabular-nums text-primary">{remainingHeadsNeeded.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target threshold: </span>
                <span className="font-semibold tabular-nums">{targetHeadsThreshold.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              When your projected total heads reach the target threshold, you can finish this commander’s skill upgrades.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Head Time to Completion
              </p>
              {headCompletionDate && reachesTargetWithinGoal ? (
                <>
                  <p className="text-xs">
                    You have <span className="font-semibold">{currentHeadsOwned.toLocaleString()}</span> heads and need{' '}
                    <span className="font-semibold">{remainingHeadsNeeded.toLocaleString()}</span> more. At your current event + VIP plan,
                    you’ll reach <span className="font-semibold">{targetHeadsThreshold.toLocaleString()}</span> around{' '}
                    <span className="font-semibold text-primary">{headCompletionDate}</span>.
                  </p>
                  {headCompletionDays != null && (
                    <p className="text-[11px] text-muted-foreground">
                      (~{headCompletionDays} days from your tracking start date)
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-destructive">
                  The required heads are not reached within your current goal window. Extend your days-until-goal or add more
                  events, MTG, or wheel spins.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground italic mt-1">
                Assumes incoming heads can be allocated to this commander when needed.
              </p>
              {/* TODO: Add toggle "Estimate using allocation %" for multi-commander schedule */}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Equipment Crafting Time
              </p>
              {equipment.timeMinutes > 0 ? (
                <p className="text-xs">
                  Crafting all planned equipment for this commander will take approximately{' '}
                  <span className="font-semibold tabular-nums">
                    {craftDays}d {craftHours}h
                  </span>
                  .
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No additional equipment crafting is required.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {overallReadyDate && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Estimated Commander Ready Date
              </p>
              <p className="text-xs">
                Taking both head income and equipment crafting into account, this commander should be
                fully ready around{' '}
                <span className="font-semibold text-primary">
                  {overallReadyDate.toISOString().slice(0, 10)}
                </span>
                .
              </p>
              {!reachesTargetWithinGoal && headCompletionDate === null && (
                <p className="text-[11px] text-destructive">
                  Heads are not projected to reach the required total within your current goal window, so this
                  date is limited by equipment crafting only.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  )
}

