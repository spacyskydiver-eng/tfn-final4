"use client"

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Plus, Trash2, Pencil, Check, ChevronLeft, ChevronRight,
  CalendarDays, BarChart3, Clock, LayoutList, TrendingUp, X,
  Receipt, Bell, Download,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"

// ─── Types ────────────────────────────────────────────────────────────────────

type RowType = "number" | "days" | "currency"
type EntryStatus = "planned" | "purchased"
type ViewMode = "timeline" | "calendar" | "stats"

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
  spendQty: Record<string, number>
  cost: number
  items: TrackerItem[]
}

export type TrackerEntry = {
  id: string
  date: string         // YYYY-MM-DD
  bundles: TrackerBundle[]
  currency: string
  totalCost: number
  status: EntryStatus
  notes: string
}

// Minimal bundle types for reading from DB
type DbCol  = { id: string; icon: string; name: string; price: number; maxPurchase: number }
type DbRow  = { id: string; icon: string; label: string; values: Record<string, number>; rowType: RowType }
type DbBundle = { id: string; name: string; category: string; columns: DbCol[]; rows: DbRow[] }

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRACKER_KEY = "spending-tracker-v1"
const BUNDLES_KEY = "bundles-state-v3"
const CURRENCIES: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" }

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const PIE_COLORS = ["#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#6366f1","#14b8a6"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toLocaleString("en-US") }

function fmtAmt(n: number, currency: string): string {
  const sym = CURRENCIES[currency] ?? "$"
  if (n < 0.01) return `${sym}0`
  return `${sym}${n.toFixed(2)}`
}

function fmtRaw(raw: number, rowType: RowType): string {
  if (rowType === "days") return `${(raw / 1440).toFixed(2)} Days`
  if (rowType === "currency") return `$${fmt(raw)}`
  return fmt(raw)
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

function getYearMonth(dateStr: string): string { return dateStr.slice(0, 7) }

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function loadDbBundles(): DbBundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return Array.isArray(p?.bundles) ? p.bundles : []
    }
  } catch { /* ignore */ }
  return []
}

function loadEntries(): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(TRACKER_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch { /* ignore */ }
  return []
}

function saveEntries(entries: TrackerEntry[]): void {
  try { localStorage.setItem(TRACKER_KEY, JSON.stringify(entries)) } catch { /* ignore */ }
}

function getLast12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

// ─── Add / Edit Entry Dialog ──────────────────────────────────────────────────

