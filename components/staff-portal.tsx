'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Check, X, ChevronDown, ChevronUp, Loader2,
  Clock, AlertCircle, CheckCircle2, XCircle, ShieldCheck,
  ScanSearch, Crown, Flag, Bell, MessageSquare, UserCheck,
  UserMinus, BarChart2, ClipboardList, ListChecks, Trophy,
  Calendar, Users, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// ─── Shared types ─────────────────────────────────────────────────────────────

interface KvkKingdom {
  id: string
  kdNumber: string
  camp: string
  tracked: boolean
}

interface KvkRequest {
  id: string
  name: string
  kvkType: string
  bundle: string
  isSoC: boolean
  status: string
  createdAt: string
  assignedToId: string | null
  assignedToName: string | null
  assignedAt: string | null
  completedAt: string | null
  completedByName: string | null
  orderId: string | null
  kingdoms: KvkKingdom[]
  createdBy: { id: string; username: string; discordId: string; avatar?: string | null }
  order?: { id: string; productKey: string; items?: unknown; totalUsd?: number; status: string } | null
}

interface Order {
  id: string
  productKey: string
  items?: Array<{ toolId: string; label: string; bundle?: string; isSoC?: boolean; price?: number }> | null
  totalUsd?: number | null
  toolType?: string | null
  bundle?: string | null
  isSoC?: boolean | null
  priceUsd?: number | null
  status: string
  createdAt: string
  confirmedAt?: string | null
  kvkSetupId?: string | null
  notes?: string | null
  user: { id: string; username: string; discordId: string; avatar?: string | null }
}

