//! SPIKE-001 experimental SAP runtime layer (Path A — Tauri WebView).
//!
//! Hosts SAP RFUI in a dedicated, controlled WebView window and exposes a
//! minimal command surface to the front end:
//!
//! - `spike_open` / `spike_close` / `spike_reload` / `spike_is_open`
//! - `spike_eval`       — run an adapter-authored script inside the page
//! - `spike_send_key`   — OS-level (SendInput) key injection into the runtime window
//! - `spike_screenshot` — WebView2 `CapturePreview` of the SAP content area
//!
//! Everything SAP/WebView-specific (DOM access, injection, result transport)
//! stays inside this module; React never touches it directly (ADR-001 Rules 1/7).
//!
//! Result transport: `wry`/Tauri `eval_with_callback` (WebView2
//! `ExecuteScriptAsync` completion handler). Because Windows silently drops
//! uncaught exceptions, the harness catches errors inside the page and returns
//! a normalized `{status,data|code,message}` envelope. The adapter script runs
//! directly (no `eval`) and its result is parked on `window.__spikeResults[nonce]`
//! for a short poll, which also carries promise results.
//!
//! SECURITY NOTE (deliberate, spike-scoped): `spike_eval` executes JavaScript
//! that originates **only** from static, bundled adapter scripts in
//! `src/adapters/sap-scripts.ts` — never from user input, SAP responses or
//! logs (SPIKE-001: SAP output is data, not instructions). The injection is
//! host-level (native `ExecuteScript`) and therefore runs regardless of page
//! CSP — a capability SPIKE-001 records explicitly as evidence.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use tauri::webview::PlatformWebview;
use tauri::webview::WebviewWindowBuilder;
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow};

/// Environment variable read by WebView2 when it creates a browser environment.
const BROWSER_ARGS_ENV: &str = "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS";

/// Label of the controlled SAP runtime window.
pub const SAP_WINDOW_LABEL: &str = "sap-spike";

static NONCE: AtomicU64 = AtomicU64::new(0);

const POLL_INTERVAL: Duration = Duration::from_millis(60);

fn next_nonce() -> u64 {
    NONCE.fetch_add(1, Ordering::SeqCst) + 1
}

fn b64_decode(value: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(value)
        .map_err(|e| format!("script source is not valid base64: {e}"))
}

/// Kick-off script.
///
/// The adapter source is executed **directly** — no `eval()`/`atob()` round trip.
/// SPIKE-001 measured that an `eval(atob(..))` bridge produced no result at all on
/// a page whose CSP is `script-src 'self'`, while the same window could still
/// capture pixels; executing the bundled source removes the `'unsafe-eval'`
/// dependency and keeps the invariant that only static adapter scripts ever run in
/// the page (SAP output stays data, never code).
///
/// The result is parked as JSON on `window.__spikeResults[nonce]`: immediately for
/// a synchronous script, otherwise when its promise settles.
fn build_kick_script(nonce: u64, source: &str) -> String {
    format!(
        "(function(){{\
window.__spikeResults=window.__spikeResults||{{}};\
var __n={nonce};\
function __park(env){{\
window.__spikeResults[__n]=JSON.stringify(env);\
Object.keys(window.__spikeResults).forEach(function(k){{if(+k<__n-8)delete window.__spikeResults[k];}});\
}}\
function __fail(e){{\
__park({{status:'error',code:String((e&&e.name)||'script-failed'),message:String((e&&(e.message||e))||'unknown')}});\
}}\
try{{\
var __r=({source});\
if(__r&&typeof __r.then==='function'){{\
__r.then(function(v){{__park({{status:'ok',data:v===undefined?null:v}});}},__fail);\
return 'pending';\
}}\
__park({{status:'ok',data:__r===undefined?null:__r}});\
return 'sync';\
}}catch(e){{\
__fail(e);\
return 'sync-error';\
}}\
}})()"
    )
}

fn build_poll_script(nonce: u64) -> String {
    // The parked payload is already a JSON string; returning it as-is lets
    // WebView2 add exactly one serialization layer (see `decode_callback_result`).
    format!("(window.__spikeResults&&window.__spikeResults[{nonce}])||null")
}

