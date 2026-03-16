'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, Loader2, Search, ChevronDown, Globe, Shield, Zap, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Question = {
  id: string
  type: string
  key: string
  label: string
  placeholder?: string | null
  required: boolean
  botManaged: boolean
  options?: { value: string; label: string }[] | null
  translations?: Record<string, unknown> | null
  maxSelect?: number | null
}

type Form = {
  id: string
  shortCode: string
  title: string
  description?: string | null
  isOpen: boolean
  guildId?: string | null
  guildName?: string | null
  requireDiscordVerification?: boolean
  questions: Question[]
}

type Player = {
  govId: string
  govName: string
  allianceTag?: string | null
  power?: string | null
  discordVerified: boolean
  arkExperience?: boolean
  rallyCapacity?: string | null
  discordUserId?: string | null
  discordUsername?: string | null
}

// ─── Translations ─────────────────────────────────────────────────────────────

const LANGS: { code: string; label: string; dir?: 'rtl' }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'id', label: 'Indonesia' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'ru', label: 'Русский' },
]

const T: Record<string, Record<string, string>> = {
  en: {
    searchPlaceholder: 'Search your governor name...',
    searchHint: 'Start typing to find your character',
    noResults: 'No players found. Fill in manually.',
    submit: 'Submit Registration',
    submitting: 'Submitting...',
    success: 'Registration submitted!',
    successMsg: 'Your response has been recorded. Leadership will review and assign teams.',
    alreadySubmitted: 'You have already submitted this form.',
    formClosed: 'This form is currently closed.',
    required: 'This field is required.',
    verifiedDiscord: 'Verified in Discord',
    notVerifiedDiscord: 'Not verified in Discord',
    botData: 'Auto-filled from bot data',
    selectPlaceholder: 'Select an option',
    selectGovFirst: 'Select your governor above first',
    powerM: 'M Power',
    rally: 'Rally Capacity',
  },
  es: {
    searchPlaceholder: 'Busca tu nombre de gobernador...',
    searchHint: 'Escribe para encontrar tu personaje',
    noResults: 'Sin resultados. Completa manualmente.',
    submit: 'Enviar Registro',
    submitting: 'Enviando...',
    success: '¡Registro enviado!',
    successMsg: 'Tu respuesta ha sido registrada. El liderazgo revisará y asignará equipos.',
    alreadySubmitted: 'Ya has enviado este formulario.',
    formClosed: 'Este formulario está cerrado.',
    required: 'Este campo es obligatorio.',
    verifiedDiscord: 'Verificado en Discord',
    notVerifiedDiscord: 'No verificado en Discord',
    botData: 'Completado automáticamente',
    selectPlaceholder: 'Selecciona una opción',
    selectGovFirst: 'Selecciona tu gobernador primero',
    powerM: 'M Poder',
    rally: 'Capacidad de Concentración',
  },
  de: {
    searchPlaceholder: 'Gouverneursnamen suchen...',
    searchHint: 'Tippe um deinen Charakter zu finden',
    noResults: 'Keine Ergebnisse. Manuell ausfüllen.',
    submit: 'Registrierung Senden',
    submitting: 'Senden...',
    success: 'Registrierung eingereicht!',
    successMsg: 'Deine Antwort wurde gespeichert.',
    alreadySubmitted: 'Du hast dieses Formular bereits ausgefüllt.',
    formClosed: 'Dieses Formular ist derzeit geschlossen.',
    required: 'Dieses Feld ist erforderlich.',
    verifiedDiscord: 'In Discord verifiziert',
    notVerifiedDiscord: 'Nicht verifiziert',
    botData: 'Automatisch ausgefüllt',
    selectPlaceholder: 'Option auswählen',
    selectGovFirst: 'Wähle zuerst deinen Gouverneur',
    powerM: 'M Macht',
    rally: 'Sammelpunkt Kapazität',
  },
}

function t(lang: string, key: string): string {
  return T[lang]?.[key] ?? T['en'][key] ?? key
}

// ─── PlayerSearch ─────────────────────────────────────────────────────────────

