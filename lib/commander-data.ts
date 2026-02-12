/* ------------------------------------------------------------------ */
/*  Commander Roster — hardcoded defaults + localStorage admin edits   */
/* ------------------------------------------------------------------ */

export type SeasonTag =
  | 'Prep Season'
  | 'KvK1'
  | 'Off-season before KvK2'
  | 'KvK2'
  | 'KvK3'
  | 'KvK4+'
  | 'Season of Conquest'

export type CommanderEntry = {
  id: string
  name: string
  seasons: SeasonTag[]
}

/* ---------- Hardcoded defaults ---------- */

export const DEFAULT_COMMANDERS: CommanderEntry[] = [
  { id: 'cmd-cao-cao',           name: 'Cao Cao',                seasons: ['Prep Season', 'Off-season before KvK2'] },
  { id: 'cmd-richard',           name: 'Richard I',              seasons: ['Prep Season', 'Off-season before KvK2'] },
  { id: 'cmd-ysg',               name: 'Yi Seong-Gye',           seasons: ['KvK1', 'Off-season before KvK2'] },
  { id: 'cmd-mulan',             name: 'Mulan',                  seasons: ['Off-season before KvK2'] },
  { id: 'cmd-cheok',             name: 'Cheok Jun-gyeong',       seasons: ['KvK2'] },
  { id: 'cmd-takeda',            name: 'Takeda Shingen',         seasons: ['KvK2'] },
  { id: 'cmd-bertrand',          name: 'Bertrand du Guesclin',   seasons: ['KvK2'] },
  { id: 'cmd-mary',              name: 'Mary I',                 seasons: ['KvK2'] },
  { id: 'cmd-archimedes',        name: 'Archimedes',             seasons: ['KvK2'] },
  { id: 'cmd-thutmose',          name: 'Thutmose III',           seasons: ['KvK2'] },
  { id: 'cmd-cyrus',             name: 'Cyrus the Great',        seasons: ['KvK2'] },
  { id: 'cmd-edward',            name: 'Edward of Woodstock',    seasons: ['KvK2'] },
  { id: 'cmd-alexander',         name: 'Alexander the Great',    seasons: ['KvK2'] },
  { id: 'cmd-saladin',           name: 'Saladin',                seasons: ['KvK2'] },
]

/* ---------- localStorage CRUD ---------- */

const STORAGE_KEY = 'admin_commander_roster'

export function getCommanderRoster(): CommanderEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return [...DEFAULT_COMMANDERS]
}

export function saveCommanderRoster(list: CommanderEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

export function resetCommanderRoster(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

/* ---------- Season helpers ---------- */

export const ALL_SEASONS: SeasonTag[] = [
  'Prep Season',
  'KvK1',
  'Off-season before KvK2',
  'KvK2',
  'KvK3',
  'KvK4+',
  'Season of Conquest',
]

/** Group commanders by season for the Wheel info tip */
export function getCommandersBySeason(roster?: CommanderEntry[]): { season: SeasonTag; commanders: string[] }[] {
  const list = roster ?? getCommanderRoster()
  return ALL_SEASONS
    .map((season) => ({
      season,
      commanders: list.filter((c) => c.seasons.includes(season)).map((c) => c.name),
    }))
    .filter((g) => g.commanders.length > 0)
}

/** Lookup season tags for a commander by name */
export function getCommanderSeasons(name: string, roster?: CommanderEntry[]): SeasonTag[] {
  const list = roster ?? getCommanderRoster()
  const found = list.find((c) => c.name.toLowerCase() === name.toLowerCase())
  return found?.seasons ?? []
}
