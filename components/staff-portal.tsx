'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Check, X, ChevronDown, ChevronUp, Loader2,
  Clock, AlertCircle, CheckCircle2, XCircle, ShieldCheck,
  ScanSearch, Crown, Flag, Bell, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  productKey: string
  toolType: string
  bundle?: string | null
  isSoC?: boolean | null
  priceUsd: number
  status: string
  createdAt: string
  confirmedAt?: string | null
  kvkSetupId?: string | null
  notes?: string | null
  user: {
    id: string
    username: string
    discordId: string
    avatar?: string | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOOL_LABEL: Record<string, string> = {
  'kvk-scanner':   'KvK Scanner',
  'title-giving':  'Title Giving',
  'fort-tracking': 'Fort Tracking',
  'player-finder': 'Player Finder',
  'alliance-mob':  'Alliance Mobilization',
  'discord-verify':'Discord Verification',
}

const TOOL_ICON: Record<string, React.ElementType> = {
  'kvk-scanner':   ScanSearch,
  'title-giving':  Crown,
  'fort-tracking': Flag,
  'player-finder': Search,
  'alliance-mob':  Bell,
  'discord-verify':MessageSquare,
}

const BUNDLE_LABEL: Record<string, string> = {
  'full-kvk':  'Full KvK',
  'two-camp':  'Two Camp',
  'one-camp':  'One Camp',
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'text-amber-400',  icon: Clock         },
  confirmed: { label: 'Confirmed', color: 'text-blue-400',   icon: CheckCircle2  },
  active:    { label: 'Active',    color: 'text-green-400',  icon: ShieldCheck   },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground', icon: XCircle },
}

function OrderRow({ order, onUpdated }: { order: Order; onUpdated: (o: Order) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [kvkSetupId, setKvkSetupId] = useState(order.kvkSetupId ?? '')

  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending
  const StatusIcon = statusMeta.icon
  const ToolIcon = TOOL_ICON[order.toolType] ?? ShieldCheck

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
      {/* Row header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        {/* Tool icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ToolIcon className="h-4 w-4 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {TOOL_LABEL[order.toolType] ?? order.toolType}
              {order.bundle ? ` — ${BUNDLE_LABEL[order.bundle] ?? order.bundle}` : ''}
              {order.isSoC !== null && order.isSoC !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">({order.isSoC ? 'SoC' : 'Non-SoC'})</span>
              )}
            </p>
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
            <p className="text-sm font-semibold text-foreground">${order.priceUsd}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn('h-3.5 w-3.5', statusMeta.color)} />
            <span className={cn('text-xs font-medium', statusMeta.color)}>{statusMeta.label}</span>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-border/50 px-5 py-4 space-y-4">
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

          {/* KvK Setup ID link (for kvk-scanner orders) */}
          {order.toolType === 'kvk-scanner' && (
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
              {order.kvkSetupId && (
                <p className="text-[10px] text-muted-foreground">
                  Linked: <span className="font-mono">{order.kvkSetupId}</span>
                </p>
              )}
            </div>
          )}

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

          {/* Quick confirm button */}
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

// ─── Main export ──────────────────────────────────────────────────────────────

export function StaffPortal() {
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

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function handleOrderUpdated(updated: Order) {
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
  }

  const filtered = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter)

  const counts: Record<string, number> = { all: orders.length }
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            placeholder="Search by product key..."
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

      {/* Status filter tabs */}
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
            <span className="ml-1.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px]">
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
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

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/50 bg-card/60">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No orders found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(order => (
          <OrderRow key={order.id} order={order} onUpdated={handleOrderUpdated} />
        ))}
      </div>
    </div>
  )
}
