'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronDown, ChevronUp, Search, Download, Edit2, Check, X,
  Trophy, Swords, Skull, Shield, Zap, Users, Map as MapIcon,
  Target, Clock, Trash2, ToggleLeft, ToggleRight, ScanSearch, Loader2, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { CreateKvkModal } from '@/components/create-kvk-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  rank: number; govId: string; name: string; alliance: string
  dkp: number; dkpTarget: number; goalPct: number
  power: number; basePower: number
  t4Kills: number; t5Kills: number; totalKp: number
  t4Deads: number; t5Deads: number; totalDeads: number; deadTarget: number
  honorPoints: number; preKvkScore: number
}

interface Kingdom {
  id: number; camp: string
  t4Kills: number; t5Kills: number; kp: number
  dead: number; healed: number; acclaim: number; dkp: number
}

interface DkpFormula { dead: number; t4: number; t5: number }

interface PlayerGoal {
  govId: string; name: string
  dkpGoal: number; t4KillGoal: number; t5KillGoal: number; deadGoal: number
}

interface ScanSchedule {
  id: string; label: string; cronExpr: string; scanType: string; topN: number; enabled: boolean
}

// ─── Scan schedule constants ──────────────────────────────────────────────────

const CRON_PRESETS = [
  { label: 'Daily 6am UTC',    value: '0 6 * * *'   },
  { label: 'Daily 6pm UTC',    value: '0 18 * * *'  },
  { label: '6am + 6pm daily',  value: '0 6,18 * * *'},
  { label: 'Every 12 hours',   value: '0 */12 * * *'},
  { label: 'Every 6 hours',    value: '0 */6 * * *' },
  { label: 'Manual only',      value: '@manual'     },
  { label: 'Custom...',        value: 'custom'      },
]

const SCAN_TYPES = ['dkp', 'pre-kvk', 'honor', 'all']

// ─── Camp config ──────────────────────────────────────────────────────────────

const CAMP_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Fire:         { bg:'bg-red-500/15',    text:'text-red-400',    border:'border-red-500/30',    glow:'#ef4444' },
  Earth:        { bg:'bg-amber-600/15',  text:'text-amber-500',  border:'border-amber-600/30',  glow:'#d97706' },
  Water:        { bg:'bg-blue-500/15',   text:'text-blue-400',   border:'border-blue-500/30',   glow:'#3b82f6' },
  Wind:         { bg:'bg-violet-500/15', text:'text-violet-400', border:'border-violet-500/30', glow:'#8b5cf6' },
  Daybreak:     { bg:'bg-yellow-500/15', text:'text-yellow-400', border:'border-yellow-500/30', glow:'#eab308' },
  Greenwood:    { bg:'bg-green-500/15',  text:'text-green-400',  border:'border-green-500/30',  glow:'#22c55e' },
  Northumbria:  { bg:'bg-purple-500/15', text:'text-purple-400', border:'border-purple-500/30', glow:'#a855f7' },
  Mercia:       { bg:'bg-red-600/15',    text:'text-red-500',    border:'border-red-600/30',    glow:'#dc2626' },
  'East Anglia':{ bg:'bg-cyan-500/15',   text:'text-cyan-400',   border:'border-cyan-500/30',   glow:'#06b6d4' },
  Wessex:       { bg:'bg-yellow-600/15', text:'text-yellow-500', border:'border-yellow-600/30', glow:'#ca8a04' },
  'Seth I':     { bg:'bg-red-500/15',    text:'text-red-400',    border:'border-red-500/30',    glow:'#ef4444' },
  'Seth III':   { bg:'bg-red-500/15',    text:'text-red-400',    border:'border-red-500/30',    glow:'#ef4444' },
  'Seth V':     { bg:'bg-red-500/15',    text:'text-red-400',    border:'border-red-500/30',    glow:'#ef4444' },
  'Horus II':   { bg:'bg-blue-500/15',   text:'text-blue-400',   border:'border-blue-500/30',   glow:'#3b82f6' },
  'Horus IV':   { bg:'bg-blue-500/15',   text:'text-blue-400',   border:'border-blue-500/30',   glow:'#3b82f6' },
  'Horus VI':   { bg:'bg-blue-500/15',   text:'text-blue-400',   border:'border-blue-500/30',   glow:'#3b82f6' },
}

