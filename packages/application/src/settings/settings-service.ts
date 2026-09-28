import type { Result } from "@sap-rfui/domain";
import { AppFailure, err, ok, toAppError } from "@sap-rfui/domain";
import type { StoragePort, TelemetryLogger } from "@sap-rfui/ports";

import { STORAGE_KEYS } from "../storage-keys";
import type { AppSettings } from "./app-settings";
import { DEFAULT_APP_SETTINGS, deserializeAppSettings } from "./app-settings";

export type AppSettingsSource = "defaults" | "stored";

export interface AppSettingsSnapshot {
  readonly settings: AppSettings;
  readonly source: AppSettingsSource;
  /** Present when stored data existed but could not be used. */
  readonly recovery?: { readonly reason: string };
}

export interface AppSettingsDependencies {
  readonly storage: StoragePort;
  readonly telemetry: TelemetryLogger;
}

/**
 * Load persisted settings.
 *
 * A missing record is a normal state and yields defaults. A storage read failure
 * is propagated as a `Result` failure — the UI must show it instead of silently
 * resetting the user's configuration.
 */
export async function loadAppSettings(
  deps: AppSettingsDependencies,
): Promise<Result<AppSettingsSnapshot>> {
  const { storage, telemetry } = deps;

  try {
    const stored = await storage.read(STORAGE_KEYS.appSettings);
    const parsed = deserializeAppSettings(stored);

    if (!parsed.ok) {
      telemetry.warn("Persisted application settings are unusable, falling back to defaults", {
        reason: parsed.error.message,
      });
      return ok({
        settings: DEFAULT_APP_SETTINGS,
        source: "defaults",
        recovery: { reason: parsed.error.message },
      });
    }

    return ok({
      settings: parsed.value,
      source: stored === null || stored.trim() === "" ? "defaults" : "stored",
    });
  } catch (cause) {
    const failure = toAppError(cause, "Unable to read application settings from storage");
    telemetry.error("Application settings could not be read", { code: failure.code });
    return err(failure);
  }
}

/** Persist validated settings. Serialization is validated before any write. */
export async function saveAppSettings(
  deps: AppSettingsDependencies,
  settings: AppSettings,
): Promise<Result<AppSettings>> {
  const { storage, telemetry } = deps;

  // Revalidate defensively: callers may pass a partially edited draft.
  const validated = deserializeAppSettings(JSON.stringify(settings));
  if (!validated.ok) {
    telemetry.warn("Application settings rejected before save", {
      reason: validated.error.message,
    });
    return err(validated.error);
  }

  try {
    await storage.write(STORAGE_KEYS.appSettings, JSON.stringify(validated.value));
  } catch (cause) {
    const failure = toAppError(cause, "Unable to write application settings to storage");
    telemetry.error("Application settings could not be saved", { code: failure.code });
    return err(new AppFailure(failure.code, failure.message, failure.cause));
  }

  telemetry.info("Application settings saved");
  return ok(validated.value);
}
