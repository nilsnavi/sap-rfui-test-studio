import type { ErrorBoundaryInfo } from "@sap-rfui/ui";

import type { AppSettings, WorkspaceStartupReport } from "@sap-rfui/application";
import { getAppInfo, initializeWorkspace, saveAppSettings } from "@sap-rfui/application";
import type { ReleaseChannel, Result } from "@sap-rfui/domain";
import type { StoragePort, TelemetryLogger, TelemetryPort } from "@sap-rfui/ports";
import { createTelemetryLogger, parseTelemetryLevel } from "@sap-rfui/ports";

import { ConsoleTelemetryAdapter } from "../../adapters/console-telemetry-adapter";
import { InMemoryStorageAdapter, WebStorageAdapter } from "../../adapters/web-storage-adapter";

/**
 * Composition root (ADR-001 §7).
 *
 * The only place allowed to know which concrete adapters the application runs on.
 * Screens and stores consume the narrow `AppContainer` surface below and never
 * instantiate infrastructure themselves.
 */
export interface AppContainer {
  readonly channel: ReleaseChannel;
  readonly storage: StoragePort;
  readonly telemetry: TelemetryLogger;
  readonly appInfo: ReturnType<typeof getAppInfo>;
  /** Failures travel as `Result`, never as exceptions, across the UI boundary. */
  initialize(): Promise<Result<WorkspaceStartupReport>>;
  persistSettings(settings: AppSettings): Promise<Result<AppSettings>>;
  /** Rendering failures are reported through the same telemetry abstraction. */
  reportRenderError(error: Error, info: ErrorBoundaryInfo): void;
}

function resolveChannel(): ReleaseChannel {
  return import.meta.env.MODE === "production" ? "stable" : "development";
}

function resolveStorage(logger: TelemetryLogger): StoragePort {
  try {
    const probe = "sap-rfui:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new WebStorageAdapter(window.localStorage);
  } catch (cause) {
    logger.warn("Persistent storage is unavailable, falling back to an in-memory store", {
      reason: cause instanceof Error ? cause.message : "unknown",
    });
    return new InMemoryStorageAdapter();
  }
}

/**
 * Optional substitution points used by component tests to inject a silent
 * telemetry sink and an ephemeral store. Production code calls `createContainer()`
 * without arguments.
 */
export interface ContainerOverrides {
  readonly telemetryPort?: TelemetryPort;
  readonly storage?: StoragePort;
}

export function createContainer(overrides: ContainerOverrides = {}): AppContainer {
  const channel = resolveChannel();
  const telemetryPort = overrides.telemetryPort ?? new ConsoleTelemetryAdapter();
  const rootLogger = createTelemetryLogger(telemetryPort, {
    scope: "sap-rfui",
    minimumLevel: parseTelemetryLevel(import.meta.env.VITE_LOG_LEVEL, "debug"),
  });

  const storage = overrides.storage ?? resolveStorage(rootLogger);
  const telemetry = rootLogger.child("application");
  const deps = { storage, telemetry };

  return {
    channel,
    storage,
    telemetry,
    appInfo: getAppInfo(channel),

    async initialize() {
      const result = await initializeWorkspace(deps, {
        channel,
        startedAt: new Date().toISOString(),
      });

      if (!result.ok) {
        deps.telemetry.error("Workspace initialization failed", { code: result.error.code });
      }
      return result;
    },

    async persistSettings(settings) {
      return saveAppSettings(deps, settings);
    },

    reportRenderError(error, info) {
      telemetry.error("React render failure", {
        message: error.message,
        stack: info.componentStack.slice(0, 240),
      });
    },
  };
}
