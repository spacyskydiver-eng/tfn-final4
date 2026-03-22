'use client'

import { useState, useEffect } from 'react'
import {
  Crown, Flag, Search, Bell, Lock, ShoppingCart, Circle, CheckCircle,
  Zap, Star, Trophy, Activity, Map, Users, LocateFixed, RefreshCw, ScanSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Alliance tier IDs ────────────────────────────────────────────────────────

const BASIC_AND_UP    = ['alliance-basic', 'alliance-elite', 'alliance-legendary', 'vip-core', 'vip-elite-soc', 'vip-elite-nonsoc']
const ELITE_AND_UP    = ['alliance-elite', 'alliance-legendary', 'vip-core', 'vip-elite-soc', 'vip-elite-nonsoc']
const LEGENDARY_ONLY  = ['alliance-legendary', 'vip-core', 'vip-elite-soc', 'vip-elite-nonsoc']

const TIER_LABELS: Record<string, string> = {
  'alliance-basic':     'Alliance Control Basic',
  'alliance-elite':     'Alliance Control Elite',
  'alliance-legendary': 'Alliance Control Legendary',
  'vip-core':           'VIP Core',
  'vip-elite-soc':      'VIP Elite (SoC)',
  'vip-elite-nonsoc':   'VIP Elite (Non-SoC)',
}

const TIER_ICONS: Record<string, React.ElementType> = {
  'alliance-basic':     Zap,
  'alliance-elite':     Star,
  'alliance-legendary': Trophy,
  'vip-core':           Crown,
  'vip-elite-soc':      Crown,
  'vip-elite-nonsoc':   Crown,
}

// ─── Tool catalogue ───────────────────────────────────────────────────────────

interface ToolMeta {
  label: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  features: string[]
  includedIn: string
  requiredTiers: string[]
  minTierLabel: string
}

const TOOL_META: Record<string, ToolMeta> = {
  'title-giving': {
    label: 'Title Giving',
    description: 'Automatically assigns and rotates kingdom titles (Duke, Architect, Justice, Scientist) on a configurable schedule — 24/7, without you needing to be online.',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    features: ['Configurable rotation schedule', 'Priority player lists', 'Alliance-based rules', 'Auto skip offline players'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
    requiredTiers: BASIC_AND_UP,
    minTierLabel: 'Basic',
  },
  'fort-tracking': {
    label: 'Fort Tracking',
    description: 'Monitors fort attack and defense activity in real time, logging all events with timestamps to your dashboard and sending Discord alerts the moment a fort comes under attack.',
    icon: Flag,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    features: ['Real-time attack alerts', 'Defence log with timestamps', 'Alliance fort assignments', 'Export to CSV'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
    requiredTiers: BASIC_AND_UP,
    minTierLabel: 'Basic',
  },
  'player-finder': {
    label: 'Player Finder',
    description: 'Search for players by name, governor ID, or alliance tag across all connected kingdoms — pull power, kill counts, alliance membership, and profile snapshots without opening the game.',
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    features: ['Cross-kingdom search', 'Search by name, ID, or alliance', 'Power & kill filters', 'Alliance membership lookup', 'Profile snapshot'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
    requiredTiers: BASIC_AND_UP,
    minTierLabel: 'Basic',
  },
  'alliance-activity': {
    label: 'Alliance Activity',
    description: 'Full alliance analytics suite — track gift contributions, monitor member activity, compare performance, and get automated reports with storehouse analytics.',
    icon: Activity,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    features: ['Alliance Gift Tracking', 'Member Activity Tracking', 'Member Comparison', 'Automated Reports', 'Performance Analytics', 'Alliance Storehouse Analytics'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
    requiredTiers: BASIC_AND_UP,
    minTierLabel: 'Basic',
  },
  'alliance-mob': {
    label: 'Alliance Mobilization',
    description: 'Detects fort attacks or rally launches and instantly sends coordinated mobilization messages in alliance chat with target coordinates. Configurable cooldown to prevent spam.',
    icon: Bell,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    features: ['Auto-ping rallies & war actions', 'Configurable message templates', 'Auto trigger on fort attack', 'Cooldown to prevent spam', 'Target coordinate injection', 'Auto Refresh Mobilization (Legendary)'],
    includedIn: 'Alliance Control Elite & Legendary',
    requiredTiers: ELITE_AND_UP,
    minTierLabel: 'Elite',
  },
  'alliance-tracker': {
    label: 'Alliance Tracker',
    description: 'Live tracking for forts, flags, building and repair timers, under attack alerts, and — on Legendary — full flag & fort placement with coordinates, KvK maps, and real-time map updates.',
    icon: Map,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    features: [
      'Fort & Flag Tracking',
      'Building Time Tracking',
      'Repair Time Tracking',
      'Under Attack Alerts',
      'Burning / Destruction Timers',
      'Alerts on Dashboard + Discord',
      'Flag & Fort Placement with coordinates (Legendary)',
      'Home Kingdom + KvK maps (Legendary)',
      'Real-time map updates (Legendary)',
    ],
    includedIn: 'Alliance Control Elite & Legendary',
    requiredTiers: ELITE_AND_UP,
    minTierLabel: 'Elite',
  },
  'alliance-rank-manager': {
    label: 'Alliance Rank Manager',
    description: 'Automatically assigns and manages alliance ranks and Discord roles based on configurable rules — keeps your rank structure consistent without manual updates.',
    icon: Users,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    features: ['Auto assign ranks & roles', 'Configurable rank rules', 'Discord role sync', 'Rank history tracking'],
    includedIn: 'Alliance Control Elite & Legendary',
    requiredTiers: ELITE_AND_UP,
    minTierLabel: 'Elite',
  },
  'fort-finder': {
    label: 'Barbarian Fort Finder',
    description: 'Automatically locates barbarian forts across your kingdom map, giving you coordinates and status so you can deploy efficiently without manually scouting.',
    icon: LocateFixed,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    features: ['Locate forts across the full map', 'Coordinates + status per fort', 'Linked to Kingdom + KvK maps', 'Updated with map refresh'],
    includedIn: 'Alliance Control Legendary',
    requiredTiers: LEGENDARY_ONLY,
    minTierLabel: 'Legendary',
  },
  'auto-mobilization': {
    label: 'Auto Refresh Mobilization',
    description: 'Extends Alliance Mobilization with automatic refresh — mobilization alerts stay active and re-trigger without requiring manual re-activation.',
    icon: RefreshCw,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    features: ['Automatically refresh mobilization alerts', 'No manual re-activation needed', 'Works alongside Alliance Mobilization', 'Configurable refresh intervals'],
    includedIn: 'Alliance Control Legendary',
    requiredTiers: LEGENDARY_ONLY,
    minTierLabel: 'Legendary',
  },
}

interface BotToolContentProps {
  toolId: string
  onNavigate?: (tab: string) => void
}

export function BotToolContent({ toolId, onNavigate }: BotToolContentProps) {
  const meta = TOOL_META[toolId]
  const [activeTier, setActiveTier] = useState<string | null>(null)

  useEffect(() => {
    if (!meta) return
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        const order = data.orders?.find((o: { items: Array<{toolId: string}>, status: string }) =>
          (o.status === 'active' || o.status === 'confirmed') &&
          o.items?.some((i) => meta.requiredTiers.includes(i.toolId))
        )
        if (order) {
          const item = order.items?.find((i: {toolId: string}) => meta.requiredTiers.includes(i.toolId))
          setActiveTier(item?.toolId ?? null)
        }
      })
      .catch(() => {})
  }, [toolId, meta])

  if (!meta) return null

  const Icon = meta.icon
  const hasPurchased = !!activeTier
  const TierIcon = activeTier ? (TIER_ICONS[activeTier] ?? Zap) : null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Tool info card */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-6">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', meta.bg)}>
            <Icon className={cn('h-6 w-6', meta.color)} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{meta.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg">{meta.description}</p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Included in: <span className="text-primary font-medium">{meta.includedIn}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {meta.features.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="h-1.5 w-1.5 shrink-0 fill-primary text-primary" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {hasPurchased ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-10 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 mb-4">
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Active</h3>
          {activeTier && TierIcon && (
            <div className="flex items-center gap-1.5 mb-3">
              <TierIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">{TIER_LABELS[activeTier]}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground max-w-sm">
            {meta.label} is active for your kingdom. Staff have it configured and running. Reach out in your Discord ticket if you need any changes.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/60 p-10 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 mb-4">
            <Lock className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Not yet active</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-2">
            {meta.label} is included in <span className="text-foreground font-medium">Alliance Control {meta.minTierLabel}</span> and above.
            Purchase a plan from the Bot Store and staff will configure everything for you.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6">
            From $19/mo · Payment via PayPal after staff review
          </p>
          <button
            onClick={() => onNavigate?.('bot-tools-home')}
            className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/20 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/25 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            View Plans in Bot Store
          </button>
        </div>
      )}
    </div>
  )
}

// ─── KvK scanner redirect ─────────────────────────────────────────────────────
// kvk-scanner is handled by KvkScannerContent — this export is unused but kept
// to avoid any stale imports. The actual page is rendered via content-panel.tsx.
export { ScanSearch }
