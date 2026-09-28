import { describe, expect, it } from "vitest";

import type { TelemetryEntry, TelemetryPort } from "./telemetry-port";
import {
  REDACTED_PLACEHOLDER,
  createTelemetryLogger,
  isLevelEnabled,
  parseTelemetryLevel,
  redactContext,
} from "./logger";

/** Recording fake — the ports package stays free of any real sink. */
function createFakePort(): TelemetryPort & { entries: TelemetryEntry[] } {
  const entries: TelemetryEntry[] = [];
  return {
    entries,
    emit(entry: TelemetryEntry): void {
      entries.push(entry);
    },
  };
}

describe("parseTelemetryLevel", () => {
  it("accepts known levels case-insensitively and falls back otherwise", () => {
    expect(parseTelemetryLevel("DEBUG")).toBe("debug");
    expect(parseTelemetryLevel(" warn ")).toBe("warn");
    expect(parseTelemetryLevel("verbose")).toBe("info");
    expect(parseTelemetryLevel(undefined, "error")).toBe("error");
    expect(parseTelemetryLevel(null, "debug")).toBe("debug");
  });
});

describe("isLevelEnabled", () => {
  it("filters by severity threshold", () => {
    expect(isLevelEnabled("info", "debug")).toBe(false);
    expect(isLevelEnabled("info", "info")).toBe(true);
    expect(isLevelEnabled("info", "error")).toBe(true);
    expect(isLevelEnabled("error", "warn")).toBe(false);
  });
});

describe("redactContext", () => {
  it("replaces sensitive values and keeps the rest", () => {
    const redacted = redactContext({
      environment: "EWT",
      sapPassword: "TopS3cret",
      accessToken: "eyJhbGciOi",
      retryCount: 2,
      ready: true,
      missing: null,
    });

    expect(redacted).toEqual({
      environment: "EWT",
      sapPassword: REDACTED_PLACEHOLDER,
      accessToken: REDACTED_PLACEHOLDER,
      retryCount: 2,
      ready: true,
      missing: null,
    });
  });

  it("returns undefined for undefined input", () => {
    expect(redactContext(undefined)).toBeUndefined();
  });
});

describe("createTelemetryLogger", () => {
  it("emits only entries at or above the minimum level, tagged with the scope", () => {
    const port = createFakePort();
    const logger = createTelemetryLogger(port, { scope: "application", minimumLevel: "warn" });

    logger.debug("ignored");
    logger.info("ignored too");
    logger.warn("disk is almost full", { freeMb: 120 });
    logger.error("storage unavailable");

    expect(port.entries.map((entry) => entry.level)).toEqual(["warn", "error"]);
    expect(port.entries[0]?.message).toBe("disk is almost full");
    expect(port.entries[0]?.scope).toBe("application");
    expect(port.entries[0]?.context).toEqual({ freeMb: 120 });
  });

  it("redacts secrets before the sink sees them", () => {
    const port = createFakePort();
    const logger = createTelemetryLogger(port, { scope: "session" });

    logger.info("login attempted", { user: "QA_USER", password: "never-log-me" });

    expect(port.entries[0]?.context).toEqual({
      user: "QA_USER",
      password: REDACTED_PLACEHOLDER,
    });
  });

  it("builds nested scopes and inherits the level threshold", () => {
    const port = createFakePort();
    const logger = createTelemetryLogger(port, { scope: "application", minimumLevel: "debug" });
    const child = logger.child("startup").child("storage");

    expect(child.scope).toBe("application.startup.storage");
    expect(child.minimumLevel).toBe("debug");

    child.debug("cache warmed");

    expect(port.entries).toHaveLength(1);
    expect(port.entries[0]?.scope).toBe("application.startup.storage");
  });
});
