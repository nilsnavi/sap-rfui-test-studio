/**
 * ExperimentalSapAdapter — SapPort implementation over the Tauri controlled
 * WebView runtime (SPIKE-001, Path A).
 *
 * Spike scope on purpose: no Recorder/Replay/Assertion concerns and no
 * production API design. All SAP/DOM/WebView specifics stay here and in
 * `src-tauri/src/spike_runtime.rs` (ADR-001 Rules 1 and 7); the adapter is wired
 * exclusively through the composition root.
 *
 * Every method returns `SapResult`: failures are normalized into a
 * `SapPortErrorCode` and never leak a raw WebView/transport exception
 * (ADR-001 Rule 14). Waiting is condition-based with a polling guard
 * (ADR-001 Rule 8).
 */

import type {
  SapActiveField,
  SapControlSnapshot,
  SapError,
  SapFieldSnapshot,
  SapFrameSnapshot,
  SapInjectionReceipt,
  SapKey,
  SapKeyDeliveryReceipt,
  SapNavigationWatch,
  SapOpenOptions,
  SapPort,
  SapProbeResult,
  SapResult,
  SapRuntimeInfo,
  SapScreenChange,
  SapScreenState,
  SapSessionState,
  ScreenshotReceipt,
} from "@sap-rfui/ports";
import { sapErr, sapOk } from "@sap-rfui/ports";

import { encodeScriptSource } from "./sap-base64";
import {
  activeFieldScript,
  buildInjectScript,
  capabilitiesScript,
  installMutationWatchScript,
  keyCountersScript,
  keyScript,
  keyWatchScript,
  probeScript,
  readMutationWatchScript,
  screenStateScript,
  sessionStateScript,
} from "./sap-scripts";
import {
  createNativeBackend,
  isTauriEnvironment,
  normalizeSapError,
  type ScreenshotInfo,
  type SpikeBackend,
} from "./sap-runtime-backend";

/** Guard for the condition-based screen-change poll — not a fixed sleep. */
const WAIT_POLL_INTERVAL_MS = 200;
const DEFAULT_WAIT_GUARD_MS = 30_000;
const EVAL_TIMEOUT_MS = 15_000;

type Json = Record<string, unknown>;

function asJson(value: unknown): Json {
  return typeof value === "object" && value !== null ? (value as Json) : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean {
  return value === true;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function frameList(value: unknown): SapFrameSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((raw) => {
    const f = asJson(raw);
    return {
      tag: str(f.tag) ?? "iframe",
      src: str(f.src) ?? "",
      accessible: bool(f.accessible),
    };
  });
}

/**
 * A backend-marker object (`{ __backend: <category> }`) is a script-authored
 * normalized failure, not SAP data — it is converted into a `SapError` here and
 * can never be confused with a screen payload.
 */
function isBackendFailure(value: unknown): value is { __backend: string; message?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { __backend?: unknown }).__backend === "string"
  );
}

function backendFailureToError(failure: { __backend: string; message?: unknown }): SapError {
  const message = typeof failure.message === "string" ? failure.message : "";
  return normalizeSapError(`${failure.__backend}: ${message}`);
}

export interface ExperimentalSapAdapterOptions {
  readonly backend?: SpikeBackend;
}

/** Page-side key counters observed by `keyWatchScript`/`keyCountersScript`. */
interface KeyCounters {
  readonly down: number;
  readonly up: number;
  readonly trusted: number;
  readonly prevented: number;
  readonly lastCode: string;
  readonly lastTarget: string;
  readonly lastFrame: number;
}

export class ExperimentalSapAdapter implements SapPort {
  private readonly backend: SpikeBackend;

  constructor(options: ExperimentalSapAdapterOptions = {}) {
    this.backend = options.backend ?? createNativeBackend();
  }

  /** The native runtime is only reachable from inside the Tauri window. */
  static isSupportedEnvironment(): boolean {
    return isTauriEnvironment();
  }

  async open(url: string, options: SapOpenOptions = {}): Promise<SapResult<void>> {
    const validated = validateHttpUrl(url);
    if (!validated.ok) {
      return sapErr<void>(validated.error);
    }
    try {
      await this.backend.open(url, {
        width: options.width,
        height: options.height,
        persistent: options.persistentSession ?? true,
      });
      return sapOk(undefined);
    } catch (cause) {
      return sapErr<void>(normalizeSapError(cause));
    }
  }

