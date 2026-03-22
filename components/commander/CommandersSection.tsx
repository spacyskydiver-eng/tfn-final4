'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Crown, ChevronsUpDown, Check, TrendingUp, Shield, X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountProfile, CommanderGoal } from '@/lib/engine/types'
import type { CommanderSkillSet } from '@/lib/kvk-engine'
import { calcCommanderNeeds } from '@/lib/engine/commanderEngine'
import { getCommanderRoster, getCommanderSeasons, type CommanderEntry } from '@/lib/commander-data'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { EQUIPMENT_FORGE_SEED_ITEMS } from '@/lib/game/equipment-forge-seed'
import { RARITY_CONFIG, type ForgeRarity, type ForgeSlot } from '@/lib/game/equipment-forge-data'

/* ---- Searchable Commander Combobox ---- */

function CommanderCombobox({
  roster,
  value,
  onSelect,
}: {
  roster: CommanderEntry[]
  value: string
  onSelect: (name: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent font-normal"
        >
          {value || 'Select commander...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search commanders..." />
          <CommandList>
            <CommandEmpty>No commander found.</CommandEmpty>
            <CommandGroup>
              {roster.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.name}
                  onSelect={() => {
                    onSelect(entry.name)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === entry.name ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {entry.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function createDefaultCommander(name?: string): CommanderGoal {
  return {
    id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name || '',
    rarity: 'legendary',
    currentSkills: [5, 1, 1, 1],
    targetSkills: [5, 5, 1, 1],
    allocationPct: 100,
    currentEquipment: {},
    targetEquipment: {},
    currentEquipmentMeta: {},
    targetEquipmentMeta: {},
  }
}

/* ---- Craft time estimate ---- */

const CRAFT_MINUTES: Record<ForgeRarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 60,
  epic: 180,
  legendary: 480,
}

function craftTimeLabel(rarity: ForgeRarity): string {
  const mins = CRAFT_MINUTES[rarity]
  if (mins < 60) return `~${mins}m`
  const h = Math.round(mins / 60)
  return `~${h}h`
}

/* ---- Equipment section component ---- */

const EQUIP_SLOTS: ForgeSlot[] = ['helmet', 'weapon', 'chest', 'gloves', 'legs', 'boots', 'accessory']
const SLOT_LABEL: Record<ForgeSlot, string> = {
  helmet: 'Helmet', weapon: 'Weapon', chest: 'Chest',
  gloves: 'Gloves', legs: 'Legs', boots: 'Boots', accessory: 'Accessory',
}

function EquipmentSection({
  cmdId,
  currentEquipment,
  targetEquipment,
  currentMeta,
  targetMeta,
  onUpdateCurrent,
  onUpdateTarget,
  onUpdateCurrentMeta,
  onUpdateTargetMeta,
}: {
  cmdId: string
  currentEquipment: Record<string, string>
  targetEquipment: Record<string, string>
  currentMeta: Record<string, { refined: boolean; awakenLevel: number }>
  targetMeta: Record<string, { refined: boolean; awakenLevel: number }>
  onUpdateCurrent: (eq: Record<string, string>) => void
  onUpdateTarget: (eq: Record<string, string>) => void
  onUpdateCurrentMeta: (m: Record<string, { refined: boolean; awakenLevel: number }>) => void
  onUpdateTargetMeta: (m: Record<string, { refined: boolean; awakenLevel: number }>) => void
}) {
  const [activeSlot, setActiveSlot] = useState<ForgeSlot | null>(null)
  const [editMode, setEditMode] = useState<'current' | 'target'>('current')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(true)

  const getItem = (slot: ForgeSlot, mode: 'current' | 'target') => {
    const id = mode === 'current' ? currentEquipment[slot] : targetEquipment[slot]
    return id ? EQUIPMENT_FORGE_SEED_ITEMS.find((e) => e.id === id) : undefined
  }

  const getMeta = (slot: ForgeSlot, mode: 'current' | 'target') => {
    const m = mode === 'current' ? currentMeta[slot] : targetMeta[slot]
    return m ?? { refined: false, awakenLevel: 0 }
  }

  const setMeta = (slot: ForgeSlot, mode: 'current' | 'target', patch: Partial<{ refined: boolean; awakenLevel: number }>) => {
    const prev = getMeta(slot, mode)
    const next = { ...prev, ...patch }
    if (mode === 'current') {
      onUpdateCurrentMeta({ ...currentMeta, [slot]: next })
    } else {
      onUpdateTargetMeta({ ...targetMeta, [slot]: next })
    }
  }

  const visibleItems = activeSlot
    ? EQUIPMENT_FORGE_SEED_ITEMS.filter((e) => e.slot === activeSlot && (
        !search.trim() || e.name.toLowerCase().includes(search.toLowerCase())
      ))
    : []

  const handleEquipSelect = (itemId: string) => {
    if (!activeSlot) return
    if (editMode === 'current') {
      onUpdateCurrent({ ...currentEquipment, [activeSlot]: itemId })
    } else {
      onUpdateTarget({ ...targetEquipment, [activeSlot]: itemId })
    }
    setActiveSlot(null)
    setSearch('')
  }

  const handleClear = (slot: ForgeSlot, mode: 'current' | 'target') => {
    if (mode === 'current') {
      const next = { ...currentEquipment }; delete next[slot]; onUpdateCurrent(next)
    } else {
      const next = { ...targetEquipment }; delete next[slot]; onUpdateTarget(next)
    }
  }

  // Summary: how many target pieces differ from current + their total craft time
  const toCraft = EQUIP_SLOTS.filter((s) => targetEquipment[s] && targetEquipment[s] !== currentEquipment[s])
  const totalCraftMins = toCraft.reduce((sum, s) => {
    const item = getItem(s, 'target')
    return sum + (item ? CRAFT_MINUTES[item.rarity] : 0)
  }, 0)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-secondary/30 transition-colors">
        <Label className="text-xs font-medium cursor-pointer">Equipment</Label>
        <div className="flex items-center gap-2">
          {toCraft.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {toCraft.length} to craft · {totalCraftMins >= 60 ? `~${Math.round(totalCraftMins / 60)}h` : `~${totalCraftMins}m`}
            </span>
          )}
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        {/* Mode toggle */}
        <div className="flex gap-1">
          {(['current', 'target'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setEditMode(m); setActiveSlot(null) }}
              className={`text-[10px] px-2 py-1 rounded border transition-colors capitalize ${
                editMode === m
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Slots */}
        <div className="space-y-1.5">
          {EQUIP_SLOTS.map((slot) => {
            const item = getItem(slot, editMode)
            const meta = getMeta(slot, editMode)
            const rc = item ? RARITY_CONFIG[item.rarity] : null
            return (
              <div key={slot} className="rounded-md border border-border bg-secondary/30 px-2.5 py-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  {/* icon / placeholder */}
                  <button
                    type="button"
                    onClick={() => { setActiveSlot((p) => p === slot ? null : slot); setSearch('') }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md border overflow-hidden shrink-0"
                      style={rc ? { borderColor: rc.glowColor, background: rc.itemBg } : undefined}
                    >
                      {item?.iconUrl ? (
                        <img src={item.iconUrl} alt={item.name} className="h-7 w-7 object-contain" />
                      ) : (
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-muted-foreground">{SLOT_LABEL[slot]}</p>
                      {item ? (
                        <p className={`text-[11px] font-semibold line-clamp-1 ${rc?.nameCls}`}>{item.name}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60">Select equipment</p>
                      )}
                    </div>
                  </button>
                  {item && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-muted-foreground">{craftTimeLabel(item.rarity)}</span>
                      <button
                        type="button"
                        onClick={() => handleClear(slot, editMode)}
                        className="text-muted-foreground hover:text-destructive h-5 w-5 flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Refine / Awaken toggles — only when item is set */}
                {item && (
                  <div className="flex items-center gap-3 pl-10">
                    <button
                      type="button"
                      onClick={() => setMeta(slot, editMode, { refined: !meta.refined })}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        meta.refined
                          ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                          : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      Refined
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Awaken</span>
                      {[0, 1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setMeta(slot, editMode, { awakenLevel: lvl })}
                          className={`h-4 w-4 rounded-sm text-[9px] border transition-colors ${
                            meta.awakenLevel >= lvl && lvl > 0
                              ? 'border-purple-500 bg-purple-500/30 text-purple-300'
                              : lvl === 0 && meta.awakenLevel === 0
                              ? 'border-border bg-secondary/50 text-muted-foreground'
                              : 'border-border bg-secondary/30 text-muted-foreground/50 hover:bg-secondary/50'
                          }`}
                        >
                          {lvl === 0 ? '—' : lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Inline item picker */}
        {activeSlot && (
          <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Select {SLOT_LABEL[activeSlot]}</p>
              <button type="button" onClick={() => { setActiveSlot(null); setSearch('') }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-7 px-2 text-xs rounded border border-input bg-background"
            />
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {visibleItems.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-2">No equipment found.</p>
              )}
              {visibleItems.map((item) => {
                const rc = RARITY_CONFIG[item.rarity]
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleEquipSelect(item.id)}
                    className="w-full flex items-center gap-2 p-1.5 rounded text-left border transition-colors hover:opacity-80"
                    style={{ borderColor: rc.glowColor + '55', background: rc.itemBg }}
                  >
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt={item.name} className="h-6 w-6 object-contain rounded shrink-0" />
                    ) : (
                      <Shield className={`h-4 w-4 shrink-0 ${rc.nameCls}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-[10px] line-clamp-1 ${rc.nameCls}`}>{item.name}</div>
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0">{craftTimeLabel(item.rarity)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CommandersSection({
  profile,
  onUpdate,
  onNavigateToPlanner,
}: {
  profile: AccountProfile
  onUpdate: (p: AccountProfile) => void
  onNavigateToPlanner?: () => void
}) {
  const roster = useMemo(() => getCommanderRoster(), [])
  const skillLabels = ['1st Skill', '2nd Skill', '3rd Skill', '4th Skill']

  const addCommander = () => {
    const cmd = createDefaultCommander()
    const cmds = [...profile.commanders, cmd]
    const pctEach = Math.floor(100 / cmds.length)
    const balanced = cmds.map((c, i) => ({
      ...c,
      allocationPct: i === cmds.length - 1 ? 100 - pctEach * (cmds.length - 1) : pctEach,
    }))
    onUpdate({ ...profile, commanders: balanced })
  }

  const removeCommander = (id: string) => {
    const cmds = profile.commanders.filter((c) => c.id !== id)
    if (cmds.length > 0) {
      const pctEach = Math.floor(100 / cmds.length)
      const balanced = cmds.map((c, i) => ({
        ...c,
        allocationPct: i === cmds.length - 1 ? 100 - pctEach * (cmds.length - 1) : pctEach,
      }))
      onUpdate({ ...profile, commanders: balanced })
    } else {
      onUpdate({ ...profile, commanders: [] })
    }
  }

  const updateCommander = (id: string, patch: Partial<CommanderGoal>) => {
    onUpdate({
      ...profile,
      commanders: profile.commanders.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const updateSkill = (id: string, type: 'current' | 'target', index: number, value: number) => {
    const cmd = profile.commanders.find((c) => c.id === id)
    if (!cmd) return
    const arr = type === 'current' ? [...cmd.currentSkills] : [...cmd.targetSkills]
    arr[index] = Math.max(1, Math.min(5, value))
    updateCommander(
      id,
      type === 'current'
        ? { currentSkills: arr as CommanderSkillSet }
        : { targetSkills: arr as CommanderSkillSet },
    )
  }

  const updateAllocation = (id: string, value: number) => {
    const others = profile.commanders.filter((c) => c.id !== id)
    const remaining = 100 - value
    const otherTotal = others.reduce((s, c) => s + c.allocationPct, 0) || 1
    const updated = profile.commanders.map((c) => {
      if (c.id === id) return { ...c, allocationPct: value }
      const ratio = c.allocationPct / otherTotal
      return { ...c, allocationPct: Math.max(0, Math.round(remaining * ratio)) }
    })
    const total = updated.reduce((s, c) => s + c.allocationPct, 0)
    if (total !== 100 && updated.length > 1) {
      const last = updated.find((c) => c.id !== id)
      if (last) last.allocationPct += 100 - total
    }
    onUpdate({ ...profile, commanders: updated })
  }

  return (
    <div className="space-y-6">
      {profile.commanders.length > 0 && onNavigateToPlanner && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Want gear, formation, and level planning? Open the <span className="font-medium text-foreground">Planner</span> tab to simulate upgrades and completion dates.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onNavigateToPlanner}>
            <TrendingUp className="h-3.5 w-3.5" />
            Planner tab
          </Button>
        </div>
      )}
      {profile.commanders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Crown className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No commanders added yet. Add a commander to start planning gold head investments.
            </p>
            <Button onClick={addCommander} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Commander
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
{profile.commanders.map((cmd) => {
  const calc = calcCommanderNeeds(cmd)

  // Treat "Current Gold Heads" as universal heads available to invest.
  // Distribute by allocation across commanders.
  const universalPool = Math.max(0, Number(profile.currentGoldHeads ?? 0))

  const allocatedUniversal =
    profile.commanders.length <= 1
      ? universalPool
      : Math.floor(universalPool * (cmd.allocationPct / 100))

  // Display "Needed" as remaining after applying allocated universal heads
  const neededAfterUniversal = Math.max(0, calc.needed - allocatedUniversal)

  // Display "Invested" as skill-invested + universal allocated (coverage)
  const investedDisplay = calc.invested + Math.min(calc.needed, allocatedUniversal)

  // Keep total the same (skill total requirement)
  const totalDisplay = calc.total

  const pct =
    totalDisplay > 0 ? Math.min(100, Math.round((investedDisplay / totalDisplay) * 100)) : 0


            return (
              <Card key={cmd.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Crown className="h-4 w-4 text-primary" />
                      {cmd.name || 'Unnamed Commander'}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCommander(cmd.id)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Commander Name</Label>
                    <CommanderCombobox
                      roster={roster}
                      value={cmd.name}
                      onSelect={(name) => updateCommander(cmd.id, { name, rarity: 'legendary' })}
                    />
                    {cmd.name && (() => {
                      const seasons = getCommanderSeasons(cmd.name, roster)
                      if (seasons.length === 0) return null
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground">Appears in:</span>
                          {seasons.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Skill levels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Current Skills</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {skillLabels.map((label, i) => (
                          <div key={`cur-${cmd.id}-${label}`} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{label}</Label>
                            <Select
                              value={String(cmd.currentSkills[i])}
                              onValueChange={(v) => updateSkill(cmd.id, 'current', i, Number(v))}
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
                      <p className="text-[10px] text-muted-foreground">{cmd.currentSkills.join('-')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Target Skills</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {skillLabels.map((label, i) => (
                          <div key={`tgt-${cmd.id}-${label}`} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{label}</Label>
                            <Select
                              value={String(cmd.targetSkills[i])}
                              onValueChange={(v) => updateSkill(cmd.id, 'target', i, Number(v))}
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
                      <p className="text-[10px] text-muted-foreground">{cmd.targetSkills.join('-')}</p>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="grid grid-cols-3 gap-3 text-center mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Invested</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{investedDisplay}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Needed</p>
                        <p className="text-sm font-bold text-primary tabular-nums">{neededAfterUniversal}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{totalDisplay}</p>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-[10px] text-muted-foreground text-center mt-1">{pct}% complete</p>
                  </div>

                  {/* Allocation */}
                  {profile.commanders.length > 1 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Gold Head Allocation</Label>
                        <span className="text-xs font-semibold text-primary tabular-nums">{cmd.allocationPct}%</span>
                      </div>
                      <Slider
                        value={[cmd.allocationPct]}
                        onValueChange={([v]) => updateAllocation(cmd.id, v)}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                  )}

                  {/* Equipment Section */}
                  <EquipmentSection
                    cmdId={cmd.id}
                    currentEquipment={cmd.currentEquipment || {}}
                    targetEquipment={cmd.targetEquipment || {}}
                    currentMeta={cmd.currentEquipmentMeta || {}}
                    targetMeta={cmd.targetEquipmentMeta || {}}
                    onUpdateCurrent={(eq) => updateCommander(cmd.id, { currentEquipment: eq })}
                    onUpdateTarget={(eq) => updateCommander(cmd.id, { targetEquipment: eq })}
                    onUpdateCurrentMeta={(m) => updateCommander(cmd.id, { currentEquipmentMeta: m })}
                    onUpdateTargetMeta={(m) => updateCommander(cmd.id, { targetEquipmentMeta: m })}
                  />
                </CardContent>
              </Card>
            )
          })}

          <Button onClick={addCommander} variant="outline" className="gap-2 w-full bg-transparent">
            <Plus className="h-4 w-4" />
            Add Another Commander
          </Button>
        </>
      )}
    </div>
  )
}
