'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import type { CommanderSkillSet } from '@/lib/kvk-engine'
import { calcHeadsNeeded, HEADS_PER_SKILL_LEVEL_LEGENDARY, HEADS_PER_SKILL_LEVEL_EPIC } from '@/lib/engine/commanderEngine'
import { getXpToReachLevel } from '@/lib/engine/xpEngine'
import type { PlannerCommanderSide, PlannerEquipmentSlot } from '@/lib/engine/useCommanderPlanner'
import { EQUIPMENT_DB, computeCraftingTotals, type Equipment } from '@/lib/game/equipment'

export type UpgradeCostBreakdownProps = {
  rarity: 'legendary' | 'epic'
  current: PlannerCommanderSide
  target: PlannerCommanderSide
}

export type SkillCostResult = {
  /** Heads already "spent" along the path (current → target) — progress along the skill upgrade path */
  invested: number
  /** Heads still needed to reach target skills */
  needed: number
  /** Total heads for this upgrade (invested + needed) */
  total: number
}

export type LevelCostResult = {
  xpRequired: number
}

export type EquipmentCostResult = {
  itemsToCraft: Equipment[]
  totals: ReturnType<typeof computeCraftingTotals>
}

function getHeadsPerLevel(rarity: 'legendary' | 'epic') {
  return rarity === 'legendary' ? HEADS_PER_SKILL_LEVEL_LEGENDARY : HEADS_PER_SKILL_LEVEL_EPIC
}

export function calcSkillCosts(
  rarity: 'legendary' | 'epic',
  currentSkills: CommanderSkillSet,
  targetSkills: CommanderSkillSet,
): SkillCostResult {
  const headsPerLevel = getHeadsPerLevel(rarity)
  const res = calcHeadsNeeded(headsPerLevel, currentSkills, targetSkills)
  return res
}

export function calcLevelCosts(currentLevel: number, targetLevel: number): LevelCostResult {
  return {
    xpRequired: getXpToReachLevel(currentLevel, targetLevel),
  }
}

export function calcEquipmentCosts(
  current: PlannerCommanderSide,
  target: PlannerCommanderSide,
): EquipmentCostResult {
  const toCraft: Equipment[] = []

  const slots: PlannerEquipmentSlot[] = ['helmet', 'weapon', 'chest', 'gloves', 'boots', 'accessory']

  for (const slot of slots) {
    const targetId = target.equipment?.[slot]
    if (!targetId) continue

    // If user marked this as already owned, skip crafting cost.
    if (target.ownedFlags?.[slot]) continue

    const currentId = current.equipment?.[slot]
    if (currentId && currentId === targetId) continue

    const eq = EQUIPMENT_DB.find((e) => e.id === targetId)
    if (eq) toCraft.push(eq)
  }

  const totals = computeCraftingTotals(toCraft)
  return { itemsToCraft: toCraft, totals }
}

export function UpgradeCostBreakdown({ rarity, current, target }: UpgradeCostBreakdownProps) {
  const skillResult = useMemo(
    () => calcSkillCosts(rarity, current.skills, target.skills),
    [rarity, current.skills, target.skills],
  )

  const levelResult = useMemo(
    () => calcLevelCosts(current.level, target.level),
    [current.level, target.level],
  )

  const equipmentResult = useMemo(
    () => calcEquipmentCosts(current, target),
    [current, target],
  )

  const alreadyCompletedHeads = skillResult.invested
  const remainingHeads = skillResult.needed
  const totalHeadsForUpgrade = skillResult.total
  const skillPathPct = totalHeadsForUpgrade > 0 ? Math.min(100, Math.round((alreadyCompletedHeads / totalHeadsForUpgrade) * 100)) : 0

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Skill Progress (current → target) */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Skill Progress (current → target)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Current: {current.skills.join('-')}</span>
            <span>Target: {target.skills.join('-')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Done (path)</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{alreadyCompletedHeads}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
              <p className="text-sm font-bold tabular-nums text-primary">{remainingHeads}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total for upgrade</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{totalHeadsForUpgrade}</p>
            </div>
          </div>
          <Progress value={skillPathPct} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-center">{skillPathPct}% of the skill upgrade path completed</p>
        </CardContent>
      </Card>

      {/* Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Level Upgrades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">From Level</span>
            <span className="font-semibold tabular-nums">{current.level}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">To Level</span>
            <span className="font-semibold tabular-nums">{target.level}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total XP Required</span>
            <span className="font-semibold tabular-nums">{levelResult.xpRequired.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            XP is modeled with a simple placeholder curve for now. Swap the model in <code>xpEngine.ts</code> later without touching UI.
          </p>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Equipment Upgrades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Items to Craft</span>
            <span className="font-semibold tabular-nums">{equipmentResult.itemsToCraft.length}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Gold Cost</span>
            <span className="font-semibold tabular-nums text-amber-400">
              {equipmentResult.totals.gold.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Craft Time</span>
            <span className="font-semibold tabular-nums">
              {Math.floor(equipmentResult.totals.time / 1440)}d{' '}
              {Math.floor((equipmentResult.totals.time % 1440) / 60)}h
            </span>
          </div>

          {equipmentResult.itemsToCraft.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Planned Crafts</Label>
              <ul className="space-y-0.5">
                {equipmentResult.itemsToCraft.map((eq) => (
                  <li key={eq.id} className="text-[11px]">
                    {eq.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No new items need crafting based on your current vs target loadout and ownership flags.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

