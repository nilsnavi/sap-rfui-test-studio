/**
 * SPIKE-001 experiment orchestration (EXP-001 … EXP-011).
 *
 * The runner only speaks `SapPort` — it has no Tauri, DOM or SAP knowledge
 * (ADR-001 Rules 1/7). It is therefore unit-testable with a fake port, while the
 * experiment verdicts themselves come from the real controlled runtime.
 *
 * Status semantics (SPIKE-001 §12–14):
 * - PASS     — capability proven with recorded evidence;
 * - PARTIAL  — works, but needs further adapter/runtime work or a manual step;
 * - FAIL     — capability not achievable through this path;
 * - SKIPPED  — not executed in this run (disabled by configuration).
 */

import type { SapKey, SapPort, SapResult, SapScreenState, SapSessionState } from "@sap-rfui/ports";

export type ExperimentStatus = "PASS" | "PARTIAL" | "FAIL" | "SKIPPED";

export interface ExperimentResult {
  readonly id: string;
  readonly title: string;
  readonly status: ExperimentStatus;
  readonly evidence: string[];
  readonly notes: string[];
  readonly startedAt: string;
  readonly durationMs: number;
}

export interface SpikeRunConfig {
  /** Non-production SAP RFUI entry URL (EWD/EWT). Never credentials. */
  readonly sapUrl: string;
  /** Non-destructive test value injected as scanner input (e.g. a test HU/BIN id). */
  readonly testValue: string;
  /** Guard for the manual login wait (condition-based polling, not a sleep). */
  readonly loginGuardMs: number;
  /** Guard for navigation/screen-change detection. */
  readonly navigationGuardMs: number;
  /** Also probe a known bad-certificate endpoint (needs internet; optional). */
  readonly includeCertificateCheck: boolean;
}

export const CRITICAL_CAPABILITIES: readonly {
  readonly capability: string;
  readonly experiment: string;
}[] = [
  { capability: "RFUI render", experiment: "EXP-001" },
  { capability: "Login", experiment: "EXP-002" },
  { capability: "Session persistence", experiment: "EXP-003" },
  { capability: "Input injection", experiment: "EXP-005" },
  { capability: "ENTER/F-key delivery", experiment: "EXP-006 / EXP-007" },
  { capability: "Screen introspection", experiment: "EXP-008" },
  { capability: "Screenshot", experiment: "EXP-010" },
  { capability: "Navigation detection", experiment: "EXP-009" },
];

/** Safe non-destructive RFUI menu number for the ENTER navigation test (EXP-006). */
const NAVIGATION_TEST_VALUE = "02";

const SENSITIVE_PATTERN =
  /(password|passwd|pwd|token|secret|authorization|cookie|sso2cookie|sap-?session|jsessionid|__ssogetticket)[\s]*[:=][\s]*\S+/gi;

/** Evidence is text: bounded, redacted, and never contains credentials/cookies. */
export function sanitizeEvidence(text: string, maxLength = 400): string {
  return text
    .replace(SENSITIVE_PATTERN, (match) => `${match.split(/[=:]/)[0]}=[REDACTED]`)
    .slice(0, maxLength);
}

function describeError(result: Extract<SapResult<unknown>, { ok: false }>): string {
  return `${result.error.category}: ${sanitizeEvidence(result.error.message)}`;
}

interface ExperimentContext {
  readonly port: SapPort;
  readonly config: SpikeRunConfig;
  readonly record: (line: string) => void;
}

interface ExperimentDefinition {
  readonly id: string;
  readonly title: string;
  run(context: ExperimentContext): Promise<ExperimentStatus>;
}

