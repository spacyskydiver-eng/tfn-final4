/* ------------------------------------------------------------------ */
/*  Commander Stats — aggregate equipment, formation, talents          */
/* ------------------------------------------------------------------ */

import type { PlannerCommanderSide, PlannerEquipmentSlot } from '@/lib/engine/useCommanderPlanner'
import { EQUIPMENT_DB, getLoadoutStats, type EquipmentSlot, type Loadout, type StatType } from '@/lib/game/equipment'
import { STAT_LABELS } from '@/lib/game/equipment'
import { getTalentStatBonuses } from '@/lib/game/talentTrees'

const PLANNER_TO_SLOT: Record<PlannerEquipmentSlot, EquipmentSlot> = {
  helmet: 'helmet',
  weapon: 'weapon',
  chest: 'chest',
  gloves: 'gloves',
  boots: 'boots',
  accessory: 'accessory_1',
}

export type CommanderStatsResult = {
  /** Aggregated stats (from equipment + placeholders). Keys match StatType. */
  stats: Record<StatType, number>
  /** Display-friendly list: label + value for stats > 0 */
  bonuses: { label: string; value: number }[]
  /** Placeholder for formation bonus (e.g. "Pincer +2% Def") */
  formationBonus?: string
}

function buildLoadoutFromSide(side: PlannerCommanderSide): Loadout {
  const loadout: Loadout = {}
  const equipment = side.equipment ?? {}
  for (const [plannerSlot, equipmentId] of Object.entries(equipment)) {
    if (!equipmentId) continue
    const slot = PLANNER_TO_SLOT[plannerSlot as PlannerEquipmentSlot]
    const eq = EQUIPMENT_DB.find((e) => e.id === equipmentId)
    if (eq && slot) loadout[slot] = eq
  }
  return loadout
}

/**
 * Compute combat-related stats for a planner side (current or target).
 * Uses equipment DB + loadout; formation/talents are placeholders for now.
 */
export function computeCommanderStats(side: PlannerCommanderSide): CommanderStatsResult {
  const loadout = buildLoadoutFromSide(side)
  const raw = getLoadoutStats(loadout)

  // Add talent bonuses (stat keys from talents may match StatType)
  // Support both presets (new) and legacy talentConfig
  const talentConfig = side.talentPresets
    ? side.talentPresets.presets[side.talentPresets.activePreset]
    : side.talentConfig

  if (talentConfig?.treeType && talentConfig.nodes) {
    const talentBonus = getTalentStatBonuses(talentConfig)
    for (const [stat, value] of Object.entries(talentBonus)) {
      if (value > 0 && stat in raw) {
        raw[stat as StatType] += value
      }
    }
  }

  let formationBonus: string | undefined
  if (side.formation) {
    formationBonus = `${side.formation} formation`
  }

  const bonuses: { label: string; value: number }[] = []
  for (const [type, value] of Object.entries(raw) as [StatType, number][]) {
    if (value > 0) {
      bonuses.push({ label: STAT_LABELS[type], value })
    }
  }
  bonuses.sort((a, b) => b.value - a.value)

  return {
    stats: raw,
    bonuses,
    formationBonus,
  }
}
