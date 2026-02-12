/* ------------------------------------------------------------------ */
/*  Income Engine — VIP income and total head projection               */
/* ------------------------------------------------------------------ */

import { VIP_HEADS_PER_DAY } from '@/lib/kvk-engine'
export { VIP_HEADS_PER_DAY }

export function calcVipHeads(vipLevel: number, daysUntilGoal: number): number {
  const perDay = VIP_HEADS_PER_DAY[vipLevel] ?? 0
  return perDay * daysUntilGoal
}

export function calcTotalProjectedHeads(
  vipHeads: number,
  eventHeads: number,
  mtgHeads: number,
  wheelHeads: number,
): number {
  return vipHeads + eventHeads + mtgHeads + wheelHeads
}
