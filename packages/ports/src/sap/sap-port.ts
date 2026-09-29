/**
 * SapPort — contract for a controlled SAP RFUI runtime (SPIKE-001, ADR-001 §3 Ports).
 *
 * This is deliberately a *spike-grade* port: it exposes only what SPIKE-001 has
 * to prove (open/auth/injection/key delivery/screen reading/screenshot/navigation
 * /normalized errors). It is not the production SAP API and must not grow
 * Recorder/Replay/Assertion concerns.
 *
 * Security constraints that are part of the contract itself:
 * - implementations must never return or accept passwords, tokens or cookie
 *   values (see `SapFieldSnapshot.masked`, `SapSessionState.cookiesAccessible`);
 * - every failure is reported as a normalized `SapErrorCategory`, never as a
 *   raw WebView/transport exception;
 * - waiting is condition-based; the `timeoutMs` arguments are guards only
 *   (ADR-001 Rule 8).
 */

export type SapPortErrorCode =
  | "invalid-url"
  | "sap-unavailable"
  | "auth-required"
  | "service-unavailable"
  | "certificate-error"
  | "webview-error"
  | "webview-timeout"
  | "script-failed"
  | "unknown";

/** Normalized error categories required by SPIKE-001 §EXP-011 / ADR-001 Rule 14. */
export interface SapError {
  readonly category: SapPortErrorCode;
  /** Human-readable detail; implementations must redact secrets before producing it. */
  readonly message: string;
  /** Adapter-specific technical detail (never credentials, never raw cookies). */
  readonly detail?: string;
}

/** Spike-local result union; Ports must not depend on upper layers (ADR-001 §4). */
export type SapResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: SapError };

export function sapOk<T>(value: T): SapResult<T> {
  return { ok: true, value };
}

export function sapErr<T>(error: SapError): SapResult<T> {
  return { ok: false, error };
}

/** True when the message looks like a transport/certificate failure (used by adapters). */
export function isCertificateFailureMessage(message: string): boolean {
  return /ssl|tls|certificate|cert\b|err_cert/i.test(message);
}

export type SapKey =
  | "Enter"
  | "Escape"
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12";

export interface SapOpenOptions {
  readonly width?: number;
  readonly height?: number;
  /** Persist the cookie/session store of the controlled runtime across app restarts. */
  readonly persistentSession?: boolean;
}

export type SapAuthState = "unknown" | "login-form" | "authenticated" | "unauthenticated";

/**
 * Observation of one nested frame of the SAP page. SPIKE-001 needs it to record
 * real iframe/frame accessibility (same-origin restrictions), not assumptions.
 */
export interface SapFrameSnapshot {
  readonly tag: string;
  readonly src: string;
  /** False when the frame document is blocked by the browser origin rules. */
  readonly accessible: boolean;
}

export interface SapSessionState {
  readonly opened: boolean;
  /** Current URL of the controlled runtime; may be null before the first navigation. */
  readonly url: string | null;
  readonly authState: SapAuthState;
  readonly readyState?: string;
  /** Contract forbids cookie *values*; only accessibility is observable. */
  readonly cookiesAccessible: boolean;
  readonly frameCount: number;
  readonly frames: SapFrameSnapshot[];
}

/** Minimal metadata about the currently focused input (SPIKE-001 EXP-004). */
export interface SapActiveField {
  readonly present: boolean;
  readonly id?: string;
  readonly name?: string;
  readonly tagName?: string;
  readonly inputType?: string;
  readonly frameIndex: number;
  readonly valuePresent: boolean;
  readonly valueLength: number;
  /** True for masked inputs — their values are never exposed through this port. */
  readonly masked: boolean;
}

export interface SapFieldSnapshot {
  readonly id?: string;
  readonly name?: string;
  readonly tagName: string;
  readonly inputType?: string;
  /** Empty string for masked (password) fields — never a password value. */
  readonly value: string;
  readonly masked: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly frameIndex: number;
}

export interface SapControlSnapshot {
  readonly kind: "button" | "link" | "label";
  readonly text: string;
  readonly id?: string;
  readonly name?: string;
  readonly frameIndex: number;
}

/** Normalized screen snapshot (SPIKE-001 EXP-008, ADR-001 Rule 6). */
export interface SapScreenState {
  readonly url?: string;
  readonly origin?: string;
  readonly title?: string;
  readonly texts: string[];
  readonly fields: SapFieldSnapshot[];
  readonly buttons: SapControlSnapshot[];
  /** Stable content signature used for condition-based change detection. */
  readonly signature: string;
  readonly frameCount: number;
  readonly frames: SapFrameSnapshot[];
}