  async isAvailable(): Promise<SapResult<boolean>> {
    try {
      const info = await this.backend.isOpen();
      return sapOk(info.opened);
    } catch (cause) {
      return sapErr<boolean>(normalizeSapError(cause));
    }
  }

  async close(): Promise<SapResult<boolean>> {
    try {
      return sapOk(await this.backend.close());
    } catch (cause) {
      return sapErr<boolean>(normalizeSapError(cause));
    }
  }

  async reload(): Promise<SapResult<void>> {
    try {
      await this.backend.reload();
      return sapOk(undefined);
    } catch (cause) {
      return sapErr<void>(normalizeSapError(cause));
    }
  }

  async getSessionState(): Promise<SapResult<SapSessionState>> {
    let opened = false;
    let url: string | null = null;
    try {
      const info = await this.backend.isOpen();
      opened = info.opened;
      url = info.url;
    } catch (cause) {
      return sapErr<SapSessionState>(normalizeSapError(cause));
    }

    if (!opened) {
      return sapOk<SapSessionState>({
        opened: false,
        url: null,
        authState: "unknown",
        cookiesAccessible: false,
        frameCount: 0,
        frames: [],
      });
    }

    const evaluated = await this.evaluate(sessionStateScript);
    if (!evaluated.ok) {
      // Window exists but the page is navigating or not yet scriptable.
      return sapOk<SapSessionState>({
        opened: true,
        url,
        authState: "unknown",
        cookiesAccessible: false,
        frameCount: 0,
        frames: [],
      });
    }

    const data = asJson(evaluated.value);
    return sapOk<SapSessionState>({
      opened: true,
      url: str(data.url) ?? url,
      authState: normalizeAuthState(data.authState),
      readyState: str(data.readyState),
      cookiesAccessible: bool(data.cookiesAccessible),
      frameCount: num(data.frameCount) ?? 0,
      frames: frameList(data.frames),
    });
  }

  async getActiveField(): Promise<SapResult<SapActiveField | null>> {
    const evaluated = await this.evaluate(activeFieldScript);
    if (!evaluated.ok) {
      return sapErr<SapActiveField | null>(evaluated.error);
    }
    const data = asJson(evaluated.value);
    if (!bool(data.present)) {
      return sapOk<SapActiveField | null>(null);
    }
    return sapOk<SapActiveField | null>({
      present: true,
      id: str(data.id),
      name: str(data.name),
      tagName: str(data.tagName),
      inputType: str(data.inputType),
      frameIndex: num(data.frameIndex) ?? -1,
      valuePresent: bool(data.valuePresent),
      valueLength: num(data.valueLength) ?? 0,
      masked: bool(data.masked),
    });
  }

  async injectText(value: string): Promise<SapResult<SapInjectionReceipt>> {
    if (typeof value !== "string" || value.length === 0) {
      return sapErr<SapInjectionReceipt>({
        category: "script-failed",
        message: "injection value must be a non-empty string",
      });
    }
    const evaluated = await this.evaluate(buildInjectScript(value));
    if (!evaluated.ok) {
      return sapErr<SapInjectionReceipt>(evaluated.error);
    }
    const data = asJson(evaluated.value);
    const receipt: SapInjectionReceipt = {
      applied: bool(data.applied),
      inputEvents: num(data.inputEvents) ?? 0,
      changeEvents: num(data.changeEvents) ?? 0,
      valueLengthAfter: num(data.valueLengthAfter) ?? 0,
      frameIndex: num(data.frameIndex) ?? -1,
      elementId: str(data.elementId),
    };
    if (!receipt.applied) {
      return sapErr<SapInjectionReceipt>({
        category: "script-failed",
        message: `injection was not applied: ${str(data.reason) ?? "unknown reason"}`,
      });
    }
    // Contract: exactly one input and one change event — duplicate injection fails.
    if (receipt.inputEvents !== 1 || receipt.changeEvents !== 1) {
      return sapErr<SapInjectionReceipt>({
        category: "script-failed",
        message: `duplicate-event guard failed (input=${receipt.inputEvents}, change=${receipt.changeEvents})`,
      });
    }
    return sapOk(receipt);
  }

