import { z } from "zod";

import type { AppError, Result } from "@sap-rfui/domain";
import { configurationError, createAppError, err, ok } from "@sap-rfui/domain";
import type { TelemetryLevel } from "@sap-rfui/ports";

/**
 * Local application settings (PROMPT-001 §11, SPEC-001 §12 — minimal subset).
 *
 * The schema is intentionally narrow and `.strict()`:
 * - unknown keys are rejected, so credentials or SAP connection data cannot be
 *   smuggled into persisted settings (ADR-001 Rule 12);
 * - device profiles, SAP environments and services arrive in later sprints and
 *   will get their own schemas, not extra fields here.
 */
export const SETTINGS_SCHEMA_VERSION = 1;

export const uiDensitySchema = z.enum(["comfortable", "compact"]);
export const telemetryLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export const appSettingsSchema = z
  .object({
    schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
    telemetryEnabled: z.boolean().default(true),
    telemetryLevel: telemetryLevelSchema.default("info"),
    uiDensity: uiDensitySchema.default("compact"),
  })
  .strict();

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type UiDensity = z.infer<typeof uiDensitySchema>;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  telemetryEnabled: true,
  telemetryLevel: "info",
  uiDensity: "compact",
};

export function toTelemetryLoggerLevel(level: AppSettings["telemetryLevel"]): TelemetryLevel {
  return level;
}

/** Validate an untrusted value (form input, parsed JSON) into `AppSettings`. */
export function parseAppSettings(raw: unknown): Result<AppSettings> {
  const parsed = appSettingsSchema.safeParse(raw);

  if (parsed.success) {
    return ok(parsed.data);
  }

  return err(
    configurationError(
      `Application settings are invalid: ${describeIssues(parsed.error)}`,
      collectedIssues(parsed.error),
    ),
  );
}

/** Parse the persisted JSON representation; empty input resolves to defaults. */
export function deserializeAppSettings(json: string | null): Result<AppSettings> {
  if (json === null || json.trim() === "") {
    return ok(DEFAULT_APP_SETTINGS);
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch (cause) {
    return err(
      createAppError(
        "CONFIGURATION_ERROR",
        "Persisted application settings are not valid JSON",
        cause,
      ),
    );
  }

  return parseAppSettings(decoded);
}

export function serializeAppSettings(settings: AppSettings): Result<string> {
  const validated = appSettingsSchema.safeParse(settings);
  if (!validated.success) {
    return err(
      configurationError(
        `Refusing to persist invalid application settings: ${describeIssues(validated.error)}`,
      ),
    );
  }
  return ok(JSON.stringify(validated.data, null, 2));
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
    .join("; ");
}

function collectedIssues(error: z.ZodError): AppError["cause"] {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    })),
  };
}
