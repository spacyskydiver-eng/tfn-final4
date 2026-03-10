/**
 * RoKScreenReader.swift
 *
 * macOS command-line tool that:
 *   1. Finds the BlueStacks X / Rise of Kingdoms window on screen
 *   2. Captures a screenshot of that window using ScreenCaptureKit
 *   3. Runs Apple Vision OCR on the captured frame
 *   4. Outputs extracted text as JSON to stdout
 *
 * Used as a Tauri sidecar — called every 2 seconds by the companion app.
 *
 * Requirements:
 *   • macOS 14.0+ (ScreenCaptureKit SCScreenshotManager)
 *   • Screen Recording permission granted in System Preferences
 *
 * Build (run build.sh instead of this directly):
 *   swiftc -target arm64-apple-macos14.0 \
 *          -framework ScreenCaptureKit -framework Vision \
 *          -framework CoreGraphics -framework Foundation \
 *          RoKScreenReader.swift -o ../binaries/RoKScreenReader-aarch64-apple-darwin
 *
 * Output JSON schema:
 *   { "text": string, "windowFound": bool, "appName": string,
 *     "timestamp": string, "error": string | null }
 *
 * Exit codes: 0 = success (text extracted), 1 = window not found or error
 */

import ScreenCaptureKit
import Vision
import CoreGraphics
import Foundation

// ─── Output type ─────────────────────────────────────────────────────────────

struct OCROutput: Codable {
    let text: String
    let windowFound: Bool
    let appName: String
    let timestamp: String
    let error: String?
}

func emit(_ output: OCROutput) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = .sortedKeys
    if let data = try? encoder.encode(output),
       let json = String(data: data, encoding: .utf8) {
        print(json)
    } else {
        print("{\"text\":\"\",\"windowFound\":false,\"appName\":\"\",\"timestamp\":\"\(output.timestamp)\",\"error\":\"JSON encode failed\"}")
    }
    exit(output.windowFound ? 0 : 1)
}

// ─── Entry point ─────────────────────────────────────────────────────────────

let timestamp = ISO8601DateFormatter().string(from: Date())
let searchArg = CommandLine.arguments.dropFirst().first ?? ""

let semaphore = DispatchSemaphore(value: 0)

Task {
    defer { semaphore.signal() }

    do {
        // Request shareable content — this triggers Screen Recording permission
        // dialog on first run if not yet granted.
        let content = try await SCShareableContent.current

        // Find the game window (BlueStacks X cloud client or native iOS app)
        let targetWindow = content.windows.first { window in
            let app   = window.owningApplication?.applicationName ?? ""
            let bid   = window.owningApplication?.bundleIdentifier ?? ""
            let title = window.title ?? ""

            let checks: [Bool] = [
                // BlueStacks X (cloud streaming client)
                app.localizedCaseInsensitiveContains("BlueStacks"),
                bid.localizedCaseInsensitiveContains("com.bluestacks"),
                bid.localizedCaseInsensitiveContains("BlueStacksX"),

                // now.gg cloud client
                app.localizedCaseInsensitiveContains("now.gg"),
                bid.localizedCaseInsensitiveContains("nowgg"),

                // Native iOS app on Apple Silicon
                bid.localizedCaseInsensitiveContains("lilithgame"),
                bid.localizedCaseInsensitiveContains("roc.ios"),

                // Window title matching
                title.localizedCaseInsensitiveContains("Rise of Kingdoms"),
                title.localizedCaseInsensitiveContains("BlueStacks"),

                // Custom search arg (from companion app settings)
                !searchArg.isEmpty && (
                    app.localizedCaseInsensitiveContains(searchArg) ||
                    title.localizedCaseInsensitiveContains(searchArg)
                ),
            ]

            return checks.contains(true)
        }

        guard let window = targetWindow else {
            emit(OCROutput(
                text: "",
                windowFound: false,
                appName: "",
                timestamp: timestamp,
                error: "Game window not found. Make sure BlueStacks X is open and the game is running."
            ))
        }

        let appName = window.owningApplication?.applicationName ?? "Unknown"

        // ── Capture screenshot ────────────────────────────────────────────────
        let filter = SCContentFilter(desktopIndependentWindow: window)
        let config = SCStreamConfiguration()
        // Capture at a resolution good enough for OCR but not wasteful
        config.width        = 1280
        config.height       = 800
        config.scalesToFit  = true

        let cgImage = try await SCScreenshotManager.captureImage(
            contentFilter: filter,
            configuration: config
        )

        // ── Vision OCR ───────────────────────────────────────────────────────
        let request = VNRecognizeTextRequest()
        request.recognitionLevel      = .accurate
        request.usesLanguageCorrection = true
        // minimumTextHeight as fraction of image height — small values catch fine print
        request.minimumTextHeight     = 0.008

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try handler.perform([request])

        let lines = (request.results as? [VNRecognizedTextObservation] ?? [])
            .compactMap { $0.topCandidates(1).first?.string }

        let text = lines.joined(separator: "\n")

        emit(OCROutput(
            text: text,
            windowFound: true,
            appName: appName,
            timestamp: timestamp,
            error: text.isEmpty ? "Window found but no text recognised" : nil
        ))

    } catch let scError as SCStreamError {
        // SCStreamError code 1 = permission denied
        let msg = scError.code == .userDeclined
            ? "Screen Recording permission denied. Open System Settings → Privacy & Security → Screen Recording and enable ROK Companion."
            : scError.localizedDescription
        emit(OCROutput(text: "", windowFound: false, appName: "", timestamp: timestamp, error: msg))

    } catch {
        emit(OCROutput(
            text: "",
            windowFound: false,
            appName: "",
            timestamp: timestamp,
            error: error.localizedDescription
        ))
    }
}

semaphore.wait()
