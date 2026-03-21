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
  Mail,
  Mountain,
  Gift,
  Sparkles,
  Wallet,
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

// Top-level standalone items
const topNavItems = [
  { id: "home",     label: "Home",    icon: Home },
  { id: "guides",   label: "Guides",  icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
];

// Strategy section
const strategyNavItems = [
  { id: "calendar",           label: "Calendar",          icon: CalendarDays },
  { id: "kvk",                label: "KvK Tracker",       icon: CrosshairIcon },
  { id: "commander",          label: "Commander Prep",    icon: Crown },
  { id: "equipment",          label: "Equipment",         icon: Sword },
  { id: "general-tools",      label: "General Tools",     icon: Wrench },
  { id: "sunset-canyon",      label: "Sunset Canyon",     icon: Mountain },
  { id: "gathering-of-heroes", label: "Gathering of Heroes", icon: Gift },
  { id: "kvk-healing",        label: "KvK Healing Calc",  icon: CrosshairIcon },
];

// Account & Progression section
const accountNavItems = [
  { id: "accounts",           label: "Accounts",          icon: Users },
  { id: "calculator",         label: "Calculator",        icon: Calculator },
  { id: "progression-plans",  label: "Progression Plans", icon: TrendingUp },
  { id: "bundles",            label: "Bundles",           icon: Boxes },
  { id: "spending",           label: "Spending Tracker",  icon: Receipt },
];

// Project Tools section
const projectToolsNavItems = [
  { id: "project-tools-home", label: "Overview & Guide",  icon: Crown },
  { id: "ark",                label: "Ark of Osiris",     icon: Sword },
  { id: "territory-planner",  label: "Territory Planner", icon: Map },
  { id: "rok-mail",           label: "RoK Mail",          icon: Mail },
];

// Bot Tools section
const botNavItems = [
  { id: "bot-tools-home",  label: "Bot Store",             icon: LayoutDashboard },
  { id: "title-giving",    label: "Title Giving",          icon: Crown },
  { id: "fort-tracking",   label: "Fort Tracking",         icon: Flag },
  { id: "player-finder",   label: "Player Finder",         icon: Search },
  { id: "alliance-mob",    label: "Alliance Mobilization", icon: Bell },
  { id: "discord-verify",  label: "Discord Verification",  icon: MessageSquare },
  { id: "kvk-scanner",     label: "KvK Scanner",           icon: ScanSearch },
];

const strategyTabIds    = new Set(strategyNavItems.map(s => s.id));
const accountTabIds     = new Set(accountNavItems.map(a => a.id));
const projectToolsTabIds = new Set(projectToolsNavItems.map(p => p.id));
const botTabIds         = new Set(botNavItems.map(b => b.id));

function SectionHeader({
  icon: Icon,
  label,
  isActive,
  open,
  onToggle,
  collapsed,
  accentColor = 'text-primary',
  accentBg = 'bg-primary/10',
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
  accentColor?: string;
  accentBg?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/50",
        collapsed ? "justify-center" : "justify-between",
        isActive && accentBg
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0 opacity-70", accentColor, isActive && "opacity-100")} />
        {!collapsed && (
          <span className={cn("text-xs font-semibold uppercase tracking-wider opacity-60", accentColor, isActive && "opacity-100")}>
            {label}
          </span>
        )}
      </div>
      {!collapsed && (
        open
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function NavItem({
  id,
  label,
  icon: Icon,
  activeTab,
  onTabChange,
  collapsed,
  size = "sm",
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  size?: "md" | "sm";
}) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => onTabChange(id)}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
        size === "md" ? "py-2.5" : "py-2",
        isActive
          ? "bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--glow)/0.3)]"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {isActive && (
        <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary", size === "md" ? "h-6 w-[3px]" : "h-5 w-[3px]")} />
      )}
      <Icon className={cn("shrink-0 transition-colors duration-200", size === "md" ? "h-5 w-5" : "h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

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
  const [strategyOpen, setStrategyOpen]         = useState(true);
  const [accountOpen, setAccountOpen]           = useState(true);
  const [projectToolsOpen, setProjectToolsOpen] = useState(true);
  const [botsOpen, setBotsOpen]                 = useState(true);
  const [staffOpen, setStaffOpen]               = useState(true);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
        "md:translate-x-0",
        collapsed ? "md:w-[72px]" : "md:w-[260px]",
        "w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Swords className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">RoK Toolkit</span>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button
          onClick={onMobileClose}
          className="flex md:hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">

        {/* Top standalone items */}
        {topNavItems.map(item => (
          <NavItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} size="md" />
        ))}

        {/* Strategy section */}
        <div className="pt-2">
          <SectionHeader
            icon={Sparkles}
            label="Strategy"
            isActive={strategyTabIds.has(activeTab)}
            open={strategyOpen}
            onToggle={() => setStrategyOpen(o => !o)}
            collapsed={collapsed}
            accentColor="text-violet-400"
            accentBg="bg-violet-500/10"
          />
          {(strategyOpen || collapsed) && (
            <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
              {strategyNavItems.map(item => (
                <NavItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
              ))}
            </div>
          )}
        </div>

        {/* Account & Progression section */}
        <div className="pt-2">
          <SectionHeader
            icon={Wallet}
            label="Account & Progression"
            isActive={accountTabIds.has(activeTab)}
            open={accountOpen}
            onToggle={() => setAccountOpen(o => !o)}
            collapsed={collapsed}
            accentColor="text-emerald-400"
            accentBg="bg-emerald-500/10"
          />
          {(accountOpen || collapsed) && (
            <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
              {accountNavItems.map(item => (
                <NavItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
              ))}
            </div>
          )}
        </div>

        {/* Project Tools section */}
        <div className="pt-2">
          <SectionHeader
            icon={Sword}
            label="Project Tools"
            isActive={projectToolsTabIds.has(activeTab)}
            open={projectToolsOpen}
            onToggle={() => setProjectToolsOpen(o => !o)}
            collapsed={collapsed}
            accentColor="text-sky-400"
            accentBg="bg-sky-500/10"
          />
          {(projectToolsOpen || collapsed) && (
            <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
              {projectToolsNavItems.map(item => (
                <NavItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
              ))}
            </div>
          )}
        </div>

        {/* Bot Tools section */}
        <div className="pt-2">
          <SectionHeader
            icon={Bot}
            label="Bot Tools"
            isActive={botTabIds.has(activeTab)}
            open={botsOpen}
            onToggle={() => setBotsOpen(o => !o)}
            collapsed={collapsed}
            accentColor="text-orange-400"
            accentBg="bg-orange-500/10"
          />
          {(botsOpen || collapsed) && (
            <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
              {botNavItems.map(item => (
                <NavItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
              ))}
            </div>
          )}
        </div>

        {/* Staff section (admin only) */}
        {user?.isAdmin && (
          <div className="pt-2">
            <SectionHeader
              icon={Shield}
              label="Staff"
              isActive={activeTab === "staff-portal"}
              open={staffOpen}
              onToggle={() => setStaffOpen(o => !o)}
              collapsed={collapsed}
              accentColor="text-rose-400"
              accentBg="bg-rose-500/10"
            />
            {(staffOpen || collapsed) && (
              <div className={cn("space-y-0.5", !collapsed && "pl-2 mt-0.5")}>
                <NavItem id="staff-portal" label="Orders" icon={ClipboardList} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Cart */}
      {(cartCount > 0 || activeTab === "bot-tools-home") && (
        <div className="px-3 pb-2">
          <button
            onClick={onCartClick}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 bg-primary/10 text-primary hover:bg-primary/20",
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

      <UserFooter collapsed={collapsed} />
    </aside>
  );
}
