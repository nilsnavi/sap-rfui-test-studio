import { describe, expect, it } from "vitest";

import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  deserializeAppSettings,
  parseAppSettings,
  serializeAppSettings,
} from "./app-settings";

describe("appSettingsSchema (Zod)", () => {
  it("applies documented defaults for a minimal valid payload", () => {
    const result = parseAppSettings({ schemaVersion: SETTINGS_SCHEMA_VERSION });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("rejects unknown keys so credentials cannot leak into persisted settings", () => {
    const result = parseAppSettings({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      sapPassword: "must-never-be-stored",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("CONFIGURATION_ERROR");
    expect(result.error.message).toContain("sapPassword");
  });

  it("rejects unsupported enum values and a wrong schema version", () => {
    expect(parseAppSettings({ ...DEFAULT_APP_SETTINGS, telemetryLevel: "trace" }).ok).toBe(false);
    expect(parseAppSettings({ ...DEFAULT_APP_SETTINGS, uiDensity: "roomy" }).ok).toBe(false);
    expect(parseAppSettings({ ...DEFAULT_APP_SETTINGS, schemaVersion: 99 }).ok).toBe(false);
    expect(parseAppSettings({ ...DEFAULT_APP_SETTINGS, telemetryEnabled: "yes" }).ok).toBe(false);
  });

  it("round-trips through the serialized representation", () => {
    const settings: typeof DEFAULT_APP_SETTINGS = {
      ...DEFAULT_APP_SETTINGS,
      telemetryLevel: "debug",
      uiDensity: "comfortable",
    };

    const serialized = serializeAppSettings(settings);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const deserialized = deserializeAppSettings(serialized.value);
    expect(deserialized.ok).toBe(true);
    if (deserialized.ok) {
      expect(deserialized.value).toEqual(settings);
    }
  });

  it("treats absent persisted data as defaults and broken JSON as a configuration error", () => {
    expect(deserializeAppSettings(null)).toEqual({ ok: true, value: DEFAULT_APP_SETTINGS });
    expect(deserializeAppSettings("   ")).toEqual({ ok: true, value: DEFAULT_APP_SETTINGS });

    const broken = deserializeAppSettings("{ not json");
    expect(broken.ok).toBe(false);
    if (broken.ok) {
      return;
    }
    expect(broken.error.code).toBe("CONFIGURATION_ERROR");
  });

  it("refuses to serialize a value that does not satisfy the schema", () => {
    const invalid = serializeAppSettings({
      ...DEFAULT_APP_SETTINGS,
      telemetryLevel: "verbose",
    } as unknown as typeof DEFAULT_APP_SETTINGS);

    expect(invalid.ok).toBe(false);
  });
});