  /**
   * EXP-006/EXP-007 key delivery.
   *
   * SPIKE-001 measured that a page-context synthetic `KeyboardEvent` is delivered
   * to the DOM but SAP ITS Mobile does not act on it, so the native `SendInput`
   * channel (a real HID keystroke, which WebView2 reports with
   * `isTrusted === true`) is tried first and only then the synthetic one. The
   * receipt states which channel the page actually observed — no silent fallback.
   */
  async sendKey(key: SapKey): Promise<SapResult<SapKeyDeliveryReceipt>> {
    const watching = await this.evaluate(keyWatchScript);
    if (!watching.ok) {
      return sapErr<SapKeyDeliveryReceipt>(watching.error);
    }

    let nativeDetail: string | undefined;
    try {
      const native = await this.backend.sendKey(key);
      nativeDetail = `SendInput vk=0x${Number(native.keyCode ?? 0).toString(16)} focused=${native.focused} wait=${native.focusWaitMs}ms`;
    } catch (cause) {
      nativeDetail = `native channel unavailable: ${normalizeSapError(cause).message}`;
    }

    const observed = await this.readKeyCounters();
    if (!observed.ok) {
      return sapErr<SapKeyDeliveryReceipt>(observed.error);
    }
    const counters = observed.counters;
    if (counters.trusted > 0) {
      return sapOk<SapKeyDeliveryReceipt>({
        delivered: true,
        key,
        target: counters.lastTarget || undefined,
        method: "sendInput",
        synthetic: false,
        frameIndex: counters.lastFrame,
        dispatchedEvents: counters.down,
        trustedEvents: counters.trusted,
        defaultPrevented: counters.prevented > 0,
        detail: nativeDetail,
      });
    }

    // No trusted event reached the page — fall back to the synthetic channel and
    // report it as such.
    const evaluated = await this.evaluate(keyScript(key));
    if (!evaluated.ok) {
      return sapErr<SapKeyDeliveryReceipt>(evaluated.error);
    }
    const data = asJson(evaluated.value);
    return sapOk<SapKeyDeliveryReceipt>({
      delivered: bool(data.delivered),
      key,
      target: str(data.target) ?? (counters.lastTarget || undefined),
      method: "synthetic-dom",
      synthetic: true,
      frameIndex: num(data.frameIndex) ?? -1,
      dispatchedEvents: num(data.dispatchedEvents) ?? 0,
      trustedEvents: counters.trusted,
      defaultPrevented: bool(data.defaultPreventedOnTarget),
      detail: nativeDetail,
    });
  }

  /** Reads the page-side key counters installed by `keyWatchScript`. */
  private async readKeyCounters(): Promise<
    { ok: true; counters: KeyCounters } | { ok: false; error: SapError }
  > {
    const evaluated = await this.evaluate(keyCountersScript);
    if (!evaluated.ok) {
      return { ok: false, error: evaluated.error };
    }
    const data = asJson(evaluated.value);
    return {
      ok: true,
      counters: {
        down: num(data.down) ?? 0,
        up: num(data.up) ?? 0,
        trusted: num(data.trusted) ?? 0,
        prevented: num(data.prevented) ?? 0,
        lastCode: str(data.lastCode) ?? "",
        lastTarget: (str(data.lastTarget) ?? "").toLowerCase(),
        lastFrame: num(data.lastFrame) ?? -1,
      },
    };
  }

  async readScreenState(): Promise<SapResult<SapScreenState>> {
    const evaluated = await this.evaluate(screenStateScript);
    if (!evaluated.ok) {
      return sapErr<SapScreenState>(evaluated.error);
    }
    return sapOk(normalizeScreenState(evaluated.value));
  }

  async captureScreenshot(name?: string): Promise<SapResult<ScreenshotReceipt>> {
    try {
      const info: ScreenshotInfo = await this.backend.screenshot(name ?? "spike");
      return sapOk<ScreenshotReceipt>({
        path: info.path,
        width: info.width,
        height: info.height,
        bytes: info.bytes,
      });
    } catch (cause) {
      return sapErr<ScreenshotReceipt>(normalizeSapError(cause));
    }
  }

