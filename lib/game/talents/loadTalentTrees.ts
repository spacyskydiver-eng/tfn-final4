/* ------------------------------------------------------------------ */
/*  Talent Tree Loader — normalize rok-talents data format           */
/* ------------------------------------------------------------------ */

import type { TalentTree, TalentNode, TalentStatBonus } from '../talents'

/**
 * Raw node format from rok-talents JSON files.
 */
type RokTalentNodeRaw = {
  name: string
  values: number[] // Array of stat values per level (e.g. [0.5, 1, 1.5])
  stats: string | '' // Stat type name (e.g. "Attack", "Defense", "Health", "March Speed") or empty string
  text: string // Description template
  prereq: number[] // Prerequisite node IDs (as numbers)
  dep: number[] // Dependent node IDs (for building edges)
  pos: [number, number] // [x, y] coordinates as percentages
  type: 'node-small' | 'node-large'
  image?: string // Optional icon identifier
}

/**
 * Raw tree format from rok-talents JSON files.
 * Keys are node IDs as strings ("1", "2", etc.)
 */
type RokTalentTreeRaw = Record<string, RokTalentNodeRaw>

/**
 * Map rok-talents stat name to our internal stat key.
 */
function mapStatName(rokStat: string): string {
  const statMap: Record<string, string> = {
    Attack: 'troop_attack',
    Defense: 'troop_defense',
    Health: 'troop_health',
    'March Speed': 'march_speed',
    // Add more mappings as needed
  }
  return statMap[rokStat] ?? rokStat.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Normalize a single rok-talents node into our TalentNode format.
 */
function normalizeNode(nodeId: string, raw: RokTalentNodeRaw): TalentNode {
  const maxLevel = raw.values.length
  const prerequisites = raw.prereq.map((id) => String(id))

  // Build stat bonuses from values array
  const statBonuses: TalentStatBonus[] = []
  if (raw.stats && typeof raw.stats === 'string' && raw.stats.trim() !== '' && raw.values.length > 0) {
    const statKey = mapStatName(raw.stats)
    // For nodes with multiple levels, use the first value as base
    // The actual bonus per level is values[level-1] - values[level-2] (or values[0] for level 1)
    // For simplicity, we'll use values[0] as valuePerLevel for now
    // In practice, each level might have different values, but we'll aggregate
    statBonuses.push({
      stat: statKey,
      valuePerLevel: raw.values[0], // Base value per level
    })
  }

  return {
    id: nodeId,
    name: raw.name,
    maxLevel,
    prerequisites,
    statBonuses,
    x: raw.pos[0],
    y: raw.pos[1],
    nodeType: raw.type,
    icon: raw.image,
    description: raw.text,
    values: raw.values,
  }
}

/**
 * Build edges from node dependencies.
 * An edge exists from node A to node B if B is in A's dep array.
 */
function buildEdges(rawTree: RokTalentTreeRaw): { from: string; to: string }[] {
  const edges: { from: string; to: string }[] = []
  for (const [nodeId, node] of Object.entries(rawTree)) {
    for (const depId of node.dep) {
      if (depId === 0) continue // Skip invalid edge
      edges.push({ from: nodeId, to: String(depId) })
    }
  }
  return edges
}

/**
 * Load and normalize a talent tree from rok-talents JSON format.
 */
export function loadTalentTree(
  treeId: string,
  treeName: string,
  rawTree: RokTalentTreeRaw
): TalentTree {
  const nodes: TalentNode[] = []
  for (const [nodeId, rawNode] of Object.entries(rawTree)) {
    nodes.push(normalizeNode(nodeId, rawNode))
  }

  const edges = buildEdges(rawTree)

  return {
    id: treeId,
    name: treeName,
    classification: treeName,
    nodes,
    edges,
  }
}

// Static imports of talent tree JSON files
import AttackTree from './data/v1/Attack.json'
import ArcherTree from './data/v1/Archer.json'
import CavalryTree from './data/v1/Cavalry.json'
import ConqueringTree from './data/v1/Conquering.json'
import DefenseTree from './data/v1/Defense.json'
import GarrisonTree from './data/v1/Garrison.json'
import GatheringTree from './data/v1/Gathering.json'
import InfantryTree from './data/v1/Infantry.json'
import IntegrationTree from './data/v1/Integration.json'
import LeadershipTree from './data/v1/Leadership.json'
import MobilityTree from './data/v1/Mobility.json'
import PeacekeepingTree from './data/v1/Peacekeeping.json'
import SkillTree from './data/v1/Skill.json'
import SupportTree from './data/v1/Support.json'
import VersatilityTree from './data/v1/Versatility.json'

/**
 * Load all talent trees from rok-talents data files.
 */
export function loadAllTalentTrees(): TalentTree[] {
  const treeData = [
    { id: 'attack', name: 'Attack', raw: AttackTree },
    { id: 'archer', name: 'Archer', raw: ArcherTree },
    { id: 'cavalry', name: 'Cavalry', raw: CavalryTree },
    { id: 'conquering', name: 'Conquering', raw: ConqueringTree },
    { id: 'defense', name: 'Defense', raw: DefenseTree },
    { id: 'garrison', name: 'Garrison', raw: GarrisonTree },
    { id: 'gathering', name: 'Gathering', raw: GatheringTree },
    { id: 'infantry', name: 'Infantry', raw: InfantryTree },
    { id: 'integration', name: 'Integration', raw: IntegrationTree },
    { id: 'leadership', name: 'Leadership', raw: LeadershipTree },
    { id: 'mobility', name: 'Mobility', raw: MobilityTree },
    { id: 'peacekeeping', name: 'Peacekeeping', raw: PeacekeepingTree },
    { id: 'skill', name: 'Skill', raw: SkillTree },
    { id: 'support', name: 'Support', raw: SupportTree },
    { id: 'versatility', name: 'Versatility', raw: VersatilityTree },
  ]

  return treeData.map(({ id, name, raw }) => loadTalentTree(id, name, raw as RokTalentTreeRaw))
}