#[derive(serde::Deserialize)]
struct EvalEnvelope {
    status: String,
    #[serde(default)]
    data: Option<serde_json::Value>,
    #[serde(default)]
    code: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

fn decode_callback_result(raw: &str) -> Option<Result<serde_json::Value, String>> {
    // `ExecuteScriptAsync` serializes the evaluated value once, and the page-side
    // payload is itself a JSON string — so layers must be peeled until the object
    // is visible. Measured behaviour: a single `from_str::<String>` unwrap left
    // every real result unparsable, which surfaced as a bogus `webview-timeout`.
    let mut text = raw.trim().to_string();
    for _ in 0..3 {
        if text.starts_with('{') {
            break;
        }
        if text == "null" {
            return None;
        }
        text = serde_json::from_str::<String>(&text).ok()?;
    }
    let envelope: EvalEnvelope = serde_json::from_str(&text)
        .map_err(|e| format!("script-failed: unparsable eval envelope: {e}"))
        .ok()?;
    Some(match envelope.status.as_str() {
        "ok" => Ok(envelope.data.unwrap_or(serde_json::Value::Null)),
        _ => Err(format!(
            "script-failed: {}: {}",
            envelope.code.unwrap_or_else(|| "script-failed".into()),
            envelope.message.unwrap_or_else(|| "script reported an error".into())
        )),
    })
}

/// Runs one script through the WebView2 completion channel.
fn eval_sync<R: Runtime>(
    window: &WebviewWindow<R>,
    js: &str,
    timeout_ms: u64,
) -> Result<String, String> {
    let (tx, rx) = mpsc::channel::<Result<String, String>>();
    window
        .eval_with_callback(js.to_string(), move |result| {
            let _ = tx.send(Ok(result));
        })
        .map_err(|e| format!("webview-error: native eval injection failed: {e}"))?;
    rx.recv_timeout(Duration::from_millis(timeout_ms.max(500)))
        .map_err(|_| format!("webview-timeout: no eval callback within {timeout_ms} ms"))?
}

fn eval_await<R: Runtime>(
    window: &WebviewWindow<R>,
    nonce: u64,
    source: &str,
    timeout_ms: u64,
) -> Result<serde_json::Value, String> {
    // SPIKE-001 diagnostics: stdout of `tauri dev` is part of the evidence trail,
    // so every eval round-trip is traced (values are truncated, never page dumps).
    let kick_raw = eval_sync(window, &build_kick_script(nonce, source), 5_000)?;
    eprintln!(
        "[spike-eval] nonce={nonce} kick-callback={} script-head={}",
        truncate(&kick_raw, 96),
        truncate(source.trim_start(), 72)
    );

    let started = Instant::now();
    let guard = Duration::from_millis(timeout_ms.max(1_000));
    let poll = build_poll_script(nonce);

    let mut polls = 0_u32;
    loop {
        let raw = eval_sync(window, &poll, 5_000)?;
        polls += 1;
        let outcome = decode_callback_result(&raw);
        if outcome.is_some() || polls <= 2 || polls.is_power_of_two() {
            eprintln!(
                "[spike-eval] nonce={nonce} poll#{polls} after={}ms raw={}",
                started.elapsed().as_millis(),
                truncate(&raw, 160)
            );
        }
        if let Some(resolved) = outcome {
            return resolved;
        }
        if started.elapsed() > guard {
            return Err(format!(
                "webview-timeout: eval result not produced within {} ms (nonce {nonce})",
                timeout_ms.max(1_000)
            ));
        }
        std::thread::sleep(POLL_INTERVAL);
    }
}

fn truncate(value: &str, max_chars: usize) -> String {
    let flat: String = value.chars().take(max_chars).collect();
    if value.chars().count() > max_chars {
        format!("{flat}…")
    } else {
        flat
    }
}

fn validate_url(raw: &str) -> Result<(), String> {
    if raw.trim().is_empty() {
        return Err("invalid-url: URL is empty".into());
    }
    let parsed = url::Url::parse(raw).map_err(|e| format!("invalid-url: {e}"))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(format!(
            "invalid-url: unsupported scheme '{}'",
            parsed.scheme()
        ));
    }
    if parsed.host_str().is_none() {
        return Err("invalid-url: missing host".into());
    }
    Ok(())
}

