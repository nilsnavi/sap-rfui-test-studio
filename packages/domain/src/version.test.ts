import { describe, expect, it } from "vitest";

import {
  AppFailure,
  ApplicationVersion,
  configurationError,
  isAppError,
  toAppError,
} from "./index";

describe("ApplicationVersion — value object", () => {
  it("parses a plain release version", () => {
    const result = ApplicationVersion.parse("0.1.0");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.major).toBe(0);
    expect(result.value.minor).toBe(1);
    expect(result.value.patch).toBe(0);
    expect(result.value.isPrerelease).toBe(false);
    expect(result.value.toString()).toBe("0.1.0");
  });

  it("trims surrounding whitespace and keeps the pre-release label", () => {
    const result = ApplicationVersion.parse("  1.4.0-rc.2 ");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.label).toBe("rc.2");
    expect(result.value.isPrerelease).toBe(true);
    expect(result.value.toString()).toBe("1.4.0-rc.2");
  });

  it("rejects malformed version strings with a normalized configuration error", () => {
    for (const text of ["", "1", "1.2", "1.2.3.4", "v1.2.3", "1.2.x", "-1.0.0", "1.2.3-"]) {
      const result = ApplicationVersion.parse(text);

      expect(result.ok, text).toBe(false);
      if (result.ok) {
        continue;
      }
      expect(result.error.code).toBe("CONFIGURATION_ERROR");
      expect(result.error.message).toContain(text);
    }
  });

  it("rejects non-integer and negative components in create()", () => {
    expect(ApplicationVersion.create({ major: 1, minor: 2.5, patch: 0 }).ok).toBe(false);
    expect(ApplicationVersion.create({ major: 1, minor: 2, patch: -3 }).ok).toBe(false);
    expect(ApplicationVersion.create({ major: 1, minor: 2, patch: 3, label: "_bad" }).ok).toBe(
      false,
    );
  });

  it("orders releases above pre-releases and compares numerically, not lexically", () => {
    const v010 = mustParse("0.1.0");
    const v090 = mustParse("0.9.0");
    const v0100 = mustParse("0.10.0");
    const v0100Beta = mustParse("0.10.0-beta");

    expect(v010.compareTo(v090)).toBeLessThan(0);
    expect(v090.compareTo(v0100)).toBeLessThan(0);
    expect(v0100.isAtLeast(v090)).toBe(true);
    expect(v0100Beta.isAtLeast(v0100)).toBe(false);
    expect(v0100.equals(mustParse("0.10.0"))).toBe(true);
  });
});

describe("Error model", () => {
  it("keeps Error semantics and the normalized code", () => {
    const failure = configurationError("bad setting", "raw-detail");

    expect(failure).toBeInstanceOf(Error);
    expect(failure).toBeInstanceOf(AppFailure);
    expect(failure.code).toBe("CONFIGURATION_ERROR");
    expect(failure.message).toBe("bad setting");
    expect(failure.cause).toBe("raw-detail");
    expect(isAppError(failure)).toBe(true);
  });

  it("normalizes unknown thrown values into UNKNOWN without losing the cause", () => {
    const source = new Error("sqlite is locked");
    const normalized = toAppError(source, "storage write failed");

    expect(normalized.code).toBe("UNKNOWN");
    expect(normalized.message).toContain("storage write failed");
    expect(normalized.message).toContain("sqlite is locked");
    expect(normalized.cause).toBe(source);
  });

  it("passes through an already normalized failure untouched", () => {
    const original = configurationError("original");

    expect(toAppError(original, "ignored")).toBe(original);
  });

  it("does not treat arbitrary objects as AppError", () => {
    expect(isAppError({ code: "NOT_A_CODE", message: "x" })).toBe(false);
    expect(isAppError({ message: "x" })).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError("CONFIGURATION_ERROR")).toBe(false);
  });
});

function mustParse(text: string): ApplicationVersion {
  const result = ApplicationVersion.parse(text);
  if (!result.ok) {
    throw new Error(`Test fixture produced an invalid version: ${text}`);
  }
  return result.value;
}
