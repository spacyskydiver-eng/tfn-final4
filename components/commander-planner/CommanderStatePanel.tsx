'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { CommanderSkillSet } from '@/lib/kvk-engine'
import type {
  PlannerCommanderSide,
  PlannerEquipmentSlot,
  PlannerFormationType,
} from '@/lib/engine/useCommanderPlanner'
import { TALENT_TREES, getTalentTreeById, getTalentStatBonuses } from '@/lib/game/talentTrees'
import { findCommanderInRokData, getCommanderTalentTrees } from '@/lib/game/talents/commanderMapping'
import { TalentTreeRenderer } from './TalentTreeRenderer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CommanderTalentConfig } from '@/lib/engine/useCommanderPlanner'
import {
  EQUIPMENT_DB,
  type Equipment,
  type EquipmentSlot,
  RARITY_COLORS,
  STAT_LABELS,
} from '@/lib/game/equipment'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Search, X, Shield, ChevronRight, ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type CommanderStatePanelProps = {
  mode: 'current' | 'target'
  title: string
  side: PlannerCommanderSide
  onChange: (patch: Partial<PlannerCommanderSide>) => void
  commanderName?: string
}

const SKILL_LABELS = ['1st Skill', '2nd Skill', '3rd Skill', '4th Skill']

const formationOptions: { value: PlannerFormationType; label: string }[] = [
  { value: 'pincer', label: 'Pincer Formation' },
  { value: 'wedge', label: 'Wedge Formation' },
  { value: 'line', label: 'Line Formation' },
  { value: 'mixed', label: 'Mixed / Flexible' },
  { value: 'other', label: 'Other / Special' },
]

const plannerSlotToEquipmentSlot: Record<PlannerEquipmentSlot, EquipmentSlot> = {
  helmet: 'helmet',
  weapon: 'weapon',
  chest: 'chest',
  gloves: 'gloves',
  boots: 'boots',
  accessory: 'accessory_1',
}

const plannerSlotsInOrder: PlannerEquipmentSlot[] = ['helmet', 'weapon', 'chest', 'gloves', 'boots', 'accessory']

/** Normalize preset to byTree shape; migrates legacy single-config presets. */
function normalizePresetToByTree(
  preset: { byTree?: Record<string, CommanderTalentConfig> } | CommanderTalentConfig | undefined,
  treeIds: string[]
): { byTree: Record<string, CommanderTalentConfig> } {
  if (
    preset &&
    typeof preset === 'object' &&
    'byTree' in preset &&
    typeof (preset as { byTree: unknown }).byTree === 'object'
  ) {
    return preset as { byTree: Record<string, CommanderTalentConfig> }
  }
  const legacy = (preset as CommanderTalentConfig) ?? { treeType: 'skill', nodes: {} }
  const byTree: Record<string, CommanderTalentConfig> = {}
  for (const id of treeIds) {
    byTree[id] =
      legacy.treeType === id
        ? { treeType: id, nodes: { ...(legacy.nodes ?? {}) } }
        : { treeType: id, nodes: {} }
  }
  return { byTree }
}

