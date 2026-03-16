"use client"

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Plus, Trash2, Pencil, Check, ChevronDown,
  LayoutList, LayoutGrid, GitCompare, SlidersHorizontal, Tag, X, CalendarPlus, Search, RefreshCw,
  ShoppingCart, Store,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"
import { useAuth } from "@/lib/auth-context"

// ─── Types ────────────────────────────────────────────────────────────────────

type RowType      = "number" | "days" | "currency"
type ViewMode     = "tables" | "cards" | "compare" | "plan"
// daily   = refreshes at 00:00 UTC every day
// monthly = refreshes at 00:00 UTC on 1st of every month
// rolling = refreshes N days after the last PURCHASE date (per-bundle, tracked in spending tracker)
// none    = no automatic refresh (one-time / event bundle)
type RefreshType  = "daily" | "monthly" | "rolling" | "none"

type TierColumn = {
  id: string
  icon: string
  name: string
  price: number
  maxPurchase: number
  // When false the column header shows no icon — just name & price
  showIcon?: boolean
}

// "icon"  = default — shows an icon + label in the row header
// "text"  = text-only row header (no icon) — e.g. "Special Items"
// "none"  = no icon, no label (pure value row)
type RowIconMode = "icon" | "text" | "none"

type BundleRow = {
  id: string
  icon: string
  label: string
  values: Record<string, number>
  rowType: RowType
  iconMode?: RowIconMode
  // Per-cell icon overrides: when set on a cell, that cell shows [icon] × [count]
  // instead of just the raw number. Key is column id.
  cellIcons?: Record<string, string>
  // When set, overrides the auto-calculated total in the Total column.
  // Set to "" to show nothing in the total cell.
  customTotal?: string
}

export type Bundle = {
  id: string
  name: string
  category: string
  // Separate category used only in the Shop View (maps to in-game tabs)
  shopCategory: string
  refreshType: RefreshType
  // For "rolling": how many days between refreshes (default 30)
  rollingDays: number
  // For "monthly": optional UTC day of month override (default 1)
  monthlyDay: number
  columns: TierColumn[]
  rows: BundleRow[]
}

type AppState = {
  bundles: Bundle[]
  categories: string[]
  shopCategories: string[]
}

type BasketItem = {
  id: string
  bundleId: string
  bundleName: string
  bundleCategory: string
  columnIdx: number
  column: TierColumn
  items: Array<{ label: string; icon: string; rowType: RowType; total: number }>
}

type LayoutMode = "standard" | "game"

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ["Daily", "Monthly", "KvK 1", "KvK 2", "KvK 3", "KvK", "Events", "SoC"]
// Exact category names from the in-game shop (user can add more)
const DEFAULT_SHOP_CATEGORIES = [
  "Recharge Rewards",
  "Super-Value Bundle",
  "Daily Special Offer",
  "Gem Store",
  "Supply Depot",
]

const REFRESH_LABELS: Record<RefreshType, string> = {
  daily:   "Daily (00:00 UTC)",
  monthly: "Monthly (1st UTC)",
  rolling: "Rolling (N days)",
  none:    "One-time / Event",
}

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
  { id: "rare_mat",            label: "Rare Mat",            src: "/images/bundle/rare_mat_chest.png" },
  { id: "rare_mat_icon",       label: "Rare Mat (icon)",     src: "/images/bundle/rare_mat.png" },
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
  { id: "stone",               label: "Stone",               src: "/images/bundle/stone.png" },
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

// ─── Refresh Helpers ──────────────────────────────────────────────────────────

// Returns UTC "YYYY-MM-DD" string for a given Date
function utcDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

// Today as UTC YYYY-MM-DD
export function todayUTC(): string {
  return utcDateStr(new Date())
}

// Next daily refresh = tomorrow at 00:00 UTC
function nextDailyRefresh(): string {
  const d = new Date()
  // Add 1 day in UTC
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(0, 0, 0, 0)
  return utcDateStr(d)
}

// Next monthly refresh: next 1st of month at 00:00 UTC
// monthlyDay defaults to 1
function nextMonthlyRefresh(monthlyDay = 1): string {
  const now = new Date()
  const todayDay = now.getUTCDate()
  const targetDay = monthlyDay
  let year  = now.getUTCFullYear()
  let month = now.getUTCMonth() // 0-indexed
  if (todayDay >= targetDay) {
    // already past this month's reset day → next month
    month += 1
    if (month > 11) { month = 0; year++ }
  }
  const d = new Date(Date.UTC(year, month, targetDay))
  return utcDateStr(d)
}

// Rolling: last purchase date + N days
function nextRollingRefresh(lastPurchaseDate: string | null, rollingDays: number): string {
  if (!lastPurchaseDate) return todayUTC() // never purchased → available now
  const last = new Date(lastPurchaseDate + "T00:00:00Z")
  last.setUTCDate(last.getUTCDate() + rollingDays)
  return utcDateStr(last)
}