export interface SapInjectionReceipt {
  readonly applied: boolean;
  readonly inputEvents: number;
  readonly changeEvents: number;
  readonly valueLengthAfter: number;
  readonly frameIndex: number;
  readonly elementId?: string;
}

export interface SapKeyDeliveryReceipt {
  readonly delivered: boolean;
  readonly key: SapKey;
  readonly target?: string;
  /**
   * Channel that was used. `sendInput` injects a real OS-level keystroke (the way
   * an HID scanner does), which WebView2 delivers as a *trusted* event;
   * `synthetic-dom` dispatches KeyboardEvents from page context.
   */
  readonly method: "sendInput" | "synthetic-dom";
  /** True when the delivery came from page-context synthetic KeyboardEvents. */
  readonly synthetic: boolean;
  readonly frameIndex: number;
  readonly dispatchedEvents: number;
  /** keydown events the page counted with `isTrusted === true`. */
  readonly trustedEvents: number;
  /** True when a SAP handler consumed the event — evidence of real handling. */
  readonly defaultPrevented: boolean;
  /** Redacted channel diagnostics (e.g. why the native path fell back). */
  readonly detail?: string;
}

/** Runtime/page identity observed from inside the controlled webview. */
export interface SapRuntimeInfo {
  readonly url: string;
  readonly origin: string;
  readonly title: string;
  readonly readyState: string;
  readonly frameCount: number;
  readonly frames: SapFrameSnapshot[];
  readonly userAgent: string;
  readonly hasRfuiMarkers: boolean;
  readonly cspMeta: string | null;
  readonly domReadable: boolean;
  readonly domWritable: boolean;
}

/** DOM-mutation navigation watch (EXP-009 condition-based detection). */
export interface SapNavigationWatch {
  readonly installed: boolean;
  readonly mutations: number;
  readonly url: string;
  readonly title: string;
  readonly error?: string;
}

export interface ScreenshotReceipt {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly bytes?: number;
}

export interface SapScreenChange {
  readonly changed: boolean;
  readonly waitedMs: number;
  readonly signatureBefore: string;
  readonly signatureAfter: string;
}

/** HTTP-level probe result used for error categorization and CSP/header evidence. */
export interface SapProbeResult {
  readonly reachable: boolean;
  readonly finalUrl?: string;
  readonly status?: number;
  readonly sameOrigin: boolean;
  readonly runtimeOrigin: string;
  readonly headers?: Record<string, string>;
  readonly metaHeaders?: Record<string, string>;
  readonly markers: string[];
  readonly errorCategory?: SapPortErrorCode;
  readonly errorMessage?: string;
}

export interface SapPort {
  /** Open the controlled runtime at a validated http(s) URL. */
  open(url: string, options?: SapOpenOptions): Promise<SapResult<void>>;
  isAvailable(): Promise<SapResult<boolean>>;
  close(): Promise<SapResult<boolean>>;
  reload(): Promise<SapResult<void>>;

  getSessionState(): Promise<SapResult<SapSessionState>>;
  getActiveField(): Promise<SapResult<SapActiveField | null>>;

  /** Scanner-equivalent text injection into the active field. */
  injectText(value: string): Promise<SapResult<SapInjectionReceipt>>;
  /** ENTER / function-key delivery to the active field. */
  sendKey(key: SapKey): Promise<SapResult<SapKeyDeliveryReceipt>>;

  readScreenState(): Promise<SapResult<SapScreenState>>;
  captureScreenshot(name?: string): Promise<SapResult<ScreenshotReceipt>>;

  /**
   * Condition-based wait for a screen signature change.
   * `timeoutMs` is a guard for the polling loop, not a sleep (ADR-001 Rule 8).
   */
  waitForScreenChange(
    baseline: SapScreenState,
    timeoutMs?: number,
  ): Promise<SapResult<SapScreenChange>>;

  /** Normalized reachability/behavior probe of an SAP URL from inside the runtime. */
  probe(url: string): Promise<SapResult<SapProbeResult>>;

  /** Runtime/page identity — used by the same-origin & CSP investigation. */
  readRuntimeInfo(): Promise<SapResult<SapRuntimeInfo>>;

  /** Installs the DOM-mutation watch used as a navigation signal (EXP-009). */
  installNavigationWatch(): Promise<SapResult<void>>;
  readNavigationWatch(): Promise<SapResult<SapNavigationWatch>>;
}