function PlayerSearch({
  lang,
  onSelect,
  guildId,
}: {
  lang: string
  onSelect: (player: Player | null, govName: string, govId: string) => void
  guildId?: string | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Player | null>(null)
  const [manualId, setManualId] = useState('')
  const [manualName, setManualName] = useState('')
  const [useManual, setUseManual] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const url = guildId
      ? `/api/ark/verified-players?guildId=${encodeURIComponent(guildId)}&q=${encodeURIComponent(q)}&limit=10`
      : `/api/ark/players?q=${encodeURIComponent(q)}&limit=10`
    fetch(url)
      .then(r => r.json())
      .then(d => setResults(d.players ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [guildId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectPlayer(p: Player) {
    setSelected(p)
    setQuery(p.govName)
    setOpen(false)
    onSelect(p, p.govName, p.govId)
  }

  function handleManualSubmit() {
    if (!manualId.trim() || !manualName.trim()) return
    onSelect(null, manualName.trim(), manualId.trim())
    setUseManual(false)
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <label className="block text-sm font-semibold text-white mb-1.5">{t(lang, 'searchPlaceholder').replace('...', '')}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null) }}
            onFocus={() => setOpen(true)}
            placeholder={t(lang, 'searchPlaceholder')}
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-10 py-3.5 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-violet-400/60 focus:bg-white/15 transition"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSelected(null); setResults([]); onSelect(null, '', '') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {open && (query.length >= 1) && (
          <div className="absolute z-20 w-full mt-1 rounded-xl border border-white/20 bg-[#1a1040] shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-white/50">{t(lang, 'noResults')}</div>
            ) : (
              results.map(p => (
                <button key={p.govId} onClick={() => selectPlayer(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition text-left border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-white">{p.govName}</div>
                    <div className="text-xs text-white/40 font-mono">ID: {p.govId}{p.allianceTag ? ` · ${p.allianceTag}` : ''}</div>
                  </div>
                  {p.power && (
                    <div className="text-xs text-violet-300 font-medium shrink-0 ml-2">
                      {(Number(p.power) / 1_000_000).toFixed(1)}M
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-sm font-bold">
            {selected.govName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">{selected.govName}</div>
            <div className="text-xs text-white/50 font-mono">ID: {selected.govId}</div>
          </div>
          {selected.discordVerified && (
            <div className="flex items-center gap-1 text-xs text-green-400 shrink-0">
              <Shield className="h-3.5 w-3.5" /> Discord
            </div>
          )}
        </div>
      )}

      {!selected && !useManual && (
        <button onClick={() => setUseManual(true)}
          className="text-xs text-white/40 hover:text-white/60 transition underline">
          Can&apos;t find your name? Enter manually →
        </button>
      )}

      {useManual && !selected && (
        <div className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3">
          <p className="text-xs text-white/50">Enter your details manually</p>
          <input value={manualName} onChange={e => setManualName(e.target.value)}
            placeholder="Governor Name"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/60" />
          <input value={manualId} onChange={e => setManualId(e.target.value)}
            placeholder="Governor ID (numbers only)"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-violet-400/60" />
          <div className="flex gap-2">
            <button onClick={handleManualSubmit} disabled={!manualId.trim() || !manualName.trim()}
              className="flex-1 rounded-lg bg-violet-500/20 border border-violet-400/30 text-violet-300 text-sm font-medium py-2 hover:bg-violet-500/30 transition disabled:opacity-40">
              Confirm
            </button>
            <button onClick={() => setUseManual(false)}
              className="px-4 rounded-lg border border-white/15 text-white/50 text-sm hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Commander Input ──────────────────────────────────────────────────────────

type CommanderEntry = { name: string; skills: [number, number, number, number] }

function CommanderInput({ value, onChange }: {
  value: CommanderEntry[]
  onChange: (v: CommanderEntry[]) => void
  lang: string
}) {
  function addCommander() {
    onChange([...value, { name: '', skills: [1, 1, 1, 1] }])
  }
  function removeCommander(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }
  function setName(i: number, name: string) {
    onChange(value.map((c, idx) => idx === i ? { ...c, name } : c))
  }
  function setSkill(i: number, skillIdx: number, level: number) {
    onChange(value.map((c, idx) => idx === i ? { ...c, skills: c.skills.map((s, si) => si === skillIdx ? level : s) as [number,number,number,number] } : c))
  }

  return (
    <div className="space-y-3">
      {value.map((cmd, i) => (
        <div key={i} className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={cmd.name}
              onChange={e => setName(i, e.target.value)}
              placeholder="Commander name (e.g. Cao Cao)"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/60"
            />
            <button onClick={() => removeCommander(i)} className="text-white/30 hover:text-red-400 transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/40 shrink-0 w-12">Skills:</span>
            {cmd.skills.map((skill, si) => (
              <div key={si} className="flex-1 space-y-0.5">
                <p className="text-[10px] text-white/30 text-center">S{si + 1}</p>
                <select
                  value={skill}
                  onChange={e => setSkill(i, si, parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-violet-400/60 appearance-none cursor-pointer"
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
      {value.length < 8 && value.length > 0 && (
        <button type="button" onClick={addCommander}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition">
          <Plus className="h-4 w-4" /> Add commander
        </button>
      )}
      {value.length === 0 && (
        <button type="button" onClick={addCommander}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-4 text-sm text-white/40 hover:border-white/30 hover:text-white/60 transition">
          <Plus className="h-4 w-4" /> Add your first commander
        </button>
      )}
    </div>
  )
}

// ─── Question rendering ───────────────────────────────────────────────────────

function QuestionField({
  q, value, onChange, lang, playerData, error,
}: {
  q: Question
  value: unknown
  onChange: (v: unknown) => void
  lang: string
  playerData: Player | null
  error?: string
}) {
  const base = "w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-base focus:outline-none transition"
  const normal = "border-white/20 focus:border-violet-400/60 focus:bg-white/15"
  const errCls = "border-red-400/50 bg-red-500/5"

  if (q.botManaged) {
    // Auto-filled display
    let displayValue = ''
    let icon = null
    if (q.key === 'gov_name') displayValue = playerData?.govName ?? '—'
    else if (q.key === 'gov_id') displayValue = playerData?.govId ?? '—'
    else if (q.key === 'power') {
      const pw = playerData?.power ? Number(playerData.power) / 1_000_000 : null
      displayValue = pw ? `${pw.toFixed(1)}M` : '—'
    } else if (q.key === 'discord') {
      displayValue = playerData?.discordVerified ? t(lang, 'verifiedDiscord') : t(lang, 'notVerifiedDiscord')
      icon = playerData?.discordVerified ? <Shield className="h-4 w-4 text-green-400" /> : <Shield className="h-4 w-4 text-red-400/60" />
    }
    return (
      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">{q.label}</label>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          {icon}
          <span className="text-sm text-white/70">{displayValue || <span className="text-white/30 text-xs">{t(lang, 'selectGovFirst')}</span>}</span>
          <span className="ml-auto text-[10px] text-white/30 italic">{t(lang, 'botData')}</span>
        </div>
      </div>
    )
  }

  if (q.type === 'select') {
    const selected = String(value ?? '')
    function pickOption(v: string) {
      // Toggle off if already selected; otherwise select
      onChange(selected === v ? '' : v)
    }
    return (
      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          {q.label} {q.required && <span className="text-red-400">*</span>}
        </label>
        <div className="space-y-2">
          {(q.options ?? []).map(o => (
            <button key={o.value} type="button" onClick={() => pickOption(o.value)}
              className={cn("w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-left transition",
                selected === o.value
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white")}>
              <div className={cn("h-4 w-4 shrink-0 rounded-full border transition",
                selected === o.value ? "bg-violet-500 border-violet-400" : "border-white/30")} />
              {o.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  if (q.type === 'timeslots') {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : []
    const satOptions = q.options?.filter(o => o.value.startsWith('sat_')) ?? []
    const sunOptions = q.options?.filter(o => o.value.startsWith('sun_')) ?? []
    const singleSelect = q.maxSelect === 1
    function toggle(v: string) {
      if (singleSelect) {
        onChange(selected.includes(v) ? [] : [v])
      } else {
        onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
      }
    }
    return (
      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          {q.label} {q.required && <span className="text-red-400">*</span>}
        </label>
        <div className="space-y-3">
          {satOptions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Saturday</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {satOptions.map(o => (
                  <button key={o.value} type="button" onClick={() => toggle(o.value)}
                    className={cn("rounded-xl border py-3 px-3 text-sm font-medium transition",
                      selected.includes(o.value)
                        ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                        : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white")}>
                    {o.label.replace('Saturday ', '')}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sunOptions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Sunday</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sunOptions.map(o => (
                  <button key={o.value} type="button" onClick={() => toggle(o.value)}
                    className={cn("rounded-xl border py-3 px-3 text-sm font-medium transition",
                      selected.includes(o.value)
                        ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                        : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white")}>
                    {o.label.replace('Sunday ', '')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  if (q.type === 'checkboxes') {
    const selectedVals: string[] = Array.isArray(value) ? (value as string[]) : []
    const singleSelect = q.maxSelect === 1
    function toggleCheckbox(v: string) {
      if (singleSelect) {
        onChange(selectedVals.includes(v) ? [] : [v])
      } else {
        onChange(selectedVals.includes(v) ? selectedVals.filter(x => x !== v) : [...selectedVals, v])
      }
    }
    return (
      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          {q.label} {q.required && <span className="text-red-400">*</span>}
        </label>
        <div className="space-y-2">
          {(q.options ?? []).map(o => (
            <button key={o.value} type="button" onClick={() => toggleCheckbox(o.value)}
              className={cn("w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-left transition",
                selectedVals.includes(o.value)
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white")}>
              <div className={cn("h-4 w-4 shrink-0 rounded border transition",
                selectedVals.includes(o.value) ? "bg-violet-500 border-violet-400" : "border-white/30")} />
              {o.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  if (q.type === 'commanders') {
    const commanders: CommanderEntry[] = Array.isArray(value) && (value as CommanderEntry[]).length > 0
      ? value as CommanderEntry[]
      : [{ name: '', skills: [1, 1, 1, 1] }]
    return (
      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          {q.label} {q.required && <span className="text-red-400">*</span>}
        </label>
        <CommanderInput value={commanders} onChange={onChange} lang={lang} />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  if (q.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-semibold text-white mb-1.5">
          {q.label} {q.required && <span className="text-red-400">*</span>}
        </label>
        <textarea value={String(value ?? '')} onChange={e => onChange(e.target.value)}
          placeholder={q.placeholder ?? ''}
          rows={3}
          className={cn(base, error ? errCls : normal, "resize-none")} />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }

  // Default: text or number
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-1.5">
        {q.label} {q.required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={q.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={e => onChange(q.type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={q.placeholder ?? ''}
        className={cn(base, error ? errCls : normal)}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ArkFormClient({ form }: { form: Form }) {
  const [lang, setLang] = useState('en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [govId, setGovId] = useState('')
  const [govName, setGovName] = useState('')
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {}
    for (const q of form.questions) {
      if (q.type === 'commanders') init[q.key] = [{ name: '', skills: [1, 1, 1, 1] }]
    }
    return init
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)

  // Auto-detect logged-in user's governor
  useEffect(() => {
    if (!form.guildId) return
    fetch(`/api/ark/me-player?guildId=${form.guildId}`)
      .then(r => r.json())
      .then(d => {
        if (d.player) {
          setSelectedPlayer(d.player)
          setGovId(d.player.govId)
          setGovName(d.player.govName)
          setAutoDetected(true)
        }
      })
      .catch(() => {})
  }, [form.guildId])

  const visibleQuestions = form.questions.filter(q => q.type !== 'botfield' || q.botManaged)

  function handlePlayerSelect(player: Player | null, name: string, id: string) {
    setSelectedPlayer(player)
    setGovName(name)
    setGovId(id)
    // Pre-fill ark experience if player data available
    if (player?.arkExperience) {
      setAnswers(prev => ({ ...prev, ark_exp: 'yes' }))
    }
  }

  function setAnswer(key: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!govId || !govName) {
      newErrors['_player'] = 'Please select or enter your governor name above.'
    }
    for (const q of form.questions) {
      if (!q.required || q.botManaged) continue
      const val = answers[q.key]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        newErrors[q.key] = t(lang, 'required')
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/ark/submit/${form.shortCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ govId, govName, answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Submission failed')
      } else {
        setSubmitted(true)
      }
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!form.isOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0821] via-[#110f2e] to-[#0a0f1e] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">{form.title}</h1>
          <p className="text-white/50">{t(lang, 'formClosed')}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0821] via-[#110f2e] to-[#0a0f1e] flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 border border-green-400/30">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{t(lang, 'success')}</h1>
          <p className="text-white/60">{t(lang, 'successMsg')}</p>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            <span className="font-mono">{govName}</span> — ID: <span className="font-mono">{govId}</span>
          </div>
        </div>
      </div>
    )
  }

  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0]

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-[#0d0821] via-[#110f2e] to-[#0a0f1e]",
      currentLang.dir === 'rtl' && "rtl"
    )}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0d0821]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <Zap className="h-4 w-4 text-violet-300" />
          </div>
          <span className="text-sm font-bold text-white">RoK Toolkit</span>
        </div>
        {/* Language picker */}
        <div className="relative">
          <button onClick={() => setShowLangPicker(v => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white transition">
            <Globe className="h-3.5 w-3.5" />
            {currentLang.label}
          </button>
          {showLangPicker && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-white/15 bg-[#1a1040] shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setShowLangPicker(false) }}
                  className={cn("w-full text-left px-4 py-2.5 text-sm transition",
                    l.code === lang ? "bg-violet-500/20 text-violet-200" : "text-white/60 hover:bg-white/5 hover:text-white")}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">{form.title}</h1>
          {form.description && <p className="text-sm text-white/50">{form.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player search */}
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5 space-y-3">
            {form.guildId ? (
              <p className="text-xs text-white/50">
                <Shield className="inline h-3.5 w-3.5 mr-1 text-violet-400" />
                Search your governor name — your verified stats from <span className="text-white/70 font-medium">{form.guildName ?? 'the linked server'}</span> will auto-fill.
              </p>
            ) : (
              <p className="text-xs text-white/50">Enter your governor name and ID below.</p>
            )}
            {autoDetected && selectedPlayer ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-300 text-sm font-bold">
                    {selectedPlayer.govName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{selectedPlayer.govName}</div>
                    <div className="text-xs text-white/50 font-mono">ID: {selectedPlayer.govId}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-400 shrink-0">
                    <Shield className="h-3.5 w-3.5" /> Verified
                  </div>
                </div>
                <button onClick={() => { setAutoDetected(false); setSelectedPlayer(null); setGovId(''); setGovName('') }}
                  className="text-xs text-white/40 hover:text-white/60 transition underline">
                  Not you? Search another name →
                </button>
              </div>
            ) : (
              <PlayerSearch lang={lang} onSelect={handlePlayerSelect} guildId={form.guildId} />
            )}
            {errors['_player'] && <p className="text-xs text-red-400 mt-2">{errors['_player']}</p>}
          </div>

          {/* Questions */}
          {visibleQuestions.map(q => (
            <QuestionField
              key={q.id}
              q={q}
              value={answers[q.key]}
              onChange={v => setAnswer(q.key, v)}
              lang={lang}
              playerData={selectedPlayer}
              error={errors[q.key]}
            />
          ))}

          {/* Submit error */}
          {submitError && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white font-bold py-4 text-base transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {t(lang, 'submitting')}</>
            ) : t(lang, 'submit')}
          </button>

          <p className="text-center text-xs text-white/25 pb-8">
            Powered by RoK Toolkit · {form.shortCode}
          </p>
        </form>
      </div>
    </div>
  )
}