interface StatsData {
  total: number
  thisMonth: number
  thisWeek: number
  days: Array<{ label: string; date: string; count: number }>
  weeks: Array<{ label: string; date: string; count: number }>
  months: Array<{ label: string; date: string; count: number }>
  leaderboard: Array<{ staffId: string; staffName: string; completions: number }>
  recent: Array<{ id: string; name: string; completedAt: string; completedByName: string; requestedBy: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUNDLE_LABEL: Record<string, string> = {
  'full-kvk': 'Full KvK',
  'two-camp':  'Two Camp',
  'one-camp':  'One Camp',
}

const KVK_TYPE_LABEL: Record<string, string> = {
  'heroic-anthem':    'Heroic Anthem',
  'tides-of-war':     'Tides of War',
  'warriors-unbound': 'Warriors Unbound',
  'king-of-britain':  'King of All Britain',
  'king-of-nile':     'King of the Nile',
}

const TOOL_LABEL: Record<string, string> = {
  'kvk-scanner':    'KvK Scanner',
  'title-giving':   'Title Giving',
  'fort-tracking':  'Fort Tracking',
  'player-finder':  'Player Finder',
  'alliance-mob':   'Alliance Mobilization',
  'discord-verify': 'Discord Verification',
}

const TOOL_ICON: Record<string, React.ElementType> = {
  'kvk-scanner':    ScanSearch,
  'title-giving':   Crown,
  'fort-tracking':  Flag,
  'player-finder':  Search,
  'alliance-mob':   Bell,
  'discord-verify': MessageSquare,
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'text-amber-400',       icon: Clock        },
  confirmed: { label: 'Confirmed', color: 'text-blue-400',        icon: CheckCircle2 },
  active:    { label: 'Active',    color: 'text-green-400',       icon: ShieldCheck  },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground', icon: XCircle     },
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: Array<{ label: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-0.5 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative h-full justify-end">
            {/* Tooltip */}
            {d.count > 0 && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="rounded bg-popover border border-border/50 px-1.5 py-0.5 text-[10px] text-foreground whitespace-nowrap shadow">
                  {d.count}
                </div>
              </div>
            )}
            <div
              className="w-full rounded-t bg-primary/50 hover:bg-primary transition-colors cursor-default"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '3px' : '0' }}
            />
          </div>
        ))}
      </div>
      {/* X axis labels — only show every nth to avoid overcrowding */}
      <div className="flex gap-0.5">
        {data.map((d, i) => {
          const step = data.length > 20 ? 5 : data.length > 12 ? 3 : 1
          return (
            <div key={i} className="flex-1 text-center">
              {i % step === 0 && (
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              )}
            </div>
          )
        })}
      </div>
      {total === 0 && (
        <p className="text-xs text-muted-foreground text-center pt-2">No completions in this period</p>
      )}
    </div>
  )
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  currentUserId,
  highlight,
  onUpdated,
}: {
  request: KvkRequest
  currentUserId: string
  highlight: boolean
  onUpdated: (r: KvkRequest) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(highlight)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isPending = request.status === 'pending'
  const isAssignedToMe = request.assignedToId === currentUserId

  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  async function doAction(action: 'assign' | 'unassign' | 'complete') {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onUpdated(data.request)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const tracked = request.kingdoms.filter(k => k.tracked)
  const mapOnly = request.kingdoms.filter(k => !k.tracked)

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border bg-card/60 transition-all',
        highlight ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50',
        !isPending && 'opacity-60'
      )}
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-white/[0.01] transition-colors"
      >
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
          {request.createdBy.avatar
            ? <img src={request.createdBy.avatar} alt="" className="h-9 w-9 rounded-full" crossOrigin="anonymous" />
            : <span className="text-xs font-semibold text-primary">{request.createdBy.username[0]?.toUpperCase()}</span>
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{request.name}</span>
            {isPending && (
              <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Pending Setup
              </span>
            )}
            {!isPending && request.status === 'active' && (
              <span className="rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                Completed
              </span>
            )}
            {request.assignedToName && isPending && (
              <span className="rounded-full bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                {isAssignedToMe ? '✓ Assigned to you' : `Assigned to ${request.assignedToName}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/80">{request.createdBy.username}</span>
            <span>·</span>
            <span>{KVK_TYPE_LABEL[request.kvkType] ?? request.kvkType}</span>
            <span>·</span>
            <span>{BUNDLE_LABEL[request.bundle] ?? request.bundle}</span>
            <span>·</span>
            <span>{request.isSoC ? 'SoC' : 'Non-SoC'}</span>
            <span>·</span>
            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/50 px-5 py-4 space-y-5">
          {/* Kingdoms */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Kingdoms</p>
            <div className="flex flex-wrap gap-1.5">
              {tracked.map(k => (
                <span key={k.id} className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary font-medium">
                  KD {k.kdNumber} <span className="opacity-70">— {k.camp}</span>
                </span>
              ))}
              {mapOnly.map(k => (
                <span key={k.id} className="rounded-lg bg-muted/30 border border-border/50 px-2.5 py-1 text-xs text-muted-foreground">
                  KD {k.kdNumber} <span className="opacity-70">— {k.camp}</span> <span className="text-[10px]">(map only)</span>
                </span>
              ))}
              {request.kingdoms.length === 0 && (
                <span className="text-xs text-muted-foreground">No kingdoms listed</span>
              )}
            </div>
          </div>

          {/* Order info */}
          {request.order && (
            <div className="rounded-lg border border-border/50 bg-muted/10 px-4 py-3">
              <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Purchase</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono text-foreground">{request.order.productKey}</span>
                {request.order.totalUsd && <span className="text-green-400 font-semibold">${request.order.totalUsd}</span>}
                <span className={cn(
                  'rounded-full px-2 py-0.5',
                  request.order.status === 'active' || request.order.status === 'confirmed'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-amber-400/10 text-amber-400'
                )}>
                  {request.order.status}
                </span>
              </div>
            </div>
          )}

          {/* User info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Discord: <span className="font-mono text-foreground">{request.createdBy.discordId}</span></span>
            <span>·</span>
            <span>KvK ID: <span className="font-mono text-foreground/70 select-all">{request.id}</span></span>
          </div>

          {/* Actions — only for pending */}
          {isPending && (
            <div className="flex flex-wrap items-center gap-2">
              {!request.assignedToId ? (
                <button
                  onClick={() => doAction('assign')}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-400/20 transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                  Assign to Me
                </button>
              ) : isAssignedToMe ? (
                <button
                  onClick={() => doAction('unassign')}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                  Unassign
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Assigned to {request.assignedToName}</span>
              )}

              <button
                onClick={() => doAction('complete')}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Mark Complete &amp; Activate
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Order row (Orders tab) ────────────────────────────────────────────────────

function OrderRow({ order, onUpdated }: { order: Order; onUpdated: (o: Order) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [kvkSetupId, setKvkSetupId] = useState(order.kvkSetupId ?? '')

  // Resolve display info from either multi-item or legacy single-item order
  const items = order.items
  const hasItems = items && items.length > 0
  const primaryToolId = hasItems ? items[0].toolId : (order.toolType ?? 'kvk-scanner')
  const primaryLabel = hasItems
    ? items.map(i => i.label ?? TOOL_LABEL[i.toolId] ?? i.toolId).join(', ')
    : (TOOL_LABEL[order.toolType ?? ''] ?? order.toolType ?? '—')
  const displayPrice = order.totalUsd ?? order.priceUsd ?? 0

  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending
  const StatusIcon = statusMeta.icon
  const ToolIcon = TOOL_ICON[primaryToolId] ?? ShieldCheck

  async function updateOrder(patch: Partial<{ status: string; kvkSetupId: string; notes: string }>) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      onUpdated(data.order)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card/60 transition-all',
      order.status === 'active' ? 'border-green-500/20' : 'border-border/50'
    )}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ToolIcon className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{primaryLabel}</p>
            <p className="text-xs text-muted-foreground font-mono">{order.productKey}</p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {order.user.avatar && (
                <img src={order.user.avatar} alt="" className="h-5 w-5 rounded-full" crossOrigin="anonymous" />
              )}
              <span className="text-sm text-foreground truncate">{order.user.username}</span>
            </div>
            <p className="text-xs text-muted-foreground">{order.user.discordId}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">${displayPrice}</p>
            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn('h-3.5 w-3.5', statusMeta.color)} />
            <span className={cn('text-xs font-medium', statusMeta.color)}>{statusMeta.label}</span>
          </div>
        </div>

        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-5 py-4 space-y-4">
          {/* Multi-item breakdown */}
          {hasItems && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Items</p>
              <div className="space-y-1">
                {items!.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{item.label ?? TOOL_LABEL[item.toolId] ?? item.toolId}</span>
                    <span className="text-muted-foreground">${item.price ?? 0}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs font-semibold border-t border-border/30 pt-1 mt-1">
                  <span className="text-foreground">Total</span>
                  <span className="text-green-400">${displayPrice}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status actions */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'confirmed', 'active', 'cancelled'] as const).map(s => (
                <button
                  key={s}
                  disabled={saving || order.status === s}
                  onClick={() => updateOrder({ status: s })}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40',
                    order.status === s
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : 'border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* KvK Setup ID link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">KvK Setup ID</label>
            <div className="flex items-center gap-2">
              <input
                value={kvkSetupId}
                onChange={e => setKvkSetupId(e.target.value)}
                placeholder="Link to KvK setup (cuid)"
                className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={() => updateOrder({ kvkSetupId: kvkSetupId || undefined })}
                disabled={saving}
                className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>

          {/* Staff notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Staff Notes</label>
            <div className="flex gap-2">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes visible to staff only..."
                className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
              />
              <button
                onClick={() => updateOrder({ notes })}
                disabled={saving}
                className="self-end rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>

          {/* Quick activate */}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-400 flex-1">Payment received? Mark as Active to unlock the tool for the user.</p>
              <button
                onClick={() => updateOrder({ status: 'active' })}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-green-500/15 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Activate
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Requests tab ─────────────────────────────────────────────────────────────

// ─── Order task card (non-KvK tools in Requests tab) ─────────────────────────

function OrderTaskCard({ order, onUpdated }: { order: Order; onUpdated: (o: Order) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = order.items
  const hasItems = items && items.length > 0
  const primaryToolId = hasItems ? items[0].toolId : (order.toolType ?? '')
  const primaryLabel = hasItems
    ? items.map(i => i.label ?? TOOL_LABEL[i.toolId] ?? i.toolId).join(', ')
    : (TOOL_LABEL[order.toolType ?? ''] ?? order.toolType ?? '—')
  const displayPrice = order.totalUsd ?? order.priceUsd ?? 0
  const ToolIcon = TOOL_ICON[primaryToolId] ?? ShieldCheck
  const isPending = order.status === 'pending' || order.status === 'confirmed'

  async function activate() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onUpdated(data.order)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card/60 transition-all',
      order.status === 'active' ? 'border-green-500/20 opacity-60' : 'border-border/50'
    )}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ToolIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{primaryLabel}</span>
            {isPending && (
              <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Needs Setup
              </span>
            )}
            {order.status === 'active' && (
              <span className="rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/80">{order.user.username}</span>
            <span>·</span>
            <span className="font-mono">{order.productKey}</span>
            <span>·</span>
            <span className="text-green-400 font-semibold">${displayPrice}</span>
            <span>·</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-5 py-4 space-y-4">
          {/* Items */}
          {hasItems && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Items Purchased</p>
              <div className="space-y-1">
                {items!.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{item.label ?? TOOL_LABEL[item.toolId] ?? item.toolId}
                      {item.bundle && <span className="ml-1 text-muted-foreground">— {item.bundle}</span>}
                      {item.isSoC !== undefined && <span className="ml-1 text-muted-foreground">({item.isSoC ? 'SoC' : 'Non-SoC'})</span>}
                    </span>
                    <span className="text-muted-foreground">${item.price ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User info */}
          <div className="text-xs text-muted-foreground flex gap-3">
            <span>Discord: <span className="font-mono text-foreground">{order.user.discordId}</span></span>
          </div>

          {/* Activate button */}
          {isPending && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-400 flex-1">Payment confirmed? Activate to unlock the tool for this user.</p>
              <button
                onClick={activate}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-green-500/15 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Activate
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Requests tab ─────────────────────────────────────────────────────────────

function RequestsTab({ currentUserId }: { currentUserId: string }) {
  const [requests, setRequests] = useState<KvkRequest[]>([])
  const [orderTasks, setOrderTasks] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('pending')
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const reqId = params.get('request')
      if (reqId) {
        setHighlightId(reqId)
        setFilter('all')
      }
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [kvkRes, ordersRes] = await Promise.all([
        fetch('/api/staff/requests'),
        fetch('/api/orders'),
      ])
      const [kvkData, ordersData] = await Promise.all([kvkRes.json(), ordersRes.json()])
      if (!kvkRes.ok) throw new Error(kvkData.error ?? 'Failed to load requests')
      setRequests(kvkData.requests)

      // Show orders for tools that ARE NOT kvk-scanner (that has its own KvkSetup flow)
      // Also show kvk-scanner orders where the user hasn't submitted kingdom details yet
      const kvkScannerOrderIds = new Set(
        (kvkData.requests as KvkRequest[]).map(r => r.orderId).filter(Boolean)
      )
      const allOrders: Order[] = ordersData.orders ?? []
      const nonKvkOrders = allOrders.filter(o => {
        const items = o.items ?? []
        const hasKvkScanner = items.some(i => i.toolId === 'kvk-scanner')
        const hasOtherTools = items.some(i => i.toolId !== 'kvk-scanner')
        // Show if: has non-KvK tools, OR is a KvK scanner order with no submitted setup
        if (hasOtherTools) return true
        if (hasKvkScanner && !kvkScannerOrderIds.has(o.id)) return true
        return false
      })
      setOrderTasks(nonKvkOrders)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  function handleUpdated(updated: KvkRequest) {
    setRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)))
  }
  function handleOrderUpdated(updated: Order) {
    setOrderTasks(prev => prev.map(o => (o.id === updated.id ? updated : o)))
  }

  const filteredKvk = filter === 'all'
    ? requests
    : filter === 'pending'
    ? requests.filter(r => r.status === 'pending')
    : requests.filter(r => r.status === 'active')

  const filteredOrders = filter === 'all'
    ? orderTasks
    : filter === 'pending'
    ? orderTasks.filter(o => o.status === 'pending' || o.status === 'confirmed')
    : orderTasks.filter(o => o.status === 'active')

  const pendingCount = requests.filter(r => r.status === 'pending').length
    + orderTasks.filter(o => o.status === 'pending' || o.status === 'confirmed').length
  const myCount = requests.filter(r => r.assignedToId === currentUserId && r.status === 'pending').length
  const completedToday = requests.filter(r => {
    if (!r.completedAt) return false
    const d = new Date(r.completedAt)
    return d.toDateString() === new Date().toDateString()
  }).length

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Setup', value: pendingCount, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Assigned to Me', value: myCount, icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Completed Today', value: completedToday, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border/50 bg-card/60 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', card.bg)}>
                <card.icon className={cn('h-3.5 w-3.5', card.color)} />
              </div>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['pending', 'all', 'active'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Completed'}
              <span className="ml-1.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px]">
                {f === 'all'
                  ? requests.length + orderTasks.length
                  : f === 'pending'
                  ? requests.filter(r => r.status === 'pending').length + orderTasks.filter(o => o.status === 'pending' || o.status === 'confirmed').length
                  : requests.filter(r => r.status === 'active').length + orderTasks.filter(o => o.status === 'active').length}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 hidden" />}
          Refresh
        </button>
      </div>

      {/* List */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && filteredKvk.length === 0 && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/50 bg-card/60">
          <ListChecks className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No {filter === 'all' ? '' : filter} requests</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Order tasks (all tools) */}
        {filteredOrders.map(o => (
          <OrderTaskCard key={o.id} order={o} onUpdated={handleOrderUpdated} />
        ))}
        {/* KvK setup requests */}
        {filteredKvk.map(r => (
          <RequestCard
            key={r.id}
            request={r}
            currentUserId={currentUserId}
            highlight={r.id === highlightId}
            onUpdated={handleUpdated}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Orders tab ────────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = query ? `/api/orders?q=${encodeURIComponent(query)}` : '/api/orders'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load orders')
      setOrders(data.orders)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  function handleUpdated(updated: Order) {
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
  }

  const filtered = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter)

  const counts: Record<string, number> = { all: orders.length }
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            placeholder="Search by product key or username..."
            className="w-full rounded-xl border border-border/50 bg-card/60 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'active', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === s
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {s === 'all' ? 'All' : STATUS_META[s].label}
            <span className="ml-1.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px]">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border/50 bg-card/60">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No orders found</p>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map(order => (
          <OrderRow key={order.id} order={order} onUpdated={handleUpdated} />
        ))}
      </div>
    </div>
  )
}

// ─── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'days' | 'weeks' | 'months'>('days')

  useEffect(() => {
    fetch('/api/staff/stats')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Failed to load stats')
        setStats(data)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (error || !stats) return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />{error ?? 'Failed to load'}
    </div>
  )

  const chartData = period === 'days' ? stats.days : period === 'weeks' ? stats.weeks : stats.months

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Completed', value: stats.total,      icon: Trophy,     color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'This Month',      value: stats.thisMonth,  icon: Calendar,   color: 'text-primary',   bg: 'bg-primary/10'   },
          { label: 'This Week',       value: stats.thisWeek,   icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border/50 bg-card/60 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', card.bg)}>
                <card.icon className={cn('h-3.5 w-3.5', card.color)} />
              </div>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <BarChart2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Completions Over Time</span>
          </div>
          <div className="flex gap-1">
            {(['days', 'weeks', 'months'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  period === p
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {p === 'days' ? '30D' : p === 'weeks' ? '12W' : '12M'}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={chartData} />
      </div>

      {/* Staff leaderboard */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">Staff Leaderboard</span>
        </div>
        {stats.leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No completed setups yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 text-left w-8">#</th>
                <th className="pb-2 text-left">Staff Member</th>
                <th className="pb-2 text-right">Completed</th>
                <th className="pb-2 pr-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {stats.leaderboard.map((s, i) => (
                <tr key={s.staffId} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="py-2.5">
                    <span className={cn('font-medium', i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-foreground')}>
                      {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}
                      {s.staffName}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-foreground">{s.completions}</td>
                  <td className="py-2.5 text-right text-muted-foreground pr-2">
                    {stats.total > 0 ? `${Math.round((s.completions / stats.total) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent completions log */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">Recent Completions</span>
        </div>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No completed setups yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 text-left">KvK Name</th>
                <th className="pb-2 text-left">Requested By</th>
                <th className="pb-2 text-left">Completed By</th>
                <th className="pb-2 pr-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map(r => (
                <tr key={r.id} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 text-foreground font-medium truncate max-w-[140px]">{r.name}</td>
                  <td className="py-2.5 text-muted-foreground">{r.requestedBy}</td>
                  <td className="py-2.5 text-primary">{r.completedByName ?? '—'}</td>
                  <td className="py-2.5 text-right text-muted-foreground pr-2 text-xs">
                    {new Date(r.completedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

const PORTAL_TABS = [
  { id: 'requests', label: 'Requests',     icon: ListChecks  },
  { id: 'orders',   label: 'Orders',       icon: ClipboardList },
  { id: 'stats',    label: 'Stats',        icon: BarChart2   },
] as const

type PortalTab = typeof PORTAL_TABS[number]['id']

export function StaffPortal() {
  const { user } = useAuth()
  const [tab, setTab] = useState<PortalTab>('requests')

  // Default to requests when arriving via ?request= deep link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('request')) setTab('requests')
    }
  }, [])

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card/40 p-1 w-fit">
        {PORTAL_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'requests' && <RequestsTab currentUserId={user?.id ?? ''} />}
      {tab === 'orders'   && <OrdersTab />}
      {tab === 'stats'    && <StatsTab />}
    </div>
  )
}
