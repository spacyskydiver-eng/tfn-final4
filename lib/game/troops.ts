/* ================================================================== */
/*  TROOP TRAINING DATA                                                */
/*  All costs, times, power values, and point values for RoK troops    */
/* ================================================================== */

export type TroopType = 'infantry' | 'archer' | 'cavalry' | 'siege'
export type Tier = 1 | 2 | 3 | 4 | 5

export interface TroopStats {
  tier: Tier
  power: number
  /** Base training time per troop in seconds (before speed bonus) */
  baseTime: number
  food: number
  wood: number
  stone: number
  gold: number
  /** MGE points per troop trained from scratch */
  mgePoints: number
  /** KvK Crusade points per troop */
  kvkPoints: number
}

export interface UpgradeStats {
  fromTier: Tier
  toTier: Tier
  /** Power gained per troop upgraded */
  powerGain: number
  baseTime: number
  food: number
  wood: number
  stone: number
  gold: number
  mgePoints: number
  kvkPoints: number
}

/* ------------------------------------------------------------------ */
/*  TRAINING FROM SCRATCH (per troop)                                  */
/* ------------------------------------------------------------------ */

const TROOP_STATS: Record<Tier, TroopStats> = {
  1: {
    tier: 1,
    power: 1,
    baseTime: 15,
    food: 50,
    wood: 50,
    stone: 0,
    gold: 0,
    mgePoints: 5,
    kvkPoints: 1,
  },
  2: {
    tier: 2,
    power: 2,
    baseTime: 30,
    food: 100,
    wood: 100,
    stone: 0,
    gold: 0,
    mgePoints: 10,
    kvkPoints: 4,
  },
  3: {
    tier: 3,
    power: 3,
    baseTime: 60,
    food: 150,
    wood: 150,
    stone: 0,
    gold: 10,
    mgePoints: 20,
    kvkPoints: 4,
  },
  4: {
    tier: 4,
    power: 4,
    baseTime: 80,
    food: 300,
    wood: 300,
    stone: 0,
    gold: 20,
    mgePoints: 40,
    kvkPoints: 8,
  },
  5: {
    tier: 5,
    power: 10,
    baseTime: 120,
    food: 800,
    wood: 800,
    stone: 0,
    gold: 400,
    mgePoints: 100,
    kvkPoints: 20,
  },
}

/* ------------------------------------------------------------------ */
/*  UPGRADE COSTS (per troop)                                          */
/*  e.g. T4->T5 means upgrading a T4 troop to T5                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  TYPE-SPECIFIC RESOURCE COSTS (per troop)                           */
/* ------------------------------------------------------------------ */

export interface ResourceCost {
  food: number
  wood: number
  stone: number
  gold: number
}

const TRAINING_COSTS: Record<Tier, Record<TroopType, ResourceCost>> = {
  5: {
    infantry: { food: 800, wood: 800, stone: 0,   gold: 400 },
    archer:   { food: 0,   wood: 800, stone: 600, gold: 400 },
    cavalry:  { food: 800, wood: 0,   stone: 600, gold: 400 },
    siege:    { food: 500, wood: 500, stone: 400, gold: 400 },
  },
  4: {
    infantry: { food: 300, wood: 300, stone: 0,   gold: 20 },
    archer:   { food: 0,   wood: 300, stone: 225, gold: 20 },
    cavalry:  { food: 300, wood: 0,   stone: 225, gold: 20 },
    siege:    { food: 200, wood: 200, stone: 150, gold: 20 },
  },
  3: {
    infantry: { food: 150, wood: 150, stone: 0,   gold: 10 },
    archer:   { food: 0,   wood: 150, stone: 112, gold: 10 },
    cavalry:  { food: 150, wood: 0,   stone: 112, gold: 10 },
    siege:    { food: 100, wood: 100, stone: 75,  gold: 10 },
  },
  2: {
    infantry: { food: 100, wood: 100, stone: 0,  gold: 0 },
    archer:   { food: 0,   wood: 100, stone: 75, gold: 0 },
    cavalry:  { food: 100, wood: 0,   stone: 75, gold: 0 },
    siege:    { food: 65,  wood: 65,  stone: 50, gold: 0 },
  },
  1: {
    infantry: { food: 50, wood: 50, stone: 0, gold: 0 },
    archer:   { food: 40, wood: 60, stone: 0, gold: 0 },
    cavalry:  { food: 60, wood: 40, stone: 0, gold: 0 },
    siege:    { food: 60, wood: 60, stone: 0, gold: 0 },
  },
}

