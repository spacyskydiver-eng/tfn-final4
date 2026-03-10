# ROK Companion App

A macOS menu-bar app that **automatically** reads Rise of Kingdoms battle reports and mail from BlueStacks X and syncs them to your website — no button presses required.

## How It Works

1. BlueStacks X is open on your Mac with the game running (cloud-streamed via now.gg).
2. Every **2 seconds** the companion app uses Apple's **ScreenCaptureKit** to capture the BlueStacks window.
3. **Apple Vision OCR** reads all visible text on screen.
4. If a report, kill mail, or scout result is on screen it is parsed, hash-deduplicated, and sent to your website API.
5. The Kill Tracker and Sync History pages on your website update instantly.

No Copy button needed — just browse your in-game mail normally.

No screenshots. No screen recording. No memory reading. Only the text you explicitly copy.

---

## macOS permissions

| Permission | Why | When prompted |
|---|---|---|
| Clipboard access | Read battle report text | First time you copy something after launch |
| Notifications | Optional sync alerts | When you enable them in Settings |
| Network | Send events to backend | Automatic (sandbox entitlement) |

---

## Prerequisites

- macOS 10.15+ (Catalina or later)
- [Rust](https://rustup.rs/) (stable)
- [Node.js 18+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Tauri CLI v2 (`cargo install tauri-cli --version "^2"`)

---

## Local development

```bash
# 1. Install JS deps
cd companion-app
pnpm install

# 2. Start in dev mode (Vite + Tauri hot-reload)
pnpm tauri dev
```

The app window will open. Your website must be running on `http://localhost:3000` for syncing to work.

---

## Building a release .dmg

```bash
pnpm tauri build
# Output: src-tauri/target/release/bundle/macos/ROK Companion.app
#         src-tauri/target/release/bundle/dmg/ROK Companion_0.1.0_aarch64.dmg
```

> **Icons**: Replace the placeholder PNGs in `src-tauri/icons/` with your own before building.
> You can generate the full icon set from a 1024×1024 PNG using:
> ```bash
> pnpm tauri icon path/to/your-icon.png
> ```

---

## Folder structure

```
companion-app/
├── src/
│   ├── App.tsx              ← Root: settings loader, clipboard loop, sync logic
│   ├── components/
│   │   ├── Dashboard.tsx    ← Session stats + live activity
│   │   ├── SyncHistory.tsx  ← Full history list
│   │   └── Settings.tsx     ← Server URL + token config
│   └── lib/
│       ├── parser.ts        ← Modular report parser
│       ├── api.ts           ← HTTP client (fetch to backend)
│       └── hash.ts          ← SHA-256 via Web Crypto API
└── src-tauri/
    ├── src/
    │   ├── lib.rs           ← Tauri setup, system tray, commands
    │   └── main.rs          ← Binary entry point
    ├── tauri.conf.json
    ├── capabilities/default.json
    └── entitlements.plist
```

---

## Adding new report types

1. Open `src/lib/parser.ts`.
2. Create a new `const myParser: ParserDefinition = { matches, parse }` block.
3. Push it onto the `PARSERS` array before the closing bracket.
4. Mirror the same change in the website's `lib/report-parser.ts`.
5. The new type will automatically flow through the API and appear in the dashboard.

---

## Security notes

- The API token is stored in the Tauri [Store plugin](https://v2.tauri.app/plugin/store/) inside the app's sandboxed `Application Support` folder — never in plain text anywhere else.
- Only the report text is transmitted to your server. No screenshots, no metadata, no device fingerprints.
- Always use HTTPS in production to prevent token interception.
- Revoke tokens from the website's **Kill Tracker** page if a device is lost or compromised.
