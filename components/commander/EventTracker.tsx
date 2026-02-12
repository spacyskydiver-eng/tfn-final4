'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dices, Package } from 'lucide-react'
import { useEvents } from '@/lib/event-context'
import type { AccountProfile, OccOutcome, MtgEventPlan } from '@/lib/engine/types'
import {
  buildOccurrenceRows,
  buildMtgRows,
  buildWheelRows,
  createDefaultMtgPlan,
  setMtgDayTier,
  getMtgPlannedHeads,
  getMtgPlannedGems,
  MTG_TIERS,
} from '@/lib/engine/eventEngine'
import { VIP_HEADS_PER_DAY, calcWofPlan } from '@/lib/kvk-engine'

export function EventTracker({
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

  /* ---------- Event Outcome State ---------- */
  const OUTCOME_KEY = `gh_outcomes_${profile.id}`
  const [outcomes, setOutcomes] = useState<Record<string, OccOutcome>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OUTCOME_KEY)
      setOutcomes(raw ? JSON.parse(raw) : {})
    } catch {
      setOutcomes({})
    }
  }, [OUTCOME_KEY])

  useEffect(() => {
    try { localStorage.setItem(OUTCOME_KEY, JSON.stringify(outcomes)) } catch {}
  }, [OUTCOME_KEY, outcomes])

  const setOutcome = (occId: string, v: OccOutcome) => {
    setOutcomes((prev) => ({ ...prev, [occId]: v }))
  }

  /* ---------- MTG Plans State ---------- */
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

  useEffect(() => {
    try { localStorage.setItem(MTG_KEY, JSON.stringify(mtgPlans)) } catch {}
  }, [MTG_KEY, mtgPlans])

  const getMtgPlan = useCallback(
    (key: string): MtgEventPlan => mtgPlans[key] ?? createDefaultMtgPlan(),
    [mtgPlans],
  )

  const updateMtgDay = (key: string, day: 'day1' | 'day2', tier: 'skip' | '7k' | '14k') => {
    setMtgPlans((prev) => ({
      ...prev,
      [key]: setMtgDayTier(prev[key] ?? createDefaultMtgPlan(), day, tier),
    }))
  }

  const logMtgActual = (key: string, heads: number | null) => {
    setMtgPlans((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? createDefaultMtgPlan()), actualHeadsLogged: heads },
    }))
  }

  /* ---------- Wheel Spins State ---------- */
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

  useEffect(() => {
    try { localStorage.setItem(WOF_SPINS_KEY, JSON.stringify(wofSpinsByOcc)) } catch {}
  }, [WOF_SPINS_KEY, wofSpinsByOcc])

  const setWheelSpins = (key: string, spins: number) => {
    setWofSpinsByOcc((prev) => ({ ...prev, [key]: Math.max(0, Math.floor(spins || 0)) }))
  }

  /* ---------- Computed Rows ---------- */
  const occRows = useMemo(
    () => buildOccurrenceRows(events, todayStr, goalDateStr, outcomes),
    [events, todayStr, goalDateStr, outcomes],
  )
  const activeEvents = occRows.filter((r) => r.status === 'active')
  const upcomingEvents = occRows.filter((r) => r.status === 'upcoming')

  const mtgRows = useMemo(
    () => buildMtgRows(events, todayStr, goalDateStr),
    [events, todayStr, goalDateStr],
  )

  const wheelRows = useMemo(
    () => buildWheelRows(events, todayStr, goalDateStr),
    [events, todayStr, goalDateStr],
  )

  /* ---------- Totals ---------- */
  const eventHeads = occRows.reduce((s, r) => s + r.headsCounted, 0)
  const mtgHeads = mtgRows.reduce((s, r) => getMtgPlannedHeads(getMtgPlan(r.key)), 0)
  const mtgGems = mtgRows.reduce((s, r) => getMtgPlannedGems(getMtgPlan(r.key)), 0)

  const totalWheelSpins = wheelRows.reduce((sum, w) => sum + (wofSpinsByOcc[w.key] ?? 0), 0)
  const wheelExpectedHeads = useMemo(() => {
    if (totalWheelSpins <= 0) return 0
    return Math.floor(calcWofPlan({ targetSpins: totalWheelSpins, useBundles: {} }).expectedHeads)
  }, [totalWheelSpins])
  const wheelGemCost = useMemo(() => {
    if (totalWheelSpins <= 0) return 0
    return calcWofPlan({ targetSpins: totalWheelSpins, useBundles: profile.wofBundles }).totalGemCost
  }, [totalWheelSpins, profile.wofBundles])

  const vipPerDay = VIP_HEADS_PER_DAY[profile.vipLevel] ?? 0
  const vipTotal = vipPerDay * profile.daysUntilGoal

  return (
    <div className="space-y-6">
      {/* Active GH Events */}
      {activeEvents.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-semibold text-primary">Active Gold Head Events (log results)</p>
            {activeEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">
                  {ev.title}{' '}
                  <span className="text-xs text-muted-foreground">
                    ({ev.startDate} → {ev.endDate})
                  </span>
                </div>
                <Select value={ev.loggedOutcome ?? ''} onValueChange={(val) => setOutcome(ev.id, val as OccOutcome)}>
                  <SelectTrigger className="w-[170px] h-8">
                    <SelectValue placeholder="Log..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    {ev.category === 'Ark of Osiris' ? (
                      <>
                        <SelectItem value="win">Win (10)</SelectItem>
                        <SelectItem value="loss">Loss (5)</SelectItem>
                        <SelectItem value="skip">Skip (0)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="skip">Skip</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              While an event is active, it counts as <span className="font-semibold">0</span> until logged.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming GH Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Gold Head Events (until goal)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingEvents.map((ev) => {
              const start = new Date(ev.startDate)
              const diff = Math.ceil((start.getTime() - today.getTime()) / 86400000)
              return (
                <p key={ev.id} className="text-sm text-muted-foreground">
                  {ev.title} — in {diff} day{diff !== 1 ? 's' : ''} (+{ev.defaultHeads} assumed)
                </p>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* MTG Per-Day Tracker */}
      {mtgRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              More Than Gems Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Each MTG event lasts 2 days. Select your gem spending per day. Default: 14k/day.
            </p>
            {mtgRows.map((m) => {
              const plan = getMtgPlan(m.key)
              const heads = getMtgPlannedHeads(plan)
              const gems = getMtgPlannedGems(plan)
              const diff = Math.ceil((new Date(m.startDate).getTime() - today.getTime()) / 86400000)
              const isPast = m.status === 'past'
              const isActive = m.status === 'active'

              return (
                <div
                  key={m.key}
                  className={`rounded-lg border p-4 space-y-3 ${
                    isActive
                      ? 'border-primary/40 bg-primary/5'
                      : isPast
                      ? 'border-border bg-secondary/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.startDate} → {m.endDate}
                        {m.status === 'upcoming' && ` (in ${diff} day${diff !== 1 ? 's' : ''})`}
                        {isActive && ' (Active now)'}
                        {isPast && ' (Past)'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary tabular-nums">{heads} heads</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{gems.toLocaleString()} gems</p>
                    </div>
                  </div>

                  {plan.actualHeadsLogged === null ? (
                    <div className="grid grid-cols-2 gap-3">
                      {(['day1', 'day2'] as const).map((day, i) => {
                        const dayPlan = plan[day]
                        return (
                          <div key={day} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Day {i + 1}</Label>
                            <Select
                              value={dayPlan.gemTier}
                              onValueChange={(v) => updateMtgDay(m.key, day, v as 'skip' | '7k' | '14k')}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">Skip (0 heads, 0 gems)</SelectItem>
                                <SelectItem value="7k">7k gems (5 heads)</SelectItem>
                                <SelectItem value="14k">14k gems (13 heads)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-secondary/30 p-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Actual heads logged: <span className="font-semibold text-foreground">{plan.actualHeadsLogged}</span>
                      </p>
                    </div>
                  )}

                  {(isPast || isActive) && plan.actualHeadsLogged === null && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">Log actual heads:</Label>
                      <Input
                        type="number"
                        className="w-24 h-8"
                        min={0}
                        placeholder="0"
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (v > 0) logMtgActual(m.key, v)
                        }}
                      />
                    </div>
                  )}

                  {plan.actualHeadsLogged !== null && (
                    <button
                      onClick={() => logMtgActual(m.key, null)}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Clear logged result
                    </button>
                  )}
                </div>
              )
            })}

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MTG Total Heads</p>
                <p className="text-sm font-bold text-primary tabular-nums">{mtgHeads}</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MTG Total Gems</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{mtgGems.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wheel Tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dices className="h-4 w-4 text-primary" />
            Wheel of Fortune Tracker (until goal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wheels Left</p>
              <p className="text-sm font-bold tabular-nums">
                {wheelRows.filter((w) => w.status !== 'past').length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Spins</p>
              <p className="text-sm font-bold tabular-nums">{totalWheelSpins}</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected Heads</p>
              <p className="text-sm font-bold text-primary tabular-nums">{wheelExpectedHeads}</p>
            </div>
          </div>

          {wheelRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Wheel of Fortune events found in your calendar before the goal date.
            </p>
          ) : (
            <div className="space-y-2">
              {wheelRows.map((w) => {
                const start = new Date(w.startDate)
                const diff = Math.ceil((start.getTime() - today.getTime()) / 86400000)
                return (
                  <div key={w.key} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <div className="text-sm">
                      <div className="text-foreground font-medium">
                        {w.title || 'Wheel of Fortune'}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({w.startDate} → {w.endDate})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {w.status === 'past'
                          ? 'Past'
                          : w.status === 'active'
                          ? 'Active now'
                          : `In ${diff} day${diff !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Spins</Label>
                      <Input
                        type="number"
                        className="w-[110px] h-8"
                        min={0}
                        value={wofSpinsByOcc[w.key] ?? 0}
                        onChange={(e) => setWheelSpins(w.key, Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIP Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            VIP Gold Head Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Per Day</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{vipPerDay}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Per Week</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{vipPerDay * 7}</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Until Goal ({profile.daysUntilGoal}d)
              </p>
              <p className="text-sm font-bold text-primary tabular-nums">{vipTotal}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Gold Head Income Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">VIP</p>
              <p className="text-sm font-bold tabular-nums">{vipTotal}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Events</p>
              <p className="text-sm font-bold tabular-nums">{eventHeads}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MTG</p>
              <p className="text-sm font-bold tabular-nums">{mtgHeads}</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Expected</p>
              <p className="text-sm font-bold text-primary tabular-nums">
                {vipTotal + eventHeads + mtgHeads + wheelExpectedHeads}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
