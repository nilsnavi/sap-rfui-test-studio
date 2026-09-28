import type { StoragePort, TelemetryEntry, TelemetryLogger, TelemetryPort } from "@sap-rfui/ports";
import { createTelemetryLogger } from "@sap-rfui/ports";

/**
 * Test doubles for the Application layer (ADR-001 Rule 15: Core must be testable
 * without SAP, Tauri or SQLite). Used by unit tests only — never by adapters.
 */

export interface MemoryStoragePort extends StoragePort {
  readonly records: Map<string, string>;
  /** Make the next operation of the given kind reject once. */
  failOnce(operation: "read" | "write" | "remove", error: Error): void;
}

export function createMemoryStoragePort(
  initial: Readonly<Record<string, string>> = {},
): MemoryStoragePort {
  const records = new Map<string, string>(Object.entries(initial));
  const failures = new Map<string, Error>();

  const consumeFailure = (operation: string): void => {
    const error = failures.get(operation);
    if (error !== undefined) {
      failures.delete(operation);
      throw error;
    }
  };

  return {
    records,
    failOnce(operation, error) {
      failures.set(operation, error);
    },
    async read(key) {
      consumeFailure("read");
      return records.get(key) ?? null;
    },
    async write(key, value) {
      consumeFailure("write");
      records.set(key, value);
    },
    async remove(key) {
      consumeFailure("remove");
      records.delete(key);
    },
  };
}

export interface RecordingTelemetry {
  readonly logger: TelemetryLogger;
  readonly entries: TelemetryEntry[];
  levels(): string[];
  messages(): string[];
}

export function createRecordingTelemetry(
  scope = "test",
  minimumLevel: "debug" | "info" | "warn" | "error" = "debug",
): RecordingTelemetry {
  const entries: TelemetryEntry[] = [];

  const port: TelemetryPort = {
    emit(entry) {
      entries.push(entry);
    },
  };

  return {
    entries,
    logger: createTelemetryLogger(port, { scope, minimumLevel }),
    levels: () => entries.map((entry) => entry.level),
    messages: () => entries.map((entry) => entry.message),
  };
}
