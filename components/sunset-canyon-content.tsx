'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  Sword,
  Crosshair,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  ChevronDown,
  Zap,
  Trophy,
  AlertTriangle,
  RotateCcw,
  Target,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants & Types                                                   */
/* ------------------------------------------------------------------ */

const KNOWN_COMMANDERS = [
  'Constantine I',
  'Wu Zetian',
  'Theodora',
  'Richard I',
  'Charles Martel',
  'Sun Tzu',
  'Yi Seong-Gye',
  'Aethelflaed',
  'Joan of Arc',
  'Guan Yu',
  'Alexander the Great',
  'Genghis Khan',
  'Ramesses II',
  'Scipio Africanus',
  'Eulji Mundeok',
  'Björn Ironside',
  'Hermann',
  'Saladin',
  'El Cid',
  'Cao Cao',
  'Minamoto',
  'Harald Sigurdsson',
  'Baibars',
  'Mehmed II',
]

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'mixed'

interface Commander {
  id: string
  name: string
  level: number
  stars: number
  skills: [number, number, number, number]
  troopType: TroopType
}

interface Army {
  primary: Commander
  secondary: Commander
  score: number
}

interface Formation {
  armies: Army[]
  winRate: number
  totalPower: number
  notes: string[]
}

const TROOP_ICONS: Record<TroopType, React.ReactNode> = {
  infantry: <Shield className="h-4 w-4" />,
  cavalry: <Sword className="h-4 w-4" />,
  archer: <Crosshair className="h-4 w-4" />,
  mixed: <Users className="h-4 w-4" />,
}

const TROOP_COLORS: Record<TroopType, string> = {
  infantry: 'text-blue-400',
  cavalry: 'text-orange-400',
  archer: 'text-green-400',
  mixed: 'text-purple-400',
}

const TROOP_BG: Record<TroopType, string> = {
  infantry: 'bg-blue-500/15 border-blue-500/30',
  cavalry: 'bg-orange-500/15 border-orange-500/30',
  archer: 'bg-green-500/15 border-green-500/30',
  mixed: 'bg-purple-500/15 border-purple-500/30',
}

/* ------------------------------------------------------------------ */
/*  Algorithm                                                           */
/* ------------------------------------------------------------------ */

function calcPower(c: Commander): number {
  const skillSum = c.skills.reduce((a, b) => a + b, 0)
  const skillRatio = skillSum / 20
  const rarityBonus = c.level >= 50 ? 300 : c.level >= 30 ? 150 : 50
  return (
    c.level * c.level * 2 +
    skillSum * 100 * (1 + skillRatio) +
    c.stars * 400 +
    rarityBonus
  )
}

function isViable(c: Commander): boolean {
  return c.level >= 30 && Math.max(...c.skills) >= 3 && c.stars >= 2
}

function pairingScore(primary: Commander, secondary: Commander): number {
  const pp = calcPower(primary)
  const sp = calcPower(secondary)
  let score = pp / 10 + sp / 15

  // Same troop type bonus
  if (primary.troopType === secondary.troopType) score += 30

  // Cavalry penalty
  if (primary.troopType === 'cavalry') score -= 25
  if (secondary.troopType === 'cavalry') score -= 25

  // Infantry bonus
  if (primary.troopType === 'infantry') score += 20
  if (secondary.troopType === 'infantry') score += 20

  // Viability penalties
  if (!isViable(primary)) score -= 500
  if (!isViable(secondary)) score -= 300

  return score
}