fn spike_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(SAP_WINDOW_LABEL)
}

/// Measured SPIKE-001 finding (network root-cause, A/B verified on the real
/// EWT service):
///
/// 1. This machine has a user proxy configured (`ProxyEnable=1`,
///    `ProxyServer=127.0.0.1:10819`) with a bypass list of private-address
///    patterns. Chromium evaluates those patterns against the host **name**, so
///    `172.17.*` never matches `sapewt.<internal-domain>` even when the name
///    resolves to a bypassed address — the SAP request is handed to the proxy.
/// 2. The proxy does not serve plain HTTP absolute-URI requests (a raw probe to
///    it never answers), and the webview rendered
///    `chrome-error://chromewebdata/` + `HTTP ERROR 503`, while a direct socket
///    to the same URL answers `200`.
/// 3. `--proxy-bypass-list` is only honoured by Chromium **together with**
///    `--proxy-server`; passing the bypass argument alone changed nothing.
///
/// So the controlled window has to declare the proxy policy explicitly: keep the
/// operator's proxy for everything else, and route the SAP origin around it.
/// WebView2 reads `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` when it creates the
/// browser environment for a user-data folder; the controlled window uses its own
/// folder, so the policy is applied just before the window is built. An
/// operator-set `--proxy-server` always wins.
fn apply_proxy_bypass(parsed: &tauri::Url) -> (String, String) {
    let host = parsed.host_str().unwrap_or_default();
    let bypass = match parsed.port() {
        Some(port) => format!("{host}:{port}"),
        None => host.to_string(),
    };

    let fallback = format!("--proxy-bypass-list={bypass}");
    let configured = std::env::var(BROWSER_ARGS_ENV).unwrap_or_default();
    let final_args = if configured.contains("--proxy-server") {
        configured
    } else {
        let policy = system_proxy_args(&bypass).unwrap_or(fallback);
        let base = configured.trim();
        if base.is_empty() {
            policy
        } else {
            format!("{base} {policy}")
        }
    };
    std::env::set_var(BROWSER_ARGS_ENV, &final_args);
    (bypass, final_args)
}

/// Builds the explicit proxy arguments from the Windows user proxy settings.
/// Falls back to a bypass-only declaration when the registry cannot be read,
/// which keeps the behaviour on other platforms unchanged.
fn system_proxy_args(sap_bypass: &str) -> Option<String> {
    let settings = read_internet_settings()?;
    if !settings.enabled {
        return Some(format!("--proxy-server=direct:// --proxy-bypass-list={sap_bypass}"));
    }
    let server = settings.server?;
    let mut bypass = format!("{sap_bypass}");
    for entry in settings.override_list.split(';') {
        let entry = entry.trim();
        if entry.is_empty() || entry.eq_ignore_ascii_case("<local>") || bypass.contains(entry) {
            continue;
        }
        bypass.push(';');
        bypass.push_str(entry);
    }
    Some(format!(
        "--proxy-server={server} --proxy-bypass-list={bypass}"
    ))
}

struct ProxySettings {
    enabled: bool,
    server: Option<String>,
    override_list: String,
}

/// Reads `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`.
/// Only the three proxy-policy values are parsed; no credential is ever present
/// in this key (Windows stores proxy credentials separately).
fn read_internet_settings() -> Option<ProxySettings> {
    #[cfg(windows)]
    let output = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("reg")
            .args([
                "query",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            ])
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
            .output()
            .ok()
    };
    #[cfg(not(windows))]
    let output: Option<std::process::Output> = None;

    let text = String::from_utf8_lossy(&output?.stdout).to_string();
    let value = |name: &str| {
        text.lines()
            .map(str::trim)
            .find(|line| line.starts_with(name))
            .and_then(|line| line.split_whitespace().last())
            .map(str::to_string)
    };
    Some(ProxySettings {
        enabled: value("ProxyEnable").map(|v| v != "0x0").unwrap_or(false),
        server: value("ProxyServer"),
        override_list: value("ProxyOverride").unwrap_or_default(),
    })
}

