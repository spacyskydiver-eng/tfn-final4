"use client";

import React from "react"

import {
  CalendarDays,
  BookOpen,
  Settings,
  Wrench,
  Users,
  Calculator,
  TrendingUp,
  Home,
  CrosshairIcon,
  Crown,
  Map,
  Boxes,
  Receipt,
  ScanSearch,
  Flag,
  Search,
  Bell,
  MessageSquare,
  LayoutDashboard,
  Shield,
  Sword,
} from "lucide-react";

import { AccountsContent } from "@/components/accounts-content";
import { PlannerContent } from "@/components/planner-content";
import { CalculatorContent } from "@/components/calculator-content";
import { GeneralToolsContent } from "@/components/general-tools-content";
import { GuidesContent } from "@/components/guides-content";
import { CalendarContent } from "@/components/calendar-content";
import { SettingsContent } from "@/components/settings-content";
import { HomeContent } from "@/components/home-content";
import { KvkContent } from "@/components/kvk-content";
import { CommanderContent } from "@/components/commander-content";
import { TerritoryPlannerContent } from "@/components/territory-planner-content";
import { BundlesContent } from "@/components/bundles-content";
import { SpendingTrackerContent } from "@/components/spending-tracker-content";
import { KvkScannerContent } from "@/components/kvk-scanner-content";
import { BotToolContent } from "@/components/bot-tool-content";
import { BotToolsHome, type CartItem } from "@/components/bot-tools-home";
import { StaffPortal } from "@/components/staff-portal";
import { VerifyContent } from "@/components/verify-content";
import { ArkContent } from "@/components/ark-content";
import { ProjectToolsHome } from "@/components/project-tools-home";
import { RokMailContent } from "@/components/rok-mail-content";
import { SunsetCanyonContent } from "@/components/sunset-canyon-content";
import { GatheringOfHeroesContent } from "@/components/gathering-of-heroes-content";
import { KvkHealingContent } from "@/components/kvk-healing-content";
import { EquipmentForge } from "@/components/equipment-forge";
import { useAuth } from "@/lib/auth-context";

const tabMeta: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  home: {
    label: "Home",
    description: "Welcome to your Rise of Kingdoms Toolkit",
    icon: Home,
  },
  calendar: {
    label: "Calendar",
    description: "Track events, Mightiest Governor, and KvK schedules",
    icon: CalendarDays,
  },
  kvk: {
    label: "KvK Tracker",
    description: "Plan KvK runs, calculate honor points, and track timelines",
    icon: CrosshairIcon,
  },
  ark: {
    label: "Ark of Osiris",
    description: "Command center for Ark registration, teams, and strategy",
    icon: Sword,
  },
  commander: {
    label: "Commander Prep",
    description: "Plan commander upgrades, gold head income, and wheel of fortune spending",
    icon: Crown,
  },
  guides: {
    label: "Guides",
    description: "Commander guides, strategies, and tips",
    icon: BookOpen,
  },
  "general-tools": {
    label: "General Tools",
    description: "Useful utilities for your kingdom",
    icon: Wrench,
  },
  accounts: {
    label: "Accounts",
    description: "Manage your Rise of Kingdoms accounts",
    icon: Users,
  },
  calculator: {
    label: "Calculator",
    description: "Speedups, resources, and troop calculators",
    icon: Calculator,
  },
  "progression-plans": {
    label: "Progression Plans",
    description: "Plan your growth from day one",
    icon: TrendingUp,
  },
  bundles: {
    label: "Bundles",
    description: "Plan and track bundle value with custom icons",
    icon: Boxes,
  },
  spending: {
    label: "Spending Tracker",
    description: "Log purchases, view monthly stats, charts, and resource totals",
    icon: Receipt,
  },
  "territory-planner": {
    label: "Territory Planner",
    description: "Plan and manage your territory strategy",
    icon: Map,
  },
  "kvk-scanner": {
    label: "KvK Scanner",
    description: "Live KvK rankings, DKP scores, kingdoms, and camp breakdown",
    icon: ScanSearch,
  },
  "bot-tools-home": {
    label: "Bot Tools Store",
    description: "Browse, purchase, and manage automation bots for your kingdom",
    icon: LayoutDashboard,
  },
  "staff-portal": {
    label: "Staff Portal",
    description: "Manage orders, product keys, and customer bot setups",
    icon: Shield,
  },
  "title-giving": {
    label: "Title Giving",
    description: "Automate kingdom title rotation — Duke, Architect, Justice, Scientist",
    icon: Crown,
  },
  "fort-tracking": {
    label: "Fort Tracking",
    description: "Monitor fort attacks and defences in real time",
    icon: Flag,
  },
  "player-finder": {
    label: "Player Finder",
    description: "Search for players across kingdoms by name, ID, or alliance",
    icon: Search,
  },
  "alliance-mob": {
    label: "Alliance Mobilization",
    description: "Send coordinated mobilization messages to alliance chat",
    icon: Bell,
  },
  "discord-verify": {
    label: "Discord Verification",
    description: "Auto-verify players using governor profile screenshots",
    icon: Shield,
  },
  settings: {
    label: "Settings",
    description: "Configure your toolkit preferences",
    icon: Settings,
  },
  "rok-mail": {
    label: "RoK Mail",
    description: "Format in-game mail with colours, bold, and templates",
    icon: MessageSquare,
  },
