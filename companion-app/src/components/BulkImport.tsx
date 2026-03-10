/**
 * BulkImport.tsx
 *
 * Inline panel for importing multiple reports at once.
 * User pastes a block of text (one or more reports separated by blank lines),
 * the app splits and processes each one individually.
 *
 * Used from the Dashboard tab.
 */

import { useState } from "react";

interface Props {
  /** Called with the raw pasted text. Returns counts of what was processed. */
  onImport: (raw: string) => Promise<{ processed: number; skipped: number }>;
}

export default function BulkImport({ onImport }: Props) {
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<{ processed: number; skipped: number } | null>(null);

  const handleImport = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await onImport(text);
      setResult(r);
      setText("");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setResult(null); }}
        className="btn btn-ghost"
        style={{ width: "100%", fontSize: 12, marginTop: 4 }}
      >
        📋 Bulk Import Reports
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>📋 Bulk Import</span>
        <button
          onClick={() => { setOpen(false); setResult(null); setText(""); }}
          className="btn btn-ghost"
          style={{ padding: "3px 8px", fontSize: 12 }}
        >
          ✕
        </button>
      </div>

      <div className="text-muted" style={{ marginBottom: 10, fontSize: 12 }}>
        Paste one or more reports below (separate multiple reports with a blank line).
        Each block is parsed individually and deduplicated against your existing records.
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Battle Report\nAttacker: YourName\nBarbarian (Lv.25)\nKills:\n  T1: 150\n  T2: 30\n\n--- paste more reports below ---"}
        rows={9}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.5,
        }}
        disabled={loading}
      />

      {result && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 6,
            background: result.processed > 0 ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.08)",
            border:     result.processed > 0 ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--border)",
            fontSize: 12,
          }}
        >
          {result.processed > 0 ? (
            <span style={{ color: "var(--green)" }}>
              ✓ Submitted {result.processed} report{result.processed !== 1 ? "s" : ""}
              {result.skipped > 0 && (
                <span style={{ color: "var(--muted)" }}> · {result.skipped} block{result.skipped !== 1 ? "s" : ""} skipped (not reports)</span>
              )}
            </span>
          ) : (
            <span style={{ color: "var(--muted)" }}>
              No reports recognised. Make sure you paste actual battle report text.
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={handleImport}
          disabled={loading || !text.trim()}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          {loading ? "Importing…" : "Import"}
        </button>
        <button
          onClick={() => setText("")}
          disabled={loading}
          className="btn btn-ghost"
          style={{ padding: "7px 14px" }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
