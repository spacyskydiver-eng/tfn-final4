/* ================================================================== */
/*  EQUIPMENT FORGE — DATA TYPES & CONSTANTS                          */
/* ================================================================== */

export type ForgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ForgeSlot = 'weapon' | 'helmet' | 'chest' | 'gloves' | 'legs' | 'boots' | 'accessory'
export type ForgeFilter = 'all' | 'weapon' | 'helmet' | 'chest' | 'gloves' | 'legs' | 'boots' | 'accessory' | 'sets'
export type AttributeColor = 'red' | 'green' | 'blue' | 'purple' | 'orange' | 'cyan' | 'yellow' | 'pink'

export interface EquipmentAttribute {
  label: string      // e.g. "Archer Defense"
  value: string      // e.g. "+8%"
  color: AttributeColor
}

export interface IconicAttribute {
  tier: 'I' | 'II' | 'III' | 'IV' | 'V'
  description: string
  isSkill?: boolean   // true → render underlined (skill name)
}

export interface SetBonus {
  pieces: number
  description: string
}

export interface EquipmentSet {
  id: string
  name: string
  bonuses: SetBonus[]
}

export interface ForgeMaterialDef {
  id: string
  name: string
  iconPath: string
  rarityColor: string
}

export const FORGE_MATERIAL_DEFS: ForgeMaterialDef[] = [
  { id: 'legendary_mat',     name: 'Legendary Mat',     iconPath: '/images/bundle/legendary_mat_chest.png',    rarityColor: '#f59e0b' },
  { id: 'epic_mat',          name: 'Epic Mat',           iconPath: '/images/bundle/epic_mat_chest.png',         rarityColor: '#a855f7' },
  { id: 'rare_mat',          name: 'Rare Mat',           iconPath: '/images/bundle/rare_mat.png',               rarityColor: '#3b82f6' },
  { id: 'uncommon_mat',      name: 'Uncommon Mat',       iconPath: '/images/bundle/uncommon_mat_chest.png',     rarityColor: '#22c55e' },
  { id: 'common_mat',        name: 'Common Mat',         iconPath: '/images/bundle/common_mat_chest.png',       rarityColor: '#a1a1aa' },
  { id: 'crystal',           name: 'Crystal',            iconPath: '/images/bundle/crystal.png',                rarityColor: '#67e8f9' },
  { id: 'conversion_stone',  name: 'Conv. Stone',        iconPath: '/images/bundle/conversion_stone.png',       rarityColor: '#f97316' },
  { id: 'transmutation_stone', name: 'Trans. Stone',     iconPath: '/images/bundle/transmutation_stone.png',    rarityColor: '#e879f9' },
  { id: 'gem',               name: 'Gem',                iconPath: '/images/bundle/gem.png',                    rarityColor: '#818cf8' },
  // Forge craft materials
  { id: 'leather',           name: 'Leather',            iconPath: '/images/equipment/mat_icons/leather_legendary.webp',      rarityColor: '#a16207' },
  { id: 'iron',              name: 'Iron',               iconPath: '/images/equipment/mat_icons/ore_legendary.webp',          rarityColor: '#71717a' },
  { id: 'ebony',             name: 'Ebony',              iconPath: '/images/equipment/mat_icons/ebony_legendary.webp',        rarityColor: '#1d4ed8' },
  { id: 'bone',              name: 'Bone',               iconPath: '/images/equipment/mat_icons/bone_legendary.webp',         rarityColor: '#84cc16' },
]

export interface ForgeMaterial {
  materialId: string   // matches FORGE_MATERIAL_DEFS id
  amount: number
}

export interface ForgeItem {
  id: string
  name: string
  slot: ForgeSlot
  rarity: ForgeRarity
  equipmentLevel: number
  iconUrl?: string
  canForge?: boolean
  attributes: EquipmentAttribute[]
  specialTalent?: string
  iconicAttributes?: IconicAttribute[]
  setId?: string
  materials: ForgeMaterial[]
  goldCost: number
}

export interface ForgeState {
  items: ForgeItem[]
  sets: EquipmentSet[]
}

/* ------------------------------------------------------------------ */
/*  RARITY CONFIG                                                      */
/* ------------------------------------------------------------------ */

export const RARITY_CONFIG: Record<ForgeRarity, {
  label: string
  nameCls: string
  badgeBg: string
  badgeText: string
  itemBorder: string
  itemBg: string
  glow: string
  glowColor: string
}> = {
  common: {
    label: 'Common',
    nameCls: 'text-zinc-300',
    badgeBg: 'bg-zinc-600',
    badgeText: 'text-white',
    itemBorder: 'border-zinc-500',
    itemBg: 'bg-zinc-800/60',
    glow: '0 0 12px rgba(161,161,170,0.3)',
    glowColor: 'rgba(161,161,170,0.6)',
  },
  uncommon: {
    label: 'Uncommon',
    nameCls: 'text-green-300',
    badgeBg: 'bg-green-700',
    badgeText: 'text-white',
    itemBorder: 'border-green-600',
    itemBg: 'bg-green-900/40',
    glow: '0 0 16px rgba(74,222,128,0.35)',
    glowColor: 'rgba(74,222,128,0.6)',
  },
  rare: {
    label: 'Rare',
    nameCls: 'text-blue-300',
    badgeBg: 'bg-blue-700',
    badgeText: 'text-white',
    itemBorder: 'border-blue-600',
    itemBg: 'bg-blue-900/40',
    glow: '0 0 16px rgba(96,165,250,0.4)',
    glowColor: 'rgba(96,165,250,0.6)',
  },
  epic: {
    label: 'Epic',
    nameCls: 'text-purple-300',
    badgeBg: 'bg-purple-700',
    badgeText: 'text-white',
    itemBorder: 'border-purple-500',
    itemBg: 'bg-purple-900/40',
    glow: '0 0 20px rgba(192,132,252,0.45)',
    glowColor: 'rgba(192,132,252,0.6)',
  },
  legendary: {
    label: 'Legendary',
    nameCls: 'text-amber-300',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    itemBorder: 'border-amber-500',
    itemBg: 'bg-amber-900/40',
    glow: '0 0 24px rgba(251,191,36,0.5)',
    glowColor: 'rgba(251,191,36,0.65)',
  },
}

