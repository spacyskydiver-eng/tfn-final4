'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Dices, Info, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountProfile } from '@/lib/engine/types'
import { getCommandersBySeason } from '@/lib/commander-data'
import {
  type WofPlanInput,
  calcWofPlan,
  WOF_AVG_HEADS_PER_SPIN,
  WOF_BUNDLES,
  WOF_FREE_SPINS_TOTAL,
  WOF_DISCOUNT_SINGLE_TOTAL,
  WOF_DISCOUNT_SINGLE_GEMS,
  WOF_DISCOUNT_5PACK_TOTAL,
  WOF_DISCOUNT_5PACK_SPINS,
  WOF_DISCOUNT_5PACK_GEMS,
  WOF_REGULAR_SINGLE_GEMS,
} from '@/lib/kvk-engine'

export function WheelOfFortuneSection({
  profile,
  onUpdate,
}: {
  profile: AccountProfile
  onUpdate: (p: AccountProfile) => void
}) {
  const wofInput: WofPlanInput = {
    targetSpins: profile.wofTargetSpins,
    useBundles: profile.wofBundles,
  }

  const plan = useMemo(() => calcWofPlan(wofInput), [profile.wofTargetSpins, profile.wofBundles])

  const toggleBundle = (id: string) => {
    onUpdate({
      ...profile,
      wofBundles: { ...profile.wofBundles, [id]: !profile.wofBundles[id] },
    })
  }

  const seasonGroups = useMemo(() => getCommandersBySeason(), [])
  const [scheduleOpen, setScheduleOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Commander Wheel Schedule Info Tip */}
      <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Commander Wheel Schedule</span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  scheduleOpen && 'rotate-180',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                Which legendary commanders appear on the Wheel of Fortune depends on your kingdom age / season.
              </p>
              <div className="space-y-3">
                {seasonGroups.map(({ season, commanders }) => (
                  <div key={season} className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">{season}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {commanders.map((name) => (
                        <Badge key={name} variant="secondary" className="text-[11px] px-2 py-0.5">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {seasonGroups.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No commanders configured yet.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fortune Shop Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dices className="h-4 w-4 text-primary" />
            Fortune Shop Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            The Wheel of Fortune event lasts {3} days. Each day you get 1 free spin, plus discounted purchases.
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Tier</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Spins</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Cost</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Per Spin</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2 text-foreground font-medium">Free Spin</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_FREE_SPINS_TOTAL}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-primary font-semibold">Free</td>
                  <td className="px-3 py-2 text-right tabular-nums text-primary">0</td>
                  <td className="px-3 py-2 text-muted-foreground">1/day</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-foreground font-medium">
                    50% Discount
                    <span className="ml-1 text-[10px] text-muted-foreground">(single)</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_SINGLE_TOTAL}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{(WOF_DISCOUNT_SINGLE_GEMS * WOF_DISCOUNT_SINGLE_TOTAL).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_SINGLE_GEMS}</td>
                  <td className="px-3 py-2 text-muted-foreground">1/day</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-foreground font-medium">
                    10% Discount
                    <span className="ml-1 text-[10px] text-muted-foreground">(5-pack)</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_5PACK_SPINS}/pack</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_5PACK_GEMS.toLocaleString()}/pack</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_5PACK_GEMS / WOF_DISCOUNT_5PACK_SPINS}</td>
                  <td className="px-3 py-2 text-muted-foreground">Full packs only</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-foreground font-medium">Regular Price</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">unlimited</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_REGULAR_SINGLE_GEMS}/spin</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_REGULAR_SINGLE_GEMS}</td>
                  <td className="px-3 py-2 text-muted-foreground">No limit</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Average expected heads per spin: ~{WOF_AVG_HEADS_PER_SPIN}
          </p>
        </CardContent>
      </Card>

      {/* Spin Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dices className="h-4 w-4 text-primary" />
            Wheel Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">Total Spins You Plan to Do</Label>
            <Input
              type="number"
              value={profile.wofTargetSpins || ''}
              onChange={(e) => onUpdate({ ...profile, wofTargetSpins: Number(e.target.value) || 0 })}
              placeholder="e.g. 25"
              className="max-w-xs"
              min={0}
            />
          </div>

          {/* Bundle selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Purchase Bundles (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Select any bundles you plan to buy. Bundle spins are applied before gem purchases to save gems.
            </p>
            <div className="space-y-2">
              {WOF_BUNDLES.map((bundle) => {
                const checked = !!profile.wofBundles[bundle.id]
                return (
                  <div
                    key={bundle.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <Switch
                      checked={checked}
                      onCheckedChange={() => toggleBundle(bundle.id)}
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {bundle.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{bundle.label}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{bundle.spins} spins</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Breakdown */}
          {profile.wofTargetSpins > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Cost Breakdown</h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Source</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Spins</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Gems</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Per Spin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plan.freeSpins > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-foreground">Free Spins</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.freeSpins}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-primary font-semibold">0</td>
                        <td className="px-3 py-2 text-right tabular-nums text-primary">0</td>
                      </tr>
                    )}
                    {plan.bundleSpins > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-foreground">
                          Bundles
                          <span className="text-xs text-muted-foreground ml-1">({plan.bundleNames.join(', ')})</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.bundleSpins}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground italic">real $</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">--</td>
                      </tr>
                    )}
                    {plan.discountSingleSpins > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-foreground">50% Discount Singles</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.discountSingleSpins}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.discountSingleGems.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_SINGLE_GEMS}</td>
                      </tr>
                    )}
                    {plan.discount5PackSpins > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-foreground">
                          10% Discount 5-Packs
                          <span className="text-xs text-muted-foreground ml-1">({plan.discount5PackCount}x)</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.discount5PackSpins}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.discount5PackGems.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_DISCOUNT_5PACK_GEMS / WOF_DISCOUNT_5PACK_SPINS}</td>
                      </tr>
                    )}
                    {plan.regularSpins > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-foreground">Regular Price</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.regularSpins}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.regularGems.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{WOF_REGULAR_SINGLE_GEMS}</td>
                      </tr>
                    )}
                    <tr className="bg-secondary/30 font-semibold">
                      <td className="px-3 py-2 text-foreground">Total</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{plan.totalSpins}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">{plan.totalGemCost.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {plan.totalSpins > 0 ? Math.round(plan.totalGemCost / plan.totalSpins) : 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Spins</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{plan.totalSpins}</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gem Cost</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{plan.totalGemCost.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected Heads</p>
                  <p className="text-sm font-bold text-primary tabular-nums">{plan.expectedHeads.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gems/Head</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {plan.costPerHead > 0 ? plan.costPerHead.toLocaleString() : '--'}
                  </p>
                </div>
              </div>

              {plan.bundleBonusGems > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-foreground">
                    Bonus gems from bundles: <span className="font-semibold text-primary">{plan.bundleBonusGems.toLocaleString()}</span>
                    {' '} -- these are returned to your gem balance.
                  </p>
                </div>
              )}

              {plan.regularSpins > 20 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">
                    {plan.regularSpins} spins at full price ({WOF_REGULAR_SINGLE_GEMS} gems/spin) is expensive. Consider buying bundles instead.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
