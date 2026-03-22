'use client'

import { useState, useEffect } from 'react'
import { Crown, Flag, Search, Bell, Lock, ShoppingCart, Circle, CheckCircle, Star, Zap, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

// Which Alliance Control tiers include each tool
const TOOL_TIERS: Record<string, { tiers: string[]; minTier: string }> = {
  'title-giving':  { tiers: ['alliance-basic', 'alliance-elite', 'alliance-legendary'], minTier: 'Basic' },
  'fort-tracking': { tiers: ['alliance-basic', 'alliance-elite', 'alliance-legendary'], minTier: 'Basic' },
  'player-finder': { tiers: ['alliance-basic', 'alliance-elite', 'alliance-legendary'], minTier: 'Basic' },
  'alliance-mob':  { tiers: ['alliance-elite', 'alliance-legendary'],                   minTier: 'Elite' },
}

const TOOL_META: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  features: string[]
  includedIn: string
}> = {
  'title-giving': {
    label: 'Title Giving',
    description: 'Automatically assigns and rotates kingdom titles (Duke, Architect, Justice, Scientist) on a configurable schedule — 24/7, without you having to be online.',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    features: ['Configurable rotation schedule', 'Priority player lists', 'Alliance-based rules', 'Auto skip offline players'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
  },
  'fort-tracking': {
    label: 'Fort Tracking',
    description: 'Monitors fort attack and defense activity in real time, logging all events with timestamps to your dashboard and sending Discord alerts on attack.',
    icon: Flag,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    features: ['Real-time attack alerts', 'Defence log with timestamps', 'Alliance fort assignments', 'Export to CSV'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
  },
  'player-finder': {
    label: 'Player Finder',
    description: 'Searches for players by name, governor ID, or alliance tag across all connected kingdoms — pull power, kills, alliance membership, and profile snapshots without opening the game.',
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    features: ['Cross-kingdom search', 'Power & kill filters', 'Alliance membership lookup', 'Profile snapshot'],
    includedIn: 'Alliance Control Basic, Elite & Legendary',
  },
  'alliance-mob': {
    label: 'Alliance Mobilization',
    description: 'Detects fort attacks or rally launches and instantly sends a coordinated mobilization message in alliance chat with target coordinates. Configurable cooldown to prevent spam.',
    icon: Bell,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    features: ['Configurable message templates', 'Auto trigger on fort attack', 'Cooldown to prevent spam', 'Target coordinate injection'],
    includedIn: 'Alliance Control Elite & Legendary',
  },
}

const TIER_ICONS: Record<string, React.ElementType> = {
  'alliance-basic':     Zap,
  'alliance-elite':     Star,
  'alliance-legendary': Trophy,
}

const TIER_LABELS: Record<string, string> = {
  'alliance-basic':     'Basic',
  'alliance-elite':     'Elite',
  'alliance-legendary': 'Legendary',
}

interface BotToolContentProps {
  toolId: string
  onNavigate?: (tab: string) => void
}

export function BotToolContent({ toolId, onNavigate }: BotToolContentProps) {
  const meta = TOOL_META[toolId]
  const tierConfig = TOOL_TIERS[toolId]
  const [activeTier, setActiveTier] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        const order = data.orders?.find((o: { items: Array<{toolId: string}>, status: string }) =>
          (o.status === 'active' || o.status === 'confirmed') &&
          o.items?.some((i) => tierConfig?.tiers.includes(i.toolId))
        )
        if (order) {
          const item = order.items?.find((i: {toolId: string}) => tierConfig?.tiers.includes(i.toolId))
          setActiveTier(item?.toolId ?? null)
        }
      })
      .catch(() => {})
  }, [toolId, tierConfig])

  if (!meta || !tierConfig) return null

  const Icon = meta.icon
  const hasPurchased = !!activeTier

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

        {/* Feature list */}
        <div className="mt-5 grid grid-cols-2 gap-2">
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
          {activeTier && (
            <div className="flex items-center gap-1.5 mb-3">
              {(() => { const TierIcon = TIER_ICONS[activeTier]; return TierIcon ? <TierIcon className="h-3.5 w-3.5 text-primary" /> : null })()}
              <span className="text-xs text-primary font-medium">Alliance Control {TIER_LABELS[activeTier]}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground max-w-sm">
            {meta.label} is active for your kingdom. Our staff have it configured and running. Reach out in your Discord ticket if you need changes.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/60 p-10 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 mb-4">
            <Lock className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Not yet active</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-2">
            {meta.label} is included in the <span className="text-foreground font-medium">Alliance Control {tierConfig.minTier}</span> plan and above.
            Purchase a plan from the Bot Store and staff will configure everything for you.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6">
            Starts from $19/mo · Payment via PayPal after staff review
          </p>
          <button
            onClick={() => onNavigate?.('bot-tools-home')}
            className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/20 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/25 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            View Alliance Control Plans
          </button>
        </div>
      )}
    </div>
  )
}
