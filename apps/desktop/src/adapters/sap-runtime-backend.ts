/**
 * Thin typed bridge to the SPIKE-001 native runtime commands
 * (`apps/desktop/src-tauri/src/spike_runtime.rs`).
 *
 * This is the only TS module that knows command names and raw shapes; the
 * ExperimentalSapAdapter translates its results into the SapPort contract.
 * Raw invoke errors are normalized into SapError here — nothing above this
 * file sees Tauri internals (ADR-001 Rule 7).
 */

import { invoke } from "@tauri-apps/api/core";
import type { SapError, SapPortErrorCode } from "@sap-rfui/ports";
import { isCertificateFailureMessage } from "@sap-rfui/ports";

export interface OpenInfo {
  readonly label: string;
  readonly persistentSession: boolean;
  readonly createdUtc: number;
  readonly replacedExistingWindow?: boolean;
  readonly proxyBypass?: string;
  readonly browserArgs?: string;
}

/** Result of the native (SendInput) key injection used by EXP-006/EXP-007. */
export interface NativeKeyInfo {
  readonly method: string;
  readonly key: string;
  readonly keyCode: number;
  readonly focused: boolean;
  readonly focusWaitMs: number;
  readonly inputUnits: number;
}

export interface IsOpenInfo {
  readonly opened: boolean;
  readonly url: string | null;
  readonly title: string | null;
}

export interface ScreenshotInfo {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly bytes?: number;
}

/** True when the app is running inside a Tauri window (not vite-dev in a plain browser). */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Classifies a rejection coming from the native layer into the normalized
 * error model (SPIKE-001 EXP-011, ADR-001 Rule 14).
 */
export function normalizeSapError(cause: unknown): SapError {
  const raw =
    cause instanceof Error
      ? `${cause.name}: ${cause.message}`
      : typeof cause === "string"
        ? cause
        : JSON.stringify(cause ?? null);
  const message = raw.slice(0, 400);

  const known: SapPortErrorCode[] = [
    "invalid-url",
    "sap-unavailable",
    "auth-required",
    "service-unavailable",
    "certificate-error",
    "webview-error",
    "webview-timeout",
    "script-failed",
  ];
  const lower = message.toLowerCase();
  for (const code of known) {
    if (lower.startsWith(code) || lower.includes(`${code}:`)) {
      return { category: code, message };
    }
  }
  if (isCertificateFailureMessage(message)) {
    return { category: "certificate-error", message };
  }
  if (/window is not open|not created/.test(lower)) {
    return { category: "webview-error", message };
  }
  return { category: "unknown", message };
}

export interface SpikeBackend {
  open(
    url: string,
    options?: { width?: number; height?: number; persistent?: boolean },
  ): Promise<OpenInfo>;
  isOpen(): Promise<IsOpenInfo>;
  close(): Promise<boolean>;
  reload(): Promise<{ url?: string | null }>;
  eval(sourceB64: string, timeoutMs?: number): Promise<unknown>;
  sendKey(key: string): Promise<NativeKeyInfo>;
  screenshot(name?: string): Promise<ScreenshotInfo>;
}

/** Production (runtime) backend: talks to the Rust spike_runtime commands. */
export function createNativeBackend(): SpikeBackend {
  return {
    async open(url, options = {}) {
      return invoke<OpenInfo>("spike_open", {
        url,
        width: options.width,
        height: options.height,
        persistent: options.persistent,
      });
    },
    async isOpen() {
      return invoke<IsOpenInfo>("spike_is_open");
    },
    async close() {
      return invoke<boolean>("spike_close");
    },
    async reload() {
      return invoke<{ url?: string | null }>("spike_reload");
    },
    async eval(sourceB64, timeoutMs) {
      return invoke<unknown>("spike_eval", { sourceB64, timeoutMs });
    },
    async sendKey(key) {
      return invoke<NativeKeyInfo>("spike_send_key", { key });
    },
    async screenshot(name) {
      return invoke<ScreenshotInfo>("spike_screenshot", { name });
    },
  };
}