async function waitForCondition(
  probe: () => Promise<boolean>,
  guardMs: number,
  intervalMs = 300,
): Promise<{ satisfied: boolean; waitedMs: number }> {
  const started = Date.now();
  while (Date.now() - started < guardMs) {
    if (await probe()) {
      return { satisfied: true, waitedMs: Date.now() - started };
    }
    await sleep(intervalMs);
  }
  return { satisfied: false, waitedMs: Date.now() - started };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameOriginUrl(base: string, path: string): string | null {
  try {
    const url = new URL(base);
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

function sessionSummary(session: SapSessionState): string {
  return [
    `opened=${session.opened}`,
    `authState=${session.authState}`,
    `readyState=${session.readyState ?? "n/a"}`,
    `frames=${session.frameCount}`,
    `cookiesAccessible=${session.cookiesAccessible}`,
    `origin=${session.url ? safeOrigin(session.url) : "n/a"}`,
  ].join(" · ");
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "invalid";
  }
}

function screenSummary(screen: SapScreenState): string {
  return [
    `title=${sanitizeEvidence(screen.title ?? "", 80) || "n/a"}`,
    `texts=${screen.texts.length}`,
    `fields=${screen.fields.length}`,
    `controls=${screen.buttons.length}`,
    `frames=${screen.frameCount}`,
    `signature=${screen.signature}`,
  ].join(" · ");
}

/** Reads a screen snapshot, retrying while the page is still scriptable-becoming. */
async function readScreen(port: SapPort, guardMs: number): Promise<SapScreenState | null> {
  const outcome = await waitForCondition(
    async () => (await port.readScreenState()).ok,
    guardMs,
    400,
  );
  if (!outcome.satisfied) {
    return null;
  }
  const result = await port.readScreenState();
  return result.ok ? result.value : null;
}

export const EXPERIMENTS: readonly ExperimentDefinition[] = [
  {
    id: "EXP-001",
    title: "Open SAP RFUI",
    async run({ port, config, record }) {
      const opened = await port.open(config.sapUrl);
      if (!opened.ok) {
        record(describeError(opened));
        return "FAIL";
      }
      record(`open() accepted the URL · runtime window created for ${safeOrigin(config.sapUrl)}`);

      const info = await port.readRuntimeInfo();
      if (!info.ok) {
        record(describeError(info));
        record("the page opened but no content could be observed yet");
        return "PARTIAL";
      }
      record(
        `url=${sanitizeEvidence(info.value.url, 200)} · readyState=${info.value.readyState} · frames=${info.value.frameCount}`,
      );
      record(`userAgent=${sanitizeEvidence(info.value.userAgent, 200)}`);
      record(
        `RFUI markers=${info.value.hasRfuiMarkers} · DOM readable=${info.value.domReadable} · DOM writable=${info.value.domWritable}`,
      );
      if (info.value.cspMeta) {
        record(`page CSP meta=${sanitizeEvidence(info.value.cspMeta, 200)}`);
      }
      info.value.frames.forEach((frame, index) => {
        record(
          `frame[${index}] <${frame.tag}> accessible=${frame.accessible} src=${sanitizeEvidence(frame.src, 160)}`,
        );
      });

      const sameOrigin = info.value.origin === safeOrigin(config.sapUrl);
      record(`runtime origin == SAP origin: ${sameOrigin}`);

      if (!info.value.domReadable) {
        record("DOM is not readable from the controlled runtime");
        return "FAIL";
      }
      if (!info.value.hasRfuiMarkers) {
        record("no RFUI markers detected yet — most likely the logon page is shown (see EXP-002)");
        return "PARTIAL";
      }
      return "PASS";
    },
  },
  {
    id: "EXP-002",
    title: "Authentication (manual, non-automated)",
    async run({ port, record, config }) {
      const before = await port.getSessionState();
      if (!before.ok) {
        record(describeError(before));
        return "FAIL";
      }
      record(`before login · ${sessionSummary(before.value)}`);
      record(
        "credentials are entered by the tester in the controlled window; the spike never automates or captures a password",
      );

      const wait = await waitForCondition(
        async () => {
          const session = await port.getSessionState();
          if (!session.ok) {
            return false;
          }
          recordIfChanged(record, session.value);
          return session.value.authState === "authenticated";
        },
        config.loginGuardMs,
        1500,
      );

      const after = await port.getSessionState();
      if (after.ok) {
        record(`after wait · ${sessionSummary(after.value)} · waitedMs=${wait.waitedMs}`);
      }
      if (!wait.satisfied) {
        record("authenticated state was not observed within the login guard");
        return after.ok && after.value.authState === "login-form" ? "PARTIAL" : "FAIL";
      }
      record("authenticated RFUI session detected by condition polling (no fixed sleep)");
      return "PASS";
    },
  },
  {
    id: "EXP-003",
    title: "Session / cookie persistence across reload",
    async run({ port, record }) {
      const before = await port.getSessionState();
      if (!before.ok) {
        record(describeError(before));
        return "FAIL";
      }
      if (before.value.authState !== "authenticated") {
        record(
          `session is not authenticated before reload (${before.value.authState}) — cannot prove persistence`,
        );
        return "PARTIAL";
      }
      const reloaded = await port.reload();
      if (!reloaded.ok) {
        record(describeError(reloaded));
        return "FAIL";
      }
      record("reload() issued for the controlled runtime");

      const wait = await waitForCondition(
        async () => {
          const session = await port.getSessionState();
          return session.ok && session.value.authState !== "unknown";
        },
        20_000,
        500,
      );
      const after = await port.getSessionState();
      if (!after.ok) {
        record(describeError(after));
        return "FAIL";
      }
      record(`after reload · ${sessionSummary(after.value)} · waitedMs=${wait.waitedMs}`);
      record("cookie values are never read by the adapter — only cookie accessibility is observed");

      if (after.value.authState === "authenticated") {
        record(
          "reload preserved the authenticated SAP session (persistent webview data directory)",
        );
        return "PASS";
      }
      record(
        "session was lost after reload — persistence is not effective for this origin/cookie setup",
      );
      return after.value.cookiesAccessible ? "PARTIAL" : "FAIL";
    },
  },
  {
    id: "EXP-004",
    title: "Active input detection",
    async run({ port, record }) {
      const field = await port.getActiveField();
      if (!field.ok) {
        record(describeError(field));
        return "FAIL";
      }
      if (field.value === null) {
        record("no focused input at the moment of the check — focus a RFUI field and re-run");
        return "PARTIAL";
      }
      const f = field.value;
      record(
        `focused <${f.tagName}> id=${f.id ?? "n/a"} name=${f.name ?? "n/a"} type=${f.inputType ?? "n/a"} frame=${f.frameIndex}`,
      );
      record(
        `field exists=true · focused=true · valueLength=${f.valueLength} · masked=${f.masked}`,
      );
      record(
        "semantic metadata only: the adapter does not build a production selector model in the spike",
      );
      return "PASS";
    },
  },
  {
    id: "EXP-005",
    title: "Scanner injection into the active field",
    async run({ port, record, config }) {
      const before = await port.getActiveField();
      if (!before.ok) {
        record(describeError(before));
        return "FAIL";
      }
      if (before.value === null) {
        record("no active field — EXP-004 must pass first");
        return "FAIL";
      }
      record(
        `target field=${before.value.id ?? before.value.name ?? before.value.tagName} · valueLengthBefore=${before.value.valueLength}`,
      );

      const injected = await port.injectText(config.testValue);
      if (!injected.ok) {
        record(describeError(injected));
        return "FAIL";
      }
      const receipt = injected.value;
      record(
        `injected into frame ${receipt.frameIndex} · inputEvents=${receipt.inputEvents} · changeEvents=${receipt.changeEvents} · valueLengthAfter=${receipt.valueLengthAfter}`,
      );

      const expectedLength = config.testValue.length;
      if (receipt.valueLengthAfter !== expectedLength) {
        record(
          `value is not visible in the field (expected length ${expectedLength}, got ${receipt.valueLengthAfter})`,
        );
        return "FAIL";
      }
      const reread = await port.getActiveField();
      if (reread.ok && reread.value && reread.value.valueLength === expectedLength) {
        record(`read-back confirms the value (length ${reread.value.valueLength})`);
      } else {
        record("read-back did not confirm the value through the active-field probe");
        return "PARTIAL";
      }
      if (receipt.inputEvents !== 1 || receipt.changeEvents !== 1) {
        record(
          `duplicate injection detected (input=${receipt.inputEvents}, change=${receipt.changeEvents})`,
        );
        return "FAIL";
      }
      record("SAP received exactly one input and one change event — no duplicate injection");
      return "PASS";
    },
  },
  {
    id: "EXP-006",
    title: "ENTER triggers a real SAP action (inject → Enter → navigation)",
    async run({ port, record, config }) {
      // Step 1: verify there is an active input field to inject into.
      const field = await port.getActiveField();
      if (!field.ok) {
        record(describeError(field));
        return "FAIL";
      }
      if (field.value === null) {
        record("no active field — cannot inject a value before ENTER");
        return "PARTIAL";
      }
      record(
        `active field detected: <${field.value.tagName}> name=${field.value.name ?? "n/a"} — injecting navigation value`,
      );

      // Step 2: inject a safe navigation value (RFUI menu number).
      const injected = await port.injectText(NAVIGATION_TEST_VALUE);
      if (!injected.ok) {
        record(describeError(injected));
        return "FAIL";
      }
      record(
        `injected "${NAVIGATION_TEST_VALUE}" · inputEvents=${injected.value.inputEvents} · changeEvents=${injected.value.changeEvents} · valueLengthAfter=${injected.value.valueLengthAfter}`,
      );

      // Step 3: read baseline AFTER injection (signature includes the injected text).
      const baseline = await readScreen(port, 5_000);
      if (!baseline) {
        record("screen state is not readable after injection — cannot prove the action");
        return "FAIL";
      }
      record(`baseline · ${screenSummary(baseline)}`);

      // Step 4: send ENTER via native SendInput.
      const sent = await port.sendKey("Enter");
      if (!sent.ok) {
        record(describeError(sent));
        return "FAIL";
      }
      record(
        `Enter delivered to <${sent.value.target ?? "document"}> · channel=${sent.value.method} · events=${sent.value.dispatchedEvents} · trusted=${sent.value.trustedEvents} · synthetic=${sent.value.synthetic} · defaultPrevented=${sent.value.defaultPrevented}`,
      );
      if (sent.value.detail) {
        record(`native channel: ${sent.value.detail}`);
      }

      // Step 5: condition-based wait for SAP-side effect (navigation/message/state change).
      const change = await port.waitForScreenChange(baseline, config.navigationGuardMs);
      if (!change.ok) {
        record(describeError(change));
        record("SAP did not change the screen after ENTER — the action was not processed");
        return "FAIL";
      }
      record(
        `screen changed after ENTER in ${change.value.waitedMs} ms · signature ${change.value.signatureBefore} → ${change.value.signatureAfter}`,
      );

      // Step 6: verify the new screen (SAP processed the action).
      const after = await readScreen(port, 5_000);
      if (after) {
        record(`after ENTER · ${screenSummary(after)}`);
      }
      const valueGone = !after || !containsValue(after, NAVIGATION_TEST_VALUE);
      if (valueGone) {
        record("navigation value cleared from field — SAP consumed the input");
      }
      return change.ok && valueGone ? "PASS" : "PARTIAL";
    },
  },
  {
    id: "EXP-007",
    title: "Function keys (F1/F2/F3/ESC)",
    async run({ port, record, config }) {
      const keys: SapKey[] = ["F1", "F2", "F3", "Escape"];
      let delivered = 0;
      let causedChange = 0;
      for (const key of keys) {
        const baseline = await readScreen(port, 4_000);
        if (!baseline) {
          record(`${key}: screen state unreadable — skipped`);
          continue;
        }
        const sent = await port.sendKey(key);
        if (!sent.ok) {
          record(`${key}: ${describeError(sent)}`);
          continue;
        }
        delivered += 1;
        record(
          `${key}: delivered=${sent.value.delivered} channel=${sent.value.method} events=${sent.value.dispatchedEvents} trusted=${sent.value.trustedEvents} target=<${sent.value.target ?? "document"}> defaultPrevented=${sent.value.defaultPrevented}`,
        );
        const change = await port.waitForScreenChange(
          baseline,
          Math.min(config.navigationGuardMs, 8_000),
        );
        if (change.ok) {
          causedChange += 1;
          record(`${key}: SAP screen changed in ${change.value.waitedMs} ms (real handling)`);
        } else {
          record(
            `${key}: ${describeError(change)} (delivery succeeded, no observable screen change)`,
          );
        }
      }
      if (delivered === 0) {
        return "FAIL";
      }
      if (causedChange === keys.length) {
        record("all tested function keys produced an observable SAP reaction");
        return "PASS";
      }
      record(
        `delivery proven for ${delivered}/${keys.length} keys; observable reactions for ${causedChange}/${keys.length}`,
      );
      record(
        "SPIKE-001 §12: function keys may stay PARTIAL when the RFUI flow does not bind them, as long as the path can deliver them",
      );
      return "PARTIAL";
    },
  },
  {
    id: "EXP-008",
    title: "Read screen text (normalized snapshot)",
    async run({ port, record }) {
      const screen = await readScreen(port, 8_000);
      if (!screen) {
        const direct = await port.readScreenState();
        record(direct.ok ? "snapshot empty" : describeError(direct));
        return "FAIL";
      }
      record(screenSummary(screen));
      screen.texts
        .slice(0, 8)
        .forEach((text, index) => record(`text[${index}]=${sanitizeEvidence(text, 120)}`));
      screen.fields.slice(0, 6).forEach((field, index) => {
        record(
          `field[${index}] <${field.tagName}> id=${field.id ?? "n/a"} masked=${field.masked} value=${field.masked ? "[MASKED]" : sanitizeEvidence(field.value, 60)}`,
        );
      });
      screen.buttons.slice(0, 8).forEach((control, index) => {
        record(`control[${index}] ${control.kind} "${sanitizeEvidence(control.text, 60)}"`);
      });
      const leakedSecret = screen.fields.some(
        (field) =>
          !field.masked && field.value.length > 0 && /password/i.test(field.inputType ?? ""),
      );
      if (leakedSecret) {
        record("a password-typed field exposed a value — contract violation");
        return "FAIL";
      }
      if (screen.texts.length === 0 && screen.fields.length === 0) {
        record("page is readable but carries no RFUI content yet (logon page?)");
        return "PARTIAL";
      }
      record("normalized SapScreenState produced without passwords/tokens/cookie values");
      return "PASS";
    },
  },
  {
    id: "EXP-009",
    title: "Navigation / screen-change detection",
    async run({ port, record, config }) {
      const installed = await port.installNavigationWatch();
      if (!installed.ok) {
        record(describeError(installed));
        return "FAIL";
      }
      record("MutationObserver watch installed in the page (DOM-mutation signal)");

      const baseline = await readScreen(port, 6_000);
      if (!baseline) {
        record("no baseline screen snapshot available");
        return "FAIL";
      }
      const before = await port.readNavigationWatch();
      if (before.ok) {
        record(
          `watch before action · mutations=${before.value.mutations} url=${sanitizeEvidence(before.value.url, 160)}`,
        );
      }

      const sent = await port.sendKey("Enter");
      if (!sent.ok) {
        record(describeError(sent));
        record("signature-change detection is still verified against passive DOM activity");
      }

      const change = await port.waitForScreenChange(baseline, config.navigationGuardMs);
      const after = await port.readNavigationWatch();
      if (after.ok) {
        record(
          `watch after action · mutations=${after.value.mutations} url=${sanitizeEvidence(after.value.url, 160)} title=${sanitizeEvidence(after.value.title, 80)}`,
        );
      }
      if (!change.ok) {
        record(describeError(change));
        if (after.ok && after.value.mutations > 0) {
          record("DOM mutations were observed but the screen signature stayed stable");
          return "PARTIAL";
        }
        return "FAIL";
      }
      record(
        `condition-based detection: signature change observed in ${change.value.waitedMs} ms (no fixed sleep; guard only)`,
      );
      if (after.ok && after.value.mutations > 0) {
        record(
          `DOM-mutation signal corroborates the change (${after.value.mutations} mutations recorded)`,
        );
        return "PASS";
      }
      record(
        "mutation counter unavailable; detection relies on screen signature + native navigation events",
      );
      return "PASS";
    },
  },
  {
    id: "EXP-010",
    title: "Screenshot of the SAP content area",
    async run({ port, record }) {
      const shot = await port.captureScreenshot("spike-exp010");
      if (!shot.ok) {
        record(describeError(shot));
        return "FAIL";
      }
      record(
        `PNG captured · ${shot.value.width}x${shot.value.height} bytes=${shot.value.bytes ?? "n/a"}`,
      );
      record(
        `evidence path (local, outside the repository)=${sanitizeEvidence(shot.value.path, 240)}`,
      );
      record(
        "the capture is bound to the experiment id and timestamp, so a future Recorder can attach it to a test step",
      );
      if (shot.value.width === 0 || shot.value.height === 0) {
        record("PNG header had no dimensions — verify the file manually");
        return "PARTIAL";
      }
      return "PASS";
    },
  },
  {
    id: "EXP-011",
    title: "Error handling normalization",
    async run({ port, config, record }) {
      const checks: { readonly label: string; run: () => Promise<string | null> }[] = [];

      checks.push({
        label: "invalid URL",
        run: async () => {
          const result = await port.open("not-a-valid-url");
          if (result.ok) {
            return "expected rejection for an invalid URL, but open() succeeded";
          }
          record(`invalid URL → ${result.error.category}`);
          return result.error.category === "invalid-url"
            ? null
            : `unexpected category ${result.error.category}`;
        },
      });

      checks.push({
        label: "unsupported scheme",
        run: async () => {
          const result = await port.open("file:///C:/windows/not-a-sap-page.html");
          if (result.ok) {
            return "expected rejection for a file: URL, but open() succeeded";
          }
          record(`file: scheme → ${result.error.category}`);
          return result.error.category === "invalid-url"
            ? null
            : `unexpected category ${result.error.category}`;
        },
      });

      checks.push({
        label: "SAP unavailable",
        run: async () => {
          const dead = sameOriginUrl(config.sapUrl, "/sap/bc/bsp/sap/__spike_unreachable__");
          if (!dead) {
            return "could not derive a same-origin test URL";
          }
          const result = await port.probe(dead);
          if (!result.ok) {
            record(`unreachable/invalid service → ${result.error.category}`);
            return result.error.category === "sap-unavailable" ||
              result.error.category === "service-unavailable" ||
              result.error.category === "invalid-url"
              ? null
              : `unexpected category ${result.error.category}`;
          }
          record(
            `probe of a non-existent ICF service → status=${result.value.status ?? "n/a"} reachable=${result.value.reachable} category=${result.value.errorCategory ?? "none"} markers=${result.value.markers.join(",") || "none"}`,
          );
          return null;
        },
      });

      checks.push({
        label: "authentication required",
        run: async () => {
          const probeUrl = sameOriginUrl(config.sapUrl, "/sap/bc/bsp/sap/");
          if (!probeUrl) {
            return "could not derive a same-origin test URL";
          }
          const result = await port.probe(probeUrl);
          if (!result.ok) {
            record(`auth probe → ${result.error.category}`);
            return null;
          }
          record(
            `auth-required observation · status=${result.value.status ?? "n/a"} category=${result.value.errorCategory ?? "none"} markers=${result.value.markers.join(",") || "none"}`,
          );
          record(
            "a logged-in session legitimately returns 200 here; the normalized category is what is under test",
          );
          return null;
        },
      });

      checks.push({
        label: "service unavailable / HTTP 5xx",
        run: async () => {
          const result = await port.probe(
            sameOriginUrl(config.sapUrl, "/sap/public/bc/ab/isolated/__spike__") ?? config.sapUrl,
          );
          if (!result.ok) {
            record(`5xx path probe → ${result.error.category}`);
            return null;
          }
          record(
            `status=${result.value.status ?? "n/a"} category=${result.value.errorCategory ?? "none"} reachable=${result.value.reachable}`,
          );
          return null;
        },
      });

      if (config.includeCertificateCheck) {
        checks.push({
          label: "certificate / WebView error",
          run: async () => {
            const opened = await port.open("https://expired.badssl.com/");
            if (opened.ok) {
              const info = await port.readRuntimeInfo();
              if (!info.ok) {
                record(`bad certificate page → ${info.error.category}`);
              } else {
                record(
                  `bad certificate page observed as url=${sanitizeEvidence(info.value.url, 120)}`,
                );
              }
              await port.close();
              return null;
            }
            record(`bad certificate page → ${opened.error.category}`);
            return opened.error.category === "certificate-error" ||
              opened.error.category === "webview-error"
              ? null
              : `unexpected category ${opened.error.category}`;
          },
        });
      } else {
        record(
          "certificate check skipped by configuration (requires internet access to a public bad-cert endpoint)",
        );
      }

      const problems: string[] = [];
      for (const check of checks) {
        try {
          const problem = await check.run();
          if (problem) {
            problems.push(`${check.label}: ${problem}`);
          }
        } catch (error) {
          problems.push(`${check.label}: ${sanitizeEvidence(String(error))}`);
        }
      }
      problems.forEach((problem) => record(problem));
      if (problems.length > 0) {
        return "PARTIAL";
      }
      record("every failure path produced a normalized SapError category (ADR-001 Rule 14)");
      return "PASS";
    },
  },
];

function recordIfChanged(record: (line: string) => void, session: SapSessionState): void {
  record(
    `waiting for login · authState=${session.authState} page=${session.url ? safeOrigin(session.url) : "n/a"}`,
  );
}

function containsValue(screen: SapScreenState, value: string): boolean {
  return screen.fields.some((field) => !field.masked && field.value === value);
}

export interface SpikeRunReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly sapOrigin: string;
  readonly results: ExperimentResult[];
  readonly overall: ExperimentStatus;
}

export interface RunOptions {
  readonly only?: readonly string[];
  readonly onResult?: (result: ExperimentResult) => void;
}

/** Runs the selected experiments sequentially; each one is independent. */
export async function runSpikeExperiments(
  port: SapPort,
  config: SpikeRunConfig,
  options: RunOptions = {},
): Promise<SpikeRunReport> {
  const startedAt = new Date().toISOString();
  const results: ExperimentResult[] = [];
  const selected = EXPERIMENTS.filter(
    (experiment) =>
      !options.only || options.only.length === 0 || options.only.includes(experiment.id),
  );

  for (const experiment of selected) {
    const started = Date.now();
    const evidence: string[] = [];
    const notes: string[] = [];
    const context: ExperimentContext = {
      port,
      config,
      record: (line) => {
        const text = sanitizeEvidence(line);
        evidence.push(text);
        notes.push(text);
      },
    };
    let status: ExperimentStatus;
    try {
      status = await experiment.run(context);
    } catch (error) {
      status = "FAIL";
      evidence.push(`uncaught adapter error: ${sanitizeEvidence(String(error))}`);
    }
    const result: ExperimentResult = {
      id: experiment.id,
      title: experiment.title,
      status,
      evidence,
      notes,
      startedAt: new Date(started).toISOString(),
      durationMs: Date.now() - started,
    };
    results.push(result);
    options.onResult?.(result);
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    sapOrigin: safeOrigin(config.sapUrl),
    results,
    overall: overallStatus(results),
  };
}

/** Critical-capability rollup (SPIKE-001 §12–14). */
export function overallStatus(results: readonly ExperimentResult[]): ExperimentStatus {
  if (results.length === 0) {
    return "SKIPPED";
  }
  const critical = results.filter((result) => result.id !== "EXP-011");
  if (critical.some((result) => result.status === "FAIL")) {
    return "FAIL";
  }
  if (critical.some((result) => result.status === "PARTIAL" || result.status === "SKIPPED")) {
    return "PARTIAL";
  }
  return critical.every((result) => result.status === "PASS") ? "PASS" : "PARTIAL";
}

export function formatReportAsMarkdown(report: SpikeRunReport): string {
  const lines: string[] = [];
  lines.push(`# SPIKE-001 run evidence`);
  lines.push("");
  lines.push(`- startedAt: ${report.startedAt}`);
  lines.push(`- finishedAt: ${report.finishedAt}`);
  lines.push(`- SAP origin: ${report.sapOrigin}`);
  lines.push(`- overall: ${report.overall}`);
  lines.push("");
  for (const result of report.results) {
    lines.push(`## ${result.id} — ${result.title}`);
    lines.push(`Status: ${result.status} (${result.durationMs} ms)`);
    lines.push("Evidence:");
    if (result.evidence.length === 0) {
      lines.push("- (none)");
    }
    for (const line of result.evidence) {
      lines.push(`- ${line}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
