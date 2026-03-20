/**
 * Dashboard.tsx
 * First tab: status, session stats, recent activity, and bulk import.
 */

import type { AppSettings, MonitorStatus, SyncEntry } from "../App";
import BulkImport from "./BulkImport";

interface Props {
  status:        MonitorStatus;
  totalSynced:   number;
  syncLog:       SyncEntry[];
  settings:      AppSettings;
  onBulkImport:  (raw: string) => Promise<{ processed: number; skipped: number }>;
}

const TYPE_LABELS: Record<string, string> = {
  BARBARIAN_KILL:    "Barbarian",
  FORT_KILL:         "Fort",
  PVP_KILL:          "PvP",
  DEFENSE_REPORT:    "Defense",
  SCOUT_REPORT:      "Scout",
  GATHERING_COMPLETE:"Gather",
  UNKNOWN:           "Unknown",
};

const TYPE_BADGE: Record<string, string> = {
  BARBARIAN_KILL:    "badge-orange",
  FORT_KILL:         "badge-blue",
  PVP_KILL:          "badge-red",
  DEFENSE_REPORT:    "badge-muted",
  SCOUT_REPORT:      "badge-muted",
  GATHERING_COMPLETE:"badge-muted",
  UNKNOWN:           "badge-muted",
};

function StatBox({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="card" style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ status, totalSynced, syncLog, settings, onBulkImport }: Props) {
  const synced = syncLog.filter(e => e.status === "synced");

  const barbarianKills = synced
    .filter(e => e.reportType === "BARBARIAN_KILL")
    .reduce((s, e) => s + e.killCount, 0);

  const pvpKills = synced
    .filter(e => e.reportType === "PVP_KILL")
    .reduce((s, e) => s + e.killCount, 0);

  const fortKills = synced
    .filter(e => e.reportType === "FORT_KILL")
    .reduce((s, e) => s + e.fortKills, 0);

  const errorCount = syncLog.filter(e => e.status === "error").length;
  const recent     = syncLog.slice(0, 5);
  const isConfigured = Boolean(settings.apiToken && settings.serverUrl);
  const isScreen     = settings.monitorMode === "screen";

  return (
    <div>
      {/* Config warning */}
      {!isConfigured && (
        <div className="card" style={{ borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.05)", marginBottom: 16 }}>
          <div style={{ color: "var(--warning)", fontWeight: 600, marginBottom: 4, fontSize: 13 }}>⚠ Not configured</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Go to <strong style={{ color: "var(--text)" }}>Settings</strong> and enter your Server URL and API Token.
          </div>
        </div>
      )}

      {/* Game not found warning (screen mode only) */}
      {isScreen && status === "no_window" && (
        <div className="card" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", marginBottom: 16 }}>
          <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4, fontSize: 13 }}>🔍 Game window not found</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Looking for a window matching <strong style={{ color: "var(--text)" }}>"{settings.windowTitle || "Rise of Kingdoms"}"</strong>.
            Make sure Rise of Kingdoms is open. If using BlueStacks or a different launcher, update Window Title in Settings.
          </div>
        </div>
      )}

      {/* Session stats */}
      <div className="section-title">This Session</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <StatBox label="Synced"        value={totalSynced}    color="var(--primary)" />
        <StatBox label="Barb Kills"    value={barbarianKills} color="var(--orange)" />
        <StatBox label="PvP Kills"     value={pvpKills}       color="var(--danger)" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <StatBox label="Forts"         value={fortKills}      color="var(--blue)" />
        {errorCount > 0 && <StatBox label="Errors" value={errorCount} color="var(--danger)" />}
      </div>

      {/* How it works */}
      <div className="section-title">How It Works</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {isScreen ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🖥 Screen OCR Mode (Automatic)</div>
            <ol style={{ paddingLeft: 18, color: "var(--muted)", fontSize: 13, lineHeight: 1.9, margin: 0 }}>
              <li>Keep BlueStacks X open with Rise of Kingdoms running.</li>
              <li>Open any mail, battle report, or scout report in-game — <strong style={{ color: "var(--text)" }}>just browse normally</strong>.</li>
              <li>This app captures the screen every 2 seconds, reads the text automatically using Apple Vision OCR.</li>
              <li>Reports are parsed, deduplicated, and synced to your website instantly.</li>
            </ol>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--primary)" }}>
              ✓ No Copy button needed — fully hands-free
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📋 Clipboard Mode (Manual)</div>
            <ol style={{ paddingLeft: 18, color: "var(--muted)", fontSize: 13, lineHeight: 1.9, margin: 0 }}>
              <li>Open BlueStacks X and launch Rise of Kingdoms.</li>
              <li>View any battle report, mail, or scout report in-game.</li>
              <li>Tap the <strong style={{ color: "var(--text)" }}>Copy</strong> button on the report.</li>
              <li>The app detects the clipboard change and syncs automatically.</li>
            </ol>
          </>
        )}
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <>
          <div className="section-title">Recent Activity</div>
          {recent.map(entry => (
            <div key={entry.id} className="event-item">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span className={`badge ${TYPE_BADGE[entry.reportType] ?? "badge-muted"}`}>
                    {TYPE_LABELS[entry.reportType] ?? entry.reportType}
                  </span>
                  <span className={`badge ${
                    entry.status === "synced"    ? "badge-green" :
                    entry.status === "duplicate" ? "badge-muted" :
                    entry.status === "error"     ? "badge-red"   : "badge-muted"
                  }`}>
                    {entry.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {entry.targetName ?? "Unknown target"} · {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                {entry.errorMessage && (
                  <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>{entry.errorMessage}</div>
                )}
              </div>
              <div className="event-count" style={{
                color: entry.reportType === "BARBARIAN_KILL" ? "var(--orange)" :
                       entry.reportType === "FORT_KILL"      ? "var(--blue)"   :
                       entry.reportType === "PVP_KILL"       ? "var(--danger)" : "var(--muted)"
              }}>
                {entry.reportType === "BARBARIAN_KILL" && `+${entry.killCount.toLocaleString()}`}
                {entry.reportType === "FORT_KILL"      && `×${entry.fortKills}`}
                {entry.reportType === "PVP_KILL"       && `+${entry.killCount.toLocaleString()}`}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Bulk import */}
      <div style={{ marginTop: 12 }}>
        <BulkImport onImport={onBulkImport} />
      </div>
    </div>
  );
}