  async waitForScreenChange(
    baseline: SapScreenState,
    timeoutMs = DEFAULT_WAIT_GUARD_MS,
  ): Promise<SapResult<SapScreenChange>> {
    const started = Date.now();
    // A shorter eval timeout for polling reads: when ITS navigates, the page
    // context is destroyed and the callback never fires. Waiting 15 s per poll
    // would exhaust the navigation guard. 3 s is enough for a normal read.
    const NAV_POLL_EVAL_MS = 3_000;
    let navigationInProgress = false;

    while (Date.now() - started < timeoutMs) {
      const evaluated = await this.evaluate(screenStateScript, NAV_POLL_EVAL_MS);
      if (!evaluated.ok) {
        // webview-timeout during a poll means the page context was destroyed
        // (ITS full-page navigation). This IS the navigation event — wait for
        // the new page to load, then retry.
        if (evaluated.error.category === "webview-timeout") {
          navigationInProgress = true;
          await sleep(WAIT_POLL_INTERVAL_MS);
          continue;
        }
        return sapErr<SapScreenChange>(evaluated.error);
      }
      const current = normalizeScreenState(evaluated.value);
      if (current.signature !== baseline.signature) {
        return sapOk<SapScreenChange>({
          changed: true,
          waitedMs: Date.now() - started,
          signatureBefore: baseline.signature,
          signatureAfter: current.signature,
        });
      }
      // If we previously saw a navigation timeout but the page came back with
      // the same signature, the navigation reloaded the same screen — continue.
      navigationInProgress = false;
      await sleep(WAIT_POLL_INTERVAL_MS);
    }

    // Final attempt: the page may have just become scriptable after a slow load.
    const finalEval = await this.evaluate(screenStateScript, NAV_POLL_EVAL_MS);
    if (finalEval.ok) {
      const final = normalizeScreenState(finalEval.value);
      if (final.signature !== baseline.signature) {
        return sapOk<SapScreenChange>({
          changed: true,
          waitedMs: Date.now() - started,
          signatureBefore: baseline.signature,
          signatureAfter: final.signature,
        });
      }
    }
    if (navigationInProgress) {
      return sapErr<SapScreenChange>({
        category: "webview-timeout",
        message: `navigation detected (eval context destroyed) but new page not readable within ${timeoutMs} ms`,
      });
    }
    return sapErr<SapScreenChange>({
      category: "webview-timeout",
      message: `screen signature unchanged for ${timeoutMs} ms (wait guard expired)`,
    });
  }

  async probe(url: string): Promise<SapResult<SapProbeResult>> {
    const evaluated = await this.evaluate(probeScript(url), EVAL_TIMEOUT_MS + 8_000);
    if (!evaluated.ok) {
      return sapErr<SapProbeResult>(evaluated.error);
    }
    const data = asJson(evaluated.value);
    return sapOk<SapProbeResult>({
      reachable: bool(data.reachable),
      finalUrl: str(data.finalUrl),
      status: num(data.status),
      sameOrigin: bool(data.sameOrigin),
      runtimeOrigin: str(data.runtimeOrigin) ?? "",
      headers: headers(data.headers),
      metaHeaders: headers(data.metaHeaders),
      markers: strList(data.markers),
      errorCategory: normalizeCategory(data.errorCategory),
      errorMessage: str(data.errorMessage),
    });
  }

  async readRuntimeInfo(): Promise<SapResult<SapRuntimeInfo>> {
    const evaluated = await this.evaluate(capabilitiesScript);
    if (!evaluated.ok) {
      return sapErr<SapRuntimeInfo>(evaluated.error);
    }
    const data = asJson(evaluated.value);
    return sapOk<SapRuntimeInfo>({
      url: str(data.url) ?? "",
      origin: str(data.origin) ?? "",
      title: str(data.title) ?? "",
      readyState: str(data.readyState) ?? "",
      frameCount: num(data.frameCount) ?? 0,
      frames: frameList(data.frames),
      userAgent: str(data.userAgent) ?? "",
      hasRfuiMarkers: bool(data.hasRfuiMarkers),
      cspMeta: typeof data.cspMeta === "string" ? data.cspMeta : null,
      domReadable: bool(data.domReadable),
      domWritable: bool(data.domWritable),
    });
  }

