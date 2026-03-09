"use client"

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Plus, Trash2, Pencil, Check, ChevronDown,
  LayoutList, LayoutGrid, GitCompare, SlidersHorizontal, Tag, X, CalendarPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"

// ─── Types ────────────────────────────────────────────────────────────────────

type RowType = "number" | "days" | "currency"
type ViewMode = "tables" | "cards" | "compare" | "plan"

type TierColumn = {
  id: string
  icon: string
  name: string
  price: number
  maxPurchase: number
}

type BundleRow = {
  id: string
  icon: string
  label: string
  values: Record<string, number>
  rowType: RowType
}

type Bundle = {
  id: string
  name: string
  category: string
  columns: TierColumn[]
  rows: BundleRow[]
}

type AppState = {
  bundles: Bundle[]
  categories: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ["Daily", "Monthly", "KvK 1", "KvK 2", "KvK 3", "KvK", "Events", "SoC"]

// ─── Icon Library ─────────────────────────────────────────────────────────────

export const ALL_ICONS = [
  { id: "stone_chest",         label: "Stone Chest",         src: "/images/bundle/stone_chest.png" },
  { id: "iron_chest",          label: "Iron Chest",          src: "/images/bundle/iron_chest.png" },
  { id: "bronze_chest",        label: "Bronze Chest",        src: "/images/bundle/bronze_chest.png" },
  { id: "silver_chest",        label: "Silver Chest",        src: "/images/bundle/silver_chest.png" },
  { id: "gold_chest",          label: "Gold Chest",          src: "/images/bundle/gold_chest.png" },
  { id: "alliance_wood",       label: "Alliance Wooden",     src: "/images/bundle/Alliance_Wooden_Chest.webp" },
  { id: "alliance_iron",       label: "Alliance Iron",       src: "/images/bundle/Alliance_Iron_Chest.webp" },
  { id: "alliance_bronze",     label: "Alliance Bronze",     src: "/images/bundle/Alliance_Bronze_Chest.webp" },
  { id: "common_mat",          label: "Common Mat",          src: "/images/bundle/common_mat_chest.png" },
  { id: "uncommon_mat",        label: "Uncommon Mat",        src: "/images/bundle/uncommon_mat_chest.png" },
  { id: "epic_mat",            label: "Epic Mat",            src: "/images/bundle/epic_mat_chest.png" },
  { id: "legendary_mat",       label: "Legendary Mat",       src: "/images/bundle/legendary_mat_chest.png" },
  { id: "epic_form",           label: "Epic Formation",      src: "/images/bundle/epic_formation_chest.png" },
  { id: "gem",                 label: "Gem",                 src: "/images/bundle/gem.png" },
  { id: "item_gem",            label: "Blue Gem",            src: "/images/bundle/Item_Gem.webp" },
  { id: "vip",                 label: "VIP",                 src: "/images/bundle/vip_point.png" },
  { id: "crystal",             label: "Crystal",             src: "/images/bundle/crystal.png" },
  { id: "crystal_key",         label: "Crystal Key",         src: "/images/bundle/crystal_key.png" },
  { id: "relic",               label: "Relic Coins",         src: "/images/bundle/relic_coins.png" },
  { id: "exhibit",             label: "Exhibit Coin",        src: "/images/bundle/exhibit_coin.png" },
  { id: "conversion_stone",    label: "Conversion Stone",    src: "/images/bundle/conversion_stone.png" },
  { id: "transmutation_stone", label: "Transmutation Stone", src: "/images/bundle/transmutation_stone.png" },
  { id: "passport",            label: "Passport",            src: "/images/bundle/passport_item.png" },
  { id: "level3_pick",         label: "Level 3 Pick One",    src: "/images/bundle/level_3_pick_one.png" },
  { id: "speed_heal",          label: "Healing Speed",       src: "/images/bundle/healing_speed.png" },
  { id: "speed_training",      label: "Training Speed",      src: "/images/bundle/training_speed.png" },
  { id: "speed_universal",     label: "Universal Speed",     src: "/images/bundle/universal_speed.png" },
  { id: "food",                label: "Food",                src: "/images/bundle/food.png" },
  { id: "wood",                label: "Wood",                src: "/images/bundle/wood.png" },
  { id: "gold_key",            label: "Gold Key",            src: "/images/bundle/gold_key.png" },
  { id: "silver_key",          label: "Silver Key",          src: "/images/bundle/silver_key.png" },
  { id: "brand_new_star",      label: "Brand New Star",      src: "/images/bundle/brand_new_star.png" },
  { id: "dazzling_star",       label: "Dazzling Star",       src: "/images/bundle/dazzling_star.png" },
  { id: "blessed_brand",       label: "Blessed Brand New",   src: "/images/bundle/blessed_brand_new_star.png" },
  { id: "blessed_dazzling",    label: "Blessed Dazzling",    src: "/images/bundle/blessed_dazzling_star.png" },
  { id: "bundle_brand",        label: "Bundle Brand New",    src: "/images/bundle/bundle_bran_new_star.png" },
  { id: "bundle_dazzling",     label: "Bundle Dazzling",     src: "/images/bundle/bundle_dazzling_star.png" },
  { id: "edited",              label: "Other",               src: "/images/bundle/edited-photo.png" },
]

function iconForSrc(src: string) {
  return ALL_ICONS.find(i => i.src === src)
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: AppState = {
  categories: [...DEFAULT_CATEGORIES],
  bundles: [
    {
      id: "call_of_ancients",
      name: "Call of the Ancients",
      category: "Daily",
      columns: [
        { id: "t1", icon: "/images/bundle/stone_chest.png",  name: "Stone Chest",  price: 5,   maxPurchase: 1 },
        { id: "t2", icon: "/images/bundle/iron_chest.png",   name: "Iron Chest",   price: 10,  maxPurchase: 1 },
        { id: "t3", icon: "/images/bundle/bronze_chest.png", name: "Bronze Chest", price: 20,  maxPurchase: 1 },
        { id: "t4", icon: "/images/bundle/silver_chest.png", name: "Silver Chest", price: 50,  maxPurchase: 1 },
        { id: "t5", icon: "/images/bundle/gold_chest.png",   name: "Gold Chest",   price: 100, maxPurchase: 3 },
      ],
      rows: [
        { id: "gems",      label: "Gem",              icon: "/images/bundle/gem.png",              values: { t1: 1050,   t2: 2200,    t3: 4600,    t4: 12000,   t5: 25000    }, rowType: "number" },
        { id: "training",  label: "Training Speed",   icon: "/images/bundle/training_speed.png",   values: { t1: 360,    t2: 720,     t3: 1500,    t4: 3600,    t5: 6000     }, rowType: "days"   },
        { id: "healing",   label: "Healing Speed",    icon: "/images/bundle/healing_speed.png",    values: { t1: 50,     t2: 100,     t3: 150,     t4: 200,     t5: 250      }, rowType: "days"   },
        { id: "universal", label: "Universal Speed",  icon: "/images/bundle/universal_speed.png",  values: { t1: 600,    t2: 1200,    t3: 2700,    t4: 7200,    t5: 15600    }, rowType: "days"   },
        { id: "food",      label: "Food",             icon: "/images/bundle/food.png",             values: { t1: 600000, t2: 1250000, t3: 2250000, t4: 6750000, t5: 17500000 }, rowType: "number" },
        { id: "wood",      label: "Wood",             icon: "/images/bundle/wood.png",             values: { t1: 600000, t2: 1250000, t3: 2250000, t4: 6750000, t5: 17500000 }, rowType: "number" },
        { id: "stone_r",   label: "Conversion Stone", icon: "/images/bundle/conversion_stone.png", values: { t1: 450000, t2: 937500,  t3: 1687500, t4: 5062500, t5: 13125000 }, rowType: "number" },
        { id: "gold_r",    label: "Exhibit Coin",     icon: "/images/bundle/exhibit_coin.png",     values: { t1: 75000,  t2: 150000,  t3: 300000,  t4: 1000000, t5: 3000000  }, rowType: "number" },
        { id: "relic",     label: "Relic Coins",      icon: "/images/bundle/relic_coins.png",      values: { t1: 525,    t2: 1000,    t3: 2000,    t4: 4000,    t5: 5000     }, rowType: "number" },
      ],
    },
  ],
}

const STORAGE_KEY = "bundles-state-v3"
export const TRACKER_KEY = "spending-tracker-v1"
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

function rowTotal(row: BundleRow, columns: TierColumn[]): number {
  return columns.reduce((acc, col) => acc + (row.values[col.id] ?? 0) * col.maxPurchase, 0)
}

function rowTotalFmt(row: BundleRow, columns: TierColumn[]): string {
  const sum = rowTotal(row, columns)
  if (row.rowType === "days") return `${(sum / 1440).toFixed(2)} Days`
  if (row.rowType === "currency") return `$${fmt(sum)}`
  return fmt(sum)
}

function priceTotal(columns: TierColumn[]): string {
  const sum = columns.reduce((acc, col) => acc + col.price * col.maxPurchase, 0)
  return `$${fmt(sum)}`
}

function fmtRaw(raw: number, rowType: RowType): string {
  if (rowType === "days") return `${(raw / 1440).toFixed(2)} Days`
  if (rowType === "currency") return `$${fmt(raw)}`
  return fmt(raw)
}

function themeColors(hue: number) {
  const s = 48
  return {
    headerGrad: `linear-gradient(135deg, hsl(${hue},${s}%,20%), hsl(${hue},${s}%,28%))`,
    iconRow:    `hsl(${hue},${s}%,16%)`,
    rowEven:    `hsl(${hue},${s}%,12%)`,
    rowOdd:     `hsl(${hue},${s}%,15%)`,
    footer:     `hsl(${hue},${s}%,10%)`,
    card:       `hsl(${hue},${s}%,13%)`,
    cardBorder: `hsl(${hue},${s}%,28%)`,
  }
}

// ─── Icon Picker Dialog ───────────────────────────────────────────────────────

function IconPickerDialog({
  open, current, onSelect, onClose,
}: {
  open: boolean
  current: string
  onSelect: (src: string, label: string) => void
  onClose: () => void
}) {
  const [customUrl, setCustomUrl] = useState("")
  const [customLabel, setCustomLabel] = useState("")

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSelect(reader.result, file.name.replace(/\.[^.]+$/, ""))
        onClose()
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Choose Icon</DialogTitle></DialogHeader>
        <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto rounded-lg border border-border p-2">
          {ALL_ICONS.map((opt) => (
            <button
              key={opt.id}
              title={opt.label}
              onClick={() => { onSelect(opt.src, opt.label); onClose() }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition hover:border-primary/60 hover:bg-primary/10",
                current === opt.src ? "border-primary bg-primary/20" : "border-transparent bg-muted/30"
              )}
            >
              <Image src={opt.src} alt={opt.label} width={36} height={36} className="h-9 w-9 object-contain" />
              <span className="text-[9px] text-center leading-tight text-muted-foreground line-clamp-2">{opt.label}</span>
            </button>
          ))}
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input placeholder="Paste image URL..." value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} className="h-9 flex-1" />
            <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm text-muted-foreground hover:text-foreground transition">
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
          {customUrl && (
            <div className="flex gap-2 items-center">
              <Input placeholder="Name for this icon..." value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="h-9 flex-1" />
              <Button size="sm" variant="outline" disabled={!customLabel.trim()} onClick={() => { onSelect(customUrl.trim(), customLabel.trim()); onClose() }}>Use</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Category Manage Dialog ───────────────────────────────────────────────────

function CategoryManageDialog({
  open, categories, onUpdate, onClose,
}: {
  open: boolean
  categories: string[]
  onUpdate: (cats: string[]) => void
  onClose: () => void
}) {
  const [newCat, setNewCat] = useState("")

  function addCat() {
    const trimmed = newCat.trim()
    if (!trimmed || categories.includes(trimmed)) return
    onUpdate([...categories, trimmed])
    setNewCat("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-lg border border-border bg-muted/20">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 pl-3 pr-1.5 py-1 text-sm text-primary">
              {cat}
              <button onClick={() => onUpdate(categories.filter(c => c !== cat))} className="text-primary/50 hover:text-red-400 transition ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {categories.length === 0 && <span className="text-xs text-muted-foreground px-1 py-1">No categories yet</span>}
        </div>
        <Separator />
        <div className="flex gap-2">
          <Input
            placeholder="New category name..."
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCat()}
            className="h-9 flex-1"
          />
          <Button size="sm" onClick={addCat} disabled={!newCat.trim() || categories.includes(newCat.trim())}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bundle Table (Tables view) ───────────────────────────────────────────────

function BundleTable({
  bundle, editMode, categories, onUpdate, onDelete,
}: {
  bundle: Bundle
  editMode: boolean
  categories: string[]
  onUpdate: (b: Bundle) => void
  onDelete: () => void
}) {
  const { currentColor } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [picker, setPicker] = useState<{ current: string; cb: (src: string, label: string) => void } | null>(null)

  const colors = themeColors(currentColor.hue)
  const totalCols = bundle.columns.length + 2 + (editMode ? 1 : 0)

  function setColIcon(id: string, icon: string, name: string) {
    onUpdate({ ...bundle, columns: bundle.columns.map(c => c.id === id ? { ...c, icon, name } : c) })
  }
  function setColName(id: string, name: string) {
    onUpdate({ ...bundle, columns: bundle.columns.map(c => c.id === id ? { ...c, name } : c) })
  }
  function setColPrice(id: string, price: number) {
    onUpdate({ ...bundle, columns: bundle.columns.map(c => c.id === id ? { ...c, price } : c) })
  }
  function setColMax(id: string, maxPurchase: number) {
    onUpdate({ ...bundle, columns: bundle.columns.map(c => c.id === id ? { ...c, maxPurchase } : c) })
  }
  function deleteCol(id: string) {
    const columns = bundle.columns.filter(c => c.id !== id)
    const rows = bundle.rows.map(r => { const v = { ...r.values }; delete v[id]; return { ...r, values: v } })
    onUpdate({ ...bundle, columns, rows })
  }
  function addColumn() {
    const id = `col_${Date.now()}`
    const columns = [...bundle.columns, { id, icon: "/images/bundle/stone_chest.png", name: "Stone Chest", price: 0, maxPurchase: 1 }]
    const rows = bundle.rows.map(r => ({ ...r, values: { ...r.values, [id]: 0 } }))
    onUpdate({ ...bundle, columns, rows })
  }
  function setRowIcon(id: string, icon: string, label: string) {
    onUpdate({ ...bundle, rows: bundle.rows.map(r => r.id === id ? { ...r, icon, label } : r) })
  }
  function setRowLabel(id: string, label: string) {
    onUpdate({ ...bundle, rows: bundle.rows.map(r => r.id === id ? { ...r, label } : r) })
  }
  function setRowType(id: string, rowType: RowType) {
    onUpdate({ ...bundle, rows: bundle.rows.map(r => r.id === id ? { ...r, rowType } : r) })
  }
  function setCell(rowId: string, colId: string, value: number) {
    onUpdate({ ...bundle, rows: bundle.rows.map(r => r.id === rowId ? { ...r, values: { ...r.values, [colId]: value } } : r) })
  }
  function deleteRow(id: string) {
    onUpdate({ ...bundle, rows: bundle.rows.filter(r => r.id !== id) })
  }
  function addRow() {
    const id = `row_${Date.now()}`
    const values: Record<string, number> = {}
    bundle.columns.forEach(c => (values[c.id] = 0))
    onUpdate({ ...bundle, rows: [...bundle.rows, { id, icon: "/images/bundle/gem.png", label: "Gem", values, rowType: "number" }] })
  }

  return (
    <>
      {picker && <IconPickerDialog open current={picker.current} onSelect={picker.cb} onClose={() => setPicker(null)} />}
      <div className="overflow-x-auto rounded-xl border border-white/10 shadow-lg shadow-black/40">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: colors.headerGrad }}>
              <th colSpan={totalCols} className="px-5 py-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <button onClick={() => setCollapsed(c => !c)} className="text-white/70 hover:text-white transition flex-shrink-0">
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", collapsed && "-rotate-90")} />
                    </button>
                    {editMode ? (
                      <>
                        <Input value={bundle.name} onChange={e => onUpdate({ ...bundle, name: e.target.value })} className="h-8 w-56 bg-white/10 border-white/20 text-white font-bold italic text-base focus-visible:ring-white/30" />
                        <Select value={bundle.category || ""} onValueChange={v => onUpdate({ ...bundle, category: v })}>
                          <SelectTrigger className="h-8 w-36 bg-white/10 border-white/20 text-white text-xs gap-1">
                            <Tag className="h-3 w-3 flex-shrink-0 text-white/60" />
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold italic text-white text-base tracking-wide">{bundle.name}</span>
                        {bundle.category && <Badge variant="outline" className="text-white/70 border-white/30 text-[11px] h-5 py-0 px-2">{bundle.category}</Badge>}
                      </div>
                    )}
                  </div>
                  {editMode && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 flex-shrink-0" onClick={onDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </th>
            </tr>
            {!collapsed && (
              <tr style={{ background: colors.iconRow }}>
                <th className="w-20 px-3 py-2" />
                {bundle.columns.map(col => (
                  <th key={col.id} className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button disabled={!editMode} onClick={() => editMode && setPicker({ current: col.icon, cb: (src, name) => setColIcon(col.id, src, name) })} className={cn("rounded-lg p-0.5 transition", editMode && "hover:ring-2 hover:ring-primary/60 cursor-pointer")}>
                        <Image src={col.icon} alt={col.name} width={56} height={56} className="h-14 w-14 object-contain" />
                      </button>
                      {editMode ? (
                        <Input value={col.name} onChange={e => setColName(col.id, e.target.value)} className="h-6 w-28 text-center text-[11px] bg-white/10 border-white/20 text-white mt-0.5" />
                      ) : (
                        <span className="text-[11px] text-white/60 text-center max-w-[80px] leading-tight line-clamp-2">{col.name}</span>
                      )}
                      {editMode && <button onClick={() => deleteCol(col.id)} className="text-red-400/60 hover:text-red-400 transition mt-0.5"><Trash2 className="h-3 w-3" /></button>}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2 text-right text-xs font-semibold text-white/60 uppercase tracking-widest">Total</th>
                {editMode && <th className="w-8" />}
              </tr>
            )}
          </thead>
          {!collapsed && (
            <tbody>
              <tr style={{ background: colors.rowEven }} className="border-t border-white/10">
                <td className="px-4 py-2.5 font-semibold italic text-white/80 text-sm whitespace-nowrap">Price</td>
                {bundle.columns.map(col => (
                  <td key={col.id} className="px-3 py-2.5 text-center text-white/80">
                    {editMode ? <Input type="number" value={col.price} onChange={e => setColPrice(col.id, Number(e.target.value) || 0)} className="h-8 w-20 mx-auto text-center bg-white/10 border-white/20 text-white" /> : <span>${col.price}</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-bold italic text-white">{priceTotal(bundle.columns)}</td>
                {editMode && <td />}
              </tr>
              <tr style={{ background: colors.rowOdd }} className="border-t border-white/10">
                <td className="px-4 py-2.5 font-semibold italic text-white/80 text-sm whitespace-nowrap">Max Purchase</td>
                {bundle.columns.map(col => (
                  <td key={col.id} className="px-3 py-2.5 text-center text-white/80">
                    {editMode ? <Input type="number" value={col.maxPurchase} onChange={e => setColMax(col.id, Math.max(1, Number(e.target.value) || 1))} className="h-8 w-20 mx-auto text-center bg-white/10 border-white/20 text-white" /> : <span>{col.maxPurchase}</span>}
                  </td>
                ))}
                <td />{editMode && <td />}
              </tr>
              {bundle.rows.map((row, idx) => (
                <tr key={row.id} className="border-t border-white/10" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button disabled={!editMode} onClick={() => editMode && setPicker({ current: row.icon, cb: (src, label) => setRowIcon(row.id, src, label) })} className={cn("rounded-lg p-0.5 flex-shrink-0 transition", editMode && "hover:ring-2 hover:ring-primary/60 cursor-pointer")}>
                        <Image src={row.icon} alt={row.label} width={40} height={40} className="h-10 w-10 object-contain" />
                      </button>
                      {editMode ? (
                        <div className="space-y-1">
                          <Input value={row.label} onChange={e => setRowLabel(row.id, e.target.value)} className="h-6 w-28 text-[11px] bg-white/10 border-white/20 text-white" />
                          <Select value={row.rowType} onValueChange={v => setRowType(row.id, v as RowType)}>
                            <SelectTrigger className="h-6 w-24 text-[10px] bg-white/10 border-white/20 text-white px-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/70 max-w-[72px] leading-tight line-clamp-2">{row.label}</span>
                      )}
                    </div>
                  </td>
                  {bundle.columns.map(col => (
                    <td key={`${row.id}-${col.id}`} className="px-3 py-2.5 text-center text-white/80">
                      {editMode ? <Input type="number" value={row.values[col.id] ?? 0} onChange={e => setCell(row.id, col.id, Number(e.target.value) || 0)} className="h-8 w-24 mx-auto text-center bg-white/10 border-white/20 text-white" /> : <span>{fmt(row.values[col.id] ?? 0)}</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-bold italic text-white whitespace-nowrap">{rowTotalFmt(row, bundle.columns)}</td>
                  {editMode && (
                    <td className="pr-2 text-center">
                      <button onClick={() => deleteRow(row.id)} className="text-red-400/60 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          )}
          {!collapsed && editMode && (
            <tfoot>
              <tr style={{ background: colors.footer }} className="border-t border-white/10">
                <td colSpan={totalCols} className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-white/60 hover:text-white hover:bg-white/10 border border-white/20" onClick={addRow}><Plus className="h-3 w-3" /> Add Row</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-white/60 hover:text-white hover:bg-white/10 border border-white/20" onClick={addColumn}><Plus className="h-3 w-3" /> Add Column</Button>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}

// ─── Bundle Card (Cards view) ─────────────────────────────────────────────────

function BundleCard({ bundle }: { bundle: Bundle }) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)
  const totalPrice = bundle.columns.reduce((a, c) => a + c.price * c.maxPurchase, 0)

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden shadow-lg shadow-black/30" style={{ background: colors.card }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: colors.headerGrad }}>
        <span className="font-bold italic text-white text-sm tracking-wide truncate">{bundle.name}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {bundle.category && <Badge variant="outline" className="text-white/60 border-white/25 text-[10px] h-5 py-0 px-2">{bundle.category}</Badge>}
          <Badge variant="outline" className="text-white border-white/30 text-xs">${totalPrice}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10" style={{ background: colors.iconRow }}>
        {bundle.columns.map(col => (
          <div key={col.id} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
            <Image src={col.icon} alt={col.name} width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-[9px] text-white/50 text-center leading-tight truncate w-full">{col.name}</span>
            <span className="text-[10px] text-white/70 font-medium">${col.price}</span>
            {col.maxPurchase > 1 && <span className="text-[9px] text-primary/80">x{col.maxPurchase}</span>}
          </div>
        ))}
      </div>
      <div className="divide-y divide-white/5">
        {bundle.rows.map((row, idx) => (
          <div key={row.id} className="flex items-center gap-2.5 px-3 py-1.5" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
            <Image src={row.icon} alt={row.label} width={28} height={28} className="h-7 w-7 object-contain flex-shrink-0" />
            <span className="text-xs text-white/70 flex-1 min-w-0 truncate">{row.label}</span>
            <span className="text-xs font-bold text-white whitespace-nowrap">{rowTotalFmt(row, bundle.columns)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Compare View (standalone — uses max purchase, no custom qty) ─────────────

function CompareView({ bundles, categories }: { bundles: Bundle[]; categories: string[] }) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)
  const [selectedIds, setSelectedIds] = useState<string[]>(bundles.slice(0, 2).map(b => b.id))
  const [filterCat, setFilterCat] = useState("All")

  const visibleBundles = filterCat === "All" ? bundles : bundles.filter(b => b.category === filterCat)
  const selected = visibleBundles.filter(b => selectedIds.includes(b.id))

  const allItems = useMemo(() => {
    const seen = new Map<string, { icon: string; label: string; rowType: RowType }>()
    selected.forEach(b => b.rows.forEach(r => {
      if (!seen.has(r.label)) seen.set(r.label, { icon: r.icon, label: r.label, rowType: r.rowType })
    }))
    return Array.from(seen.values())
  }, [selected])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {["All", ...categories].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition", filterCat === cat ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{cat}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleBundles.map(b => (
          <button key={b.id} onClick={() => setSelectedIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])} className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition", selectedIds.includes(b.id) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{b.name}</button>
        ))}
      </div>
      {selected.length < 1 && <p className="text-sm text-muted-foreground py-4">Select at least one bundle above to compare.</p>}
      {selected.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 shadow-lg shadow-black/40">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: colors.iconRow }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest w-36">Item</th>
                {selected.map(b => (
                  <th key={b.id} className="px-4 py-3 text-center min-w-[130px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex gap-1 flex-wrap justify-center">
                        {b.columns.slice(0, 4).map(col => <Image key={col.id} src={col.icon} alt={col.name} width={20} height={20} className="h-5 w-5 object-contain" />)}
                        {b.columns.length > 4 && <span className="text-[10px] text-white/50 self-end">+{b.columns.length - 4}</span>}
                      </div>
                      <span className="text-xs font-semibold text-white leading-tight">{b.name}</span>
                      {b.category && <span className="text-[10px] text-primary/70">{b.category}</span>}
                      <span className="text-[10px] text-white/50">{priceTotal(b.columns)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, idx) => {
                const raws = selected.map(b => {
                  const row = b.rows.find(r => r.label === item.label)
                  return row ? rowTotal(row, b.columns) : null
                })
                const validRaws = raws.filter((r): r is number => r !== null)
                const maxRaw = validRaws.length > 0 ? Math.max(...validRaws) : 0
                const secondRaw = [...validRaws].sort((a, b) => b - a)[1]
                const allEqual = validRaws.length > 1 && validRaws.every(r => r === validRaws[0])

                return (
                  <tr key={item.label} className="border-t border-white/10" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Image src={item.icon} alt={item.label} width={28} height={28} className="h-7 w-7 object-contain flex-shrink-0" />
                        <span className="text-xs text-white/70 leading-tight">{item.label}</span>
                      </div>
                    </td>
                    {selected.map((b, bi) => {
                      const raw = raws[bi]
                      if (raw === null) return <td key={b.id} className="px-4 py-2.5 text-center text-white/25">—</td>
                      const fmtValue = item.rowType === "days" ? `${(raw / 1440).toFixed(2)} Days` : item.rowType === "currency" ? `$${fmt(raw)}` : fmt(raw)
                      const isBest = !allEqual && raw === maxRaw
                      const isLower = !allEqual && raw < maxRaw
                      const lead = secondRaw !== undefined ? raw - secondRaw : 0
                      const isTied = isBest && lead === 0
                      const diff = maxRaw - raw
                      return (
                        <td key={b.id} className="px-4 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn("font-semibold text-sm tabular-nums", isBest && !isTied ? "text-green-400" : isLower ? "text-white/70" : "text-white/85")}>{fmtValue}</span>
                            {allEqual && <span className="text-[10px] text-blue-400/80">= equal</span>}
                            {isBest && !isTied && !allEqual && <span className="text-[10px] text-green-400/80">▲ +{fmtRaw(lead, item.rowType)}</span>}
                            {isTied && !allEqual && <span className="text-[10px] text-blue-400/80">= tied</span>}
                            {isLower && <span className="text-[10px] text-red-400/80">▼ -{fmtRaw(diff, item.rowType)}</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Add to Spending Tracker Dialog (from Plan view) ─────────────────────────

function AddToTrackerFromPlanDialog({
  open, onClose, selected, spendQty, totalSpend,
}: {
  open: boolean
  onClose: (saved?: boolean) => void
  selected: Bundle[]
  spendQty: Record<string, Record<string, number>>
  totalSpend: number
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<"planned" | "purchased">("planned")
  const [currency, setCurrency] = useState("USD")
  const [notes, setNotes] = useState("")

  function handleSave() {
    const entry = {
      id: `entry_${Date.now()}`,
      date,
      bundles: selected.map(b => ({
        bundleId: b.id,
        bundleName: b.name,
        category: b.category,
        spendQty: spendQty[b.id] ?? {},
        cost: b.columns.reduce((s, c) => s + c.price * (spendQty[b.id]?.[c.id] ?? c.maxPurchase), 0),
        items: b.rows.map(row => ({
          label: row.label,
          icon: row.icon,
          rowType: row.rowType,
          total: b.columns.reduce((acc, col) => {
            const qty = spendQty[b.id]?.[col.id] ?? col.maxPurchase
            return acc + (row.values[col.id] ?? 0) * qty
          }, 0),
        })).filter(i => i.total > 0),
      })),
      currency,
      totalCost: totalSpend,
      status,
      notes,
    }
    try {
      const existing = JSON.parse(localStorage.getItem(TRACKER_KEY) ?? "[]")
      localStorage.setItem(TRACKER_KEY, JSON.stringify([entry, ...existing]))
    } catch { /* ignore */ }
    onClose(true)
  }

  const sym = CURRENCY_SYMBOLS[currency] ?? "$"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add to Spending Tracker</DialogTitle></DialogHeader>
        <div className="space-y-1 text-sm rounded-lg border border-border p-3 bg-muted/20">
          {selected.map(b => {
            const cost = b.columns.reduce((s, c) => s + c.price * (spendQty[b.id]?.[c.id] ?? c.maxPurchase), 0)
            return (
              <div key={b.id} className="flex justify-between">
                <span className="text-muted-foreground truncate flex-1 mr-2">{b.name}</span>
                <span className="font-medium tabular-nums">{sym}{cost}</span>
              </div>
            )
          })}
          <Separator className="my-1" />
          <div className="flex justify-between font-bold">
            <span>Total</span><span className="tabular-nums">{sym}{totalSpend}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Status</label>
            <Select value={status} onValueChange={v => setStatus(v as "planned" | "purchased")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">🕒 Planned</SelectItem>
                <SelectItem value="purchased">✓ Purchased</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Currency</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_SYMBOLS).map(([c, s]) => <SelectItem key={c} value={c}>{c} ({s})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Notes</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..." className="h-9" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onClose()}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={selected.length === 0} className="gap-1.5">
            <CalendarPlus className="h-3.5 w-3.5" /> Save Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Plan View (Spending + Inline Compare + Combined Totals) ──────────────────

function PlanView({ bundles, categories }: { bundles: Bundle[]; categories: string[] }) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)

  const [selectedIds, setSelectedIds] = useState<string[]>(bundles.map(b => b.id))
  const [filterCat, setFilterCat] = useState("All")
  const [trackerDialogOpen, setTrackerDialogOpen] = useState(false)

  const [spendQty, setSpendQty] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {}
    bundles.forEach(b => {
      init[b.id] = {}
      b.columns.forEach(c => { init[b.id][c.id] = c.maxPurchase })
    })
    return init
  })

  useEffect(() => {
    setSpendQty(prev => {
      const next = { ...prev }
      bundles.forEach(b => {
        if (!next[b.id]) {
          next[b.id] = {}
          b.columns.forEach(c => { next[b.id][c.id] = c.maxPurchase })
        } else {
          b.columns.forEach(c => {
            if (next[b.id][c.id] === undefined) next[b.id][c.id] = c.maxPurchase
          })
        }
      })
      return next
    })
  }, [bundles])

  function getQty(bundleId: string, colId: string, maxPurchase: number): number {
    return spendQty[bundleId]?.[colId] ?? maxPurchase
  }

  function setQty(bundleId: string, colId: string, qty: number, maxPurchase: number) {
    setSpendQty(prev => ({ ...prev, [bundleId]: { ...(prev[bundleId] ?? {}), [colId]: Math.max(0, Math.min(maxPurchase, qty)) } }))
  }

  const visibleBundles = filterCat === "All" ? bundles : bundles.filter(b => b.category === filterCat)
  const selected = visibleBundles.filter(b => selectedIds.includes(b.id))

  const allItems = useMemo(() => {
    const seen = new Map<string, { icon: string; label: string; rowType: RowType }>()
    selected.forEach(b => b.rows.forEach(r => {
      if (!seen.has(r.label)) seen.set(r.label, { icon: r.icon, label: r.label, rowType: r.rowType })
    }))
    return Array.from(seen.values())
  }, [selected])

  const combined = useMemo(() => {
    const map = new Map<string, { icon: string; label: string; rowType: RowType; total: number }>()
    selected.forEach(b => {
      b.rows.forEach(row => {
        const total = b.columns.reduce((acc, col) => {
          const qty = spendQty[b.id]?.[col.id] ?? col.maxPurchase
          return acc + (row.values[col.id] ?? 0) * qty
        }, 0)
        if (map.has(row.label)) {
          const ex = map.get(row.label)!
          map.set(row.label, { ...ex, total: ex.total + total })
        } else {
          map.set(row.label, { icon: row.icon, label: row.label, rowType: row.rowType, total })
        }
      })
    })
    return Array.from(map.values())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, spendQty])

  const totalSpend = selected.reduce((acc, b) =>
    acc + b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0), 0
  )

  function formatTotal(rowType: RowType, total: number): string {
    if (rowType === "days") return `${(total / 1440).toFixed(2)} Days`
    if (rowType === "currency") return `$${fmt(total)}`
    return fmt(total)
  }

  const multiBundle = selected.length > 1

  return (
    <div className="space-y-6">
      <AddToTrackerFromPlanDialog
        open={trackerDialogOpen}
        onClose={() => setTrackerDialogOpen(false)}
        selected={selected}
        spendQty={spendQty}
        totalSpend={totalSpend}
      />

      <div className="flex flex-wrap gap-1.5">
        {["All", ...categories].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition", filterCat === cat ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{cat}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Bundles:</span>
        {visibleBundles.map(b => (
          <button key={b.id} onClick={() => setSelectedIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])} className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition", selectedIds.includes(b.id) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{b.name}</button>
        ))}
        {selected.length > 0 && <span className="ml-auto text-sm font-bold text-foreground tabular-nums">Total: ${fmt(totalSpend)}</span>}
      </div>

      {selected.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Select at least one bundle above.</p>}

      {selected.length > 0 && (
        <>
          {/* Spending Configuration */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Spending Configuration</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selected.map(b => {
                const bundleSpend = b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0)
                return (
                  <div key={b.id} className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: colors.iconRow }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold italic text-white text-sm truncate">{b.name}</span>
                        {b.category && <Badge variant="outline" className="text-white/60 border-white/25 text-[10px] h-5 py-0 px-2 flex-shrink-0">{b.category}</Badge>}
                      </div>
                      <span className="font-bold text-white text-sm flex-shrink-0 ml-3 tabular-nums">${fmt(bundleSpend)}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {b.columns.map((col, idx) => {
                        const qty = getQty(b.id, col.id, col.maxPurchase)
                        const colSpend = col.price * qty
                        return (
                          <div key={col.id} className="flex items-center gap-3 px-4 py-2" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
                            <Image src={col.icon} alt={col.name} width={32} height={32} className="h-8 w-8 object-contain flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white/85 leading-tight truncate">{col.name}</p>
                              <p className="text-[10px] text-white/40 leading-tight">${col.price} each · max {col.maxPurchase}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => setQty(b.id, col.id, qty - 1, col.maxPurchase)} disabled={qty === 0} className="h-7 w-7 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors select-none text-base font-bold leading-none" aria-label="Decrease">−</button>
                              <span className="text-sm font-bold text-white w-5 text-center tabular-nums select-none">{qty}</span>
                              <button onClick={() => setQty(b.id, col.id, qty + 1, col.maxPurchase)} disabled={qty >= col.maxPurchase} className="h-7 w-7 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors select-none text-base font-bold leading-none" aria-label="Increase">+</button>
                            </div>
                            <span className="text-sm font-semibold text-primary/90 w-16 text-right tabular-nums flex-shrink-0">${fmt(colSpend)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Inline comparison table */}
          {multiBundle && allItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Item Comparison <span className="normal-case font-normal">— reflects spending config above</span></p>
              <div className="overflow-x-auto rounded-xl border border-white/10 shadow-lg shadow-black/40">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: colors.iconRow }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest w-36">Item</th>
                      {selected.map(b => {
                        const bSpend = b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0)
                        return (
                          <th key={b.id} className="px-4 py-3 text-center min-w-[130px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex gap-1 flex-wrap justify-center">
                                {b.columns.slice(0, 4).map(col => <Image key={col.id} src={col.icon} alt={col.name} width={20} height={20} className="h-5 w-5 object-contain" />)}
                                {b.columns.length > 4 && <span className="text-[10px] text-white/50 self-end">+{b.columns.length - 4}</span>}
                              </div>
                              <span className="text-xs font-semibold text-white leading-tight">{b.name}</span>
                              {b.category && <span className="text-[10px] text-primary/70">{b.category}</span>}
                              <span className="text-[10px] text-white/50 tabular-nums">${fmt(bSpend)}</span>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.map((item, idx) => {
                      const raws = selected.map(b => {
                        const row = b.rows.find(r => r.label === item.label)
                        if (!row) return null
                        return b.columns.reduce((acc, col) => {
                          const qty = spendQty[b.id]?.[col.id] ?? col.maxPurchase
                          return acc + (row.values[col.id] ?? 0) * qty
                        }, 0)
                      })
                      const validRaws = raws.filter((r): r is number => r !== null)
                      const maxRaw = validRaws.length > 0 ? Math.max(...validRaws) : 0
                      const secondRaw = [...validRaws].sort((a, b) => b - a)[1]
                      const allEqual = validRaws.length > 1 && validRaws.every(r => r === validRaws[0])

                      return (
                        <tr key={item.label} className="border-t border-white/10" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Image src={item.icon} alt={item.label} width={28} height={28} className="h-7 w-7 object-contain flex-shrink-0" />
                              <span className="text-xs text-white/70 leading-tight">{item.label}</span>
                            </div>
                          </td>
                          {selected.map((b, bi) => {
                            const raw = raws[bi]
                            if (raw === null) return <td key={b.id} className="px-4 py-2.5 text-center text-white/25 text-sm">—</td>
                            const fmtValue = item.rowType === "days" ? `${(raw / 1440).toFixed(2)} Days` : item.rowType === "currency" ? `$${fmt(raw)}` : fmt(raw)
                            const isBest = !allEqual && raw === maxRaw
                            const isLower = !allEqual && raw < maxRaw
                            const lead = secondRaw !== undefined ? raw - secondRaw : 0
                            const isTied = isBest && lead === 0
                            const diff = maxRaw - raw
                            return (
                              <td key={b.id} className="px-4 py-2.5 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={cn("font-semibold text-sm tabular-nums", isBest && !isTied ? "text-green-400" : isLower ? "text-white/70" : "text-white/85")}>{fmtValue}</span>
                                  {allEqual && <span className="text-[10px] text-blue-400/80">= equal</span>}
                                  {isBest && !isTied && !allEqual && <span className="text-[10px] text-green-400/80">▲ +{fmtRaw(lead, item.rowType)}</span>}
                                  {isTied && !allEqual && <span className="text-[10px] text-blue-400/80">= tied</span>}
                                  {isLower && <span className="text-[10px] text-red-400/80">▼ -{fmtRaw(diff, item.rowType)}</span>}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Combined totals */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Combined Totals <span className="normal-case font-normal ml-1">— ${fmt(totalSpend)} across {selected.length} bundle{selected.length !== 1 ? "s" : ""}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {combined.map(item => (
                <div key={item.label} className="rounded-xl border border-white/10 flex flex-col items-center gap-1.5 px-3 py-3 text-center shadow" style={{ background: colors.card }}>
                  <Image src={item.icon} alt={item.label} width={48} height={48} className="h-12 w-12 object-contain" />
                  <span className="text-[11px] text-white/60 leading-tight">{item.label}</span>
                  <span className="text-sm font-bold text-white tabular-nums">{formatTotal(item.rowType, item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add to Tracker CTA */}
          <div className="flex justify-end pt-1">
            <Button onClick={() => setTrackerDialogOpen(true)} disabled={selected.length === 0} className="gap-2">
              <CalendarPlus className="h-4 w-4" /> Add to Spending Tracker
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── View Toggle Button ───────────────────────────────────────────────────────

function ViewBtn({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string
}) {
  return (
    <button onClick={onClick} title={label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition", active ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BundlesContent() {
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE)
  const [editMode, setEditMode] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("tables")
  const [filterCategory, setFilterCategory] = useState("All")
  const [catDialogOpen, setCatDialogOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>
        const migrated: AppState = {
          categories: parsed.categories ?? [...DEFAULT_CATEGORIES],
          bundles: (parsed.bundles ?? []).map(b => ({
            ...b,
            category: b.category ?? "Daily",
            columns: (b.columns ?? []).map(c => ({ ...c, name: c.name ?? iconForSrc(c.icon)?.label ?? "Column" })),
            rows: (b.rows ?? []).map(r => ({ ...r, label: r.label ?? iconForSrc(r.icon)?.label ?? "Item" })),
          })),
        }
        setAppState(migrated)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState))
  }, [appState])

  function updateBundle(id: string, updated: Bundle) {
    setAppState(prev => ({ ...prev, bundles: prev.bundles.map(b => b.id === id ? updated : b) }))
  }
  function deleteBundle(id: string) {
    setAppState(prev => ({ ...prev, bundles: prev.bundles.filter(b => b.id !== id) }))
  }
  function addBundle() {
    const id = `bundle_${Date.now()}`
    const cols: TierColumn[] = [
      { id: "t1", icon: "/images/bundle/stone_chest.png",  name: "Stone Chest",  price: 5,   maxPurchase: 1 },
      { id: "t2", icon: "/images/bundle/iron_chest.png",   name: "Iron Chest",   price: 10,  maxPurchase: 1 },
      { id: "t3", icon: "/images/bundle/bronze_chest.png", name: "Bronze Chest", price: 20,  maxPurchase: 1 },
      { id: "t4", icon: "/images/bundle/silver_chest.png", name: "Silver Chest", price: 50,  maxPurchase: 1 },
      { id: "t5", icon: "/images/bundle/gold_chest.png",   name: "Gold Chest",   price: 100, maxPurchase: 1 },
    ]
    setAppState(prev => ({
      ...prev,
      bundles: [...prev.bundles, {
        id, name: "New Bundle", category: prev.categories[0] ?? "Daily", columns: cols,
        rows: [{ id: "row1", icon: "/images/bundle/gem.png", label: "Gem", values: { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 }, rowType: "number" }],
      }]
    }))
  }
  function resetAll() {
    if (confirm("Reset all bundles to default? This cannot be undone.")) {
      setAppState(DEFAULT_STATE)
      setFilterCategory("All")
    }
  }

  const filteredBundles = filterCategory === "All" ? appState.bundles : appState.bundles.filter(b => b.category === filterCategory)

  return (
    <div className="space-y-5">
      <CategoryManageDialog open={catDialogOpen} categories={appState.categories} onUpdate={cats => setAppState(prev => ({ ...prev, categories: cats }))} onClose={() => setCatDialogOpen(false)} />

      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bundles</h2>
          <p className="text-sm text-muted-foreground">Track, compare and plan your bundle spending.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <ViewBtn active={viewMode === "tables"}  onClick={() => setViewMode("tables")}  icon={LayoutList}        label="Tables"  />
            <ViewBtn active={viewMode === "cards"}   onClick={() => setViewMode("cards")}   icon={LayoutGrid}        label="Cards"   />
            <ViewBtn active={viewMode === "compare"} onClick={() => setViewMode("compare")} icon={GitCompare}        label="Compare" />
            <ViewBtn active={viewMode === "plan"}    onClick={() => setViewMode("plan")}    icon={SlidersHorizontal} label="Plan"    />
          </div>
          {viewMode === "tables" && (
            <>
              <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(e => !e)} className="gap-1.5">
                {editMode ? <><Check className="h-4 w-4" /> Done</> : <><Pencil className="h-4 w-4" /> Edit</>}
              </Button>
              {editMode && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={addBundle}><Plus className="h-4 w-4" /> Add Bundle</Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCatDialogOpen(true)}><Tag className="h-4 w-4" /> Categories</Button>
                  <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/60" onClick={resetAll}>Reset All</Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {(viewMode === "tables" || viewMode === "cards") && appState.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["All", ...appState.categories].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition", filterCategory === cat ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{cat}</button>
          ))}
        </div>
      )}

      {viewMode === "tables" && (
        <div className="space-y-8">
          {filteredBundles.map(bundle => (
            <BundleTable key={bundle.id} bundle={bundle} editMode={editMode} categories={appState.categories} onUpdate={updated => updateBundle(bundle.id, updated)} onDelete={() => deleteBundle(bundle.id)} />
          ))}
          {filteredBundles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-dashed border-border text-muted-foreground">
              <p className="text-sm">{appState.bundles.length === 0 ? "No bundles yet." : `No bundles in "${filterCategory}".`}</p>
              {appState.bundles.length === 0 && <Button size="sm" onClick={() => { setEditMode(true); addBundle() }} className="gap-1.5"><Plus className="h-4 w-4" /> Add your first bundle</Button>}
            </div>
          )}
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBundles.map(bundle => <BundleCard key={bundle.id} bundle={bundle} />)}
          {filteredBundles.length === 0 && <p className="col-span-full text-sm text-muted-foreground text-center py-16">{appState.bundles.length === 0 ? "No bundles yet. Switch to Tables view and add one." : `No bundles in "${filterCategory}".`}</p>}
        </div>
      )}

      {viewMode === "compare" && <CompareView bundles={appState.bundles} categories={appState.categories} />}
      {viewMode === "plan"    && <PlanView    bundles={appState.bundles} categories={appState.categories} />}
    </div>
  )
}
