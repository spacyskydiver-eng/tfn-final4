"use client"

import React, { useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Plus, Trash2, ChevronDown, CalendarPlus, BarChart2, List, Calendar, X, Search, RefreshCw, AlertTriangle, BarChart, LineChart as LineChartIcon, AreaChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"
import {
  BarChart as RBarChart, Bar,
  LineChart as RLineChart, Line,
  AreaChart as RAreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  ReferenceLine,
} from "recharts"
import { TRACKER_KEY, todayUTC, refreshStatusLabel } from "@/components/bundles-content"
import type { Bundle } from "@/components/bundles-content"

// ─── Types ────────────────────────────────────────────────────────────────────

type RowType     = "number" | "days" | "currency"
type EntryStatus = "planned" | "purchased"

type TrackerItem = {
  label: string
  icon: string
  rowType: RowType
  total: number
}

type TrackerBundle = {
  bundleId: string
  bundleName: string
  category: string
  refreshType?: Bundle["refreshType"]
  rollingDays?: number
  spendQty?: Record<string, number>
  cost: number
  items: TrackerItem[]
}

type TrackerEntry = {
  id: string
  date: string            // YYYY-MM-DD UTC
  bundles: TrackerBundle[]
  currency: string
  totalCost: number
  status: EntryStatus
  notes: string
}

// Minimal bundle shape from bundles localStorage
type DbBundle = Pick<Bundle, "id" | "name" | "category" | "refreshType" | "rollingDays" | "monthlyDay" | "columns" | "rows">

// ─── Constants ────────────────────────────────────────────────────────────────

const BUNDLES_KEY   = "bundles-state-v3"
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" }
const PIE_COLORS = ["#8b5cf6", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#84cc16"]

// ─── Storage helpers ─────────────────────────────────────────────────────────

function loadEntries(): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(TRACKER_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveEntries(entries: TrackerEntry[]): void {
  try {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(entries))
  } catch { /* ignore */ }
}

function loadBundles(): DbBundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return (parsed.bundles ?? []) as DbBundle[]
  } catch { return [] }
}

// ─── Refresh helpers ──────────────────────────────────────────────────────────

// Check whether a bundle is "available" given existing tracker entries
function isBundleAvailable(bundle: DbBundle, entries: TrackerEntry[]): boolean {
  const rType = bundle.refreshType ?? "daily"
  if (rType === "none") return true

  const today = todayUTC()
  const purchased = entries.filter(
    e => e.status === "purchased" && e.bundles.some(b => b.bundleId === bundle.id)
  )
  if (purchased.length === 0) return true

  if (rType === "daily") {
    return !purchased.some(e => e.date === today)
  }
  if (rType === "monthly") {
    const day = bundle.monthlyDay ?? 1
    const now = new Date()
    const resetThisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    // available if no purchase on or after the most recent reset date
    return !purchased.some(e => e.date >= resetThisMonth)
  }
  if (rType === "rolling") {
    const days = bundle.rollingDays ?? 30
    const lastDate = purchased.map(e => e.date).sort().pop()!
    const last = new Date(lastDate + "T00:00:00Z")
    last.setUTCDate(last.getUTCDate() + days)
    return new Date() >= last
  }
  return true
}

