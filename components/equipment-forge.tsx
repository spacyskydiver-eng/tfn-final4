'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  Save, Check, Sword, Layers, Package, AlertCircle,
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

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function uid() { return `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

/* ================================================================== */
/*  ICON PICKER MODAL                                                  */
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
          {/* Bundle grid */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Pick from bundle images</p>
            <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
              {BUNDLE_ICON_OPTIONS.map(opt => (
                <button
                  key={opt.path}
                  onClick={() => onSelect(opt.path)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all hover:border-primary/60',
                    current === opt.path ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30',
                  )}
                >
                  <Image src={opt.path} alt={opt.label} width={36} height={36} className="object-contain" />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Custom URL */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Or paste a custom image URL..."
              value={custom}
              onChange={e => setCustom(e.target.value)}
              className="text-sm"
            />
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
/*  ITEM DETAILS PANEL (right side)                                    */
/* ================================================================== */

function ItemDetailsPanel({
  item, set, allSets,
  onEdit, onDelete,
}: {
  item: ForgeItem; set: EquipmentSet | null; allSets: EquipmentSet[]
  onEdit: () => void; onDelete: () => void
}) {
  const rc = RARITY_CONFIG[item.rarity]
  const [setOpen, setSetOpen] = useState(false)

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto pr-1">
      {/* Name */}
      <h2 className={cn('text-xl font-bold leading-tight', rc.nameCls)}>{item.name}</h2>

      {/* Rarity + Level */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', rc.badgeBg, rc.badgeText)}>
          {rc.label}
        </span>
        <span className="text-sm text-foreground font-semibold">Equipment Level {item.equipmentLevel}</span>
      </div>

      {/* Slot */}
      <p className="text-sm text-muted-foreground">
        Equipment Slot: <span className="text-foreground">{SLOT_CONFIG[item.slot].label}</span>
      </p>

      {/* Attributes */}
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

      {/* Special Talent */}
      {item.specialTalent && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Special Talent</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.specialTalent}</p>
        </div>
      )}

      {/* Iconic Attributes */}
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

      {/* Set Effects */}
      {set && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Set Effects</p>
          <button
            onClick={() => setSetOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
          >
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

      {/* Edit / Delete */}
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
/*  ITEM EDITOR MODAL                                                  */
/* ================================================================== */

const BLANK_ITEM = (): ForgeItem => ({
  id: uid(),
  name: '',
  slot: 'weapon',
  rarity: 'epic',
  equipmentLevel: 30,
  canForge: false,
  iconUrl: '',
  attributes: [],
  specialTalent: '',
  iconicAttributes: [],
  materials: [],
  goldCost: 0,
})

function ItemEditorModal({
  item, sets, onSave, onClose,
}: {
  item: ForgeItem | null
  sets: EquipmentSet[]
  onSave: (item: ForgeItem) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<ForgeItem>(() => item ? { ...item } : BLANK_ITEM())
  const [showIconPicker, setShowIconPicker] = useState(false)

  const up = (patch: Partial<ForgeItem>) => setForm(f => ({ ...f, ...patch }))

  /* ---- attributes ---- */
  const addAttr = () => up({ attributes: [...form.attributes, { label: '', value: '', color: 'green' }] })
  const setAttr = (i: number, patch: Partial<EquipmentAttribute>) =>
    up({ attributes: form.attributes.map((a, j) => j === i ? { ...a, ...patch } : a) })
  const removeAttr = (i: number) => up({ attributes: form.attributes.filter((_, j) => j !== i) })

  /* ---- iconic attrs ---- */
  const addIconic = () => {
    const tiers: IconicAttribute['tier'][] = ['I', 'II', 'III', 'IV', 'V']
    const next = tiers[form.iconicAttributes?.length ?? 0] ?? 'I'
    up({ iconicAttributes: [...(form.iconicAttributes ?? []), { tier: next, description: '', isSkill: false }] })
  }
  const setIconic = (i: number, patch: Partial<IconicAttribute>) =>
    up({ iconicAttributes: (form.iconicAttributes ?? []).map((a, j) => j === i ? { ...a, ...patch } : a) })
  const removeIconic = (i: number) =>
    up({ iconicAttributes: (form.iconicAttributes ?? []).filter((_, j) => j !== i) })

  /* ---- materials ---- */
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

          {/* Name + Icon */}
          <div className="flex gap-3 items-start">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Equipment Name</Label>
              <Input value={form.name} onChange={e => up({ name: e.target.value })} placeholder="e.g. Lance of the Hellish Wasteland" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Icon</Label>
              <button
                onClick={() => setShowIconPicker(true)}
                className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/60 transition-colors overflow-hidden bg-secondary/30"
              >
                {form.iconUrl
                  ? <Image src={form.iconUrl} alt="icon" width={44} height={44} className="object-contain" />
                  : <Plus className="h-5 w-5 text-muted-foreground" />
                }
              </button>
            </div>
          </div>

          {/* Slot / Rarity / Level row */}
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
              <Input type="number" min={1} max={100}
                value={form.equipmentLevel}
                onChange={e => up({ equipmentLevel: Number(e.target.value) || 1 })} />
            </div>
          </div>

          {/* Set + Can Forge */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Can Forge?</Label>
              <div className="flex items-center gap-3 h-9">
                <button
                  onClick={() => up({ canForge: !form.canForge })}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.canForge ? 'bg-green-600' : 'bg-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    form.canForge ? 'translate-x-6' : 'translate-x-1',
                  )} />
                </button>
                <span className="text-sm text-muted-foreground">
                  {form.canForge ? 'Yes — shows "Can Forge" badge' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Equipment Attributes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Equipment Attributes</Label>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={addAttr}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {form.attributes.map((attr, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={attr.label}
                  onChange={e => setAttr(i, { label: e.target.value })}
                  placeholder="Cavalry Attack"
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  value={attr.value}
                  onChange={e => setAttr(i, { value: e.target.value })}
                  placeholder="+20%"
                  className="w-20 h-8 text-sm"
                />
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

          {/* Special Talent */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Special Talent (optional)</Label>
            <Textarea
              value={form.specialTalent ?? ''}
              onChange={e => up({ specialTalent: e.target.value })}
              placeholder="When forging a piece of equipment, it may gain a special talent effect..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Iconic Attributes */}
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
                <Input
                  value={ia.description}
                  onChange={e => setIconic(i, { description: e.target.value })}
                  placeholder="Siege Unit Base Attack +1"
                  className="flex-1 h-8 text-sm"
                />
                <button
                  onClick={() => setIconic(i, { isSkill: !ia.isSkill })}
                  title="Toggle as skill (underlined)"
                  className={cn(
                    'text-xs px-2 h-8 rounded border transition-colors',
                    ia.isSkill ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-border text-muted-foreground',
                  )}
                >
                  Skill
                </button>
                <button onClick={() => removeIconic(i)} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Materials */}
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
                    <Image src={def.iconPath} alt={def.name} width={28} height={28} className="object-contain flex-shrink-0 rounded" />
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
                  <Input
                    type="number" min={1} value={mat.amount}
                    onChange={e => setMat(i, { amount: Number(e.target.value) || 1 })}
                    className="w-20 h-8 text-sm"
                    placeholder="20"
                  />
                  <button onClick={() => removeMat(i)} className="text-muted-foreground hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Gold Cost */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Gold Cost</Label>
            <div className="flex items-center gap-2">
              <Image src="/images/bundle/gold.png" alt="gold" width={24} height={24} className="object-contain" />
              <Input
                type="number" min={0} value={form.goldCost}
                onChange={e => up({ goldCost: Number(e.target.value) || 0 })}
                className="w-40 text-sm"
                placeholder="5000000"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={!canSave} className="gap-1.5">
              <Save className="h-4 w-4" /> Save Equipment
            </Button>
          </div>
        </div>

        {showIconPicker && (
          <IconPickerModal
            current={form.iconUrl}
            onSelect={v => { up({ iconUrl: v }); setShowIconPicker(false) }}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  SET MANAGER MODAL                                                  */
/* ================================================================== */

const BLANK_SET = (): EquipmentSet => ({ id: uid(), name: '', bonuses: [] })

function SetManagerModal({
  sets, onSaveSets, onClose,
}: {
  sets: EquipmentSet[]
  onSaveSets: (sets: EquipmentSet[]) => void
  onClose: () => void
}) {
  const [localSets, setLocalSets] = useState<EquipmentSet[]>(sets)
  const [editing, setEditing] = useState<EquipmentSet | null>(null)

  const saveEditing = () => {
    if (!editing || !editing.name.trim()) return
    const exists = localSets.some(s => s.id === editing.id)
    setLocalSets(exists ? localSets.map(s => s.id === editing.id ? editing : s) : [...localSets, editing])
    setEditing(null)
  }

  const removeSet = (id: string) => setLocalSets(localSets.filter(s => s.id !== id))

  const upEditing = (patch: Partial<EquipmentSet>) =>
    setEditing(e => e ? { ...e, ...patch } : e)

  const addBonus = () =>
    upEditing({ bonuses: [...(editing?.bonuses ?? []), { pieces: 2, description: '' }] })

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
          {/* Existing sets */}
          {localSets.length > 0 && (
            <div className="space-y-2">
              {localSets.map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.bonuses.length} bonus(es)</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing({ ...s })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    onClick={() => removeSet(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          {!editing && (
            <Button variant="outline" className="w-full gap-1.5 text-sm"
              onClick={() => setEditing(BLANK_SET())}>
              <Plus className="h-4 w-4" /> Add New Set
            </Button>
          )}

          {/* Editor */}
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
                    <Input value={b.description}
                      onChange={e => setBonus(i, { description: e.target.value })}
                      placeholder="Troop Health +3%"
                      className="flex-1 h-8 text-sm" />
                    <button onClick={() => removeBonus(i)} className="text-muted-foreground hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm" onClick={saveEditing} disabled={!editing.name.trim()} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Save Set
                </Button>
              </div>
            </div>
          )}

          {/* Confirm & close */}
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
/*  MAIN EQUIPMENT FORGE COMPONENT                                     */
/* ================================================================== */

export function EquipmentForge() {
  const [state, setState] = useState<ForgeState>(() => {
    const saved = loadForgeState()
    if (saved.items.length === 0) {
      return { items: EQUIPMENT_FORGE_SEED_ITEMS, sets: saved.sets }
    }
    return saved
  })
  const [activeFilter, setActiveFilter] = useState<ForgeFilter>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ForgeItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showSetManager, setShowSetManager] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'forge' | 'refine' | 'awaken' | 'dismantle'>('forge')

  const updateState = useCallback((next: ForgeState) => {
    setState(next)
    saveForgeState(next)
  }, [])

  const filteredItems = useMemo(() => {
    const { items } = state
    if (activeFilter === 'all') return items
    if (activeFilter === 'forgeable') return items.filter(i => i.canForge)
    if (activeFilter === 'sets') return items.filter(i => !!i.setId)
    return items.filter(i => i.slot === activeFilter)
  }, [state, activeFilter])

  const selectedItem = useMemo(
    () => state.items.find(i => i.id === selectedItemId) ?? filteredItems[0] ?? null,
    [state.items, selectedItemId, filteredItems],
  )

  const selectedSet = useMemo(
    () => selectedItem?.setId ? state.sets.find(s => s.id === selectedItem.setId) ?? null : null,
    [selectedItem, state.sets],
  )

  const handleSaveItem = (item: ForgeItem) => {
    const exists = state.items.some(i => i.id === item.id)
    const items = exists ? state.items.map(i => i.id === item.id ? item : i) : [...state.items, item]
    updateState({ ...state, items })
    setSelectedItemId(item.id)
    setEditingItem(null)
    setShowAddItem(false)
  }

  const handleDeleteItem = (id: string) => {
    updateState({ ...state, items: state.items.filter(i => i.id !== id) })
    if (selectedItemId === id) setSelectedItemId(null)
    setShowDeleteConfirm(null)
  }

  const rc = selectedItem ? RARITY_CONFIG[selectedItem.rarity] : null

  return (
    <div className="flex flex-col gap-3">
      {/* ── Top Tab Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {(['forge', 'refine', 'awaken', 'dismantle'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-all',
                tab === activeTab
                  ? 'bg-amber-700/70 text-amber-100 border border-amber-500/60 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/30 border border-transparent',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
          onClick={() => setShowSetManager(true)}>
          <Layers className="h-3.5 w-3.5" /> Manage Sets
        </Button>
      </div>

      {activeTab !== 'forge' ? (
        <div className="flex items-center justify-center min-h-40 rounded-xl border border-border bg-secondary/10">
          <p className="text-muted-foreground text-sm capitalize">{activeTab} — coming soon</p>
        </div>
      ) : (
        /* ── Forge Tab Layout ── */
        <div className="flex gap-3 min-h-[560px]">

          {/* LEFT: Filter pills + Item grid */}
          <div className="flex gap-2 flex-shrink-0" style={{ width: '300px' }}>
            {/* Filter pill column */}
            <div className="flex flex-col gap-0.5" style={{ width: '88px' }}>
              <Button
                size="sm"
                onClick={() => setShowAddItem(true)}
                className="h-8 w-full text-xs gap-1 mb-1.5 bg-amber-600 hover:bg-amber-500 text-white border-amber-500 font-bold"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
              {FORGE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => { setActiveFilter(f.key) }}
                  className={cn(
                    'py-1.5 px-2 text-[11px] font-medium rounded text-left transition-all',
                    activeFilter === f.key
                      ? 'bg-amber-700/30 text-amber-300 border border-amber-600/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Item grid */}
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
                      <button
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={cn(
                          'relative flex flex-col items-center justify-between rounded-lg border-2 p-1.5 transition-all aspect-square overflow-hidden',
                          irc.itemBg,
                          isSelected
                            ? `${irc.itemBorder} scale-[1.04]`
                            : 'border-transparent hover:border-white/20',
                        )}
                        style={isSelected ? { boxShadow: irc.glow } : {}}
                      >
                        {/* Inner glow when selected */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-lg"
                            style={{ background: `radial-gradient(circle at center, ${irc.glowColor}22 0%, transparent 70%)` }} />
                        )}
                        {/* Icon */}
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
                        {/* Can Forge badge */}
                        {item.canForge && (
                          <div className="absolute bottom-0 left-0 right-0 bg-green-600/95 text-center text-[9px] font-bold text-white py-0.5 z-20">
                            Can Forge
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CENTER: Forge display + materials */}
          <div className="flex flex-col flex-1 min-w-0 gap-3">
            {/* Forge arch background */}
            <div
              className="relative flex-1 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{
                background: `
                  radial-gradient(ellipse at 50% 70%, rgba(200,90,10,0.3) 0%, rgba(100,40,5,0.45) 35%, rgba(8,6,3,0.97) 75%),
                  linear-gradient(to bottom, #0e0a06, #1a0e05)
                `,
                border: '1px solid rgba(180,90,15,0.25)',
                minHeight: '280px',
              }}
            >
              {/* Arch portal glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 90%, rgba(255,140,0,0.18) 0%, transparent 55%)' }} />
              {/* Top edge glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,160,30,0.4), transparent)' }} />

              {/* Floating icon */}
              <div className={cn('z-10 relative', selectedItem && 'forge-float')}>
                {selectedItem?.iconUrl ? (
                  <Image
                    src={selectedItem.iconUrl}
                    alt={selectedItem.name}
                    width={160}
                    height={160}
                    className="object-contain"
                    style={{ filter: rc ? `drop-shadow(0 0 32px ${rc.glowColor})` : undefined }}
                  />
                ) : (
                  <div
                    className="h-36 w-36 rounded-2xl flex items-center justify-center"
                    style={{
                      background: selectedItem
                        ? `radial-gradient(circle, ${rc!.glowColor}40 0%, rgba(0,0,0,0.85) 70%)`
                        : 'radial-gradient(circle, rgba(120,60,10,0.4) 0%, rgba(0,0,0,0.85) 70%)',
                      boxShadow: rc ? `0 0 40px ${rc.glowColor}` : undefined,
                    }}
                  >
                    <Sword className={cn('h-16 w-16', rc ? rc.nameCls : 'text-amber-800/50')} />
                  </div>
                )}
              </div>
            </div>

            {/* Materials Needed */}
            {selectedItem ? (
              <div className="space-y-2">
                <p className="text-xs text-center font-medium text-muted-foreground tracking-wide">Materials Needed</p>
                <div className="flex items-end justify-center gap-4 flex-wrap">
                  {selectedItem.materials.map((mat, idx) => {
                    const def = FORGE_MATERIAL_DEFS.find(d => d.id === mat.materialId)
                    return (
                      <div key={idx} className="flex flex-col items-center gap-0.5">
                        <div
                          className="h-14 w-14 rounded-lg border-2 flex items-center justify-center overflow-hidden"
                          style={{
                            borderColor: def?.rarityColor ?? '#555',
                            background: `radial-gradient(circle, ${def?.rarityColor ?? '#333'}22 0%, rgba(0,0,0,0.6) 100%)`,
                            boxShadow: `0 0 10px ${def?.rarityColor ?? '#333'}44`,
                          }}
                        >
                          {def ? (
                            <Image src={def.iconPath} alt={def.name} width={44} height={44} className="object-contain p-0.5" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">0/{mat.amount}</span>
                      </div>
                    )
                  })}
                  {selectedItem.goldCost > 0 && (
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="h-14 w-14 rounded-lg border-2 border-yellow-600/60 flex items-center justify-center overflow-hidden bg-yellow-900/20"
                        style={{ boxShadow: '0 0 10px rgba(251,191,36,0.3)' }}>
                        <Image src="/images/bundle/gold.png" alt="Gold" width={44} height={44} className="object-contain p-0.5" />
                      </div>
                      <span className="text-xs text-yellow-400 tabular-nums font-medium">
                        {selectedItem.goldCost >= 1_000_000
                          ? `${(selectedItem.goldCost / 1_000_000).toFixed(1)}M`
                          : selectedItem.goldCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Quick Forge button */}
                <div className="flex justify-center pt-1">
                  <button className="px-10 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                      boxShadow: '0 4px 14px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                      color: '#1c1005',
                    }}>
                    Quick Forge
                  </button>
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

          {/* RIGHT: Stats panel */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ width: '260px', maxHeight: '560px' }}>
            {selectedItem ? (
              <ItemDetailsPanel
                item={selectedItem}
                set={selectedSet}
                allSets={state.sets}
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
        </div>
      )}

      {/* ── Modals ── */}
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
              <Button variant="destructive" onClick={() => handleDeleteItem(showDeleteConfirm)}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showSetManager && (
        <SetManagerModal
          sets={state.sets}
          onSaveSets={sets => updateState({ ...state, sets })}
          onClose={() => setShowSetManager(false)}
        />
      )}
    </div>
  )
}
