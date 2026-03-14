'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Check, Globe, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── KvK types ────────────────────────────────────────────────────────────────

const KVK_TYPES = [
  { id: 'heroic-anthem',    label: 'Heroic Anthem',      camps: ['Fire','Earth','Water','Wind'] },
  { id: 'tides-of-war',     label: 'Tides of War',       camps: ['Fire','Earth','Water','Wind'] },
  { id: 'warriors-unbound', label: 'Warriors Unbound',   camps: ['Fire','Earth','Wind','Daybreak','Greenwood','Water'] },
  { id: 'king-of-britain',  label: 'King of All Britain',camps: ['Northumbria','Mercia','East Anglia','Wessex'] },
  { id: 'king-of-nile',     label: 'King of the Nile',   camps: ['Seth I','Seth III','Seth V','Horus II','Horus IV','Horus VI'] },
  { id: 'light-and-darkness',label: 'Light and Darkness',camps: ['I','II','III','IV','V','VI','VII','VIII'] },
  { id: 'distant-journey',  label: 'Distant Journey',    camps: ['I','II','III','IV','V','VI','VII','VIII'] },
  { id: 'endless-war',      label: 'Endless War',        camps: ['I','II','III','IV'] },
]

// ─── Bundle pricing ───────────────────────────────────────────────────────────

const BUNDLES = [
  {
    id: 'full-kvk',
    label: 'Full KvK',
    description: 'Track all camps & kingdoms',
    priceSoC: 200,
    priceNonSoC: 100,
    highlight: true,
    features: ['All camps tracked', 'Daily full scans', 'Real-time dashboard', 'DKP config & support'],
  },
  {
    id: 'two-camp',
    label: 'Two Camp Bundle',
    description: 'Track 2 camps of your choice',
    priceSoC: 100,
    priceNonSoC: 50,
    highlight: false,
    features: ['2 camps tracked', 'Daily scans', 'Dashboard access', 'DKP config'],
  },
  {
    id: 'one-camp',
    label: 'One Camp Bundle',
    description: 'Track a single camp',
    priceSoC: 50,
    priceNonSoC: 25,
    highlight: false,
    features: ['1 camp tracked', 'Daily scans', 'Dashboard access'],
  },
]

const CAMP_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Fire:          { text:'text-red-400',    bg:'bg-red-500/15',    border:'border-red-500/40' },
  Earth:         { text:'text-amber-500',  bg:'bg-amber-600/15',  border:'border-amber-500/40' },
  Water:         { text:'text-blue-400',   bg:'bg-blue-500/15',   border:'border-blue-500/40' },
  Wind:          { text:'text-violet-400', bg:'bg-violet-500/15', border:'border-violet-500/40' },
  Daybreak:      { text:'text-yellow-400', bg:'bg-yellow-500/15', border:'border-yellow-500/40' },
  Greenwood:     { text:'text-green-400',  bg:'bg-green-500/15',  border:'border-green-500/40' },
  Northumbria:   { text:'text-purple-400', bg:'bg-purple-500/15', border:'border-purple-500/40' },
  Mercia:        { text:'text-red-500',    bg:'bg-red-600/15',    border:'border-red-600/40' },
  'East Anglia': { text:'text-cyan-400',   bg:'bg-cyan-500/15',   border:'border-cyan-500/40' },
  Wessex:        { text:'text-yellow-500', bg:'bg-yellow-600/15', border:'border-yellow-500/40' },
  'Seth I':      { text:'text-red-400',    bg:'bg-red-500/15',    border:'border-red-500/40' },
  'Seth III':    { text:'text-red-400',    bg:'bg-red-500/15',    border:'border-red-500/40' },
  'Seth V':      { text:'text-red-400',    bg:'bg-red-500/15',    border:'border-red-500/40' },
  'Horus II':    { text:'text-blue-400',   bg:'bg-blue-500/15',   border:'border-blue-500/40' },
  'Horus IV':    { text:'text-blue-400',   bg:'bg-blue-500/15',   border:'border-blue-500/40' },
  'Horus VI':    { text:'text-blue-400',   bg:'bg-blue-500/15',   border:'border-blue-500/40' },
}