#[tauri::command]
pub async fn spike_open(
    app: AppHandle,
    url: String,
    width: Option<u32>,
    height: Option<u32>,
    persistent: Option<bool>,
) -> Result<serde_json::Value, String> {
    validate_url(&url)?;

    let parsed: tauri::Url = url.parse().map_err(|e| format!("invalid-url: {e}"))?;

    // Re-running an experiment must not fail because a controlled window from an
    // earlier run is still registered under the same label: close it and wait for
    // the label to disappear before building a fresh one.
    let reused_after_close = if let Some(existing) = spike_window(&app) {
        let _ = existing.close();
        let settle = Instant::now() + Duration::from_millis(3_000);
        while spike_window(&app).is_some() && Instant::now() < settle {
            std::thread::sleep(Duration::from_millis(50));
        }
        true
    } else {
        false
    };

    let (proxy_bypass, browser_args) = apply_proxy_bypass(&parsed);
    // Evidence trail for `tauri dev` stdout: host names only, never credentials.
    eprintln!(
        "[spike-open] url-host={} bypass={proxy_bypass} replacedExistingWindow={reused_after_close} browserArgs={browser_args}",
        parsed.host_str().unwrap_or_default()
    );

    let persistent = persistent.unwrap_or(true);
    let data_dir = if persistent {
        Some(
            app.path()
                .app_data_dir()
                .map_err(|e| format!("webview-error: cannot resolve app data dir: {e}"))?
                .join("sap-spike-webview"),
        )
    } else {
        None
    };

    let events_window = app
        .get_webview_window("main")
        .ok_or("webview-error: main window is missing")?;

    let mut builder =
        WebviewWindowBuilder::new(&app, SAP_WINDOW_LABEL, tauri::WebviewUrl::External(parsed))
            .title("SAP RFUI — controlled runtime (SPIKE-001)")
            .inner_size(
                f64::from(width.unwrap_or(560)),
                f64::from(height.unwrap_or(820)),
            )
            .decorations(true)
            .resizable(true)
            .visible(true)
            .on_page_load(move |win, payload| {
                let _ = events_window.emit(
                    "spike://navigation",
                    serde_json::json!({
                        "url": payload.url().to_string(),
                        "event": format!("{:?}", payload.event()),
                        "label": win.label(),
                    }),
                );
            });

    if let Some(dir) = data_dir {
        builder = builder.data_directory(dir);
    }

    let window = builder
        .build()
        .map_err(|e| format!("webview-error: cannot create SAP runtime window: {e}"))?;

    Ok(serde_json::json!({
        "label": window.label(),
        "persistentSession": persistent,
        "replacedExistingWindow": reused_after_close,
        "proxyBypass": proxy_bypass,
        "browserArgs": browser_args,
        "createdUtc": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0),
    }))
}

#[tauri::command]
pub fn spike_is_open(app: AppHandle) -> Result<serde_json::Value, String> {
    match spike_window(&app) {
        None => Ok(serde_json::json!({ "opened": false, "url": null, "title": null })),
        Some(window) => Ok(serde_json::json!({
            "opened": true,
            "url": window.url().map(|u| u.to_string()).ok(),
            "title": window.title().ok(),
        })),
    }
}

#[tauri::command]
pub async fn spike_close(app: AppHandle) -> Result<bool, String> {
    match spike_window(&app) {
        None => Ok(false),
        Some(window) => {
            window.close().map_err(|e| format!("webview-error: {e}"))?;
            Ok(true)
        }
    }
}

#[tauri::command]
pub async fn spike_reload(app: AppHandle) -> Result<serde_json::Value, String> {
    let window = spike_window(&app).ok_or("webview-error: SAP runtime window is not open")?;
    window
        .reload()
        .map_err(|e| format!("webview-error: reload failed: {e}"))?;
    Ok(serde_json::json!({
        "url": window.url().map(|u| u.to_string()).ok(),
    }))
}

