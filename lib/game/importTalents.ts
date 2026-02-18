/* ------------------------------------------------------------------ */
/*  Talent data ingestion — map external JSON to our structure        */
/* ------------------------------------------------------------------ */
/*
 * Use this to map talent data from external sources (e.g. thesimonho/rok-talents)
 * into our TalentTree[] format. Fetch their JSON (e.g. from public/ or API)
 * then call mapExternalTalentsToOurs(raw).
 */

import type { TalentTree, TalentNode, TalentStatBonus } from './talents'

export type ExternalTalentNode = {
  id?: string
  name?: string
  maxLevel?: number
  prerequisites?: string[]
  stats?: Array<{ stat: string; valuePerLevel?: number; value?: number }>
}

export type ExternalTalentTree = {
  id?: string
  name?: string
  classification?: string
  nodes?: ExternalTalentNode[]
}

/**
 * Map external talent JSON (e.g. from rok-talents repo) into our TalentTree[].
 * Adjust field names below to match the source format.
 */
export function mapExternalTalentsToOurs(external: ExternalTalentTree | ExternalTalentTree[]): TalentTree[] {
  const trees = Array.isArray(external) ? external : [external]
  return trees.map((t): TalentTree => {
    const nodes: TalentNode[] = (t.nodes ?? []).map((n, i) => {
      const statBonuses: TalentStatBonus[] = (n.stats ?? []).map((s) => ({
        stat: s.stat ?? 'troop_attack',
        valuePerLevel: s.valuePerLevel ?? s.value ?? 0,
      }))
      return {
        id: n.id ?? `node-${i}`,
        name: n.name ?? `Node ${i + 1}`,
        maxLevel: n.maxLevel ?? 3,
        prerequisites: n.prerequisites ?? [],
        statBonuses,
      }
    })
    return {
      id: t.id ?? 'unknown',
      name: t.name ?? 'Unknown Tree',
      classification: t.classification ?? 'Skill',
      nodes,
    }
  })
}