function formatStatLabel(statKey: string): string {
  return (STAT_LABELS as Record<string, string>)[statKey] ?? statKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TalentEditorBlock({
  side,
  onChange,
  commanderName,
}: {
  side: PlannerCommanderSide
  onChange: (patch: Partial<PlannerCommanderSide>) => void
  commanderName?: string
}) {
  const [talentsOpen, setTalentsOpen] = useState(true)
  const rokCommanderName = commanderName ? findCommanderInRokData(commanderName) : null
  const talentTrees = rokCommanderName ? getCommanderTalentTrees(rokCommanderName) : null
  const availableTrees = useMemo(
    () =>
      talentTrees
        ? [
            { id: talentTrees.red, color: 'red' as const },
            { id: talentTrees.yellow, color: 'yellow' as const },
            { id: talentTrees.blue, color: 'blue' as const },
          ]
        : [],
    [talentTrees]
  )
  const treeIds = useMemo(() => availableTrees.map((t) => t.id), [availableTrees])

  const presets = side.talentPresets
  const activePreset = presets?.activePreset ?? 1
  const activePresetRaw = presets?.presets[activePreset]
  const activePresetData = useMemo(
    () => normalizePresetToByTree(activePresetRaw, treeIds),
    [activePresetRaw, treeIds]
  )
  const byTree = activePresetData.byTree

  const [currentTreeId, setCurrentTreeId] = useState(availableTrees[0]?.id ?? 'skill')
  const [overviewOpen, setOverviewOpen] = useState(true)
  const treeIdsKey = treeIds.join(',')
  useEffect(() => {
    if (treeIds.length && !treeIds.includes(currentTreeId)) {
      setCurrentTreeId(treeIds[0])
    }
  }, [treeIdsKey, currentTreeId, treeIds])

  const currentConfig: CommanderTalentConfig =
    byTree[currentTreeId] ?? { treeType: currentTreeId, nodes: {} }

  const handleTalentConfigChange = useCallback(
    (treeId: string, newConfig: CommanderTalentConfig) => {
      const nextByTree = { ...byTree, [treeId]: { treeType: treeId, nodes: { ...newConfig.nodes } } }
      if (presets) {
        onChange({
          talentPresets: {
            ...presets,
            presets: {
              ...presets.presets,
              [activePreset]: { byTree: nextByTree },
            },
          },
        })
      } else {
        const defaultByTree: Record<string, CommanderTalentConfig> = Object.fromEntries(
          treeIds.map((id) => [id, { treeType: id, nodes: {} }])
        )
        onChange({
          talentPresets: {
            activePreset: 1,
            presets: {
              1: { byTree: { ...defaultByTree, [treeId]: { treeType: treeId, nodes: { ...newConfig.nodes } } } },
              2: { byTree: defaultByTree },
              3: { byTree: defaultByTree },
            },
          },
        })
      }
    },
    [presets, activePreset, byTree, treeIds, onChange]
  )

  const handlePresetChange = useCallback(
    (preset: 1 | 2 | 3) => {
      if (!presets) {
        const legacyConfig = side.talentConfig ?? { treeType: 'skill', nodes: {} }
        const defaultByTree: Record<string, CommanderTalentConfig> = Object.fromEntries(
          treeIds.map((id) => [id, { treeType: id, nodes: {} }])
        )
        const byTree1 = {
          ...defaultByTree,
          [legacyConfig.treeType]: { treeType: legacyConfig.treeType, nodes: { ...legacyConfig.nodes } },
        }
        onChange({
          talentPresets: {
            activePreset: preset,
            presets: {
              1: { byTree: preset === 1 ? byTree1 : defaultByTree },
              2: { byTree: preset === 2 ? byTree1 : defaultByTree },
              3: { byTree: preset === 3 ? byTree1 : defaultByTree },
            },
          },
        })
      } else {
        onChange({ talentPresets: { ...presets, activePreset: preset } })
      }
    },
    [presets, side.talentConfig, treeIds, onChange]
  )

  if (availableTrees.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">Talents</Label>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-[10px] text-muted-foreground">
            Talent tree data not available for this commander.
          </p>
        </div>
      </div>
    )
  }

  const currentTreeData = getTalentTreeById(currentTreeId)
  if (!currentTreeData) {
    return null
  }

  const currentTreeBonuses = getTalentStatBonuses(currentConfig)
  const combinedBonuses: Record<string, number> = {}
  for (const config of Object.values(byTree)) {
    if (!config?.nodes) continue
    const bonus = getTalentStatBonuses(config)
    for (const [stat, value] of Object.entries(bonus)) {
      combinedBonuses[stat] = (combinedBonuses[stat] ?? 0) + value
    }
  }

  return (
    <Card>
      <Collapsible open={talentsOpen} onOpenChange={setTalentsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Talents</CardTitle>
              {talentsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Presets</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((preset) => (
            <Button
              key={preset}
              variant={activePreset === preset ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => handlePresetChange(preset as 1 | 2 | 3)}
            >
              {preset}
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={currentTreeId} onValueChange={(id) => setCurrentTreeId(id)}>
        <TabsList className="grid w-full grid-cols-3">
          {availableTrees.map((tree) => {
            const treeData = getTalentTreeById(tree.id)
            return (
              <TabsTrigger key={tree.id} value={tree.id} className="text-[10px]">
                {treeData?.name ?? tree.id}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {availableTrees.map((tree) => {
          const treeData = getTalentTreeById(tree.id)
          if (!treeData) return null
          const treeConfig: CommanderTalentConfig =
            byTree[tree.id] ?? { treeType: tree.id, nodes: {} }
          return (
            <TabsContent key={tree.id} value={tree.id} className="mt-2">
              <div className="flex gap-2">
                <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1 text-xs"
                    >
                      {overviewOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      Overview
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div
                      className="mt-1 w-48 shrink-0 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 text-[10px] transition-[height,max-height] duration-200 ease-out"
                      style={{ maxHeight: 320 }}
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {currentTreeData.name} Tree
                          </p>
                          <ul className="mt-1 space-y-0.5 text-muted-foreground">
                            {Object.entries(currentTreeBonuses)
                              .filter(([, v]) => v > 0)
                              .sort((a, b) => b[1] - a[1])
                              .map(([stat, value]) => (
                                <li key={stat}>
                                  {formatStatLabel(stat)} +{value}%
                                </li>
                              ))}
                            {Object.keys(currentTreeBonuses).filter((k) => currentTreeBonuses[k] > 0).length === 0 && (
                              <li className="italic">No bonuses yet</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Total Bonuses</p>
                          <ul className="mt-1 space-y-0.5 text-muted-foreground">
                            {Object.entries(combinedBonuses)
                              .filter(([, v]) => v > 0)
                              .sort((a, b) => b[1] - a[1])
                              .map(([stat, value]) => (
                                <li key={stat}>
                                  {formatStatLabel(stat)} +{value}%
                                </li>
                              ))}
                            {Object.keys(combinedBonuses).filter((k) => combinedBonuses[k] > 0).length === 0 && (
                              <li className="italic">No bonuses yet</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <div className="min-w-0 flex-1">
                  <TalentTreeRenderer
                    tree={treeData}
                    config={treeConfig}
                    onConfigChange={(newConfig) => handleTalentConfigChange(tree.id, newConfig)}
                    color={tree.color}
                  />
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function CommanderStatePanel({ mode, title, side, onChange, commanderName }: CommanderStatePanelProps) {
  const [activeSlot, setActiveSlot] = useState<PlannerEquipmentSlot | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(true)
  const allowSkillEdit = mode === 'current'

  const handleSkillChange = (index: number, value: number) => {
    if (!allowSkillEdit) return
    const clamped = Math.max(1, Math.min(5, value))
    const next: CommanderSkillSet = [...side.skills]
    next[index] = clamped
    onChange({ skills: next })
  }

  const handleEquip = (slot: PlannerEquipmentSlot, equipmentId: string | null) => {
    const next = { ...(side.equipment ?? {}) }
    if (equipmentId === null) {
      delete next[slot]
    } else {
      next[slot] = equipmentId
    }
    onChange({ equipment: next })
  }

  const handleOwnedToggle = (slot: PlannerEquipmentSlot, checked: boolean) => {
    const next = { ...(side.ownedFlags ?? {}) }
    if (checked) {
      next[slot] = true
    } else {
      delete next[slot]
    }
    onChange({ ownedFlags: next })
  }

  const visibleEquipment = useMemo(() => {
    if (!activeSlot) return []
    const actualSlot = plannerSlotToEquipmentSlot[activeSlot]
    let list = EQUIPMENT_DB.filter((eq) => eq.slot === actualSlot)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((eq) => eq.name.toLowerCase().includes(q))
    }
    return list
  }, [activeSlot, search])

  const currentEquipmentIdFor = (slot: PlannerEquipmentSlot): string | undefined =>
    side.equipment?.[slot]

  const currentEquipmentFor = (slot: PlannerEquipmentSlot): Equipment | undefined => {
    const id = currentEquipmentIdFor(slot)
    if (!id) return undefined
    return EQUIPMENT_DB.find((e) => e.id === id)
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{title}</CardTitle>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Level */}
            <div className="space-y-1">
              <Label className="text-xs">Commander Level</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={side.level}
                onChange={(e) => onChange({ level: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                className="h-8 text-sm"
              />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Skills</Label>
              <div className="grid grid-cols-4 gap-2">
                {SKILL_LABELS.map((label, i) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{label}</Label>
                    <Select
                      value={String(side.skills[i])}
                      onValueChange={allowSkillEdit ? (v) => handleSkillChange(i, Number(v)) : undefined}
                      disabled={!allowSkillEdit}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{side.skills.join('-')}</p>
            </div>

            {/* Equipment slots */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Equipment</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plannerSlotsInOrder.map((slot) => {
                  const eq = currentEquipmentFor(slot)
                  const owned = !!side.ownedFlags?.[slot]
                  const rc = eq ? RARITY_COLORS[eq.rarity] : null
                  return (
                    <div
                      key={slot}
                      className="flex items-start justify-between rounded-md border border-border bg-secondary/30 px-2.5 py-2 gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlot((prev) => (prev === slot ? null : slot))
                          setSearch('')
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={
                              rc
                                ? `flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-semibold ${rc.bg} ${rc.border} ${rc.text}`
                                : 'flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground'
                            }
                          >
                            <Shield className={`h-3.5 w-3.5 ${rc ? rc.text : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-foreground capitalize">
                              {slot === 'accessory' ? 'Accessory' : slot}
                            </span>
                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                              {eq ? eq.name : 'Select equipment'}
                            </span>
                          </div>
                        </div>
                        {eq && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {eq.stats.map((s) => (
                              <span key={s.type} className="text-[9px] text-muted-foreground">
                                {STAT_LABELS[s.type]}{' '}
                                <span className="text-green-400">+{s.value}%</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                      {mode === 'target' && (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <Checkbox
                              id={`${slot}-owned`}
                              checked={owned}
                              onCheckedChange={(val) => handleOwnedToggle(slot, Boolean(val))}
                              className="h-3.5 w-3.5"
                            />
                            <Label htmlFor={`${slot}-owned`} className="text-[10px] text-muted-foreground">
                              Already owned
                            </Label>
                          </div>
                          {eq && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleEquip(slot, null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Equipment selector (inline) */}
            {activeSlot && (
              <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Select {activeSlot === 'accessory' ? 'Accessory' : activeSlot}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => {
                      setActiveSlot(null)
                      setSearch('')
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-7 text-xs"
                    placeholder="Search equipment..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {visibleEquipment.length === 0 && (
                    <p className="py-4 text-center text-[11px] text-muted-foreground">
                      No items found for this slot.
                    </p>
                  )}
                  {visibleEquipment.map((eq) => {
                    const rc = RARITY_COLORS[eq.rarity]
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          handleEquip(activeSlot, eq.id)
                          if (mode === 'current') {
                            // current side: always treated as already owned
                            handleOwnedToggle(activeSlot, true)
                          }
                          setActiveSlot(null)
                          setSearch('')
                        }}
                        className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors ${rc.bg} ${rc.border}`}
                      >
                        <Shield className={`h-3.5 w-3.5 flex-shrink-0 ${rc.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold ${rc.text}`}>{eq.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {eq.stats.map((s) => (
                              <span key={s.type} className="text-[9px] text-muted-foreground">
                                {STAT_LABELS[s.type]}{' '}
                                <span className="text-green-400">+{s.value}%</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

