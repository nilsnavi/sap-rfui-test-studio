import { describe, expect, it } from "vitest";

import type { AppSettings } from "./app-settings";
import { DEFAULT_APP_SETTINGS, serializeAppSettings } from "./app-settings";
import { loadAppSettings, saveAppSettings } from "./settings-service";
import { STORAGE_KEYS } from "../storage-keys";
import { createMemoryStoragePort, createRecordingTelemetry } from "../testing/fake-ports";

function storedJson(overrides: Partial<typeof DEFAULT_APP_SETTINGS> = {}): string {
  const settings = { ...DEFAULT_APP_SETTINGS, ...overrides };
  const serialized = serializeAppSettings(settings);
  if (!serialized.ok) {
    throw new Error("Test fixture must produce valid settings");
  }
  return serialized.value;
}

describe("loadAppSettings", () => {
  it("returns defaults when nothing was persisted yet", async () => {
    const storage = createMemoryStoragePort();
    const telemetry = createRecordingTelemetry();

    const result = await loadAppSettings({ storage, telemetry: telemetry.logger });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.settings).toEqual(DEFAULT_APP_SETTINGS);
    expect(result.value.source).toBe("defaults");
    expect(result.value.recovery).toBeUndefined();
  });

  it("restores persisted settings and reports the source", async () => {
    const storage = createMemoryStoragePort({
      [STORAGE_KEYS.appSettings]: storedJson({ telemetryLevel: "debug" }),
    });
    const telemetry = createRecordingTelemetry();

    const result = await loadAppSettings({ storage, telemetry: telemetry.logger });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.source).toBe("stored");
    expect(result.value.settings.telemetryLevel).toBe("debug");
  });

  it("recovers from corrupted data: defaults are returned and the reason is logged", async () => {
    const storage = createMemoryStoragePort({ [STORAGE_KEYS.appSettings]: "}} broken json" });
    const telemetry = createRecordingTelemetry();

    const result = await loadAppSettings({ storage, telemetry: telemetry.logger });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.settings).toEqual(DEFAULT_APP_SETTINGS);
    expect(result.value.recovery?.reason).toContain("JSON");
    expect(telemetry.levels()).toContain("warn");
  });

  it("propagates a storage failure instead of silently resetting user configuration", async () => {
    const storage = createMemoryStoragePort();
    storage.failOnce("read", new Error("database is locked"));
    const telemetry = createRecordingTelemetry();

    const result = await loadAppSettings({ storage, telemetry: telemetry.logger });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNKNOWN");
    expect(result.error.message).toContain("Unable to read application settings");
    expect(telemetry.levels()).toContain("error");
  });
});

describe("saveAppSettings", () => {
  it("writes the serialized snapshot and logs at info level", async () => {
    const storage = createMemoryStoragePort();
    const telemetry = createRecordingTelemetry();

    const result = await saveAppSettings(
      { storage, telemetry: telemetry.logger },
      { ...DEFAULT_APP_SETTINGS, uiDensity: "comfortable" },
    );

    expect(result.ok).toBe(true);
    expect(storage.records.get(STORAGE_KEYS.appSettings)).toContain("comfortable");
    expect(telemetry.messages()).toContain("Application settings saved");
  });

  it("does not write anything when validation fails", async () => {
    const storage = createMemoryStoragePort();
    const telemetry = createRecordingTelemetry();

    const invalid = {
      ...DEFAULT_APP_SETTINGS,
      telemetryLevel: "everything",
    } as unknown as typeof DEFAULT_APP_SETTINGS;

    const result = await saveAppSettings({ storage, telemetry: telemetry.logger }, invalid);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("CONFIGURATION_ERROR");
    expect(storage.records.size).toBe(0);
  });

  it("normalizes a storage write failure into the app error model", async () => {
    const storage = createMemoryStoragePort();
    storage.failOnce("write", new Error("quota exceeded"));
    const telemetry = createRecordingTelemetry();

    const result = await saveAppSettings(
      { storage, telemetry: telemetry.logger },
      DEFAULT_APP_SETTINGS,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.message).toContain("Unable to write application settings");
    expect(telemetry.levels()).toContain("error");
  });

  it("round-trips: a saved snapshot is loaded back unchanged", async () => {
    const storage = createMemoryStoragePort();
    const telemetry = createRecordingTelemetry();
    const draft: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      telemetryLevel: "warn",
      telemetryEnabled: false,
    };

    const saved = await saveAppSettings({ storage, telemetry: telemetry.logger }, draft);
    expect(saved.ok).toBe(true);

    const loaded = await loadAppSettings({ storage, telemetry: telemetry.logger });
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.settings).toEqual(draft);
      expect(loaded.value.source).toBe("stored");
    }
  });
});
