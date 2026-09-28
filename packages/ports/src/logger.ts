import type {
  TelemetryContext,
  TelemetryContextValue,
  TelemetryLevel,
  TelemetryPort,
} from "./telemetry-port";

/**
 * Lightweight telemetry abstraction on top of `TelemetryPort`.
 *
 * Responsibilities that must not be re-implemented per component:
 * - level filtering;
 * - scope propagation;
 * - secret redaction (ADR-001 Rule 12, PROMPT-001 §19).
 */

const LEVEL_ORDER: Record<TelemetryLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const DEFAULT_TELEMETRY_LEVEL: TelemetryLevel = "info";

export const REDACTED_PLACEHOLDER = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|passcode|token|secret|cookie|authorization|auth|api[_-]?key|access[_-]?key|credential|session[_-]?id)/i;

export function parseTelemetryLevel(
  value: string | undefined | null,
  fallback: TelemetryLevel = DEFAULT_TELEMETRY_LEVEL,
): TelemetryLevel {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "debug" ||
    normalized === "info" ||
    normalized === "warn" ||
    normalized === "error"
    ? normalized
    : fallback;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

/** Replace values under sensitive-looking keys so secrets never reach a sink. */
export function redactContext(context: TelemetryContext | undefined): TelemetryContext | undefined {
  if (context === undefined) {
    return undefined;
  }

  const redacted: Record<string, TelemetryContextValue> = {};
  for (const [key, value] of Object.entries(context)) {
    redacted[key] = isSensitiveKey(key) ? REDACTED_PLACEHOLDER : (value ?? null);
  }
  return redacted;
}

export function isLevelEnabled(minimum: TelemetryLevel, candidate: TelemetryLevel): boolean {
  return LEVEL_ORDER[candidate] >= LEVEL_ORDER[minimum];
}

export interface TelemetryLogger {
  readonly scope: string;
  readonly minimumLevel: TelemetryLevel;
  isEnabled(level: TelemetryLevel): boolean;
  debug(message: string, context?: TelemetryContext): void;
  info(message: string, context?: TelemetryContext): void;
  warn(message: string, context?: TelemetryContext): void;
  error(message: string, context?: TelemetryContext): void;
  /** `application.startup` + `storage` → `application.startup.storage` */
  child(subScope: string): TelemetryLogger;
}

export interface TelemetryLoggerOptions {
  readonly scope: string;
  readonly minimumLevel?: TelemetryLevel;
}

export function createTelemetryLogger(
  port: TelemetryPort,
  options: TelemetryLoggerOptions,
): TelemetryLogger {
  const scope = options.scope.trim();
  const minimumLevel = options.minimumLevel ?? DEFAULT_TELEMETRY_LEVEL;

  const log = (level: TelemetryLevel, message: string, context?: TelemetryContext): void => {
    if (!isLevelEnabled(minimumLevel, level)) {
      return;
    }
    const redacted = redactContext(context);
    port.emit({
      level,
      message,
      scope,
      ...(redacted === undefined ? {} : { context: redacted }),
    });
  };

  return {
    scope,
    minimumLevel,
    isEnabled: (level: TelemetryLevel) => isLevelEnabled(minimumLevel, level),
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
    child: (subScope: string) =>
      createTelemetryLogger(port, {
        scope: subScope.trim() === "" ? scope : `${scope}.${subScope.trim()}`,
        minimumLevel,
      }),
  };
}
