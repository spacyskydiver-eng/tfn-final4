'use client'

import { useAuth } from '@/lib/auth-context'
import {
  CalendarDays,
  BookOpen,
  Wrench,
  Users,
  Calculator,
  TrendingUp,
  Swords,
  Crown,
  Map,
  Boxes,
  Receipt,
  CrosshairIcon,
  Flag,
  Search,
  Bell,
  MessageSquare,
  ScanSearch,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  DATA                                                                */
/* ------------------------------------------------------------------ */

const quickLinks = [
  { id: 'kvk',               icon: CrosshairIcon, label: 'KvK Tracker',       color: 'text-red-400',     bg: 'bg-red-400/10'     },
  { id: 'commander',         icon: Crown,         label: 'Commander Prep',    color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  { id: 'calendar',          icon: CalendarDays,  label: 'Calendar',          color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
  { id: 'guides',            icon: BookOpen,      label: 'Guides',            color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'general-tools',     icon: Wrench,        label: 'General Tools',     color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  { id: 'accounts',          icon: Users,         label: 'Accounts',          color: 'text-violet-400',  bg: 'bg-violet-400/10'  },
  { id: 'calculator',        icon: Calculator,    label: 'Calculator',        color: 'text-rose-400',    bg: 'bg-rose-400/10'    },
  { id: 'progression-plans', icon: TrendingUp,    label: 'Progression Plans', color: 'text-cyan-400',    bg: 'bg-cyan-400/10'    },
  { id: 'bundles',           icon: Boxes,         label: 'Bundles',           color: 'text-orange-400',  bg: 'bg-orange-400/10'  },
  { id: 'spending',          icon: Receipt,       label: 'Spending Tracker',  color: 'text-pink-400',    bg: 'bg-pink-400/10'    },
  { id: 'territory-planner', icon: Map,           label: 'Territory Planner', color: 'text-teal-400',    bg: 'bg-teal-400/10'    },
]

const botTools = [
  {
    id: 'kvk-scanner',
    icon: ScanSearch,
    label: 'KvK Scanner',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
    description: 'Automated kill & DKP tracking across your KvK. Bot scans leaderboards and logs player stats in real time.',
    badge: 'Most Popular',
    badgeColor: 'bg-violet-400/15 text-violet-400',
  },
  {
    id: 'title-giving',
    icon: Crown,
    label: 'Title Giving',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    description: 'Automate title rotations for your alliance. Bot cycles Attack, Architect, Scientist and more on a schedule.',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'fort-tracking',
    icon: Flag,
    label: 'Fort Tracking',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    description: 'Track fort captures and contributions during KvK. Keep a live record of which players took which forts.',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'player-finder',
    icon: Search,
    label: 'Player Finder',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
    description: 'Search for any governor by ID or name across kingdoms. View power, kills, and alliance info instantly.',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'alliance-mob',
    icon: Bell,
    label: 'Alliance Mobilization',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    description: 'Send mass rally calls and coordination pings to your alliance via Discord. Get everyone moving fast.',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'discord-verify',
    icon: MessageSquare,
    label: 'Discord Verification',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/20',
    description: 'Auto-verify members in your Discord server by screenshot. Assigns roles based on alliance tag — free up to 250/month.',
    badge: 'Free Tier',
    badgeColor: 'bg-emerald-400/15 text-emerald-400',
  },
]

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export function HomeContent({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { user } = useAuth()

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome banner */}
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {user ? `Welcome back, ${user.username}` : 'Welcome to RoK Toolkit'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
              Your all-in-one dashboard for Rise of Kingdoms. Track accounts, plan upgrades,
              calculate costs, automate with bots, and stay on top of events.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access — all tools */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Access
        </h3>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {quickLinks.map(link => {
            const Icon = link.icon
            return (
              <button
                key={link.id}
                onClick={() => onTabChange?.(link.id)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/60 backdrop-blur-sm px-3 py-4 transition-all hover:border-primary/30 hover:bg-card hover:shadow-md hover:shadow-primary/5 cursor-pointer"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${link.bg}`}>
                  <Icon className={`h-4 w-4 ${link.color}`} />
                </div>
                <span className="text-[11px] font-medium text-foreground text-center leading-tight">{link.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bot Tools */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Bot Tools
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automation and tracking bots for your kingdom
            </p>
          </div>
          <button
            onClick={() => onTabChange?.('bot-tools-home')}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            View store
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {botTools.map(tool => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onTabChange?.(tool.id)}
                className={`group flex flex-col gap-3 rounded-xl border ${tool.border} bg-card/60 backdrop-blur-sm p-4 text-left transition-all hover:bg-card hover:shadow-md hover:shadow-primary/5 cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tool.bg}`}>
                      <Icon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{tool.label}</span>
                  </div>
                  {tool.badge && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                <div className={`flex items-center gap-1 text-[11px] font-medium ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Open tool <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Bot store CTA */}
        <button
          onClick={() => onTabChange?.('bot-tools-home')}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/30 py-3.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Browse all bot tools in the store
        </button>
      </div>
    </div>
  )
}
