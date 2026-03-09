"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Image from "next/image"
import { Plus, Trash2, Search, Package, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Bundle } from "@/components/bundles-content"

// ─── Types ────────────────────────────────────────────────────────────────────

type TierColumn = Bundle["columns"][number]
type BundleRow  = Bundle["rows"][number]
type RowType    = "number" | "days" | "currency"
type RowIconMode = "icon" | "text" | "none"

export type BundlePlanEntry = {
  id: string
  bundleId: string
  bundleName: string
  bundleCategory: string
  columnId: string
  columnName: string
  columnIcon: string
  price: number
  qty: number
  items: Array<{
    label: string
    icon: string
    iconMode: RowIconMode
    rowType: RowType
    perPurchase: number
    total: number
  }>
  totalCost: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUNDLES_KEY = "bundles-state-v3"

function loadAvailBundles(): Bundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_KEY)
    if (raw) return (JSON.parse(raw) as { bundles?: Bundle[] }).bundles ?? []
  } catch { /* ignore */ }
  return []
}

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

function fmtValue(v: number, rowType: string): string {
  if (rowType === "days")     return `${(v / 1440).toFixed(2)}d`
  if (rowType === "currency") return `$${fmt(v)}`
  return fmt(v)
}

function buildEntry(bundle: Bundle, col: TierColumn, qty: number): BundlePlanEntry {
  const items = bundle.rows
    .map(row => ({
      label:       row.label,
      icon:        (row as { cellIcons?: Record<string, string> }).cellIcons?.[col.id] || row.icon,
      iconMode:    (row as { iconMode?: RowIconMode }).iconMode ?? "icon",
      rowType:     row.rowType as RowType,
      perPurchase: row.values[col.id] ?? 0,
      total:       (row.values[col.id] ?? 0) * qty,
    }))
    .filter(i => i.perPurchase > 0)

  return {
    id:             `bpe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    bundleId:       bundle.id,
    bundleName:     bundle.name,
    bundleCategory: bundle.category,
    columnId:       col.id,
    columnName:     col.name,
    columnIcon:     col.icon,
    price:          col.price,
    qty,
    items,
    totalCost:      col.price * qty,
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * Self-contained bundle planner card.
 * Persists its plan to `localStorage[storageKey]` automatically.
 * Also accepts an optional `onPlanChange` callback so parent can react
 * (e.g. KvK could show extra AP from bundles).
 */
export function BundlePlannerCard({
  storageKey,
  title = "Bundle Planner",
  description,
  onPlanChange,
}: {
  storageKey: string
  title?: string
  description?: string
  onPlanChange?: (plan: BundlePlanEntry[]) => void
}) {
  const [plan, setPlan] = useState<BundlePlanEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load plan from storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setPlan(JSON.parse(raw))
    } catch { /* ignore */ }
    setLoaded(true)
  }, [storageKey])

  // Persist plan whenever it changes
  const updatePlan = useCallback((next: BundlePlanEntry[]) => {
    setPlan(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
    onPlanChange?.(next)
  }, [storageKey, onPlanChange])

  // ── Picker dialog state ──
  const [showPicker, setShowPicker] = useState(false)
  const [availBundles, setAvailBundles] = useState<Bundle[]>([])
  const [search, setSearch] = useState("")
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null)
  const [selectedColId, setSelectedColId] = useState<string>("")
  const [qty, setQty] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Reload available bundles whenever dialog opens
  useEffect(() => {
    if (showPicker) setAvailBundles(loadAvailBundles())
  }, [showPicker])

  const filteredBundles = useMemo(() =>
    availBundles.filter(b =>
      !search.trim() ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
    ),
  [availBundles, search])

  const selectedCol = useMemo(
    () => selectedBundle?.columns.find(c => c.id === selectedColId) ?? null,
    [selectedBundle, selectedColId],
  )

  function openPicker() {
    setShowPicker(true)
    setSelectedBundle(null)
    setSelectedColId("")
    setQty(1)
    setSearch("")
  }

  function handleAdd() {
    if (!selectedBundle || !selectedCol) return
    updatePlan([...plan, buildEntry(selectedBundle, selectedCol, qty)])
    setShowPicker(false)
  }

  function handleRemove(id: string) {
    updatePlan(plan.filter(e => e.id !== id))
  }

  // ── Totals ──
  const totals = useMemo(() => {
    const totalCost = plan.reduce((s, e) => s + e.totalCost, 0)
    const itemMap = new Map<string, { label: string; icon: string; iconMode: RowIconMode; rowType: string; total: number }>()
    plan.forEach(e => {
      e.items.forEach(item => {
        const ex = itemMap.get(item.label)
        if (ex) itemMap.set(item.label, { ...ex, total: ex.total + item.total })
        else itemMap.set(item.label, { label: item.label, icon: item.icon, iconMode: item.iconMode ?? "icon", rowType: item.rowType, total: item.total })
      })
    })
    return {
      totalCost,
      items: Array.from(itemMap.values()).sort((a, b) => b.total - a.total),
    }
  }, [plan])

  if (!loaded) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
              </div>
            </div>
            <Button size="sm" onClick={openPicker} className="gap-1.5 flex-shrink-0">
              <Plus className="h-3.5 w-3.5" />
              Add Bundle
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {plan.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Package className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No bundles added yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Click "Add Bundle" to pick from your bundle library.
              </p>
              <Button variant="outline" size="sm" onClick={openPicker} className="mt-3 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Bundle
              </Button>
            </div>
          ) : (
            <>
              {/* Plan entries */}
              <div className="space-y-2">
                {plan.map(entry => {
                  const isExpanded = expandedId === entry.id
                  return (
                    <div key={entry.id} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {/* Tier icon */}
                        <Image
                          src={entry.columnIcon}
                          alt={entry.columnName}
                          width={36}
                          height={36}
                          className="h-9 w-9 object-contain flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">{entry.bundleName}</span>
                            <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 flex-shrink-0">
                              {entry.columnName}
                            </Badge>
                            {entry.qty > 1 && (
                              <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1.5 flex-shrink-0">
                                ×{entry.qty}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {entry.items.slice(0, 4).map(item => (
                              <span key={item.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                {(item.iconMode ?? "icon") === "icon" && <Image src={item.icon} alt={item.label} width={13} height={13} className="h-3.5 w-3.5 object-contain" />}
                                {(item.iconMode ?? "icon") !== "none" ? fmtValue(item.total, item.rowType) : fmtValue(item.total, item.rowType)}
                              </span>
                            ))}
                            {entry.items.length > 4 && (
                              <span className="text-[11px] text-muted-foreground">+{entry.items.length - 4} more</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            ${fmt(entry.totalCost)}
                          </span>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="text-muted-foreground hover:text-foreground transition"
                            title="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="text-muted-foreground hover:text-destructive transition"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border bg-background/40 px-3 py-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                            Contents — {entry.columnName} × {entry.qty}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                            {entry.items.map(item => (
                              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {(item.iconMode ?? "icon") === "icon" && <Image src={item.icon} alt={item.label} width={16} height={16} className="h-4 w-4 object-contain flex-shrink-0" />}
                                <span className="tabular-nums">{fmtValue(item.total, item.rowType)}</span>
                                {(item.iconMode ?? "icon") !== "none" && <span className="truncate">{item.label}</span>}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            ${fmt(entry.price)} × {entry.qty} = <span className="font-semibold text-foreground">${fmt(entry.totalCost)}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary totals */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Plan Total ({plan.length} bundle{plan.length !== 1 ? "s" : ""})
                  </span>
                  <span className="text-base font-bold text-foreground tabular-nums">
                    ${fmt(totals.totalCost)}
                  </span>
                </div>
                {totals.items.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pt-2 border-t border-border">
                    {totals.items.map(item => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        {(item.iconMode ?? "icon") === "icon" && <Image src={item.icon} alt={item.label} width={16} height={16} className="h-4 w-4 object-contain flex-shrink-0" />}
                        {(item.iconMode ?? "icon") !== "none" && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {fmtValue(item.total, item.rowType)} {item.label}
                          </span>
                        )}
                        {(item.iconMode ?? "icon") === "none" && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">{fmtValue(item.total, item.rowType)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Picker Dialog ── */}
      <Dialog
        open={showPicker}
        onOpenChange={v => {
          setShowPicker(v)
          if (!v) { setSelectedBundle(null); setSelectedColId(""); setQty(1); setSearch("") }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Add Bundle to Plan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {availBundles.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No bundles found in your library.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create bundles on the Bundles page first.</p>
              </div>
            ) : (
              <>
                {/* Bundle grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredBundles.map(bundle => (
                    <button
                      key={bundle.id}
                      onClick={() => {
                        setSelectedBundle(bundle)
                        setSelectedColId(bundle.columns[0]?.id ?? "")
                        setQty(1)
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                        selectedBundle?.id === bundle.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40 bg-secondary/30",
                      )}
                    >
                      {bundle.columns[0] ? (
                        <Image
                          src={bundle.columns[0].icon}
                          alt={bundle.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 object-contain flex-shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bundle.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bundle.category} · {bundle.columns.length} tier{bundle.columns.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Tier + qty config (shown after bundle selected) */}
                {selectedBundle && selectedBundle.columns.length > 0 && (
                  <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    {/* Tier selector */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Select Tier</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBundle.columns.map(col => (
                          <button
                            key={col.id}
                            onClick={() => { setSelectedColId(col.id); setQty(1) }}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition",
                              selectedColId === col.id
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border hover:border-primary/40 bg-background/60",
                            )}
                          >
                            <Image src={col.icon} alt={col.name} width={20} height={20} className="h-5 w-5 object-contain" />
                            {col.name}
                            <span className="text-muted-foreground font-normal">${fmt(col.price)}</span>
                            {col.maxPurchase > 1 && (
                              <span className="text-muted-foreground font-normal">max ×{col.maxPurchase}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedCol && (
                      <>
                        {/* Quantity */}
                        {selectedCol.maxPurchase > 1 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">How many?</p>
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {qty} of {selectedCol.maxPurchase}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={selectedCol.maxPurchase}
                              value={qty}
                              onChange={e => setQty(Number(e.target.value))}
                              className="w-full accent-primary h-2 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Contents preview */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            Contents {qty > 1 ? `× ${qty}` : ""}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {selectedBundle.rows.map(row => {
                              const perPurchase = row.values[selectedCol.id] ?? 0
                              if (!perPurchase) return null
                              const rowIconMode = (row as { iconMode?: RowIconMode }).iconMode ?? "icon"
                              return (
                                <div key={row.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  {rowIconMode === "icon" && <Image src={row.icon} alt={row.label} width={16} height={16} className="h-4 w-4 object-contain" />}
                                  <span className="font-medium text-foreground tabular-nums">
                                    {fmtValue(perPurchase * qty, row.rowType)}
                                  </span>
                                  {rowIconMode !== "none" && <span className="truncate">{row.label}</span>}
                                </div>
                              )
                            })}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-border/60">
                            <span className="text-xs text-muted-foreground">
                              ${fmt(selectedCol.price)} × {qty}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              = ${fmt(selectedCol.price * qty)}
                            </span>
                          </div>
                        </div>

                        <Button onClick={handleAdd} className="w-full gap-2">
                          <Plus className="h-4 w-4" />
                          Add to Plan
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