function getCampColor(camp: string) {
  return CAMP_COLORS[camp] ?? { text:'text-muted-foreground', bg:'bg-muted/20', border:'border-border/50' }
}

// ─── Kingdom row ──────────────────────────────────────────────────────────────

interface KingdomEntry { id: string; kdNum: string; camp: string; tracked: boolean }

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = ['KvK Type', 'Bundle', 'Kingdoms', 'Review']

interface CreateKvkModalProps {
  onClose: () => void
  onCreated: (data: { name: string; kvkType: string; bundle: string; isSoC: boolean; kingdoms: KingdomEntry[] }) => void
}

export function CreateKvkModal({ onClose, onCreated }: CreateKvkModalProps) {
  const [step, setStep] = useState(0)
  const [kvkName, setKvkName] = useState('')
  const [kvkType, setKvkType] = useState('')
  const [isSoC, setIsSoC] = useState(true)
  const [bundle, setBundle] = useState('')
  const [kingdoms, setKingdoms] = useState<KingdomEntry[]>([{ id: '1', kdNum: '', camp: '', tracked: true }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedType = KVK_TYPES.find(t => t.id === kvkType)
  const selectedBundle = BUNDLES.find(b => b.id === bundle)

  const maxTracked = bundle === 'full-kvk' ? Infinity : bundle === 'two-camp' ? 2 : 1

  function addKingdom() {
    setKingdoms(ks => [...ks, { id: String(Date.now()), kdNum: '', camp: '', tracked: true }])
  }

  function removeKingdom(id: string) {
    setKingdoms(ks => ks.filter(k => k.id !== id))
  }

  function updateKingdom(id: string, field: keyof KingdomEntry, value: string | boolean) {
    setKingdoms(ks => ks.map(k => k.id === id ? { ...k, [field]: value } : k))
  }

  const trackedCount = kingdoms.filter(k => k.tracked).length

  const canNext = (
    (step === 0 && kvkType !== '' && kvkName.trim() !== '') ||
    (step === 1 && bundle !== '') ||
    (step === 2 && kingdoms.some(k => k.kdNum.trim() !== '' && k.camp !== '')) ||
    step === 3
  )

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/kvk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: kvkName,
          kvkType,
          bundle,
          isSoC,
          kingdoms: kingdoms.filter(k => k.kdNum.trim() !== ''),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create KvK')
      onCreated({ name: kvkName, kvkType, bundle, isSoC, kingdoms: kingdoms.filter(k => k.kdNum.trim() !== '') })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Create New KvK</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 border-b border-border/50 px-6 py-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary/20 text-primary ring-1 ring-primary' :
                'bg-muted/30 text-muted-foreground'
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('ml-2 text-xs font-medium', i === step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
              {i < STEPS.length - 1 && <div className="mx-3 h-px w-8 bg-border/50" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[340px]">

          {/* Step 0: KvK Type */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KvK Name</label>
                <input
                  value={kvkName}
                  onChange={e => setKvkName(e.target.value)}
                  placeholder="e.g. Heroic Anthem #C13093"
                  className="mt-1.5 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KvK Type</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {KVK_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setKvkType(t.id)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                        kvkType === t.id
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                      )}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs opacity-60 mt-0.5">{t.camps.slice(0, 3).join(' · ')}{t.camps.length > 3 ? ` +${t.camps.length - 3}` : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kingdom Type</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {[{ val: true, label: 'SoC' }, { val: false, label: 'Non-SoC' }].map(o => (
                    <button
                      key={String(o.val)}
                      onClick={() => setIsSoC(o.val)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        isSoC === o.val ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >{o.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Bundle */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Pricing shown for <span className="text-foreground font-medium">{isSoC ? 'Season of Conquest' : 'Non-SoC'}</span> kingdoms.
              </p>
              {BUNDLES.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBundle(b.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all',
                    bundle === b.id
                      ? 'border-primary/60 bg-primary/8'
                      : 'border-border/50 hover:border-border',
                    b.highlight && bundle !== b.id && 'border-primary/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {b.highlight && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                        <span className={cn('font-semibold text-sm', bundle === b.id ? 'text-primary' : 'text-foreground')}>{b.label}</span>
                        {b.highlight && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-400">Recommended</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {b.features.map(f => (
                          <span key={f} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-green-400" />{f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn('text-xl font-bold tabular-nums', bundle === b.id ? 'text-primary' : 'text-foreground')}>
                        ${isSoC ? b.priceSoC : b.priceNonSoC}
                      </div>
                      <div className="text-xs text-muted-foreground">one-time</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Kingdoms */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Add participating kingdoms</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBundle?.id === 'full-kvk'
                      ? 'All kingdoms can be tracked.'
                      : `Up to ${maxTracked} kingdom${maxTracked > 1 ? 's' : ''} can be tracked with your bundle. Others will show on the map only.`}
                  </p>
                </div>
                <button
                  onClick={addKingdom}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Kingdom
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {kingdoms.map((k, idx) => {
                  const col = getCampColor(k.camp)
                  const canTrack = k.tracked || trackedCount < maxTracked
                  return (
                    <div key={k.id} className="flex items-center gap-2">
                      <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{idx + 1}</span>
                      <input
                        value={k.kdNum}
                        onChange={e => updateKingdom(k.id, 'kdNum', e.target.value)}
                        placeholder="KD number e.g. 3517"
                        className="w-36 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <select
                        value={k.camp}
                        onChange={e => updateKingdom(k.id, 'camp', e.target.value)}
                        className={cn(
                          'flex-1 rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-card/50',
                          k.camp ? `${col.border} ${col.text}` : 'border-border text-muted-foreground'
                        )}
                      >
                        <option value="">Select camp...</option>
                        {selectedType?.camps.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        onClick={() => canTrack && updateKingdom(k.id, 'tracked', !k.tracked)}
                        className={cn(
                          'flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all shrink-0',
                          k.tracked
                            ? 'border-green-500/40 bg-green-500/15 text-green-400'
                            : 'border-border/50 text-muted-foreground hover:border-border',
                          !canTrack && !k.tracked && 'opacity-40 cursor-not-allowed'
                        )}
                        title={k.tracked ? 'Tracked' : 'Map only'}
                      >
                        {k.tracked ? <><Check className="h-3 w-3" /> Tracked</> : <>Map only</>}
                      </button>
                      <button
                        onClick={() => kingdoms.length > 1 && removeKingdom(k.id)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground/50 hover:text-red-400 transition-colors disabled:opacity-30"
                        disabled={kingdoms.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {trackedCount > maxTracked && (
                <p className="text-xs text-amber-400">
                  ⚠ You have {trackedCount} kingdoms marked as tracked but your bundle allows {maxTracked}. Please set the extras to &quot;Map only&quot;.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">KvK Name</span>
                  <span className="font-medium text-foreground">{kvkName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{KVK_TYPES.find(t => t.id === kvkType)?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kingdom Type</span>
                  <span className="font-medium text-foreground">{isSoC ? 'Season of Conquest' : 'Non-SoC'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bundle</span>
                  <span className="font-medium text-foreground">{selectedBundle?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-bold text-primary text-base">${isSoC ? selectedBundle?.priceSoC : selectedBundle?.priceNonSoC}</span>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <span className="text-xs text-muted-foreground">Kingdoms</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {kingdoms.filter(k => k.kdNum.trim()).map(k => {
                      const col = getCampColor(k.camp)
                      return (
                        <span key={k.id} className={cn('rounded-md border px-2 py-0.5 text-xs font-medium flex items-center gap-1', col.bg, col.text, col.border)}>
                          {k.kdNum}
                          {!k.tracked && <Globe className="h-2.5 w-2.5 opacity-60" />}
                        </span>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    <Globe className="inline h-2.5 w-2.5 mr-1" />= map only (not tracked)
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                After confirming, our team will set up the bots in your kingdoms. You&apos;ll receive a Discord notification when scanning is active.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-6 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => canNext && setStep(s => s + 1)}
                disabled={!canNext}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-all',
                  canNext
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                )}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg bg-green-500/20 border border-green-500/30 px-5 py-2 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-400/30 border-t-green-400" />
                    Creating...
                  </span>
                ) : (
                  <><Check className="h-4 w-4" /> Confirm & Create KvK</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