function optimizeFormation(commanders: Commander[]): Formation | null {
  if (commanders.length < 2) return null

  // Build all pair combos
  const pairs: { primary: Commander; secondary: Commander; score: number }[] = []
  for (let i = 0; i < commanders.length; i++) {
    for (let j = 0; j < commanders.length; j++) {
      if (i === j) continue
      pairs.push({
        primary: commanders[i],
        secondary: commanders[j],
        score: pairingScore(commanders[i], commanders[j]),
      })
    }
  }

  // Sort by score descending
  pairs.sort((a, b) => b.score - a.score)

  // Greedy: pick up to 5 non-overlapping armies
  const used = new Set<string>()
  const armies: Army[] = []
  for (const pair of pairs) {
    if (armies.length >= 5) break
    if (used.has(pair.primary.id) || used.has(pair.secondary.id)) continue
    armies.push(pair)
    used.add(pair.primary.id)
    used.add(pair.secondary.id)
  }

  if (armies.length === 0) return null

  // Position assignment: front (0-1) = tanks/infantry, back (2-4) = archers/mixed
  armies.sort((a, b) => {
    const aScore =
      (a.primary.troopType === 'infantry' ? 10 : 0) +
      (a.secondary.troopType === 'infantry' ? 5 : 0)
    const bScore =
      (b.primary.troopType === 'infantry' ? 10 : 0) +
      (b.secondary.troopType === 'infantry' ? 5 : 0)
    return bScore - aScore
  })

  const totalPower = armies.reduce(
    (sum, a) => sum + calcPower(a.primary) + calcPower(a.secondary),
    0
  )

  const winRate = Math.min(82, Math.max(30, 35 + totalPower / 15000))

  const notes: string[] = []
  const hasInfantryFront = armies
    .slice(0, Math.min(2, armies.length))
    .some((a) => a.primary.troopType === 'infantry')
  if (!hasInfantryFront) notes.push('Consider adding an infantry commander for better front row tanking.')

  const nonViable = armies.filter((a) => !isViable(a.primary) || !isViable(a.secondary))
  if (nonViable.length > 0)
    notes.push(`${nonViable.length} army pair(s) include under-leveled commanders. Level up for better results.`)

  const cavalryCount = armies.filter(
    (a) => a.primary.troopType === 'cavalry' || a.secondary.troopType === 'cavalry'
  ).length
  if (cavalryCount > 1)
    notes.push('Multiple cavalry commanders detected. Cavalry is penalized in Sunset Canyon defense.')

  if (notes.length === 0) notes.push('Formation looks solid! Focus on skill upgrades for incremental gains.')

  return { armies, winRate, totalPower, notes }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`transition-colors ${s <= value ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
      ))}
    </div>
  )
}

function CommanderCard({
  commander,
  onEdit,
  onDelete,
}: {
  commander: Commander
  onEdit: () => void
  onDelete: () => void
}) {
  const power = calcPower(commander)
  const viable = isViable(commander)

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        viable ? 'border-border bg-card' : 'border-yellow-500/30 bg-yellow-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{commander.name}</span>
            {!viable && (
              <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-yellow-500/15 text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                Low viability
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <StarRating value={commander.stars} onChange={() => {}} />
            <span className="text-sm text-muted-foreground">Lv {commander.level}</span>
            <span
              className={`flex items-center gap-1 text-sm font-medium ${TROOP_COLORS[commander.troopType]}`}
            >
              {TROOP_ICONS[commander.troopType]}
              {commander.troopType.charAt(0).toUpperCase() + commander.troopType.slice(1)}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {commander.skills.map((s, i) => (
              <span
                key={i}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  s >= 4
                    ? 'bg-purple-500/20 text-purple-300'
                    : s >= 3
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                S{i + 1}: {s}
              </span>
            ))}
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-secondary text-muted-foreground ml-1">
              {Math.round(power).toLocaleString()} pwr
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ArmySlot({
  army,
  position,
  index,
}: {
  army: Army | null
  position: 'front' | 'back'
  index: number
}) {
  if (!army) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 flex flex-col items-center justify-center min-h-[110px] text-muted-foreground/40">
        <Users className="h-6 w-6 mb-1" />
        <span className="text-xs">Empty Slot</span>
      </div>
    )
  }

  const { primary, secondary } = army
  const bgClass = TROOP_BG[primary.troopType]

  return (
    <div className={`rounded-xl border p-4 ${bgClass}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            position === 'front'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-purple-500/20 text-purple-300'
          }`}
        >
          {position === 'front' ? `Front ${index + 1}` : `Back ${index - 1}`}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 ${TROOP_COLORS[primary.troopType]}`}
          >
            {TROOP_ICONS[primary.troopType]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{primary.name}</p>
            <p className="text-xs text-muted-foreground">
              Lv {primary.level} · ★{primary.stars}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-px h-6 bg-border mx-2" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              + {secondary.name}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Lv {secondary.level} · ★{secondary.stars}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Commander Form                                                      */
/* ------------------------------------------------------------------ */

const EMPTY_FORM: Omit<Commander, 'id'> = {
  name: '',
  level: 40,
  stars: 3,
  skills: [3, 3, 3, 3],
  troopType: 'infantry',
}

function CommanderForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Commander
  onSave: (c: Omit<Commander, 'id'>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Omit<Commander, 'id'>>(
    initial ? { ...initial } : { ...EMPTY_FORM }
  )
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleNameChange(val: string) {
    setForm((f) => ({ ...f, name: val }))
    if (val.length > 0) {
      const filtered = KNOWN_COMMANDERS.filter((n) =>
        n.toLowerCase().includes(val.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  function pickSuggestion(name: string) {
    setForm((f) => ({ ...f, name }))
    setSuggestions([])
    setShowSuggestions(false)
  }

  function setSkill(index: number, val: string) {
    const n = Math.min(5, Math.max(1, parseInt(val) || 1))
    setForm((f) => {
      const skills = [...f.skills] as [number, number, number, number]
      skills[index] = n
      return { ...f, skills }
    })
  }

  const valid = form.name.trim().length > 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-foreground text-sm">
        {initial ? 'Edit Commander' : 'Add Commander'}
      </h3>

      {/* Name */}
      <div className="relative">
        <Label className="mb-1.5 block text-xs text-muted-foreground">Name</Label>
        <Input
          ref={inputRef}
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Commander name..."
          className="bg-secondary border-border"
        />
        {showSuggestions && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
                onMouseDown={() => pickSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Level & Stars row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Level (1-60)</Label>
          <Input
            type="number"
            min={1}
            max={60}
            value={form.level}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                level: Math.min(60, Math.max(1, parseInt(e.target.value) || 1)),
              }))
            }
            className="bg-secondary border-border"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Stars</Label>
          <div className="flex h-10 items-center">
            <StarRating value={form.stars} onChange={(v) => setForm((f) => ({ ...f, stars: v }))} />
          </div>
        </div>
      </div>

      {/* Skill levels */}
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Skill Levels (1-5)</Label>
        <div className="grid grid-cols-4 gap-2">
          {form.skills.map((s, i) => (
            <div key={i}>
              <Label className="mb-1 block text-xs text-muted-foreground/60 text-center">
                S{i + 1}
              </Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={s}
                onChange={(e) => setSkill(i, e.target.value)}
                className="bg-secondary border-border text-center"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Troop type */}
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Troop Type</Label>
        <Select
          value={form.troopType}
          onValueChange={(v) => setForm((f) => ({ ...f, troopType: v as TroopType }))}
        >
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="infantry">Infantry</SelectItem>
            <SelectItem value="cavalry">Cavalry</SelectItem>
            <SelectItem value="archer">Archer</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          disabled={!valid}
          onClick={() => onSave(form)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {initial ? 'Save Changes' : 'Add Commander'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                         */
/* ------------------------------------------------------------------ */

export function SunsetCanyonContent() {
  const [commanders, setCommanders] = useState<Commander[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formation, setFormation] = useState<Formation | null>(null)

  function addCommander(data: Omit<Commander, 'id'>) {
    setCommanders((prev) => [...prev, { ...data, id: crypto.randomUUID() }])
    setShowForm(false)
    setFormation(null)
  }

  function updateCommander(id: string, data: Omit<Commander, 'id'>) {
    setCommanders((prev) => prev.map((c) => (c.id === id ? { ...data, id } : c)))
    setEditingId(null)
    setFormation(null)
  }

  function deleteCommander(id: string) {
    setCommanders((prev) => prev.filter((c) => c.id !== id))
    setFormation(null)
  }

  function clearAll() {
    setCommanders([])
    setFormation(null)
    setShowForm(false)
    setEditingId(null)
  }

  function runOptimizer() {
    const result = optimizeFormation(commanders)
    setFormation(result)
  }

  const winColor =
    formation
      ? formation.winRate > 65
        ? 'text-green-400'
        : formation.winRate >= 50
        ? 'text-yellow-400'
        : 'text-red-400'
      : ''

  // Build 5-slot grid (front 0-1, back 2-4)
  const slots: Array<{ army: Army | null; position: 'front' | 'back'; index: number }> = Array.from(
    { length: 5 },
    (_, i) => ({
      army: formation ? formation.armies[i] ?? null : null,
      position: i < 2 ? 'front' : 'back',
      index: i,
    })
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            Sunset Canyon Optimizer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your commanders, then optimize for the best defensive formation.
          </p>
        </div>
        <div className="flex gap-2">
          {commanders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          )}
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Commander
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: form + commander list */}
        <div className="space-y-4">
          {/* Add form */}
          {showForm && !editingId && (
            <CommanderForm onSave={addCommander} onCancel={() => setShowForm(false)} />
          )}

          {/* Commander cards */}
          {commanders.length === 0 && !showForm && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No commanders added yet. Click "Add Commander" to get started.
              </p>
            </div>
          )}

          {commanders.map((c) =>
            editingId === c.id ? (
              <CommanderForm
                key={c.id}
                initial={c}
                onSave={(data) => updateCommander(c.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <CommanderCard
                key={c.id}
                commander={c}
                onEdit={() => {
                  setEditingId(c.id)
                  setShowForm(false)
                }}
                onDelete={() => deleteCommander(c.id)}
              />
            )
          )}

          {/* Optimize button */}
          {commanders.length >= 2 && (
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={runOptimizer}
            >
              <Zap className="h-4 w-4 mr-2" />
              Optimize Formation
            </Button>
          )}
          {commanders.length === 1 && (
            <p className="text-center text-xs text-muted-foreground">
              Add at least 2 commanders to optimize.
            </p>
          )}
        </div>

        {/* Right column: formation result */}
        <div className="space-y-4">
          {!formation ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-10 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Add commanders and click "Optimize Formation" to see results.
              </p>
            </div>
          ) : (
            <>
              {/* Win rate banner */}
              <Card className="border-border">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                        <Trophy className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Projected Win Rate</p>
                        <p className={`text-3xl font-bold tabular-nums ${winColor}`}>
                          {formation.winRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Formation Power</p>
                      <p className="text-lg font-semibold text-foreground">
                        {Math.round(formation.totalPower).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formation grid */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Formation Layout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Front Row (Tanks)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {slots.slice(0, 2).map((slot) => (
                      <ArmySlot key={slot.index} {...slot} />
                    ))}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
                    Back Row (DPS / Support)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {slots.slice(2).map((slot) => (
                      <ArmySlot key={slot.index} {...slot} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Reasoning notes */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Optimizer Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formation.notes.map((note, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 text-[9px] font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
