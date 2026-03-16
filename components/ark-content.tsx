'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Loader2, Copy, Check, ExternalLink, ChevronLeft,
  Users, Shield, Zap, ClipboardList, BarChart3, Sword,
  Pencil, Trash2, ChevronUp, ChevronDown, RefreshCw,
  Calendar, Clock, X, AlertCircle, CheckCircle2,
  LayoutGrid, BookOpen, Target, Map, Settings,
  ArrowRight, Link2, ToggleLeft, ToggleRight, GripVertical,
  MessageSquare, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

type ArkQuestion = {
  id: string
  order: number
  type: string
  key: string
  label: string
  placeholder?: string | null
  required: boolean
  botManaged: boolean
  options?: { value: string; label: string }[] | null
  maxSelect?: number | null
}

type ArkForm = {
  id: string
  shortCode: string
  title: string
  description?: string | null
  isOpen: boolean
  guildId?: string | null
  guildName?: string | null
  requireDiscordVerification?: boolean
  questions: ArkQuestion[]
  _count?: { responses: number }
}

type ArkTeam = {
  id: string
  name: string
  color: string
  order: number
  _count?: { assignments: number }
  assignments?: ArkAssignment[]
}

type ArkAnswer = {
  question: { key: string; label: string; type: string }
  value: unknown
}

type ArkResponse = {
  id: string
  govId: string
  govName: string
  power?: bigint | null
  discordVerified: boolean
  submittedAt: string
  answers: ArkAnswer[]
  assignment?: {
    teamId?: string | null
    role: string
    teamRef?: { id: string; name: string; color: string } | null
  } | null
}

type ArkEvent = {
  id: string
  name: string
  description?: string | null
  scheduledAt?: string | null
  status: string
  discordWebhook?: string | null
  form?: ArkForm | null
  teams?: ArkTeam[]
}

type ArkAssignment = {
  id: string
  role: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPower(p: unknown): string {
  const n = Number(p)
  if (!n) return '—'
  return `${(n / 1_000_000).toFixed(1)}M`
}

function getAnswer(answers: ArkAnswer[], key: string): string {
  const a = answers.find(x => x.question.key === key)
  if (!a) return '—'
  if (Array.isArray(a.value)) return (a.value as string[]).join(', ')
  return String(a.value)
}

function getAvailability(answers: ArkAnswer[]): { sat: string[]; sun: string[] } {
  const a = answers.find(x => x.question.key === 'availability')
  const vals: string[] = Array.isArray(a?.value) ? (a!.value as string[]) : []
  return {
    sat: vals.filter(v => v.startsWith('sat_')).map(v => v.replace('sat_', '').replace('_', ':').toUpperCase() + ' UTC'),
    sun: vals.filter(v => v.startsWith('sun_')).map(v => v.replace('sun_', '').replace('_', ':').toUpperCase() + ' UTC'),
  }
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Member', backup: 'Backup', carrier: 'Carrier', leader: 'Leader', reserve: 'Reserve',
}

const ROLE_COLORS: Record<string, string> = {
  member: 'text-white/60', backup: 'text-amber-400', carrier: 'text-violet-400', leader: 'text-yellow-400', reserve: 'text-gray-400',
}

const QUESTION_TYPES = [
  { type: 'text',       label: 'Short Answer',     hint: 'Single line of text' },
  { type: 'textarea',   label: 'Paragraph',         hint: 'Multiple lines of text' },
  { type: 'number',     label: 'Number',            hint: 'Numeric value (e.g. rally capacity)' },
  { type: 'select',     label: 'Multiple Choice',   hint: 'Player picks one option' },
  { type: 'checkboxes', label: 'Checkboxes',        hint: 'Player picks multiple options' },
  { type: 'timeslots',  label: 'Time Slots',        hint: 'Availability checkboxes (Sat/Sun times)' },
  { type: 'commanders', label: 'Commander Input',   hint: 'Name + 4 skill levels (1-5 each)' },
]

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, onSelect, onDelete }: {
  event: ArkEvent & { form?: ArkForm | null }
  onSelect: () => void
  onDelete: () => void
}) {
  const statusColor = event.status === 'active' ? 'text-green-400 bg-green-400/10 border-green-400/20'
    : event.status === 'completed' ? 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-foreground text-base">{event.name}</h3>
          {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold border shrink-0", statusColor)}>
          {event.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        {event.scheduledAt && (
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(event.scheduledAt).toLocaleDateString()}</span>
        )}
        {event.form && (
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{event.form._count?.responses ?? 0} registered</span>
        )}
        <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{event.teams?.length ?? 0} teams</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onSelect}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 border border-primary/25 text-primary text-sm font-medium py-2 hover:bg-primary/25 transition">
          Manage <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete}
          className="flex items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5 text-red-400 px-3 py-2 hover:bg-red-400/15 transition">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Manual Roster Import Modal ───────────────────────────────────────────────

