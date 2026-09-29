/**
 * Unit tests for the SPIKE-001 experimental adapter boundary.
 *
 * These tests exercise the *contract* between ExperimentalSapAdapter and the
 * native runtime bridge: URL validation, error normalization, result
 * normalization and the security invariants of the port. A fake `SpikeBackend`
 * stands in for the Tauri commands — that is legitimate here because the spike
 * verdicts themselves are produced against the real SAP runtime, not by these
 * tests (SPIKE-001 §security/testing rules).
 */

import { describe, expect, it } from "vitest";

import type { SapScreenState } from "@sap-rfui/ports";

import { ExperimentalSapAdapter } from "./experimental-sap-adapter";
import type { SpikeBackend } from "./sap-runtime-backend";

const SAP_URL = "https://sap.example:44300/sap/bc/bsp/sap/rfui_sample/start.htm";

interface FakeBackend extends SpikeBackend {
  readonly sources: string[];
  readonly opened: { url: string; persistent?: boolean }[];
  readonly keys: string[];
}

/**
 * Backend double that routes an injected script to a response by content marker,
 * exactly like the real runtime would return the script's own result object.
 */
function createFakeBackend(
  routes: readonly (readonly [marker: string, response: unknown])[] = [],
  options: { evalError?: unknown; openError?: unknown; keyError?: unknown } = {},
): FakeBackend {
  const sources: string[] = [];
  const opened: { url: string; persistent?: boolean }[] = [];
  const keys: string[] = [];

  const respond = (source: string): unknown => {
    const match = routes.find(([marker]) => source.includes(marker));
    if (!match) {
      return { routed: false, source };
    }
    return match[1];
  };

  return {
    sources,
    opened,
    keys,
    async open(url, settings) {
      if (options.openError !== undefined) {
        throw options.openError;
      }
      opened.push({ url, persistent: settings?.persistent });
      return { label: "sap-spike", persistentSession: true, createdUtc: 1 };
    },
    async isOpen() {
      return { opened: opened.length > 0, url: opened[0]?.url ?? null, title: "SAP RFUI" };
    },
    async close() {
      opened.length = 0;
      return true;
    },
    async reload() {
      return { url: opened[0]?.url ?? null };
    },
    async eval(sourceB64) {
      const source = atob(sourceB64);
      sources.push(source);
      if (options.evalError !== undefined) {
        throw options.evalError;
      }
      return respond(source);
    },
    async sendKey(key) {
      if (options.keyError !== undefined) {
        throw options.keyError;
      }
      keys.push(key);
      return {
        method: "SendInput",
        key,
        keyCode: 13,
        focused: true,
        focusWaitMs: 2,
        inputUnits: 2,
      };
    },
    async screenshot(name) {
      return {
        path: `C:/Users/tester/cache/spike-evidence/${name}.png`,
        width: 244,
        height: 400,
        bytes: 20480,
      };
    },
  };
}

function adapterFor(
  routes: readonly (readonly [string, unknown])[],
  options: { evalError?: unknown; openError?: unknown; keyError?: unknown } = {},
) {
  const backend = createFakeBackend(routes, options);
  return { adapter: new ExperimentalSapAdapter({ backend }), backend };
}

const SCREEN_RESPONSE: SapScreenState = {
  url: SAP_URL,
  origin: "https://sap.example:44300",
  title: "RFUI Sample",
  texts: ["Pick HU", "Quantity"],
  fields: [
    {
      tagName: "input",
      id: "LU02",
      inputType: "text",
      value: "HU-001",
      masked: false,
      focused: true,
      disabled: false,
      frameIndex: 0,
    },
    {
      tagName: "input",
      id: "PWD",
      inputType: "password",
      value: "",
      masked: true,
      focused: false,
      disabled: false,
      frameIndex: 0,
    },
  ],
  buttons: [{ kind: "button", text: "OK", frameIndex: 0 }],
  signature: "sha-abc123",
  frameCount: 1,
  frames: [{ tag: "iframe", src: "/sap/bc/bsp/sap/x/frame.htm", accessible: true }],
};

describe("ExperimentalSapAdapter — URL validation", () => {
  it("rejects a malformed URL without touching the native runtime", async () => {
    const { adapter, backend } = adapterFor([]);
    const result = await adapter.open("not-a-url");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("invalid-url");
    }
    expect(backend.opened).toHaveLength(0);
  });

  it("rejects non-http schemes (file:) as invalid-url", async () => {
    const { adapter, backend } = adapterFor([]);
    const result = await adapter.open("file:///C:/windows/system32/config/sam");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("invalid-url");
      expect(result.error.message).toContain("unsupported scheme");
    }
    expect(backend.opened).toHaveLength(0);
  });

  it("accepts a valid https URL and requests a persistent session by default", async () => {
    const { adapter, backend } = adapterFor([]);
    await expect(adapter.open(SAP_URL)).resolves.toEqual({ ok: true, value: undefined });
    expect(backend.opened[0]).toEqual({ url: SAP_URL, persistent: true });
  });

  it("normalizes a native window-creation failure", async () => {
    const { adapter } = adapterFor([], {
      openError: "webview-error: cannot create SAP runtime window",
    });
    const result = await adapter.open(SAP_URL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("webview-error");
    }
  });
});

