/**
 * Settings.tsx
 * Configure server URL, API token, monitoring mode, and notifications.
 */

import { useState } from "react";
import type { AppSettings } from "../App";

interface Props {
  settings: AppSettings;
  onSave:   (next: AppSettings) => Promise<void>;
}

export default function Settings({ settings, onSave }: Props) {
  const [form, setForm]           = useState<AppSettings>(settings);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [showToken, setShowToken] = useState(false);

  const update = (key: keyof AppSettings, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.serverUrl.startsWith("http")) {
      alert("Server URL must start with http:// or https://");
      return;
    }
    if (form.apiToken && !form.apiToken.startsWith("rok_")) {
      alert("API token should start with 'rok_'. Double-check you pasted the correct token.");
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {/* ── Monitoring Mode ── */}
      <div className="section-title">Monitoring Mode</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {/* Screen OCR (recommended) */}
        <label
          className="row"
          style={{ cursor: "pointer", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}
        >
          <input
            type="radio"
            name="monitorMode"
            value="screen"
            checked={form.monitorMode === "screen"}
            onChange={() => update("monitorMode", "screen")}
            style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              🖥 Screen OCR <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: 11 }}>RECOMMENDED</span>
            </div>
            <div className="text-muted" style={{ marginTop: 3 }}>
              Automatically captures the BlueStacks game window every 2 seconds and reads
              all reports using Apple Vision — <strong style={{ color: "var(--text)" }}>fully hands-free</strong>.
              Just open any mail or report in-game and it's recorded automatically.
            </div>
            <div className="text-muted" style={{ marginTop: 4, fontSize: 11 }}>
              Requires macOS 14+ and Screen Recording permission (granted on first launch).
            </div>
          </div>
        </label>

        {/* Window title (only shown in screen mode) */}
        {form.monitorMode === "screen" && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Game Window Title</label>
            <input
              type="text"
              value={form.windowTitle}
              onChange={(e) => update("windowTitle", e.target.value)}
              placeholder="BlueStacks"
            />
            <span className="text-muted">
              Leave as <code style={{ fontSize: 11 }}>BlueStacks</code> unless you're running
              the native iOS version directly (then try <code style={{ fontSize: 11 }}>Rise of Kingdoms</code>).
            </span>
          </div>
        )}

        {/* Clipboard fallback */}
        <label className="row" style={{ cursor: "pointer", paddingTop: 12 }}>
          <input
            type="radio"
            name="monitorMode"
            value="clipboard"
            checked={form.monitorMode === "clipboard"}
            onChange={() => update("monitorMode", "clipboard")}
            style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>📋 Clipboard (manual)</div>
            <div className="text-muted" style={{ marginTop: 3 }}>
              Polls clipboard every 500 ms. You must tap the <strong style={{ color: "var(--text)" }}>Copy</strong>{" "}
              button inside each report in-game. Use this if Screen OCR doesn't work on your setup.
            </div>
          </div>
        </label>
      </div>

      {/* ── Connection ── */}
      <div className="section-title">Connection</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>Server URL</label>
          <input
            type="url"
            value={form.serverUrl}
            onChange={(e) => update("serverUrl", e.target.value)}
            placeholder="https://yoursite.com"
          />
          <span className="text-muted">
            Base URL of your website, e.g.{" "}
            <code style={{ fontSize: 11 }}>https://yoursite.com</code>
          </span>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>API Token</label>
          <div className="row">
            <input
              type={showToken ? "text" : "password"}
              value={form.apiToken}
              onChange={(e) => update("apiToken", e.target.value)}
              placeholder="rok_…"
              style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="btn btn-ghost"
              style={{ padding: "7px 10px", fontSize: 12, flexShrink: 0 }}
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
          <span className="text-muted">
            Generate on the website's <strong>Kill Tracker</strong> page. Starts with{" "}
            <code style={{ fontSize: 11 }}>rok_</code>.
          </span>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="section-title">Notifications</div>
      <div className="card" style={{ marginBottom: 20 }}>
        <label className="row" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.notifyOnSync}
            onChange={(e) => update("notifyOnSync", e.target.checked)}
            style={{ width: 16, height: 16, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Show notification on sync</div>
            <div className="text-muted">macOS will prompt once to allow notifications.</div>
          </div>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`btn ${saved ? "btn-ghost" : "btn-primary"}`}
        style={{ width: "100%" }}
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save Settings"}
      </button>

      <div
        className="card"
        style={{ marginTop: 20, borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.05)", fontSize: 12, color: "var(--muted)" }}
      >
        <strong style={{ color: "var(--text)" }}>🔒 Security</strong>
        <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.7 }}>
          <li>Token stored only in this app's sandbox — never plaintext on disk.</li>
          <li>Screen captures are processed on-device and immediately discarded — not stored anywhere.</li>
          <li>Only parsed report text is sent to your server, nothing else.</li>
          <li>Revoke tokens on the website if this device is lost or compromised.</li>
        </ul>
      </div>
    </div>
  );
}
