import type { HealthAssessment, HealthSignal, ReleaseChannel, Result } from "@sap-rfui/domain";
import {
  assessHealth,
  err,
  minimumSupportedVersion,
  ok,
  productVersion,
  toAppError,
} from "@sap-rfui/domain";
import type { StoragePort, TelemetryLogger } from "@sap-rfui/ports";

import { STORAGE_KEYS } from "../storage-keys";
import type { AppSettingsSnapshot } from "../settings/settings-service";
import { loadAppSettings } from "../settings/settings-service";
import type { AppInfoDto } from "../queries/app-info";
import { getAppInfo } from "../queries/app-info";

export interface WorkspaceStartupDependencies {
  readonly storage: StoragePort;
  readonly telemetry: TelemetryLogger;
}

export interface WorkspaceStartupRequest {
  readonly channel: ReleaseChannel;
  /** Injected by the composition root so the Application layer stays clock-free. */
  readonly startedAt: string;
}

export interface WorkspaceStartupReport {
  readonly app: AppInfoDto;
  readonly settings: AppSettingsSnapshot;
  readonly health: HealthAssessment;
  readonly startedAt: string;
}

const HEALTH_PROBE_VALUE = "probe";

/**
 * Startup orchestration for the desktop shell: settings load, subsystem probes,
 * aggregated health. All side effects go through ports; nothing here knows about
 * React, Tauri or a concrete storage engine.
 */
export async function initializeWorkspace(
  deps: WorkspaceStartupDependencies,
  request: WorkspaceStartupRequest,
): Promise<Result<WorkspaceStartupReport>> {
  const telemetry = deps.telemetry;
  const app = getAppInfo(request.channel);

  telemetry.info("Application startup", {
    product: app.productName,
    version: app.version,
    channel: app.channel,
  });

  const settings = await loadAppSettings({ storage: deps.storage, telemetry });
  if (!settings.ok) {
    telemetry.error("Startup aborted: settings could not be loaded", { code: settings.error.code });
    return err(settings.error);
  }

  const signals: HealthSignal[] = [
    await probeStorage(deps.storage, telemetry),
    probeTelemetry(telemetry),
    probeVersion(telemetry),
  ];

  const health = assessHealth(signals);
  telemetry.debug("Startup health evaluated", {
    state: health.state,
    checked: health.checkedCount,
  });

  return ok({
    app,
    settings: settings.value,
    health,
    startedAt: request.startedAt,
  });
}

async function probeStorage(
  storage: StoragePort,
  telemetry: TelemetryLogger,
): Promise<HealthSignal> {
  const id = "storage";
  try {
    await storage.write(STORAGE_KEYS.healthProbe, HEALTH_PROBE_VALUE);
    const readBack = await storage.read(STORAGE_KEYS.healthProbe);
    await storage.remove(STORAGE_KEYS.healthProbe);

    if (readBack !== HEALTH_PROBE_VALUE) {
      telemetry.warn("Storage probe returned an unexpected value", { expected: true });
      return { id, healthy: false, blocking: true, detail: "read-back mismatch" };
    }
    return { id, healthy: true, blocking: true };
  } catch (cause) {
    const failure = toAppError(cause, "Storage probe failed");
    telemetry.error("Storage probe failed", { code: failure.code });
    return { id, healthy: false, blocking: true, detail: failure.message };
  }
}

function probeTelemetry(telemetry: TelemetryLogger): HealthSignal {
  // A telemetry sink must never throw; reaching this line at all proves the
  // abstraction is wired. Non-blocking by design.
  telemetry.debug("Telemetry probe");
  return { id: "telemetry", healthy: true, blocking: false };
}

function probeVersion(telemetry: TelemetryLogger): HealthSignal {
  const current = productVersion();
  const minimum = minimumSupportedVersion();
  const healthy = current.isAtLeast(minimum);

  if (!healthy) {
    telemetry.error("Application version is below the supported minimum", {
      current: current.toString(),
      minimum: minimum.toString(),
    });
  }

  return {
    id: "version",
    healthy,
    blocking: true,
    detail: healthy ? current.toString() : `${current.toString()} < ${minimum.toString()}`,
  };
}
