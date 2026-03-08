/* ------------------------------------------------------------------ */
/*  Commander Engine — skill/head calculations                         */
/* ------------------------------------------------------------------ */

import {
  type CommanderSkillSet,
  calcHeadsNeeded,
  HEADS_PER_SKILL_LEVEL_LEGENDARY,
  HEADS_PER_SKILL_LEVEL_EPIC,
} from '@/lib/kvk-engine'
import type { CommanderGoal } from './types'

export { calcHeadsNeeded, HEADS_PER_SKILL_LEVEL_LEGENDARY, HEADS_PER_SKILL_LEVEL_EPIC }
export type { CommanderSkillSet }

// Legendary commander skill upgrade costs (16 sequential upgrades)
const LEGENDARY_SKILL_UPGRADE_COSTS = [10, 10, 15, 15, 30, 30, 40, 40, 45, 45, 50, 50, 75, 75, 80, 80]

export function getHeadsPerLevel(rarity: 'legendary' | 'epic'): number[] {
  return rarity === 'legendary'
    ? HEADS_PER_SKILL_LEVEL_LEGENDARY
    : HEADS_PER_SKILL_LEVEL_EPIC
}

/** Calculate total upgrades used from skill digits (1-5 per skill) */
function getTotalUpgradesUsed(skills: CommanderSkillSet): number {
  let total = 0
  for (let i = 0; i < 4; i++) {
    total += Math.max(0, skills[i] - 1) // Level 1 = 0 upgrades, Level 5 = 4 upgrades
  }
  return total
}

/** Calculate heads cost using legendary upgrade system (for legendary commanders only) */
function calcLegendarySkillCost(
  currentSkills: CommanderSkillSet,
  targetSkills: CommanderSkillSet,
): { invested: number; needed: number; total: number } {
  const currentUpgrades = getTotalUpgradesUsed(currentSkills)
  const targetUpgrades = getTotalUpgradesUsed(targetSkills)

  // Cost is sum of sequential upgrade costs
  let invested = 0
  let needed = 0

  for (let i = 0; i < currentUpgrades; i++) {
    invested += LEGENDARY_SKILL_UPGRADE_COSTS[i] ?? 0
  }

  for (let i = currentUpgrades; i < targetUpgrades; i++) {
    needed += LEGENDARY_SKILL_UPGRADE_COSTS[i] ?? 0
  }

  return { invested, needed, total: invested + needed }
}

export function calcCommanderNeeds(cmd: CommanderGoal) {
  // For legendary commanders, use the upgrade-based system
  if (cmd.rarity === 'legendary') {
    return calcLegendarySkillCost(cmd.currentSkills, cmd.targetSkills)
  }

  // For epic commanders, use the old system
  const headsPerLevel = getHeadsPerLevel(cmd.rarity)
  return calcHeadsNeeded(headsPerLevel, cmd.currentSkills, cmd.targetSkills)
}

export function calcTotalHeadsNeeded(commanders: CommanderGoal[]): number {
  return commanders.reduce((sum, cmd) => sum + calcCommanderNeeds(cmd).needed, 0)
}

/** Distribute projected heads to each commander by their allocation percentage */
export function distributeHeadsByAllocation(
  totalHeads: number,
  commanders: CommanderGoal[],
): { cmd: CommanderGoal; allocated: number; needed: number; remaining: number; pct: number }[] {
  return commanders.map((cmd) => {
    const needs = calcCommanderNeeds(cmd)
    const allocated = Math.floor(totalHeads * (cmd.allocationPct / 100))
    const remaining = Math.max(0, needs.needed - allocated)
    const pct = needs.needed > 0 ? Math.min(100, Math.round((allocated / needs.needed) * 100)) : 100
    return { cmd, allocated, needed: needs.needed, remaining, pct }
  })
}
