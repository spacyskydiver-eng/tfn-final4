"use client"

import { Sword, Map, Crown, ExternalLink, CheckCircle2, ChevronRight, Users, Shield, Globe, MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface ProjectToolsHomeProps {
  onNavigate: (tab: string) => void
}

const STEPS = [
  {
    num: 1,
    icon: Users,
    title: "Join the TFN Discord Server",
    body: "You must be a member of the TFN Discord server to submit a leadership application.",
    action: { label: "Join TFN Discord", href: "https://discord.gg/ruQVkKC6uM" },
  },
  {
    num: 2,
    icon: Crown,
    title: "Invite the TFN Bot to Your Project Server",
    body: "The TFN Bot must be installed in your project's own Discord server — this is required for project registration.\n\nNote: During the Discord invite flow the application may appear as \"rok\" — this is correct. Once added it will show as TFN App in your server.",
    action: {
      label: "Invite TFN Bot",
      href: `https://discord.com/oauth2/authorize?client_id=1469309783332098140&scope=bot%20applications.commands&permissions=268520512`,
    },
  },
  {
    num: 3,
    icon: Shield,
    title: "Open a Leadership Application in the TFN Server",
    body: "In the TFN Discord, find the leadership application channel and select your application type:\n• Project Founder — to register a new restart project\n• Project Leadership — to apply for leadership of an existing project",
    action: { label: "Go to TFN Discord", href: "https://discord.gg/ruQVkKC6uM" },
  },
  {
    num: 4,
    icon: CheckCircle2,
    title: "Complete the Application Questions",
    body: "The bot will guide you through a series of questions in a private ticket channel. Answer honestly — staff will verify your answers before granting access.",
  },
  {
    num: 5,
    icon: Globe,
    title: "Sign Into the TFN Website with Discord",
    body: "You must be signed in to this website with the same Discord account you used in your application. Click 'Sign in with Discord' in the sidebar if you haven't already.",
  },
  {
    num: 6,
    icon: CheckCircle2,
    title: "Wait for Staff Approval",
    body: "Once staff verify and approve your application, your account will automatically be granted access to the Project Tools on this website. No need to do anything else — just sign in.",
  },
]

const TOOLS = [
  {
    id: "ark",
    icon: Sword,
    title: "Ark of Osiris",
    description: "Command centre for Ark of Osiris event management. Create events, build registration forms, assign players to teams, and plan your battle strategy — all shared between your project leadership.",
    features: ["Event & form builder", "Player registration & team assignment", "Territory strategy planning", "Shareable registration links"],
  },
  {
    id: "territory-planner",
    icon: Map,
    title: "Territory Planner",
    description: "Visually plan your kingdom territory layout for Ark of Osiris and other events. Assign tiles, plan routes, and coordinate your team's positioning.",
    features: ["Visual tile assignment", "Team coordination", "Shared planning board"],
  },
  {
    id: "discord-verify",
    icon: MessageSquare,
    title: "Discord Verification",
    description: "Set up governor verification in your project's Discord server. Members confirm their in-game governor ID via screenshot — the TFN Bot automatically assigns kingdom, alliance, and rank roles.",
    features: ["Governor ID verification", "Auto role assignment", "150 free verification slots", "Screenshot OCR via Google Vision"],
  },
]

export function ProjectToolsHome({ onNavigate }: ProjectToolsHomeProps) {
  const { user, login } = useAuth()
  const hasAccess = user?.isAdmin || user?.isLeadership

  return (
    <div className="max-w-4xl space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Crown className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Project Leadership Tools</h1>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          The Ark of Osiris tool and Territory Planner are exclusive to registered project leadership.
          These tools are shared across all verified leaders of a project — your whole leadership team
          works from the same data.
        </p>
      </div>

      {/* Access status */}
      {hasAccess ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-300">You have project leadership access</p>
            <p className="text-xs text-green-400/80 mt-0.5">The tools below are unlocked for your account.</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => onNavigate("ark")} className="text-xs rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1.5 font-medium transition">
              Ark of Osiris →
            </button>
            <button onClick={() => onNavigate("territory-planner")} className="text-xs rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1.5 font-medium transition">
              Territory Planner →
            </button>
            <button onClick={() => onNavigate("discord-verify")} className="text-xs rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1.5 font-medium transition">
              Discord Verify →
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
          <Shield className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">Access required</p>
            <p className="text-xs text-yellow-400/80 mt-0.5 leading-relaxed">
              {user ? "Your account doesn't have project leadership access yet. Follow the steps below to apply." : "You need to sign in and have project leadership access. Follow the steps below."}
            </p>
            {!user && (
              <button onClick={login} className="mt-2 text-xs rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-1.5 font-medium transition">
                Sign in with Discord
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tools overview */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">What You Get Access To</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map(tool => {
            const Icon = tool.icon
            return (
              <div key={tool.id} className="rounded-xl border border-border bg-secondary/30 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{tool.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                <ul className="space-y-1">
                  {tool.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {hasAccess && (
                  <button
                    onClick={() => onNavigate(tool.id)}
                    className="mt-1 w-full rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium px-3 py-2 transition"
                  >
                    Open {tool.title}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* How to get access */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">How to Get Access</h2>
        <p className="text-xs text-muted-foreground mb-5">Follow all steps below to get project leadership access.</p>
        <div className="space-y-3">
          {STEPS.map(step => {
            const Icon = step.icon
            return (
              <div key={step.num} className="flex gap-4 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{step.body}</p>
                  {step.action && (
                    <a
                      href={step.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      {step.action.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
