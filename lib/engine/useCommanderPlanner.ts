/* ------------------------------------------------------------------ */
/*  Commander Planner State (per-profile, independent persistence)     */
/* ------------------------------------------------------------------ */

'use client'

import { useEffect, useState, useCallback } from 'react'
import type { CommanderSkillSet } from '@/lib/kvk-engine'
import type { CommanderGoal } from '@/lib/engine/types'

export type PlannerEquipmentSlot =
  | 'helmet'
  | 'weapon'
  | 'chest'
  | 'gloves'
  | 'boots'
  | 'accessory'

export type PlannerFormationType = 'pincer' | 'wedge' | 'line' | 'mixed' | 'other'

export type CommanderTalentConfig = {
  treeType: string
  nodes: Record<string, number>
}

export type PlannerCommanderSide = {
  level: number
  skills: CommanderSkillSet
  equipment: Partial<Record<PlannerEquipmentSlot, string>> // Equipment.id
  formation: PlannerFormationType | null
  ownedFlags: Partial<Record<PlannerEquipmentSlot, boolean>> // per-slot "already owned" for target
  /** Talent presets: 3 presets per commander, activePreset (1-3), presets map. */
  talentPresets?: {
    activePreset: 1 | 2 | 3
    presets: Record<1 | 2 | 3, CommanderTalentConfig>
  }
  /** Legacy: single talent config (for backward compatibility). */
  talentConfig?: CommanderTalentConfig
}

export type CommanderPlannerEntry = {
  commanderId: string
  commanderName: string
  rarity: 'legendary' | 'epic'
  current: PlannerCommanderSide
  target: PlannerCommanderSide
}

export type CommanderPlannerState = {
  selectedCommanderId?: string
  entries: CommanderPlannerEntry[]
}

function getStorageKey(profileId: string): string {
  return `commander_planner_v1_${profileId}`
}

function createDefaultSide(skills: CommanderSkillSet): PlannerCommanderSide {
  return {
    level: 40,
    skills,
    equipment: {},
    formation: null,
    ownedFlags: {},
  }
}

function createDefaultEntryFromCommander(cmd: CommanderGoal): CommanderPlannerEntry {
  return {
    commanderId: cmd.id,
    commanderName: cmd.name,
    rarity: cmd.rarity,
    current: createDefaultSide(cmd.currentSkills),
    target: {
      ...createDefaultSide(cmd.targetSkills),
      level: 60,
    },
  }
}

export function useCommanderPlanner(profileId: string | null, commanders: CommanderGoal[]) {
  const [state, setState] = useState<CommanderPlannerState>({ selectedCommanderId: undefined, entries: [] })
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage
  useEffect(() => {
    if (!profileId) return
    const key = getStorageKey(profileId)
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          setState({
            selectedCommanderId: parsed.selectedCommanderId,
            entries: Array.isArray(parsed.entries) ? parsed.entries : [],
          })
        } else {
          setState({ selectedCommanderId: undefined, entries: [] })
        }
      } else {
        setState({ selectedCommanderId: undefined, entries: [] })
      }
    } catch {
      setState({ selectedCommanderId: undefined, entries: [] })
    }
    setLoaded(true)
  }, [profileId])

  // Persist to localStorage
  useEffect(() => {
    if (!profileId || !loaded) return
    const key = getStorageKey(profileId)
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [profileId, state, loaded])

  // Keep planner entries in sync with investment commanders
  useEffect(() => {
    if (!loaded) return
    setState((prev) => {
      const existingById = new Map(prev.entries.map((e) => [e.commanderId, e]))
      const nextEntries: CommanderPlannerEntry[] = []

      for (const cmd of commanders) {
        const existing = existingById.get(cmd.id)
        if (existing) {
          nextEntries.push({
            ...existing,
            commanderName: cmd.name,
            rarity: cmd.rarity,
            target: {
              ...existing.target,
              // Always mirror investment target skills
              skills: cmd.targetSkills,
            },
          })
        } else {
          nextEntries.push(createDefaultEntryFromCommander(cmd))
        }
      }

      // Remove planner entries for commanders that no longer exist in investments
      const nextSelected =
        prev.selectedCommanderId && nextEntries.some((e) => e.commanderId === prev.selectedCommanderId)
          ? prev.selectedCommanderId
          : nextEntries[0]?.commanderId

      return { selectedCommanderId: nextSelected, entries: nextEntries }
    })
  }, [commanders, loaded])

  const selectCommander = useCallback((commanderId: string) => {
    setState((prev) => {
      if (!prev.entries.some((e) => e.commanderId === commanderId)) {
        return prev
      }
      return { ...prev, selectedCommanderId: commanderId }
    })
  }, [])

  const updateEntry = useCallback((commanderId: string, patch: Partial<CommanderPlannerEntry>) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.commanderId === commanderId ? { ...e, ...patch } : e)),
    }))
  }, [])

  const updateSide = useCallback(
    (commanderId: string, side: 'current' | 'target', patch: Partial<PlannerCommanderSide>) => {
      setState((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.commanderId === commanderId ? { ...e, [side]: { ...e[side], ...patch } } : e,
        ),
      }))
    },
    [],
  )

  const selectedEntry =
    state.selectedCommanderId != null
      ? state.entries.find((e) => e.commanderId === state.selectedCommanderId) ?? null
      : null

  return {
    loaded,
    state,
    selectedEntry,
    selectCommander,
    updateEntry,
    updateSide,
  }
}