"sunset-canyon": {
    label: "Sunset Canyon",
    description: "Optimise your defensive formation for Sunset Canyon",
    icon: Shield,
  },
  "gathering-of-heroes": {
    label: "Gathering of Heroes",
    description: "Plan tokens, missions, and commander unlocks for GoH events",
    icon: Crown,
  },
  "kvk-healing": {
    label: "KvK Healing Calc",
    description: "Calculate healing costs, resource needs, and speedup requirements for KvK",
    icon: CrosshairIcon,
  },
  equipment: {
    label: "Equipment",
    description: "Forge, refine, awaken, and compare equipment loadouts",
    icon: Sword,
  },
  "project-tools-home": {
    label: "Project Tools",
    description: "Ark of Osiris, Territory Planner, and RoK Mail",
    icon: Crown,
  },
};

const BOT_TOOL_IDS = new Set(['title-giving', 'fort-tracking', 'player-finder', 'alliance-mob']);

interface ContentPanelProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
  cart?: CartItem[];
  onAddToCart?: (item: Omit<CartItem, 'cartId'>) => void;
  onRemoveFromCart?: (cartId: string) => void;
  onClearCart?: () => void;
}

function ProjectToolBlur({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/60 backdrop-blur-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
        <Shield className="h-6 w-6" />
      </div>
      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-foreground">Project Leadership Access Required</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          This tool is only available to registered project leadership.
        </p>
      </div>
      <button
        onClick={() => onNavigate("project-tools-home")}
        className="rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium px-4 py-2 transition"
      >
        View Access Guide →
      </button>
    </div>
  )
}

export function ContentPanel({
  activeTab,
  onTabChange,
  cart = [],
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
}: ContentPanelProps) {
  const meta = tabMeta[activeTab] || tabMeta.home;
  const Icon = meta.icon;
  const { user } = useAuth();
  const hasProjectAccess = user?.isAdmin || user?.isLeadership;

  return (
    <div className="flex h-full flex-col">
      {/* Header — hidden on mobile (mobile top bar handles the title) */}
      <header className="hidden md:flex items-center gap-3 border-b border-border px-8 py-6">
        <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            {meta.label}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">{meta.description}</p>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {BOT_TOOL_IDS.has(activeTab) ? (
          <BotToolContent toolId={activeTab} onNavigate={onTabChange} />
        ) : activeTab === "bot-tools-home" ? (
          <BotToolsHome
            cart={cart}
            onAddToCart={onAddToCart ?? (() => {})}
            onRemoveFromCart={onRemoveFromCart ?? (() => {})}
            onOpenCart={() => {}}
            onNavigate={onTabChange ?? (() => {})}
          />
        ) : activeTab === "discord-verify" ? (
          <VerifyContent />
        ) : activeTab === "staff-portal" ? (
          <StaffPortal />
        ) : activeTab === "accounts" ? (
          <AccountsContent />
        ) : activeTab === "calculator" ? (
          <CalculatorContent />
        ) : activeTab === "progression-plans" ? (
          <PlannerContent />
        ) : activeTab === "general-tools" ? (
          <GeneralToolsContent />
        ) : activeTab === "guides" ? (
          <GuidesContent />
        ) : activeTab === "calendar" ? (
          <CalendarContent />
        ) : activeTab === "kvk" ? (
          <KvkContent />
        ) : activeTab === "project-tools-home" ? (
          <ProjectToolsHome onNavigate={onTabChange ?? (() => {})} />
        ) : activeTab === "ark" ? (
          <ArkContent />
        ) : activeTab === "commander" ? (
          <CommanderContent />
        ) : activeTab === "territory-planner" ? (
          <TerritoryPlannerContent />
        ) : activeTab === "bundles" ? (
          <BundlesContent />
        ) : activeTab === "spending" ? (
          <SpendingTrackerContent />
        ) : activeTab === "kvk-scanner" ? (
          <KvkScannerContent onNavigate={onTabChange} />
        ) : activeTab === "settings" ? (
          <SettingsContent />
        ) : activeTab === "rok-mail" ? (
          <RokMailContent />
        ) : activeTab === "sunset-canyon" ? (
          <SunsetCanyonContent />
        ) : activeTab === "gathering-of-heroes" ? (
          <GatheringOfHeroesContent />
        ) : activeTab === "kvk-healing" ? (
          <KvkHealingContent />
        ) : activeTab === "equipment" ? (
          <EquipmentForge />
        ) : (
          <HomeContent onTabChange={onTabChange} />
        )}
      </main>
    </div>
  );
}
