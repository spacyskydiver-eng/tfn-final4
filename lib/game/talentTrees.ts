/* ------------------------------------------------------------------ */
/*  Talent Trees — public data interface                               */
/* ------------------------------------------------------------------ */

// Thin wrapper around the underlying talents module. This file exists
// so other features can depend on a stable, data-driven talent tree
// API without caring about how the data is loaded under the hood.

import {
  TALENT_TREES,
  getTalentTreeById,
  getTalentStatBonuses,
  type TalentTree,
  type TalentNode,
  type CommanderTalentConfig,
} from './talents'

export type { TalentTree, TalentNode, CommanderTalentConfig }

export { TALENT_TREES, getTalentTreeById, getTalentStatBonuses }