const UPGRADE_COSTS: Record<string, Record<TroopType, ResourceCost>> = {
  '4->5': {
    infantry: { food: 500, wood: 500, stone: 0,   gold: 380 },
    archer:   { food: 0,   wood: 500, stone: 375, gold: 380 },
    cavalry:  { food: 500, wood: 0,   stone: 375, gold: 380 },
    siege:    { food: 300, wood: 300, stone: 250, gold: 380 },
  },
  '3->5': {
    infantry: { food: 650, wood: 650, stone: 0,   gold: 390 },
    archer:   { food: 0,   wood: 650, stone: 488, gold: 390 },
    cavalry:  { food: 650, wood: 0,   stone: 488, gold: 390 },
    siege:    { food: 400, wood: 400, stone: 325, gold: 390 },
  },
  '2->5': {
    infantry: { food: 700, wood: 700, stone: 0,   gold: 400 },
    archer:   { food: 0,   wood: 700, stone: 525, gold: 400 },
    cavalry:  { food: 700, wood: 0,   stone: 525, gold: 400 },
    siege:    { food: 435, wood: 435, stone: 350, gold: 400 },
  },
  '1->5': {
    infantry: { food: 750, wood: 750, stone: 0,   gold: 400 },
    archer:   { food: 0,   wood: 740, stone: 600, gold: 400 },
    cavalry:  { food: 740, wood: 0,   stone: 600, gold: 400 },
    siege:    { food: 440, wood: 440, stone: 400, gold: 400 },
  },
  '3->4': {
    infantry: { food: 150, wood: 150, stone: 0,   gold: 10 },
    archer:   { food: 0,   wood: 150, stone: 113, gold: 10 },
    cavalry:  { food: 150, wood: 0,   stone: 113, gold: 10 },
    siege:    { food: 100, wood: 100, stone: 75,  gold: 10 },
  },
  '2->4': {
    infantry: { food: 200, wood: 200, stone: 0,   gold: 20 },
    archer:   { food: 0,   wood: 200, stone: 150, gold: 20 },
    cavalry:  { food: 200, wood: 0,   stone: 150, gold: 20 },
    siege:    { food: 135, wood: 135, stone: 100, gold: 20 },
  },
  '1->4': {
    infantry: { food: 250, wood: 250, stone: 0,   gold: 20 },
    archer:   { food: 0,   wood: 240, stone: 225, gold: 20 },
    cavalry:  { food: 240, wood: 0,   stone: 225, gold: 20 },
    siege:    { food: 140, wood: 140, stone: 150, gold: 20 },
  },
  '2->3': {
    infantry: { food: 50, wood: 50, stone: 0,  gold: 10 },
    archer:   { food: 0,  wood: 50, stone: 37, gold: 10 },
    cavalry:  { food: 50, wood: 0,  stone: 37, gold: 10 },
    siege:    { food: 35, wood: 35, stone: 25, gold: 10 },
  },
  '1->3': {
    infantry: { food: 100, wood: 100, stone: 0,   gold: 10 },
    archer:   { food: 0,   wood: 90,  stone: 112, gold: 10 },
    cavalry:  { food: 90,  wood: 0,   stone: 112, gold: 10 },
    siege:    { food: 40,  wood: 40,  stone: 75,  gold: 10 },
  },
  '1->2': {
    infantry: { food: 50, wood: 50, stone: 0,  gold: 0 },
    archer:   { food: 0,  wood: 40, stone: 75, gold: 0 },
    cavalry:  { food: 40, wood: 0,  stone: 75, gold: 0 },
    siege:    { food: 5,  wood: 5,  stone: 50, gold: 0 },
  },
}

/* ------------------------------------------------------------------ */
/*  UPGRADE PATHS (per-troop mge/kvk/power/time, infantry resource     */
/*  defaults kept for backward compat — use UPGRADE_COSTS for type-    */
/*  specific resource calculations)                                    */
/* ------------------------------------------------------------------ */

