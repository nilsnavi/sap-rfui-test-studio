/**
 * TelemetryPort — contract for the logging/observability sink.
 *
 * React components and use cases depend on this abstraction instead of calling
 * `console` directly, so the sink (stdout, rolling file, OTLP) can be swapped in
 * the composition root without touching product code.
 */
export type TelemetryLevel = "debug" | "info" | "warn" | "error";

export type TelemetryContextValue = string | number | boolean | null;

export type TelemetryContext = Readonly<Partial<Record<string, TelemetryContextValue>>>;

export interface TelemetryEntry {
  readonly level: TelemetryLevel;
  readonly message: string;
  readonly scope?: string;
  readonly context?: TelemetryContext;
}

export interface TelemetryPort {
  /** Implementations must be non-throwing: telemetry failures cannot break a use case. */
  emit(entry: TelemetryEntry): void;
}