function refreshWarningLabel(bundle: DbBundle, entries: TrackerEntry[]): string | null {
  const fakeBundle: Bundle = {
    id: bundle.id, name: bundle.name, category: bundle.category,
    refreshType: bundle.refreshType ?? "daily",
    rollingDays: bundle.rollingDays ?? 30,
    monthlyDay: bundle.monthlyDay ?? 1,
    columns: bundle.columns, rows: bundle.rows,
  }
  const today = todayUTC()
  const purchased = entries.filter(e => e.status === "purchased" && e.bundles.some(b => b.bundleId === bundle.id))
  if (purchased.length === 0) return null

  const lastPurchaseDates: Record<string, string> = {}
  if (purchased.length > 0) lastPurchaseDates[bundle.id] = purchased.map(e => e.date).sort().pop()!

  const status = refreshStatusLabel(fakeBundle, lastPurchaseDates)
  if (status.available) return null
  return status.label
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

// All months that have any entry (purchased or planned), plus all upcoming planned months
function getAllRelevantMonths(entries: TrackerEntry[]): string[] {
  const set = new Set<string>()
  // Always include last 12 months for continuity
  getLast12Months().forEach(m => set.add(m))
  entries.forEach(e => set.add(e.date.slice(0, 7)))
  const sorted = Array.from(set).sort()
  return sorted
}

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

function fmtRowType(value: number, rowType: RowType): string {
  if (rowType === "days")     return `${(value / 1440).toFixed(2)} Days`
  if (rowType === "currency") return `$${fmt(value)}`
  return fmt(value)
}

// ─── Add Entry Dialog ─────────────────────────────────────────────────────────

function AddEntryDialog({
  open, onClose, initialEntry,
}: {
  open: boolean
  onClose: (entry?: TrackerEntry) => void
  initialEntry?: TrackerEntry
}) {
  const [bundles, setBundles] = useState<DbBundle[]>([])
  const [entries, setEntries] = useState<TrackerEntry[]>([])

  // Load bundles + existing entries whenever dialog opens
  const prevOpen = React.useRef(false)
  if (open && !prevOpen.current) {
    setBundles(loadBundles())
    setEntries(loadEntries())
  }
  prevOpen.current = open

  const [date, setDate]         = useState(() => initialEntry?.date ?? todayUTC())
  const [status, setStatus]     = useState<EntryStatus>(initialEntry?.status ?? "planned")
  const [currency, setCurrency] = useState(initialEntry?.currency ?? "USD")
  const [notes, setNotes]       = useState(initialEntry?.notes ?? "")
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>(() => initialEntry?.bundles.map(b => b.bundleId) ?? [])
  const [customItems, setCustomItems] = useState<Array<{ id: string; label: string; cost: number }>>(() => [])
  const [bundleSearch, setBundleSearch] = useState("")

  // Per-bundle, per-column spend quantity
  const [spendQty, setSpendQty] = useState<Record<string, Record<string, number>>>(() => {
    if (!initialEntry) return {}
    const map: Record<string, Record<string, number>> = {}
    initialEntry.bundles.forEach(b => { if (b.spendQty) map[b.bundleId] = b.spendQty })
    return map
  })

  function getQty(bundleId: string, colId: string, maxPurchase: number) {
    return spendQty[bundleId]?.[colId] ?? maxPurchase
  }
  function setQty(bundleId: string, colId: string, qty: number, maxPurchase: number) {
    setSpendQty(prev => ({ ...prev, [bundleId]: { ...(prev[bundleId] ?? {}), [colId]: Math.max(0, Math.min(maxPurchase, qty)) } }))
  }

  function toggleBundle(id: string) {
    setSelectedBundleIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      return [...prev, id]
    })
  }

  const sym = CURRENCY_SYMBOLS[currency] ?? "$"

  const selectedBundles = bundles.filter(b => selectedBundleIds.includes(b.id))

  const totalCost =
    selectedBundles.reduce((acc, b) => acc + b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0), 0) +
    customItems.reduce((s, i) => s + i.cost, 0)

  function handleSave() {
    const entry: TrackerEntry = {
      id: initialEntry?.id ?? `entry_${Date.now()}`,
      date, status, currency, notes,
      bundles: selectedBundles.map(b => ({
        bundleId: b.id,
        bundleName: b.name,
        category: b.category,
        refreshType: b.refreshType,
        rollingDays: b.rollingDays,
        spendQty: spendQty[b.id],
        cost: b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0),
        items: b.rows.map(row => ({
          label: row.label, icon: row.icon, rowType: row.rowType,
          total: b.columns.reduce((acc, col) => {
            const qty = getQty(b.id, col.id, col.maxPurchase)
            return acc + (row.values[col.id] ?? 0) * qty
          }, 0),
        })).filter(i => i.total > 0),
      })),
      totalCost,
    }
    onClose(entry)
  }

  const filteredBundles = bundles.filter(b => !bundleSearch.trim() || b.name.toLowerCase().includes(bundleSearch.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialEntry ? "Edit Entry" : "Add Spending Entry"}</DialogTitle>
        </DialogHeader>

        {/* Date / Status / Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Date (UTC)</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Status</label>
            <Select value={status} onValueChange={v => setStatus(v as EntryStatus)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">🕒 Planned</SelectItem>
                <SelectItem value="purchased">✅ Purchased</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Currency</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_SYMBOLS).map(([c, s]) => <SelectItem key={c} value={c}>{c} ({s})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bundle selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-muted-foreground font-medium">Bundles</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search…" value={bundleSearch} onChange={e => setBundleSearch(e.target.value)} className="pl-6 h-7 text-xs w-44" />
            </div>
          </div>
          {bundles.length === 0 && (
            <p className="text-xs text-muted-foreground py-3 text-center">No bundles found. Add bundles in the Bundles page first.</p>
          )}
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-lg border border-border bg-muted/20">
            {filteredBundles.map(b => {
              const warning = isBundleAvailable(b, entries) ? null : refreshWarningLabel(b, entries)
              const isSelected = selectedBundleIds.includes(b.id)
              return (
                <button
                  key={b.id}
                  onClick={() => toggleBundle(b.id)}
                  title={warning ?? undefined}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition",
                    isSelected ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    warning && !isSelected && "border-orange-500/40 text-orange-300 bg-orange-500/5"
                  )}
                >
                  {warning && <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0" />}
                  {b.refreshType && b.refreshType !== "none" && !warning && <RefreshCw className="h-3 w-3 opacity-40 flex-shrink-0" />}
                  {b.name}
                  {b.category && <span className="text-[10px] text-muted-foreground/70 ml-0.5">({b.category})</span>}
                </button>
              )
            })}
            {filteredBundles.length === 0 && bundles.length > 0 && (
              <p className="text-xs text-muted-foreground w-full text-center py-2">No bundles match.</p>
            )}
          </div>
        </div>

        {/* Per-bundle quantity controls */}
        {selectedBundles.length > 0 && (
          <div className="space-y-3">
            {selectedBundles.map(b => {
              const warning = isBundleAvailable(b, entries) ? null : refreshWarningLabel(b, entries)
              const bTotal = b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0)
              return (
                <div key={b.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-semibold text-sm truncate">{b.name}</span>
                      {b.category && <Badge variant="outline" className="text-[10px] h-5 py-0 px-2">{b.category}</Badge>}
                      {warning && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-orange-500/15 border-orange-500/30 text-orange-300 font-medium">
                          <AlertTriangle className="h-2.5 w-2.5" /> {warning}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-sm flex-shrink-0 tabular-nums">{sym}{bTotal}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {b.columns.map((col, idx) => {
                      const qty = getQty(b.id, col.id, col.maxPurchase)
                      const colSpend = col.price * qty
                      return (
                        <div key={col.id} className={cn("flex items-center gap-3 px-3 py-2", idx % 2 === 0 ? "bg-muted/10" : "bg-muted/5")}>
                          <Image src={col.icon} alt={col.name} width={28} height={28} className="h-7 w-7 object-contain flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-tight truncate">{col.name}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{sym}{col.price} each · max {col.maxPurchase}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => setQty(b.id, col.id, qty - 1, col.maxPurchase)} disabled={qty === 0} className="h-7 w-7 rounded-md bg-muted/60 hover:bg-muted active:bg-muted/40 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold text-base leading-none select-none transition-colors">−</button>
                            <span className="text-sm font-bold w-5 text-center tabular-nums select-none">{qty}</span>
                            <button onClick={() => setQty(b.id, col.id, qty + 1, col.maxPurchase)} disabled={qty >= col.maxPurchase} className="h-7 w-7 rounded-md bg-muted/60 hover:bg-muted active:bg-muted/40 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold text-base leading-none select-none transition-colors">+</button>
                          </div>
                          <span className="text-sm font-semibold text-primary/90 w-14 text-right tabular-nums flex-shrink-0">{sym}{colSpend}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Custom cost items */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium">Custom Items (optional)</label>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setCustomItems(prev => [...prev, { id: `ci_${Date.now()}`, label: "", cost: 0 }])}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
          {customItems.map(item => (
            <div key={item.id} className="flex gap-2 items-center">
              <Input placeholder="Label..." value={item.label} onChange={e => setCustomItems(prev => prev.map(i => i.id === item.id ? { ...i, label: e.target.value } : i))} className="h-8 flex-1 text-sm" />
              <Input type="number" placeholder="Cost..." value={item.cost || ""} onChange={e => setCustomItems(prev => prev.map(i => i.id === item.id ? { ...i, cost: Number(e.target.value) || 0 } : i))} className="h-8 w-24 text-sm" />
              <button onClick={() => setCustomItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-400/60 hover:text-red-400 transition"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Notes (optional)</label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this spending..." className="h-9" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
          <div className="text-sm font-bold tabular-nums">Total: {sym}{fmt(totalCost)}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onClose()}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={selectedBundleIds.length === 0 && customItems.length === 0} className="gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" /> {initialEntry ? "Save Changes" : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry, onDelete, onEdit,
}: {
  entry: TrackerEntry
  onDelete: () => void
  onEdit: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sym = CURRENCY_SYMBOLS[entry.currency] ?? "$"
  const isPurchased = entry.status === "purchased"

  // Aggregate items across all bundles
  const aggregated = useMemo(() => {
    const map = new Map<string, TrackerItem>()
    entry.bundles.forEach(b => {
      b.items.forEach(item => {
        const ex = map.get(item.label)
        if (ex) map.set(item.label, { ...ex, total: ex.total + item.total })
        else map.set(item.label, { ...item })
      })
    })
    return Array.from(map.values())
  }, [entry])

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-colors",
      isPurchased ? "border-green-500/25 bg-green-950/10" : "border-orange-500/20 bg-orange-950/5"
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground transition flex-shrink-0">
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {entry.bundles.length === 0 ? "Custom entry" : entry.bundles.map(b => b.bundleName).join(", ")}
            </span>
            <Badge variant="outline" className={cn("text-[10px] h-5 py-0 px-2", isPurchased ? "text-green-400 border-green-400/30" : "text-orange-400 border-orange-400/30")}>
              {isPurchased ? "✓ Purchased" : "🕒 Planned"}
            </Badge>
            <span className="text-xs text-muted-foreground">{entry.date}</span>
            {entry.notes && <span className="text-xs text-muted-foreground/70 italic truncate max-w-[200px]">{entry.notes}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm tabular-nums">{sym}{fmt(entry.totalCost)}</span>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground transition text-xs border border-border rounded px-1.5 py-0.5 hover:border-primary/40">Edit</button>
          <button onClick={onDelete} className="text-red-400/60 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-border/50 space-y-2">
          {entry.bundles.map(b => (
            <div key={b.bundleId} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-semibold text-muted-foreground">{b.bundleName}</p>
                {b.category && <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5">{b.category}</Badge>}
                {b.refreshType && b.refreshType !== "none" && (
                  <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 text-blue-400/70 border-blue-400/20 gap-1">
                    <RefreshCw className="h-2.5 w-2.5" />
                    {b.refreshType === "rolling" ? `Every ${b.rollingDays ?? 30}d` : b.refreshType}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground/60 ml-auto">{sym}{fmt(b.cost)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {b.items.map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 bg-muted/30 border border-border rounded-lg px-2 py-1">
                    <Image src={item.icon} alt={item.label} width={20} height={20} className="h-5 w-5 object-contain flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-semibold tabular-nums">{fmtRowType(item.total, item.rowType)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {aggregated.length > 0 && entry.bundles.length > 1 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Combined Items</p>
                <div className="flex flex-wrap gap-2">
                  {aggregated.map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
                      <Image src={item.icon} alt={item.label} width={20} height={20} className="h-5 w-5 object-contain flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-semibold tabular-nums">{fmtRowType(item.total, item.rowType)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Timeline View ─────────────────────────────────────────────────────────────

function TimelineView({
  entries, onDelete, onEdit, search,
}: {
  entries: TrackerEntry[]
  onDelete: (id: string) => void
  onEdit: (entry: TrackerEntry) => void
  search: string
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e =>
      e.bundles.some(b => b.bundleName.toLowerCase().includes(q)) ||
      e.date.includes(q) ||
      (e.notes ?? "").toLowerCase().includes(q)
    )
  }, [entries, search])

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered])

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <p className="text-muted-foreground text-sm">{search ? `No entries matching "${search}".` : "No entries yet."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map(entry => (
        <EntryCard key={entry.id} entry={entry} onDelete={() => onDelete(entry.id)} onEdit={() => onEdit(entry)} />
      ))}
    </div>
  )
}

// ─── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ entries, onDelete, onEdit }: {
  entries: TrackerEntry[]
  onDelete: (id: string) => void
  onEdit: (entry: TrackerEntry) => void
}) {
  const now = new Date()
  const [year, setYear]   = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth()) // 0-based

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`
  const firstDOW = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const entryByDay = useMemo(() => {
    const map = new Map<string, TrackerEntry[]>()
    entries.forEach(e => {
      if (!e.date.startsWith(monthStr)) return
      const d = e.date.slice(8) // day part DD
      const arr = map.get(d) ?? []; arr.push(e); map.set(d, arr)
    })
    return map
  }, [entries, monthStr])

  const today = todayUTC()
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const selectedEntries = selectedDay ? (entryByDay.get(selectedDay.padStart(2, "0")) ?? []) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground transition px-2 py-1 rounded border border-border hover:border-primary/40">← Prev</button>
        <span className="font-semibold text-foreground">{monthNames[month]} {year}</span>
        <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground transition px-2 py-1 rounded border border-border hover:border-primary/40">Next →</button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-center text-[11px] text-muted-foreground py-1 font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDOW }, (_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = String(i + 1).padStart(2, "0")
          const fullDate = `${monthStr}-${day}`
          const dayEntries = entryByDay.get(day) ?? []
          const isToday = fullDate === today
          const hasPurchased = dayEntries.some(e => e.status === "purchased")
          const hasPlanned   = dayEntries.some(e => e.status === "planned")
          const isSelected   = selectedDay === day
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(prev => prev === day ? null : day)}
              className={cn(
                "rounded-lg border p-1.5 text-xs transition-colors min-h-[52px] flex flex-col items-center gap-1",
                isToday && "border-primary/60 bg-primary/10",
                isSelected && "ring-2 ring-primary/50",
                !isToday && !isSelected && "border-border hover:border-primary/30 bg-muted/10 hover:bg-muted/20",
                dayEntries.length > 0 && "border-primary/30"
              )}
            >
              <span className={cn("font-semibold", isToday ? "text-primary" : "text-foreground/80")}>{i + 1}</span>
              <div className="flex gap-1 flex-wrap justify-center">
                {hasPurchased && <div className="h-1.5 w-1.5 rounded-full bg-green-400" title="Purchased" />}
                {hasPlanned   && <div className="h-1.5 w-1.5 rounded-full bg-orange-400" title="Planned" />}
              </div>
              {dayEntries.length > 0 && <span className="text-[9px] text-muted-foreground">{dayEntries.length} entr{dayEntries.length !== 1 ? "ies" : "y"}</span>}
            </button>
          )
        })}
      </div>

      {selectedDay && selectedEntries.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">{monthNames[month]} {parseInt(selectedDay, 10)}, {year}</p>
          {selectedEntries.map(entry => (
            <EntryCard key={entry.id} entry={entry} onDelete={() => onDelete(entry.id)} onEdit={() => onEdit(entry)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stats View ─────────────────────────────────────────────────────────────

type ChartType      = "bar" | "line" | "cumulative"
type TimeGranularity = "day" | "week" | "month"

/** "2026-03-09" → "Mar 9" */
function fmtDayLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

/** Returns "YYYY-MM-DD" of the Monday of the week that contains dateStr */
function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  const dow = d.getUTCDay()           // 0 = Sun, 1 = Mon … 6 = Sat
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function StatsView({ entries }: { entries: TrackerEntry[] }) {
  const { currentColor } = useTheme()
  const hue = currentColor.hue
  const s   = currentColor.saturation
  const l   = currentColor.lightness
  const colorPurchased = `hsl(${hue},${s}%,${l}%)`
  const colorPlanned   = `hsl(${hue},${s}%,${l + 18}%)`

  const [chartType, setChartType]       = useState<ChartType>("bar")
  const [showPlanned, setShowPlanned]   = useState(true)
  const [granularity, setGranularity]   = useState<TimeGranularity>("month")

  const purchased = entries.filter(e => e.status === "purchased")
  const planned   = entries.filter(e => e.status === "planned")
  const totalSpent    = purchased.reduce((s, e) => s + e.totalCost, 0)
  const avgPerEntry   = purchased.length > 0 ? totalSpent / purchased.length : 0
  const plannedTotal  = planned.reduce((s, e) => s + e.totalCost, 0)

  const todayStr   = new Date().toISOString().slice(0, 10)   // "2026-03-09"
  const todayMonth = todayStr.slice(0, 7)                    // "2026-03"
  const todayWeek  = weekStartOf(todayStr)                   // Monday of current week

  // Unified chart data: one bucket per day / week / month
  const chartData = useMemo(() => {
    const allDates = [...purchased, ...planned].map(e => e.date).sort()
    const now      = new Date(todayStr + "T00:00:00Z")

    if (granularity === "month") {
      const months = getAllRelevantMonths(entries)
      return months.map(m => ({
        label:     m.slice(5) + "/" + m.slice(2, 4),
        key:       m,
        purchased: purchased.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.totalCost, 0),
        planned:   planned.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.totalCost, 0),
        isToday:   m === todayMonth,
      }))
    }

    // Helper: build a clamped date range
    const rangeStart = (backMs: number) =>
      allDates.length > 0
        ? new Date(Math.min(now.getTime() - backMs, new Date(allDates[0] + "T00:00:00Z").getTime()))
        : new Date(now.getTime() - backMs)
    const rangeEnd = (aheadMs: number) =>
      allDates.length > 0
        ? new Date(Math.max(now.getTime() + aheadMs, new Date(allDates[allDates.length - 1] + "T00:00:00Z").getTime()))
        : new Date(now.getTime() + aheadMs)

    if (granularity === "week") {
      const start = weekStartOf(rangeStart(12 * 7 * 86400000).toISOString().slice(0, 10))
      const end   = weekStartOf(rangeEnd(16 * 7 * 86400000).toISOString().slice(0, 10))
      const weeks: string[] = []
      const cur = new Date(start + "T00:00:00Z")
      const last = new Date(end + "T00:00:00Z")
      while (cur <= last) {
        weeks.push(cur.toISOString().slice(0, 10))
        cur.setUTCDate(cur.getUTCDate() + 7)
      }
      return weeks.map(w => {
        const wEnd = new Date(new Date(w + "T00:00:00Z").getTime() + 6 * 86400000).toISOString().slice(0, 10)
        return {
          label:     fmtDayLabel(w),
          key:       w,
          purchased: purchased.filter(e => e.date >= w && e.date <= wEnd).reduce((s, e) => s + e.totalCost, 0),
          planned:   planned.filter(e => e.date >= w && e.date <= wEnd).reduce((s, e) => s + e.totalCost, 0),
          isToday:   w === todayWeek,
        }
      })
    }

    // day — 30 days back to 90 days ahead (extended to cover all real entries)
    const startDay = rangeStart(30 * 86400000)
    const endDay   = rangeEnd(90 * 86400000)
    const days: string[] = []
    const cur = new Date(startDay)
    cur.setUTCHours(0, 0, 0, 0)
    while (cur <= endDay) {
      days.push(cur.toISOString().slice(0, 10))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return days.map(d => ({
      label:     fmtDayLabel(d),
      key:       d,
      purchased: purchased.filter(e => e.date === d).reduce((s, e) => s + e.totalCost, 0),
      planned:   planned.filter(e => e.date === d).reduce((s, e) => s + e.totalCost, 0),
      isToday:   d === todayStr,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, purchased, planned, granularity, todayStr])

  // Per-bundle spending breakdown (pie chart)
  const bundleSpend = useMemo(() => {
    const map = new Map<string, number>()
    purchased.forEach(e => {
      e.bundles.forEach(b => {
        map.set(b.bundleName, (map.get(b.bundleName) ?? 0) + b.cost)
      })
    })
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [purchased])

  // Resource totals aggregated
  const resourceTotals = useMemo(() => {
    const map = new Map<string, TrackerItem>()
    purchased.forEach(e => {
      e.bundles.forEach(b => {
        b.items.forEach(item => {
          const ex = map.get(item.label)
          if (ex) map.set(item.label, { ...ex, total: ex.total + item.total })
          else map.set(item.label, { ...item })
        })
      })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [purchased])

  // Upcoming planned bundles
  const upcoming = useMemo(() =>
    [...planned].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
  , [planned])

  // Cumulative running total — derived from the same chartData buckets
  const cumulativeData = useMemo(() => {
    let runP = 0, runPl = 0
    return chartData.map(d => {
      runP  += d.purchased
      runPl += d.planned
      return { ...d, cumPurchased: runP, cumPlanned: runPl }
    })
  }, [chartData])

  // Axis spacing adapts to bucket count
  const count     = chartData.length
  const xInterval = count <= 14 ? 0 : count <= 30 ? 1 : count <= 60 ? 2 : Math.ceil(count / 25)
  const xAngle    = count > 8 ? -40 : 0
  const xAnchor   = count > 8 ? ("end" as const) : ("middle" as const)
  const xHeight   = count > 8 ? 56 : 24
  const CHART_HEIGHT = 300
  const MARGIN       = { top: 8, right: 20, left: 4, bottom: 8 }

  const todayLabel = chartData.find(d => d.isToday)?.label

  // Helper: shared axis + grid props (inlined into each chart — NOT in a Fragment,
  // because recharts' child traversal doesn't descend into React Fragments)
  const tsFmt = (v: number, name: string) =>
    [`$${fmt(v)}`, name === "purchased" ? "Purchased" : name === "planned" ? "Planned" :
     name === "cumPurchased" ? "Running Total (Purchased)" : "Running Total (Planned)"] as [string, string]
  const tooltipProps = {
    contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 },
    labelStyle:   { color: "hsl(var(--foreground))", fontWeight: 600 },
    formatter: tsFmt,
  }

  function renderChart() {
    if (chartType === "line") {
      return (
        <RLineChart data={chartData} margin={MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={xInterval} angle={xAngle} textAnchor={xAnchor} height={xHeight} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${v}`} width={56} />
          {todayLabel && <ReferenceLine x={todayLabel} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }} />}
          <Tooltip {...tooltipProps} />
          <Line type="monotone" dataKey="purchased" stroke={colorPurchased} strokeWidth={2} dot={count <= 60 ? { r: 3, fill: colorPurchased } : false} activeDot={{ r: 5 }} name="purchased" />
          {showPlanned && <Line type="monotone" dataKey="planned" stroke={colorPlanned} strokeWidth={2} strokeDasharray="5 3" dot={count <= 60 ? { r: 3, fill: colorPlanned } : false} activeDot={{ r: 5 }} name="planned" />}
        </RLineChart>
      )
    }
    if (chartType === "cumulative") {
      return (
        <RAreaChart data={cumulativeData} margin={MARGIN}>
          <defs>
            <linearGradient id="gradCumP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colorPurchased} stopOpacity={0.4} />
              <stop offset="95%" stopColor={colorPurchased} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="gradCumPl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colorPlanned} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colorPlanned} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={xInterval} angle={xAngle} textAnchor={xAnchor} height={xHeight} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${v}`} width={56} />
          {todayLabel && <ReferenceLine x={todayLabel} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }} />}
          <Tooltip {...tooltipProps} />
          <Area type="monotone" dataKey="cumPurchased" stroke={colorPurchased} fill="url(#gradCumP)"  strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="cumPurchased" />
          {showPlanned && <Area type="monotone" dataKey="cumPlanned" stroke={colorPlanned} fill="url(#gradCumPl)" strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 5 }} name="cumPlanned" />}
        </RAreaChart>
      )
    }
    // bar (default)
    return (
      <RBarChart data={chartData} barCategoryGap="28%" margin={MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={xInterval} angle={xAngle} textAnchor={xAnchor} height={xHeight} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${v}`} width={56} />
        {todayLabel && <ReferenceLine x={todayLabel} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }} />}
        <Tooltip {...tooltipProps} />
        <Bar dataKey="purchased" fill={colorPurchased} radius={[4, 4, 0, 0]} name="purchased" />
        {showPlanned && <Bar dataKey="planned" fill={colorPlanned} radius={[4, 4, 0, 0]} name="planned" opacity={0.7} />}
      </RBarChart>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Spent",      value: `$${fmt(totalSpent)}`,               sub: `${purchased.length} purchased entr${purchased.length !== 1 ? "ies" : "y"}` },
          { label: "Avg / Entry",      value: `$${fmt(Math.round(avgPerEntry))}`,   sub: "purchased entries" },
          { label: "Planned Spend",    value: `$${fmt(plannedTotal)}`,              sub: `${planned.length} planned entr${planned.length !== 1 ? "ies" : "y"}` },
          { label: "All-time Entries", value: entries.length.toString(),            sub: "total log entries" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{kpi.label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Spending chart with controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Spending —{" "}
              {granularity === "month" ? "by Month" : granularity === "week" ? "by Week" : "by Day"}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {granularity === "day" ? "Past 30 days + next 90 days" :
               granularity === "week" ? "Past 12 weeks + next 16 weeks" :
               "All recorded months"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">

            {/* Granularity switcher */}
            <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-background/40">
              {(["day", "week", "month"] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition capitalize",
                    granularity === g
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Chart type switcher */}
            <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-background/40">
              {([
                { type: "bar",        Icon: BarChart,      title: "Bar" },
                { type: "line",       Icon: LineChartIcon, title: "Line" },
                { type: "cumulative", Icon: AreaChart,     title: "Total" },
              ] as const).map(({ type, Icon, title }) => (
                <button
                  key={type}
                  title={title}
                  onClick={() => setChartType(type)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition",
                    chartType === type
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{title}</span>
                </button>
              ))}
            </div>

            {/* Planned toggle */}
            <button
              onClick={() => setShowPlanned(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition",
                showPlanned
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: colorPlanned }} />
              {showPlanned ? "Planned shown" : "Show planned"}
            </button>

          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded" style={{ background: colorPurchased }} />
            {chartType === "cumulative" ? "Running total (purchased)" : "Purchased"}
          </span>
          {showPlanned && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-5 rounded opacity-70" style={{ background: colorPlanned }} />
              {chartType === "cumulative" ? "Running total (planned)" : "Planned"}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 border-t-2 border-primary border-dashed" />
            Current month
          </span>
        </div>

        {/* Chart container — always fills the card width */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bundle pie chart */}
      {bundleSpend.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Spending by Bundle</h3>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={bundleSpend} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {bundleSpend.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
                <Tooltip formatter={(v: number) => [`$${fmt(v)}`, "Spent"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Resource totals */}
      {resourceTotals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Total Resources Acquired</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {resourceTotals.map(item => (
              <div key={item.label} className="rounded-xl border border-border bg-muted/20 flex flex-col items-center gap-1.5 px-3 py-3 text-center">
                <Image src={item.icon} alt={item.label} width={48} height={48} className="h-12 w-12 object-contain" />
                <span className="text-[11px] text-muted-foreground leading-tight">{item.label}</span>
                <span className="text-sm font-bold tabular-nums">{fmtRowType(item.total, item.rowType)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming planned */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Upcoming Planned ({upcoming.length})</h3>
          <div className="space-y-2">
            {upcoming.map(entry => {
              const sym = CURRENCY_SYMBOLS[entry.currency] ?? "$"
              const daysAway = Math.ceil((new Date(entry.date + "T00:00:00Z").getTime() - Date.now()) / 86_400_000)
              return (
                <div key={entry.id} className="rounded-lg border border-orange-500/20 bg-orange-950/10 flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-sm font-medium truncate">{entry.bundles.map(b => b.bundleName).join(", ") || "Custom"}</span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                    {daysAway === 0  && <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 text-emerald-400 border-emerald-500/30">Today</Badge>}
                    {daysAway === 1  && <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 text-amber-400 border-amber-500/30">Tomorrow</Badge>}
                    {daysAway > 1   && <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 text-orange-400 border-orange-500/30">In {daysAway}d</Badge>}
                    {daysAway < 0   && <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 text-muted-foreground border-border">Overdue</Badge>}
                    {entry.notes && <span className="text-xs italic text-muted-foreground/70 truncate">{entry.notes}</span>}
                  </div>
                  <span className="font-bold text-sm flex-shrink-0 tabular-nums">{sym}{fmt(entry.totalCost)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-10">No data yet. Add spending entries to see stats.</p>
      )}
    </div>
  )
}

// ─── View Toggle ─────────────────────────────────────────────────────────────

function ViewBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button onClick={onClick} title={label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition", active ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export function SpendingTrackerContent() {
  const [entries, setEntries] = useState<TrackerEntry[]>(() => loadEntries())
  const [viewMode, setViewMode] = useState<"timeline" | "calendar" | "stats">("timeline")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TrackerEntry | undefined>()
  const [search, setSearch] = useState("")

  function handleDialogClose(entry?: TrackerEntry) {
    if (entry) {
      setEntries(prev => {
        const idx = prev.findIndex(e => e.id === entry.id)
        const next = idx !== -1 ? prev.map(e => e.id === entry.id ? entry : e) : [entry, ...prev]
        saveEntries(next)
        return next
      })
    }
    setDialogOpen(false)
    setEditingEntry(undefined)
  }

  function handleDelete(id: string) {
    setEntries(prev => { const next = prev.filter(e => e.id !== id); saveEntries(next); return next })
  }

  function handleEdit(entry: TrackerEntry) {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5">
      <AddEntryDialog open={dialogOpen} onClose={handleDialogClose} initialEntry={editingEntry} />

      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Spending Tracker</h2>
          <p className="text-sm text-muted-foreground">Log and analyze your bundle spending history.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <ViewBtn active={viewMode === "timeline"} onClick={() => setViewMode("timeline")} icon={List}     label="Timeline" />
            <ViewBtn active={viewMode === "calendar"} onClick={() => setViewMode("calendar")} icon={Calendar} label="Calendar" />
            <ViewBtn active={viewMode === "stats"}    onClick={() => setViewMode("stats")}    icon={BarChart2} label="Stats"    />
          </div>
          <Button size="sm" onClick={() => { setEditingEntry(undefined); setDialogOpen(true) }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Search bar (not shown in Stats since stats uses all entries) */}
      {viewMode !== "stats" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search entries…"
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
      )}

      {viewMode === "timeline" && <TimelineView entries={entries} onDelete={handleDelete} onEdit={handleEdit} search={search} />}
      {viewMode === "calendar" && <CalendarView entries={entries} onDelete={handleDelete} onEdit={handleEdit} />}
      {viewMode === "stats"    && <StatsView    entries={entries} />}
    </div>
  )
}
