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
        ) : (
          <HomeContent onTabChange={onTabChange} />
        )}
      </main>
    </div>
  );
}
