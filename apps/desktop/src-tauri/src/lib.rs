//! Minimal Tauri shell for SAP RFUI Test Studio.
//!
//! Deliberately empty of business logic: the foundation build (PROMPT-001)
//! keeps every rule inside the TypeScript layers (`domain`, `application`,
//! `ports`) so the Rust side is only a window host. Device emulation, SAP
//! WebView hosting, recording and replay arrive in later sprints and will add
//! native capabilities here one at a time.

use tauri::Manager;

/// Crate version, taken from `Cargo.toml` and therefore always in sync with
/// `tauri.conf.json` during a release bump.
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // The window itself is declared declaratively in `tauri.conf.json`;
            // startup only asserts that the front end has a host to render into.
            let window = app
                .get_webview_window("main")
                .ok_or_else(|| std::io::Error::other("the `main` webview window is not defined"))?;

            let _ = window.title();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SAP RFUI Test Studio");
}