function ImportRosterModal({ onClose, onDone }: { onClose: () => void; onDone: (total: number) => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ upserted: number; total: number; errors: string[] } | null>(null)

  async function doImport() {
    setLoading(true)
    try {
      const res = await fetch('/api/ark/players/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text.trim(),
      })
      const data = await res.json()
      setResult(data)
      if (res.ok) onDone(data.total)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Import Player Roster</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-green-400/25 bg-green-400/5 p-4 text-sm">
              <p className="font-semibold text-green-400">✓ Import complete</p>
              <p className="text-muted-foreground mt-1">{result.upserted} players added/updated · {result.total} total in roster</p>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs text-amber-400 space-y-0.5">
                {result.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <button onClick={onClose} className="w-full rounded-xl bg-primary/15 border border-primary/25 text-primary py-2.5 text-sm font-medium hover:bg-primary/25 transition">Done</button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Paste your player list below. One player per line. Format:</p>
              <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2 font-mono text-xs text-muted-foreground">
                GovernorName, GovernorID<br />
                GovernorName, GovernorID, PowerInMillions<br />
                GovernorName, GovernorID, PowerInMillions, AllianceTag
              </div>
              <p className="text-[11px] text-muted-foreground">Example: <span className="font-mono">AlexX, 12345678, 92.5, TFN</span></p>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"AlexX, 12345678, 92.5, TFN\nAlexWolf, 87654321, 65.0, TFN\nAlex Prime, 11112222, 45.0"}
              rows={8}
              className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={doImport} disabled={loading || !text.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/15 border border-primary/25 text-primary py-2.5 text-sm font-medium hover:bg-primary/25 disabled:opacity-40 transition">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : <><Users className="h-4 w-4" /> Import Players</>}
              </button>
              <button onClick={onClose} className="px-4 rounded-xl border border-border/50 text-muted-foreground text-sm hover:bg-secondary transition">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── CommandCenter (Overview tab) ─────────────────────────────────────────────

function CommandCenter({ event, onRefresh, appUrl }: { event: ArkEvent; onRefresh: () => void; appUrl: string }) {
  const [copied, setCopied] = useState(false)
  const [webhookInput, setWebhookInput] = useState(event.discordWebhook ?? '')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [webhookSaved, setWebhookSaved] = useState(false)
  const [showBotGuide, setShowBotGuide] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [rosterCount, setRosterCount] = useState<number | null>(null)
  const [rosterLastSync, setRosterLastSync] = useState<string | null>(null)

  const formUrl = event.form ? `${appUrl}/ark/${event.form.shortCode}` : null
  const totalRegistered = event.form?._count?.responses ?? 0
  const totalAssigned = event.teams?.reduce((s, t) => s + (t._count?.assignments ?? 0), 0) ?? 0
  const unassigned = totalRegistered - totalAssigned

  // Load roster stats on mount
  useEffect(() => {
    fetch('/api/ark/players/import')
      .then(r => r.json())
      .then(d => {
        setRosterCount(d.total ?? 0)
        setRosterLastSync(d.lastSync ?? null)
      })
      .catch(() => {})
  }, [])

  async function toggleForm() {
    if (!event.form) return
    await fetch(`/api/ark/forms/${event.form.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: !event.form.isOpen }),
    })
    onRefresh()
  }

  async function updateStatus(status: string) {
    await fetch(`/api/ark/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onRefresh()
  }

  async function saveWebhook() {
    setSavingWebhook(true)
    await fetch(`/api/ark/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordWebhook: webhookInput.trim() || null }),
    })
    setSavingWebhook(false)
    setWebhookSaved(true)
    setTimeout(() => setWebhookSaved(false), 3000)
    onRefresh()
  }

  const botEndpoint = `${appUrl}/api/ark/players`
  const botEndpointImport = `${appUrl}/api/ark/players/import`

  return (
    <div className="space-y-5">
      {showImport && (
        <ImportRosterModal
          onClose={() => setShowImport(false)}
          onDone={total => { setRosterCount(total); setShowImport(false) }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Registered', value: totalRegistered, icon: Users, color: 'text-violet-400', bg: 'bg-violet-400/10' },
          { label: 'Assigned', value: totalAssigned, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Unassigned', value: unassigned, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center">
            <div className={cn("flex h-9 w-9 mx-auto mb-2 items-center justify-center rounded-xl", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form URL */}
      {formUrl && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Registration Form Link</p>
            <button onClick={toggleForm}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition",
                event.form?.isOpen
                  ? "border-green-400/30 bg-green-400/10 text-green-400 hover:bg-green-400/20"
                  : "border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20")}>
              {event.form?.isOpen ? <><ToggleRight className="h-3.5 w-3.5" /> Open</> : <><ToggleLeft className="h-3.5 w-3.5" /> Closed</>}
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{formUrl}</span>
            <button onClick={() => { navigator.clipboard.writeText(formUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a href={formUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground">Paste this in your alliance chat. Players tap it from their in-game browser and register in under 60 seconds.</p>
        </div>
      )}

      {/* Discord Webhook */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-indigo-400">🔔</span> Discord Notifications
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Every time a player submits their registration, a message is automatically sent to your Discord channel.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={webhookInput}
            onChange={e => setWebhookInput(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
          />
          <button onClick={saveWebhook} disabled={savingWebhook}
            className="flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 text-primary px-4 py-2 text-xs font-medium hover:bg-primary/20 disabled:opacity-40 transition shrink-0">
            {savingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : webhookSaved ? <Check className="h-3.5 w-3.5 text-green-400" /> : 'Save'}
          </button>
        </div>
        {event.discordWebhook && !webhookInput && (
          <p className="text-[10px] text-green-400">✓ Webhook connected</p>
        )}
        <details className="group">
          <summary className="text-[11px] text-primary/70 cursor-pointer hover:text-primary select-none">How to get a Discord webhook URL →</summary>
          <div className="mt-2 rounded-xl border border-border/40 bg-muted/10 p-3 text-[11px] text-muted-foreground space-y-1">
            <p>1. Open Discord → go to your Ark leadership channel</p>
            <p>2. Click the gear icon (Edit Channel) → Integrations → Webhooks</p>
            <p>3. Click <strong className="text-foreground">New Webhook</strong> → Copy Webhook URL</p>
            <p>4. Paste the URL above and click Save</p>
          </div>
        </details>
      </div>

      {/* Player Roster / Bot Integration */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-violet-400">⚡</span> Player Roster (Auto-fill)
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              When players open the form and search their name, their stats auto-fill from your roster.
            </p>
          </div>
          <div className="shrink-0 text-right">
            {rosterCount !== null && (
              <p className={cn("text-sm font-bold", rosterCount > 0 ? "text-green-400" : "text-amber-400")}>
                {rosterCount}
              </p>
            )}
            {rosterCount !== null && <p className="text-[10px] text-muted-foreground">players</p>}
          </div>
        </div>

        {rosterLastSync && (
          <p className="text-[10px] text-muted-foreground">
            Last updated: {new Date(rosterLastSync).toLocaleString()}
          </p>
        )}

        {rosterCount === 0 && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2.5 text-[11px] text-amber-400">
            ⚠ No players in roster yet. Import your player list below so the auto-fill works when players register.
          </div>
        )}

        {/* Quick import button */}
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 text-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/20 transition w-full justify-center">
          <Users className="h-4 w-4" /> Import Players Manually
        </button>

        {/* Bot setup guide */}
        <button onClick={() => setShowBotGuide(v => !v)}
          className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground transition pt-1">
          <span>Set up bot auto-sync (for when your bot is ready)</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showBotGuide && "rotate-180")} />
        </button>
        {showBotGuide && (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-3 text-[11px] text-muted-foreground">
            <p className="text-foreground font-semibold text-xs">How the bot connects</p>
            <p>Your bot calls one endpoint to upload the roster. The website does the rest — players search their name and their stats fill automatically.</p>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Endpoint</p>
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3 py-2 font-mono">
                <span className="text-primary flex-1 text-[10px] truncate">POST {botEndpointImport}</span>
                <button onClick={() => navigator.clipboard.writeText(`POST ${botEndpointImport}`)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Authentication header</p>
              <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2 font-mono text-[10px]">
                x-bot-secret: YOUR_BOT_API_SECRET
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Payload (JSON)</p>
              <pre className="rounded-lg border border-border/40 bg-background/50 px-3 py-2 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto">{`{
  "players": [
    {
      "govId": "12345678",
      "govName": "AlexX",
      "power": 92000000,
      "allianceTag": "TFN",
      "discordVerified": true,
      "arkExperience": true
    }
  ]
}`}</pre>
            </div>
            <p className="text-[10px]">Set <span className="font-mono text-foreground">BOT_API_SECRET</span> in your Vercel environment variables to match the header value.</p>
            <p className="text-[10px]">Also works as plain text (CSV): one <span className="font-mono text-foreground">Name, ID, PowerM, Tag</span> per line with header <span className="font-mono text-foreground">Content-Type: text/plain</span></p>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Single-player search (for Discord bot lookup)</p>
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3 py-2 font-mono">
                <span className="text-primary flex-1 text-[10px] truncate">GET {botEndpoint}?q=name&limit=5</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event status */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">Event Status</p>
        <div className="flex flex-wrap gap-2">
          {['planning', 'active', 'completed'].map(s => (
            <button key={s} onClick={() => updateStatus(s)}
              className={cn("rounded-lg border px-4 py-2 text-xs font-semibold capitalize transition",
                event.status === s
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Teams summary */}
      {(event.teams?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Teams</p>
          <div className="space-y-2">
            {event.teams!.map(team => (
              <div key={team.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                <span className="text-sm font-medium text-foreground flex-1">{team.name}</span>
                <span className="text-xs text-muted-foreground">{team._count?.assignments ?? 0} players</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FormBuilder helpers ──────────────────────────────────────────────────────

// Human-readable question type labels
const Q_TYPE_LABELS: Record<string, string> = {
  text:       'Short text',
  textarea:   'Long text',
  number:     'Number',
  select:     'Multiple choice',
  checkboxes: 'Checkboxes',
  timeslots:  'Time slots',
  commanders: 'Commander input',
  botfield:   'Game data',
}

// Description shown under each bot-managed field so leadership understands it
const BOT_FIELD_DESCRIPTIONS: Record<string, string> = {
  gov_name:  'Auto-filled: player\'s in-game governor name (from bot roster)',
  gov_id:    'Auto-filled: player\'s numeric governor ID (from bot roster)',
  power:     'Auto-filled: player\'s current power score (from bot roster)',
  discord:   'Auto-filled: whether the player is verified in your Discord server',
}

const DEFAULT_TIMESLOTS: { value: string; label: string }[] = [
  { value: 'sat_11', label: 'Saturday 11:00 UTC' },
  { value: 'sat_13', label: 'Saturday 13:00 UTC' },
  { value: 'sat_14', label: 'Saturday 14:00 UTC' },
  { value: 'sat_15', label: 'Saturday 15:00 UTC' },
  { value: 'sat_20', label: 'Saturday 20:00 UTC' },
  { value: 'sun_04', label: 'Sunday 04:00 UTC' },
  { value: 'sun_12', label: 'Sunday 12:00 UTC' },
  { value: 'sun_14', label: 'Sunday 14:00 UTC' },
  { value: 'sun_20', label: 'Sunday 20:00 UTC' },
]

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
}

// ─── OptionsEditor (Multiple Choice / Checkboxes) ────────────────────────────

function OptionsEditor({ options, onChange }: { options: { value: string; label: string }[]; onChange: (opts: { value: string; label: string }[]) => void }) {
  function addOption() {
    const n = options.length + 1
    onChange([...options, { value: `option_${n}`, label: '' }])
  }
  function removeOption(i: number) {
    onChange(options.filter((_, idx) => idx !== i))
  }
  function editLabel(i: number, label: string) {
    // Only update value if it's a generated key (option_N), not a custom one
    const currentValue = options[i].value
    const newValue = currentValue.startsWith('option_') ? (slugify(label) || currentValue) : currentValue
    onChange(options.map((o, idx) => idx === i ? { ...o, label, value: newValue } : o))
  }
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Answer choices (players pick from these)</label>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded border border-border/60 bg-muted/10" />
            <input
              value={opt.label}
              onChange={e => editLabel(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-red-400 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground/50 italic">No options yet — add at least one below</p>
        )}
      </div>
      <button type="button" onClick={addOption}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition">
        <Plus className="h-3 w-3" /> Add option
      </button>
    </div>
  )
}

// ─── TimeSlotsEditor ─────────────────────────────────────────────────────────

function TimeSlotsEditor({ options, onChange }: { options: { value: string; label: string }[]; onChange: (opts: { value: string; label: string }[]) => void }) {
  const [newSatTime, setNewSatTime] = useState('')
  const [newSunTime, setNewSunTime] = useState('')

  const satOptions = options.filter(o => o.value.startsWith('sat_'))
  const sunOptions = options.filter(o => o.value.startsWith('sun_'))

  function remove(value: string) {
    onChange(options.filter(o => o.value !== value))
  }

  function addSlot(day: 'sat' | 'sun', timeInput: string) {
    const clean = timeInput.replace(/[^0-9:]/g, '').replace(':', '').padStart(4, '0').slice(0, 4)
    const hours = clean.slice(0, 2)
    const mins = clean.slice(2, 4)
    const value = `${day}_${hours}`
    const label = `${day === 'sat' ? 'Saturday' : 'Sunday'} ${hours}:${mins} UTC`
    if (!options.find(o => o.value === value)) {
      onChange([...options, { value, label }])
    }
    if (day === 'sat') setNewSatTime('')
    else setNewSunTime('')
  }

  function SlotGroup({ title, slots, day, inputVal, setInputVal }: {
    title: string; slots: typeof options; day: 'sat' | 'sun'; inputVal: string; setInputVal: (v: string) => void
  }) {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {slots.map(s => (
            <div key={s.value} className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 pl-3 pr-1.5 py-1">
              <span className="text-xs text-foreground">{s.label.replace(/^(Saturday|Sunday) /, '')}</span>
              <button type="button" onClick={() => remove(s.value)} className="text-muted-foreground hover:text-red-400 transition ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {slots.length === 0 && <p className="text-xs text-muted-foreground/50 italic">None added</p>}
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSlot(day, inputVal))}
            placeholder="e.g. 14:00"
            className="w-24 rounded-lg border border-border/50 bg-muted/20 px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50"
          />
          <button type="button" onClick={() => addSlot(day, inputVal)}
            disabled={!inputVal.trim()}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-muted/5 p-3">
      <label className="text-xs font-medium text-muted-foreground">Time slots (players tick which times they can play)</label>
      <SlotGroup title="Saturday" slots={satOptions} day="sat" inputVal={newSatTime} setInputVal={setNewSatTime} />
      <SlotGroup title="Sunday" slots={sunOptions} day="sun" inputVal={newSunTime} setInputVal={setNewSunTime} />
    </div>
  )
}

// ─── FormBuilder ──────────────────────────────────────────────────────────────

function FormBuilder({ event, onRefresh }: { event: ArkEvent; onRefresh: () => void }) {
  const [form, setForm] = useState<ArkForm | null>(event.form ?? null)
  const [loading, setLoading] = useState(false)
  const [addingQ, setAddingQ] = useState(false)
  const [newQ, setNewQ] = useState<{ type: string; label: string; placeholder: string; required: boolean; options: { value: string; label: string }[] | null; maxSelect: number | null }>({ type: 'text', label: '', placeholder: '', required: false, options: null, maxSelect: null })
  const [editingTitleForm, setEditingTitleForm] = useState(false)
  const [titleDraft, setTitleDraft] = useState(form?.title ?? '')
  const [descDraft, setDescDraft] = useState(form?.description ?? '')
  const [editingQId, setEditingQId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ label: string; placeholder: string; required: boolean; options: { value: string; label: string }[] | null; maxSelect: number | null } | null>(null)

  // Sync form state when event.form is updated with questions (e.g. after EventDetail refresh)
  useEffect(() => {
    if (!event.form) return
    const incoming = event.form as ArkForm
    setForm(prev => {
      const prevQCount = prev?.questions?.length ?? 0
      const newQCount = incoming.questions?.length ?? 0
      if (newQCount > prevQCount) return incoming
      return prev
    })
  }, [(event.form as ArkForm)?.questions?.length])
  const [rosterCount, setRosterCount] = useState<number | null>(null)
  const [showImportFromBuilder, setShowImportFromBuilder] = useState(false)
  const [servers, setServers] = useState<{ id: string; guildId: string; guildName: string }[]>([])

  useEffect(() => {
    fetch('/api/ark/players/import')
      .then(r => r.json())
      .then(d => setRosterCount(d.total ?? 0))
      .catch(() => {})
    fetch('/api/verify/servers').then(r => r.json()).then(d => setServers(d.servers ?? [])).catch(() => {})
  }, [])

  async function saveFormSettings(patch: Partial<{ guildId: string | null; guildName: string | null; requireDiscordVerification: boolean }>) {
    if (!form) return
    await fetch(`/api/ark/forms/${form.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setForm(f => f ? { ...f, ...patch } : f)
    onRefresh()
  }

  async function createForm() {
    setLoading(true)
    try {
      const res = await fetch('/api/ark/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, title: `${event.name} — Ark Registration` }),
      })
      const data = await res.json()
      setForm(data.form)
      onRefresh()
    } finally { setLoading(false) }
  }

  async function saveTitle() {
    if (!form) return
    await fetch(`/api/ark/forms/${form.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft, description: descDraft }),
    })
    setForm(f => f ? { ...f, title: titleDraft, description: descDraft } : f)
    setEditingTitleForm(false)
    onRefresh()
  }

  function startEditQ(q: ArkQuestion) {
    setEditingQId(q.id)
    const opts = q.type === 'timeslots' && (q.options == null || (q.options as unknown[]).length === 0)
      ? DEFAULT_TIMESLOTS
      : (q.options ?? null)
    setEditDraft({ label: q.label, placeholder: q.placeholder ?? '', required: q.required, options: opts, maxSelect: q.maxSelect ?? null })
  }

  function handleTypeChange(type: string) {
    const needsOptions = type === 'select' || type === 'checkboxes'
    const needsTimeslots = type === 'timeslots'
    setNewQ(q => ({
      ...q,
      type,
      maxSelect: null,
      options: needsOptions
        ? [{ value: 'option_1', label: 'Option 1' }, { value: 'option_2', label: 'Option 2' }]
        : needsTimeslots
          ? DEFAULT_TIMESLOTS
          : null,
    }))
  }

  async function saveQ(qid: string) {
    if (!form || !editDraft) return
    await fetch(`/api/ark/forms/${form.id}/questions/${qid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    setForm(f => f ? {
      ...f,
      questions: f.questions.map(q => q.id === qid ? { ...q, ...editDraft } : q),
    } : f)
    setEditingQId(null)
    setEditDraft(null)
  }

  function slugifyLocal(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
  }

  async function addQuestion() {
    if (!form || !newQ.label.trim()) return
    setLoading(true)
    try {
      // Generate a unique key within this form
      const baseKey = slugifyLocal(newQ.label) || `question_${Date.now()}`
      const existingKeys = new Set(form.questions.map(q => q.key))
      let key = baseKey
      let suffix = 2
      while (existingKeys.has(key)) {
        key = `${baseKey}_${suffix++}`
      }
      const res = await fetch(`/api/ark/forms/${form.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newQ.type,
          key,
          label: newQ.label.trim(),
          placeholder: newQ.placeholder.trim() || null,
          required: newQ.required,
          botManaged: false,
          options: newQ.options ?? null,
          maxSelect: newQ.maxSelect ?? null,
        }),
      })
      const data = await res.json()
      setForm(f => f ? { ...f, questions: [...f.questions, data.question] } : f)
      setNewQ({ type: 'text', label: '', placeholder: '', required: false, options: null, maxSelect: null })
      setAddingQ(false)
      onRefresh()
    } finally { setLoading(false) }
  }

  async function deleteQuestion(qid: string) {
    if (!form) return
    await fetch(`/api/ark/forms/${form.id}/questions/${qid}`, { method: 'DELETE' })
    setForm(f => f ? { ...f, questions: f.questions.filter(q => q.id !== qid) } : f)
  }

  async function moveQuestion(qid: string, dir: 'up' | 'down') {
    if (!form) return
    const idx = form.questions.findIndex(q => q.id === qid)
    if (idx === -1) return
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === form.questions.length - 1) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    const q1 = form.questions[idx]
    const q2 = form.questions[swapIdx]
    await Promise.all([
      fetch(`/api/ark/forms/${form.id}/questions/${q1.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: q2.order }),
      }),
      fetch(`/api/ark/forms/${form.id}/questions/${q2.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: q1.order }),
      }),
    ])
    const newQs = [...form.questions]
    newQs[idx] = { ...q1, order: q2.order }
    newQs[swapIdx] = { ...q2, order: q1.order }
    newQs.sort((a, b) => a.order - b.order)
    setForm(f => f ? { ...f, questions: newQs } : f)
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center py-16 text-center rounded-2xl border border-border/50 bg-card/60">
        <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-foreground font-semibold mb-1">No form yet</p>
        <p className="text-sm text-muted-foreground mb-5">Create a registration form and add your own questions.</p>
        <button onClick={createForm} disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/25 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/25 transition disabled:opacity-40">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Registration Form
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Tutorial / help */}
      <details className="group rounded-xl border border-border/40 bg-muted/5 overflow-hidden">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-medium text-foreground hover:bg-muted/10">
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> How to build this form</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-3 text-xs text-muted-foreground">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">1. Link a kingdom</p>
              <p>Select the Discord server for this Ark event in Form Settings. Players registered in that server will appear in the search box automatically.</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">2. Add questions</p>
              <p>Click <strong className="text-foreground">+ Add a question</strong>. Choose a type — Short Answer, Multiple Choice, Checkboxes, Commander Input, etc.</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">3. Multiple choice & checkboxes</p>
              <p>After choosing Multiple Choice or Checkboxes, you&apos;ll see an option editor — type your choices. Players pick from them on the form.</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">4. Commander Input</p>
              <p>Players enter commander names and set each of the 4 skill levels (1–5) via a dropdown. No typing needed for skill levels.</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">5. Open the form</p>
              <p>When ready, go to Overview and toggle the form to <strong className="text-foreground">Open</strong>. Copy the link and paste it in your alliance chat.</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">6. Check responses</p>
              <p>View all submissions in the <strong className="text-foreground">Responses</strong> tab. Assign each player to a team from there.</p>
            </div>
          </div>
        </div>
      </details>

      {/* Form title / description */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5">
        {editingTitleForm ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Form title</label>
              <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description shown to players (optional)</label>
              <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)}
                placeholder="e.g. Please fill this out before Saturday. All fields are required." rows={2}
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary/50" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveTitle} className="rounded-lg bg-primary/15 border border-primary/25 px-4 py-1.5 text-xs text-primary hover:bg-primary/25">Save</button>
              <button onClick={() => setEditingTitleForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-foreground">{form.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{form.description || <span className="italic opacity-50">No description</span>}</p>
            </div>
            <button onClick={() => { setTitleDraft(form.title); setDescDraft(form.description ?? ''); setEditingTitleForm(true) }}
              className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition border border-border/50 rounded-lg px-2.5 py-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit title
            </button>
          </div>
        )}
      </div>

      {/* Form Settings */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Form Settings</p>

        {/* Server/kingdom selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Kingdom / Discord server</label>
          <select value={form.guildId ?? ''} onChange={e => saveFormSettings({ guildId: e.target.value || null, guildName: servers.find(s => s.guildId === e.target.value)?.guildName ?? null })}
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
            <option value="">No server linked (anyone can submit)</option>
            {servers.map(s => <option key={s.guildId} value={s.guildId}>{s.guildName}</option>)}
          </select>
          <p className="text-[10px] text-muted-foreground">When linked, players select their name from the server&apos;s verified member list and their data auto-fills.</p>
        </div>

        {/* requireDiscordVerification toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={cn("relative w-9 h-5 rounded-full transition", (form.requireDiscordVerification ?? true) ? "bg-primary" : "bg-muted")}
            onClick={() => saveFormSettings({ requireDiscordVerification: !(form.requireDiscordVerification ?? true) })}>
            <div className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", (form.requireDiscordVerification ?? true) ? "translate-x-4" : "translate-x-0")} />
          </div>
          <div>
            <p className="text-sm text-foreground">Require Discord verification</p>
            <p className="text-[10px] text-muted-foreground">Only players verified in the linked server can submit</p>
          </div>
        </label>
      </div>

      {showImportFromBuilder && (
        <ImportRosterModal
          onClose={() => setShowImportFromBuilder(false)}
          onDone={total => { setRosterCount(total); setShowImportFromBuilder(false) }}
        />
      )}

      {/* Roster status */}
      {rosterCount === 0 ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 flex gap-3 items-start">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-400">No players in roster yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The <strong className="text-foreground">Game data</strong> fields need your player roster to auto-fill. Import your player list so the name search works on the registration form.
            </p>
            <button onClick={() => setShowImportFromBuilder(true)}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-medium px-3 py-1.5 hover:bg-amber-400/20 transition">
              <Upload className="h-3.5 w-3.5" /> Import player roster
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-3 items-start">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Game data fields
              <span className="ml-2 text-[10px] font-normal text-green-400">✓ {rosterCount} players in roster</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fields marked <span className="text-primary font-medium">Game data</span> auto-fill when a player selects their name on the form. Players won&apos;t need to type these — their stats appear instantly.
            </p>
          </div>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-2">
        {form.questions.map((q, idx) => {
          const isEditing = editingQId === q.id
          const typeLabel = Q_TYPE_LABELS[q.type] ?? q.type
          const botDesc = q.botManaged ? (BOT_FIELD_DESCRIPTIONS[q.key] ?? 'Auto-filled from game bot data') : null

          return (
            <div key={q.id} className={cn(
              "rounded-xl border bg-card/40 overflow-hidden",
              q.botManaged ? "border-primary/20" : "border-border/50"
            )}>
              {/* Question row */}
              <div className="flex items-center gap-2 px-4 py-3">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveQuestion(q.id, 'up')} disabled={idx === 0}
                    className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveQuestion(q.id, 'down')} disabled={idx === form.questions.length - 1}
                    className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{q.label}</span>
                    <span className="text-[10px] rounded-full bg-muted/30 px-2 py-0.5 text-muted-foreground">{typeLabel}</span>
                    {q.required && <span className="text-[10px] text-amber-400 font-medium">required</span>}
                    {q.botManaged && (
                      <span className="text-[10px] rounded-full bg-primary/15 text-primary px-2 py-0.5 font-medium">Game data</span>
                    )}
                  </div>
                  {botDesc && !isEditing && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{botDesc}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!isEditing && (
                    <button onClick={() => startEditQ(q)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!q.botManaged && !isEditing && (
                    <button onClick={() => deleteQuestion(q.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit panel */}
              {isEditing && editDraft && (
                <div className="border-t border-border/30 bg-muted/5 px-4 py-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Question text (what players see)</label>
                    <input value={editDraft.label} onChange={e => setEditDraft(d => d ? { ...d, label: e.target.value } : d)}
                      className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                  </div>
                  {!q.botManaged && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Hint text inside the field (optional)</label>
                      <input value={editDraft.placeholder} onChange={e => setEditDraft(d => d ? { ...d, placeholder: e.target.value } : d)}
                        placeholder="e.g. Enter a number, e.g. 1.8"
                        className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                  )}
                  {!q.botManaged && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editDraft.required} onChange={e => setEditDraft(d => d ? { ...d, required: e.target.checked } : d)} />
                      <span className="text-sm text-foreground">This question is required</span>
                    </label>
                  )}
                  {(q.type === 'select' || q.type === 'checkboxes') && editDraft.options !== null && (
                    <OptionsEditor
                      options={editDraft.options ?? []}
                      onChange={opts => setEditDraft(d => d ? { ...d, options: opts } : d)}
                    />
                  )}
                  {q.type === 'timeslots' && (
                    <TimeSlotsEditor
                      options={editDraft.options ?? DEFAULT_TIMESLOTS}
                      onChange={opts => setEditDraft(d => d ? { ...d, options: opts } : d)}
                    />
                  )}
                  {(q.type === 'checkboxes' || q.type === 'timeslots' || q.type === 'select') && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editDraft.maxSelect === 1}
                        onChange={e => setEditDraft(d => d ? { ...d, maxSelect: e.target.checked ? 1 : null } : d)} />
                      <span className="text-sm text-foreground">Only allow one selection</span>
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => saveQ(q.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/25 px-4 py-1.5 text-xs text-primary hover:bg-primary/25">
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button onClick={() => { setEditingQId(null); setEditDraft(null) }}
                      className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add question */}
      {addingQ ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Add a question</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Question type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUESTION_TYPES.map(t => (
                <button key={t.type} onClick={() => handleTypeChange(t.type)}
                  className={cn("rounded-xl border px-3 py-2.5 text-left transition",
                    newQ.type === t.type
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground")}>
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-60">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Question text (what players will see)</label>
            <input value={newQ.label} onChange={e => setNewQ(q => ({ ...q, label: e.target.value }))}
              placeholder="e.g. Any additional notes for leadership?"
              className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hint text inside the field (optional)</label>
            <input value={newQ.placeholder} onChange={e => setNewQ(q => ({ ...q, placeholder: e.target.value }))}
              placeholder="e.g. Keep it short"
              className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newQ.required} onChange={e => setNewQ(q => ({ ...q, required: e.target.checked }))} />
            <span className="text-sm text-foreground">This question is required</span>
          </label>
          {(newQ.type === 'select' || newQ.type === 'checkboxes') && newQ.options && (
            <OptionsEditor options={newQ.options} onChange={opts => setNewQ(q => ({ ...q, options: opts }))} />
          )}
          {newQ.type === 'timeslots' && (
            <TimeSlotsEditor
              options={newQ.options ?? DEFAULT_TIMESLOTS}
              onChange={opts => setNewQ(q => ({ ...q, options: opts }))}
            />
          )}
          {(newQ.type === 'select' || newQ.type === 'checkboxes' || newQ.type === 'timeslots') && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newQ.maxSelect === 1}
                onChange={e => setNewQ(q => ({ ...q, maxSelect: e.target.checked ? 1 : null }))} />
              <span className="text-sm text-foreground">Only allow one selection</span>
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={addQuestion} disabled={loading || !newQ.label.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 disabled:opacity-40">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add question
            </button>
            <button onClick={() => setAddingQ(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingQ(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition">
          <Plus className="h-4 w-4" /> Add a question
        </button>
      )}
    </div>
  )
}

// ─── ResponseCard ─────────────────────────────────────────────────────────────

function formatCommanders(answers: ArkAnswer[]): string {
  const a = answers.find(x => x.question.key === 'commanders')
  if (!a) return '—'
  if (Array.isArray(a.value)) {
    const formatted = (a.value as Array<{ name: string; skills: number[] }>)
      .filter(c => c.name)
      .map(c => `${c.name} — ${c.skills.join(' ')}`)
      .join('\n')
    return formatted || '—'
  }
  return String(a.value) || '—'
}

function ResponseCard({ response, teams, onAssign }: {
  response: ArkResponse
  teams: ArkTeam[]
  onAssign: (responseId: string, teamId: string | null, role: string) => void
}) {
  const [assigning, setAssigning] = useState(false)
  const avail = getAvailability(response.answers)
  const commanders = formatCommanders(response.answers)
  const rally = getAnswer(response.answers, 'rally_cap')
  const arkExp = getAnswer(response.answers, 'ark_exp')
  const assignedTeam = response.assignment?.teamRef

  async function assign(teamId: string | null, role = 'member') {
    setAssigning(true)
    await onAssign(response.id, teamId, role)
    setAssigning(false)
  }

  return (
    <div className={cn("rounded-2xl border bg-card/60 backdrop-blur-sm p-4 space-y-3 transition-all",
      assignedTeam ? "border-green-400/20" : "border-border/50")}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm">
          {response.govName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground text-sm">{response.govName}</span>
            {response.discordVerified && <Shield className="h-3.5 w-3.5 text-green-400" />}
            {arkExp === 'yes' && <span className="text-[10px] rounded-full bg-violet-400/15 text-violet-400 px-2 py-0.5">Ark vet</span>}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            ID: {response.govId}{response.power ? ` · ${fmtPower(response.power)}` : ''}
          </div>
        </div>
        {assignedTeam && (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0"
            style={{ backgroundColor: assignedTeam.color + '20', color: assignedTeam.color, border: `1px solid ${assignedTeam.color}40` }}>
            {assignedTeam.name}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {rally !== '—' && <span className="flex items-center gap-1"><Zap className="h-3 w-3" />Rally: {rally}M</span>}
      </div>

      {/* Commanders */}
      {commanders !== '—' && (
        <div className="rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Commanders</p>
          <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap">{commanders}</pre>
        </div>
      )}

      {/* Availability */}
      {(avail.sat.length > 0 || avail.sun.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {avail.sat.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Saturday</p>
              <div className="flex flex-wrap gap-1">
                {avail.sat.map(s => <span key={s} className="text-[10px] rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-300 px-2 py-0.5">{s}</span>)}
              </div>
            </div>
          )}
          {avail.sun.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sunday</p>
              <div className="flex flex-wrap gap-1">
                {avail.sun.map(s => <span key={s} className="text-[10px] rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-300 px-2 py-0.5">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
        {teams.map(team => (
          <button key={team.id} onClick={() => assign(team.id)}
            disabled={assigning}
            className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition"
            style={{
              borderColor: assignedTeam?.id === team.id ? team.color + '60' : undefined,
              backgroundColor: assignedTeam?.id === team.id ? team.color + '20' : undefined,
              color: assignedTeam?.id === team.id ? team.color : undefined,
            }}
            data-assigned={assignedTeam?.id === team.id}>
            {assignedTeam?.id === team.id ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {team.name}
          </button>
        ))}
        <button onClick={() => assign(null, 'backup')} disabled={assigning}
          className={cn("flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
            response.assignment?.role === 'backup' && !assignedTeam
              ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
              : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground")}>
          Backup
        </button>
        {response.assignment && (
          <button onClick={() => assign(null)} disabled={assigning}
            className="flex items-center gap-1 rounded-lg border border-red-400/20 bg-red-400/5 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-400/10 transition">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Responses tab ────────────────────────────────────────────────────────────

function ResponsesPanel({ event, teams }: { event: ArkEvent; teams: ArkTeam[] }) {
  const [responses, setResponses] = useState<ArkResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unassigned' | string>('all')

  const fetchResponses = useCallback(async () => {
    if (!event.form) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ark/forms/${event.form.id}/responses`)
      const data = await res.json()
      setResponses(data.responses ?? [])
    } finally { setLoading(false) }
  }, [event.form])

  useEffect(() => { fetchResponses() }, [fetchResponses])

  async function handleAssign(responseId: string, teamId: string | null, role: string) {
    await fetch(`/api/ark/responses/${responseId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, role }),
    })
    fetchResponses()
  }

  const filtered = responses.filter(r => {
    if (filter === 'unassigned') return !r.assignment?.teamId && r.assignment?.role !== 'backup'
    if (filter === 'backup') return r.assignment?.role === 'backup' && !r.assignment?.teamId
    if (filter === 'all') return true
    return r.assignment?.teamRef?.id === filter
  })

  if (!event.form) {
    return (
      <div className="text-center py-14 text-muted-foreground">
        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Create a form first to collect responses</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {[
            { value: 'all', label: `All (${responses.length})` },
            { value: 'unassigned', label: `Unassigned` },
            { value: 'backup', label: 'Backup' },
            ...teams.map(t => ({ value: t.id, label: t.name })),
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                filter === f.value
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={fetchResponses} disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition disabled:opacity-40">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-border/50 bg-card/60">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">{responses.length === 0 ? 'No responses yet' : 'No responses in this filter'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map(r => (
            <ResponseCard key={r.id} response={r} teams={teams} onAssign={handleAssign} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Teams panel ──────────────────────────────────────────────────────────────

function TeamsPanel({ event, onRefresh }: { event: ArkEvent; onRefresh: () => void }) {
  const [teams, setTeams] = useState<ArkTeam[]>(event.teams ?? [])
  const [responses, setResponses] = useState<ArkResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColor, setNewTeamColor] = useState('#6366f1')
  const [botSyncMsg, setBotSyncMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!event.form) return
    fetch(`/api/ark/forms/${event.form.id}/responses`)
      .then(r => r.json())
      .then(d => setResponses(d.responses ?? []))
      .catch(() => {})
  }, [event.form])

  async function createTeam() {
    setLoading(true)
    const res = await fetch(`/api/ark/events/${event.id}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName || `Team ${teams.length + 1}`, color: newTeamColor }),
    })
    const data = await res.json()
    setTeams(t => [...t, { ...data.team, assignments: [] }])
    setNewTeamName('')
    setCreatingTeam(false)
    setLoading(false)
    onRefresh()
  }

  async function deleteTeam(id: string) {
    await fetch(`/api/ark/teams/${id}`, { method: 'DELETE' })
    setTeams(t => t.filter(x => x.id !== id))
    onRefresh()
  }

  // Copy team assignments as JSON for bot
  function generateBotPayload() {
    const payload: Record<string, unknown[]> = {}
    for (const r of responses) {
      if (r.assignment?.teamRef) {
        const teamName = r.assignment.teamRef.name
        if (!payload[teamName]) payload[teamName] = []
        payload[teamName].push({ govId: r.govId, govName: r.govName, role: r.assignment.role })
      }
    }
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setBotSyncMsg('JSON copied for bot!')
    setTimeout(() => setBotSyncMsg(null), 3000)
  }

  // Post team assignments as a formatted Discord message
  function postToDiscord() {
    const lines: string[] = [`**📋 Ark Team Assignments**\n`]
    for (const team of teams) {
      const assigned = responses.filter(r => r.assignment?.teamRef?.id === team.id)
      if (assigned.length === 0) continue
      lines.push(`**${team.name}** (${assigned.length} players)`)
      for (const r of assigned) {
        const role = ROLE_LABELS[r.assignment?.role ?? 'member'] ?? 'Member'
        lines.push(`• ${r.govName}${role !== 'Member' ? ` — ${role}` : ''}`)
      }
      lines.push('')
    }
    const backups = responses.filter(r => r.assignment?.role === 'backup' && !r.assignment?.teamId)
    if (backups.length > 0) {
      lines.push(`**Backup**`)
      backups.forEach(r => lines.push(`• ${r.govName}`))
      lines.push('')
    }
    const unassigned = responses.filter(r => !r.assignment?.teamId && r.assignment?.role !== 'backup')
    if (unassigned.length > 0) {
      lines.push(`**Unassigned (${unassigned.length})**`)
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setBotSyncMsg('Discord message copied!')
    setTimeout(() => setBotSyncMsg(null), 3000)
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setCreatingTeam(true)}
          className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/25 text-primary text-sm font-medium px-4 py-2 hover:bg-primary/25 transition">
          <Plus className="h-4 w-4" /> Add Team
        </button>
        <button onClick={postToDiscord}
          className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-400/10 text-indigo-400 text-sm px-4 py-2 hover:bg-indigo-400/20 transition">
          <MessageSquare className="h-4 w-4" /> Post to Discord
        </button>
        <button onClick={generateBotPayload}
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 text-muted-foreground text-sm px-4 py-2 hover:bg-secondary hover:text-foreground transition">
          <Copy className="h-4 w-4" /> Copy JSON for Bot
        </button>
        {botSyncMsg && <span className="text-xs text-green-400">{botSyncMsg}</span>}
      </div>

      {/* Create team form */}
      {creatingTeam && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">New Team</p>
          <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
            placeholder="Team name (e.g. Team 1)"
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewTeamColor(c)}
                  className={cn("h-7 w-7 rounded-full border-2 transition", newTeamColor === c ? "border-white" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createTeam} disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-4 py-2 text-sm text-primary hover:bg-primary/25 disabled:opacity-40">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create
            </button>
            <button onClick={() => setCreatingTeam(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {teams.length === 0 && !creatingTeam && (
        <div className="text-center py-14 rounded-2xl border border-border/50 bg-card/60">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm mb-1">No teams yet</p>
          <p className="text-xs text-muted-foreground/60">Create teams then assign players from the Responses tab</p>
        </div>
      )}

      {/* Teams grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => {
          const teamResponses = responses.filter(r => r.assignment?.teamRef?.id === team.id)
          return (
            <div key={team.id} className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30"
                style={{ borderLeftColor: team.color, borderLeftWidth: 3 }}>
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                <span className="font-bold text-foreground flex-1">{team.name}</span>
                <span className="text-xs text-muted-foreground">{teamResponses.length} players</span>
                <button onClick={() => deleteTeam(team.id)}
                  className="text-muted-foreground hover:text-red-400 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-1.5 min-h-[80px]">
                {teamResponses.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 text-center py-3">No players assigned</p>
                ) : (
                  teamResponses.map(r => (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-muted/10 hover:bg-muted/20 transition">
                      <div className="h-5 w-5 shrink-0 rounded-full bg-muted/30 flex items-center justify-center text-[10px] font-bold text-foreground">
                        {r.govName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-foreground font-medium flex-1 truncate">{r.govName}</span>
                      <span className={cn("text-[10px]", ROLE_COLORS[r.assignment?.role ?? 'member'])}>
                        {ROLE_LABELS[r.assignment?.role ?? 'member']}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Map Planner (placeholder) ────────────────────────────────────────────────

function MapPlanner() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-8 text-center space-y-4">
      <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10">
        <Map className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground">Strategy Map Planner</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        An interactive Ark of Osiris map is coming. You&apos;ll be able to draw arrows, place team markers,
        plan obelisk routes, and export strategy images — replacing Discord screenshot planning.
      </p>
      <div className="inline-flex rounded-full border border-border/50 bg-muted/10 px-4 py-1.5 text-xs text-muted-foreground">
        Coming in next release
      </div>
    </div>
  )
}

// ─── Event Detail ─────────────────────────────────────────────────────────────

type EventTab = 'overview' | 'form' | 'responses' | 'teams' | 'map'

const EVENT_TABS: { id: EventTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'form', label: 'Form Builder', icon: ClipboardList },
  { id: 'responses', label: 'Responses', icon: Users },
  { id: 'teams', label: 'Teams', icon: Target },
  { id: 'map', label: 'Map', icon: Map },
]

function EventDetail({ event: initialEvent, onBack, appUrl }: {
  event: ArkEvent
  onBack: () => void
  appUrl: string
}) {
  const [event, setEvent] = useState(initialEvent)
  const [tab, setTab] = useState<EventTab>('overview')
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/ark/events/${event.id}`)
    const data = await res.json()
    if (res.ok) { setEvent(data.event); setReady(true) }
  }, [event.id])

  useEffect(() => { refresh() }, [refresh])

  const teams = event.teams ?? []

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          <ChevronLeft className="h-4 w-4" /> Events
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-semibold text-foreground">{event.name}</span>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {EVENT_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex-shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-primary/15 text-primary border border-primary/25"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent")}>
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {!ready ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {tab === 'overview' && <CommandCenter event={event} onRefresh={refresh} appUrl={appUrl} />}
          {tab === 'form' && <FormBuilder event={event} onRefresh={refresh} />}
          {tab === 'responses' && <ResponsesPanel event={event} teams={teams} />}
          {tab === 'teams' && <TeamsPanel event={event} onRefresh={refresh} />}
          {tab === 'map' && <MapPlanner />}
        </>
      )}
    </div>
  )
}

// ─── Main ArkContent ──────────────────────────────────────────────────────────

export function ArkContent() {
  const { user } = useAuth()
  const [events, setEvents] = useState<ArkEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<ArkEvent | null>(null)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: '', description: '', scheduledAt: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [appUrl, setAppUrl] = useState('')

  useEffect(() => {
    setAppUrl(window.location.origin)
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ark/events')
      const data = await res.json()
      setEvents(data.events ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  async function createEvent() {
    if (!newEvent.name.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/ark/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvents(e => [data.event, ...e])
      setSelectedEvent(data.event)
      setCreatingEvent(false)
      setNewEvent({ name: '', description: '', scheduledAt: '' })
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed')
    } finally { setCreating(false) }
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/ark/events/${id}`, { method: 'DELETE' })
    setEvents(e => e.filter(x => x.id !== id))
  }

  // If viewing a specific event
  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        onBack={() => { setSelectedEvent(null); fetchEvents() }}
        appUrl={appUrl}
      />
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ark of Osiris</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Command center for Ark registration, team building, and strategy planning.
          </p>
        </div>
        {user?.isAdmin && (
          <button onClick={() => setCreatingEvent(true)}
            className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/25 text-primary text-sm font-medium px-4 py-2 hover:bg-primary/25 transition">
            <Plus className="h-4 w-4" /> New Ark Event
          </button>
        )}
      </div>

      {/* Create event form */}
      {creatingEvent && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Create Ark Event</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Event Name *</label>
              <input value={newEvent.name} onChange={e => setNewEvent(n => ({ ...n, name: e.target.value }))}
                placeholder="e.g. Ark Week 45"
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Match Date (optional)</label>
              <input type="datetime-local" value={newEvent.scheduledAt} onChange={e => setNewEvent(n => ({ ...n, scheduledAt: e.target.value }))}
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <input value={newEvent.description} onChange={e => setNewEvent(n => ({ ...n, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          {createError && <p className="text-xs text-red-400">{createError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={createEvent} disabled={creating || !newEvent.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-5 py-2 text-sm font-medium text-primary hover:bg-primary/25 disabled:opacity-40">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Event
            </button>
            <button onClick={() => setCreatingEvent(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center rounded-2xl border border-border/50 bg-card/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Sword className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No Ark Events Yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm">
            Create your first Ark event to start building registration forms, collecting player availability, and assigning teams.
          </p>
          {user?.isAdmin && (
            <button onClick={() => setCreatingEvent(true)}
              className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/25 text-primary text-sm font-medium px-5 py-2.5 hover:bg-primary/25 transition">
              <Plus className="h-4 w-4" /> Create First Event
            </button>
          )}
          {!user && (
            <p className="text-xs text-muted-foreground">Sign in as an admin to create events.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={() => setSelectedEvent(event)}
              onDelete={() => deleteEvent(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
