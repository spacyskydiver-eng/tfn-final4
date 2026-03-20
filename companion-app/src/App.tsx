/**
 * App.tsx — root component.
 *
 * Responsibilities:
 *  • Loads persisted settings from @tauri-apps/plugin-store.
 *  • Runs one of two monitoring modes:
 *      - "screen"    (default) — calls the RoKScreenReader Swift sidecar every 2 s,
 *                                captures the BlueStacks window, OCRs it automatically.
 *      - "clipboard" (fallback) — polls the clipboard every 500 ms (requires manual
 *                                 Copy button press inside the game).
 *  • Handles bulk import (user pastes one or many reports at once).
 *  • Owns the global sync log distributed to child components.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { Store } from "@tauri-apps/plugin-store";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

import { looksLikeReport, parseReport, type ParsedReport } from "./lib/parser";
import { hashText } from "./lib/hash";
import { captureGameScreen } from "./lib/screen-monitor";
import { submitEvent, type ApiError } from "./lib/api";

import Dashboard   from "./components/Dashboard";
import SyncHistory from "./components/SyncHistory";
import Settings    from "./components/Settings";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonitorStatus = "idle" | "monitoring" | "error" | "no_window";

export interface SyncEntry {
  id: string;
  timestamp: number;
  status: "synced" | "duplicate" | "error" | "skipped";
  reportType: string;
  killCount: number;
  fortKills: number;
  targetName?: string;
  errorMessage?: string;
}

export interface AppSettings {
  serverUrl: string;
  apiToken: string;
  notifyOnSync: boolean;
  /** "screen" uses the OCR sidecar (fully automatic). "clipboard" requires manual Copy in-game. */
  monitorMode: "screen" | "clipboard";
  /** Custom window title to search for (default: "RiseOfKingdoms"). */
  windowTitle: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  serverUrl:   "https://tfn-final4-sand.vercel.app",
  apiToken:    "",
  notifyOnSync: true,
  monitorMode: "screen",
  windowTitle: "Rise of Kingdoms",
};

const STORE_FILE    = "rok-companion-settings.json";
const SCREEN_INTERVAL_MS    = 2000;   // OCR every 2 seconds
const CLIPBOARD_INTERVAL_MS = 500;    // clipboard poll every 500 ms

// ─── Root App ─────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "history" | "settings";

