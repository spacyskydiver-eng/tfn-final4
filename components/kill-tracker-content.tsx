"use client";

import { useEffect, useState, useCallback } from "react";
import { Sword, Shield, Activity, Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  barbarian: { totalKills: number; reportCount: number };
  fort: { totalFortKills: number; totalUnitKills: number; reportCount: number };
  last7Days: Array<{ reportType: string; _sum: { killCount: number; fortKills: number }; _count: { id: number } }>;
}

interface ApiToken {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Token Row ────────────────────────────────────────────────────────────────

function TokenRow({
  token,
  onRevoke,
}: {
  token: ApiToken;
  onRevoke: (id: string) => void;
}) {
  const lastUsed = token.lastUsedAt
    ? new Date(token.lastUsedAt).toLocaleDateString()
    : "Never";

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{token.name}</p>
        <p className="text-xs text-muted-foreground">
          Created {new Date(token.createdAt).toLocaleDateString()} · Last used {lastUsed}
        </p>
      </div>
      <button
        onClick={() => onRevoke(token.id)}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Revoke
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KillTrackerContent() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [tokens, setTokens]     = useState<ApiToken[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // New token creation state
  const [newTokenName, setNewTokenName] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Fetch Data ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tokensRes] = await Promise.all([
        fetch("/api/events/stats"),
        fetch("/api/tokens"),
      ]);

      if (statsRes.ok)  setStats(await statsRes.json());
      if (tokensRes.ok) setTokens((await tokensRes.json()).tokens ?? []);
    } catch {
      setError("Failed to load data. Are you signed in?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Token Management ────────────────────────────────────────────────────────

  const createToken = async () => {
    if (creatingToken) return;
    setCreatingToken(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() || "My Device" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to create token");
        return;
      }
      const data = await res.json();
      setNewTokenValue(data.token);
      setTokenVisible(true);
      setNewTokenName("");
      await fetchAll(); // Refresh token list
    } finally {
      setCreatingToken(false);
    }
  };

  const revokeToken = async (id: string) => {
    if (!confirm("Revoke this token? The companion app will stop syncing.")) return;
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const copyToken = async () => {
    if (!newTokenValue) return;
    await navigator.clipboard.writeText(newTokenValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 rounded-lg bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const barbarianKills7d = stats?.last7Days.find(d => d.reportType === 'BARBARIAN_KILL')?._sum.killCount ?? 0;
  const fortKills7d      = stats?.last7Days.find(d => d.reportType === 'FORT_KILL')?._sum.fortKills ?? 0;

  return (
    <div className="space-y-8">
      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">All-Time Totals</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Sword}
            label="Barbarian Kills"
            value={stats?.barbarian.totalKills ?? 0}
            sub={`from ${stats?.barbarian.reportCount ?? 0} reports`}
            color="bg-orange-500/15 text-orange-500"
          />
          <StatCard
            icon={Shield}
            label="Forts Destroyed"
            value={stats?.fort.totalFortKills ?? 0}
            sub={`${stats?.fort.totalUnitKills?.toLocaleString() ?? 0} units killed inside`}
            color="bg-blue-500/15 text-blue-500"
          />
          <StatCard
            icon={Activity}
            label="Reports Synced"
            value={(stats?.barbarian.reportCount ?? 0) + (stats?.fort.reportCount ?? 0)}
            sub={`${barbarianKills7d.toLocaleString()} barb kills · ${fortKills7d} forts (last 7d)`}
            color="bg-primary/15 text-primary"
          />
        </div>
      </section>

      {/* ── API Tokens ──────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Companion App Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Each token authorises the macOS companion app to sync reports to your account.
            </p>
          </div>
        </div>

        {/* New token revealed */}
        {newTokenValue && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <p className="mb-2 text-sm font-semibold text-green-600 dark:text-green-400">
              ✓ Token created — copy it now, it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-md bg-secondary px-3 py-2 text-xs font-mono text-foreground">
                {tokenVisible ? newTokenValue : "rok_" + "•".repeat(64)}
              </code>
              <button
                onClick={() => setTokenVisible(!tokenVisible)}
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary transition-colors"
                title={tokenVisible ? "Hide" : "Show"}
              >
                {tokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={copyToken}
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={() => setNewTokenValue(null)}
              className="mt-2 text-xs text-muted-foreground underline"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}

        {/* Create token form */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Device name (e.g. MacBook Pro)"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createToken()}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={createToken}
            disabled={creatingToken}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {creatingToken ? "Creating…" : "New Token"}
          </button>
        </div>

        {/* Token list */}
        <div className="space-y-2">
          {tokens.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No active tokens. Create one above and paste it into the companion app.
            </p>
          ) : (
            tokens.map((t) => (
              <TokenRow key={t.id} token={t} onRevoke={revokeToken} />
            ))
          )}
        </div>
      </section>

      {/* ── Setup Instructions ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold text-foreground">Quick Setup</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Download and install the <span className="text-foreground font-medium">ROK Companion</span> app on your Mac.</li>
          <li>Create a token above and copy it.</li>
          <li>Open the companion app → Settings → paste the token and set the Server URL to <code className="rounded bg-secondary px-1 py-0.5 text-xs">{typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'}</code>.</li>
          <li>In BlueStacks Air, view any battle report and tap <strong>Copy Report</strong>.</li>
          <li>The app detects the clipboard change, parses the report, and syncs it automatically.</li>
        </ol>
      </section>
    </div>
  );
}
