'use client'

import { useState, useEffect } from 'react'
import { Crown, Flag, Search, Bell, MessageSquare, Lock, ShoppingCart, Circle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOOL_META: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  features: string[]
}> = {
  'title-giving': {
    label: 'Title Giving',
    description: 'Automatically assigns and rotates kingdom titles (Duke, Architect, Justice, Scientist) on a configurable schedule.',
    icon: Crown,
    color: 'text-amber-400',
    features: ['Configurable rotation schedule', 'Priority player lists', 'Alliance-based rules', 'Auto skip offline players'],
  },
  'fort-tracking': {
    label: 'Fort Tracking',
    description: 'Monitors fort attack and defense activity in real time, logging all events to your dashboard.',
    icon: Flag,
    color: 'text-red-400',
    features: ['Real-time attack alerts', 'Defence log with timestamps', 'Alliance fort assignments', 'Export to CSV'],
  },
  'player-finder': {
    label: 'Player Finder',
    description: 'Searches for players by name, governor ID, or alliance tag across all connected kingdoms.',
    icon: Search,
    color: 'text-blue-400',
    features: ['Cross-kingdom search', 'Power & kill filters', 'Alliance membership lookup', 'Profile snapshot'],
  },
  'alliance-mob': {
    label: 'Alliance Mobilization',
    description: 'Sends coordinated mobilization messages to alliance chat when a rally or fort needs reinforcements.',
    icon: Bell,
    color: 'text-violet-400',
    features: ['Configurable message templates', 'Auto trigger on fort attack', 'Cooldown to prevent spam', 'Target coordinate injection'],
  },
  'discord-verify': {
    label: 'Discord Verification',
    description: 'Links Discord accounts to in-game governor IDs via a verification flow, auto-assigning Discord roles.',
    icon: MessageSquare,
    color: 'text-indigo-400',
    features: ['Governor ID verification', 'Auto role assignment', 'Kingdom & alliance roles', 'Re-verification on power change'],
  },
}

interface BotToolContentProps {
  toolId: string
  onNavigate?: (tab: string) => void
}

export function BotToolContent({ toolId, onNavigate }: BotToolContentProps) {
  const meta = TOOL_META[toolId]
  const [hasPurchased, setHasPurchased] = useState(false)

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        const purchased = data.orders?.some((o: { items: Array<{toolId: string}>, status: string }) =>
          (o.status === 'active' || o.status === 'confirmed') &&
          o.items?.some((i) => i.toolId === toolId)
        )
        setHasPurchased(!!purchased)
      })
      .catch(() => {})
  }, [toolId])

  if (!meta) return null

  const Icon = meta.icon

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Tool info card */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-6">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10')}>
            <Icon className={cn('h-6 w-6', meta.color)} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{meta.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg">{meta.description}</p>
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
          <h3 className="text-base font-semibold text-foreground mb-2">Purchase Confirmed</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Our staff are setting up {meta.label} for your kingdom. This usually takes up to 24 hours after payment. You&apos;ll be notified in your Discord ticket when it&apos;s live.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/60 p-10 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 mb-4">
            <Lock className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Bot not yet active</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            This tool is not yet set up for your kingdom. Purchase it from the Bot Store — our staff will configure and activate it for you after payment.
          </p>
          <button
            onClick={() => onNavigate?.('bot-tools-home')}
            className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/20 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/25 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            Go to Bot Store
          </button>
        </div>
      )}
    </div>
  )
}
