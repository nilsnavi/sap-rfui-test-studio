//! Tauri shell for SAP RFUI Test Studio.
//!
//! Product behaviour lives in the TypeScript layers (`domain`, `application`,
//! `ports`); the Rust side is a thin window host plus one experimental native
//! module — `spike_runtime` — which backs SPIKE-001 (controlled SAP RFUI
//! WebView, Path A). Device emulation, recording and replay stay in the
//! front end.

use tauri::Manager;

mod spike_runtime;

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
        .invoke_handler(tauri::generate_handler![
            spike_runtime::spike_open,
            spike_runtime::spike_is_open,
            spike_runtime::spike_close,
            spike_runtime::spike_reload,
            spike_runtime::spike_eval,
            spike_runtime::spike_send_key,
            spike_runtime::spike_screenshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SAP RFUI Test Studio");
}
