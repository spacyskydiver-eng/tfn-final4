/**
 * SyncHistory.tsx
 * Full list of all sync attempts this session, with type and status badges.
 */

import type { SyncEntry } from "../App";

interface Props {
  syncLog: SyncEntry[];
}

const STATUS_LABEL: Record<SyncEntry["status"], string> = {
  synced:    "Synced",
  duplicate: "Duplicate",
  error:     "Error",
  skipped:   "Skipped",
};

const STATUS_CLASS: Record<SyncEntry["status"], string> = {
  synced:    "badge-green",
  duplicate: "badge-muted",
  error:     "badge-red",
  skipped:   "badge-muted",
};

export default function SyncHistory({ syncLog }: Props) {
  if (syncLog.length === 0) {
    return (
      <div className="empty">
        <p>No sync history yet.</p>
        <p style={{ marginTop: 6 }}>Copy a battle report in-game to start.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 12 }}>
        {syncLog.length} event{syncLog.length !== 1 ? "s" : ""} this session
      </div>

      {syncLog.map((entry) => (
        <div key={`${entry.id}-${entry.timestamp}`} className="event-item">
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <span className={`badge ${
                entry.reportType === "BARBARIAN_KILL" ? "badge-orange" :
                entry.reportType === "FORT_KILL"      ? "badge-blue"   : "badge-muted"
              }`}>
                {entry.reportType === "BARBARIAN_KILL" ? "Barbarian Kill" :
                 entry.reportType === "FORT_KILL"      ? "Fort Kill"      : "Unknown"}
              </span>
              <span className={`badge ${STATUS_CLASS[entry.status]}`}>
                {STATUS_LABEL[entry.status]}
              </span>
            </div>

            {/* Target name */}
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>
              {entry.targetName ?? "Unknown target"}
            </div>

            {/* Timestamp */}
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {new Date(entry.timestamp).toLocaleString()}
            </div>

            {/* Error detail */}
            {entry.errorMessage && (
              <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 3 }}>
                ✗ {entry.errorMessage}
              </div>
            )}
          </div>

          {/* Kill count */}
          <div
            className="event-count"
            style={{
              fontSize: 17,
              color: entry.reportType === "BARBARIAN_KILL" ? "var(--orange)" :
                     entry.reportType === "FORT_KILL"      ? "var(--blue)"   : "var(--muted)",
              opacity: entry.status === "duplicate" || entry.status === "skipped" ? 0.4 : 1,
            }}
          >
            {entry.reportType === "BARBARIAN_KILL" && entry.killCount > 0 &&
              `+${entry.killCount.toLocaleString()}`}
            {entry.reportType === "FORT_KILL" &&
              `×${entry.fortKills}`}
          </div>
        </div>
      ))}
    </div>
  );
}
