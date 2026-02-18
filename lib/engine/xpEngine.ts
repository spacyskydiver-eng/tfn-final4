/* ------------------------------------------------------------------ */
/*  XP Engine — placeholder level XP model                             */
/* ------------------------------------------------------------------ */

/**
 * Simple, swappable XP model.
 *
 * This is intentionally NOT an exact RoK table. It just provides a
 * smooth increasing curve so the Commander Planner can function
 * end-to-end. Replace this implementation later with a real dataset
 * without touching UI components.
 */

const MAX_LEVEL = 60

/**
 * Approximate XP required to go from level N → N+1.
 * Uses a quadratic-ish curve that gets steeper at higher levels.
 */
export function getXpForNextLevel(level: number): number {
  if (level < 1 || level >= MAX_LEVEL) return 0

  // Base curve: a * level^2 + b * level + c
  const a = 150
  const b = 250
  const c = 600

  return Math.max(0, Math.round(a * level * level + b * level + c))
}

/**
 * Total XP required to go from currentLevel (inclusive) to targetLevel.
 *
 * Example: current=40, target=60 → sum of XP for levels [40..59].
 */
export function getXpToReachLevel(currentLevel: number, targetLevel: number): number {
  const start = Math.max(1, Math.min(currentLevel, MAX_LEVEL))
  const end = Math.max(1, Math.min(targetLevel, MAX_LEVEL))

  if (end <= start) return 0

  let total = 0
  for (let lvl = start; lvl < end; lvl++) {
    total += getXpForNextLevel(lvl)
  }
  return total
}

