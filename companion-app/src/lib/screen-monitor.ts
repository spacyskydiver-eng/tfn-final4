/**
 * screen-monitor.ts
 *
 * Thin wrapper around the RoKScreenReader sidecar binary.
 * Supports two modes:
 *   captureGameScreen(term) — find + OCR game window
 *   listWindows()           — return all capturable windows for the picker UI
 */

import { Command } from "@tauri-apps/plugin-shell";

export interface OCRResult {
  text: string;
  windowFound: boolean;
  appName: string;
  timestamp: string;
  error: string | null;
}

export interface WindowInfo {
  id: number;
  app: string;
  title: string;
}

/**
 * List all capturable windows — used by the window picker in Settings.
 * Returns an empty array on error (never throws).
 */
export async function listWindows(): Promise<WindowInfo[]> {
  try {
    const command = Command.sidecar("binaries/RoKScreenReader", ["--list"]);
    const output  = await command.execute();
    const raw = output.stdout.trim();
    if (!raw) return [];
    return JSON.parse(raw) as WindowInfo[];
  } catch {
    return [];
  }
}

/**
 * Capture a screenshot of the game window and extract all visible text via OCR.
 * Never throws — always returns an OCRResult (with error set on failure).
 */
export async function captureGameScreen(
  windowSearchTerm?: string
): Promise<OCRResult> {
  const fallback: OCRResult = {
    text: "",
    windowFound: false,
    appName: "",
    timestamp: new Date().toISOString(),
    error: null,
  };

  try {
    const args = windowSearchTerm ? [windowSearchTerm] : [];
    const command = Command.sidecar("binaries/RoKScreenReader", args);
    const output  = await command.execute();

    const raw = output.stdout.trim();
    if (!raw) {
      return { ...fallback, error: output.stderr || "Screen reader returned no output" };
    }

    const parsed = JSON.parse(raw) as OCRResult;
    return parsed;
  } catch (err) {
    return {
      ...fallback,
      error: err instanceof Error ? err.message : "Screen reader failed to start",
    };
  }
}