/// Virtual-key code for the RFUI keys the SapPort allows.
fn virtual_key(key: &str) -> Result<u16, String> {
    let normalized = key.trim();
    let code = match normalized {
        "Enter" => 0x0D,
        "Escape" => 0x1B,
        other if other.len() > 1 && other.starts_with('F') => {
            let index: u16 = other[1..]
                .parse()
                .map_err(|_| format!("webview-error: unsupported key '{other}'"))?;
            if !(1..=12).contains(&index) {
                return Err(format!("webview-error: unsupported key '{other}'"));
            }
            0x70 + index - 1
        }
        other => return Err(format!("webview-error: unsupported key '{other}'")),
    };
    Ok(code)
}

/// Injects one real keystroke (press + release) into the foreground window.
#[cfg(windows)]
fn inject_key(code: u16) -> Result<u32, String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VIRTUAL_KEY,
    };

    let key = |flags: KEYBD_EVENT_FLAGS| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(code),
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let units = [key(KEYBD_EVENT_FLAGS(0)), key(KEYEVENTF_KEYUP)];

    // SAFETY: `units` is a correctly sized, fully initialised INPUT array and the
    // element size is passed explicitly, which is the documented contract.
    let sent = unsafe { SendInput(&units, core::mem::size_of::<INPUT>() as i32) };
    if sent as usize == units.len() {
        Ok(sent)
    } else {
        Err(format!(
            "webview-error: SendInput accepted {sent}/{} key events (blocked by the desktop? UPI?)",
            units.len()
        ))
    }
}

#[cfg(not(windows))]
fn inject_key(_code: u16) -> Result<u32, String> {
    Err("webview-error: native key injection is implemented for Windows only".into())
}

/// SPIKE-001 EXP-006/EXP-007: deliver a key the way a real HID scanner does.
///
/// Measured: a page-context synthetic `KeyboardEvent` reaches the DOM but SAP ITS
/// Mobile does not act on it (screen signature unchanged, no handler consumed it),
/// so the spike also exercises `SendInput`, which produces a *trusted* event in
/// WebView2. The window is focused first and the command waits on that condition
/// instead of sleeping blindly (ADR-001 Rule 8).
#[tauri::command]
pub fn spike_send_key(app: AppHandle, key: String) -> Result<serde_json::Value, String> {
    let window = spike_window(&app).ok_or("webview-error: SAP runtime window is not open")?;
    let code = virtual_key(&key)?;

    window
        .set_focus()
        .map_err(|e| format!("webview-error: cannot focus SAP runtime window: {e}"))?;
    let settling = Instant::now();
    let deadline = settling + Duration::from_millis(1_500);
    let mut focused = window.is_focused().unwrap_or(false);
    while !focused && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(25));
        focused = window.is_focused().unwrap_or(false);
    }

    let injected = inject_key(code)?;
    eprintln!(
        "[spike-key] key={key} vk=0x{code:02X} focused={focused} focusWaitMs={} units={injected}",
        settling.elapsed().as_millis()
    );

    Ok(serde_json::json!({
        "method": "SendInput",
        "key": key,
        "keyCode": code,
        "focused": focused,
        "focusWaitMs": settling.elapsed().as_millis() as u64,
        "inputUnits": injected,
    }))
}

#[tauri::command]
pub async fn spike_eval(
    app: AppHandle,
    source_b64: String,
    timeout_ms: Option<u64>,
) -> Result<serde_json::Value, String> {
    let window = spike_window(&app).ok_or("webview-error: SAP runtime window is not open")?;
    let source = String::from_utf8(b64_decode(&source_b64)?)
        .map_err(|e| format!("script-failed: script source is not valid utf-8: {e}"))?;
    let nonce = next_nonce();
    eval_await(&window, nonce, &source, timeout_ms.unwrap_or(15_000))
}

#[tauri::command]
pub async fn spike_screenshot(
    app: AppHandle,
    name: Option<String>,
) -> Result<serde_json::Value, String> {
    let window = spike_window(&app).ok_or("webview-error: SAP runtime window is not open")?;

    let (tx, rx) = mpsc::channel::<Result<Vec<u8>, String>>();
    capture_preview(&window, tx);

    let png = rx
        .recv_timeout(Duration::from_secs(15))
        .map_err(|_| "webview-timeout: CapturePreview produced no image within 15 s")??;

    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("webview-error: cache dir unavailable: {e}"))?
        .join("spike-evidence");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("webview-error: cannot create evidence dir: {e}"))?;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let safe_name: String = name
        .unwrap_or_else(|| "screenshot".into())
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let file = dir.join(format!("{safe_name}-{stamp}.png"));
    std::fs::write(&file, &png).map_err(|e| format!("webview-error: cannot write screenshot: {e}"))?;

    let (width, height) = png_dimensions(&png).unwrap_or((0, 0));
    Ok(serde_json::json!({
        "path": file.to_string_lossy(),
        "width": width,
        "height": height,
        "bytes": png.len(),
    }))
}