function AddEntryDialog({
  open, initial, onSave, onClose,
}: {
  open: boolean
  initial?: TrackerEntry
  onSave: (entry: TrackerEntry) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(initial?.date ?? todayStr())
  const [status, setStatus] = useState<EntryStatus>(initial?.status ?? "planned")
  const [currency, setCurrency] = useState(initial?.currency ?? "USD")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [dbBundles, setDbBundles] = useState<DbBundle[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.bundles.map(b => b.bundleId) ?? [])
  const [bundleQty, setBundleQty] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {}
    initial?.bundles.forEach(b => { init[b.bundleId] = { ...b.spendQty } })
    return init
  })
  const [customItems, setCustomItems] = useState<{ id: string; name: string; cost: number }[]>([])
  const [customName, setCustomName] = useState("")
  const [customCost, setCustomCost] = useState("")

  useEffect(() => {
    if (open) setDbBundles(loadDbBundles())
  }, [open])

  // Init qty when a bundle is newly selected
  useEffect(() => {
    setBundleQty(prev => {
      const next = { ...prev }
      selectedIds.forEach(id => {
        if (!next[id]) {
          const b = dbBundles.find(b => b.id === id)
          if (b) next[id] = Object.fromEntries(b.columns.map(c => [c.id, c.maxPurchase]))
        }
      })
      return next
    })
  }, [selectedIds, dbBundles])

  function getQty(bundleId: string, colId: string, max: number): number {
    return bundleQty[bundleId]?.[colId] ?? max
  }
  function setQty(bundleId: string, colId: string, qty: number, max: number) {
    setBundleQty(prev => ({ ...prev, [bundleId]: { ...(prev[bundleId] ?? {}), [colId]: Math.max(0, Math.min(max, qty)) } }))
  }

  function bundleCost(b: DbBundle): number {
    return b.columns.reduce((s, c) => s + c.price * getQty(b.id, c.id, c.maxPurchase), 0)
  }

  const selectedDbBundles = dbBundles.filter(b => selectedIds.includes(b.id))
  const totalFromDb = selectedDbBundles.reduce((t, b) => t + bundleCost(b), 0)
  const totalFromCustom = customItems.reduce((s, i) => s + i.cost, 0)
  const totalCost = totalFromDb + totalFromCustom
  const sym = CURRENCIES[currency] ?? "$"

  function addCustomItem() {
    const name = customName.trim()
    const cost = parseFloat(customCost)
    if (!name || isNaN(cost) || cost < 0) return
    setCustomItems(prev => [...prev, { id: `ci_${Date.now()}`, name, cost }])
    setCustomName(""); setCustomCost("")
  }

  function handleSave() {
    const trackerBundles: TrackerBundle[] = selectedDbBundles.map(b => ({
      bundleId: b.id,
      bundleName: b.name,
      category: b.category,
      spendQty: bundleQty[b.id] ?? {},
      cost: bundleCost(b),
      items: b.rows.map(row => ({
        label: row.label,
        icon: row.icon,
        rowType: row.rowType,
        total: b.columns.reduce((acc, col) => acc + (row.values[col.id] ?? 0) * getQty(b.id, col.id, col.maxPurchase), 0),
      })).filter(i => i.total > 0),
    }))
    customItems.forEach(ci => {
      trackerBundles.push({ bundleId: `custom_${ci.id}`, bundleName: ci.name, category: "", spendQty: {}, cost: ci.cost, items: [] })
    })
    onSave({
      id: initial?.id ?? `entry_${Date.now()}`,
      date, bundles: trackerBundles, currency, totalCost, status, notes,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Entry" : "Add Spending Entry"}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as EntryStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">🕒 Planned</SelectItem>
                  <SelectItem value="purchased">✅ Purchased</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bundle Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Select Bundles</label>
            {dbBundles.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
                No bundles in database. Add bundles in the Bundles → Tables view first.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-border p-2">
                {dbBundles.map(b => {
                  const isSelected = selectedIds.includes(b.id)
                  const cost = bundleCost(b)
                  return (
                    <div key={b.id} className="rounded-lg border border-border overflow-hidden">
                      <div
                        className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer transition", isSelected ? "bg-primary/10" : "bg-muted/20 hover:bg-muted/40")}
                        onClick={() => setSelectedIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])}
                      >
                        <div className={cn("h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition", isSelected ? "bg-primary border-primary" : "border-border")}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{b.name}</span>
                        {b.category && <Badge variant="outline" className="text-[10px] h-5 px-2 flex-shrink-0">{b.category}</Badge>}
                        <span className="text-sm font-bold text-primary tabular-nums flex-shrink-0">{sym}{cost}</span>
                      </div>
                      {isSelected && (
                        <div className="divide-y divide-border">
                          {b.columns.map((col, idx) => {
                            const qty = getQty(b.id, col.id, col.maxPurchase)
                            return (
                              <div key={col.id} className={cn("flex items-center gap-3 px-3 py-1.5", idx % 2 === 0 ? "bg-background/30" : "bg-muted/10")}>
                                <Image src={col.icon} alt={col.name} width={24} height={24} className="h-6 w-6 object-contain flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{col.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{sym}{col.price} · max {col.maxPurchase}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); setQty(b.id, col.id, qty - 1, col.maxPurchase) }} disabled={qty === 0}
                                    className="h-6 w-6 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 text-sm font-bold flex items-center justify-center">−</button>
                                  <span className="text-sm font-bold w-5 text-center tabular-nums">{qty}</span>
                                  <button onClick={(e) => { e.stopPropagation(); setQty(b.id, col.id, qty + 1, col.maxPurchase) }} disabled={qty >= col.maxPurchase}
                                    className="h-6 w-6 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 text-sm font-bold flex items-center justify-center">+</button>
                                </div>
                                <span className="text-xs font-semibold text-primary w-14 text-right tabular-nums">{sym}{(col.price * qty).toFixed(2)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom Items */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Custom / Unlisted Bundles</label>
            {customItems.length > 0 && (
              <div className="space-y-1">
                {customItems.map(ci => (
                  <div key={ci.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
                    <span className="text-sm flex-1 truncate">{ci.name}</span>
                    <span className="text-sm font-bold text-primary tabular-nums">{sym}{ci.cost.toFixed(2)}</span>
                    <button onClick={() => setCustomItems(prev => prev.filter(i => i.id !== ci.id))} className="text-muted-foreground hover:text-destructive transition">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Bundle name…" value={customName} onChange={e => setCustomName(e.target.value)} className="h-8 flex-1 text-sm" />
              <Input placeholder="Cost" type="number" min="0" step="0.01" value={customCost} onChange={e => setCustomCost(e.target.value)} className="h-8 w-24 text-sm" onKeyDown={e => e.key === "Enter" && addCustomItem()} />
              <Button size="sm" variant="outline" className="h-8 px-3" onClick={addCustomItem} disabled={!customName.trim() || !customCost}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Currency + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([c, s]) => <SelectItem key={c} value={c}>{c} ({s})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" className="h-9" />
            </div>
          </div>
        </div>

        <Separator className="mt-2" />
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="text-base font-bold">{sym}{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={selectedIds.length === 0 && customItems.length === 0}>
              {initial ? "Save Changes" : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Entry Card (used in Timeline) ───────────────────────────────────────────

function EntryCard({
  entry, onEdit, onDelete,
}: {
  entry: TrackerEntry
  onEdit: () => void
  onDelete: () => void
}) {
  const sym = CURRENCIES[entry.currency] ?? "$"
  const isPurchased = entry.status === "purchased"
  const isUpcoming = !isPurchased && entry.date >= todayStr()

  return (
    <div className={cn("rounded-xl border overflow-hidden transition-all", isPurchased ? "border-emerald-500/30 bg-emerald-950/10" : isUpcoming ? "border-blue-500/30 bg-blue-950/10" : "border-border bg-muted/10")}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={cn("flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-sm", isPurchased ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400")}>
          {isPurchased ? "✓" : "🕒"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{formatDate(entry.date)}</span>
              <Badge variant={isPurchased ? "default" : "secondary"} className={cn("text-[10px] h-5", isPurchased ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30")}>
                {isPurchased ? "Purchased" : "Planned"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tabular-nums">{sym}{entry.totalCost.toFixed(2)}</span>
              <button onClick={onEdit} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {entry.bundles.map(b => (
              <span key={b.bundleId} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/80">{b.bundleName}</span>
            ))}
          </div>
          {entry.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{entry.notes}"</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({
  entries, onEdit, onDelete,
}: {
  entries: TrackerEntry[]
  onEdit: (entry: TrackerEntry) => void
  onDelete: (id: string) => void
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <Receipt className="h-12 w-12 opacity-20" />
        <p className="text-sm">No entries yet. Click "+ Add Entry" to get started.</p>
      </div>
    )
  }

  // Group by YYYY-MM
  const groups = new Map<string, TrackerEntry[]>()
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  sorted.forEach(e => {
    const ym = getYearMonth(e.date)
    if (!groups.has(ym)) groups.set(ym, [])
    groups.get(ym)!.push(e)
  })

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([ym, monthEntries]) => {
        const purchased = monthEntries.filter(e => e.status === "purchased")
        const planned   = monthEntries.filter(e => e.status === "planned")
        const sym = monthEntries[0] ? (CURRENCIES[monthEntries[0].currency] ?? "$") : "$"
        const monthSpend = purchased.reduce((s, e) => s + e.totalCost, 0)
        const monthPlan  = planned.reduce((s, e)   => s + e.totalCost, 0)
        return (
          <div key={ym}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-base font-bold">{getMonthLabel(ym)}</h3>
              {purchased.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Spent {sym}{monthSpend.toFixed(2)}</span>}
              {planned.length   > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15    text-blue-400    border border-blue-500/25">  Planned {sym}{monthPlan.toFixed(2)}</span>}
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {monthEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  entries, onAdd, onEdit, onDelete,
}: {
  entries: TrackerEntry[]
  onAdd: (date: string) => void
  onEdit: (entry: TrackerEntry) => void
  onDelete: (id: string) => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const ymPrefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const monthEntries = entries.filter(e => e.date.startsWith(ymPrefix))

  // Map day → entries
  const dayMap = new Map<string, TrackerEntry[]>()
  monthEntries.forEach(e => {
    const day = e.date.slice(8, 10)
    if (!dayMap.has(day)) dayMap.set(day, [])
    dayMap.get(day)!.push(e)
  })

  const todayDateStr = todayStr()
  const selectedEntries = selectedDay ? (dayMap.get(String(selectedDay).padStart(2, "0")) ?? []) : []
  const selectedDateStr = selectedDay ? `${ymPrefix}-${String(selectedDay).padStart(2, "0")}` : null

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg border border-border hover:bg-accent transition"><ChevronLeft className="h-4 w-4" /></button>
        <h3 className="text-lg font-bold">{MONTH_NAMES[month]} {year}</h3>
        <button onClick={nextMonth} className="p-2 rounded-lg border border-border hover:bg-accent transition"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }, (_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1
          const dayStr = String(dayNum).padStart(2, "0")
          const fullDate = `${ymPrefix}-${dayStr}`
          const dayEntries = dayMap.get(dayStr) ?? []
          const hasPurchased = dayEntries.some(e => e.status === "purchased")
          const hasPlanned   = dayEntries.some(e => e.status === "planned")
          const isToday = fullDate === todayDateStr
          const isSelected = selectedDay === dayNum

          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDay(isSelected ? null : dayNum)}
              className={cn(
                "relative rounded-lg p-1.5 min-h-[52px] flex flex-col items-center gap-0.5 transition border text-sm",
                isSelected ? "border-primary bg-primary/10" : isToday ? "border-primary/50 bg-primary/5" : dayEntries.length > 0 ? "border-border/60 bg-accent/50 hover:bg-accent" : "border-transparent hover:border-border hover:bg-accent/30",
              )}
            >
              <span className={cn("font-medium text-xs", isToday ? "text-primary font-bold" : dayEntries.length > 0 ? "text-foreground" : "text-muted-foreground")}>{dayNum}</span>
              {dayEntries.length > 0 && (
                <div className="flex gap-0.5">
                  {hasPurchased && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  {hasPlanned   && <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                </div>
              )}
              {dayEntries.length > 0 && (
                <span className="text-[9px] text-muted-foreground tabular-nums">
                  {CURRENCIES[dayEntries[0].currency] ?? "$"}{dayEntries.reduce((s, e) => s + e.totalCost, 0).toFixed(0)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Purchased</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" /> Planned</span>
      </div>

      {/* Selected day panel */}
      {selectedDay !== null && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{MONTH_NAMES[month]} {selectedDay}, {year}</h4>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => selectedDateStr && onAdd(selectedDateStr)}>
              <Plus className="h-3 w-3" /> Add Entry
            </Button>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map(e => <EntryCard key={e.id} entry={e} onEdit={() => onEdit(e)} onDelete={() => onDelete(e.id)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Stats View ───────────────────────────────────────────────────────────────

function StatsView({ entries }: { entries: TrackerEntry[] }) {
  const purchased = entries.filter(e => e.status === "purchased")
  const planned   = entries.filter(e => e.status === "planned")
  const now = new Date()
  const thisMonthPfx = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const thisMonthSpend = purchased.filter(e => e.date.startsWith(thisMonthPfx)).reduce((s, e) => s + e.totalCost, 0)
  const totalSpent    = purchased.reduce((s, e) => s + e.totalCost, 0)
  const totalPlanned  = planned.reduce((s, e) => s + e.totalCost, 0)
  const avgPurchase   = purchased.length > 0 ? totalSpent / purchased.length : 0

  const sym = entries.length > 0 ? (CURRENCIES[entries[0].currency] ?? "$") : "$"

  // Monthly chart data (last 12 months)
  const monthlyData = getLast12Months().map(ym => {
    const me = entries.filter(e => e.date.startsWith(ym))
    const [y, m] = ym.split("-").map(Number)
    return {
      month: `${SHORT_MONTHS[m - 1]} '${String(y).slice(2)}`,
      Spent:   me.filter(e => e.status === "purchased").reduce((s, e) => s + e.totalCost, 0),
      Planned: me.filter(e => e.status === "planned").reduce((s, e)   => s + e.totalCost, 0),
    }
  })

  // Category breakdown (purchased only)
  const catMap = new Map<string, number>()
  purchased.forEach(e => e.bundles.forEach(b => {
    const cat = b.category || "Uncategorized"
    catMap.set(cat, (catMap.get(cat) ?? 0) + b.cost)
  }))
  const catData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Resources gained from purchased entries
  const resourceMap = new Map<string, { icon: string; label: string; rowType: RowType; total: number }>()
  purchased.forEach(e => e.bundles.forEach(b => b.items.forEach(item => {
    const ex = resourceMap.get(item.label)
    if (ex) resourceMap.set(item.label, { ...ex, total: ex.total + item.total })
    else resourceMap.set(item.label, { icon: item.icon, label: item.label, rowType: item.rowType, total: item.total })
  })))
  const resources = Array.from(resourceMap.values()).filter(r => r.total > 0).sort((a, b) => b.total - a.total)

  // Upcoming purchases (planned + future date)
  const upcoming = planned.filter(e => e.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)

  const cardCls = "rounded-xl border border-border bg-card p-4 space-y-1"

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardCls}>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Total Spent</p>
          <p className="text-2xl font-bold tabular-nums">{sym}{totalSpent.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{purchased.length} purchase{purchased.length !== 1 ? "s" : ""}</p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Total Planned</p>
          <p className="text-2xl font-bold tabular-nums text-blue-400">{sym}{totalPlanned.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{planned.length} planned</p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">This Month</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-400">{sym}{thisMonthSpend.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{now.toLocaleString("default", { month: "long" })}</p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Avg Purchase</p>
          <p className="text-2xl font-bold tabular-nums">{sym}{avgPurchase.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">per transaction</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly spending bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Spending — Last 12 Months</h4>
          {entries.length === 0 ? <p className="text-xs text-muted-foreground text-center py-12">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: number) => [`${sym}${val.toFixed(2)}`, undefined]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Spent"   stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Planned" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category pie */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> By Category</h4>
          {catData.length === 0 ? <p className="text-xs text-muted-foreground text-center py-12">No purchase data.</p> : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}>
                    {catData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} formatter={(val: number) => [`${sym}${val.toFixed(2)}`, undefined]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {catData.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                    <span className="font-semibold tabular-nums">{sym}{c.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resources Gained */}
      {resources.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold mb-4">Resources Gained <span className="font-normal text-muted-foreground">— from purchased entries</span></h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {resources.map(r => (
              <div key={r.label} className="rounded-xl border border-border flex flex-col items-center gap-1.5 px-2 py-3 text-center bg-muted/20">
                <Image src={r.icon} alt={r.label} width={40} height={40} className="h-10 w-10 object-contain" />
                <span className="text-[10px] text-muted-foreground leading-tight">{r.label}</span>
                <span className="text-xs font-bold tabular-nums">{fmtRaw(r.total, r.rowType)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming purchases */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/10 p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-300"><Bell className="h-4 w-4" /> Upcoming Planned Purchases</h4>
          <div className="space-y-2">
            {upcoming.map(e => {
              const sym2 = CURRENCIES[e.currency] ?? "$"
              const daysUntil = Math.ceil((new Date(e.date + "T12:00:00").getTime() - Date.now()) / 86400000)
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border border-blue-500/20 px-3 py-2 bg-blue-950/20">
                  <div className="flex-shrink-0 text-sm text-blue-300 font-medium w-20 text-center">
                    {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil}d`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatDate(e.date)}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.bundles.map(b => b.bundleName).join(", ")}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-blue-300 flex-shrink-0">{sym2}{e.totalCost.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── View Button ──────────────────────────────────────────────────────────────

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

export function SpendingTrackerContent() {
  const [entries, setEntries] = useState<TrackerEntry[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("timeline")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<TrackerEntry | undefined>()
  const [prefillDate, setPrefillDate] = useState<string | undefined>()

  useEffect(() => { setEntries(loadEntries()) }, [])

  function handleSave(entry: TrackerEntry) {
    setEntries(prev => {
      const next = prev.some(e => e.id === entry.id)
        ? prev.map(e => e.id === entry.id ? entry : e)
        : [entry, ...prev]
      saveEntries(next)
      return next
    })
    setDialogOpen(false)
    setEditEntry(undefined)
    setPrefillDate(undefined)
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return
    setEntries(prev => { const next = prev.filter(e => e.id !== id); saveEntries(next); return next })
  }

  function openEdit(entry: TrackerEntry) {
    setEditEntry(entry)
    setDialogOpen(true)
  }

  function openAddWithDate(date: string) {
    setPrefillDate(date)
    setEditEntry(undefined)
    setDialogOpen(true)
  }

  function openAdd() {
    setEditEntry(undefined)
    setPrefillDate(undefined)
    setDialogOpen(true)
  }

  const sym = entries.length > 0 ? (CURRENCIES[entries[0].currency] ?? "$") : "$"
  const totalSpent  = entries.filter(e => e.status === "purchased").reduce((s, e) => s + e.totalCost, 0)
  const totalPlanned = entries.filter(e => e.status === "planned").reduce((s, e) => s + e.totalCost, 0)

  const initialEntryForDialog: TrackerEntry | undefined = editEntry
    ?? (prefillDate ? { id: "", date: prefillDate, bundles: [], currency: "USD", totalCost: 0, status: "planned", notes: "" } : undefined)

  return (
    <div className="space-y-5">
      <AddEntryDialog
        open={dialogOpen}
        initial={initialEntryForDialog}
        onSave={handleSave}
        onClose={() => { setDialogOpen(false); setEditEntry(undefined); setPrefillDate(undefined) }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold">Spending Tracker</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-3 mt-0.5">
            <span className="text-emerald-400 font-semibold">{sym}{totalSpent.toFixed(2)} spent</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-blue-400 font-semibold">{sym}{totalPlanned.toFixed(2)} planned</span>
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <ViewBtn active={viewMode === "timeline"} onClick={() => setViewMode("timeline")} icon={LayoutList}    label="Timeline" />
            <ViewBtn active={viewMode === "calendar"} onClick={() => setViewMode("calendar")} icon={CalendarDays}  label="Calendar" />
            <ViewBtn active={viewMode === "stats"}    onClick={() => setViewMode("stats")}    icon={BarChart3}     label="Stats"    />
          </div>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Entry
          </Button>
        </div>
      </div>

      <Separator />

      {viewMode === "timeline" && <TimelineView entries={entries} onEdit={openEdit} onDelete={handleDelete} />}
      {viewMode === "calendar" && <CalendarView entries={entries} onAdd={openAddWithDate} onEdit={openEdit} onDelete={handleDelete} />}
      {viewMode === "stats"    && <StatsView entries={entries} />}
    </div>
  )
}