/* Pre-compute all upgrade paths */
const UPGRADE_PATHS: Record<string, UpgradeStats> = {
  '4->5': { fromTier: 4, toTier: 5, powerGain: 6, baseTime: 40,  food: 500, wood: 500, stone: 0, gold: 380, mgePoints: 60, kvkPoints: 12 },
  '3->5': { fromTier: 3, toTier: 5, powerGain: 7, baseTime: 60,  food: 650, wood: 650, stone: 0, gold: 390, mgePoints: 80, kvkPoints: 16 },
  '2->5': { fromTier: 2, toTier: 5, powerGain: 8, baseTime: 80,  food: 700, wood: 700, stone: 0, gold: 400, mgePoints: 90, kvkPoints: 18 },
  '1->5': { fromTier: 1, toTier: 5, powerGain: 9, baseTime: 115, food: 750, wood: 750, stone: 0, gold: 400, mgePoints: 95, kvkPoints: 19 },
  '3->4': { fromTier: 3, toTier: 4, powerGain: 1, baseTime: 20,  food: 150, wood: 150, stone: 0, gold: 10,  mgePoints: 20, kvkPoints: 4  },
  '2->4': { fromTier: 2, toTier: 4, powerGain: 2, baseTime: 50,  food: 200, wood: 200, stone: 0, gold: 20,  mgePoints: 30, kvkPoints: 6  },
  '1->4': { fromTier: 1, toTier: 4, powerGain: 3, baseTime: 65,  food: 250, wood: 250, stone: 0, gold: 20,  mgePoints: 35, kvkPoints: 7  },
  '2->3': { fromTier: 2, toTier: 3, powerGain: 1, baseTime: 30,  food: 50,  wood: 50,  stone: 0, gold: 10,  mgePoints: 10, kvkPoints: 2  },
  '1->3': { fromTier: 1, toTier: 3, powerGain: 2, baseTime: 45,  food: 100, wood: 100, stone: 0, gold: 10,  mgePoints: 5,  kvkPoints: 3  },
  '1->2': { fromTier: 1, toTier: 2, powerGain: 1, baseTime: 15,  food: 50,  wood: 50,  stone: 0, gold: 0,   mgePoints: 5,  kvkPoints: 3  },
}

export function getTroopStats(tier: Tier): TroopStats {
  return TROOP_STATS[tier]
}

export function getUpgradeStats(from: Tier, to: Tier): UpgradeStats | null {
  return UPGRADE_PATHS[`${from}->${to}`] ?? null
}

/** All possible training paths for a target tier */
export function getPathsForTier(targetTier: Tier): { label: string; key: string; from: Tier | null; to: Tier }[] {
  const paths: { label: string; key: string; from: Tier | null; to: Tier }[] = [
    { label: `T${targetTier}`, key: `train-${targetTier}`, from: null, to: targetTier },
  ]
  for (let f = targetTier - 1; f >= 1; f--) {
    paths.push({
      label: `T${f} -> T${targetTier}`,
      key: `${f}->${targetTier}`,
      from: f as Tier,
      to: targetTier,
    })
  }
  return paths
}

/* ------------------------------------------------------------------ */
/*  CALCULATION HELPERS                                                */
/* ------------------------------------------------------------------ */

export interface TrainingResult {
  troops: number
  time: number // in seconds
  food: number
  wood: number
  stone: number
  gold: number
  power: number
  mgePoints: number
  kvkPoints: number
}

/** Calculate results for training N troops from scratch */
export function calcTraining(
  tier: Tier,
  count: number,
  speedBonus: number,
  troopType: TroopType = 'infantry'
): TrainingResult {
  const stats = TROOP_STATS[tier]
  const costs = TRAINING_COSTS[tier][troopType]
  const speedMult = 1 + speedBonus / 100
  return {
    troops: count,
    time: Math.round((stats.baseTime * count) / speedMult),
    food: costs.food * count,
    wood: costs.wood * count,
    stone: costs.stone * count,
    gold: costs.gold * count,
    power: stats.power * count,
    mgePoints: stats.mgePoints * count,
    kvkPoints: stats.kvkPoints * count,
  }
}