export default function App() {
  const [activeTab, setActiveTab]         = useState<Tab>("dashboard");
  const [settings, setSettings]           = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [monitoring, setMonitoring]       = useState(true);
  const [status, setStatus]               = useState<MonitorStatus>("idle");
  const [statusDetail, setStatusDetail]   = useState<string>("");
  const [syncLog, setSyncLog]             = useState<SyncEntry[]>([]);
  const [totalSynced, setTotalSynced]     = useState(0);

  const processedHashes = useRef<Set<string>>(new Set());
  const lastOCRHash     = useRef<string>("");   // detect screen changes between OCR frames
  const lastClipboard   = useRef<string>("");
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const storeRef        = useRef<Store | null>(null);

  // ── Load settings ────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const store = await Store.load(STORE_FILE);
        storeRef.current = store;
        const saved = await store.get<AppSettings>("settings");
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      } catch (e) {
        console.warn("Could not load settings:", e);
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, []);

  // ── Save settings ────────────────────────────────────────────────────────

  const saveSettings = useCallback(async (next: AppSettings) => {
    setSettings(next);
    try {
      await storeRef.current?.set("settings", next);
      await storeRef.current?.save();
    } catch (e) {
      console.error("Could not save settings:", e);
    }
  }, []);

  // ── Core: process a block of text ───────────────────────────────────────

  const processText = useCallback(
    async (text: string, source: "screen" | "clipboard" | "bulk") => {
      if (!looksLikeReport(text)) return;

      const hash = await hashText(text);
      if (processedHashes.current.has(hash)) return;
      processedHashes.current.add(hash);

      const parsed: ParsedReport = parseReport(text);

      if (!settings.apiToken || !settings.serverUrl) {
        appendLog({ hash, status: "skipped", parsed, errorMessage: "No API token — check Settings" });
        return;
      }

      try {
        const result = await submitEvent({
          serverUrl: settings.serverUrl,
          apiToken:  settings.apiToken,
          rawText:   text,
        });

        const isDuplicate = result.duplicate === true;
        appendLog({ hash, status: isDuplicate ? "duplicate" : "synced", parsed });

        if (!isDuplicate) {
          setTotalSynced((n) => n + 1);
          if (settings.notifyOnSync) {
            const granted =
              (await isPermissionGranted()) ||
              (await requestPermission()) === "granted";
            if (granted) {
              const label = getNotificationLabel(parsed);
              sendNotification({ title: "ROK Companion", body: label });
            }
          }
        }
        if (source !== "bulk") setStatus("monitoring");
      } catch (err) {
        appendLog({ hash, status: "error", parsed, errorMessage: (err as ApiError).message ?? "Network error" });
        if (source !== "bulk") setStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings]
  );

  // ── Bulk import: split a multi-report paste and process each one ─────────

  const processBulkText = useCallback(
    async (raw: string): Promise<{ processed: number; skipped: number }> => {
      // Split on blank lines — each report block is separated by at least one blank line
      const blocks = raw
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .filter((b) => b.length > 10);

      let processed = 0;
      let skipped   = 0;

      for (const block of blocks) {
        if (looksLikeReport(block)) {
          await processText(block, "bulk");
          processed++;
        } else {
          skipped++;
        }
      }
      return { processed, skipped };
    },
    [processText]
  );

  // ── Screen monitoring tick ───────────────────────────────────────────────

  const screenTick = useCallback(async () => {
    try {
      const result = await captureGameScreen(settings.windowTitle || "BlueStacks");

      if (!result.windowFound) {
        setStatus("no_window");
        setStatusDetail(result.error ?? "Game window not found");
        return;
      }

      if (!result.text) return;

      // Only re-process if the screen content has changed
      const screenHash = await hashText(result.text);
      if (screenHash === lastOCRHash.current) return;
      lastOCRHash.current = screenHash;

      setStatus("monitoring");
      setStatusDetail(`Watching ${result.appName}`);

      await processText(result.text, "screen");
    } catch {
      // Sidecar error — don't crash the loop
    }
  }, [settings.windowTitle, processText]);

  // ── Clipboard tick (fallback mode) ───────────────────────────────────────

  const clipboardTick = useCallback(async () => {
    try {
      const text = await readText();
      if (!text || text === lastClipboard.current) return;
      lastClipboard.current = text;
      setStatus("monitoring");
      await processText(text, "clipboard");
    } catch {
      // Clipboard may be empty or non-text
    }
  }, [processText]);

  // ── Monitoring loop ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!settingsLoaded) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!monitoring) {
      setStatus("idle");
      setStatusDetail("");
      return;
    }

    setStatus("monitoring");

    if (settings.monitorMode === "screen") {
      // Kick off immediately, then repeat
      screenTick();
      intervalRef.current = setInterval(screenTick, SCREEN_INTERVAL_MS);
    } else {
      intervalRef.current = setInterval(clipboardTick, CLIPBOARD_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [monitoring, settingsLoaded, settings.monitorMode, screenTick, clipboardTick]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function appendLog(args: {
    hash: string;
    status: SyncEntry["status"];
    parsed: ParsedReport;
    errorMessage?: string;
  }) {
    const entry: SyncEntry = {
      id:           args.hash,
      timestamp:    Date.now(),
      status:       args.status,
      reportType:   args.parsed.type,
      killCount:    args.parsed.killCount,
      fortKills:    args.parsed.fortKills,
      targetName:   args.parsed.targetName,
      errorMessage: args.errorMessage,
    };
    setSyncLog((prev) => [entry, ...prev].slice(0, 200));
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!settingsLoaded) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--muted)" }}>Loading…</span>
      </div>
    );
  }

  const statusLabel =
    status === "monitoring" ? (statusDetail || "Monitoring") :
    status === "no_window"  ? "Game not found" :
    status === "error"      ? "Sync error" : "Paused";

  return (
    <div className="app">
      {/* Status bar */}
      <div className="status-bar">
        <div className="row gap-2">
          <div className={`status-dot ${status === "monitoring" ? "on" : status === "error" ? "err" : "off"}`} />
          <span style={{ fontSize: 13, color: "var(--text)" }}>{statusLabel}</span>
          {settings.monitorMode === "screen" && status === "monitoring" && (
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>· Screen OCR</span>
          )}
        </div>
        <button
          onClick={() => setMonitoring((m) => !m)}
          className={`btn ${monitoring ? "btn-danger" : "btn-primary"}`}
          style={{ padding: "5px 12px", fontSize: 12 }}
        >
          {monitoring ? "Pause" : "Resume"}
        </button>
      </div>

      {/* Tab bar */}
      <div className="tabs">
        {(["dashboard", "history", "settings"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`tab${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content">
        {activeTab === "dashboard" && (
          <Dashboard
            status={status}
            totalSynced={totalSynced}
            syncLog={syncLog}
            settings={settings}
            onBulkImport={processBulkText}
          />
        )}
        {activeTab === "history" && (
          <SyncHistory syncLog={syncLog} />
        )}
        {activeTab === "settings" && (
          <Settings settings={settings} onSave={saveSettings} />
        )}
      </div>
    </div>
  );
}

function getNotificationLabel(parsed: ParsedReport): string {
  switch (parsed.type) {
    case "BARBARIAN_KILL":    return `Barbarian kill synced (+${parsed.killCount.toLocaleString()} kills)`;
    case "FORT_KILL":         return `Fort destroyed (${parsed.fortKills} fort${parsed.fortKills !== 1 ? "s" : ""})`;
    case "PVP_KILL":          return `PvP kill synced (+${parsed.killCount.toLocaleString()} kills)`;
    case "DEFENSE_REPORT":    return `Incoming attack recorded`;
    case "SCOUT_REPORT":      return `Scout report synced`;
    case "GATHERING_COMPLETE":return `Gathering report synced`;
    default:                  return "Report synced";
  }
}
