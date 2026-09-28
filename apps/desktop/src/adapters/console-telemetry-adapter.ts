import type { TelemetryEntry, TelemetryLevel, TelemetryPort } from "@sap-rfui/ports";

type Sink = (message: string, extra?: unknown) => void;

/**
 * TelemetryPort implementation for the desktop webview.
 *
 * Only this class knows that "a log sink" currently means `console`. Swapping it
 * for a file/OTLP sink (Sprint M5) touches the composition root alone. Context is
 * already redacted by the telemetry logger boundary, never by call sites.
 */
export class ConsoleTelemetryAdapter implements TelemetryPort {
  private readonly sinks: Record<TelemetryLevel, Sink>;

  constructor(sinks: Partial<Record<TelemetryLevel, Sink>> = {}) {
    this.sinks = {
      debug: sinks.debug ?? ((message, extra) => console.debug(message, extra ?? "")),
      info: sinks.info ?? ((message, extra) => console.info(message, extra ?? "")),
      warn: sinks.warn ?? ((message, extra) => console.warn(message, extra ?? "")),
      error: sinks.error ?? ((message, extra) => console.error(message, extra ?? "")),
    };
  }

  emit(entry: TelemetryEntry): void {
    const scope = entry.scope ?? "app";
    const prefix = `${formatTimestamp(new Date())} ${entry.level.toUpperCase()} [${scope}]`;
    const extra = entry.context === undefined ? undefined : JSON.stringify(entry.context);

    try {
      const sink = this.sinks[entry.level] ?? this.sinks.info;
      sink(`${prefix} ${entry.message}`, extra);
    } catch {
      // Telemetry must never break a use case.
    }
  }
}

function formatTimestamp(value: Date): string {
  return value.toISOString().slice(11, 23);
}
