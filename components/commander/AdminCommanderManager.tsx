'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Shield, Plus, Trash2, RotateCcw, Pencil, X, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  type CommanderEntry,
  type SeasonTag,
  ALL_SEASONS,
  DEFAULT_COMMANDERS,
  getCommanderRoster,
  saveCommanderRoster,
  resetCommanderRoster,
} from '@/lib/commander-data'

export function AdminCommanderManager() {
  const { user } = useAuth()
  const [roster, setRoster] = useState<CommanderEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newSeasons, setNewSeasons] = useState<SeasonTag[]>([])

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSeasons, setEditSeasons] = useState<SeasonTag[]>([])

  // Reset confirmation
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    setRoster(getCommanderRoster())
    setLoaded(true)
  }, [])

  const persist = (list: CommanderEntry[]) => {
    setRoster(list)
    saveCommanderRoster(list)
  }

  const addCommander = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (roster.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return

    const entry: CommanderEntry = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      seasons: newSeasons,
    }
    persist([...roster, entry])
    setNewName('')
    setNewSeasons([])
  }

  const removeCommander = (id: string) => {
    persist(roster.filter((c) => c.id !== id))
  }

  const startEdit = (entry: CommanderEntry) => {
    setEditingId(entry.id)
    setEditName(entry.name)
    setEditSeasons([...entry.seasons])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditSeasons([])
  }

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return
    persist(
      roster.map((c) =>
        c.id === editingId ? { ...c, name: editName.trim(), seasons: editSeasons } : c,
      ),
    )
    cancelEdit()
  }

  const handleReset = () => {
    resetCommanderRoster()
    setRoster([...DEFAULT_COMMANDERS])
    setResetOpen(false)
  }

  const toggleSeason = (season: SeasonTag, list: SeasonTag[], setter: (s: SeasonTag[]) => void) => {
    setter(list.includes(season) ? list.filter((s) => s !== season) : [...list, season])
  }

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Admin access required to manage the commander roster.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!loaded) return null

  return (
    <div className="space-y-6">
      {/* Add Commander Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" />
            Add Commander
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Commander Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Guan Yu"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCommander()
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Season Tags</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_SEASONS.map((season) => (
                <label
                  key={season}
                  className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                >
                  <Checkbox
                    checked={newSeasons.includes(season)}
                    onCheckedChange={() => toggleSeason(season, newSeasons, setNewSeasons)}
                  />
                  {season}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={addCommander} disabled={!newName.trim()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add to Roster
          </Button>
        </CardContent>
      </Card>

      {/* Commander List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Commander Roster ({roster.length})
            </CardTitle>
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to Defaults
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Commander Roster</DialogTitle>
                  <DialogDescription>
                    This will remove all custom changes and restore the default commander list. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResetOpen(false)} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No commanders in roster. Add one above or reset to defaults.
            </p>
          ) : (
            <div className="space-y-2">
              {roster.map((entry) => {
                const isEditing = editingId === entry.id

                if (isEditing) {
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
                    >
                      <div className="space-y-2">
                        <Label className="text-xs">Commander Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Season Tags</Label>
                        <div className="flex flex-wrap gap-3">
                          {ALL_SEASONS.map((season) => (
                            <label
                              key={season}
                              className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                            >
                              <Checkbox
                                checked={editSeasons.includes(season)}
                                onCheckedChange={() =>
                                  toggleSeason(season, editSeasons, setEditSeasons)
                                }
                              />
                              {season}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={saveEdit} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          className="gap-1.5 bg-transparent"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                      {entry.seasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.seasons.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(entry)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit {entry.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCommander(entry.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove {entry.name}</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
