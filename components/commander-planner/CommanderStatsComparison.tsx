'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlannerCommanderSide } from '@/lib/engine/useCommanderPlanner'
import { computeCommanderStats } from '@/lib/engine/commanderStatsEngine'

type CommanderStatsComparisonProps = {
  current: PlannerCommanderSide
  target: PlannerCommanderSide
}

export function CommanderStatsComparison({ current, target }: CommanderStatsComparisonProps) {
  const currentStats = useMemo(() => computeCommanderStats(current), [current])
  const targetStats = useMemo(() => computeCommanderStats(target), [target])

  const allLabels = useMemo(() => {
    const set = new Set<string>()
    currentStats.bonuses.forEach((b) => set.add(b.label))
    targetStats.bonuses.forEach((b) => set.add(b.label))
    return Array.from(set).sort()
  }, [currentStats.bonuses, targetStats.bonuses])

  const getValue = (bonuses: { label: string; value: number }[], label: string): number =>
    bonuses.find((b) => b.label === label)?.value ?? 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Commander Stats Comparison</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Combat impact from equipment (and formation). Base stats and skill bonuses will be added when data is available.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Current
            </p>
            {currentStats.bonuses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No equipment stats yet.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {currentStats.bonuses.map((b) => (
                  <li key={b.label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-medium text-green-400">+{b.value}%</span>
                  </li>
                ))}
              </ul>
            )}
            {currentStats.formationBonus && (
              <p className="text-[11px] text-muted-foreground mt-2">{currentStats.formationBonus}</p>
            )}
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Target
            </p>
            {targetStats.bonuses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No equipment stats yet.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {targetStats.bonuses.map((b) => (
                  <li key={b.label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-medium text-green-400">+{b.value}%</span>
                  </li>
                ))}
              </ul>
            )}
            {targetStats.formationBonus && (
              <p className="text-[11px] text-muted-foreground mt-2">{targetStats.formationBonus}</p>
            )}
          </div>
        </div>
        {allLabels.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Stat</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Current</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Target</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Delta</th>
                </tr>
              </thead>
              <tbody>
                {allLabels.map((label) => {
                  const cur = getValue(currentStats.bonuses, label)
                  const tgt = getValue(targetStats.bonuses, label)
                  const delta = tgt - cur
                  return (
                    <tr key={label} className="border-b border-border/50">
                      <td className="py-1.5 text-muted-foreground">{label}</td>
                      <td className="py-1.5 text-center font-medium">{cur > 0 ? `+${cur}%` : '—'}</td>
                      <td className="py-1.5 text-center font-medium text-primary">{tgt > 0 ? `+${tgt}%` : '—'}</td>
                      <td className={`py-1.5 text-center font-medium ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
