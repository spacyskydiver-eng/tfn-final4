/**
 * screen-monitor.ts
 *
 * Thin wrapper around the RoKScreenReader sidecar binary.
 * The sidecar is a compiled Swift CLI that:
 *   1. Finds the BlueStacks X / RoK window using ScreenCaptureKit
 *   2. Captures a screenshot with SCScreenshotManager
 *   3. Runs Apple Vision OCR
 *   4. Returns JSON: { text, windowFound, appName, timestamp, error }
 *
 * Requirements: macOS 14.0+, Screen Recording permission granted.
 */

import { Command } from "@tauri-apps/plugin-shell";

export interface OCRResult {
  text: string;
  windowFound: boolean;
  appName: string;
  timestamp: string;
  error: string | null;
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
