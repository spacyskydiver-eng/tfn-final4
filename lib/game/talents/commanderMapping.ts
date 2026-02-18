/* ------------------------------------------------------------------ */
/*  Commander to Talent Tree Mapping                                  */
/* ------------------------------------------------------------------ */

import commandersData from './data/commanders.json'

/**
 * Raw commander data from rok-talents commanders.json
 */
type RokCommanderData = {
  id: string
  title?: string
  tier?: string
  red: string // Red talent tree name
  yellow: string // Yellow talent tree name
  blue: string // Blue talent tree name
  shortName?: string
  guides?: Record<string, string>
}

type RokCommandersData = Record<string, RokCommanderData>

/**
 * Get talent tree IDs for a commander by name.
 * Returns { red, yellow, blue } tree IDs (lowercase, e.g. "infantry", "skill").
 */
export function getCommanderTalentTrees(commanderName: string): {
  red: string
  yellow: string
  blue: string
} | null {
  const commanders = commandersData as RokCommandersData
  const commander = commanders[commanderName]
  if (!commander) return null

  // Map tree names to IDs (lowercase)
  const treeNameToId: Record<string, string> = {
    Attack: 'attack',
    Archer: 'archer',
    Cavalry: 'cavalry',
    Conquering: 'conquering',
    Defense: 'defense',
    Garrison: 'garrison',
    Gathering: 'gathering',
    Infantry: 'infantry',
    Integration: 'integration',
    Leadership: 'leadership',
    Mobility: 'mobility',
    Peacekeeping: 'peacekeeping',
    Skill: 'skill',
    Support: 'support',
    Versatility: 'versatility',
  }

  return {
    red: treeNameToId[commander.red] ?? commander.red.toLowerCase(),
    yellow: treeNameToId[commander.yellow] ?? commander.yellow.toLowerCase(),
    blue: treeNameToId[commander.blue] ?? commander.blue.toLowerCase(),
  }
}

/**
 * Find commander name in rok-talents format from our CommanderEntry name.
 * Handles name variations and short names.
 */
export function findCommanderInRokData(commanderName: string): string | null {
  const commanders = commandersData as RokCommandersData

  // Direct match
  if (commanderName in commanders) return commanderName

  // Try short name match
  for (const [key, data] of Object.entries(commanders)) {
    if (data.shortName === commanderName) return key
    if (key.toLowerCase() === commanderName.toLowerCase()) return key
  }

  // Try partial match
  const lowerName = commanderName.toLowerCase()
  for (const key of Object.keys(commanders)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return key
    }
  }

  return null
}
