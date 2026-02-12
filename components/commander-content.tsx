'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Crown,
  Gem,
  Dices,
  TrendingUp,
  Package,
  Users,
  BarChart3,
  Shield,
} from 'lucide-react'
import type { AccountProfile } from '@/lib/engine/types'
import { VIP_HEADS_PER_DAY } from '@/lib/kvk-engine'
import { useAuth } from '@/lib/auth-context'
import { CommandersSection } from '@/components/commander/CommandersSection'
import { WheelOfFortuneSection } from '@/components/commander/WheelOfFortuneSection'
import { EventTracker } from '@/components/commander/EventTracker'
import { GemsPlanner } from '@/components/commander/GemsPlanner'
import { ProjectionSummary } from '@/components/commander/ProjectionSummary'
import { ProgressGraph } from '@/components/commander/ProgressGraph'
import { AdminCommanderManager } from '@/components/commander/AdminCommanderManager'

/* ================================================================ */
/*  SAVE / LOAD                                                       */
/* ================================================================ */

const STORAGE_KEY = 'commander_prep_v2'

function loadProfiles(): AccountProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveProfiles(profiles: AccountProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
  } catch { /* ignore */ }
}

function createDefaultProfile(name?: string): AccountProfile {
  return {
    id: `acct-${Date.now()}`,
    name: name || 'My Account',
    kingdom: '',
    vipLevel: 10,
    currentGems: 0,
    dailyGemIncome: 0,
    daysUntilGoal: 30,
    commanders: [],
    wofTargetSpins: 0,
    wofBundles: {},
  }
}

/* ================================================================ */
/*  MAIN COMPONENT                                                    */
/* ================================================================ */

export function CommanderContent() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const p = loadProfiles()
    setProfiles(p)
    if (p.length > 0) setActiveProfileId(p[0].id)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) saveProfiles(profiles)
  }, [profiles, loaded])

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null

  const updateProfile = useCallback((updated: AccountProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const addProfile = () => {
    const p = createDefaultProfile()
    setProfiles((prev) => [...prev, p])
    setActiveProfileId(p.id)
  }

  const removeProfile = (id: string) => {
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (activeProfileId === id) {
        setActiveProfileId(next.length > 0 ? next[0].id : null)
      }
      return next
    })
  }

  if (!loaded) return null

  return (
    <div className="space-y-6">
      {/* Account Profile Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Account Profiles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Create an account profile to start planning your commander upgrades.
              </p>
              <Button onClick={addProfile} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Account Profile
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Select
                  value={activeProfileId ?? ''}
                  onValueChange={(v) => setActiveProfileId(v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.kingdom ? ` (${p.kingdom})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addProfile} variant="outline" size="sm" className="gap-1 bg-transparent">
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </div>

              {activeProfile && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Account Name</Label>
                    <Input
                      value={activeProfile.name}
                      onChange={(e) => updateProfile({ ...activeProfile, name: e.target.value })}
                      placeholder="My Account"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Kingdom / Server</Label>
                    <Input
                      value={activeProfile.kingdom}
                      onChange={(e) => updateProfile({ ...activeProfile, kingdom: e.target.value })}
                      placeholder="e.g. #1234"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">VIP Level</Label>
                    <Select
                      value={String(activeProfile.vipLevel)}
                      onValueChange={(v) => updateProfile({ ...activeProfile, vipLevel: Number(v) })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 18 }, (_, i) => i).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            VIP {n} ({VIP_HEADS_PER_DAY[n] ?? 0}/day)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Days Until KvK</Label>
                    <Input
                      type="number"
                      value={activeProfile.daysUntilGoal || ''}
                      onChange={(e) => updateProfile({ ...activeProfile, daysUntilGoal: Number(e.target.value) || 0 })}
                      placeholder="30"
                      min={0}
                    />
                  </div>
                </div>
              )}

              {profiles.length > 1 && activeProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeProfile(activeProfile.id)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Profile
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {activeProfile && (
        <ProfileContent profile={activeProfile} onUpdate={updateProfile} />
      )}
    </div>
  )
}

/* ================================================================ */
/*  PROFILE CONTENT — Tab navigation to sub-components                */
/* ================================================================ */

function ProfileContent({
  profile,
  onUpdate,
}: {
  profile: AccountProfile
  onUpdate: (p: AccountProfile) => void
}) {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<
    'commanders' | 'wheel' | 'income' | 'gems' | 'overview' | 'graph' | 'admin'
  >('commanders')

  const TABS: { id: typeof activeSection; label: string; icon: typeof Crown; adminOnly?: boolean }[] = [
    { id: 'commanders', label: 'Commanders', icon: Crown },
    { id: 'wheel', label: 'Wheel of Fortune', icon: Dices },
    { id: 'income', label: 'Event Tracker', icon: Package },
    { id: 'gems', label: 'Gems Planner', icon: Gem },
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'graph', label: 'Graph', icon: BarChart3 },
    { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
  ]

  const visibleTabs = TABS.filter((t) => !t.adminOnly || user?.isAdmin)

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((t) => {
          const Icon = t.icon
          const active = activeSection === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {activeSection === 'commanders' && <CommandersSection profile={profile} onUpdate={onUpdate} />}
      {activeSection === 'wheel' && <WheelOfFortuneSection profile={profile} onUpdate={onUpdate} />}
      {activeSection === 'income' && <EventTracker profile={profile} onUpdate={onUpdate} />}
      {activeSection === 'gems' && <GemsPlanner profile={profile} onUpdate={onUpdate} />}
      {activeSection === 'overview' && <ProjectionSummary profile={profile} />}
      {activeSection === 'graph' && <ProgressGraph profile={profile} />}
      {activeSection === 'admin' && <AdminCommanderManager />}
    </div>
  )
}
