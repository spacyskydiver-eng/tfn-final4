'use client'

// Small wrapper so the planner can depend on a stable
// <TalentTreeRenderer /> API while the underlying implementation
// lives in TalentTreeGraph.

export { TalentTreeGraph as TalentTreeRenderer } from './TalentTreeGraph'

