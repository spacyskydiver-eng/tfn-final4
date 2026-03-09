'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Search, X, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EQUIPMENT_FORGE_SEED_ITEMS } from '@/lib/game/equipment-forge-seed'
import { EQUIPMENT_SETS } from '@/lib/game/equipment-sets-data'
import { ICONIC_DATA } from '@/lib/game/equipment-iconics-data'
import type { KvkSeason } from '@/lib/game/equipment-iconics-data'

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type SlotKey = 'helmet' | 'weapon' | 'chest' | 'gloves' | 'legs' | 'boots' | 'accessory1' | 'accessory2'

interface LoadoutItem { id: string; refined: boolean; awakenLevel: number }
type Loadout = Partial<Record<SlotKey, LoadoutItem>>

interface TotalStats { stats: Record<string, number>; special: Record<string, boolean>; iconicBonusesByTier: Record<number, Record<string, string | boolean>> }

/* ================================================================== */
/*  CONSTANTS                                                          */
/* ================================================================== */

const SLOT_ORDER: SlotKey[] = ['helmet', 'weapon', 'chest', 'gloves', 'legs', 'boots', 'accessory1', 'accessory2']

const SLOT_PLACEHOLDERS: Record<SlotKey, string> = {
  helmet:    '/images/equipment/mat_icons/helmet_slot.webp',
  weapon:    '/images/equipment/mat_icons/weapon_slot.webp',
  chest:     '/images/equipment/mat_icons/chest_slot.webp',
  gloves:    '/images/equipment/mat_icons/glove_slot.webp',
  legs:      '/images/equipment/mat_icons/leggings_slot.webp',
  boots:     '/images/equipment/mat_icons/boots_slot.webp',
  accessory1:'/images/equipment/mat_icons/accessory1_slot.webp',
  accessory2:'/images/equipment/mat_icons/accessory2_slot.webp',
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
/*  HELPERS                                                            */
/* ================================================================== */

function formatStatName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('March Speed', 'March Speed')
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
  return ['', 'I', 'II', 'III', 'IV', 'V'][n] ?? ''
}

