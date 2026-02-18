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
import { TALENT_TREES, getTalentTreeById } from '@/lib/game/talentTrees'
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
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Search, X, Shield } from 'lucide-react'

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

export function CommanderStatePanel({ mode, title, side, onChange, commanderName }: CommanderStatePanelProps) {
  const [activeSlot, setActiveSlot] = useState<PlannerEquipmentSlot | null>(null)
  const [search, setSearch] = useState('')
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level */}
        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-1">
            <Label className="text-xs">Formation</Label>
            <Select
              value={side.formation ?? undefined}
              onValueChange={(v) => onChange({ formation: v as PlannerFormationType })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select formation" />
              </SelectTrigger>
              <SelectContent>
                {formationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        {/* Talent editor */}
        {(() => {
          // Get commander talent trees
          const rokCommanderName = commanderName ? findCommanderInRokData(commanderName) : null
          const talentTrees = rokCommanderName ? getCommanderTalentTrees(rokCommanderName) : null

          // Use presets if available, otherwise fall back to legacy talentConfig
          const presets = side.talentPresets
          const activePreset = presets?.activePreset ?? 1
          const currentConfig: CommanderTalentConfig =
            presets?.presets[activePreset] ?? side.talentConfig ?? { treeType: 'skill', nodes: {} }

          // Get available trees for this commander
          const availableTrees = talentTrees
            ? [
                { id: talentTrees.red, color: 'red' as const },
                { id: talentTrees.yellow, color: 'yellow' as const },
                { id: talentTrees.blue, color: 'blue' as const },
              ]
            : []

          const handleTalentConfigChange = (newConfig: CommanderTalentConfig) => {
            if (presets) {
              // Update active preset
              const nextPresets = {
                ...presets,
                presets: {
                  ...presets.presets,
                  [activePreset]: newConfig,
                },
              }
              onChange({ talentPresets: nextPresets })
            } else {
              // Legacy: update talentConfig
              onChange({ talentConfig: newConfig })
            }
          }

          const handlePresetChange = (preset: 1 | 2 | 3) => {
            if (!presets) {
              // Initialize presets from legacy config
              const legacyConfig = side.talentConfig ?? { treeType: 'skill', nodes: {} }
              onChange({
                talentPresets: {
                  activePreset: preset,
                  presets: {
                    1: legacyConfig,
                    2: { treeType: 'skill', nodes: {} },
                    3: { treeType: 'skill', nodes: {} },
                  },
                },
              })
            } else {
              onChange({
                talentPresets: {
                  ...presets,
                  activePreset: preset,
                },
              })
            }
          }

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

          const currentTree = getTalentTreeById(currentConfig.treeType)
          if (!currentTree) {
            // Default to first available tree
            const defaultTreeId = availableTrees[0]?.id ?? 'skill'
            const defaultTree = getTalentTreeById(defaultTreeId)
            if (!defaultTree) {
              return null
            }
            handleTalentConfigChange({ treeType: defaultTreeId, nodes: {} })
            return null
          }

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Talents</Label>
                {/* Preset selector */}
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

              {/* Tree selector tabs */}
              <Tabs
                value={currentConfig.treeType}
                onValueChange={(treeId) => {
                  handleTalentConfigChange({ treeType: treeId, nodes: currentConfig.nodes })
                }}
              >
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
                    currentConfig.treeType === tree.id
                      ? currentConfig
                      : { treeType: tree.id, nodes: {} }

                  return (
                    <TabsContent key={tree.id} value={tree.id} className="mt-2">
                      <TalentTreeRenderer
                        tree={treeData}
                        config={treeConfig}
                        onConfigChange={handleTalentConfigChange}
                        color={tree.color}
                      />
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

