// Prevents an extra console window on Windows in release builds.
// This attribute is required by the Tauri Windows toolchain — do not remove.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    sap_rfui_test_studio_lib::run();
}
