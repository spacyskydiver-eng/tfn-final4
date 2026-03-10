// lib.rs — Tauri application entry point (called from main.rs).
//
// Architecture
// ────────────
// All clipboard monitoring is handled in JavaScript (via readText() from
// @tauri-apps/plugin-clipboard-manager) rather than Rust threads.
// This keeps the Rust side minimal and avoids threading complexity.
//
// The Rust side is responsible for:
//  • Registering all plugins
//  • Setting up the system tray (macOS menu bar icon)
//  • Defining any Tauri commands needed by the frontend
//  • Controlling window visibility on tray click

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

// ─── Tauri Commands ───────────────────────────────────────────────────────────

/// Quits the application. Called from the tray menu or Settings page.
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Brings the main window to the front. Called from the tray menu.
#[tauri::command]
fn show_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// ─── Application Setup ────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        // ── Plugins ──────────────────────────────────────────────────────────
        // clipboard-manager: lets the JS frontend call readText() / writeText()
        .plugin(tauri_plugin_clipboard_manager::init())
        // store: persists settings to disk in the app sandbox
        .plugin(tauri_plugin_store::Builder::new().build())
        // notification: shows macOS notifications on successful sync
        .plugin(tauri_plugin_notification::init())
        // shell: allows opening URLs in the default browser (used in Settings)
        .plugin(tauri_plugin_shell::init())
        // ── Commands ─────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![quit_app, show_window])
        // ── Setup ────────────────────────────────────────────────────────────
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running ROK Companion");
}

// ─── System Tray ──────────────────────────────────────────────────────────────

fn setup_tray<R: Runtime>(app: &mut tauri::App<R>) -> tauri::Result<()> {
    let show  = MenuItem::with_id(app, "show",  "Show ROK Companion", true, None::<&str>)?;
    let sep   = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit  = MenuItem::with_id(app, "quit",  "Quit",               true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &sep, &quit])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        // Template icon for macOS dark/light mode support.
        // Replace with your own 22×22 PNG if desired.
        .icon(app.default_window_icon().cloned().unwrap_or(
            tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
                .expect("Failed to load tray icon"),
        ))
        .icon_as_template(true)
        .tooltip("ROK Companion — monitoring clipboard")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Single-click the menu bar icon → show/toggle the window
            if let TrayIconEvent::Click {
                button:       MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