describe("ExperimentalSapAdapter — error normalization", () => {
  it("maps native timeout prefixes to the normalized category", async () => {
    const { adapter } = adapterFor([], {
      evalError: "webview-timeout: no eval callback within 15000 ms",
    });
    const result = await adapter.readScreenState();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("webview-timeout");
    }
  });

  it("maps script-authored backend markers to normalized categories", async () => {
    const { adapter } = adapterFor([
      ["__backend", { __backend: "certificate-error", message: "TLS failure" }],
    ]);
    const result = await adapter.probe(SAP_URL);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("certificate-error");
      expect(result.error.message).toContain("TLS failure");
    }
  });

  it("classifies an unrecognised rejection as unknown", async () => {
    const { adapter } = adapterFor([], { evalError: new Error("kaboom") });
    const result = await adapter.getActiveField();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("unknown");
    }
  });
});

describe("ExperimentalSapAdapter — session and screen normalization", () => {
  it("reports a closed runtime as an unopened session without evaluating scripts", async () => {
    const { adapter, backend } = adapterFor([]);
    const result = await adapter.getSessionState();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.opened).toBe(false);
      expect(result.value.authState).toBe("unknown");
      expect(result.value.cookiesAccessible).toBe(false);
    }
    expect(backend.sources).toHaveLength(0);
  });

  it("degrades to an unknown auth state while the page is not scriptable", async () => {
    const { adapter } = adapterFor([], { evalError: "webview-timeout: guard expired" });
    await adapter.open(SAP_URL);
    const result = await adapter.getSessionState();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.opened).toBe(true);
      expect(result.value.url).toBe(SAP_URL);
      expect(result.value.authState).toBe("unknown");
    }
  });

  it("normalizes the screen snapshot and never exposes masked field values", async () => {
    const { adapter } = adapterFor([["signature", SCREEN_RESPONSE]]);
    const result = await adapter.readScreenState();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const screen: SapScreenState = result.value;
    expect(screen.signature).toBe("sha-abc123");
    expect(screen.fields).toHaveLength(2);
    expect(screen.fields[0]?.value).toBe("HU-001");
    expect(screen.fields[1]?.masked).toBe(true);
    expect(screen.fields[1]?.value).toBe("");
    expect(screen.frames[0]?.accessible).toBe(true);
  });

  it("keeps a garbage script payload from throwing: unknown shapes normalize to empty collections", async () => {
    const { adapter } = adapterFor([["signature", null]]);
    const result = await adapter.readScreenState();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.texts).toEqual([]);
      expect(result.value.fields).toEqual([]);
      expect(result.value.signature).toBe("");
    }
  });

  it("treats a missing focus as an absent active field", async () => {
    const { adapter } = adapterFor([["valueLength", { present: false, frameIndex: -1 }]]);
    const result = await adapter.getActiveField();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});

