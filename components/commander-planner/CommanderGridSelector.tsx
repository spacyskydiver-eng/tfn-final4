'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getCommanderRoster, getCommanderSeasons } from '@/lib/commander-data'
import { getCommanderInitials, getCommanderPortraitUrl } from '@/lib/commander-portraits'
import type { CommanderGoal } from '@/lib/engine/types'
import type { CommanderPlannerEntry } from '@/lib/engine/useCommanderPlanner'
import { calcSkillCosts } from './UpgradeCostBreakdown'

type CommanderGridSelectorProps = {
  commanders: CommanderGoal[]
  plannerEntries?: CommanderPlannerEntry[]
  selectedCommanderId?: string
  onSelect: (commanderId: string) => void
  onNavigateToInvestments?: () => void
}

export function CommanderGridSelector({
  commanders,
  plannerEntries = [],
  selectedCommanderId,
  onSelect,
}: CommanderGridSelectorProps) {
  const roster = useMemo(() => getCommanderRoster(), [])
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const list = commanders
    if (!q) return list
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [commanders, search])

  const getRemainingHeads = (cmd: CommanderGoal): number => {
    const entry = plannerEntries.find((e) => e.commanderId === cmd.id)
    const currentSkills = entry?.current.skills ?? cmd.currentSkills
    const res = calcSkillCosts(cmd.rarity, currentSkills, cmd.targetSkills)
    return res.needed
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Commander Selection
          </p>
          <p className="text-xs text-muted-foreground">
            Pick a commander to plan their full progression.
          </p>
        </div>
        <Input
          className="max-w-xs h-8 text-xs"
          placeholder="Search commanders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {commanders.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Add commanders in the <span className="font-semibold">Investments</span> tab first. The planner
          only works with commanders you are actively investing in.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((cmd) => {
            const selected = cmd.id === selectedCommanderId
            const rosterEntry = roster.find(
              (r) => r.name.toLowerCase() === cmd.name.toLowerCase(),
            )
            const portraitUrl = rosterEntry ? getCommanderPortraitUrl(rosterEntry) : null
            const seasons = rosterEntry ? getCommanderSeasons(rosterEntry.name, roster) : []
            const initials = getCommanderInitials(cmd.name)
            const remainingHeads = getRemainingHeads(cmd)
            const targetSkillStr = cmd.targetSkills.join('-')

            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => onSelect(cmd.id)}
                className={cn(
                  'group relative flex flex-col items-center rounded-xl border px-2.5 py-3 text-xs transition-all',
                  'bg-secondary/40 hover:bg-secondary/70',
                  selected
                    ? 'border-primary shadow-[0_0_18px_rgba(139,92,246,0.45)]'
                    : 'border-border/60 hover:border-primary/50',
                )}
              >
                <div className="relative mb-2">
                  {portraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={portraitUrl}
                      alt={cmd.name}
                      className={cn(
                        'h-14 w-14 rounded-full object-cover ring-2 transition-all',
                        selected ? 'ring-primary' : 'ring-border/60 group-hover:ring-primary/70',
                      )}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground ring-2 ring-border/60">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="text-center space-y-1 w-full">
                  <p className="line-clamp-2 text-[11px] font-semibold text-foreground leading-snug">
                    {cmd.name}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {cmd.allocationPct}%
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                      {targetSkillStr}
                    </Badge>
                    {remainingHeads > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-primary border-primary/40">
                        {remainingHeads} heads
                      </Badge>
                    )}
                  </div>
                  {seasons.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {seasons.slice(0, 2).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="border-border/60 bg-background/40 px-1 py-0 text-[9px] font-normal"
                        >
                          {s.replace('KvK', 'K')}
                        </Badge>
                      ))}
                      {seasons.length > 2 && (
                        <Badge
                          variant="outline"
                          className="border-border/40 bg-background/30 px-1 py-0 text-[9px] font-normal"
                        >
                          +{seasons.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
              No commanders match your search in the current investments.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