// Returns a human-friendly "refreshes in X days" label or "Available now"
export function refreshStatusLabel(bundle: Bundle, lastPurchaseDateByBundleId: Record<string, string>): {
  nextDate: string
  label: string
  available: boolean
} {
  const today = todayUTC()
  let nextDate: string

  if (bundle.refreshType === "daily") {
    // Available if not yet purchased today
    const lastPurchase = lastPurchaseDateByBundleId[bundle.id]
    if (!lastPurchase || lastPurchase < today) {
      return { nextDate: today, label: "Available now", available: true }
    }
    nextDate = nextDailyRefresh()
  } else if (bundle.refreshType === "monthly") {
    const lastPurchase = lastPurchaseDateByBundleId[bundle.id]
    const targetDay = bundle.monthlyDay ?? 1
    const thisMonthReset = (() => {
      const now = new Date()
      return utcDateStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), targetDay)))
    })()
    if (!lastPurchase || lastPurchase < thisMonthReset) {
      return { nextDate: today, label: "Available now", available: true }
    }
    nextDate = nextMonthlyRefresh(targetDay)
  } else if (bundle.refreshType === "rolling") {
    const lastPurchase = lastPurchaseDateByBundleId[bundle.id] ?? null
    nextDate = nextRollingRefresh(lastPurchase, bundle.rollingDays ?? 30)
    if (nextDate <= today) {
      return { nextDate: today, label: "Available now", available: true }
    }
  } else {
    // none / event: show available (user manages manually)
    return { nextDate: today, label: "No auto-refresh", available: true }
  }

  const daysUntil = Math.ceil(
    (new Date(nextDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000
  )
  return {
    nextDate,
    label: daysUntil === 1 ? "Refreshes tomorrow" : `Refreshes in ${daysUntil}d (${nextDate})`,
    available: false,
  }
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = "bundles-state-v3"
export const TRACKER_KEY = "spending-tracker-v1"
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" }

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>
      return {
        categories: parsed.categories ?? [...DEFAULT_CATEGORIES],
        shopCategories: parsed.shopCategories ?? [...DEFAULT_SHOP_CATEGORIES],
        bundles: (parsed.bundles ?? []).map(b => migrateBundle(b as Partial<Bundle>)),
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_STATE
}

function migrateBundle(b: Partial<Bundle>): Bundle {
  return {
    id:           b.id           ?? `bundle_${Date.now()}`,
    name:         b.name         ?? "Bundle",
    category:     b.category     ?? "Daily",
    shopCategory: b.shopCategory ?? "Super-Value Bundle",
    refreshType:  b.refreshType  ?? "daily",
    rollingDays:  b.rollingDays  ?? 30,
    monthlyDay:   b.monthlyDay   ?? 1,
    columns:      (b.columns     ?? []).map(c => ({ showIcon: true, ...c, name: c.name ?? iconForSrc(c.icon ?? "")?.label ?? "Column" })),
    rows:         (b.rows        ?? []).map(r => ({ iconMode: "icon" as RowIconMode, cellIcons: {} as Record<string, string>, ...r, label: r.label ?? iconForSrc(r.icon ?? "")?.label ?? "Item" })),
  }
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: AppState = {
  categories: [...DEFAULT_CATEGORIES],
  shopCategories: [...DEFAULT_SHOP_CATEGORIES],
  bundles: [],  // No bundles by default — user adds their own
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

function rowTotal(row: BundleRow, columns: TierColumn[]): number {
  return columns.reduce((acc, col) => acc + (row.values[col.id] ?? 0) * col.maxPurchase, 0)
}

function rowTotalFmt(row: BundleRow, columns: TierColumn[]): string {
  if (row.customTotal !== undefined) return row.customTotal
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

// Load last-purchase dates for each bundle from the spending tracker
function loadLastPurchaseDates(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TRACKER_KEY)
    if (!raw) return {}
    const entries: Array<{ status: string; date: string; bundles: Array<{ bundleId: string }> }> = JSON.parse(raw)
    const map: Record<string, string> = {}
    entries
      .filter(e => e.status === "purchased")
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .forEach(e => {
        e.bundles.forEach(b => {
          if (!map[b.bundleId]) map[b.bundleId] = e.date
        })
      })
    return map
  } catch { return {} }
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
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? ALL_ICONS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : ALL_ICONS

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
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Choose Icon</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search icons…" value={query} onChange={e => setQuery(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto rounded-lg border border-border p-2">
          {filtered.map((opt) => (
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
          {filtered.length === 0 && <p className="col-span-5 text-xs text-muted-foreground text-center py-4">No icons match.</p>}
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

// ─── Refresh badge helper ─────────────────────────────────────────────────────

function RefreshBadge({ bundle, lastPurchaseDates }: { bundle: Bundle; lastPurchaseDates: Record<string, string> }) {
  const status = refreshStatusLabel(bundle, lastPurchaseDates)
  if (bundle.refreshType === "none") return null
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
      status.available
        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
        : "bg-orange-500/15 border-orange-500/30 text-orange-300"
    )}>
      <RefreshCw className="h-2.5 w-2.5" />
      {status.available ? (bundle.refreshType === "daily" ? "Available today" : "Available now") : status.label}
    </span>
  )
}

// ─── Bundle Table (Tables view) ───────────────────────────────────────────────

function BundleTable({
  bundle, editMode, categories, shopCategories, lastPurchaseDates, iconSize, onUpdate, onDelete,
}: {
  bundle: Bundle
  editMode: boolean
  categories: string[]
  shopCategories: string[]
  lastPurchaseDates: Record<string, string>
  iconSize: number
  onUpdate: (b: Bundle) => void
  onDelete: () => void
}) {
  type PickerTarget =
    | { type: "col"; colId: string }
    | { type: "row"; rowId: string }
    | { type: "cell"; rowId: string; colId: string }

  const { currentColor } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  // Picker state: separate open/current (React state for rendering) from target (ref so it
  // survives the dialog closing mid-flight when a native file-picker steals window focus).
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerCurrent, setPickerCurrent] = useState("")
  const pickerTargetRef = useRef<PickerTarget | null>(null)

  function openPicker(current: string, target: PickerTarget) {
    console.log('[picker] openPicker called', target)
    pickerTargetRef.current = target
    setPickerCurrent(current)
    setPickerOpen(true)
  }

  // Always-fresh refs — handler reads these at call time, no stale closures
  const bundleRef = useRef(bundle)
  bundleRef.current = bundle
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  function handlePickerSelect(src: string, label: string) {
    console.log('[picker] handlePickerSelect called', { src: src.slice(0, 60), label, target: pickerTargetRef.current })
    const target = pickerTargetRef.current
    if (!target) { console.warn('[picker] target is null — update skipped'); return }
    const b = bundleRef.current
    if (target.type === "col") {
      onUpdateRef.current({ ...b, columns: b.columns.map(c => c.id === target.colId ? { ...c, icon: src, name: label } : c) })
    } else if (target.type === "row") {
      onUpdateRef.current({ ...b, rows: b.rows.map(r => r.id === target.rowId ? { ...r, icon: src, label, iconMode: "icon" as RowIconMode } : r) })
    } else {
      onUpdateRef.current({ ...b, rows: b.rows.map(r => {
        if (r.id !== target.rowId) return r
        const ci = { ...(r.cellIcons ?? {}) }
        if (src) ci[target.colId] = src; else delete ci[target.colId]
        return { ...r, cellIcons: ci }
      })})
    }
    pickerTargetRef.current = null
    setPickerOpen(false)
  }

  const colors = themeColors(currentColor.hue)
  const totalCols = bundle.columns.length + 2 + (editMode ? 1 : 0)

  function setColIcon(id: string, icon: string, name: string) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, columns: b.columns.map(c => c.id === id ? { ...c, icon, name } : c) })
  }
  function setColName(id: string, name: string) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, columns: b.columns.map(c => c.id === id ? { ...c, name } : c) })
  }
  function setColPrice(id: string, price: number) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, columns: b.columns.map(c => c.id === id ? { ...c, price } : c) })
  }
  function setColMax(id: string, maxPurchase: number) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, columns: b.columns.map(c => c.id === id ? { ...c, maxPurchase } : c) })
  }
  function deleteCol(id: string) {
    const b = bundleRef.current
    const columns = b.columns.filter(c => c.id !== id)
    const rows = b.rows.map(r => {
      const v = { ...r.values }; delete v[id]
      const ci = { ...(r.cellIcons ?? {}) }; delete ci[id]
      return { ...r, values: v, cellIcons: ci }
    })
    onUpdateRef.current({ ...b, columns, rows })
  }
  function addColumn() {
    const b = bundleRef.current
    const id = `col_${Date.now()}`
    const columns = [...b.columns, { id, icon: "/images/bundle/stone_chest.png", name: "Stone Chest", price: 0, maxPurchase: 1, showIcon: true }]
    const rows = b.rows.map(r => ({ ...r, values: { ...r.values, [id]: 0 } }))
    onUpdateRef.current({ ...b, columns, rows })
  }
  function setRowIcon(id: string, icon: string, label: string) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, rows: b.rows.map(r => r.id === id ? { ...r, icon, label } : r) })
  }
  function setRowLabel(id: string, label: string) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, rows: b.rows.map(r => r.id === id ? { ...r, label } : r) })
  }
  function setRowType(id: string, rowType: RowType) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, rows: b.rows.map(r => r.id === id ? { ...r, rowType } : r) })
  }
  function setCell(rowId: string, colId: string, value: number) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, values: { ...r.values, [colId]: value } } : r) })
  }
  function setCellIcon(rowId: string, colId: string, icon: string) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, rows: b.rows.map(r => {
      if (r.id !== rowId) return r
      const ci = { ...(r.cellIcons ?? {}) }
      if (icon) ci[colId] = icon
      else delete ci[colId]
      return { ...r, cellIcons: ci }
    })})
  }
  function deleteRow(id: string) {
    const b = bundleRef.current
    onUpdateRef.current({ ...b, rows: b.rows.filter(r => r.id !== id) })
  }
  function addRow() {
    const b = bundleRef.current
    const id = `row_${Date.now()}`
    const values: Record<string, number> = {}
    b.columns.forEach(c => (values[c.id] = 0))
    onUpdateRef.current({ ...b, rows: [...b.rows, { id, icon: "/images/bundle/gem.png", label: "New Row", values, rowType: "number", iconMode: "icon", cellIcons: {} }] })
  }

  return (
    <>
      <IconPickerDialog open={pickerOpen} current={pickerCurrent} onSelect={handlePickerSelect} onClose={() => setPickerOpen(false)} />
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
                        <Select value={bundle.shopCategory || ""} onValueChange={v => onUpdate({ ...bundle, shopCategory: v })}>
                          <SelectTrigger className="h-8 w-44 bg-white/10 border-white/20 text-white text-xs gap-1">
                            <Store className="h-3 w-3 flex-shrink-0 text-white/60" />
                            <SelectValue placeholder="Shop Tab" />
                          </SelectTrigger>
                          <SelectContent>
                            {shopCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {/* Refresh type */}
                        <Select value={bundle.refreshType} onValueChange={v => onUpdate({ ...bundle, refreshType: v as RefreshType })}>
                          <SelectTrigger className="h-8 w-44 bg-white/10 border-white/20 text-white text-xs gap-1">
                            <RefreshCw className="h-3 w-3 flex-shrink-0 text-white/60" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(REFRESH_LABELS) as [RefreshType, string][]).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {bundle.refreshType === "rolling" && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" min="1" value={bundle.rollingDays}
                              onChange={e => onUpdate({ ...bundle, rollingDays: Math.max(1, Number(e.target.value) || 30) })}
                              className="h-8 w-16 text-center bg-white/10 border-white/20 text-white text-xs"
                            />
                            <span className="text-white/50 text-xs">days</span>
                          </div>
                        )}
                        {bundle.refreshType === "monthly" && (
                          <div className="flex items-center gap-1">
                            <span className="text-white/50 text-xs">Day</span>
                            <Input
                              type="number" min="1" max="28" value={bundle.monthlyDay}
                              onChange={e => onUpdate({ ...bundle, monthlyDay: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })}
                              className="h-8 w-14 text-center bg-white/10 border-white/20 text-white text-xs"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold italic text-white text-base tracking-wide">{bundle.name}</span>
                        {bundle.category && <Badge variant="outline" className="text-white/70 border-white/30 text-[11px] h-5 py-0 px-2">{bundle.category}</Badge>}
                        <RefreshBadge bundle={bundle} lastPurchaseDates={lastPurchaseDates} />
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
                <th className="w-44 px-3 py-3" />
                {bundle.columns.map(col => (
                  <th key={col.id} className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {/* Icon toggle in edit mode */}
                      {editMode && (
                        <button
                          onClick={() => onUpdate({ ...bundle, columns: bundle.columns.map(c => c.id === col.id ? { ...c, showIcon: !(c.showIcon ?? true) } : c) })}
                          className="text-[9px] text-white/40 hover:text-primary/80 transition mb-0.5 leading-none"
                          title="Toggle icon visibility"
                        >
                          {(col.showIcon ?? true) ? "🖼 hide icon" : "🖼 show icon"}
                        </button>
                      )}
                      {/* Icon (only when showIcon is true or undefined) */}
                      {(col.showIcon ?? true) ? (
                        <button onClick={() => editMode && openPicker(col.icon, { type: "col", colId: col.id })} className={cn("rounded-lg p-0.5 transition", editMode && "hover:ring-2 hover:ring-primary/60 cursor-pointer")}>
                          <Image src={col.icon} alt={col.name} width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
                        </button>
                      ) : (
                        /* No icon: show placeholder in edit mode so user can restore it */
                        editMode && (
                          <button onClick={() => openPicker(col.icon, { type: "col", colId: col.id })} style={{ width: iconSize, height: iconSize }} className="rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/20 hover:border-primary/40 hover:text-primary/40 transition text-[10px] leading-tight">
                            +icon
                          </button>
                        )
                      )}
                      {editMode ? (
                        <Input value={col.name} onChange={e => setColName(col.id, e.target.value)} className="h-6 w-28 text-center text-[11px] bg-white/10 border-white/20 text-white mt-0.5" />
                      ) : (
                        <span className="text-xs text-white/60 text-center max-w-[96px] leading-tight line-clamp-2">{col.name}</span>
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
              {bundle.rows.map((row, idx) => {
                const mode = row.iconMode ?? "icon"
                return (
                <tr key={row.id} className="border-t border-white/10" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {/* Row icon — only in "icon" mode */}
                      {mode === "icon" && (
                        <div className="relative flex-shrink-0">
                          {editMode ? (
                            <>
                              <button onClick={() => openPicker(row.icon, { type: "row", rowId: row.id })} className="rounded-lg p-0.5 block hover:ring-2 hover:ring-primary/60 cursor-pointer transition">
                                <Image src={row.icon} alt={row.label} width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
                              </button>
                              <button
                                onClick={() => onUpdateRef.current({ ...bundleRef.current, rows: bundleRef.current.rows.map(r => r.id === row.id ? { ...r, iconMode: "text" as RowIconMode } : r) })}
                                title="Remove icon"
                                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </>
                          ) : (
                            <Image src={row.icon} alt={row.label} width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
                          )}
                        </div>
                      )}
                      {/* In edit mode (non-icon modes): +icon button to add icon back */}
                      {editMode && mode !== "icon" && (
                        <button onClick={() => openPicker(row.icon, { type: "row", rowId: row.id })} style={{ width: iconSize, height: iconSize }} className="rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/20 hover:border-primary/40 hover:text-primary/40 transition flex-shrink-0 text-[9px]">
                          +icon
                        </button>
                      )}
                      {editMode ? (
                        <div className="space-y-1">
                          <Input value={row.label} onChange={e => setRowLabel(row.id, e.target.value)} className="h-6 w-28 text-[11px] bg-white/10 border-white/20 text-white" />
                          <div className="flex gap-1">
                            <Select value={row.rowType} onValueChange={v => setRowType(row.id, v as RowType)}>
                              <SelectTrigger className="h-6 w-24 text-[10px] bg-white/10 border-white/20 text-white px-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="currency">Currency</SelectItem>
                              </SelectContent>
                            </Select>
                            {/* Icon mode selector */}
                            <Select value={mode} onValueChange={v => onUpdate({ ...bundle, rows: bundle.rows.map(r => r.id === row.id ? { ...r, iconMode: v as RowIconMode } : r) })}>
                              <SelectTrigger className="h-6 w-20 text-[9px] bg-white/10 border-white/20 text-white px-1" title="Row icon display">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="icon">🖼 Icon</SelectItem>
                                <SelectItem value="text">Aa Text</SelectItem>
                                <SelectItem value="none">— None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            value={row.customTotal ?? ""}
                            onChange={e => {
                              const val = e.target.value
                              onUpdateRef.current({ ...bundleRef.current, rows: bundleRef.current.rows.map(r => r.id === row.id ? { ...r, customTotal: val === "" ? undefined : val } : r) })
                            }}
                            placeholder="Custom total (override)"
                            className="h-6 w-full text-[10px] bg-white/10 border-white/20 text-white placeholder:text-white/30"
                          />
                        </div>
                      ) : mode !== "none" ? (
                        <span className="text-sm text-white/70 leading-tight">{row.label}</span>
                      ) : null}
                    </div>
                  </td>
                  {bundle.columns.map(col => {
                    const cellIcon = row.cellIcons?.[col.id] ?? ""
                    return (
                    <td key={`${row.id}-${col.id}`} className="px-3 py-3 text-center text-white/80 text-sm">
                      {editMode ? (
                        <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                          {/* Per-cell icon picker */}
                          <div className="relative">
                            <button
                              onClick={() => openPicker(cellIcon, { type: "cell", rowId: row.id, colId: col.id })}
                              title="Set icon for this cell"
                              className={cn(
                                "rounded-md transition",
                                cellIcon
                                  ? "p-0.5 hover:ring-2 hover:ring-primary/60 cursor-pointer"
                                  : "border border-dashed border-white/20 flex items-center justify-center text-[9px] text-white/25 hover:border-primary/40 hover:text-primary/40"
                              )}
                              style={!cellIcon ? { width: iconSize, height: iconSize } : undefined}
                            >
                              {cellIcon
                                ? <Image src={cellIcon} alt="" width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
                                : "+icon"
                              }
                            </button>
                            {cellIcon && (
                              <button
                                onClick={() => setCellIcon(row.id, col.id, "")}
                                title="Remove cell icon"
                                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          <Input
                            type="number"
                            value={row.values[col.id] ?? 0}
                            onChange={e => setCell(row.id, col.id, Number(e.target.value) || 0)}
                            className="h-7 w-20 text-center bg-white/10 border-white/20 text-white text-xs"
                          />
                        </div>
                      ) : cellIcon ? (
                        <div className="flex flex-col items-center gap-1">
                          <Image src={cellIcon} alt="" width={iconSize} height={iconSize} className="object-contain" style={{ width: iconSize, height: iconSize }} />
                          <span className="text-sm font-bold tabular-nums">×{fmt(row.values[col.id] ?? 0)}</span>
                        </div>
                      ) : mode === "icon" && (row.values[col.id] ?? 0) > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <Image src={row.icon} alt={row.label} width={iconSize} height={iconSize} className="object-contain opacity-85" style={{ width: iconSize, height: iconSize }} />
                          <span className="text-sm font-bold tabular-nums">×{fmt(row.values[col.id] ?? 0)}</span>
                        </div>
                      ) : (
                        <span className={(row.values[col.id] ?? 0) === 0 ? "text-white/20 text-sm" : "text-base font-bold tabular-nums"}>{fmt(row.values[col.id] ?? 0)}</span>
                      )}
                    </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-bold italic text-white text-sm">{rowTotalFmt(row, bundle.columns)}</span>
                  </td>
                  {editMode && (
                    <td className="pr-2 text-center">
                      <button onClick={() => deleteRow(row.id)} className="text-red-400/60 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  )}
                </tr>
                )
              })}
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

function BundleCard({ bundle, lastPurchaseDates }: { bundle: Bundle; lastPurchaseDates: Record<string, string> }) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)
  const totalPrice = bundle.columns.reduce((a, c) => a + c.price * c.maxPurchase, 0)

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden shadow-lg shadow-black/30" style={{ background: colors.card }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: colors.headerGrad }}>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="font-bold italic text-white text-sm tracking-wide truncate">{bundle.name}</span>
          {bundle.category && <Badge variant="outline" className="text-white/60 border-white/25 text-[10px] h-5 py-0 px-2">{bundle.category}</Badge>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className="text-white border-white/30 text-xs">${totalPrice}</Badge>
        </div>
      </div>
      <div className="px-3 py-1.5 border-b border-white/5" style={{ background: colors.iconRow }}>
        <RefreshBadge bundle={bundle} lastPurchaseDates={lastPurchaseDates} />
      </div>
      <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10" style={{ background: colors.iconRow }}>
        {bundle.columns.map(col => (
          <div key={col.id} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
            {(col.showIcon ?? true)
              ? <Image src={col.icon} alt={col.name} width={48} height={48} className="h-12 w-12 object-contain" />
              : <div className="h-12 flex items-end"><span className="text-[10px] text-white/60 font-medium text-center">{col.name}</span></div>
            }
            {(col.showIcon ?? true) && <span className="text-[9px] text-white/50 text-center leading-tight truncate w-full">{col.name}</span>}
            <span className="text-[10px] text-white/70 font-medium">${col.price}</span>
            {col.maxPurchase > 1 && <span className="text-[9px] text-primary/80">x{col.maxPurchase}</span>}
          </div>
        ))}
      </div>
      <div className="divide-y divide-white/5">
        {bundle.rows.map((row, idx) => {
          const mode = row.iconMode ?? "icon"
          return (
          <div key={row.id} className="flex items-center gap-2.5 px-3 py-2" style={{ background: idx % 2 === 0 ? colors.rowEven : colors.rowOdd }}>
            {mode === "icon" && <Image src={row.icon} alt={row.label} width={36} height={36} className="h-9 w-9 object-contain flex-shrink-0" />}
            {mode !== "none" && <span className="text-xs text-white/70 flex-1 min-w-0 truncate">{row.label}</span>}
            {mode === "none" && <span className="flex-1" />}
            <span className="text-xs font-bold text-white whitespace-nowrap">{rowTotalFmt(row, bundle.columns)}</span>
          </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Compare View ─────────────────────────────────────────────────────────────

function CompareView({ bundles, categories }: { bundles: Bundle[]; categories: string[] }) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)
  const [selectedIds, setSelectedIds] = useState<string[]>(bundles.slice(0, 2).map(b => b.id))
  const [filterCat, setFilterCat] = useState("All")
  const [search, setSearch] = useState("")

  const visibleBundles = (filterCat === "All" ? bundles : bundles.filter(b => b.category === filterCat))
    .filter(b => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase()))
  const selected = bundles.filter(b => selectedIds.includes(b.id))

  const allItems = useMemo(() => {
    const seen = new Map<string, { icon: string; label: string; rowType: RowType; iconMode: RowIconMode }>()
    selected.forEach(b => b.rows.forEach(r => {
      if (!seen.has(r.label)) seen.set(r.label, { icon: r.icon, label: r.label, rowType: r.rowType, iconMode: r.iconMode ?? "icon" })
    }))
    return Array.from(seen.values())
  }, [selected])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search bundles…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition", filterCat === cat ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{cat}</button>
          ))}
        </div>
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
                        {(item.iconMode ?? "icon") === "icon" && <Image src={item.icon} alt={item.label} width={36} height={36} className="h-9 w-9 object-contain flex-shrink-0" />}
                        {(item.iconMode ?? "icon") !== "none" && <span className="text-xs text-white/70 leading-tight">{item.label}</span>}
                        {(item.iconMode ?? "icon") === "none" && <span className="text-xs text-white/40 italic leading-tight">—</span>}
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

// ─── Add to Spending Tracker Dialog ──────────────────────────────────────────

function AddToTrackerFromPlanDialog({
  open, onClose, selected, spendQty, totalSpend,
}: {
  open: boolean
  onClose: (saved?: boolean) => void
  selected: Bundle[]
  spendQty: Record<string, Record<string, number>>
  totalSpend: number
}) {
  const [date, setDate] = useState(() => todayUTC())
  const [status, setStatus] = useState<"planned" | "purchased">("planned")
  const [currency, setCurrency] = useState("USD")
  const [notes, setNotes] = useState("")

  // Check existing tracker entries for this date to warn about duplicates
  const duplicateWarnings = useMemo(() => {
    try {
      const entries: Array<{ date: string; bundles: Array<{ bundleName: string }> }> =
        JSON.parse(localStorage.getItem(TRACKER_KEY) ?? "[]")
      const onDate = entries.filter(e => e.date === date)
      const namesOnDate = new Set(onDate.flatMap(e => e.bundles.map(b => b.bundleName)))
      return selected.map(b => b.name).filter(n => namesOnDate.has(n))
    } catch { return [] }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selected])

  function handleSave() {
    const entry = {
      id: `entry_${Date.now()}`,
      date,
      bundles: selected.map(b => ({
        bundleId: b.id,
        bundleName: b.name,
        category: b.category,
        refreshType: b.refreshType,
        rollingDays: b.rollingDays,
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

        {duplicateWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 space-y-0.5">
            <p className="font-semibold text-amber-200">⚠ Already logged on this date:</p>
            {duplicateWarnings.map(n => <p key={n} className="pl-2 text-amber-300/80">• {n}</p>)}
            <p className="text-amber-400/60 pt-0.5">You can still save — this will create a second entry.</p>
          </div>
        )}
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

// ─── Plan View ────────────────────────────────────────────────────────────────

function PlanView({ bundles, categories }: { bundles: Bundle[]; categories: string[] }) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)
  const lastPurchaseDates = useMemo(() => loadLastPurchaseDates(), [])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterCat, setFilterCat] = useState("All")
  const [search, setSearch] = useState("")
  const [trackerDialogOpen, setTrackerDialogOpen] = useState(false)

  const [spendQty, setSpendQty] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {}
    bundles.forEach(b => {
      init[b.id] = {}
      b.columns.forEach(c => { init[b.id][c.id] = c.maxPurchase })
    })
    return init
  })

  // Keep spendQty in sync when bundles change
  const prevBundlesRef = useRef(bundles)
  if (prevBundlesRef.current !== bundles) {
    prevBundlesRef.current = bundles
    bundles.forEach(b => {
      if (!spendQty[b.id]) {
        spendQty[b.id] = {}
        b.columns.forEach(c => { spendQty[b.id][c.id] = c.maxPurchase })
      } else {
        b.columns.forEach(c => {
          if (spendQty[b.id][c.id] === undefined) spendQty[b.id][c.id] = c.maxPurchase
        })
      }
    })
  }

  function getQty(bundleId: string, colId: string, maxPurchase: number): number {
    return spendQty[bundleId]?.[colId] ?? maxPurchase
  }
  function setQty(bundleId: string, colId: string, qty: number, maxPurchase: number) {
    setSpendQty(prev => ({ ...prev, [bundleId]: { ...(prev[bundleId] ?? {}), [colId]: Math.max(0, Math.min(maxPurchase, qty)) } }))
  }

  const visibleBundles = (filterCat === "All" ? bundles : bundles.filter(b => b.category === filterCat))
    .filter(b => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase()))
  const selected = visibleBundles.filter(b => selectedIds.includes(b.id))

  const allItems = useMemo(() => {
    const seen = new Map<string, { icon: string; label: string; rowType: RowType; iconMode: RowIconMode }>()
    selected.forEach(b => b.rows.forEach(r => {
      if (!seen.has(r.label)) seen.set(r.label, { icon: r.icon, label: r.label, rowType: r.rowType, iconMode: r.iconMode ?? "icon" })
    }))
    return Array.from(seen.values())
  }, [selected])

  const combined = useMemo(() => {
    const map = new Map<string, { icon: string; label: string; rowType: RowType; iconMode: RowIconMode; total: number }>()
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
          map.set(row.label, { icon: row.icon, label: row.label, rowType: row.rowType, iconMode: row.iconMode ?? "icon", total })
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

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search bundles…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition", filterCat === cat ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Bundles:</span>
        {visibleBundles.map(b => {
          const status = refreshStatusLabel(b, lastPurchaseDates)
          return (
            <button
              key={b.id}
              onClick={() => setSelectedIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])}
              className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition flex items-center gap-1.5",
                selectedIds.includes(b.id) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {b.name}
              {!status.available && b.refreshType !== "none" && (
                <span className="text-[9px] text-orange-400 border border-orange-500/30 bg-orange-500/10 rounded px-1">locked</span>
              )}
            </button>
          )
        })}
        {selected.length > 0 && <span className="ml-auto text-sm font-bold text-foreground tabular-nums">Total: ${fmt(totalSpend)}</span>}
      </div>

      {selected.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">Select bundles above to build your plan.</p>
      )}

      {selected.length > 0 && (
        <>
          {/* Spending Configuration */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Spending Configuration</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selected.map(b => {
                const bundleSpend = b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0)
                const refreshStatus = refreshStatusLabel(b, lastPurchaseDates)
                return (
                  <div key={b.id} className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 gap-2 flex-wrap" style={{ background: colors.iconRow }}>
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-semibold italic text-white text-sm truncate">{b.name}</span>
                        {b.category && <Badge variant="outline" className="text-white/60 border-white/25 text-[10px] h-5 py-0 px-2 flex-shrink-0">{b.category}</Badge>}
                        <RefreshBadge bundle={b} lastPurchaseDates={lastPurchaseDates} />
                      </div>
                      <span className="font-bold text-white text-sm flex-shrink-0 tabular-nums">${fmt(bundleSpend)}</span>
                    </div>
                    {!refreshStatus.available && b.refreshType !== "none" && (
                      <div className="px-4 py-1.5 text-xs text-orange-300 bg-orange-950/30 border-b border-orange-500/20">
                        ⚠ {refreshStatus.label}
                      </div>
                    )}
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
                              <button onClick={() => setQty(b.id, col.id, qty - 1, col.maxPurchase)} disabled={qty === 0} className="h-7 w-7 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors select-none text-base font-bold leading-none">−</button>
                              <span className="text-sm font-bold text-white w-5 text-center tabular-nums select-none">{qty}</span>
                              <button onClick={() => setQty(b.id, col.id, qty + 1, col.maxPurchase)} disabled={qty >= col.maxPurchase} className="h-7 w-7 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors select-none text-base font-bold leading-none">+</button>
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
                              {(item.iconMode ?? "icon") === "icon" && <Image src={item.icon} alt={item.label} width={36} height={36} className="h-9 w-9 object-contain flex-shrink-0" />}
                              {(item.iconMode ?? "icon") !== "none" && <span className="text-xs text-white/70 leading-tight">{item.label}</span>}
                              {(item.iconMode ?? "icon") === "none" && <span className="text-xs text-white/40 italic leading-tight">—</span>}
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
                  {(item.iconMode ?? "icon") === "icon" && <Image src={item.icon} alt={item.label} width={56} height={56} className="h-14 w-14 object-contain" />}
                  {(item.iconMode ?? "icon") !== "none" && <span className="text-[11px] text-white/60 leading-tight">{item.label}</span>}
                  {(item.iconMode ?? "icon") === "none" && <span className="text-[11px] text-white/30 leading-tight italic">—</span>}
                  <span className="text-sm font-bold text-white tabular-nums">{formatTotal(item.rowType, item.total)}</span>
                </div>
              ))}
            </div>
          </div>

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


// ─── Bundle Shop Card (Game View) ─────────────────────────────────────────────
// One card per bundle. Supports:
//   • Multi-tier progression (click Buy → advances to next tier)
//   • maxPurchase > 1 on a tier (e.g. buy same tier 3×)
//   • Planning even when bundle is on cooldown (shows info only, never blocks)

function BundleShopCard({
  bundle, lastPurchaseDates, basket, onBuy, onRemove,
}: {
  bundle: Bundle
  lastPurchaseDates: Record<string, string>
  basket: BasketItem[]
  onBuy: (colIdx: number) => void
  onRemove: (item: BasketItem) => void
}) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)
  const bundleStatus = refreshStatusLabel(bundle, lastPurchaseDates)
  // onCooldown is purely informational — it never blocks adding to plan
  const onCooldown = !bundleStatus.available && bundle.refreshType !== "none"

  const totalTiers = bundle.columns.length

  // How many times each tier column is currently in the basket
  const tierCounts = bundle.columns.map((_, i) =>
    basket.filter(b => b.bundleId === bundle.id && b.columnIdx === i).length
  )
  const totalInBasket = tierCounts.reduce((s, n) => s + n, 0)

  // Current tier = first column that hasn't reached its maxPurchase limit yet
  const currentTierIdx = (() => {
    for (let i = 0; i < bundle.columns.length; i++) {
      if (tierCounts[i] < (bundle.columns[i].maxPurchase ?? 1)) return i
    }
    return bundle.columns.length // all tiers fully planned
  })()
  const allPurchased = currentTierIdx >= totalTiers && totalTiers > 0
  const displayTierIdx = allPurchased ? totalTiers - 1 : currentTierIdx
  const col = bundle.columns[displayTierIdx]

  // How many times the current tier is already in the basket, and its maximum
  const currentTierCount = currentTierIdx < totalTiers ? tierCounts[currentTierIdx] : 0
  const currentTierMax = col ? (col.maxPurchase ?? 1) : 1

  const items = col
    ? bundle.rows
        .map(row => ({ label: row.label, icon: row.cellIcons?.[col.id] || row.icon, rowType: row.rowType, iconMode: row.iconMode ?? "icon", total: row.values[col.id] ?? 0 }))
        .filter(i => i.total > 0)
    : []

  if (!col) {
    return (
      <div className="relative flex flex-col rounded-2xl border border-white/10 overflow-hidden" style={{ background: colors.card, minWidth: 220 }}>
        <div className="px-4 py-3" style={{ background: colors.headerGrad }}>
          <p className="font-bold text-white text-sm truncate">{bundle.name}</p>
        </div>
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-[11px] text-white/25 italic">No tiers configured</p>
        </div>
      </div>
    )
  }

  // Progress dots — one pip per purchase slot (respects maxPurchase per tier)
  const hasProgress = totalTiers > 1 || currentTierMax > 1
  const progressDots = hasProgress ? (
    <div className="flex items-center gap-1 justify-center py-1.5 flex-wrap px-3">
      {bundle.columns.flatMap((c, i) => {
        const count = tierCounts[i]
        const max = c.maxPurchase ?? 1
        return Array.from({ length: max }, (_, j) => {
          const filled  = j < count
          const current = i === currentTierIdx && j === count && !allPurchased
          return (
            <div
              key={`${i}-${j}`}
              title={max > 1 ? `${c.name} ×${j + 1}` : c.name}
              className={cn(
                "rounded-full transition-all flex-shrink-0",
                filled  ? "w-2.5 h-2.5 bg-emerald-400" :
                current ? "w-3 h-3 bg-amber-400 ring-2 ring-amber-300/40" :
                          "w-2 h-2 bg-white/15"
              )}
            />
          )
        })
      })}
    </div>
  ) : null

  return (
    <div className={cn(
      "relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 select-none",
      allPurchased ? "border-emerald-500/50 shadow-lg shadow-emerald-900/20" :
                     "border-white/10 hover:border-white/20"
    )} style={{ minWidth: 220, maxWidth: 280 }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex flex-col gap-1" style={{ background: colors.headerGrad }}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold italic text-white text-sm leading-tight flex-1">{bundle.name}</p>
          {allPurchased && (
            <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full px-1.5 py-0.5 flex-shrink-0 font-semibold">✓ All</span>
          )}
        </div>
        <p className="text-[11px] text-white/50">
          {allPurchased
            ? `All ${totalTiers} tier${totalTiers !== 1 ? "s" : ""} in your plan`
            : totalTiers > 1
            ? `Tier ${currentTierIdx + 1} of ${totalTiers} — ${col.name}`
            : currentTierMax > 1
            ? `${col.name} (${currentTierCount + 1} of ${currentTierMax})`
            : col.name}
        </p>
      </div>

      {/* Tier icon */}
      <div className="flex justify-center items-center py-6" style={{ background: colors.iconRow }}>
        <Image
          src={col.icon} alt={col.name}
          width={112} height={112}
          className="object-contain drop-shadow-lg"
          style={{ height: 112, width: 112 }}
        />
      </div>

      {/* Items list */}
      <div className="flex-1 px-4 py-3 space-y-2" style={{ background: colors.rowEven }}>
        {items.slice(0, 8).map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.iconMode !== "text" && item.iconMode !== "none" && (
              <Image src={item.icon} alt={item.label} width={36} height={36} className="object-contain flex-shrink-0" style={{ height: 36, width: 36 }} />
            )}
            {item.iconMode !== "none" && <span className="text-xs text-white/65 flex-1 leading-tight truncate">{item.label}</span>}
            {item.iconMode === "none" && <span className="flex-1" />}
            <span className="text-xs font-bold tabular-nums text-white/85 ml-1 flex-shrink-0">{fmtRaw(item.total, item.rowType)}</span>
          </div>
        ))}
        {items.length > 8 && <p className="text-[10px] text-white/30 text-center pt-0.5">+{items.length - 8} more…</p>}
        {items.length === 0 && <p className="text-[10px] text-white/25 text-center py-2 italic">No items</p>}
      </div>

      {/* Progress dots */}
      {progressDots && <div style={{ background: colors.footer }}>{progressDots}</div>}

      {/* Refresh / cooldown info strip — purely informational, never blocks */}
      {bundle.refreshType !== "none" && (
        <div
          className="px-3 py-1.5 text-center border-t border-white/5"
          style={{ background: onCooldown ? "rgba(120,40,0,0.35)" : colors.footer }}
        >
          <span className={cn("text-[10px]", onCooldown ? "text-orange-400/80" : "text-white/35")}>
            {onCooldown
              ? `🔒 ${bundleStatus.label} — plan for next refresh`
              : bundle.refreshType === "daily"   ? "Fresh daily 00:00 UTC"
              : bundle.refreshType === "monthly"  ? `Monthly — day ${bundle.monthlyDay ?? 1}`
              : `Every ${bundle.rollingDays ?? 30} days`}
          </span>
        </div>
      )}

      {/* Action area */}
      <div className="px-3 pb-4 pt-2 space-y-2" style={{ background: colors.footer }}>
        {allPurchased ? (
          <div className="rounded-xl bg-emerald-900/30 border border-emerald-500/30 py-2.5 px-3 text-center">
            <p className="text-xs text-emerald-300 font-semibold">✓ All tiers planned</p>
          </div>
        ) : (
          // Always shown — cooldown is informational only
          <button
            onClick={() => onBuy(currentTierIdx)}
            className="w-full rounded-xl py-3 font-extrabold text-[15px] tracking-wide transition-all duration-150 active:scale-[0.97] active:brightness-90"
            style={{
              background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)",
              color: "#1c0e00",
              textShadow: "0 1px 0 rgba(255,255,255,0.25)",
              boxShadow: "0 2px 0 #92400e, 0 5px 16px rgba(180,83,9,0.4)",
              border: "1px solid #b45309",
            }}
          >
            {currentTierMax > 1
              ? `×${currentTierCount + 1}/${currentTierMax}  $${col.price}`
              : `$${col.price}`}
          </button>
        )}

        {/* Undo — remove the last basket entry for this bundle */}
        {totalInBasket > 0 && (
          <button
            onClick={() => {
              const lastAdded = [...basket].reverse().find(b => b.bundleId === bundle.id)
              if (lastAdded) onRemove(lastAdded)
            }}
            className="w-full text-[10px] text-white/30 hover:text-red-400 transition text-center flex items-center justify-center gap-1 py-0.5"
          >
            ← {allPurchased ? "Remove last" : `Undo (${totalInBasket} in plan)`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Basket Panel (Game View) ─────────────────────────────────────────────────

function BasketPanel({
  basket, onRemove, onSave,
}: {
  basket: BasketItem[]
  onRemove: (item: BasketItem) => void
  onSave: () => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; cat: string; items: BasketItem[] }>()
    basket.forEach(item => {
      const g = map.get(item.bundleId) ?? { name: item.bundleName, cat: item.bundleCategory, items: [] }
      g.items.push(item)
      map.set(item.bundleId, g)
    })
    return Array.from(map.values())
  }, [basket])

  const total = basket.reduce((s, i) => s + i.column.price, 0)

  // Aggregate items across all basket entries for the "total items" preview
  const aggregated = useMemo(() => {
    const map = new Map<string, { label: string; icon: string; rowType: RowType; total: number }>()
    basket.forEach(bi => {
      bi.items.forEach(item => {
        const ex = map.get(item.label)
        if (ex) map.set(item.label, { ...ex, total: ex.total + item.total })
        else map.set(item.label, { ...item })
      })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [basket])

  const [showItems, setShowItems] = useState(false)

  return (
    <div className="rounded-2xl border border-primary/30 overflow-hidden shadow-2xl shadow-black/50 bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary/15 border-b border-primary/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="font-bold text-foreground text-sm">Your Plan</span>
        </div>
        <Badge variant="outline" className="text-primary border-primary/40 text-xs">
          {basket.length} tier{basket.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Bundle groups */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50" style={{ maxHeight: "calc(100vh - 360px)" }}>
        {grouped.map(group => (
          <div key={group.name} className="px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">{group.name}</p>
              {group.cat && <span className="text-[9px] text-muted-foreground/50 border border-border rounded px-1 py-0.5">{group.cat}</span>}
            </div>
            {group.items.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <Image src={item.column.icon} alt={item.column.name} width={28} height={28} className="h-7 w-7 object-contain flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight truncate">{item.column.name}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums font-medium">${item.column.price}</p>
                </div>
                <button onClick={() => onRemove(item)} className="text-muted-foreground/35 hover:text-red-400 transition flex-shrink-0 p-0.5 rounded hover:bg-red-500/10">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Total items toggle */}
      {aggregated.length > 0 && (
        <div className="border-t border-border/50">
          <button
            onClick={() => setShowItems(s => !s)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 hover:bg-muted/20 transition text-xs text-muted-foreground"
          >
            <span>Total Items ({aggregated.length})</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showItems && "rotate-180")} />
          </button>
          {showItems && (
            <div className="px-3 pb-3 grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
              {aggregated.map(item => (
                <div key={item.label} className="flex items-center gap-2 bg-muted/15 rounded-lg px-2 py-1.5">
                  <Image src={item.icon} alt={item.label} width={20} height={20} className="h-5 w-5 object-contain flex-shrink-0" />
                  <span className="text-[11px] text-muted-foreground flex-1 truncate">{item.label}</span>
                  <span className="text-[11px] font-bold tabular-nums">{fmtRaw(item.total, item.rowType)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/10 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-extrabold text-primary tabular-nums">${fmt(total)}</span>
        </div>
        <Button onClick={onSave} className="w-full gap-2" size="sm">
          <CalendarPlus className="h-3.5 w-3.5" /> Save to Tracker
        </Button>
      </div>
    </div>
  )
}

// ─── Game Save Dialog ─────────────────────────────────────────────────────────

function GameSaveDialog({ open, basket, onClose }: {
  open: boolean
  basket: BasketItem[]
  onClose: (saved?: boolean) => void
}) {
  const [date, setDate] = useState(() => todayUTC())
  const [status, setStatus] = useState<"planned" | "purchased">("purchased")
  const [currency, setCurrency] = useState("USD")
  const [notes, setNotes] = useState("")

  const totalCost = basket.reduce((s, i) => s + i.column.price, 0)

  // Warn if any basket bundles are already logged on the chosen date
  const duplicateWarnings = useMemo(() => {
    try {
      const entries: Array<{ date: string; bundles: Array<{ bundleName: string }> }> =
        JSON.parse(localStorage.getItem(TRACKER_KEY) ?? "[]")
      const onDate = entries.filter(e => e.date === date)
      const namesOnDate = new Set(onDate.flatMap(e => e.bundles.map(b => b.bundleName)))
      const basketNames = Array.from(new Set(basket.map(i => i.bundleName)))
      return basketNames.filter(n => namesOnDate.has(n))
    } catch { return [] }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, basket])
  const sym = CURRENCY_SYMBOLS[currency] ?? "$"

  // Group by bundle
  const byBundle = useMemo(() => {
    const map = new Map<string, BasketItem[]>()
    basket.forEach(item => {
      const arr = map.get(item.bundleId) ?? []
      arr.push(item)
      map.set(item.bundleId, arr)
    })
    return Array.from(map.entries())
  }, [basket])

  function handleSave() {
    const entry = {
      id: `entry_${Date.now()}`,
      date, status, currency, notes,
      bundles: byBundle.map(([bundleId, items]) => {
        // Aggregate items across all columns for this bundle
        const allItems = new Map<string, { label: string; icon: string; rowType: RowType; total: number }>()
        items.forEach(bi => {
          bi.items.forEach(it => {
            const ex = allItems.get(it.label)
            if (ex) allItems.set(it.label, { ...ex, total: ex.total + it.total })
            else allItems.set(it.label, { ...it })
          })
        })
        return {
          bundleId,
          bundleName: items[0].bundleName,
          category: items[0].bundleCategory,
          cost: items.reduce((s, i) => s + i.column.price, 0),
          items: Array.from(allItems.values()).filter(i => i.total > 0),
        }
      }),
      totalCost,
    }
    try {
      const existing = JSON.parse(localStorage.getItem(TRACKER_KEY) ?? "[]")
      localStorage.setItem(TRACKER_KEY, JSON.stringify([entry, ...existing]))
    } catch { /* ignore */ }
    onClose(true)
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Save Plan to Tracker</DialogTitle></DialogHeader>

        {/* Summary */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-sm max-h-52 overflow-y-auto">
          {byBundle.map(([, items]) => (
            <div key={items[0].bundleId} className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">{items[0].bundleName}</p>
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between pl-3 gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                    <Image src={item.column.icon} alt="" width={16} height={16} className="h-4 w-4 object-contain flex-shrink-0" />
                    <span className="truncate">{item.column.name}</span>
                  </span>
                  <span className="font-medium tabular-nums flex-shrink-0">{sym}{item.column.price}</span>
                </div>
              ))}
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="tabular-nums">{sym}{totalCost}</span>
          </div>
        </div>

        {duplicateWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 space-y-0.5">
            <p className="font-semibold text-amber-200">⚠ Already logged on this date:</p>
            {duplicateWarnings.map(n => <p key={n} className="pl-2 text-amber-300/80">• {n}</p>)}
            <p className="text-amber-400/60 pt-0.5">You can still save — this will create a second entry.</p>
          </div>
        )}

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
                <SelectItem value="purchased">✅ Purchased</SelectItem>
                <SelectItem value="planned">🕒 Planned</SelectItem>
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
                {Object.entries(CURRENCY_SYMBOLS).map(([c, s]) => (
                  <SelectItem key={c} value={c}>{c} ({s})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Notes</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" className="h-9" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onClose()}>Cancel</Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <CalendarPlus className="h-3.5 w-3.5" /> Save Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Game View ────────────────────────────────────────────────────────────────

function GameView({
  bundles, shopCategories, lastPurchaseDates, editMode,
  onSwitchToStandard, onAddBundle, onUpdateShopCategories,
}: {
  bundles: Bundle[]
  shopCategories: string[]
  lastPurchaseDates: Record<string, string>
  editMode: boolean
  onSwitchToStandard: () => void
  onAddBundle: () => void
  onUpdateShopCategories: (cats: string[]) => void
}) {
  const { currentColor } = useTheme()
  const colors = themeColors(currentColor.hue)

  const [activeCat, setActiveCat] = useState("All")
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [search, setSearch] = useState("")
  const [removeConfirm, setRemoveConfirm] = useState<BasketItem | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [shopCatDialogOpen, setShopCatDialogOpen] = useState(false)

  function addToBasket(bundle: Bundle, colIdx: number) {
    const col = bundle.columns[colIdx]
    if (!col) return
    const items = bundle.rows
      .map(row => ({ label: row.label, icon: row.cellIcons?.[col.id] || row.icon, rowType: row.rowType, total: row.values[col.id] ?? 0 }))
      .filter(i => i.total > 0)
    setBasket(prev => [...prev, {
      id: `${bundle.id}-c${colIdx}-${Date.now()}`,
      bundleId: bundle.id, bundleName: bundle.name, bundleCategory: bundle.shopCategory,
      columnIdx: colIdx, column: col, items,
    }])
  }

  // Category counts using shopCategory
  const catCounts = useMemo(() => {
    const map: Record<string, number> = { All: bundles.length }
    shopCategories.forEach(cat => { map[cat] = bundles.filter(b => b.shopCategory === cat).length })
    return map
  }, [bundles, shopCategories])

  const filteredBundles = (activeCat === "All" ? bundles : bundles.filter(b => b.shopCategory === activeCat))
    .filter(b => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <CategoryManageDialog
        open={shopCatDialogOpen}
        categories={shopCategories}
        onUpdate={onUpdateShopCategories}
        onClose={() => setShopCatDialogOpen(false)}
      />

      {/* Remove-confirm dialog */}
      {removeConfirm && (
        <Dialog open onOpenChange={() => setRemoveConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Go back on this tier?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Remove <strong>{removeConfirm.column.name}</strong> from{" "}
              <strong>{removeConfirm.bundleName}</strong>? The previous tier will be shown.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRemoveConfirm(null)}>Keep it</Button>
              <Button variant="destructive" size="sm" onClick={() => {
                setBasket(prev => prev.filter(i => i.id !== removeConfirm.id))
                setRemoveConfirm(null)
              }}>
                Go back
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {saveDialogOpen && (
        <GameSaveDialog
          open
          basket={basket}
          onClose={(saved) => { setSaveDialogOpen(false); if (saved) setBasket([]) }}
        />
      )}

      <div className="flex gap-4 min-h-[600px]">
        {/* ── Left category sidebar ── */}
        <div className="w-52 flex-shrink-0 space-y-1 sticky top-4 self-start">
          {/* Header */}
          <div className="rounded-xl px-3 py-3 mb-2 text-center" style={{ background: colors.headerGrad }}>
            <p className="text-sm font-extrabold text-white uppercase tracking-widest">Shop</p>
          </div>

          {/* All */}
          <button
            onClick={() => setActiveCat("All")}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition text-left",
              activeCat === "All"
                ? "border-primary bg-primary/20 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            <span>All Bundles</span>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{catCounts.All}</span>
          </button>

          {/* Shop categories (in-game tab names) */}
          {shopCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition text-left",
                activeCat === cat
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <span className="truncate">{cat}</span>
              {(catCounts[cat] ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground/60 tabular-nums flex-shrink-0">{catCounts[cat]}</span>
              )}
            </button>
          ))}

          {/* Admin controls */}
          {editMode && (
            <div className="pt-3 space-y-1.5 border-t border-border mt-2">
              <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-widest">Admin</p>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={onAddBundle}>
                <Plus className="h-3.5 w-3.5" /> New Bundle
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setShopCatDialogOpen(true)}>
                <Tag className="h-3.5 w-3.5" /> Shop Categories
              </Button>
              <button
                onClick={onSwitchToStandard}
                className="w-full text-[10px] text-muted-foreground/50 hover:text-primary transition text-center py-1"
              >
                ✏ Edit in Table View
              </button>
            </div>
          )}
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search bundles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filteredBundles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border border-dashed border-border text-muted-foreground">
              <Store className="h-10 w-10 opacity-20" />
              <p className="text-sm">
                {bundles.length === 0
                  ? "No bundles yet. Use Edit mode to add some."
                  : search
                  ? `No bundles matching "${search}".`
                  : `No bundles in "${activeCat}".`}
              </p>
            </div>
          )}

          {/* Bundle cards — one card per bundle */}
          <div className="flex flex-wrap gap-4">
            {filteredBundles.map(bundle => (
              <BundleShopCard
                key={bundle.id}
                bundle={bundle}
                lastPurchaseDates={lastPurchaseDates}
                basket={basket}
                onBuy={(colIdx) => addToBasket(bundle, colIdx)}
                onRemove={(item) => setRemoveConfirm(item)}
              />
            ))}
          </div>
        </div>

        {/* ── Right basket panel ── */}
        {basket.length > 0 && (
          <div className="w-64 flex-shrink-0 sticky top-4 self-start">
            <BasketPanel
              basket={basket}
              onRemove={item => setRemoveConfirm(item)}
              onSave={() => setSaveDialogOpen(true)}
            />
          </div>
        )}
      </div>
    </>
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

// ─── Per-icon Size Control ────────────────────────────────────────────────────

function IconSizeControl({ size, globalSize, onChange }: {
  size: number | undefined
  globalSize: number
  onChange: (size: number | undefined) => void
}) {
  const current = size ?? globalSize
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      <button
        onClick={() => onChange(Math.max(16, current - 8))}
        className="h-4 w-4 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition text-base leading-none"
      >−</button>
      <span className="text-[9px] text-white/40 w-7 text-center tabular-nums">{current}px</span>
      <button
        onClick={() => onChange(Math.min(128, current + 8))}
        className="h-4 w-4 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition text-base leading-none"
      >+</button>
      {size !== undefined && (
        <button onClick={() => onChange(undefined)} title="Reset to global size" className="text-[9px] text-white/25 hover:text-white/60 transition ml-0.5">↺</button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BundlesContent() {
  // FIX: Load from localStorage synchronously via lazy initializer → no useEffect race condition
  const [appState, setAppState] = useState<AppState>(() => loadState())
  const [editMode, setEditMode] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("tables")
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("standard")
  const [filterCategory, setFilterCategory] = useState("All")
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [lastPurchaseDates, setLastPurchaseDates] = useState<Record<string, string>>(() => loadLastPurchaseDates())
  const [iconSize, setIconSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('bundles-icon-size')) || 56 } catch { return 56 }
  })
  function changeIconSize(delta: number) {
    setIconSize(prev => {
      const next = Math.min(96, Math.max(24, prev + delta))
      try { localStorage.setItem('bundles-icon-size', String(next)) } catch { /* ignore */ }
      return next
    })
  }

  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true

  // Refs to control API sync behaviour
  const skipNextSyncRef = useRef(false)  // set when loading from API so we don't echo it back
  const isFirstMountRef = useRef(true)   // skip the very first useEffect run
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount: fetch bundle state from API (overrides localStorage cache)
  useEffect(() => {
    fetch('/api/bundles')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data === 'object' && 'bundles' in data) {
          const parsed = data as Partial<AppState>
          const loaded: AppState = {
            categories: parsed.categories ?? [...DEFAULT_CATEGORIES],
            shopCategories: parsed.shopCategories ?? [...DEFAULT_SHOP_CATEGORIES],
            bundles: (parsed.bundles ?? []).map(b => migrateBundle(b as Partial<Bundle>)),
          }
          skipNextSyncRef.current = true
          setAppState(loaded)
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded)) } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  // Save to localStorage whenever state changes (offline fallback)
  const isFirstRender = useRef(true)
  if (isFirstRender.current) {
    isFirstRender.current = false
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState))
    } catch { /* ignore */ }
  }

  // Debounced sync to API on admin state changes (useEffect keeps side-effects out of updaters)
  useEffect(() => {
    if (isFirstMountRef.current) { isFirstMountRef.current = false; return }
    if (skipNextSyncRef.current) { skipNextSyncRef.current = false; return }
    if (!isAdmin) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState),
      }).catch(() => {})
    }, 800)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [appState, isAdmin])

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
        id, name: "New Bundle", category: prev.categories[0] ?? "Daily",
        shopCategory: (prev.shopCategories ?? DEFAULT_SHOP_CATEGORIES)[0] ?? "Super-Value Bundle",
        refreshType: "daily", rollingDays: 30, monthlyDay: 1,
        columns: cols,
        rows: [{ id: "row1", icon: "/images/bundle/gem.png", label: "New Row", values: { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 }, rowType: "number", iconMode: "icon" as RowIconMode }],
      }]
    }))
  }
  function resetAll() {
    if (confirm("Reset all bundles to default (empty)? This cannot be undone.")) {
      setAppState(DEFAULT_STATE)
      setFilterCategory("All")
      setSearch("")
    }
  }

  const filteredBundles = (filterCategory === "All" ? appState.bundles : appState.bundles.filter(b => b.category === filterCategory))
    .filter(b => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <CategoryManageDialog open={catDialogOpen} categories={appState.categories} onUpdate={cats => setAppState(prev => ({ ...prev, categories: cats }))} onClose={() => setCatDialogOpen(false)} />

      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bundles</h2>
          <p className="text-sm text-muted-foreground">Track, compare and plan your bundle spending.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Layout mode toggle */}
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <ViewBtn active={layoutMode === "standard"} onClick={() => setLayoutMode("standard")} icon={LayoutList} label="Standard" />
            <ViewBtn active={layoutMode === "game"}     onClick={() => setLayoutMode("game")}     icon={Store}      label="Shop View" />
          </div>

          {/* Standard sub-views (hidden in game view) */}
          {layoutMode === "standard" && (
            <div className="flex gap-1 border border-border rounded-lg p-1">
              <ViewBtn active={viewMode === "tables"}  onClick={() => setViewMode("tables")}  icon={LayoutGrid}        label="Tables"  />
              <ViewBtn active={viewMode === "cards"}   onClick={() => setViewMode("cards")}   icon={LayoutGrid}        label="Cards"   />
              <ViewBtn active={viewMode === "compare"} onClick={() => setViewMode("compare")} icon={GitCompare}        label="Compare" />
              <ViewBtn active={viewMode === "plan"}    onClick={() => setViewMode("plan")}    icon={SlidersHorizontal} label="Plan"    />
            </div>
          )}

          {/* Icon size control — tables view */}
          {layoutMode === "standard" && viewMode === "tables" && (
            <div className="flex items-center gap-1.5 border border-border rounded-lg px-2 py-1">
              <button onClick={() => changeIconSize(-8)} disabled={iconSize <= 24} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition text-lg leading-none">−</button>
              <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">{iconSize}px</span>
              <button onClick={() => changeIconSize(8)} disabled={iconSize >= 96} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition text-lg leading-none">+</button>
            </div>
          )}

          {/* Edit mode button — admin only */}
          {isAdmin && (layoutMode === "standard" ? viewMode === "tables" : true) && (
            <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(e => !e)} className="gap-1.5">
              {editMode ? <><Check className="h-4 w-4" /> Done</> : <><Pencil className="h-4 w-4" /> Edit</>}
            </Button>
          )}

          {/* Standard edit toolbar — admin only */}
          {isAdmin && editMode && layoutMode === "standard" && viewMode === "tables" && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={addBundle}><Plus className="h-4 w-4" /> Add Bundle</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCatDialogOpen(true)}><Tag className="h-4 w-4" /> Categories</Button>
              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/60" onClick={resetAll}>Reset All</Button>
            </>
          )}
        </div>
      </div>

      {/* Search + category filter row — standard view only */}
      {layoutMode === "standard" && <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search bundles…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm w-52"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {(viewMode === "tables" || viewMode === "cards") && appState.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {["All", ...appState.categories].map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition", filterCategory === cat ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{cat}</button>
            ))}
          </div>
        )}
      </div>}

      {layoutMode === "standard" && viewMode === "tables" && (
        <div className="space-y-8">
          {filteredBundles.map(bundle => (
            <BundleTable key={bundle.id} bundle={bundle} editMode={isAdmin && editMode} categories={appState.categories} shopCategories={appState.shopCategories ?? DEFAULT_SHOP_CATEGORIES} lastPurchaseDates={lastPurchaseDates} iconSize={iconSize} onUpdate={updated => updateBundle(bundle.id, updated)} onDelete={() => deleteBundle(bundle.id)} />
          ))}
          {filteredBundles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-dashed border-border text-muted-foreground">
              <p className="text-sm">{appState.bundles.length === 0 ? "No bundles yet." : search ? `No bundles matching "${search}".` : `No bundles in "${filterCategory}".`}</p>
              {appState.bundles.length === 0 && <Button size="sm" onClick={() => { setEditMode(true); addBundle() }} className="gap-1.5"><Plus className="h-4 w-4" /> Add your first bundle</Button>}
            </div>
          )}
        </div>
      )}

      {layoutMode === "standard" && viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBundles.map(bundle => <BundleCard key={bundle.id} bundle={bundle} lastPurchaseDates={lastPurchaseDates} />)}
          {filteredBundles.length === 0 && <p className="col-span-full text-sm text-muted-foreground text-center py-16">{appState.bundles.length === 0 ? "No bundles yet. Switch to Tables view and add one." : `No bundles matching your filter.`}</p>}
        </div>
      )}

      {layoutMode === "standard" && viewMode === "compare" && <CompareView bundles={appState.bundles} categories={appState.categories} />}
      {layoutMode === "standard" && viewMode === "plan"    && <PlanView    bundles={appState.bundles} categories={appState.categories} />}

      {/* ── Game / Shop View ── */}
      {layoutMode === "game" && (
        <GameView
          bundles={appState.bundles}
          shopCategories={appState.shopCategories ?? DEFAULT_SHOP_CATEGORIES}
          lastPurchaseDates={lastPurchaseDates}
          editMode={isAdmin && editMode}
          onSwitchToStandard={() => { setLayoutMode("standard"); setViewMode("tables"); setEditMode(true) }}
          onAddBundle={() => { addBundle(); setLayoutMode("standard"); setViewMode("tables"); setEditMode(true) }}
          onUpdateShopCategories={cats => setAppState(prev => ({ ...prev, shopCategories: cats }))}
        />
      )}
    </div>
  )
}
