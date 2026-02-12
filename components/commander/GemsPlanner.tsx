'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gem } from 'lucide-react'
import { useEvents } from '@/lib/event-context'
import type { AccountProfile, MtgEventPlan } from '@/lib/engine/types'
import { buildMtgRows, buildWheelRows, createDefaultMtgPlan, getMtgPlannedGems } from '@/lib/engine/eventEngine'
import { calcGemsPlan } from '@/lib/engine/projectionEngine'
import { calcWofPlan } from '@/lib/kvk-engine'

export function GemsPlanner({
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

  /* ---------- Load MTG plans ---------- */
  const MTG_KEY = `mtg_plans_${profile.id}`
  const [mtgPlans, setMtgPlans] = useState<Record<string, MtgEventPlan>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MTG_KEY)
      setMtgPlans(raw ? JSON.parse(raw) : {})
    } catch {
      setMtgPlans({})
    }
  }, [MTG_KEY])

  /* ---------- Load wheel spins ---------- */
  const WOF_SPINS_KEY = `wof_spins_${profile.id}`
  const [wofSpinsByOcc, setWofSpinsByOcc] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WOF_SPINS_KEY)
      setWofSpinsByOcc(raw ? JSON.parse(raw) : {})
    } catch {
      setWofSpinsByOcc({})
    }
  }, [WOF_SPINS_KEY])

  /* ---------- Calculations ---------- */
  const mtgRows = useMemo(
    () => buildMtgRows(events, todayStr, goalDateStr),
    [events, todayStr, goalDateStr],
  )
  const wheelRows = useMemo(
    () => buildWheelRows(events, todayStr, goalDateStr),
    [events, todayStr, goalDateStr],
  )

  const mtgGemSpend = mtgRows.reduce(
    (s, r) => s + getMtgPlannedGems(mtgPlans[r.key] ?? createDefaultMtgPlan()),
    0,
  )

  const totalWheelSpins = wheelRows.reduce(
    (sum, w) => sum + (wofSpinsByOcc[w.key] ?? 0),
    0,
  )
  const wheelGemSpend = useMemo(() => {
    if (totalWheelSpins <= 0) return 0
    return calcWofPlan({ targetSpins: totalWheelSpins, useBundles: profile.wofBundles }).totalGemCost
  }, [totalWheelSpins, profile.wofBundles])

  const gemsPlan = calcGemsPlan(
    profile.currentGems,
    profile.dailyGemIncome,
    profile.daysUntilGoal,
    mtgGemSpend,
    wheelGemSpend,
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gem className="h-4 w-4 text-primary" />
          Gems Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Current Gems</Label>
            <Input
              type="number"
              value={profile.currentGems || ''}
              onChange={(e) => onUpdate({ ...profile, currentGems: Number(e.target.value) || 0 })}
              placeholder="e.g. 50000"
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Daily Gem Income</Label>
            <Input
              type="number"
              value={profile.dailyGemIncome || ''}
              onChange={(e) => onUpdate({ ...profile, dailyGemIncome: Number(e.target.value) || 0 })}
              placeholder="e.g. 1000"
              min={0}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Current Gems</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium">
                  {profile.currentGems.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">
                  Daily Income x {profile.daysUntilGoal} days
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium">
                  +{(profile.dailyGemIncome * profile.daysUntilGoal).toLocaleString()}
                </td>
              </tr>
              <tr className="bg-secondary/30">
                <td className="px-3 py-2 text-foreground font-semibold">Total Gem Income</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground font-bold">
                  {gemsPlan.totalGemIncome.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">MTG Planned Spend</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  -{mtgGemSpend.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Wheel Planned Spend</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  -{wheelGemSpend.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-secondary/30">
                <td className="px-3 py-2 text-foreground font-semibold">Total Planned Spend</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground font-bold">
                  {gemsPlan.totalPlannedSpend.toLocaleString()}
                </td>
              </tr>
              <tr className={gemsPlan.gemBalance >= 0 ? 'bg-primary/5' : 'bg-destructive/5'}>
                <td className="px-3 py-2 text-foreground font-semibold">
                  {gemsPlan.gemBalance >= 0 ? 'Gem Surplus' : 'Gems Needed'}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                  gemsPlan.gemBalance >= 0 ? 'text-primary' : 'text-destructive'
                }`}>
                  {gemsPlan.gemBalance >= 0
                    ? `+${gemsPlan.gemBalance.toLocaleString()}`
                    : `-${gemsPlan.gemsNeeded.toLocaleString()}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {gemsPlan.gemsNeeded > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">
              You need {gemsPlan.gemsNeeded.toLocaleString()} more gems. Consider reducing MTG spending or Wheel spins.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
