/**
 * Pure domain service for subsystem health aggregation.
 *
 * The foundation exposes it so every surface (Dashboard, later Diagnostics) can
 * derive one consistent status from independent signals. It has no knowledge of
 * UI, storage, SAP or Tauri.
 */

export type HealthState = "OK" | "DEGRADED" | "FAILED";

export interface HealthSignal {
  /** Stable identifier of the checked subsystem, e.g. `storage`, `telemetry`. */
  readonly id: string;
  readonly healthy: boolean;
  /** A blocking signal pulls the whole aggregate down to `FAILED`. */
  readonly blocking: boolean;
  /** Optional human-readable detail; must never contain secrets. */
  readonly detail?: string;
}

export interface HealthAssessment {
  readonly state: HealthState;
  readonly checkedCount: number;
  readonly unhealthyIds: readonly string[];
  readonly blockingIds: readonly string[];
}

/**
 * Derive the aggregate health state:
 * - `FAILED`   — at least one blocking signal is unhealthy;
 * - `DEGRADED` — a non-blocking signal is unhealthy;
 * - `OK`       — all signals healthy (an empty set counts as `OK`: nothing failed).
 */
export function assessHealth(signals: readonly HealthSignal[]): HealthAssessment {
  const unhealthyIds: string[] = [];
  const blockingIds: string[] = [];

  for (const signal of signals) {
    if (signal.healthy) {
      continue;
    }
    unhealthyIds.push(signal.id);
    if (signal.blocking) {
      blockingIds.push(signal.id);
    }
  }

  const state: HealthState =
    blockingIds.length > 0 ? "FAILED" : unhealthyIds.length > 0 ? "DEGRADED" : "OK";

  return {
    state,
    checkedCount: signals.length,
    unhealthyIds,
    blockingIds,
  };
}

export function isHealthy(assessment: HealthAssessment): boolean {
  return assessment.state === "OK";
}
