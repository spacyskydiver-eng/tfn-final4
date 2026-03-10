'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  Save, Check, Sword, Layers, Package, AlertCircle,
  Search, ArrowUp, ArrowDown, Minus, RotateCcw, Camera, Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  type ForgeItem, type ForgeState, type EquipmentSet,
  type ForgeRarity, type ForgeSlot, type ForgeFilter,
  type EquipmentAttribute, type IconicAttribute, type ForgeMaterial,
  type AttributeColor,
  FORGE_MATERIAL_DEFS, RARITY_CONFIG, SLOT_CONFIG, FORGE_FILTERS,
  ATTRIBUTE_COLORS, BUNDLE_ICON_OPTIONS,
  loadForgeState, saveForgeState,
} from '@/lib/game/equipment-forge-data'
import { EQUIPMENT_FORGE_SEED_ITEMS } from '@/lib/game/equipment-forge-seed'
import { EQUIPMENT_SETS } from '@/lib/game/equipment-sets-data'
import { ICONIC_DATA } from '@/lib/game/equipment-iconics-data'
import type { KvkSeason } from '@/lib/game/equipment-iconics-data'

/* ================================================================== */
/*  SHARED HELPERS                                                     */
/* ================================================================== */

function uid() { return `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function formatStatName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getTroopType(key: string): string {
  if (key.startsWith('infantry')) return 'infantry'
  if (key.startsWith('cavalry'))  return 'cavalry'
  if (key.startsWith('archer'))   return 'archer'
  if (key.startsWith('siege'))    return 'siege'
  return 'general'
}

function getRefinedBonus(value: number): number {
  return Math.round(value * 0.3 * 2) / 2
}

function toRoman(n: number): string {
  return (['', 'I', 'II', 'III', 'IV', 'V'] as const)[n] ?? ''
}

/* ================================================================== */
/*  CALCULATOR TYPES & CONSTANTS                                       */
/* ================================================================== */

type SlotKey = 'helmet' | 'weapon' | 'chest' | 'gloves' | 'legs' | 'boots' | 'accessory1' | 'accessory2'
interface LoadoutItem { id: string; refined: boolean; awakenLevel: number }
type Loadout = Partial<Record<SlotKey, LoadoutItem>>
interface TotalStats {
  stats: Record<string, number>
  special: Record<string, boolean>
  iconicBonusesByTier: Record<number, Record<string, string | boolean>>
}

const SLOT_ORDER: SlotKey[] = ['helmet', 'weapon', 'chest', 'gloves', 'legs', 'boots', 'accessory1', 'accessory2']

const SLOT_PLACEHOLDERS: Record<SlotKey, string> = {
  helmet:     '/images/equipment/mat_icons/helmet_slot.webp',
  weapon:     '/images/equipment/mat_icons/weapon_slot.webp',
  chest:      '/images/equipment/mat_icons/chest_slot.webp',
  gloves:     '/images/equipment/mat_icons/glove_slot.webp',
  legs:       '/images/equipment/mat_icons/leggings_slot.webp',
  boots:      '/images/equipment/mat_icons/boots_slot.webp',
  accessory1: '/images/equipment/mat_icons/accessory1_slot.webp',
  accessory2: '/images/equipment/mat_icons/accessory2_slot.webp',
}

const SLOT_LABELS: Record<SlotKey, string> = {
  helmet: 'Helmet', weapon: 'Weapon', chest: 'Chest', gloves: 'Gloves',
  legs: 'Legs', boots: 'Boots', accessory1: 'Accessory 1', accessory2: 'Accessory 2',
}

const RARITY_COLORS: Record<string, string> = {
  Normal: 'text-zinc-400', Advanced: 'text-green-400',
  Elite: 'text-blue-400', Epic: 'text-purple-400', Legendary: 'text-amber-400',
}

const RARITY_BORDER: Record<string, string> = {
  Normal: 'border-zinc-600', Advanced: 'border-green-600',
  Elite: 'border-blue-600', Epic: 'border-purple-600', Legendary: 'border-amber-600',
}

const RARITY_BG: Record<string, string> = {
  Normal: 'bg-zinc-800/60', Advanced: 'bg-green-900/30',
  Elite: 'bg-blue-900/30', Epic: 'bg-purple-900/30', Legendary: 'bg-amber-900/30',
}

// Approximate refine costs per rarity — verify exact values in-game
const REFINE_COSTS: Record<string, { stones: number; gold: number }> = {
  common:    { stones: 1, gold: 500_000 },
  uncommon:  { stones: 2, gold: 1_000_000 },
  rare:      { stones: 3, gold: 2_000_000 },
  epic:      { stones: 4, gold: 4_000_000 },
  legendary: { stones: 5, gold: 5_000_000 },
}
// Approximate awaken costs per tier (legendary items) — verify exact values in-game
const AWAKEN_TIER_COSTS = [
  { legendary_mats: 30,  gold: 5_000_000 },   // Tier I
  { legendary_mats: 70,  gold: 10_000_000 },  // Tier II
  { legendary_mats: 120, gold: 20_000_000 },  // Tier III
  { legendary_mats: 200, gold: 30_000_000 },  // Tier IV
  { legendary_mats: 300, gold: 50_000_000 },  // Tier V
]

const TROOP_COLORS: Record<string, string> = {
  infantry: 'text-red-400', cavalry: 'text-orange-400',
  archer: 'text-pink-400', siege: 'text-purple-400', general: 'text-green-400',
}

const TROOP_ICONS: Record<string, string> = {
  infantry: '/images/equipment/mat_icons/infantry_icon_mini.webp',
  cavalry:  '/images/equipment/mat_icons/cavalry_icon_mini.webp',
  archer:   '/images/equipment/mat_icons/archer_icon_mini.webp',
  siege:    '/images/equipment/mat_icons/siege_icon_mini.webp',
}

const MAT_ICONS: Record<string, string> = {
  leather: '/images/equipment/mat_icons/leather_legendary.webp',
  iron:    '/images/equipment/mat_icons/ore_legendary.webp',
  ebony:   '/images/equipment/mat_icons/ebony_legendary.webp',
  bone:    '/images/equipment/mat_icons/bone_legendary.webp',
}

const MATS = ['leather', 'iron', 'ebony', 'bone'] as const

const KVK_SEASONS: { value: KvkSeason; label: string }[] = [
  { value: 'kvk1_2', label: 'KvK 1-2' },
  { value: 'kvk3',   label: 'KvK 3' },
  { value: 'soc',    label: 'SoC' },
]

/* ================================================================== */
/*  CALCULATOR ENGINE                                                  */
/* ================================================================== */

function calcLoadoutStats(loadout: Loadout, kvkSeason: KvkSeason = 'soc'): TotalStats {
  const totalStats: Record<string, number> = {}
  const specialStats: Record<string, boolean> = {}
  const tempAgg: Record<number, Record<string, { value: number; isPercent: boolean }>> = {
    1: {}, 2: {}, 3: {}, 4: {}, 5: {},
  }
  const iconicBonusesByTier: Record<number, Record<string, string | boolean>> = {
    1: {}, 2: {}, 3: {}, 4: {}, 5: {},
  }

  const equippedPieces = Object.values(loadout).filter(Boolean) as LoadoutItem[]
  const equippedIds = equippedPieces.map(i => i.id)

  equippedPieces.forEach(item => {
    const data = EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === item.id)
    if (!data) return

    data.attributes.forEach(attr => {
      const numVal = parseFloat(attr.value.replace(/[^0-9.-]/g, ''))
      if (isNaN(numVal)) return
      const key = attr.label.toLowerCase().replace(/ /g, '_')
      totalStats[key] = (totalStats[key] ?? 0) + numVal
      if (item.refined) totalStats[key] += getRefinedBonus(numVal)
    })

    if (data.specialTalent) {
      data.specialTalent.split(', ').forEach(s => { specialStats[s] = true })
    }

    const iconicInfo = ICONIC_DATA[data.name] ?? null
    if (iconicInfo && item.awakenLevel > 0) {
      for (let i = 1; i <= item.awakenLevel; i++) {
        const tier = iconicInfo.tiers[String(i)]
        if (!tier) continue
        const statName = tier.stat ? formatStatName(tier.stat) : null
        switch (tier.type) {
          case 'base_stat': {
            const v = (tier.values?.[kvkSeason] ?? 0) + (item.refined && typeof tier.crit_bonus === 'number' ? tier.crit_bonus : 0)
            if (statName) {
              if (!tempAgg[i][statName]) tempAgg[i][statName] = { value: 0, isPercent: false }
              tempAgg[i][statName].value += v
            }
            break
          }
          case 'percent_stat': {
            const v = (tier.value ?? 0) + (item.refined && typeof tier.crit_buff === 'number' ? tier.crit_buff : 0)
            if (statName) {
              if (!tempAgg[i][statName]) tempAgg[i][statName] = { value: 0, isPercent: true }
              tempAgg[i][statName].value += v
              tempAgg[i][statName].isPercent = true
            }
            break
          }
          case 'flat_stat': {
            const v = (tier.value ?? 0) + (item.refined && typeof tier.crit_buff === 'number' ? Math.round(tier.crit_buff / 10) * 10 : 0)
            if (statName) {
              if (!tempAgg[i][statName]) tempAgg[i][statName] = { value: 0, isPercent: false }
              tempAgg[i][statName].value += v
            }
            break
          }
          case 'special': {
            let desc = tier.description ?? ''
            if (tier.values) {
              Object.entries(tier.values).forEach(([k, val]) => {
                let v: number = val as number
                if (item.refined && typeof tier.crit_bonus === 'object' && tier.crit_bonus !== null) {
                  v += (tier.crit_bonus as Record<string, number>)[k] ?? 0
                }
                desc = desc.replace(`{${k}}`, String(v))
              })
            }
            iconicBonusesByTier[i][desc] = true
            break
          }
        }
      }
    }
  })

  for (let i = 1; i <= 5; i++) {
    Object.entries(tempAgg[i]).forEach(([name, d]) => {
      if (d.value > 0) {
        iconicBonusesByTier[i][name] = d.isPercent
          ? `+${parseFloat(d.value.toFixed(1))}%`
          : `+${d.value.toLocaleString()}`
      }
    })
  }

  EQUIPMENT_SETS.forEach(set => {
    const count = set.pieces.filter(p => equippedIds.includes(p)).length
    set.bonuses.forEach(bonus => {
      if (count >= bonus.count) {
        specialStats[`[${count}/${set.pieces.length}] ${set.name}: ${bonus.description}`] = true
      }
    })
  })

  const troopTypes = ['infantry', 'cavalry', 'archer', 'siege'] as const
  ;(['attack', 'defense', 'health'] as const).forEach(st => {
    const u = `troop_${st}`
    if (totalStats[u]) {
      troopTypes.forEach(t => { totalStats[`${t}_${st}`] = (totalStats[`${t}_${st}`] ?? 0) + totalStats[u] })
      delete totalStats[u]
    }
  })

  return { stats: totalStats, special: specialStats, iconicBonusesByTier }
}

function calcLoadoutMaterials(loadout: Loadout): Record<typeof MATS[number], number> & { gold: number } {
  const totals = { leather: 0, iron: 0, ebony: 0, bone: 0, gold: 0 }
  Object.values(loadout).filter(Boolean).forEach(item => {
    const data = EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === (item as LoadoutItem).id)
    if (!data) return
    data.materials.forEach(m => {
      const k = m.materialId as typeof MATS[number]
      if (k in totals) totals[k] += m.amount
    })
    totals.gold += data.goldCost
  })
  return totals
}

/* ================================================================== */
/*  FORGE: ICON PICKER MODAL                                           */
/* ================================================================== */

function IconPickerModal({
  current, onSelect, onClose,
}: { current?: string; onSelect: (path: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState(current?.startsWith('/images') ? '' : current ?? '')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Choose Equipment Icon</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Pick from bundle images</p>
            <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
              {BUNDLE_ICON_OPTIONS.map(opt => (
                <button key={opt.path} onClick={() => onSelect(opt.path)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all hover:border-primary/60',
                    current === opt.path ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30',
                  )}>
                  <Image src={opt.path} alt={opt.label} width={36} height={36} className="object-contain" />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Or paste a custom image URL..." value={custom}
              onChange={e => setCustom(e.target.value)} className="text-sm" />
            <Button size="sm" onClick={() => { if (custom.trim()) onSelect(custom.trim()) }}
              disabled={!custom.trim()}>Use URL</Button>
          </div>
          {current && (
            <div className="flex items-center gap-3">
              <Image src={current} alt="current" width={48} height={48} className="object-contain rounded" />
              <span className="text-xs text-muted-foreground">Current icon</span>
              <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300"
                onClick={() => onSelect('')}>Remove</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  FORGE: ITEM DETAILS PANEL                                          */
/* ================================================================== */

function ItemDetailsPanel({
  item, set, onEdit, onDelete,
}: {
  item: ForgeItem
  set: EquipmentSet | null
  onEdit: () => void
  onDelete: () => void
}) {
  const rc = RARITY_CONFIG[item.rarity]
  const [setOpen, setSetOpen] = useState(false)

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto pr-1">
      <h2 className={cn('text-xl font-bold leading-tight', rc.nameCls)}>{item.name}</h2>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', rc.badgeBg, rc.badgeText)}>
          {rc.label}
        </span>
        <span className="text-sm text-foreground font-semibold">Equipment Level {item.equipmentLevel}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Equipment Slot: <span className="text-foreground">{SLOT_CONFIG[item.slot].label}</span>
      </p>
      {item.attributes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment Attributes</p>
          {item.attributes.map((attr, i) => {
            const ac = ATTRIBUTE_COLORS[attr.color]
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full flex-shrink-0', ac.dot)} />
                <span className="text-sm text-foreground">{attr.label}</span>
                <span className={cn('text-sm font-bold ml-auto', ac.text)}>{attr.value}</span>
              </div>
            )
          })}
        </div>
      )}
      {item.specialTalent && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Special Talent</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.specialTalent}</p>
        </div>
      )}
      {item.iconicAttributes && item.iconicAttributes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Iconic Attributes</p>
            <AlertCircle className="h-3 w-3 text-muted-foreground/50" />
          </div>
          {item.iconicAttributes.map((ia, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0 mt-0.5">{ia.tier}</span>
              <span className={cn('text-sm', ia.isSkill ? 'underline text-blue-300 cursor-pointer' : 'text-foreground')}>
                {ia.description}
              </span>
            </div>
          ))}
        </div>
      )}
      {set && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Set Effects</p>
          <button onClick={() => setSetOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}>
            <span>{set.name}</span>
            {setOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {setOpen && (
            <div className="space-y-1 pl-2">
              {set.bonuses.map((b, i) => (
                <p key={i} className="text-xs text-foreground">
                  <span className="text-muted-foreground">{b.pieces} pieces: </span>
                  <span className="font-semibold">{b.description}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 mt-auto pt-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button size="sm" variant="outline"
          className="gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  FORGE: ITEM EDITOR MODAL                                           */
/* ================================================================== */

const BLANK_ITEM = (): ForgeItem => ({
  id: uid(), name: '', slot: 'weapon', rarity: 'epic', equipmentLevel: 30,
  canForge: false, iconUrl: '', attributes: [], specialTalent: '',
  iconicAttributes: [], materials: [], goldCost: 0,
})

function ItemEditorModal({
  item, sets, onSave, onClose,
}: { item: ForgeItem | null; sets: EquipmentSet[]; onSave: (item: ForgeItem) => void; onClose: () => void }) {
  const [form, setForm] = useState<ForgeItem>(() => item ? { ...item } : BLANK_ITEM())
  const [showIconPicker, setShowIconPicker] = useState(false)
  const up = (patch: Partial<ForgeItem>) => setForm(f => ({ ...f, ...patch }))

  const addAttr = () => up({ attributes: [...form.attributes, { label: '', value: '', color: 'green' }] })
  const setAttr = (i: number, patch: Partial<EquipmentAttribute>) =>
    up({ attributes: form.attributes.map((a, j) => j === i ? { ...a, ...patch } : a) })
  const removeAttr = (i: number) => up({ attributes: form.attributes.filter((_, j) => j !== i) })

  const addIconic = () => {
    const tiers: IconicAttribute['tier'][] = ['I', 'II', 'III', 'IV', 'V']
    const next = tiers[form.iconicAttributes?.length ?? 0] ?? 'I'
    up({ iconicAttributes: [...(form.iconicAttributes ?? []), { tier: next, description: '', isSkill: false }] })
  }
  const setIconic = (i: number, patch: Partial<IconicAttribute>) =>
    up({ iconicAttributes: (form.iconicAttributes ?? []).map((a, j) => j === i ? { ...a, ...patch } : a) })
  const removeIconic = (i: number) =>
    up({ iconicAttributes: (form.iconicAttributes ?? []).filter((_, j) => j !== i) })

  const addMat = () => up({ materials: [...form.materials, { materialId: 'epic_mat', amount: 1 }] })
  const setMat = (i: number, patch: Partial<ForgeMaterial>) =>
    up({ materials: form.materials.map((m, j) => j === i ? { ...m, ...patch } : m) })
  const removeMat = (i: number) => up({ materials: form.materials.filter((_, j) => j !== i) })

  const canSave = form.name.trim().length > 0

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pr-1">
          <div className="flex gap-3 items-start">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Equipment Name</Label>
              <Input value={form.name} onChange={e => up({ name: e.target.value })}
                placeholder="e.g. Lance of the Hellish Wasteland" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Icon</Label>
              <button onClick={() => setShowIconPicker(true)}
                className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/60 transition-colors overflow-hidden bg-secondary/30">
                {form.iconUrl
                  ? <Image src={form.iconUrl} alt="icon" width={44} height={44} className="object-contain" />
                  : <Plus className="h-5 w-5 text-muted-foreground" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Slot</Label>
              <Select value={form.slot} onValueChange={v => up({ slot: v as ForgeSlot })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SLOT_CONFIG) as ForgeSlot[]).map(s => (
                    <SelectItem key={s} value={s}>{SLOT_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rarity</Label>
              <Select value={form.rarity} onValueChange={v => up({ rarity: v as ForgeRarity })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as ForgeRarity[]).map(r => (
                    <SelectItem key={r} value={r}>{RARITY_CONFIG[r].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Equipment Level</Label>
              <Input type="number" min={1} max={100} value={form.equipmentLevel}
                onChange={e => up({ equipmentLevel: Number(e.target.value) || 1 })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Set (optional)</Label>
            <Select value={form.setId ?? 'none'} onValueChange={v => up({ setId: v === 'none' ? undefined : v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Set</SelectItem>
                {sets.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Equipment Attributes</Label>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={addAttr}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {form.attributes.map((attr, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={attr.label} onChange={e => setAttr(i, { label: e.target.value })}
                  placeholder="Cavalry Attack" className="flex-1 h-8 text-sm" />
                <Input value={attr.value} onChange={e => setAttr(i, { value: e.target.value })}
                  placeholder="+20%" className="w-20 h-8 text-sm" />
                <Select value={attr.color} onValueChange={v => setAttr(i, { color: v as AttributeColor })}>
                  <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ATTRIBUTE_COLORS) as AttributeColor[]).map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-1.5">
                          <div className={cn('h-2.5 w-2.5 rounded-full', ATTRIBUTE_COLORS[c].dot)} />
                          <span className="capitalize">{c}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button onClick={() => removeAttr(i)} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Special Talent (optional)</Label>
            <Textarea value={form.specialTalent ?? ''} onChange={e => up({ specialTalent: e.target.value })}
              placeholder="When forging a piece of equipment, it may gain a special talent effect..."
              rows={3} className="text-sm resize-none" />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Iconic Attributes (optional)</Label>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={addIconic}
                disabled={(form.iconicAttributes?.length ?? 0) >= 5}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {(form.iconicAttributes ?? []).map((ia, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0">{ia.tier}</span>
                <Input value={ia.description} onChange={e => setIconic(i, { description: e.target.value })}
                  placeholder="Siege Unit Base Attack +1" className="flex-1 h-8 text-sm" />
                <button onClick={() => setIconic(i, { isSkill: !ia.isSkill })} title="Toggle as skill"
                  className={cn('text-xs px-2 h-8 rounded border transition-colors',
                    ia.isSkill
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-border text-muted-foreground')}>
                  Skill
                </button>
                <button onClick={() => removeIconic(i)} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Materials Needed</Label>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={addMat}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {form.materials.map((mat, i) => {
              const def = FORGE_MATERIAL_DEFS.find(d => d.id === mat.materialId)
              return (
                <div key={i} className="flex gap-2 items-center">
                  {def && (
                    <Image src={def.iconPath} alt={def.name} width={28} height={28}
                      className="object-contain flex-shrink-0 rounded" />
                  )}
                  <Select value={mat.materialId} onValueChange={v => setMat(i, { materialId: v })}>
                    <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORGE_MATERIAL_DEFS.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          <div className="flex items-center gap-2">
                            <Image src={d.iconPath} alt={d.name} width={18} height={18} className="object-contain" />
                            <span>{d.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} value={mat.amount}
                    onChange={e => setMat(i, { amount: Number(e.target.value) || 1 })}
                    className="w-20 h-8 text-sm" placeholder="20" />
                  <button onClick={() => removeMat(i)} className="text-muted-foreground hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Gold Cost</Label>
            <div className="flex items-center gap-2">
              <Image src="/images/bundle/gold.png" alt="gold" width={24} height={24} className="object-contain" />
              <Input type="number" min={0} value={form.goldCost}
                onChange={e => up({ goldCost: Number(e.target.value) || 0 })}
                className="w-40 text-sm" placeholder="5000000" />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={!canSave} className="gap-1.5">
              <Save className="h-4 w-4" /> Save Equipment
            </Button>
          </div>
        </div>

        {showIconPicker && (
          <IconPickerModal current={form.iconUrl}
            onSelect={v => { up({ iconUrl: v }); setShowIconPicker(false) }}
            onClose={() => setShowIconPicker(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  FORGE: SET MANAGER MODAL                                           */
/* ================================================================== */

const BLANK_SET = (): EquipmentSet => ({ id: uid(), name: '', bonuses: [] })

function SetManagerModal({
  sets, onSaveSets, onClose,
}: { sets: EquipmentSet[]; onSaveSets: (sets: EquipmentSet[]) => void; onClose: () => void }) {
  const [localSets, setLocalSets] = useState<EquipmentSet[]>(sets)
  const [editing, setEditing] = useState<EquipmentSet | null>(null)

  const saveEditing = () => {
    if (!editing || !editing.name.trim()) return
    const exists = localSets.some(s => s.id === editing.id)
    setLocalSets(exists
      ? localSets.map(s => s.id === editing.id ? editing : s)
      : [...localSets, editing])
    setEditing(null)
  }
  const removeSet = (id: string) => setLocalSets(localSets.filter(s => s.id !== id))
  const upEditing = (patch: Partial<EquipmentSet>) => setEditing(e => e ? { ...e, ...patch } : e)
  const addBonus = () => upEditing({ bonuses: [...(editing?.bonuses ?? []), { pieces: 2, description: '' }] })
  const setBonus = (i: number, patch: { pieces?: number; description?: string }) =>
    upEditing({ bonuses: (editing?.bonuses ?? []).map((b, j) => j === i ? { ...b, ...patch } : b) })
  const removeBonus = (i: number) =>
    upEditing({ bonuses: (editing?.bonuses ?? []).filter((_, j) => j !== i) })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Manage Equipment Sets
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {localSets.length > 0 && (
            <div className="space-y-2">
              {localSets.map(s => (
                <div key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.bonuses.length} bonus(es)</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => setEditing({ ...s })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => removeSet(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {!editing && (
            <Button variant="outline" className="w-full gap-1.5 text-sm"
              onClick={() => setEditing(BLANK_SET())}>
              <Plus className="h-4 w-4" /> Add New Set
            </Button>
          )}
          {editing && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {localSets.some(s => s.id === editing.id) ? 'Edit Set' : 'New Set'}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Set Name</Label>
                <Input value={editing.name} onChange={e => upEditing({ name: e.target.value })}
                  placeholder="e.g. Hellish Wasteland Set" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Set Bonuses</Label>
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={addBonus}>
                    <Plus className="h-3 w-3" /> Add Bonus
                  </Button>
                </div>
                {editing.bonuses.map((b, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex items-center gap-1">
                      <Input type="number" min={1} value={b.pieces}
                        onChange={e => setBonus(i, { pieces: Number(e.target.value) || 1 })}
                        className="w-16 h-8 text-sm" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">pc:</span>
                    </div>
                    <Input value={b.description} onChange={e => setBonus(i, { description: e.target.value })}
                      placeholder="Troop Health +3%" className="flex-1 h-8 text-sm" />
                    <button onClick={() => removeBonus(i)}
                      className="text-muted-foreground hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm" onClick={saveEditing}
                  disabled={!editing.name.trim()} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Save Set
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSaveSets(localSets); onClose() }} className="gap-1.5">
              <Save className="h-4 w-4" /> Save All Sets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  CALCULATOR: ITEM PICKER MODAL                                      */
/* ================================================================== */

function ItemPickerModal({
  slot, onSelect, onClose,
}: { slot: SlotKey; onSelect: (id: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('All')
  const dataSlot = (slot === 'accessory1' || slot === 'accessory2') ? 'accessory' : slot

  const filtered = useMemo(() => {
    const base = EQUIPMENT_FORGE_SEED_ITEMS.filter(i => i.slot === dataSlot)
    const rarityMap: Record<string, string> = {
      common: 'Normal', uncommon: 'Advanced', rare: 'Elite', epic: 'Epic', legendary: 'Legendary',
    }
    const byRarity = rarityFilter === 'All'
      ? base
      : base.filter(i => rarityMap[i.rarity] === rarityFilter)
    if (!search.trim()) return byRarity
    return byRarity.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  }, [dataSlot, rarityFilter, search])

  const rarities = ['All', 'Legendary', 'Epic', 'Elite', 'Advanced', 'Normal']
  const rarityMap: Record<string, string> = {
    common: 'Normal', uncommon: 'Advanced', rare: 'Elite', epic: 'Epic', legendary: 'Legendary',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: 700, maxHeight: '85vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-bold">Select {SLOT_LABELS[slot]}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search equipment..." className="pl-9 h-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {rarities.map(r => (
              <button key={r} onClick={() => setRarityFilter(r)}
                className={cn('px-2.5 py-0.5 rounded text-xs font-medium transition-colors border',
                  rarityFilter === r
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-4 gap-2 flex-1">
          {filtered.map(item => {
            const qLabel = rarityMap[item.rarity] ?? 'Normal'
            return (
              <button key={item.id} onClick={() => { onSelect(item.id); onClose() }}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-left',
                  'transition-all hover:scale-[1.03] hover:border-primary/60',
                  RARITY_BG[qLabel], RARITY_BORDER[qLabel],
                )}>
                <div className="h-14 w-14 flex items-center justify-center">
                  {item.iconUrl
                    ? <Image src={item.iconUrl} alt={item.name} width={52} height={52} className="object-contain" />
                    : <div className="h-12 w-12 rounded bg-black/30" />}
                </div>
                <span className={cn('text-[10px] font-semibold text-center leading-tight', RARITY_COLORS[qLabel])}>
                  {item.name}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="col-span-4 text-center text-sm text-muted-foreground py-10">No items found</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: LOADOUT GRID                                           */
/* ================================================================== */

// RoK silhouette grid positions (3 cols × 6 rows):
//   Row 1:  ·   Helmet   ·
//   Row 2:  ·   Chest    ·
//   Row 3: Wpn   ·      Gloves
//   Row 4:  ·   Legs     ·
//   Row 5: Acc1  ·      Acc2
//   Row 6:  ·   Boots    ·
const SLOT_GRID: Record<SlotKey, { row: number; col: number }> = {
  helmet:     { row: 1, col: 2 },
  chest:      { row: 2, col: 2 },
  weapon:     { row: 3, col: 1 },
  gloves:     { row: 3, col: 3 },
  legs:       { row: 4, col: 2 },
  accessory1: { row: 5, col: 1 },
  accessory2: { row: 5, col: 3 },
  boots:      { row: 6, col: 2 },
}

function LoadoutGrid({
  loadout, label, onSlotClick, onRemove, showRefined, showAwakenBadge, onContextMenu, onSlotDrop,
}: {
  loadout: Loadout
  label?: string
  onSlotClick: (slot: SlotKey) => void
  onRemove: (slot: SlotKey) => void
  showRefined: boolean
  showAwakenBadge: boolean
  onContextMenu?: (e: React.MouseEvent, slot: SlotKey) => void
  onSlotDrop?: (slot: SlotKey, itemId: string) => void
}) {
  const rarityMap: Record<string, string> = {
    common: 'Normal', uncommon: 'Advanced', rare: 'Elite', epic: 'Epic', legendary: 'Legendary',
  }
  const [dragOver, setDragOver] = useState<SlotKey | null>(null)

  return (
    <div>
      {label && (
        <p className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">{label}</p>
      )}
      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 72px)',
          gridTemplateRows: 'repeat(6, auto)',
          gap: '8px',
          width: 'fit-content',
        }}
      >
        {SLOT_ORDER.map(slot => {
          const pos = SLOT_GRID[slot]
          const item = loadout[slot]
          const data = item ? EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === item.id) : null
          const qLabel = data ? (rarityMap[data.rarity] ?? 'Normal') : null
          const isDragOver = dragOver === slot
          return (
            <div
              key={slot}
              className="flex flex-col items-center gap-0.5"
              style={{ gridRow: pos.row, gridColumn: pos.col }}
            >
              <div
                className={cn(
                  'relative h-[72px] w-[72px] rounded-lg border-2 cursor-pointer',
                  'transition-all hover:brightness-110 overflow-hidden flex items-center justify-center',
                  item && qLabel ? `${RARITY_BG[qLabel]} ${RARITY_BORDER[qLabel]}` : 'border-border bg-secondary/30',
                  item?.refined && showRefined ? 'ring-2 ring-amber-400/60' : '',
                  isDragOver ? 'ring-2 ring-amber-400 border-amber-500 brightness-125' : '',
                )}
                onClick={() => onSlotClick(slot)}
                onContextMenu={e => {
                  if (item && onContextMenu) { e.preventDefault(); onContextMenu(e, slot) }
                }}
                onDragOver={e => { e.preventDefault(); setDragOver(slot) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(null)
                  const id = e.dataTransfer.getData('text/plain')
                  if (id && onSlotDrop) onSlotDrop(slot, id)
                }}
              >
                <Image src={data?.iconUrl ?? SLOT_PLACEHOLDERS[slot]} alt={data?.name ?? slot}
                  width={56} height={56} className="object-contain" />
                {item?.awakenLevel && item.awakenLevel > 0 && showAwakenBadge && (
                  <div className="absolute top-0.5 left-0.5 bg-purple-900/90 text-purple-200 text-[8px] font-bold rounded px-0.5 leading-4">
                    {toRoman(item.awakenLevel)}
                  </div>
                )}
                {item?.refined && showRefined && (
                  <div className="absolute bottom-0 right-0 bg-amber-600/90 text-[7px] font-bold text-white px-0.5 rounded-tl">
                    R
                  </div>
                )}
                {item && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(slot) }}
                    className="absolute top-0 right-0 h-4 w-4 bg-black/70 text-red-400 flex items-center justify-center rounded-bl opacity-0 hover:opacity-100 transition-opacity text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground text-center leading-tight w-[72px] truncate">
                {data?.name ?? SLOT_LABELS[slot]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: STATS SUMMARY                                          */
/* ================================================================== */

function StatsSummary({ result }: { result: TotalStats }) {
  const [showSpecial, setShowSpecial] = useState(false)

  const grouped: Record<string, string[]> = {}
  Object.keys(result.stats).forEach(key => {
    if (result.stats[key] === 0) return
    const t = getTroopType(key)
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(key)
  })

  const statPriority = (k: string) =>
    k.includes('attack') ? 0 : k.includes('defense') ? 1 : k.includes('health') ? 2 : 3

  const groupOrder = ['infantry', 'cavalry', 'archer', 'siege', 'general']
  const specialKeys = Object.keys(result.special).filter(k => result.special[k])
  const hasIconic = Object.values(result.iconicBonusesByTier).some(t => Object.keys(t).length > 0)

  return (
    <div className="space-y-2">
      {groupOrder.filter(g => grouped[g]?.length).map(group => (
        <div key={group}>
          <div className="flex items-center gap-1 mb-0.5">
            {TROOP_ICONS[group] && (
              <Image src={TROOP_ICONS[group]} alt={group} width={14} height={14} className="object-contain" />
            )}
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', TROOP_COLORS[group])}>
              {group}
            </span>
          </div>
          {grouped[group]
            .sort((a, b) => statPriority(a) - statPriority(b))
            .map(key => (
              <div key={key}
                className="flex items-center justify-between px-1 py-0.5 rounded text-xs hover:bg-secondary/30">
                <span className="text-muted-foreground">{formatStatName(key)}</span>
                <span className={cn('font-bold', TROOP_COLORS[group])}>
                  +{result.stats[key].toFixed(1).replace('.0', '')}%
                </span>
              </div>
            ))}
        </div>
      ))}
      {(specialKeys.length > 0 || hasIconic) && (
        <div>
          <button
            onClick={() => setShowSpecial(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground w-full"
          >
            Extra Bonuses{showSpecial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSpecial && (
            <div className="mt-1 space-y-0.5">
              {specialKeys.map((k, i) => (
                <p key={i} className="text-[10px] text-cyan-300 px-1">{k}</p>
              ))}
              {[1, 2, 3, 4, 5].map(tier => {
                const entries = Object.entries(result.iconicBonusesByTier[tier])
                if (!entries.length) return null
                return entries.map(([name, val], j) => (
                  <p key={`t${tier}-${j}`} className="text-[10px] text-purple-300 px-1">
                    <span className="text-yellow-400 mr-1">Tier {toRoman(tier)}:</span>
                    {name}{val !== true ? ` ${val}` : ''}
                  </p>
                ))
              })}
            </div>
          )}
        </div>
      )}
      {Object.keys(grouped).length === 0 && specialKeys.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Equip items to see stats</p>
      )}
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: MATERIALS SUMMARY                                      */
/* ================================================================== */

function MaterialsSummary({ loadout }: { loadout: Loadout }) {
  const mats = calcLoadoutMaterials(loadout)
  const hasAny = MATS.some(m => mats[m] > 0) || mats.gold > 0
  if (!hasAny) {
    return <p className="text-xs text-muted-foreground text-center py-4">Equip items to see materials</p>
  }
  return (
    <div className="space-y-2">
      {MATS.filter(m => mats[m] > 0).map(mat => (
        <div key={mat} className="flex items-center gap-2">
          <Image src={MAT_ICONS[mat]} alt={mat} width={28} height={28} className="object-contain flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-muted-foreground capitalize">{mat}</span>
              <span className="font-bold text-foreground">{mats[mat].toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-500"
                style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      ))}
      {mats.gold > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Image src="/images/equipment/mat_icons/gold_icon.webp" alt="Gold" width={28} height={28}
            className="object-contain flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Gold</span>
              <span className="font-bold text-yellow-400">
                {mats.gold >= 1000000
                  ? `${(mats.gold / 1000000).toFixed(1)}M`
                  : mats.gold.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: COMPARE STATS TABLE                                    */
/* ================================================================== */

function CompareStatsTable({ statsA, statsB }: { statsA: TotalStats; statsB: TotalStats }) {
  const [filter, setFilter] = useState<string>('all')
  const [showExtra, setShowExtra] = useState(false)

  const allKeys = [...new Set([...Object.keys(statsA.stats), ...Object.keys(statsB.stats)])]
    .filter(k => statsA.stats[k] > 0 || statsB.stats[k] > 0)

  const grouped: Record<string, string[]> = {}
  allKeys.forEach(k => {
    const t = getTroopType(k)
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(k)
  })

  const statPriority = (k: string) =>
    k.includes('attack') ? 0 : k.includes('defense') ? 1 : k.includes('health') ? 2 : 3

  const groupOrder = ['infantry', 'cavalry', 'archer', 'siege', 'general']
  const troopFilters = ['all', 'infantry', 'cavalry', 'archer', 'siege']
  const allSpecial = [...new Set([...Object.keys(statsA.special), ...Object.keys(statsB.special)])]

  const rows: { key: string; group: string; vA: number; vB: number }[] = []
  groupOrder.forEach(g => {
    if (!grouped[g]) return
    grouped[g].sort((a, b) => statPriority(a) - statPriority(b)).forEach(k => {
      rows.push({ key: k, group: g, vA: statsA.stats[k] ?? 0, vB: statsB.stats[k] ?? 0 })
    })
  })

  const visibleRows = filter === 'all' ? rows : rows.filter(r => r.group === filter)

  if (rows.length === 0 && allSpecial.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Equip items in both loadouts to compare stats
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {troopFilters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-2.5 py-0.5 rounded text-xs font-medium capitalize transition-colors border',
                filter === f
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}>
              {f === 'all' ? 'All' : (
                <span className="flex items-center gap-1">
                  {TROOP_ICONS[f] && (
                    <Image src={TROOP_ICONS[f]} alt={f} width={12} height={12} className="object-contain" />
                  )}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setShowExtra(v => !v)}
          className={cn('px-2.5 py-0.5 rounded text-xs font-medium border transition-colors',
            showExtra
              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
              : 'border-border text-muted-foreground hover:text-foreground')}>
          Extra Bonuses
        </button>
      </div>

      {!showExtra && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px] bg-secondary/40 text-xs font-semibold text-muted-foreground px-3 py-2 border-b border-border">
            <span>Stat</span>
            <span className="text-center text-blue-400">Loadout A</span>
            <span className="text-center text-orange-400">Loadout B</span>
            <span className="text-center">Delta</span>
          </div>
          {visibleRows.map(({ key, group, vA, vB }) => {
            const delta = vB - vA
            return (
              <div key={key}
                className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-1 border-b border-border/40 hover:bg-secondary/20 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  {TROOP_ICONS[group] && (
                    <Image src={TROOP_ICONS[group]} alt={group} width={11} height={11}
                      className="object-contain flex-shrink-0" />
                  )}
                  {formatStatName(key)}
                </span>
                <span className="text-center text-blue-300 font-medium">
                  {vA > 0 ? `+${vA.toFixed(1).replace('.0', '')}%` : '-'}
                </span>
                <span className="text-center text-orange-300 font-medium">
                  {vB > 0 ? `+${vB.toFixed(1).replace('.0', '')}%` : '-'}
                </span>
                <span className={cn(
                  'text-center font-bold flex items-center justify-center gap-0.5',
                  delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground',
                )}>
                  {delta > 0 ? <ArrowUp className="h-2.5 w-2.5" />
                    : delta < 0 ? <ArrowDown className="h-2.5 w-2.5" />
                    : <Minus className="h-2.5 w-2.5" />}
                  {delta !== 0 ? `${Math.abs(delta).toFixed(1).replace('.0', '')}%` : ''}
                </span>
              </div>
            )
          })}
          {visibleRows.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No {filter} stats</p>
          )}
        </div>
      )}

      {showExtra && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px] bg-secondary/40 text-xs font-semibold text-muted-foreground px-3 py-2 border-b border-border">
            <span>Extra Bonus</span>
            <span className="text-center text-blue-400">A</span>
            <span className="text-center text-orange-400">B</span>
            <span />
          </div>
          {allSpecial.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No extra bonuses</p>
          )}
          {allSpecial.map((k, i) => (
            <div key={i}
              className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-1 border-b border-border/40 text-xs">
              <span className="text-muted-foreground pr-2">{k}</span>
              <span className="text-center">{statsA.special[k] ? 'Y' : ''}</span>
              <span className="text-center">{statsB.special[k] ? 'Y' : ''}</span>
              <span />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: AWAKEN MODAL                                           */
/* ================================================================== */

function AwakenModal({
  itemName, current, onSet, onClose,
}: { itemName: string; current: number; onSet: (level: number) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl p-5 w-72 shadow-2xl">
        <p className="text-sm font-bold mb-1">Set Awaken Level</p>
        <p className="text-xs text-muted-foreground mb-4">{itemName}</p>
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map(lvl => (
            <button key={lvl} onClick={() => { onSet(lvl); onClose() }}
              className={cn('h-8 rounded-lg text-sm font-bold border transition-colors',
                current === lvl
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
              {lvl === 0 ? '-' : toRoman(lvl)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: INVENTORY PANEL                                        */
/* ================================================================== */

function InventoryPanel({
  loadout, inventory, setInventory,
}: {
  loadout: Loadout
  inventory: Record<string, number>
  setInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>
}) {
  const needed = useMemo(() => calcLoadoutMaterials(loadout), [loadout])
  const have = (k: string) => inventory[k] ?? 0
  const matList = MATS.filter(m => needed[m] > 0)
  const allOk = matList.every(m => have(m) >= needed[m]) && (needed.gold === 0 || have('gold') >= needed.gold)

  if (matList.length === 0 && needed.gold === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Equip items to see required materials</p>
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">My Inventory vs Needed</p>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', allOk ? 'bg-green-900/50 text-green-300' : 'bg-red-900/40 text-red-300')}>
          {allOk ? '✓ Can Craft' : '✗ Missing'}
        </span>
      </div>
      <div className="space-y-2">
        {matList.map(mat => {
          const h = have(mat)
          const n = needed[mat]
          const ok = h >= n
          const pct = n > 0 ? Math.min(100, (h / n) * 100) : 100
          return (
            <div key={mat} className="rounded-lg bg-secondary/20 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Image src={MAT_ICONS[mat]} alt={mat} width={20} height={20} className="object-contain flex-shrink-0" />
                <span className="text-xs text-muted-foreground capitalize flex-1">{mat}</span>
                <span className={cn('text-xs font-bold', ok ? 'text-green-400' : 'text-red-400')}>
                  {h.toLocaleString()} / {n.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden mb-1.5">
                <div className={cn('h-full rounded-full transition-all', ok ? 'bg-green-500' : 'bg-red-500')}
                  style={{ width: `${pct}%` }} />
              </div>
              <input type="number" min={0} value={h === 0 ? '' : h} placeholder="Enter amount owned"
                onChange={e => setInventory(prev => ({ ...prev, [mat]: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full h-7 text-xs bg-background border border-border rounded px-2 text-center" />
              {!ok && <p className="text-[10px] text-red-400 mt-0.5 text-center">Need {(n - h).toLocaleString()} more</p>}
            </div>
          )
        })}
        {needed.gold > 0 && (() => {
          const h = have('gold')
          const n = needed.gold
          const ok = h >= n
          const pct = n > 0 ? Math.min(100, (h / n) * 100) : 100
          return (
            <div className="rounded-lg bg-secondary/20 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Image src="/images/equipment/mat_icons/gold_icon.webp" alt="Gold" width={20} height={20} className="object-contain flex-shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">Gold</span>
                <span className={cn('text-xs font-bold', ok ? 'text-green-400' : 'text-red-400')}>
                  {h >= 1_000_000 ? `${(h / 1_000_000).toFixed(1)}M` : h.toLocaleString()}
                  {' / '}
                  {n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden mb-1.5">
                <div className={cn('h-full rounded-full transition-all', ok ? 'bg-green-500' : 'bg-red-500')}
                  style={{ width: `${pct}%` }} />
              </div>
              <input type="number" min={0} value={h === 0 ? '' : h} placeholder="Enter gold owned"
                onChange={e => setInventory(prev => ({ ...prev, gold: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full h-7 text-xs bg-background border border-border rounded px-2 text-center" />
              {!ok && <p className="text-[10px] text-red-400 mt-0.5 text-center">Need {((n - h) / 1_000_000).toFixed(1)}M more gold</p>}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: CALCULATOR TAB                                         */
/* ================================================================== */

function CalculatorTab({
  loadout, kvkSeason, onSlotClick, onRemove, onToggleRefine, onSetAwaken, onClear, onSlotDrop,
}: {
  loadout: Loadout
  kvkSeason: KvkSeason
  onSlotClick: (slot: SlotKey) => void
  onRemove: (slot: SlotKey) => void
  onToggleRefine: (slot: SlotKey) => void
  onSetAwaken: (slot: SlotKey) => void
  onClear: () => void
  onSlotDrop: (slot: SlotKey, id: string) => void
}) {
  const result = useMemo(() => calcLoadoutStats(loadout, kvkSeason), [loadout, kvkSeason])
  const [panel, setPanel] = useState<'stats' | 'materials' | 'inventory'>('stats')
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [contextMenu, setContextMenu] = useState<{ slot: SlotKey; x: number; y: number } | null>(null)

  const handleSlotContext = useCallback((e: React.MouseEvent, slot: SlotKey) => {
    if (!loadout[slot]) return
    e.preventDefault()
    setContextMenu({ slot, x: e.clientX, y: e.clientY })
  }, [loadout])

  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-[340px]">
        <div className="rounded-xl border border-border bg-secondary/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Equipment Loadout</p>
            <Button variant="ghost" size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-red-400"
              onClick={onClear}>
              <RotateCcw className="h-3 w-3" /> Clear
            </Button>
          </div>
          <LoadoutGrid loadout={loadout} onSlotClick={onSlotClick} onRemove={onRemove}
            showRefined showAwakenBadge onContextMenu={handleSlotContext} onSlotDrop={onSlotDrop} />
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Click slot to equip · Drag items from forge above · Right-click for options
          </p>
        </div>

        {contextMenu && loadout[contextMenu.slot] && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 text-sm w-44"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button className="w-full text-left px-3 py-1.5 hover:bg-secondary/50"
                onClick={() => { onToggleRefine(contextMenu.slot); setContextMenu(null) }}>
                {loadout[contextMenu.slot]?.refined ? 'Remove Refine' : 'Mark as Refined'}
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-secondary/50"
                onClick={() => { onSetAwaken(contextMenu.slot); setContextMenu(null) }}>
                Set Awaken Level
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-secondary/50 text-red-400"
                onClick={() => { onRemove(contextMenu.slot); setContextMenu(null) }}>
                Remove Item
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-border bg-secondary/10">
          <div className="flex border-b border-border">
            {(['stats', 'materials', 'inventory'] as const).map(p => (
              <button key={p} onClick={() => setPanel(p)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors capitalize',
                  panel === p
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                {p}
              </button>
            ))}
          </div>
          <div className="p-4 max-h-[480px] overflow-y-auto">
            {panel === 'stats'
              ? <StatsSummary result={result} />
              : panel === 'materials'
              ? <MaterialsSummary loadout={loadout} />
              : <InventoryPanel loadout={loadout} inventory={inventory} setInventory={setInventory} />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR: COMPARE TAB                                            */
/* ================================================================== */

function CompareTab({ kvkSeason }: { kvkSeason: KvkSeason }) {
  const [loadoutA, setLoadoutA] = useState<Loadout>({})
  const [loadoutB, setLoadoutB] = useState<Loadout>({})
  const [pickerFor, setPickerFor] = useState<{ loadout: 'A' | 'B'; slot: SlotKey } | null>(null)
  const [awakenFor, setAwakenFor] = useState<{ loadout: 'A' | 'B'; slot: SlotKey } | null>(null)

  const statsA = useMemo(() => calcLoadoutStats(loadoutA, kvkSeason), [loadoutA, kvkSeason])
  const statsB = useMemo(() => calcLoadoutStats(loadoutB, kvkSeason), [loadoutB, kvkSeason])

  const setItem = (lo: 'A' | 'B', slot: SlotKey, id: string) => {
    const setter = lo === 'A' ? setLoadoutA : setLoadoutB
    setter(prev => ({ ...prev, [slot]: { id, refined: false, awakenLevel: 0 } }))
  }
  const removeItem = (lo: 'A' | 'B', slot: SlotKey) => {
    const setter = lo === 'A' ? setLoadoutA : setLoadoutB
    setter(prev => { const n = { ...prev }; delete n[slot]; return n })
  }
  const clearLoadout = (lo: 'A' | 'B') => (lo === 'A' ? setLoadoutA : setLoadoutB)({})

  const awakenItem = awakenFor
    ? EQUIPMENT_FORGE_SEED_ITEMS.find(d =>
        d.id === (awakenFor.loadout === 'A' ? loadoutA : loadoutB)[awakenFor.slot]?.id)
    : null
  const awakenCurrent = awakenFor
    ? ((awakenFor.loadout === 'A' ? loadoutA : loadoutB)[awakenFor.slot]?.awakenLevel ?? 0)
    : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(['A', 'B'] as const).map(lo => {
          const loadout = lo === 'A' ? loadoutA : loadoutB
          return (
            <div key={lo} className="rounded-xl border border-border bg-secondary/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className={cn('text-sm font-bold', lo === 'A' ? 'text-blue-400' : 'text-orange-400')}>
                  Loadout {lo}
                </p>
                <Button variant="ghost" size="sm"
                  className="h-6 text-xs gap-1 text-muted-foreground hover:text-red-400 px-1.5"
                  onClick={() => clearLoadout(lo)}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <LoadoutGrid
                loadout={loadout}
                onSlotClick={slot => setPickerFor({ loadout: lo, slot })}
                onRemove={slot => removeItem(lo, slot)}
                showRefined showAwakenBadge
              />
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Total Materials</p>
                <MaterialsSummary loadout={loadout} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border border-border bg-secondary/10 p-4">
        <p className="text-sm font-bold mb-3">Stat Comparison</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
            <span className="text-blue-400">Loadout A</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
            <span className="text-orange-400">Loadout B</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUp className="h-3 w-3 text-green-400" />
            <span className="text-muted-foreground">B better</span>
          </div>
        </div>
        <CompareStatsTable statsA={statsA} statsB={statsB} />
      </div>

      {pickerFor && (
        <ItemPickerModal
          slot={pickerFor.slot}
          onSelect={id => setItem(pickerFor.loadout, pickerFor.slot, id)}
          onClose={() => setPickerFor(null)}
        />
      )}
      {awakenFor && awakenItem && (
        <AwakenModal
          itemName={awakenItem.name}
          current={awakenCurrent}
          onSet={lvl => {
            const setter = awakenFor.loadout === 'A' ? setLoadoutA : setLoadoutB
            setter(prev => prev[awakenFor.slot]
              ? { ...prev, [awakenFor.slot]: { ...prev[awakenFor.slot]!, awakenLevel: lvl } }
              : prev)
          }}
          onClose={() => setAwakenFor(null)}
        />
      )}
    </div>
  )
}

/* ================================================================== */
/*  FORGE: MAIN FORGE TAB (3-panel RoK UI)                            */
/* ================================================================== */

function ForgeTabContent({
  state, onUpdateState,
}: { state: ForgeState; onUpdateState: (next: ForgeState) => void }) {
  const [activeFilter, setActiveFilter] = useState<ForgeFilter>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ForgeItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showSetManager, setShowSetManager] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'forge' | 'refine' | 'awaken' | 'dismantle'>('forge')
  const [showInventory, setShowInventory] = useState(false)
  const [forgeInventory, setForgeInventory] = useState<Record<string, number>>({})

  const filteredItems = useMemo(() => {
    const { items } = state
    if (activeFilter === 'all') return items
    if (activeFilter === 'sets') return items.filter(i => EQUIPMENT_SETS.some(s => s.pieces.includes(i.id)))
    return items.filter(i => i.slot === activeFilter)
  }, [state, activeFilter])

  const selectedItem = useMemo(
    () => state.items.find(i => i.id === selectedItemId) ?? filteredItems[0] ?? null,
    [state.items, selectedItemId, filteredItems],
  )

  const selectedSet = useMemo(() => {
    if (!selectedItem) return null
    const setDef = EQUIPMENT_SETS.find(s => s.pieces.includes(selectedItem.id))
    if (!setDef) return null
    return {
      id: setDef.id,
      name: setDef.name,
      bonuses: setDef.bonuses.map(b => ({ pieces: b.count, description: b.description })),
    }
  }, [selectedItem])

  const handleSaveItem = (item: ForgeItem) => {
    const exists = state.items.some(i => i.id === item.id)
    const items = exists
      ? state.items.map(i => i.id === item.id ? item : i)
      : [...state.items, item]
    onUpdateState({ ...state, items })
    setSelectedItemId(item.id)
    setEditingItem(null)
    setShowAddItem(false)
  }

  const handleDeleteItem = (id: string) => {
    onUpdateState({ ...state, items: state.items.filter(i => i.id !== id) })
    if (selectedItemId === id) setSelectedItemId(null)
    setShowDeleteConfirm(null)
  }

  const rc = selectedItem ? RARITY_CONFIG[selectedItem.rarity] : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {(['forge', 'refine', 'awaken', 'dismantle'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveSubTab(tab)}
              className={cn(
                'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-all',
                tab === activeSubTab
                  ? 'bg-amber-700/70 text-amber-100 border border-amber-500/60 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/30 border border-transparent',
              )}>
              {tab}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
          onClick={() => setShowSetManager(true)}>
          <Layers className="h-3.5 w-3.5" /> Manage Sets
        </Button>
      </div>

      {activeSubTab === 'dismantle' ? (
        <div className="flex items-center justify-center min-h-40 rounded-xl border border-border bg-secondary/10">
          <p className="text-muted-foreground text-sm">Dismantle — coming soon</p>
        </div>
      ) : (
        <div className="flex gap-3 min-h-[560px]">

          <div className="flex gap-2 flex-shrink-0" style={{ width: '300px' }}>
            <div className="flex flex-col gap-0.5" style={{ width: '88px' }}>
              <Button size="sm" onClick={() => setShowAddItem(true)}
                className="h-8 w-full text-xs gap-1 mb-1.5 bg-amber-600 hover:bg-amber-500 text-white border-amber-500 font-bold">
                <Plus className="h-3 w-3" /> Add
              </Button>
              {FORGE_FILTERS.map(f => (
                <button key={f.key} onClick={() => setActiveFilter(f.key)}
                  className={cn(
                    'py-1.5 px-2 text-[11px] font-medium rounded text-left transition-all',
                    activeFilter === f.key
                      ? 'bg-amber-700/30 text-amber-300 border border-amber-600/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent',
                  )}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '560px' }}>
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Sword className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground mb-3">No items yet</p>
                  <Button size="sm" onClick={() => setShowAddItem(true)} className="text-xs h-7 gap-1">
                    <Plus className="h-3 w-3" /> Add Equipment
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pr-1">
                  {filteredItems.map(item => {
                    const irc = RARITY_CONFIG[item.rarity]
                    const isSelected = item.id === (selectedItem?.id ?? '')
                    return (
                      <button key={item.id} onClick={() => setSelectedItemId(item.id)}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.effectAllowed = 'copy'
                          e.dataTransfer.setData('text/plain', item.id)
                        }}
                        className={cn(
                          'relative flex flex-col items-center justify-between rounded-lg border-2 p-1.5',
                          'transition-all aspect-square overflow-hidden',
                          irc.itemBg,
                          isSelected
                            ? `${irc.itemBorder} scale-[1.04]`
                            : 'border-transparent hover:border-white/20',
                        )}
                        style={isSelected ? { boxShadow: irc.glow } : {}}>
                        {isSelected && (
                          <div className="absolute inset-0 rounded-lg"
                            style={{
                              background: `radial-gradient(circle at center, ${irc.glowColor}22 0%, transparent 70%)`,
                            }} />
                        )}
                        <div className="flex-1 flex items-center justify-center z-10">
                          {item.iconUrl ? (
                            <Image src={item.iconUrl} alt={item.name} width={52} height={52}
                              className="object-contain drop-shadow-lg" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-black/30 flex items-center justify-center">
                              <Sword className={cn('h-6 w-6', irc.nameCls)} />
                            </div>
                          )}
                        </div>

                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {activeSubTab === 'forge' ? (<>

          <div className="flex flex-col flex-1 min-w-0 gap-3">
            <div
              className="relative flex-1 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at 50% 70%, rgba(200,90,10,0.3) 0%, rgba(100,40,5,0.45) 35%, rgba(8,6,3,0.97) 75%), linear-gradient(to bottom, #0e0a06, #1a0e05)',
                border: '1px solid rgba(180,90,15,0.25)',
                minHeight: '280px',
              }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 90%, rgba(255,140,0,0.18) 0%, transparent 55%)',
                }} />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,160,30,0.4), transparent)',
                }} />
              {/* Animated forge fire */}
              <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: '96px', zIndex: 2 }}>
                <div className="forge-fire-base absolute bottom-0 left-0 right-0 h-6"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(234,88,12,0.5) 20%, rgba(251,146,60,0.65) 50%, rgba(234,88,12,0.5) 80%, transparent)', filter: 'blur(6px)' }} />
                {[0,1,2,3,4,5,6,7,8,9].map(i => {
                  const x = (i - 4.5) * 16
                  const h = 22 + (i % 4) * 14
                  const w = 10 + (i % 3) * 7
                  const dur = (1.1 + (i % 4) * 0.14).toFixed(2)
                  const del = (i * 0.11).toFixed(2)
                  const grad = i % 3 === 0
                    ? 'linear-gradient(to top,#dc2626,#f97316,#fde68a)'
                    : i % 3 === 1
                    ? 'linear-gradient(to top,#ea580c,#fb923c,#fbbf24)'
                    : 'linear-gradient(to top,#f97316,#fbbf24,#fef9c3)'
                  return (
                    <div key={i} className="forge-flame-lick" style={{
                      left: `calc(50% + ${x}px - ${w/2}px)`,
                      width: `${w}px`, height: `${h}px`, background: grad,
                      '--dur': `${dur}s`, '--del': `${del}s`,
                    } as React.CSSProperties} />
                  )
                })}
              </div>
              <div className={cn('z-10 relative', selectedItem && 'forge-float')}>
                {selectedItem?.iconUrl ? (
                  <Image src={selectedItem.iconUrl} alt={selectedItem.name} width={160} height={160}
                    className="object-contain"
                    style={{ filter: rc ? `drop-shadow(0 0 32px ${rc.glowColor})` : undefined }} />
                ) : (
                  <div className="h-36 w-36 rounded-2xl flex items-center justify-center"
                    style={{
                      background: selectedItem
                        ? `radial-gradient(circle, ${rc!.glowColor}40 0%, rgba(0,0,0,0.85) 70%)`
                        : 'radial-gradient(circle, rgba(120,60,10,0.4) 0%, rgba(0,0,0,0.85) 70%)',
                      boxShadow: rc ? `0 0 40px ${rc.glowColor}` : undefined,
                    }}>
                    <Sword className={cn('h-16 w-16', rc ? rc.nameCls : 'text-amber-800/50')} />
                  </div>
                )}
              </div>
            </div>

            {selectedItem ? (
              <div className="space-y-2">
                <p className="text-xs text-center font-medium text-muted-foreground tracking-wide">
                  Materials Needed
                </p>
                <div className="flex items-end justify-center gap-4 flex-wrap">
                  {selectedItem.materials.map((mat, idx) => {
                    const def = FORGE_MATERIAL_DEFS.find(d => d.id === mat.materialId)
                    return (
                      <div key={idx} className="flex flex-col items-center gap-0.5">
                        <div className="h-14 w-14 rounded-lg border-2 flex items-center justify-center overflow-hidden"
                          style={{
                            borderColor: def?.rarityColor ?? '#555',
                            background: `radial-gradient(circle, ${def?.rarityColor ?? '#333'}22 0%, rgba(0,0,0,0.6) 100%)`,
                            boxShadow: `0 0 10px ${def?.rarityColor ?? '#333'}44`,
                          }}>
                          {def ? (
                            <Image src={def.iconPath} alt={def.name} width={44} height={44}
                              className="object-contain p-0.5" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          0/{mat.amount}
                        </span>
                      </div>
                    )
                  })}
                  {selectedItem.goldCost > 0 && (
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className="h-14 w-14 rounded-lg border-2 border-yellow-600/60 flex items-center justify-center overflow-hidden bg-yellow-900/20"
                        style={{ boxShadow: '0 0 10px rgba(251,191,36,0.3)' }}>
                        <Image src="/images/bundle/gold.png" alt="Gold" width={44} height={44}
                          className="object-contain p-0.5" />
                      </div>
                      <span className="text-xs text-yellow-400 tabular-nums font-medium">
                        {selectedItem.goldCost >= 1000000
                          ? `${(selectedItem.goldCost / 1000000).toFixed(1)}M`
                          : selectedItem.goldCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                {/* ── Inventory check ── */}
                <div className="pt-1.5">
                  <button onClick={() => setShowInventory(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-amber-300 transition-colors w-full justify-center py-1 rounded hover:bg-secondary/20">
                    <Package className="h-3 w-3" />
                    {showInventory ? 'Hide Inventory' : 'Check My Inventory'}
                    <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', showInventory && 'rotate-180')} />
                  </button>
                  {showInventory && (
                    <div className="space-y-1.5 mt-1.5 rounded-lg p-2 bg-black/30 border border-amber-900/20">
                      {selectedItem!.materials.map((mat, midx) => {
                        const def = FORGE_MATERIAL_DEFS.find(d => d.id === mat.materialId)
                        const have = forgeInventory[mat.materialId] ?? 0
                        const ok = have >= mat.amount
                        return (
                          <div key={midx} className="flex items-center gap-1.5">
                            {def && <Image src={def.iconPath} alt={def.name} width={16} height={16} className="object-contain flex-shrink-0" />}
                            <span className="text-[10px] text-muted-foreground flex-1 capitalize truncate">{def?.name ?? mat.materialId}</span>
                            <input type="number" min={0} value={have === 0 ? '' : have} placeholder="0"
                              onChange={e => setForgeInventory(prev => ({ ...prev, [mat.materialId]: Math.max(0, Number(e.target.value) || 0) }))}
                              className="w-14 h-6 text-[11px] bg-background border border-border rounded px-1 text-center tabular-nums" />
                            <span className={cn('text-[10px] font-bold w-12 text-right', ok ? 'text-green-400' : 'text-red-400')}>
                              {ok ? `✓` : `✗ -${mat.amount - have}`}
                            </span>
                          </div>
                        )
                      })}
                      {(selectedItem!.goldCost > 0) && (() => {
                        const have = forgeInventory['gold'] ?? 0
                        const ok = have >= selectedItem!.goldCost
                        return (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
                            <Image src="/images/equipment/mat_icons/gold_icon.webp" alt="Gold" width={16} height={16} className="object-contain flex-shrink-0" />
                            <span className="text-[10px] text-muted-foreground flex-1">Gold</span>
                            <input type="number" min={0} value={have === 0 ? '' : have} placeholder="0"
                              onChange={e => setForgeInventory(prev => ({ ...prev, gold: Math.max(0, Number(e.target.value) || 0) }))}
                              className="w-14 h-6 text-[11px] bg-background border border-border rounded px-1 text-center tabular-nums" />
                            <span className={cn('text-[10px] font-bold w-12 text-right', ok ? 'text-green-400' : 'text-red-400')}>
                              {ok ? `✓` : `✗`}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center pt-2">
                <p className="text-xs text-muted-foreground text-center">
                  Add equipment pieces or select one to view details
                </p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 overflow-y-auto" style={{ width: '260px', maxHeight: '560px' }}>
            {selectedItem ? (
              <ItemDetailsPanel
                item={selectedItem}
                set={selectedSet}
                onEdit={() => { setEditingItem(selectedItem); setShowAddItem(false) }}
                onDelete={() => setShowDeleteConfirm(selectedItem.id)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
                <Package className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">
                  Select equipment from the list to view its details
                </p>
              </div>
            )}
          </div>

          </>) : activeSubTab === 'refine' ? (<>

          <div className="flex flex-col flex-1 min-w-0 gap-3">
            <div
              className="relative flex-1 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at 50% 70%, rgba(14,165,233,0.2) 0%, rgba(7,89,133,0.3) 35%, rgba(3,6,8,0.97) 75%), linear-gradient(to bottom, #030e1a, #061825)',
                border: '1px solid rgba(14,165,233,0.2)',
                minHeight: '280px',
              }}>
              <div className={cn('z-10 relative', selectedItem && 'forge-float')}>
                {selectedItem?.iconUrl ? (
                  <div className="relative">
                    <Image src={selectedItem.iconUrl} alt={selectedItem.name} width={160} height={160}
                      className="object-contain"
                      style={{ filter: rc ? `drop-shadow(0 0 32px ${rc.glowColor}) brightness(1.3)` : undefined }} />
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Refined
                    </div>
                  </div>
                ) : (
                  <div className="h-36 w-36 rounded-2xl flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(0,0,0,0.85) 70%)' }}>
                    <Sword className="h-16 w-16 text-sky-600/50" />
                  </div>
                )}
              </div>
            </div>
            {selectedItem ? (
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-sky-300 uppercase tracking-wide">Refinement Preview</p>
                <p className="text-[11px] text-muted-foreground">Each % attribute receives a +30% bonus when refined</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center pt-2">Select an item to preview refinement</p>
            )}
          </div>

          <div className="flex-shrink-0 overflow-y-auto" style={{ width: '260px', maxHeight: '560px' }}>
            {selectedItem ? (
              <div className="space-y-3">
                <h3 className={cn('text-base font-bold leading-tight', rc?.nameCls)}>{selectedItem.name}</h3>
                {(() => {
                  const cost = REFINE_COSTS[selectedItem.rarity] ?? REFINE_COSTS.legendary
                  return (
                    <div className="rounded-lg bg-sky-900/20 border border-sky-800/40 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-sky-300 uppercase tracking-wide mb-2">Refine Cost (Approx.)</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Image src="/images/bundle/conversion_stone.png" alt="Conv. Stone" width={24} height={24} className="object-contain" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Conv. Stone</p>
                            <p className="text-xs font-bold">×{cost.stones}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Image src="/images/equipment/mat_icons/gold_icon.webp" alt="Gold" width={22} height={22} className="object-contain" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Gold</p>
                            <p className="text-xs font-bold text-yellow-400">
                              {cost.gold >= 1_000_000 ? `${cost.gold / 1_000_000}M` : cost.gold.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground/50 mt-1.5">*Approximate — verify in-game</p>
                    </div>
                  )
                })()}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attributes After Refine</p>
                  {selectedItem.attributes.length > 0 ? selectedItem.attributes.map((attr, i) => {
                    const base = parseFloat(attr.value.replace(/[^0-9.]/g, ''))
                    const bonus = isNaN(base) ? 0 : getRefinedBonus(base)
                    const ac = ATTRIBUTE_COLORS[attr.color]
                    return (
                      <div key={i} className="rounded-lg bg-secondary/20 px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{attr.label}</span>
                          <span className={cn('text-xs font-bold', ac.text)}>{attr.value}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-sky-400">+ Refine Bonus</span>
                          <span className="text-[10px] font-bold text-sky-400">
                            {bonus > 0 ? `+${bonus.toFixed(1).replace('.0', '')}%` : '\u2014'}
                          </span>
                        </div>
                      </div>
                    )
                  }) : (
                    <p className="text-xs text-muted-foreground">No refineable attributes</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
                <Package className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">Select equipment to preview refinement</p>
              </div>
            )}
          </div>

          </>) : (<>

          <div className="flex flex-col flex-1 min-w-0 gap-3">
            <div
              className="relative flex-1 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at 50% 70%, rgba(168,85,247,0.2) 0%, rgba(88,28,135,0.3) 35%, rgba(3,2,8,0.97) 75%), linear-gradient(to bottom, #0e0314, #180828)',
                border: '1px solid rgba(168,85,247,0.2)',
                minHeight: '280px',
              }}>
              <div className={cn('z-10 relative', selectedItem && 'forge-float')}>
                {selectedItem?.iconUrl ? (
                  <Image src={selectedItem.iconUrl} alt={selectedItem.name} width={160} height={160}
                    className="object-contain"
                    style={{ filter: 'drop-shadow(0 0 32px rgba(168,85,247,0.8))' }} />
                ) : (
                  <div className="h-36 w-36 rounded-2xl flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(0,0,0,0.85) 70%)' }}>
                    <Sword className="h-16 w-16 text-purple-600/50" />
                  </div>
                )}
              </div>
            </div>
            {selectedItem && (
              <div className="flex items-center justify-center gap-3 pb-1">
                {[1, 2, 3, 4, 5].map(tier => {
                  const iconicDef = ICONIC_DATA[selectedItem.name]
                  const hasTier = !!(iconicDef?.tiers[String(tier)])
                  return (
                    <div key={tier}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                        hasTier
                          ? 'border-purple-500 bg-purple-900/60 text-purple-200'
                          : 'border-border bg-secondary/20 text-muted-foreground/40',
                      )}>
                      {toRoman(tier)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 overflow-y-auto" style={{ width: '260px', maxHeight: '560px' }}>
            {selectedItem ? (() => {
              const iconicDef = ICONIC_DATA[selectedItem.name]
              return (
                <div className="space-y-3">
                  <h3 className={cn('text-base font-bold leading-tight', rc?.nameCls)}>{selectedItem.name}</h3>
                  {iconicDef ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Awakening Tiers</p>
                      {[1, 2, 3, 4, 5].map(tier => {
                        const t = iconicDef.tiers[String(tier)]
                        if (!t) return null
                        let desc = ''
                        if (t.type === 'base_stat' && t.stat) {
                          const v = t.values?.soc ?? t.values?.kvk3 ?? t.values?.kvk1_2 ?? 0
                          const crit = typeof t.crit_bonus === 'number' ? t.crit_bonus : 0
                          desc = `${t.stat}: +${v}${crit ? ` (Crit: +${crit})` : ''}`
                        } else if (t.type === 'percent_stat' && t.stat) {
                          desc = `${t.stat}: +${t.value}%${t.crit_buff ? ` (Crit: +${t.crit_buff}%)` : ''}`
                        } else if (t.type === 'flat_stat' && t.stat) {
                          desc = `${t.stat}: +${(t.value ?? 0).toLocaleString()}${t.crit_buff ? ` (Crit: +${t.crit_buff})` : ''}`
                        } else if (t.type === 'special') {
                          let d = t.description ?? ''
                          if (t.values) {
                            Object.entries(t.values as Record<string, number>).forEach(([k, val]) => {
                              d = d.replace(`{${k}}`, String(val))
                            })
                          }
                          desc = d || (t.name ?? '')
                        }
                        const awakCost = AWAKEN_TIER_COSTS[tier - 1]
                        return (
                          <div key={tier} className="rounded-lg bg-purple-900/20 border border-purple-800/30 px-3 py-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-purple-300 w-5 flex-shrink-0 mt-0.5">{toRoman(tier)}</span>
                              <span className="text-xs text-foreground leading-relaxed">{desc}</span>
                            </div>
                            {awakCost && (
                              <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-purple-900/50 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Image src="/images/bundle/legendary_mat_chest.png" alt="Mat" width={16} height={16} className="object-contain" />
                                  <span className="text-[10px] text-muted-foreground">×{awakCost.legendary_mats}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Image src="/images/equipment/mat_icons/gold_icon.webp" alt="Gold" width={14} height={14} className="object-contain" />
                                  <span className="text-[10px] text-yellow-400">{awakCost.gold / 1_000_000}M gold</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">No Iconic / Awakening data for this item</p>
                  )}
                </div>
              )
            })() : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
                <Package className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">Select equipment to view awakening data</p>
              </div>
            )}
          </div>

          </>)}
        </div>
      )}

      {(showAddItem || editingItem) && (
        <ItemEditorModal
          item={editingItem}
          sets={state.sets}
          onSave={handleSaveItem}
          onClose={() => { setEditingItem(null); setShowAddItem(false) }}
        />
      )}
      {showDeleteConfirm && (
        <Dialog open onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Equipment?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently remove this equipment piece. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDeleteItem(showDeleteConfirm!)}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {showSetManager && (
        <SetManagerModal
          sets={state.sets}
          onSaveSets={sets => onUpdateState({ ...state, sets })}
          onClose={() => setShowSetManager(false)}
        />
      )}
    </div>
  )
}

/* ================================================================== */
/*  MAIN EXPORT                                                        */
/* ================================================================== */

const STORAGE_KEY = 'equipment_calculator_v1'
interface SavedCalcState { loadout: Loadout; kvkSeason: KvkSeason }

export function EquipmentForge() {
  const [kvkSeason, setKvkSeason] = useState<KvkSeason>('soc')
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const screenshotRef = useRef<HTMLDivElement>(null)

  const handleScreenshot = useCallback(async () => {
    if (!screenshotRef.current) return
    try {
      const h2c = (await import('html2canvas')).default
      const canvas = await h2c(screenshotRef.current, {
        scale: 2, backgroundColor: '#0c0b14', useCORS: true, allowTaint: true, logging: false,
      })
      setScreenshotDataUrl(canvas.toDataURL('image/png'))
    } catch (err) { console.error('Screenshot failed:', err) }
  }, [])

  const [loadout, setLoadout] = useState<Loadout>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s) {
        const parsed: SavedCalcState = JSON.parse(s)
        return parsed.loadout ?? {}
      }
    } catch { /* ignore */ }
    return {}
  })

  const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null)
  const [awakenSlot, setAwakenSlot] = useState<SlotKey | null>(null)

  const [forgeState, setForgeState] = useState<ForgeState>(() => {
    const saved = loadForgeState()
    if (saved.items.length === 0) return { items: EQUIPMENT_FORGE_SEED_ITEMS, sets: saved.sets }
    return saved
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ loadout, kvkSeason }))
    } catch { /* ignore */ }
  }, [loadout, kvkSeason])

  const updateForgeState = useCallback((next: ForgeState) => {
    setForgeState(next)
    saveForgeState(next)
  }, [])

  const setItem = useCallback((slot: SlotKey, id: string) => {
    setLoadout(prev => ({ ...prev, [slot]: { id, refined: false, awakenLevel: 0 } }))
  }, [])

  const removeItem = useCallback((slot: SlotKey) => {
    setLoadout(prev => { const n = { ...prev }; delete n[slot]; return n })
  }, [])

  const toggleRefine = useCallback((slot: SlotKey) => {
    setLoadout(prev => prev[slot]
      ? { ...prev, [slot]: { ...prev[slot]!, refined: !prev[slot]!.refined } }
      : prev)
  }, [])

  const setAwakenLevel = useCallback((slot: SlotKey, level: number) => {
    setLoadout(prev => prev[slot]
      ? { ...prev, [slot]: { ...prev[slot]!, awakenLevel: level } }
      : prev)
  }, [])

  const handleSlotDrop = useCallback((slot: SlotKey, id: string) => {
    const item = EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === id)
    if (!item) return
    const isCompat = item.slot === 'accessory'
      ? (slot === 'accessory1' || slot === 'accessory2')
      : (item.slot as string) === slot
    if (isCompat) setItem(slot, id)
  }, [setItem])

  const awakenItem = awakenSlot
    ? EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === loadout[awakenSlot]?.id)
    : null
  const awakenCurrent = awakenSlot ? (loadout[awakenSlot]?.awakenLevel ?? 0) : 0

  return (
    <div className="space-y-6">
      <ForgeTabContent state={forgeState} onUpdateState={updateForgeState} />

      <div className="border-t border-border/50 pt-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold tracking-wide uppercase text-muted-foreground">Equipment Calculator</p>
            <button onClick={handleScreenshot}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/50 transition-colors">
              <Camera className="h-3 w-3" /> Screenshot
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">KvK Season:</span>
            <div className="flex gap-1">
              {KVK_SEASONS.map(s => (
                <button key={s.value} onClick={() => setKvkSeason(s.value)}
                  className={cn('px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                    kvkSeason === s.value
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div ref={screenshotRef}>
          <CalculatorTab
            loadout={loadout}
            kvkSeason={kvkSeason}
            onSlotClick={slot => setPickerSlot(slot)}
            onRemove={removeItem}
            onToggleRefine={toggleRefine}
            onSetAwaken={slot => setAwakenSlot(slot)}
            onClear={() => setLoadout({})}
            onSlotDrop={handleSlotDrop}
          />
        </div>
        {screenshotDataUrl && (
          <Dialog open onOpenChange={() => setScreenshotDataUrl(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Loadout Screenshot
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-auto max-h-[60vh] rounded-lg border border-border bg-[#0c0b14] flex justify-center p-2">
                <img src={screenshotDataUrl} alt="Loadout screenshot" className="max-w-full rounded" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1 gap-2" onClick={() => {
                  const a = document.createElement('a'); a.href = screenshotDataUrl; a.download = 'loadout.png'; a.click()
                }}>
                  <Download className="h-4 w-4" /> Download PNG
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={async () => {
                  const blob = await (await fetch(screenshotDataUrl)).blob()
                  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                }}>
                  <Camera className="h-4 w-4" /> Copy to Clipboard
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border-t border-border/50 pt-6">
        <p className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-4">Loadout Compare</p>
        <CompareTab kvkSeason={kvkSeason} />
      </div>

      {pickerSlot && (
        <ItemPickerModal
          slot={pickerSlot}
          onSelect={id => setItem(pickerSlot, id)}
          onClose={() => setPickerSlot(null)}
        />
      )}
      {awakenSlot && awakenItem && (
        <AwakenModal
          itemName={awakenItem.name}
          current={awakenCurrent}
          onSet={lvl => setAwakenLevel(awakenSlot, lvl)}
          onClose={() => setAwakenSlot(null)}
        />
      )}
    </div>
  )
}
