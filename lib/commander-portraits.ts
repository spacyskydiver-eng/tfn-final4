/* ------------------------------------------------------------------ */
/*  Commander Portrait Mapping                                         */
/* ------------------------------------------------------------------ */

import type { CommanderEntry } from '@/lib/commander-data'

/** Base path for commander portrait assets (under /public). */
export const COMMANDER_PORTRAIT_BASE_PATH = '/commanders'

/**
 * Map commander IDs → portrait keys (filename without extension).
 *
 * NOTE: This is intentionally separate from CommanderEntry so we don't
 * mutate existing data models or storage. Update this map as you add
 * new assets.
 */
export const commanderPortraitMap: Record<string, string> = {
  // Prep / early-game examples
  'cmd-cao-cao': 'cao-cao',
  'cmd-richard': 'richard-i',
  'cmd-ysg': 'yi-seong-gye',
  'cmd-mulan': 'mulan',
  'cmd-cheok': 'cheok-jun-gyeong',
  'cmd-takeda': 'takeda-shingen',
  'cmd-bertrand': 'bertrand-du-guesclin',
  'cmd-mary': 'mary-i',
  'cmd-archimedes': 'archimedes',
  'cmd-thutmose': 'thutmose-iii',
  'cmd-cyrus': 'cyrus-the-great',
  'cmd-edward': 'edward-of-woodstock',
  'cmd-alexander': 'alexander-the-great',
  'cmd-saladin': 'saladin',
}

export function getCommanderPortraitUrl(entry: CommanderEntry): string | null {
  const key = commanderPortraitMap[entry.id]
  if (!key) return null
  return `${COMMANDER_PORTRAIT_BASE_PATH}/${key}.png`
}

export function getCommanderInitials(name: string): string {
  if (!name) return '?'
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return '?'
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

