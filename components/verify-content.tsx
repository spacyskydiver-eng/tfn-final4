'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, Shield, Settings, Users, Copy, Check, ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

interface VerificationRule {
  id: string
  allianceTag: string
  roleId: string
  label: string | null
}

interface VerificationLog {
  id: string
  discordUserId: string
  discordUsername: string
  govId: string | null
  govName: string | null
  allianceTag: string | null
  result: string
  roleName: string | null
  roleAssigned: string | null
  createdAt: string
}

interface VerificationServer {
  id: string
  guildId: string
  guildName: string
  channelId: string | null
  staffRoleId: string | null
  freeLimit: number
  usedCount: number
  active: boolean
  rules: VerificationRule[]
}

// ─── Tab: Setup ───────────────────────────────────────────────────────────────

function SetupTab({ server, onUpdated }: { server: VerificationServer; onUpdated: (s: VerificationServer) => void }) {
  const [form, setForm] = useState({ guildName: server.guildName, channelId: server.channelId ?? '', staffRoleId: server.staffRoleId ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const botClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? ''
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=268435456&scope=bot`

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch(`/api/verify/servers/${server.guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onUpdated(data.server)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const used = server.usedCount
  const limit = server.freeLimit
  const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const remaining = limit === -1 ? null : limit - used

  return (
    <div className="space-y-5">
      {/* Invite bot */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Step 1 — Invite the TFN Bot</p>
        <p className="text-xs text-muted-foreground mb-3">The bot needs to be in your Discord server to watch for verification images.</p>
        <a href={inviteUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Invite TFN Bot to Your Server
        </a>
      </div>

      {/* Config */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">Server Configuration</p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Server ID</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground">{server.guildId}</code>
            <button onClick={() => { navigator.clipboard.writeText(server.guildId); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
              className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Server Name</label>
          <input value={form.guildName} onChange={e => setForm(f => ({ ...f, guildName: e.target.value }))}
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Verification Channel ID</label>
          <p className="text-[11px] text-muted-foreground/70">Enable Developer Mode in Discord → right-click the channel → Copy Channel ID</p>
          <input value={form.channelId} onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}
            placeholder="e.g. 1234567890123456789"
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Staff Role ID <span className="font-normal">(pinged on failed verifications)</span></label>
          <input value={form.staffRoleId} onChange={e => setForm(f => ({ ...f, staffRoleId: e.target.value }))}
            placeholder="e.g. 1234567890123456789"
            className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Settings className="h-3.5 w-3.5" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Verification Usage</p>
          {limit !== -1 && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
              pct >= 100 ? 'bg-red-500/15 text-red-400' :
              pct >= 80  ? 'bg-amber-500/15 text-amber-400' :
                           'bg-green-500/15 text-green-400'
            )}>
              {pct >= 100 ? 'Limit reached' : `${remaining} remaining`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-primary')}
              style={{ width: limit === -1 ? '0%' : `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
            {limit === -1 ? `${used} used (unlimited)` : `${used} / ${limit}`}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {limit === -1
            ? 'Unlimited verifications on this server.'
            : `First ${limit} verifications are free. Contact TFN staff to increase your limit.`}
        </p>
      </div>
    </div>
  )
}

// ─── Tab: Rules ───────────────────────────────────────────────────────────────

function RulesTab({ server }: { server: VerificationServer; onUpdated: (s: VerificationServer) => void }) {
  const [rules, setRules] = useState<VerificationRule[]>(server.rules)
  const [form, setForm] = useState({ allianceTag: '', roleId: '', label: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addRule() {
    if (!form.allianceTag.trim() || !form.roleId.trim()) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/verify/servers/${server.guildId}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setRules(r => [...r, data.rule])
      setForm({ allianceTag: '', roleId: '', label: '' })
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  async function deleteRule(ruleId: string) {
    try {
      const res = await fetch(`/api/verify/servers/${server.guildId}/rules/${ruleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRules(r => r.filter(x => x.id !== ruleId))
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Delete failed') }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/50 bg-card/60 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Alliance Verification Rules</p>
          <p className="text-xs text-muted-foreground mt-0.5">When a player posts their governor profile screenshot, the bot checks their alliance tag against these rules and assigns the matching Discord role.</p>
        </div>

        {rules.length > 0 ? (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-primary">{rule.allianceTag}</span>
                    {rule.label && <span className="text-xs text-muted-foreground">— {rule.label}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Assigns role ID: {rule.roleId}</p>
                </div>
                <button onClick={() => deleteRule(rule.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No rules yet — add one below to start verifying members.</p>
        )}

        <div className="border-t border-border/50 pt-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Add Rule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Alliance Tag</label>
              <input value={form.allianceTag} onChange={e => setForm(f => ({ ...f, allianceTag: e.target.value }))}
                placeholder="[W13J]"
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Discord Role ID</label>
              <input value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                placeholder="1234567890..."
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Label (optional)</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Wolves of Judgment"
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <button onClick={addRule} disabled={saving || !form.allianceTag.trim() || !form.roleId.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Rule
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Members ─────────────────────────────────────────────────────────────

function MembersTab({ server }: { server: VerificationServer }) {
  const [logs, setLogs] = useState<VerificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/verify/servers/${server.guildId}`)
      const data = await res.json()
      if (res.ok) setLogs(data.logs ?? [])
    } finally { setLoading(false) }
  }, [server.guildId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const verified = logs.filter(l => l.result === 'success')
  const failed   = logs.filter(l => l.result !== 'success')
  const displayed = showAll ? logs : verified

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAll(false)}
            className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              !showAll ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:bg-secondary'
            )}>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Verified ({verified.length})</span>
          </button>
          <button onClick={() => setShowAll(true)}
            className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              showAll ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:bg-secondary'
            )}>
            <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> All Activity ({logs.length})</span>
          </button>
        </div>
        <button onClick={fetchLogs} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center rounded-xl border border-border/50 bg-card/60">
          <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{showAll ? 'No activity yet' : 'No verified members yet'}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Members will appear here after posting their governor profile in the verification channel</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                <th className="py-2.5 pl-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discord</th>
                <th className="py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Governor</th>
                <th className="py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Alliance</th>
                {showAll && <th className="py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>}
                <th className="py-2.5 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(log => (
                <tr key={log.id} className="border-b border-border/30 last:border-0 hover:bg-muted/5 transition-colors">
                  <td className="py-3 pl-4">
                    <div className="font-medium text-foreground text-sm">{log.discordUsername}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{log.discordUserId}</div>
                  </td>
                  <td className="py-3">
                    <div className="text-sm text-foreground">{log.govName ?? '—'}</div>
                    {log.govId && <div className="text-[11px] text-muted-foreground font-mono">ID: {log.govId}</div>}
                  </td>
                  <td className="py-3 hidden sm:table-cell">
                    {log.allianceTag
                      ? <span className="font-mono text-xs font-semibold text-primary">{log.allianceTag}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                    {log.roleName && <div className="text-[11px] text-muted-foreground mt-0.5">{log.roleName}</div>}
                  </td>
                  {showAll && (
                    <td className="py-3">
                      {log.result === 'success'
                        ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                        : log.result === 'failed_alliance'
                        ? <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" /> Bad Alliance</span>
                        : log.result === 'already_used'
                        ? <span className="flex items-center gap-1 text-xs text-amber-400"><AlertCircle className="h-3.5 w-3.5" /> Already Used</span>
                        : <span className="text-xs text-muted-foreground">{log.result}</span>}
                    </td>
                  )}
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const VERIFY_TABS = [
  { id: 'setup',   label: 'Setup',   icon: Settings },
  { id: 'rules',   label: 'Rules',   icon: Shield   },
  { id: 'members', label: 'Members', icon: Users    },
] as const

export function VerifyContent() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'setup' | 'rules' | 'members'>('setup')
  const [servers, setServers] = useState<VerificationServer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ guildId: '', guildName: '' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/verify/servers')
      const data = await res.json()
      if (res.ok) {
        setServers(data.servers)
        if (data.servers.length > 0 && !selectedId) setSelectedId(data.servers[0].guildId)
      }
    } finally { setLoading(false) }
  }, [selectedId])

  useEffect(() => { fetchServers() }, [fetchServers])

  const selected = servers.find(s => s.guildId === selectedId) ?? null

  async function addServer() {
    if (!addForm.guildId.trim() || !addForm.guildName.trim()) return
    setAdding(true); setAddError(null)
    try {
      const res = await fetch('/api/verify/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setServers(s => [data.server, ...s])
      setSelectedId(data.server.guildId)
      setShowAdd(false)
      setAddForm({ guildId: '', guildName: '' })
    } catch (e: unknown) { setAddError(e instanceof Error ? e.message : 'Failed') }
    finally { setAdding(false) }
  }

  function handleUpdated(updated: VerificationServer) {
    setServers(s => s.map(x => x.guildId === updated.guildId ? updated : x))
  }

  async function deleteServer(guildId: string) {
    setDeleting(true); setDeleteError(null)
    try {
      const res = await fetch(`/api/verify/servers/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId }),
      })
      const data = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) throw new Error((data.error as string) ?? `Error ${res.status}`)
      const remaining = servers.filter(s => s.guildId !== guildId)
      setServers(remaining)
      setSelectedId(remaining.length > 0 ? remaining[0].guildId : null)
      setConfirmDelete(false)
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Discord Verification</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in with Discord to configure the TFN verification bot for your server. Free up to 150 verifications.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Discord Verification</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-verify players by scanning governor profile screenshots. Free up to 150 verifications per server.</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
          Add Server
        </button>
      </div>

      {/* Add server form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Register a Discord Server</p>
          <p className="text-xs text-muted-foreground">Right-click your server in Discord (with Developer Mode on) → Copy Server ID</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Server ID</label>
              <input value={addForm.guildId} onChange={e => setAddForm(f => ({ ...f, guildId: e.target.value }))}
                placeholder="e.g. 1034524321680457801"
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Server Name</label>
              <input value={addForm.guildName} onChange={e => setAddForm(f => ({ ...f, guildName: e.target.value }))}
                placeholder="My Kingdom Server"
                className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={addServer} disabled={adding || !addForm.guildId.trim() || !addForm.guildName.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/25 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 disabled:opacity-40">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Register Server
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            {addError && <span className="text-xs text-red-400">{addError}</span>}
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

      {!loading && servers.length === 0 && !showAdd && (
        <div className="flex flex-col items-center py-16 text-center rounded-xl border border-border/50 bg-card/60">
          <Shield className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No servers registered yet</p>
          <p className="text-xs text-muted-foreground mb-4">Add your Discord server to start auto-verifying members</p>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/25 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/25">
            <Plus className="h-4 w-4" />
            Add Your Server
          </button>
        </div>
      )}

      {!loading && servers.length > 0 && (
        <>
          {/* Server selector + delete */}
          <div className="flex flex-wrap gap-2 items-center">
            {servers.length > 1 && servers.map(s => (
              <button key={s.guildId} onClick={() => setSelectedId(s.guildId)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedId === s.guildId
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}>
                {s.guildName}
              </button>
            ))}
            {selected && !confirmDelete && (
              <button onClick={() => { setConfirmDelete(true); setDeleteError(null) }}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Delete Server
              </button>
            )}
          </div>

          {/* Inline delete confirmation */}
          {selected && confirmDelete && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <p className="text-sm text-foreground flex-1">
                Delete <span className="font-semibold">{selected.guildName}</span>? This removes all rules and verified member history.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                  className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
                <button onClick={() => deleteServer(selected.guildId)} disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50">
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Confirm Delete
                </button>
              </div>
              {deleteError && <p className="text-xs text-red-400 w-full">{deleteError}</p>}
            </div>
          )}

          {selected && (
            <>
              {/* Tab nav */}
              <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card/40 p-1 w-fit">
                {VERIFY_TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}>
                    <t.icon className="h-4 w-4" />
                    {t.label}
                    {t.id === 'members' && selected.usedCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {selected.usedCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === 'setup'   && <SetupTab server={selected} onUpdated={handleUpdated} />}
              {tab === 'rules'   && <RulesTab server={selected} onUpdated={handleUpdated} />}
              {tab === 'members' && <MembersTab server={selected} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