fn png_dimensions(png: &[u8]) -> Option<(u32, u32)> {
    if png.len() < 24 || &png[0..8] != b"\x89PNG\r\n\x1a\n" {
        return None;
    }
    let width = u32::from_be_bytes([png[16], png[17], png[18], png[19]]);
    let height = u32::from_be_bytes([png[20], png[21], png[22], png[23]]);
    Some((width, height))
}

/// Platform dispatch for the webview content capture.
fn capture_preview<R: Runtime>(
    window: &WebviewWindow<R>,
    tx: mpsc::Sender<Result<Vec<u8>, String>>,
) {
    #[cfg(windows)]
    {
        let sender = tx.clone();
        let _ = window.with_webview(move |webview: PlatformWebview| {
            windows_capture(webview, sender);
        });
    }
    #[cfg(not(windows))]
    {
        let _ = (window, tx);
        let _ = tx.send(Err(
            "webview-error: content capture is implemented for the Windows WebView2 runtime only"
                .into(),
        ));
    }
}

/// WebView2 `CapturePreview` — PNG of the SAP content area (no chrome, no OS UI).
#[cfg(windows)]
fn windows_capture(webview: PlatformWebview, tx: mpsc::Sender<Result<Vec<u8>, String>>) {
    use webview2_com::CapturePreviewCompletedHandler;
    use webview2_com::Microsoft::Web::WebView2::Win32::COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG;
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2;
    use windows::core::Result as WindowsResult;
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::Com::IStream;
    use windows::Win32::System::Com::StructuredStorage::CreateStreamOnHGlobal;
    use windows::Win32::System::Com::StructuredStorage::GetHGlobalFromStream;
    use windows::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};

    let notify = |message: String| {
        let _ = tx.send(Err(message));
    };

    let controller = webview.controller();
    let core: ICoreWebView2 = match unsafe { controller.CoreWebView2() } {
        Ok(core) => core,
        Err(e) => return notify(format!("webview-error: CoreWebView2 unavailable: {e}")),
    };

    let stream: IStream = match unsafe { CreateStreamOnHGlobal(HGLOBAL::default(), true) } {
        Ok(stream) => stream,
        Err(e) => return notify(format!("webview-error: cannot create capture stream: {e}")),
    };

    let stream_for_handler = stream.clone();
    let tx_for_handler = tx.clone();
    let handler = CapturePreviewCompletedHandler::create(Box::new(move |result: WindowsResult<()>| {
        if let Err(e) = result {
            let _ = tx_for_handler.send(Err(format!("webview-error: CapturePreview failed: {e}")));
            return Ok(());
        }
        let snapshot = (|| -> Result<Vec<u8>, String> {
            let hglobal = unsafe { GetHGlobalFromStream(&stream_for_handler) }
                .map_err(|e| format!("webview-error: cannot read capture memory: {e}"))?;
            let size = unsafe { GlobalSize(hglobal) };
            if size == 0 {
                return Err("webview-error: capture produced an empty image".into());
            }
            let ptr = unsafe { GlobalLock(hglobal) };
            if ptr.is_null() {
                return Err("webview-error: capture memory could not be locked".into());
            }
            let bytes = unsafe { std::slice::from_raw_parts(ptr as *const u8, size) }.to_vec();
            let _ = unsafe { GlobalUnlock(hglobal) };
            Ok(bytes)
        })();
        let _ = tx_for_handler.send(snapshot);
        Ok(())
    }));

    if let Err(e) = unsafe {
        core.CapturePreview(
            COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
            &stream,
            Some(&handler),
        )
    } {
        notify(format!("webview-error: CapturePreview could not start: {e}"));
    }
}