const CAMP_HEX: Record<string, string> = {
  Fire:'#ef4444', Earth:'#d97706', Water:'#3b82f6', Wind:'#8b5cf6',
  Daybreak:'#eab308', Greenwood:'#22c55e', Northumbria:'#a855f7',
  Mercia:'#dc2626', 'East Anglia':'#06b6d4', Wessex:'#ca8a04',
  'Seth I':'#ef4444', 'Seth III':'#ef4444', 'Seth V':'#ef4444',
  'Horus II':'#3b82f6', 'Horus IV':'#3b82f6', 'Horus VI':'#3b82f6',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="mt-1 h-0.5 w-full rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color ?? 'hsl(var(--primary))' }} />
    </div>
  )
}

// ─── KvK Map ──────────────────────────────────────────────────────────────────

const KVK_MAP_LAYOUTS: Record<string, Array<{ camp: string; x: number; y: number; w: number; h: number }>> = {
  'heroic-anthem': [
    { camp:'Fire',  x:2,  y:2,  w:44, h:46 },
    { camp:'Earth', x:54, y:2,  w:44, h:46 },
    { camp:'Water', x:2,  y:52, w:44, h:46 },
    { camp:'Wind',  x:54, y:52, w:44, h:46 },
  ],
  'tides-of-war': [
    { camp:'Fire',  x:2,  y:2,  w:43, h:43 },
    { camp:'Earth', x:54, y:2,  w:44, h:43 },
    { camp:'Water', x:2,  y:54, w:38, h:44 },
    { camp:'Wind',  x:54, y:54, w:44, h:44 },
  ],
  'warriors-unbound': [
    { camp:'Fire',      x:2,  y:2,  w:33, h:38 },
    { camp:'Earth',     x:36, y:2,  w:33, h:38 },
    { camp:'Wind',      x:70, y:2,  w:28, h:38 },
    { camp:'Daybreak',  x:2,  y:54, w:33, h:44 },
    { camp:'Greenwood', x:30, y:54, w:38, h:44 },
    { camp:'Water',     x:65, y:54, w:33, h:44 },
  ],
  'king-of-britain': [
    { camp:'Northumbria',  x:18, y:2,  w:62, h:32 },
    { camp:'Mercia',       x:2,  y:28, w:38, h:44 },
    { camp:'East Anglia',  x:54, y:28, w:44, h:44 },
    { camp:'Wessex',       x:8,  y:66, w:82, h:32 },
  ],
  'king-of-nile': [
    { camp:'Seth I',   x:2,  y:8,  w:35, h:40 },
    { camp:'Horus II', x:38, y:2,  w:35, h:32 },
    { camp:'Seth III', x:60, y:8,  w:38, h:36 },
    { camp:'Horus VI', x:2,  y:58, w:30, h:40 },
    { camp:'Seth V',   x:38, y:60, w:32, h:38 },
    { camp:'Horus IV', x:68, y:56, w:30, h:42 },
  ],
}

