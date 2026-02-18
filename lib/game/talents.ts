/* ------------------------------------------------------------------ */
/*  Talent trees — data structures and stub data                     */
/* ------------------------------------------------------------------ */

/**
 * Stat bonus from a single talent node level.
 * Can be extended to match game data (e.g. from rok-talents).
 */
export type TalentStatBonus = {
  stat: string // e.g. 'infantry_attack', 'march_speed'
  valuePerLevel: number // bonus per level (e.g. 2 = +2% per level)
}

export type TalentNode = {
  id: string
  name: string
  maxLevel: number
  /** Prerequisite node ids that must have at least 1 level */
  prerequisites: string[]
  /** Stat bonuses granted per level (e.g. level 3 => 3 * valuePerLevel) */
  statBonuses: TalentStatBonus[]
  /** X position as percentage (0-100) */
  x: number
  /** Y position as percentage (0-100) */
  y: number
  /** Node type: "node-small" or "node-large" */
  nodeType: 'node-small' | 'node-large'
  /** Optional icon/image identifier */
  icon?: string
  /** Description text template (e.g. "Increases X by ${1}%") */
  description?: string
  /** Per-level values for description (from source data, display only) */
  values?: number[]
}

export type TalentTree = {
  id: string
  name: string
  /** e.g. Skill, Infantry, Cavalry, Support, Gathering */
  classification: string
  nodes: TalentNode[]
  /** Edges connecting nodes (from -> to) */
  edges: { from: string; to: string }[]
}

/**
 * Stored per commander side in planner.
 * treeType = tree.id; nodes = nodeId -> level (0 = not taken).
 */
export type CommanderTalentConfig = {
  treeType: string
  nodes: Record<string, number>
}

import { loadAllTalentTrees } from './talents/loadTalentTrees'

/** All talent trees loaded from rok-talents data. */
export const TALENT_TREES: TalentTree[] = loadAllTalentTrees()

export function getTalentTreeById(id: string): TalentTree | undefined {
  return TALENT_TREES.find((t) => t.id === id)
}

/**
 * Aggregate stat bonuses from a talent config.
 * Returns record of stat -> total bonus (e.g. troop_attack: 6).
 */
export function getTalentStatBonuses(config: CommanderTalentConfig): Record<string, number> {
  const tree = getTalentTreeById(config.treeType)
  if (!tree) return {}
  const result: Record<string, number> = {}
  for (const node of tree.nodes) {
    const level = config.nodes[node.id] ?? 0
    if (level <= 0) continue
    for (const b of node.statBonuses) {
      result[b.stat] = (result[b.stat] ?? 0) + b.valuePerLevel * level
    }
  }
  return result
}