/* ------------------------------------------------------------------ */
/*  SLOT CONFIG                                                        */
/* ------------------------------------------------------------------ */

export const SLOT_CONFIG: Record<ForgeSlot, { label: string; plural: string }> = {
  weapon:    { label: 'Weapon',    plural: 'Weapons'     },
  helmet:    { label: 'Helmet',    plural: 'Helmets'     },
  chest:     { label: 'Chest',     plural: 'Chest'       },
  gloves:    { label: 'Gloves',    plural: 'Gloves'      },
  legs:      { label: 'Legs',      plural: 'Legs'        },
  boots:     { label: 'Boots',     plural: 'Boots'       },
  accessory: { label: 'Accessory', plural: 'Accessories' },
}

export const FORGE_FILTERS: { key: ForgeFilter; label: string }[] = [
  { key: 'all',       label: 'All'          },
  { key: 'weapon',    label: 'Weapons'      },
  { key: 'helmet',    label: 'Helmets'      },
  { key: 'chest',     label: 'Chest'        },
  { key: 'gloves',    label: 'Gloves'       },
  { key: 'legs',      label: 'Legs'         },
  { key: 'boots',     label: 'Boots'        },
  { key: 'accessory', label: 'Accessories'  },
  { key: 'sets',      label: 'Sets'         },
]

export const ATTRIBUTE_COLORS: Record<AttributeColor, { text: string; dot: string }> = {
  red:    { text: 'text-red-400',    dot: 'bg-red-500'    },
  green:  { text: 'text-green-400',  dot: 'bg-green-500'  },
  blue:   { text: 'text-blue-400',   dot: 'bg-blue-500'   },
  purple: { text: 'text-purple-400', dot: 'bg-purple-500' },
  orange: { text: 'text-orange-400', dot: 'bg-orange-500' },
  cyan:   { text: 'text-cyan-400',   dot: 'bg-cyan-500'   },
  yellow: { text: 'text-yellow-400', dot: 'bg-yellow-500' },
  pink:   { text: 'text-pink-400',   dot: 'bg-pink-500'   },
}

/* ------------------------------------------------------------------ */
/*  BUNDLE ICON PICKER OPTIONS                                         */
/* ------------------------------------------------------------------ */

export const BUNDLE_ICON_OPTIONS = [
  { path: '/images/bundle/legendary_mat_chest.png', label: 'Legendary Mat' },
  { path: '/images/bundle/epic_mat_chest.png',      label: 'Epic Mat'      },
  { path: '/images/bundle/rare_mat.png',            label: 'Rare Mat'      },
  { path: '/images/bundle/uncommon_mat_chest.png',  label: 'Uncommon Mat'  },
  { path: '/images/bundle/common_mat_chest.png',    label: 'Common Mat'    },
  { path: '/images/bundle/crystal.png',             label: 'Crystal'       },
  { path: '/images/bundle/gem.png',                 label: 'Gem'           },
  { path: '/images/bundle/gold.png',                label: 'Gold'          },
  { path: '/images/bundle/gold_chest.png',          label: 'Gold Chest'    },
  { path: '/images/bundle/silver_chest.png',        label: 'Silver Chest'  },
  { path: '/images/bundle/stone_chest.png',         label: 'Stone Chest'   },
  { path: '/images/bundle/iron_chest.png',          label: 'Iron Chest'    },
  { path: '/images/bundle/conversion_stone.png',    label: 'Conv. Stone'   },
  { path: '/images/bundle/transmutation_stone.png', label: 'Trans. Stone'  },
  { path: '/images/bundle/dazzling_star.png',       label: 'Dazzling Star' },
  { path: '/images/bundle/brand_new_star.png',      label: 'Brand New Star'},
  { path: '/images/bundle/training_speed.png',      label: 'Training Speed'},
  { path: '/images/bundle/universal_speed.png',     label: 'Univ. Speed'   },
  // Mat icons
  { path: '/images/equipment/mat_icons/leather_legendary.webp', label: 'Leather'  },
  { path: '/images/equipment/mat_icons/ore_legendary.webp',     label: 'Iron'     },
  { path: '/images/equipment/mat_icons/ebony_legendary.webp',   label: 'Ebony'    },
  { path: '/images/equipment/mat_icons/bone_legendary.webp',    label: 'Bone'     },
  { path: '/images/equipment/mat_icons/chest_legendary.webp',   label: 'Mat Chest'},
]

/* ------------------------------------------------------------------ */
/*  PERSISTENCE                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'equipment_forge_v1'

export function loadForgeState(): ForgeState {
  if (typeof window === 'undefined') return { items: [], sets: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ForgeState
  } catch { /* ignore */ }
  return { items: [], sets: [] }
}

export function saveForgeState(state: ForgeState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}
