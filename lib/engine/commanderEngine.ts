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

export function getHeadsPerLevel(rarity: 'legendary' | 'epic'): number[] {
  return rarity === 'legendary'
    ? HEADS_PER_SKILL_LEVEL_LEGENDARY
    : HEADS_PER_SKILL_LEVEL_EPIC
}

export function calcCommanderNeeds(cmd: CommanderGoal) {
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
