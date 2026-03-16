"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  Home,
  CalendarDays,
  BookOpen,
  Settings,
  Wrench,
  Users,
  Calculator,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Swords,
  LogIn,
  LogOut,
  Shield,
  CrosshairIcon,
  Crown,
  Map,
  Boxes,
  Receipt,
  ScanSearch,
  Bot,
  Search,
  MessageSquare,
  Bell,
  Flag,
  ShoppingCart,
  LayoutDashboard,
  ClipboardList,
  Sword,
} from "lucide-react";

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { user, loading, login, logout } = useAuth();

  return (
    <div className="border-t border-border p-3">
      {loading ? (
        <div className="h-10 animate-pulse rounded-lg bg-secondary/50" />
      ) : user ? (
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar || "/placeholder.svg"}
              alt={user.username}
              className="h-8 w-8 rounded-full flex-shrink-0"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground truncate">{user.username}</span>
                {user.isAdmin && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={login}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <LogIn className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign in with Discord</span>}
        </button>
      )}
    </div>
  );
}

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  cartCount?: number;
  onCartClick?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const mainNavItems = [
  { id: "home",               label: "Home",              icon: Home },
  { id: "calendar",           label: "Calendar",          icon: CalendarDays },
  { id: "kvk",                label: "KvK Tracker",       icon: CrosshairIcon },
  { id: "commander",          label: "Commander Prep",    icon: Crown },
  { id: "guides",             label: "Guides",            icon: BookOpen },
  { id: "general-tools",      label: "General Tools",     icon: Wrench },
  { id: "accounts",           label: "Accounts",          icon: Users },
  { id: "calculator",         label: "Calculator",        icon: Calculator },
  { id: "progression-plans",  label: "Progression Plans", icon: TrendingUp },
  { id: "bundles",            label: "Bundles",           icon: Boxes },
  { id: "spending",           label: "Spending Tracker",  icon: Receipt },
  { id: "settings",           label: "Settings",          icon: Settings },
];

const projectToolsNavItems = [
  { id: "project-tools-home", label: "Overview & Guide",   icon: Crown },
  { id: "ark",                label: "Ark of Osiris",      icon: Sword },
  { id: "territory-planner",  label: "Territory Planner",  icon: Map },
];

const projectToolsTabIds = new Set(projectToolsNavItems.map(p => p.id));

const botNavItems = [
  { id: "bot-tools-home",  label: "Bot Store",              icon: LayoutDashboard },
  { id: "title-giving",    label: "Title Giving",           icon: Crown },
  { id: "fort-tracking",   label: "Fort Tracking",          icon: Flag },
  { id: "player-finder",   label: "Player Finder",          icon: Search },
  { id: "alliance-mob",    label: "Alliance Mobilization",  icon: Bell },
  { id: "discord-verify",  label: "Discord Verification",   icon: MessageSquare },
  { id: "kvk-scanner",     label: "KvK Scanner",            icon: ScanSearch },
];

const botTabIds = new Set(botNavItems.map(b => b.id));

export function AppSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  cartCount = 0,
  onCartClick,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const { user } = useAuth();
  const [botsOpen, setBotsOpen] = useState(true);
  const [projectToolsOpen, setProjectToolsOpen] = useState(true);
  const [staffOpen, setStaffOpen] = useState(true);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
        // Desktop: always visible, width based on collapsed state
        "md:translate-x-0",
        collapsed ? "md:w-[72px]" : "md:w-[260px]",
        // Mobile: slide in/out as overlay, always full width (260px)
        "w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Swords className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              RoK Toolkit
            </span>
          )}
        </div>
        {/* Desktop: collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        {/* Mobile: close button */}
        <button
          onClick={onMobileClose}
          className="flex md:hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close menu"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Main nav items */}
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--glow)/0.3)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        {/* Bot Tools divider + collapsible section */}
        <div className="pt-2">
          <button
            onClick={() => setBotsOpen(o => !o)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/50",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2">
              <Bot className={cn("h-4 w-4 shrink-0", botTabIds.has(activeTab) ? "text-primary" : "text-muted-foreground")} />
              {!collapsed && (
                <span className={cn("text-xs font-semibold uppercase tracking-wider", botTabIds.has(activeTab) ? "text-primary" : "text-muted-foreground")}>
                  Bot Tools
                </span>
              )}
            </div>
            {!collapsed && (
              botsOpen
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {(botsOpen || collapsed) && (
            <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
              {botNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--glow)/0.3)]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Tools section */}
        <div className="pt-2">
          <button
            onClick={() => setProjectToolsOpen(o => !o)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/50",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2">
              <Sword className={cn("h-4 w-4 shrink-0", projectToolsTabIds.has(activeTab) ? "text-primary" : "text-muted-foreground")} />
              {!collapsed && (
                <span className={cn("text-xs font-semibold uppercase tracking-wider", projectToolsTabIds.has(activeTab) ? "text-primary" : "text-muted-foreground")}>
                  Project Tools
                </span>
              )}
            </div>
            {!collapsed && (
              projectToolsOpen
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {(projectToolsOpen || collapsed) && (
            <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
              {projectToolsNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--glow)/0.3)]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff section (admin only) */}
        {user?.isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => setStaffOpen(o => !o)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/50",
                collapsed ? "justify-center" : "justify-between"
              )}
            >
              <div className="flex items-center gap-2">
                <Shield className={cn("h-4 w-4 shrink-0", activeTab === 'staff-portal' ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && (
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", activeTab === 'staff-portal' ? "text-primary" : "text-muted-foreground")}>
                    Staff
                  </span>
                )}
              </div>
              {!collapsed && (
                staffOpen
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            {(staffOpen || collapsed) && (
              <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
                <button
                  onClick={() => onTabChange('staff-portal')}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    activeTab === 'staff-portal'
                      ? "bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--glow)/0.3)]"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {activeTab === 'staff-portal' && (
                    <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <ClipboardList className={cn("h-4 w-4 shrink-0", activeTab === 'staff-portal' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {!collapsed && <span>Orders</span>}
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Cart button */}
      {(cartCount > 0 || activeTab === 'bot-tools-home') && (
        <div className="px-3 pb-2">
          <button
            onClick={onCartClick}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "bg-primary/10 text-primary hover:bg-primary/20",
              collapsed && "justify-center px-0"
            )}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cart</span>}
            {cartCount > 0 && (
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground",
                collapsed ? "absolute -right-1 -top-1" : "ml-auto"
              )}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Auth / Footer */}
      <UserFooter collapsed={collapsed} />
    </aside>
  );
}