  async installNavigationWatch(): Promise<SapResult<void>> {
    const evaluated = await this.evaluate(installMutationWatchScript);
    if (!evaluated.ok) {
      return sapErr<void>(evaluated.error);
    }
    return sapOk(undefined);
  }

  async readNavigationWatch(): Promise<SapResult<SapNavigationWatch>> {
    const evaluated = await this.evaluate(readMutationWatchScript);
    if (!evaluated.ok) {
      return sapErr<SapNavigationWatch>(evaluated.error);
    }
    const data = asJson(evaluated.value);
    return sapOk<SapNavigationWatch>({
      installed: bool(data.installed),
      mutations: num(data.mutations) ?? 0,
      url: str(data.url) ?? "",
      title: str(data.title) ?? "",
      error: str(data.error),
    });
  }

  private async evaluate(source: string, timeoutMs = EVAL_TIMEOUT_MS): Promise<SapResult<unknown>> {
    let encoded: string;
    try {
      encoded = encodeScriptSource(source);
    } catch (cause) {
      return sapErr<unknown>({
        category: "script-failed",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }
    try {
      const value = await this.backend.eval(encoded, timeoutMs);
      if (isBackendFailure(value)) {
        return sapErr<unknown>(backendFailureToError(value));
      }
      return sapOk(value);
    } catch (cause) {
      return sapErr<unknown>(normalizeSapError(cause));
    }
  }
}

function validateHttpUrl(url: string): SapResult<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return sapErr<string>({
      category: "invalid-url",
      message: `not a valid URL: ${url.slice(0, 120)}`,
    });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return sapErr<string>({
      category: "invalid-url",
      message: `unsupported scheme '${parsed.protocol}' — only http(s) is allowed`,
    });
  }
  if (!parsed.hostname) {
    return sapErr<string>({ category: "invalid-url", message: "URL has no host" });
  }
  return sapOk(url);
}

function normalizeAuthState(value: unknown): SapSessionState["authState"] {
  return value === "login-form" || value === "authenticated" || value === "unauthenticated"
    ? value
    : "unknown";
}

function normalizeCategory(value: unknown): SapProbeResult["errorCategory"] {
  switch (value) {
    case "auth-required":
    case "service-unavailable":
    case "sap-unavailable":
    case "certificate-error":
    case "invalid-url":
    case "webview-timeout":
    case "webview-error":
    case "script-failed":
    case "unknown":
      return value;
    default:
      return undefined;
  }
}

function headers(value: unknown): Record<string, string> {
  return typeof value === "object" && value !== null ? (value as Record<string, string>) : {};
}

function normalizeScreenState(value: unknown): SapScreenState {
  const data = asJson(value);
  const fields: SapFieldSnapshot[] = Array.isArray(data.fields)
    ? data.fields.map((raw) => {
        const f = asJson(raw);
        const masked = bool(f.masked);
        return {
          tagName: str(f.tagName) ?? "input",
          id: str(f.id),
          name: str(f.name),
          inputType: str(f.inputType),
          value: masked ? "" : (str(f.value) ?? ""),
          masked,
          focused: bool(f.focused),
          disabled: bool(f.disabled),
          frameIndex: num(f.frameIndex) ?? -1,
        };
      })
    : [];
  const buttons: SapControlSnapshot[] = Array.isArray(data.buttons)
    ? data.buttons.map((raw) => {
        const b = asJson(raw);
        const kind = str(b.kind);
        return {
          kind: kind === "link" || kind === "label" ? kind : "button",
          text: str(b.text) ?? "",
          id: str(b.id),
          frameIndex: num(b.frameIndex) ?? -1,
        };
      })
    : [];
  return {
    url: str(data.url),
    origin: str(data.origin),
    title: str(data.title),
    texts: strList(data.texts),
    fields,
    buttons,
    signature: str(data.signature) ?? "",
    frameCount: num(data.frameCount) ?? 0,
    frames: frameList(data.frames),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