describe("ExperimentalSapAdapter — injection and key delivery", () => {
  it("refuses to inject an empty value", async () => {
    const { adapter } = adapterFor([]);
    const result = await adapter.injectText("");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("script-failed");
    }
  });

  it("reports the injection receipt from the page script", async () => {
    const { adapter } = adapterFor([
      [
        "spike-count-input",
        {
          applied: true,
          inputEvents: 1,
          changeEvents: 1,
          valueLengthAfter: 7,
          frameIndex: 0,
          elementId: "LU02",
        },
      ],
    ]);
    const result = await adapter.injectText("HU-0001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        applied: true,
        inputEvents: 1,
        changeEvents: 1,
        valueLengthAfter: 7,
      });
    }
  });

  it("fails the contract when the page reports duplicate events", async () => {
    const { adapter } = adapterFor([
      [
        "spike-count-input",
        { applied: true, inputEvents: 2, changeEvents: 2, valueLengthAfter: 7, frameIndex: 0 },
      ],
    ]);
    const result = await adapter.injectText("HU-0001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("duplicate-event guard");
    }
  });

  it("surfaces the script reason when there is no active field", async () => {
    const { adapter } = adapterFor([
      [
        "spike-count-input",
        {
          applied: false,
          reason: "no-active-field",
          inputEvents: 0,
          changeEvents: 0,
          valueLengthAfter: 0,
          frameIndex: -1,
        },
      ],
    ]);
    const result = await adapter.injectText("HU-0001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("no-active-field");
    }
  });

  it("delivers ENTER through the native channel when the page sees a trusted key", async () => {
    const { adapter, backend } = adapterFor([
      ["__spikeKeys={self:", { installed: 1, frames: 1 }],
      [
        "out.watched++",
        {
          watched: 1,
          down: 2,
          up: 2,
          trusted: 2,
          prevented: 1,
          lastCode: "NumpadEnter",
          lastTarget: "INPUT",
          lastFrame: 0,
        },
      ],
    ]);
    const result = await adapter.sendKey("Enter");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        delivered: true,
        key: "Enter",
        method: "sendInput",
        synthetic: false,
        target: "input",
        trustedEvents: 2,
        defaultPrevented: true,
      });
      expect(result.value.detail).toContain("SendInput");
    }
    // The native keystroke was used, so no synthetic KeyboardEvent script ran.
    expect(backend.keys).toEqual(["Enter"]);
    expect(backend.sources.some((source) => source.includes("'keydown','keypress','keyup'"))).toBe(
      false,
    );
  });

  it("falls back to synthetic key events and reports the channel honestly", async () => {
    const { adapter, backend } = adapterFor(
      [
        ["__spikeKeys={self:", { installed: 1, frames: 1 }],
        ["out.watched++", { watched: 1, down: 0, up: 0, trusted: 0, prevented: 0, lastFrame: -1 }],
        [
          "'keydown','keypress','keyup'",
          {
            delivered: true,
            target: "input",
            frameIndex: 0,
            dispatchedEvents: 3,
            defaultPreventedOnTarget: true,
          },
        ],
      ],
      { keyError: "webview-error: SendInput accepted 0/2 key events" },
    );
    const result = await adapter.sendKey("Enter");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        delivered: true,
        key: "Enter",
        method: "synthetic-dom",
        synthetic: true,
        dispatchedEvents: 3,
        trustedEvents: 0,
        defaultPrevented: true,
      });
      expect(result.value.detail).toContain("native channel unavailable");
    }
    const source = backend.sources[backend.sources.length - 1] ?? "";
    expect(source).toContain('"keyCode":13');
    expect(source).toContain('"code":"NumpadEnter"');
  });

  it("JSON-encodes the injected value so page content cannot break the script", async () => {
    const { adapter, backend } = adapterFor([
      [
        "spike-count-input",
        { applied: true, inputEvents: 1, changeEvents: 1, valueLengthAfter: 3, frameIndex: 0 },
      ],
    ]);
    await adapter.injectText("a');alert(1);//");

    const source = backend.sources[0] ?? "";
    expect(source).toContain('"value":"a\');alert(1);//"');
    expect(source).not.toContain("alert(1);//\n");
  });
});

describe("ExperimentalSapAdapter — condition-based waits", () => {
  it("returns as soon as the screen signature differs from the baseline", async () => {
    const { adapter } = adapterFor([["signature", SCREEN_RESPONSE]]);
    const baseline: SapScreenState = { ...SCREEN_RESPONSE, signature: "sha-old" };
    const result = await adapter.waitForScreenChange(baseline, 5_000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.changed).toBe(true);
      expect(result.value.signatureAfter).toBe("sha-abc123");
      expect(result.value.waitedMs).toBeLessThan(5_000);
    }
  });

  it("reports a guard expiry instead of sleeping indefinitely", async () => {
    const { adapter } = adapterFor([["signature", SCREEN_RESPONSE]]);
    const result = await adapter.waitForScreenChange({ ...SCREEN_RESPONSE }, 400);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("webview-timeout");
    }
  });
});

describe("ExperimentalSapAdapter — runtime observation", () => {
  it("reads the screenshot receipt from the native capture", async () => {
    const { adapter } = adapterFor([]);
    const result = await adapter.captureScreenshot("exp-010");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.width).toBe(244);
      expect(result.value.height).toBe(400);
      expect(result.value.bytes).toBe(20480);
      expect(result.value.path).toContain("spike-evidence");
    }
  });

  it("passes probe headers and markers through for the CSP evidence", async () => {
    const { adapter } = adapterFor([
      [
        "probeUrl",
        {
          reachable: true,
          finalUrl: SAP_URL,
          status: 200,
          sameOrigin: true,
          runtimeOrigin: "https://sap.example:44300",
          headers: { "x-frame-options": "SAMEORIGIN" },
          metaHeaders: {},
          markers: ["rfui", "bsp-path"],
        },
      ],
    ]);
    const result = await adapter.probe(SAP_URL);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.headers).toEqual({ "x-frame-options": "SAMEORIGIN" });
      expect(result.value.markers).toEqual(["rfui", "bsp-path"]);
      expect(result.value.errorCategory).toBeUndefined();
    }
  });

  it("reports runtime identity for the same-origin investigation", async () => {
    const { adapter } = adapterFor([
      [
        "userAgent",
        {
          url: SAP_URL,
          origin: "https://sap.example:44300",
          title: "RFUI Sample",
          readyState: "complete",
          frameCount: 2,
          frames: [{ tag: "iframe", src: "/f", accessible: false }],
          userAgent: "WebView2",
          hasRfuiMarkers: true,
          cspMeta: null,
          domReadable: true,
          domWritable: true,
        },
      ],
    ]);
    const result = await adapter.readRuntimeInfo();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hasRfuiMarkers).toBe(true);
      expect(result.value.frames[0]?.accessible).toBe(false);
    }
  });
});
