import { describe, expect, it } from "vitest";

import { STORAGE_KEYS } from "../storage-keys";
import { createMemoryStoragePort, createRecordingTelemetry } from "../testing/fake-ports";
import { initializeWorkspace } from "./initialize-workspace";

const request = { channel: "development", startedAt: "2026-01-01T00:00:00.000Z" } as const;

describe("initializeWorkspace", () => {
  it("produces a startup report with healthy subsystems on a clean workspace", async () => {
    const storage = createMemoryStoragePort();
    const telemetry = createRecordingTelemetry("application");

    const result = await initializeWorkspace(
      { storage, telemetry: telemetry.logger },
      { ...request },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.app.productName).toBe("SAP RFUI Test Studio");
    expect(result.value.app.version).toBe("0.1.0");
    expect(result.value.app.buildLabel).toBe("0.1.0 (development build)");
    expect(result.value.settings.source).toBe("defaults");
    expect(result.value.health.state).toBe("OK");
    expect(result.value.health.checkedCount).toBe(3);
    expect(result.value.startedAt).toBe(request.startedAt);
  });

  it("leaves no probe residue in storage and records the startup sequence in telemetry", async () => {
    const storage = createMemoryStoragePort();
    const telemetry = createRecordingTelemetry("application");

    await initializeWorkspace({ storage, telemetry: telemetry.logger }, { ...request });

    expect(storage.records.has(STORAGE_KEYS.healthProbe)).toBe(false);
    expect(telemetry.messages()[0]).toBe("Application startup");
    expect(telemetry.levels()).toContain("debug");
  });

  it("restores the persisted configuration as part of the report", async () => {
    const storage = createMemoryStoragePort({
      [STORAGE_KEYS.appSettings]: JSON.stringify({
        schemaVersion: 1,
        telemetryEnabled: false,
        telemetryLevel: "error",
        uiDensity: "comfortable",
      }),
    });
    const telemetry = createRecordingTelemetry("application");

    const result = await initializeWorkspace(
      { storage, telemetry: telemetry.logger },
      { ...request },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.settings.source).toBe("stored");
    expect(result.value.settings.settings.telemetryLevel).toBe("error");
  });

  it("aborts with a normalized error when storage is unavailable", async () => {
    const storage = createMemoryStoragePort();
    storage.failOnce("read", new Error("database file is missing"));
    const telemetry = createRecordingTelemetry("application");

    const result = await initializeWorkspace(
      { storage, telemetry: telemetry.logger },
      { ...request },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNKNOWN");
    expect(telemetry.messages()).toContain("Startup aborted: settings could not be loaded");
  });

  it("reports FAILED (not an exception) when the storage probe cannot write", async () => {
    const storage = createWritableFailingStorage();
    const telemetry = createRecordingTelemetry("application");

    const result = await initializeWorkspace(
      { storage, telemetry: telemetry.logger },
      { ...request },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.health.state).toBe("FAILED");
    expect(result.value.health.blockingIds).toContain("storage");
  });
});

/** Read works (settings load succeeds), write is broken (probe fails). */
function createWritableFailingStorage() {
  const storage = createMemoryStoragePort();
  const originalWrite = storage.write.bind(storage);
  let armed = true;

  return {
    ...storage,
    async write(key: string, value: string) {
      if (key === STORAGE_KEYS.healthProbe && armed) {
        armed = false;
        throw new Error("read-only volume");
      }
      await originalWrite(key, value);
    },
  };
}
