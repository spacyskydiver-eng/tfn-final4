"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Sword, Shield, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = "BARBARIAN_KILL" | "FORT_KILL" | "UNKNOWN";

interface ParsedData {
  type: ReportType;
  killCount: number;
  fortKills: number;
  playerName?: string;
  targetName?: string;
  targetLevel?: number;
  allianceTag?: string;
  result?: "Victory" | "Defeat" | "Unknown";
}

interface KillEvent {
  id: string;
  reportType: ReportType;
  killCount: number;
  fortKills: number;
  syncedVia: string;
  createdAt: string;
  parsedData: ParsedData;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<ReportType, { label: string; icon: React.ElementType; color: string }> = {
  BARBARIAN_KILL: { label: "Barbarian Kill", icon: Sword, color: "text-orange-500 bg-orange-500/10" },
  FORT_KILL:      { label: "Fort Kill",       icon: Shield, color: "text-blue-500 bg-blue-500/10"   },
  UNKNOWN:        { label: "Unknown",         icon: HelpCircle, color: "text-muted-foreground bg-secondary" },
};

function TypeBadge({ type }: { type: ReportType }) {
  const meta = TYPE_META[type] ?? TYPE_META.UNKNOWN;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function ResultBadge({ result }: { result?: string }) {
  if (!result || result === "Unknown") return null;
  const isVictory = result === "Victory";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        isVictory ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"
      )}
    >
      {result}
    </span>
  );
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: KillEvent }) {
  const p = event.parsedData;
  const date = new Date(event.createdAt);

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm hover:border-primary/30 transition-colors">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={event.reportType} />
          <ResultBadge result={p?.result} />
          {event.syncedVia === "clipboard" && (
            <span className="text-xs text-muted-foreground">via clipboard</span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-foreground">
          {p?.targetName ?? "Unknown target"}
          {p?.playerName && (
            <span className="font-normal text-muted-foreground"> · {p.playerName}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}{" "}
          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div className="text-right shrink-0">
        {event.reportType === "BARBARIAN_KILL" && (
          <p className="text-lg font-bold tabular-nums text-orange-500">
            {event.killCount.toLocaleString()}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground"> kills</span>
          </p>
        )}
        {event.reportType === "FORT_KILL" && (
          <>
            <p className="text-lg font-bold tabular-nums text-blue-500">
              {event.fortKills}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground"> fort{event.fortKills !== 1 ? "s" : ""}</span>
            </p>
            {event.killCount > 0 && (
              <p className="text-xs text-muted-foreground">
                +{event.killCount.toLocaleString()} units
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "", label: "All Reports" },
  { value: "BARBARIAN_KILL", label: "Barbarian Kills" },
  { value: "FORT_KILL", label: "Fort Kills" },
];

export function SyncHistoryContent() {
  const [events, setEvents]         = useState<KillEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState("");
  const [page, setPage]             = useState(1);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filter) params.set("type", filter);
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEvents(data.events ?? []);
      setPagination(data.pagination ?? null);
    } catch {
      setError("Could not load sync history. Please sign in.");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Reset page when filter changes
  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(1);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === opt.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-muted-foreground">
            No synced reports yet.
            {!filter && " Open the companion app, then copy a battle report inside BlueStacks Air."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.total.toLocaleString()} report{pagination.total !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-sm text-muted-foreground">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages || loading}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