function calcLoadoutStats(loadout: Loadout, kvkSeason: KvkSeason = 'soc'): TotalStats {
  const totalStats: Record<string, number> = {}
  const specialStats: Record<string, boolean> = {}
  const tempAgg: Record<number, Record<string, { value: number; isPercent: boolean }>> = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }
  const iconicBonusesByTier: Record<number, Record<string, string | boolean>> = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }

  const equippedPieces = Object.values(loadout).filter(Boolean) as LoadoutItem[]
  const equippedIds = equippedPieces.map(i => i.id)

  equippedPieces.forEach(item => {
    const data = EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === item.id)
    if (!data) return

    // base stats
    data.attributes.forEach(attr => {
      const numVal = parseFloat(attr.value.replace(/[^0-9.-]/g, ''))
      if (isNaN(numVal)) return
      const key = attr.label.toLowerCase().replace(/ /g, '_')
      totalStats[key] = (totalStats[key] ?? 0) + numVal
      if (item.refined) totalStats[key] += getRefinedBonus(numVal)
    })

    // special talent
    if (data.specialTalent) {
      data.specialTalent.split(', ').forEach(s => { specialStats[s] = true })
    }

    // iconics
    const iconicInfo = ICONIC_DATA[data.name] ?? (data.rarity === 'legendary' && data.slot === 'accessory' ? ICONIC_DATA['Accessory'] : null)
    if (iconicInfo && item.awakenLevel > 0) {
      for (let i = 1; i <= item.awakenLevel; i++) {
        const tier = iconicInfo.tiers[String(i)]
        if (!tier) continue
        const statName = tier.stat ? formatStatName(tier.stat) : null

        switch (tier.type) {
          case 'base_stat': {
            const v = (tier.values?.[kvkSeason] ?? 0) + (item.refined ? (typeof tier.crit_bonus === 'number' ? tier.crit_bonus : 0) : 0)
            if (statName) { if (!tempAgg[i][statName]) tempAgg[i][statName] = { value: 0, isPercent: false }; tempAgg[i][statName].value += v }
            break
          }
          case 'percent_stat': {
            const v = (tier.value ?? 0) + (item.refined ? (typeof tier.crit_buff === 'number' ? tier.crit_buff : 0) : 0)
            if (statName) { if (!tempAgg[i][statName]) tempAgg[i][statName] = { value: 0, isPercent: true }; tempAgg[i][statName].value += v; tempAgg[i][statName].isPercent = true }
            break
          }
          case 'flat_stat': {
            const v = (tier.value ?? 0) + (item.refined ? (typeof tier.crit_buff === 'number' ? Math.round(tier.crit_buff / 10) * 10 : 0) : 0)
            if (statName) { if (!tempAgg[i][statName]) tempAgg[i][statName] = { value: 0, isPercent: false }; tempAgg[i][statName].value += v }
            break
          }
          case 'special': {
            let desc = tier.description ?? ''
            if (tier.values) {
              Object.entries(tier.values).forEach(([k, val]) => {
                let v: number = val as number
                if (item.refined && typeof tier.crit_bonus === 'object' && tier.crit_bonus !== null) v += (tier.crit_bonus as Record<string, number>)[k] ?? 0
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

  // flatten iconic aggregates
  for (let i = 1; i <= 5; i++) {
    Object.entries(tempAgg[i]).forEach(([name, data]) => {
      if (data.value > 0) iconicBonusesByTier[i][name] = data.isPercent ? `+${parseFloat(data.value.toFixed(1))}%` : `+${data.value.toLocaleString()}`
    })
  }

  // set bonuses
  EQUIPMENT_SETS.forEach(set => {
    const count = set.pieces.filter(p => equippedIds.includes(p)).length
    set.bonuses.forEach(bonus => {
      if (count >= bonus.count) specialStats[`[${count}/${set.pieces.length}] ${set.name}: ${bonus.description}`] = true
    })
  })

  // expand troop_* into individual troops
  const troopTypes = ['infantry', 'cavalry', 'archer', 'siege'] as const;
  (['attack', 'defense', 'health'] as const).forEach(st => {
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
/*  ITEM PICKER MODAL                                                  */
/* ================================================================== */

function ItemPickerModal({
  slot, onSelect, onClose,
}: { slot: SlotKey; onSelect: (id: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('All')

  // Map accessory1/2 → accessory slot in data
  const dataSlot = slot === 'accessory1' || slot === 'accessory2' ? 'accessory' : slot

  const filtered = useMemo(() => {
    const base = EQUIPMENT_FORGE_SEED_ITEMS.filter(i => i.slot === dataSlot)
    const byRarity = rarityFilter === 'All' ? base : base.filter(i => {
      const q = i.rarity
      const map: Record<string, string> = { common: 'Normal', uncommon: 'Advanced', rare: 'Elite', epic: 'Epic', legendary: 'Legendary' }
      return map[q] === rarityFilter
    })
    if (!search.trim()) return byRarity
    return byRarity.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  }, [dataSlot, rarityFilter, search])

  const rarities = ['All', 'Legendary', 'Epic', 'Elite', 'Advanced', 'Normal']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: 700, maxHeight: '85vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-bold">Select {SLOT_LABELS[slot]}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment..." className="pl-9 h-9" />
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
            const qLabel = { common: 'Normal', uncommon: 'Advanced', rare: 'Elite', epic: 'Epic', legendary: 'Legendary' }[item.rarity] ?? 'Normal'
            return (
              <button key={item.id} onClick={() => { onSelect(item.id); onClose() }}
                className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-left transition-all hover:scale-[1.03] hover:border-primary/60',
                  RARITY_BG[qLabel], RARITY_BORDER[qLabel]
                )}>
                <div className="h-14 w-14 flex items-center justify-center">
                  {item.iconUrl
                    ? <Image src={item.iconUrl} alt={item.name} width={52} height={52} className="object-contain" />
                    : <div className="h-12 w-12 rounded bg-black/30" />}
                </div>
                <span className={cn('text-[10px] font-semibold text-center leading-tight', RARITY_COLORS[qLabel])}>{item.name}</span>
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
/*  LOADOUT GRID COMPONENT                                             */
/* ================================================================== */

function LoadoutGrid({
  loadout, label, onSlotClick, onRemove, showRefined, showAwakenBadge, onToggleRefine, onSetAwaken, onContextMenu,
}: {
  loadout: Loadout
  label?: string
  onSlotClick: (slot: SlotKey) => void
  onRemove: (slot: SlotKey) => void
  showRefined: boolean
  showAwakenBadge: boolean
  onToggleRefine?: (slot: SlotKey) => void
  onSetAwaken?: (slot: SlotKey) => void
  onContextMenu?: (e: React.MouseEvent, slot: SlotKey) => void
}) {
  return (
    <div>
      {label && <p className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">{label}</p>}
      <div className="grid grid-cols-4 gap-1.5">
        {SLOT_ORDER.map(slot => {
          const item = loadout[slot]
          const data = item ? EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === item.id) : null
          const qLabel = data ? ({ common: 'Normal', uncommon: 'Advanced', rare: 'Elite', epic: 'Epic', legendary: 'Legendary' }[data.rarity] ?? 'Normal') : null

          return (
            <div key={slot} className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  'relative h-16 w-16 rounded-lg border-2 cursor-pointer transition-all hover:brightness-110 overflow-hidden flex items-center justify-center',
                  item && qLabel ? `${RARITY_BG[qLabel]} ${RARITY_BORDER[qLabel]}` : 'border-border bg-secondary/30',
                  item?.refined && showRefined ? 'ring-2 ring-amber-400/60' : '',
                )}
                onClick={() => onSlotClick(slot)}
                onContextMenu={e => { if (item && onContextMenu) { e.preventDefault(); onContextMenu(e, slot) } }}
              >
                <Image
                  src={data?.iconUrl ?? SLOT_PLACEHOLDERS[slot]}
                  alt={data?.name ?? slot}
                  width={52} height={52}
                  className="object-contain"
                />
                {item?.awakenLevel && item.awakenLevel > 0 && showAwakenBadge && (
                  <div className="absolute top-0.5 left-0.5 bg-purple-900/90 text-purple-200 text-[8px] font-bold rounded px-0.5 leading-4">
                    {toRoman(item.awakenLevel)}
                  </div>
                )}
                {item?.refined && showRefined && (
                  <div className="absolute bottom-0 right-0 bg-amber-600/90 text-[7px] font-bold text-white px-0.5 rounded-tl">R</div>
                )}
                {item && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(slot) }}
                    className="absolute top-0 right-0 h-4 w-4 bg-black/70 text-red-400 flex items-center justify-center rounded-bl opacity-0 hover:opacity-100 transition-opacity text-xs"
                  >×</button>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground text-center leading-tight w-16 truncate text-center">{data?.name ?? SLOT_LABELS[slot]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  STATS SUMMARY                                                      */
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

  // sort: troop type groups by total value desc, within group: attack→defense→health
  const statPriority = (k: string) => k.includes('attack') ? 0 : k.includes('defense') ? 1 : k.includes('health') ? 2 : 3
  const groupOrder = ['infantry', 'cavalry', 'archer', 'siege', 'general']

  const specialKeys = Object.keys(result.special).filter(k => result.special[k])
  const hasIconic = Object.values(result.iconicBonusesByTier).some(t => Object.keys(t).length > 0)

  return (
    <div className="space-y-2">
      {groupOrder.filter(g => grouped[g]?.length).map(group => (
        <div key={group}>
          <div className="flex items-center gap-1 mb-0.5">
            {TROOP_ICONS[group] && <Image src={TROOP_ICONS[group]} alt={group} width={14} height={14} className="object-contain" />}
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', TROOP_COLORS[group])}>{group}</span>
          </div>
          {grouped[group].sort((a, b) => statPriority(a) - statPriority(b)).map(key => (
            <div key={key} className="flex items-center justify-between px-1 py-0.5 rounded text-xs hover:bg-secondary/30">
              <span className="text-muted-foreground">{formatStatName(key)}</span>
              <span className={cn('font-bold', TROOP_COLORS[group])}>+{result.stats[key].toFixed(1).replace('.0', '')}%</span>
            </div>
          ))}
        </div>
      ))}

      {(specialKeys.length > 0 || hasIconic) && (
        <div>
          <button onClick={() => setShowSpecial(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground w-full">
            Extra Bonuses {showSpecial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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
/*  MATERIALS SUMMARY                                                  */
/* ================================================================== */

function MaterialsSummary({ loadout }: { loadout: Loadout }) {
  const mats = calcLoadoutMaterials(loadout)
  const hasAny = MATS.some(m => mats[m] > 0) || mats.gold > 0

  if (!hasAny) return (
    <p className="text-xs text-muted-foreground text-center py-4">Equip items to see materials</p>
  )

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
              <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-500" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      ))}
      {mats.gold > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Image src="/images/equipment/mat_icons/gold_icon.webp" alt="Gold" width={28} height={28} className="object-contain flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Gold</span>
              <span className="font-bold text-yellow-400">{mats.gold >= 1_000_000 ? `${(mats.gold / 1_000_000).toFixed(1)}M` : mats.gold.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  COMPARE STATS TABLE                                                */
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

  const statPriority = (k: string) => k.includes('attack') ? 0 : k.includes('defense') ? 1 : k.includes('health') ? 2 : 3
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
    return <p className="text-sm text-muted-foreground text-center py-8">Equip items in both loadouts to compare stats</p>
  }

  return (
    <div className="space-y-2">
      {/* filter + toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {troopFilters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-2.5 py-0.5 rounded text-xs font-medium capitalize transition-colors border',
                filter === f
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}>
              {f === 'all' ? 'All' : <span className="flex items-center gap-1">
                {TROOP_ICONS[f] && <Image src={TROOP_ICONS[f]} alt={f} width={12} height={12} className="object-contain" />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </span>}
            </button>
          ))}
        </div>
        <button onClick={() => setShowExtra(v => !v)}
          className={cn('px-2.5 py-0.5 rounded text-xs font-medium border transition-colors',
            showExtra ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-border text-muted-foreground hover:text-foreground'
          )}>
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
              <div key={key} className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-1 border-b border-border/40 hover:bg-secondary/20 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  {TROOP_ICONS[group] && <Image src={TROOP_ICONS[group]} alt={group} width={11} height={11} className="object-contain flex-shrink-0" />}
                  {formatStatName(key)}
                </span>
                <span className="text-center text-blue-300 font-medium">{vA > 0 ? `+${vA.toFixed(1).replace('.0', '')}%` : '—'}</span>
                <span className="text-center text-orange-300 font-medium">{vB > 0 ? `+${vB.toFixed(1).replace('.0', '')}%` : '—'}</span>
                <span className={cn('text-center font-bold flex items-center justify-center gap-0.5',
                  delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground'
                )}>
                  {delta > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : delta < 0 ? <ArrowDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
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
            <div key={i} className="grid grid-cols-[1fr_80px_80px_80px] px-3 py-1 border-b border-border/40 text-xs">
              <span className="text-muted-foreground pr-2">{k}</span>
              <span className="text-center">{statsA.special[k] ? '✓' : ''}</span>
              <span className="text-center">{statsB.special[k] ? '✓' : ''}</span>
              <span />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  AWAKEN MODAL                                                       */
/* ================================================================== */

function AwakenModal({ itemName, current, onSet, onClose }: { itemName: string; current: number; onSet: (level: number) => void; onClose: () => void }) {
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
                current === lvl ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}>
              {lvl === 0 ? '–' : toRoman(lvl)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  CALCULATOR TAB                                                     */
/* ================================================================== */

function CalculatorTab({
  loadout, kvkSeason, onSlotClick, onRemove, onToggleRefine, onSetAwaken, onClear,
}: {
  loadout: Loadout
  kvkSeason: KvkSeason
  onSlotClick: (slot: SlotKey) => void
  onRemove: (slot: SlotKey) => void
  onToggleRefine: (slot: SlotKey) => void
  onSetAwaken: (slot: SlotKey) => void
  onClear: () => void
}) {
  const result = useMemo(() => calcLoadoutStats(loadout, kvkSeason), [loadout, kvkSeason])
  const [panel, setPanel] = useState<'stats' | 'materials'>('stats')
  const [contextMenu, setContextMenu] = useState<{ slot: SlotKey; x: number; y: number } | null>(null)

  const handleSlotContext = useCallback((e: React.MouseEvent, slot: SlotKey) => {
    if (!loadout[slot]) return
    e.preventDefault()
    setContextMenu({ slot, x: e.clientX, y: e.clientY })
  }, [loadout])

  const slotData = contextMenu ? EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === loadout[contextMenu.slot]?.id) : null

  return (
    <div className="flex gap-4">
      {/* Left: Loadout */}
      <div className="flex-shrink-0 w-[340px]">
        <div className="rounded-xl border border-border bg-secondary/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Equipment Loadout</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-red-400"
              onClick={onClear}>
              <RotateCcw className="h-3 w-3" /> Clear
            </Button>
          </div>
          <LoadoutGrid
            loadout={loadout} onSlotClick={onSlotClick} onRemove={onRemove}
            showRefined showAwakenBadge
            onToggleRefine={onToggleRefine} onSetAwaken={onSetAwaken}
            onContextMenu={handleSlotContext}
          />
          <p className="text-[10px] text-muted-foreground text-center mt-3">Click slot to equip · Right-click for options</p>
        </div>
        {/* Right-click context menu */}
        {contextMenu && slotData && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 text-sm w-44"
              style={{ left: contextMenu.x, top: contextMenu.y }}>
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

      {/* Right: Stats + Materials */}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-border bg-secondary/10">
          <div className="flex border-b border-border">
            {(['stats', 'materials'] as const).map(p => (
              <button key={p} onClick={() => setPanel(p)}
                className={cn('flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors capitalize',
                  panel === p ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                )}>
                {p}
              </button>
            ))}
          </div>
          <div className="p-4 max-h-[480px] overflow-y-auto">
            {panel === 'stats' ? <StatsSummary result={result} /> : <MaterialsSummary loadout={loadout} />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  COMPARE TAB                                                        */
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
  const toggleRefine = (lo: 'A' | 'B', slot: SlotKey) => {
    const setter = lo === 'A' ? setLoadoutA : setLoadoutB
    setter(prev => prev[slot] ? { ...prev, [slot]: { ...prev[slot]!, refined: !prev[slot]!.refined } } : prev)
  }
  const setAwaken = (lo: 'A' | 'B', slot: SlotKey, level: number) => {
    const setter = lo === 'A' ? setLoadoutA : setLoadoutB
    setter(prev => prev[slot] ? { ...prev, [slot]: { ...prev[slot]!, awakenLevel: level } } : prev)
  }
  const clearLoadout = (lo: 'A' | 'B') => (lo === 'A' ? setLoadoutA : setLoadoutB)({})

  const awakenItem = awakenFor
    ? EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === (awakenFor.loadout === 'A' ? loadoutA : loadoutB)[awakenFor.slot]?.id)
    : null
  const awakenCurrent = awakenFor ? ((awakenFor.loadout === 'A' ? loadoutA : loadoutB)[awakenFor.slot]?.awakenLevel ?? 0) : 0

  return (
    <div className="space-y-4">
      {/* Two loadout grids */}
      <div className="grid grid-cols-2 gap-4">
        {(['A', 'B'] as const).map(lo => {
          const loadout = lo === 'A' ? loadoutA : loadoutB
          return (
            <div key={lo} className="rounded-xl border border-border bg-secondary/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className={cn('text-sm font-bold', lo === 'A' ? 'text-blue-400' : 'text-orange-400')}>
                  Loadout {lo}
                </p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-red-400 px-1.5"
                    onClick={() => clearLoadout(lo)}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <LoadoutGrid
                loadout={loadout}
                onSlotClick={slot => setPickerFor({ loadout: lo, slot })}
                onRemove={slot => removeItem(lo, slot)}
                showRefined showAwakenBadge
                onToggleRefine={slot => toggleRefine(lo, slot)}
                onSetAwaken={slot => setAwakenFor({ loadout: lo, slot })}
              />
              {/* Materials for this loadout */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Total Materials</p>
                <MaterialsSummary loadout={loadout} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
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
          onSet={lvl => setAwaken(awakenFor.loadout, awakenFor.slot, lvl)}
          onClose={() => setAwakenFor(null)}
        />
      )}
    </div>
  )
}

/* ================================================================== */
/*  MAIN EXPORT                                                        */
/* ================================================================== */

const STORAGE_KEY = 'equipment_calculator_v1'

interface SavedState {
  loadout: Loadout
  kvkSeason: KvkSeason
}

export function EquipmentForge() {
  const [tab, setTab] = useState<'calculator' | 'compare'>('calculator')
  const [kvkSeason, setKvkSeason] = useState<KvkSeason>('soc')
  const [loadout, setLoadout] = useState<Loadout>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s) { const parsed: SavedState = JSON.parse(s); return parsed.loadout ?? {} }
    } catch { /* ignore */ }
    return {}
  })
  const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null)
  const [awakenSlot, setAwakenSlot] = useState<SlotKey | null>(null)

  // persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ loadout, kvkSeason })) } catch { /* ignore */ }
  }, [loadout, kvkSeason])

  const setItem = useCallback((slot: SlotKey, id: string) => {
    setLoadout(prev => ({ ...prev, [slot]: { id, refined: false, awakenLevel: 0 } }))
  }, [])
  const removeItem = useCallback((slot: SlotKey) => {
    setLoadout(prev => { const n = { ...prev }; delete n[slot]; return n })
  }, [])
  const toggleRefine = useCallback((slot: SlotKey) => {
    setLoadout(prev => prev[slot] ? { ...prev, [slot]: { ...prev[slot]!, refined: !prev[slot]!.refined } } : prev)
  }, [])
  const setAwakenLevel = useCallback((slot: SlotKey, level: number) => {
    setLoadout(prev => prev[slot] ? { ...prev, [slot]: { ...prev[slot]!, awakenLevel: level } } : prev)
  }, [])

  const awakenItem = awakenSlot ? EQUIPMENT_FORGE_SEED_ITEMS.find(d => d.id === loadout[awakenSlot]?.id) : null
  const awakenCurrent = awakenSlot ? (loadout[awakenSlot]?.awakenLevel ?? 0) : 0

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {(['calculator', 'compare'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-all capitalize',
                t === tab
                  ? 'bg-amber-700/60 text-amber-100 border border-amber-500/60'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/30 border border-transparent'
              )}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">KvK Season:</span>
          <div className="flex gap-1">
            {KVK_SEASONS.map(s => (
              <button key={s.value} onClick={() => setKvkSeason(s.value)}
                className={cn('px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                  kvkSeason === s.value
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === 'calculator' ? (
        <CalculatorTab
          loadout={loadout}
          kvkSeason={kvkSeason}
          onSlotClick={slot => setPickerSlot(slot)}
          onRemove={removeItem}
          onToggleRefine={toggleRefine}
          onSetAwaken={slot => setAwakenSlot(slot)}
          onClear={() => setLoadout({})}
        />
      ) : (
        <CompareTab kvkSeason={kvkSeason} />
      )}

      {/* Modals */}
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