function KvkMap({ kvkType }: { kvkType: string }) {
  const layout = KVK_MAP_LAYOUTS[kvkType] ?? KVK_MAP_LAYOUTS['heroic-anthem']
  const imagePath = `/maps/${kvkType}.png`

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50" style={{ aspectRatio: '4/3' }}>
      {/* Terrain PNG — place files in /public/maps/<kvkType>.png */}
      <img
        src={imagePath}
        alt="KvK terrain"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {/* Dark overlay so camp labels stay readable */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Fallback terrain for when PNG is absent */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, #1a2e1a 0%, #0d1f0d 40%, #0a150a 100%)' }}
      />
      {/* Camp overlays */}
      {layout.map(({ camp, x, y, w, h }) => {
        const color = CAMP_HEX[camp] ?? '#888'
        return (
          <div
            key={camp}
            className="absolute flex items-center justify-center rounded"
            style={{
              left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`,
              background: `${color}28`,
              border: `1.5px solid ${color}60`,
            }}
          >
            <span
              className="select-none text-center text-xs font-bold leading-tight drop-shadow-lg"
              style={{ color, textShadow: `0 0 12px ${color}` }}
            >
              {camp}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({ title, icon: Icon, defaultOpen = true, badge, children }: {
  title: string; icon: React.ElementType; defaultOpen?: boolean; badge?: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border/50">{children}</div>}
    </div>
  )
}

// ─── Per-tab table ─────────────────────────────────────────────────────────────

function PlayersTable({
  players,
  tab,
  maxDkp, maxPower, maxT4, maxHonor, maxPreKvk,
}: {
  players: Player[]
  tab: 'dkp' | 'pre-kvk' | 'honor' | 'summary'
  maxDkp: number; maxPower: number; maxT4: number; maxHonor: number; maxPreKvk: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pl-2 text-left w-8">#</th>
            <th className="pb-2 text-left">Player</th>

            {tab === 'dkp' && <>
              <th className="pb-2 pr-6 text-right">DKP Score</th>
              <th className="pb-2 pr-6 text-right">Power</th>
              <th className="pb-2 pr-6 text-right">T4 Kills</th>
              <th className="pb-2 pr-6 text-right">T5 Kills</th>
              <th className="pb-2 pr-6 text-right">KP</th>
              <th className="pb-2 pr-6 text-right">T4 Deads</th>
              <th className="pb-2 pr-2 text-right">T5 Deads</th>
            </>}

            {tab === 'pre-kvk' && <>
              <th className="pb-2 pr-6 text-right">Pre-KvK Score</th>
              <th className="pb-2 pr-2 text-right">Power</th>
            </>}

            {tab === 'honor' && <>
              <th className="pb-2 pr-6 text-right">Power</th>
              <th className="pb-2 pr-2 text-right">Honor Points</th>
            </>}

            {tab === 'summary' && <>
              <th className="pb-2 pr-6 text-right">DKP Score</th>
              <th className="pb-2 pr-6 text-right">Power</th>
              <th className="pb-2 pr-6 text-right">T4 Kills</th>
              <th className="pb-2 pr-6 text-right">T5 Kills</th>
              <th className="pb-2 pr-6 text-right">KP</th>
              <th className="pb-2 pr-2 text-right">Honor</th>
            </>}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.govId} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pl-2 text-muted-foreground font-mono">{p.rank}</td>
              <td className="py-3">
                <div className="font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">#{p.govId} · <span className="text-primary">[{p.alliance}]</span></div>
              </td>

              {tab === 'dkp' && <>
                <td className="py-3 pr-6 text-right">
                  <div className="font-semibold text-primary tabular-nums">{fmt(p.dkp)}</div>
                  <div className="text-xs text-muted-foreground">{p.goalPct}% of goal</div>
                  <Bar value={p.dkp} max={maxDkp} />
                </td>
                <td className="py-3 pr-6 text-right">
                  <div className="tabular-nums">{fmt(p.power)}</div>
                  <Bar value={p.power} max={maxPower} color="#3b82f6" />
                </td>
                <td className="py-3 pr-6 text-right">
                  <div className="tabular-nums">{fmt(p.t4Kills)}</div>
                  <Bar value={p.t4Kills} max={maxT4} color="#8b5cf6" />
                </td>
                <td className="py-3 pr-6 text-right">
                  <div className="tabular-nums">{fmt(p.t5Kills)}</div>
                  <Bar value={p.t5Kills} max={players.length ? Math.max(...players.map(x => x.t5Kills)) : 1} color="#6366f1" />
                </td>
                <td className="py-3 pr-6 text-right tabular-nums">{fmt(p.totalKp)}</td>
                <td className="py-3 pr-6 text-right text-red-400 tabular-nums">{fmt(p.t4Deads)}</td>
                <td className="py-3 pr-2 text-right text-red-400 tabular-nums">{fmt(p.t5Deads)}</td>
              </>}

              {tab === 'pre-kvk' && <>
                <td className="py-3 pr-6 text-right">
                  <div className="font-semibold text-blue-400 tabular-nums">{fmt(p.preKvkScore)}</div>
                  <Bar value={p.preKvkScore} max={maxPreKvk} color="#3b82f6" />
                </td>
                <td className="py-3 pr-2 text-right">
                  <div className="tabular-nums">{fmt(p.power)}</div>
                  <Bar value={p.power} max={maxPower} color="#6366f1" />
                </td>
              </>}

              {tab === 'honor' && <>
                <td className="py-3 pr-6 text-right">
                  <div className="tabular-nums">{fmt(p.power)}</div>
                  <Bar value={p.power} max={maxPower} color="#3b82f6" />
                </td>
                <td className="py-3 pr-2 text-right">
                  <div className="font-semibold text-amber-400 tabular-nums">{fmt(p.honorPoints)}</div>
                  <Bar value={p.honorPoints} max={maxHonor} color="#f59e0b" />
                </td>
              </>}

              {tab === 'summary' && <>
                <td className="py-3 pr-6 text-right">
                  <div className="font-semibold text-primary tabular-nums">{fmt(p.dkp)}</div>
                  <div className="text-xs text-muted-foreground">{p.goalPct}% of goal</div>
                  <Bar value={p.dkp} max={maxDkp} />
                </td>
                <td className="py-3 pr-6 text-right">
                  <div className="tabular-nums">{fmt(p.power)}</div>
                  <Bar value={p.power} max={maxPower} color="#3b82f6" />
                </td>
                <td className="py-3 pr-6 text-right tabular-nums">{fmt(p.t4Kills)}</td>
                <td className="py-3 pr-6 text-right tabular-nums">{fmt(p.t5Kills)}</td>
                <td className="py-3 pr-6 text-right tabular-nums">{fmt(p.totalKp)}</td>
                <td className="py-3 pr-2 text-right text-amber-400 tabular-nums">{fmt(p.honorPoints)}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface KvkScannerContentProps {
  onNavigate?: (tab: string) => void
}

export function KvkScannerContent({ onNavigate }: KvkScannerContentProps = {}) {
  useAuth()
  const isLeader = true // all users have leadership for testing

  // API state
  const [players, setPlayers] = useState<Player[]>([])
  const [kingdoms, setKingdoms] = useState<Kingdom[]>([])
  const [loading, setLoading] = useState(true)
  const [activeKvkId, setActiveKvkId] = useState<string | null>(null)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [purchaseBundle, setPurchaseBundle] = useState<string | undefined>()
  const [purchaseIsSoC, setPurchaseIsSoC] = useState<boolean | undefined>()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Fetch user's KvKs and orders on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/kvk').then(r => r.json()).catch(() => ({ kvks: [] })),
      fetch('/api/orders').then(r => r.json()).catch(() => ({ orders: [] })),
    ]).then(([kvkData, orderData]) => {
      const active = kvkData.kvks?.find((k: { status: string }) => k.status === 'active')
      if (active) setActiveKvkId(active.id)
      const pending = kvkData.kvks?.find((k: { status: string }) => k.status === 'pending')
      if (pending && !active) setSubmitted(true)

      const order = orderData.orders?.find((o: { items: Array<{toolId: string; bundle?: string; isSoC?: boolean}>, status: string }) =>
        (o.status === 'active' || o.status === 'confirmed') &&
        o.items?.some((i) => i.toolId === 'kvk-scanner')
      )
      if (order) {
        setHasPurchased(true)
        const item = order.items?.find((i: {toolId: string}) => i.toolId === 'kvk-scanner')
        if (item?.bundle) setPurchaseBundle(item.bundle)
        if (item?.isSoC !== undefined) setPurchaseIsSoC(item.isSoC)
      }
    }).finally(() => setLoading(false))
  }, [])

  const [activeTab, setActiveTab] = useState<'dkp' | 'pre-kvk' | 'honor' | 'summary'>('dkp')
  const [search, setSearch] = useState('')
  const [activeCamp, setActiveCamp] = useState('All')
  const [kdFilter, setKdFilter] = useState('All KDs')
  const [campFilter, setCampFilter] = useState('All Camps')
  const [editingFormula, setEditingFormula] = useState(false)
  const [formula, setFormula] = useState<DkpFormula>({ dead: 12, t4: 4, t5: 8 })
  const [formulaDraft, setFormulaDraft] = useState<DkpFormula>(formula)
  const [kvkType, setKvkType] = useState('heroic-anthem')

  // Goals
  const [goals, setGoals] = useState<PlayerGoal[]>([])
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalDraft, setGoalDraft] = useState<PlayerGoal | null>(null)

  // Schedules
  const [schedules, setSchedules] = useState<ScanSchedule[]>([])
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [newSched, setNewSched] = useState({ label: '', cronPreset: '0 6 * * *', cronCustom: '', scanType: 'dkp', topN: 300 })

  const TABS = [
    { id: 'dkp',     label: 'DKP Score',        icon: Trophy },
    { id: 'pre-kvk', label: 'Pre-KvK Rankings', icon: Swords },
    { id: 'honor',   label: 'Honor Rankings',   icon: Shield },
    { id: 'summary', label: 'Summary',          icon: Zap },
  ]

  const KVK_TYPES = [
    { id:'heroic-anthem',    label:'Heroic Anthem'      },
    { id:'tides-of-war',     label:'Tides Of War'       },
    { id:'warriors-unbound', label:'Warriors Unbound'   },
    { id:'king-of-britain',  label:'King of All Britain'},
    { id:'king-of-nile',     label:'King of the Nile'   },
  ]

  const allCamps     = useMemo(() => ['All', ...Array.from(new Set(kingdoms.map(k => k.camp)))], [kingdoms])
  const allKds       = useMemo(() => ['All KDs', ...kingdoms.map(k => String(k.id))], [kingdoms])
  const allCampNames = useMemo(() => ['All Camps', ...Array.from(new Set(kingdoms.map(k => k.camp)))], [kingdoms])

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.toLowerCase()
    return players.filter(p =>
      p.name.toLowerCase().includes(q) || p.govId.includes(q) || p.alliance.toLowerCase().includes(q)
    )
  }, [search, players])

  // Sort by tab
  const sortedPlayers = useMemo(() => {
    const list = [...filteredPlayers]
    if (activeTab === 'pre-kvk') return list.sort((a, b) => b.preKvkScore - a.preKvkScore)
    if (activeTab === 'honor')   return list.sort((a, b) => b.honorPoints - a.honorPoints)
    return list
  }, [filteredPlayers, activeTab])

  const filteredKingdoms = useMemo(() => {
    if (activeCamp === 'All') return kingdoms
    return kingdoms.filter(k => k.camp === activeCamp)
  }, [activeCamp, kingdoms])

  const detailedPlayers = useMemo(() => {
    let list = players
    if (kdFilter !== 'All KDs') list = list.slice(0, 3)
    if (campFilter !== 'All Camps') list = list.slice(0, 5)
    return list
  }, [kdFilter, campFilter, players])

  const maxDkp    = players.length ? Math.max(...players.map(p => p.dkp))         : 1
  const maxPower  = players.length ? Math.max(...players.map(p => p.power))       : 1
  const maxT4     = players.length ? Math.max(...players.map(p => p.t4Kills))     : 1
  const maxHonor  = players.length ? Math.max(...players.map(p => p.honorPoints)) : 1
  const maxPreKvk = players.length ? Math.max(...players.map(p => p.preKvkScore)) : 1
  const maxKdDkp  = kingdoms.length ? Math.max(...kingdoms.map(k => k.dkp))       : 1
  const maxKdT4   = kingdoms.length ? Math.max(...kingdoms.map(k => k.t4Kills))   : 1

  const totalT4   = players.reduce((s, p) => s + p.t4Kills, 0)
  const totalT5   = players.reduce((s, p) => s + p.t5Kills, 0)
  const totalKp   = players.reduce((s, p) => s + p.totalKp, 0)
  const totalDead = players.reduce((s, p) => s + p.totalDeads, 0)

  const campTabs = allCamps.map(c => {
    const count = c === 'All' ? kingdoms.length : kingdoms.filter(k => k.camp === c).length
    const col = CAMP_COLORS[c]
    return { name: c, count, col }
  })

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Kingdom details submitted, waiting for staff to activate ──────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-5">
          <ScanSearch className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Kingdom Details Submitted</h2>
        <p className="text-sm text-muted-foreground">
          Your kingdom details have been submitted. Staff will review and activate your KvK Scanner within 24 hours. You&apos;ll be notified in your Discord ticket when it&apos;s live.
        </p>
      </div>
    )
  }

  // ── No active KvK ──────────────────────────────────────────────────────────
  if (!activeKvkId) {
    if (hasPurchased) {
      return (
        <>
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
              <ScanSearch className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">KvK Scanner Purchased</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your purchase is confirmed. Submit your kingdom details and staff will configure your scanner within 24 hours.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Submit Kingdom Details
            </button>
          </div>
          {showCreateModal && (
            <CreateKvkModal
              onClose={() => setShowCreateModal(false)}
              purchaseBundle={purchaseBundle}
              purchaseIsSoC={purchaseIsSoC}
              onCreated={(_data) => {
                setShowCreateModal(false)
                setSubmitted(true)
              }}
            />
          )}
        </>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
          <ScanSearch className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">No Active KvK</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don&apos;t have an active KvK Scanner set up yet. Purchase a bundle from the Bot Tools Store to get started.
        </p>
        <button
          onClick={() => onNavigate?.('bot-tools-home')}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-opacity"
        >
          Go to Bot Tools Store
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* ── Header controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={kvkType}
            onChange={e => setKvkType(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {KVK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            <span className="text-xs">Waiting for first scan...</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 transition-colors">
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* ── DKP formula (only on DKP and Summary tabs) ── */}
      {(activeTab === 'dkp' || activeTab === 'summary') && (
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DKP Formula</span>
          {editingFormula ? (
            <div className="flex items-center gap-2">
              {(['dead','t4','t5'] as const).map(k => (
                <div key={k} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{k.toUpperCase()}×</span>
                  <input
                    type="number"
                    value={formulaDraft[k]}
                    onChange={e => setFormulaDraft(d => ({ ...d, [k]: Number(e.target.value) }))}
                    className="w-14 rounded border border-primary/40 bg-card px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
              <button onClick={() => { setFormula(formulaDraft); setEditingFormula(false) }} className="text-green-400 hover:text-green-300">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => { setFormulaDraft(formula); setEditingFormula(false) }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                <span className="text-red-400">DEAD</span><span className="text-muted-foreground">×{formula.dead}</span>
                <span className="mx-2 text-border">+</span>
                <span className="text-blue-400">T4-KILLS</span><span className="text-muted-foreground">×{formula.t4}</span>
                <span className="mx-2 text-border">+</span>
                <span className="text-violet-400">T5-KILLS</span><span className="text-muted-foreground">×{formula.t5}</span>
              </span>
              {isLeader && (
                <button onClick={() => setEditingFormula(true)} className="text-muted-foreground hover:text-primary transition-colors ml-1">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Stats summary ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label:'Players',        value: `${players.length}`,                                    icon: Users,  color:'text-primary' },
          { label:'Total T4 Kills', value: fmt(totalT4),                                          icon: Swords, color:'text-blue-400' },
          { label:'Total T5 Kills', value: fmt(totalT5),                                          icon: Swords, color:'text-violet-400' },
          { label:'Total KP',       value: fmt(totalKp),                                          icon: Zap,    color:'text-amber-400' },
          { label:'Total Deaths',   value: fmt(totalDead),                                        icon: Skull,  color:'text-red-400' },
          { label:'Total DKP',      value: fmt(players.reduce((s, p) => s + p.dkp, 0)),            icon: Trophy, color:'text-primary' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/60 p-4">
            <div className={cn('text-xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-border/50 bg-card/40 p-1">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                activeTab === t.id
                  ? 'bg-primary/15 text-primary shadow-[0_0_16px_-4px_hsl(var(--glow)/0.25)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Rankings table ── */}
      <Section
        title={TABS.find(t => t.id === activeTab)?.label ?? 'Rankings'}
        icon={TABS.find(t => t.id === activeTab)?.icon ?? Trophy}
        badge={`${sortedPlayers.length} players`}
      >
        <div className="p-4">
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, governor ID, or alliance..."
              className="w-full rounded-lg border border-border bg-card/50 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <PlayersTable
            players={sortedPlayers}
            tab={activeTab}
            maxDkp={maxDkp}
            maxPower={maxPower}
            maxT4={maxT4}
            maxHonor={maxHonor}
            maxPreKvk={maxPreKvk}
          />
        </div>
      </Section>

      {/* ── Kingdoms & Map ── */}
      <Section title="Kingdoms & Camps" icon={MapIcon} badge={`${kingdoms.length} kingdoms`}>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            {/* Camp overview cards */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Camp Overview</p>
              {allCamps.filter(c => c !== 'All').map(camp => {
                const kds = kingdoms.filter(k => k.camp === camp)
                const campKp = kds.reduce((s, k) => s + k.kp, 0)
                const col = CAMP_COLORS[camp]
                return (
                  <div key={camp} className={cn('rounded-lg border p-3', col?.border ?? 'border-border/50', col?.bg ?? 'bg-card/40')}>
                    <div className="flex items-center justify-between">
                      <span className={cn('font-semibold text-sm', col?.text ?? 'text-foreground')}>{camp}</span>
                      <span className="text-xs text-muted-foreground">{kds.length} kingdoms</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">KP: <span className="text-foreground font-medium">{fmt(campKp)}</span></div>
                    <div className="mt-1.5 flex gap-1 flex-wrap">
                      {kds.map(k => (
                        <span key={k.id} className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-muted-foreground">{k.id}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Map */}
            <KvkMap kvkType={kvkType} />
          </div>

          {/* Camp filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {campTabs.map(({ name, count, col }) => (
              <button
                key={name}
                onClick={() => setActiveCamp(name)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                  activeCamp === name
                    ? (col ? `${col.bg} ${col.text} ${col.border}` : 'bg-primary/15 text-primary border-primary/30')
                    : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {name} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>

          {/* Kingdoms table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  {['KD', 'Camp', 'T4 Kills', 'T5 Kills', 'KP', 'Dead', 'Healed', 'DKP'].map(h => (
                    <th key={h} className="pb-2 pr-4 text-right first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredKingdoms.map(k => {
                  const col = CAMP_COLORS[k.camp]
                  return (
                    <tr key={k.id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-mono font-semibold text-foreground">{k.id}</td>
                      <td className="py-3 pr-4">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', col?.bg, col?.text)}>{k.camp}</span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div>{fmt(k.t4Kills)}</div>
                        <Bar value={k.t4Kills} max={maxKdT4} color="#3b82f6" />
                      </td>
                      <td className="py-3 pr-4 text-right">{fmt(k.t5Kills)}</td>
                      <td className="py-3 pr-4 text-right">{fmt(k.kp)}</td>
                      <td className="py-3 pr-4 text-right text-red-400">{fmt(k.dead)}</td>
                      <td className="py-3 pr-4 text-right text-green-400">{fmt(k.healed)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-primary">
                        <div>{fmt(k.dkp)}</div>
                        <Bar value={k.dkp} max={maxKdDkp} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── Detailed Stats ── */}
      <Section title="Detailed Stats" icon={Zap} defaultOpen={false} badge={`${players.length} entries`}>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={kdFilter} onChange={e => setKdFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {allKds.map(k => <option key={k}>{k}</option>)}
            </select>
            <select value={campFilter} onChange={e => setCampFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {allCampNames.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  {['#','Player','Power','T4 Kills','T5 Kills','Dead','KP','Healed','DKP'].map(h => (
                    <th key={h} className="pb-2 pr-4 text-right first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailedPlayers.map((p, i) => (
                  <tr key={p.govId} className="border-b border-border/30 hover:bg-white/[0.02]">
                    <td className="py-3 text-muted-foreground font-mono">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">#{p.govId}</div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div>{fmt(p.power)}</div>
                      <Bar value={p.power} max={maxPower} color="#3b82f6" />
                    </td>
                    <td className="py-3 pr-4 text-right">{fmt(p.t4Kills)}</td>
                    <td className="py-3 pr-4 text-right">{fmt(p.t5Kills)}</td>
                    <td className="py-3 pr-4 text-right text-red-400">{fmt(p.totalDeads)}</td>
                    <td className="py-3 pr-4 text-right">{fmt(p.totalKp)}</td>
                    <td className="py-3 pr-4 text-right text-green-400">—</td>
                    <td className="py-3 pr-4 text-right font-semibold text-primary">{fmt(p.dkp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── Player Goals (leadership only) ── */}
      {isLeader && (
        <Section title="Player DKP Goals" icon={Target} defaultOpen={false} badge={`${goals.length} players`}>
          <div className="p-4">
            <p className="mb-3 text-xs text-muted-foreground">Set individual targets for each player. Goals are used to calculate % progress in the DKP tab.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 text-left">Player</th>
                    <th className="pb-2 pr-4 text-right">DKP Goal</th>
                    <th className="pb-2 pr-4 text-right">T4 Kill Goal</th>
                    <th className="pb-2 pr-4 text-right">T5 Kill Goal</th>
                    <th className="pb-2 pr-4 text-right">Dead Goal</th>
                    <th className="pb-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {goals.map(g => {
                    const editing = editingGoalId === g.govId
                    const draft = editing && goalDraft ? goalDraft : g
                    return (
                      <tr key={g.govId} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3">
                          <div className="font-medium text-foreground">{g.name}</div>
                          <div className="text-xs text-muted-foreground">#{g.govId}</div>
                        </td>
                        {editing ? (
                          <>
                            {(['dkpGoal','t4KillGoal','t5KillGoal','deadGoal'] as const).map(field => (
                              <td key={field} className="py-2 pr-4 text-right">
                                <input
                                  type="number"
                                  value={draft[field]}
                                  onChange={e => setGoalDraft(d => d ? { ...d, [field]: Number(e.target.value) } : d)}
                                  className="w-28 rounded border border-primary/40 bg-card px-2 py-1 text-sm text-right text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </td>
                            ))}
                            <td className="py-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    if (goalDraft) setGoals(gs => gs.map(x => x.govId === goalDraft.govId ? goalDraft : x))
                                    setEditingGoalId(null); setGoalDraft(null)
                                  }}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => { setEditingGoalId(null); setGoalDraft(null) }} className="text-muted-foreground hover:text-foreground">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 pr-4 text-right font-mono text-primary">{fmt(g.dkpGoal)}</td>
                            <td className="py-3 pr-4 text-right font-mono text-muted-foreground">{fmt(g.t4KillGoal)}</td>
                            <td className="py-3 pr-4 text-right font-mono text-muted-foreground">{fmt(g.t5KillGoal)}</td>
                            <td className="py-3 pr-4 text-right font-mono text-red-400">{fmt(g.deadGoal)}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => { setEditingGoalId(g.govId); setGoalDraft({ ...g }) }}
                                className="text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* ── Scan Schedule (leadership only) ── */}
      {isLeader && (
        <Section title="Scan Schedule" icon={Clock} defaultOpen={false} badge={`${schedules.filter(s => s.enabled).length} active`}>
          <div className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">Configure when the bot automatically scans rankings. Each scan type pulls fresh data into the dashboard.</p>

            {/* Existing schedules */}
            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id} className={cn(
                  'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                  s.enabled ? 'border-border/50 bg-card/40' : 'border-border/30 bg-card/20 opacity-60'
                )}>
                  <button
                    onClick={() => setSchedules(ss => ss.map(x => x.id === s.id ? { ...x, enabled: !x.enabled } : x))}
                    className={s.enabled ? 'text-primary' : 'text-muted-foreground'}
                    title={s.enabled ? 'Disable' : 'Enable'}
                  >
                    {s.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{s.label}</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary uppercase">{s.scanType}</span>
                      <span className="text-xs text-muted-foreground">top {s.topN}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground/70">{s.cronExpr}</div>
                  </div>
                  <button
                    onClick={() => setSchedules(ss => ss.filter(x => x.id !== s.id))}
                    className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No scan schedules yet.</p>
              )}
            </div>

            {/* Add new schedule */}
            {showAddSchedule ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">New Schedule</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Label</label>
                    <input
                      value={newSched.label}
                      onChange={e => setNewSched(d => ({ ...d, label: e.target.value }))}
                      placeholder="e.g. Morning DKP scan"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Scan Type</label>
                    <select
                      value={newSched.scanType}
                      onChange={e => setNewSched(d => ({ ...d, scanType: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {SCAN_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Schedule</label>
                    <select
                      value={newSched.cronPreset}
                      onChange={e => setNewSched(d => ({ ...d, cronPreset: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  {newSched.cronPreset === 'custom' && (
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Cron expression</label>
                      <input
                        value={newSched.cronCustom}
                        onChange={e => setNewSched(d => ({ ...d, cronCustom: e.target.value }))}
                        placeholder="0 6 * * *"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Top N players</label>
                    <input
                      type="number"
                      value={newSched.topN}
                      onChange={e => setNewSched(d => ({ ...d, topN: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddSchedule(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button
                    disabled={!newSched.label.trim()}
                    onClick={() => {
                      const cronExpr = newSched.cronPreset === 'custom' ? newSched.cronCustom : newSched.cronPreset
                      setSchedules(ss => [...ss, {
                        id: `s${Date.now()}`,
                        label: newSched.label.trim(),
                        cronExpr,
                        scanType: newSched.scanType,
                        topN: newSched.topN,
                        enabled: true,
                      }])
                      setNewSched({ label: '', cronPreset: '0 6 * * *', cronCustom: '', scanType: 'dkp', topN: 300 })
                      setShowAddSchedule(false)
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Schedule
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSchedule(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add scan schedule
              </button>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}