/** Calculate results for upgrading N troops */
export function calcUpgrade(
  fromTier: Tier,
  toTier: Tier,
  count: number,
  speedBonus: number,
  troopType: TroopType = 'infantry'
): TrainingResult | null {
  const up = getUpgradeStats(fromTier, toTier)
  if (!up) return null
  const costs = UPGRADE_COSTS[`${fromTier}->${toTier}`]?.[troopType]
    ?? { food: up.food, wood: up.wood, stone: up.stone, gold: up.gold }
  const speedMult = 1 + speedBonus / 100
  return {
    troops: count,
    time: Math.round((up.baseTime * count) / speedMult),
    food: costs.food * count,
    wood: costs.wood * count,
    stone: costs.stone * count,
    gold: costs.gold * count,
    power: up.powerGain * count,
    mgePoints: up.mgePoints * count,
    kvkPoints: up.kvkPoints * count,
  }
}

/** Calculate how many troops you can train given speedups + resources */
export function calcFromSpeedups(
  tier: Tier,
  fromTier: Tier | null,
  speedBonus: number,
  speedupSeconds: number,
  resources: { food: number; wood: number; stone: number; gold: number },
  troopType: TroopType = 'infantry'
): TrainingResult {
  const baseStats = fromTier
    ? getUpgradeStats(fromTier, tier)
    : TROOP_STATS[tier]
  if (!baseStats) return { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }

  const typeCosts = fromTier
    ? (UPGRADE_COSTS[`${fromTier}->${tier}`]?.[troopType]
        ?? { food: baseStats.food, wood: baseStats.wood, stone: baseStats.stone, gold: baseStats.gold })
    : TRAINING_COSTS[tier][troopType]

  const speedMult = 1 + speedBonus / 100
  const timePerTroop = baseStats.baseTime / speedMult

  // Max from time
  const maxFromTime = timePerTroop > 0 ? Math.floor(speedupSeconds / timePerTroop) : Infinity

  // Max from each resource
  const limits: number[] = [maxFromTime]
  if (typeCosts.food > 0) limits.push(Math.floor(resources.food / typeCosts.food))
  if (typeCosts.wood > 0) limits.push(Math.floor(resources.wood / typeCosts.wood))
  if (typeCosts.stone > 0) limits.push(Math.floor(resources.stone / typeCosts.stone))
  if (typeCosts.gold > 0) limits.push(Math.floor(resources.gold / typeCosts.gold))

  const count = Math.max(0, Math.min(...limits))

  if (fromTier) {
    return calcUpgrade(fromTier, tier, count, speedBonus, troopType) ?? { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }
  }
  return calcTraining(tier, count, speedBonus, troopType)
}

/** Calculate how many troops needed for target MGE points */
export function calcFromMgePoints(
  tier: Tier,
  fromTier: Tier | null,
  speedBonus: number,
  targetPoints: number,
  troopType: TroopType = 'infantry'
): TrainingResult {
  const stats = fromTier
    ? getUpgradeStats(fromTier, tier)
    : TROOP_STATS[tier]
  if (!stats || stats.mgePoints <= 0) return { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }

  const count = Math.ceil(targetPoints / stats.mgePoints)

  if (fromTier) {
    return calcUpgrade(fromTier, tier, count, speedBonus, troopType) ?? { troops: 0, time: 0, food: 0, wood: 0, stone: 0, gold: 0, power: 0, mgePoints: 0, kvkPoints: 0 }
  }
  return calcTraining(tier, count, speedBonus, troopType)
}

/* ------------------------------------------------------------------ */
/*  TIME FORMATTING                                                    */
/* ------------------------------------------------------------------ */

export function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 && d === 0) parts.push(`${s}s`)
  return parts.join(' ') || '0s'
}

export const TROOP_TYPES: { id: TroopType; label: string; color: string }[] = [
  { id: 'infantry', label: 'Infantry', color: 'hsl(210, 80%, 60%)' },
  { id: 'archer', label: 'Archer', color: 'hsl(145, 70%, 50%)' },
  { id: 'cavalry', label: 'Cavalry', color: 'hsl(35, 90%, 55%)' },
  { id: 'siege', label: 'Siege', color: 'hsl(0, 75%, 60%)' },
]

export const TIERS: Tier[] = [5, 4, 3, 2, 1]
