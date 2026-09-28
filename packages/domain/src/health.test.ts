import { describe, expect, it } from "vitest";

import type { HealthSignal } from "./health";
import { assessHealth, isHealthy } from "./health";

const storage: HealthSignal = { id: "storage", healthy: true, blocking: true };
const telemetry: HealthSignal = { id: "telemetry", healthy: true, blocking: false };

describe("assessHealth — pure domain service", () => {
  it("returns OK when every signal is healthy", () => {
    const assessment = assessHealth([storage, telemetry]);

    expect(assessment.state).toBe("OK");
    expect(assessment.checkedCount).toBe(2);
    expect(assessment.unhealthyIds).toEqual([]);
    expect(isHealthy(assessment)).toBe(true);
  });

  it("treats an empty signal set as OK (nothing checked means nothing failed)", () => {
    expect(assessHealth([]).state).toBe("OK");
  });

  it("returns DEGRADED when a non-blocking signal is unhealthy", () => {
    const assessment = assessHealth([
      storage,
      { id: "telemetry", healthy: false, blocking: false, detail: "sink unavailable" },
    ]);

    expect(assessment.state).toBe("DEGRADED");
    expect(assessment.unhealthyIds).toEqual(["telemetry"]);
    expect(assessment.blockingIds).toEqual([]);
  });

  it("returns FAILED when a blocking signal is unhealthy, even alongside other failures", () => {
    const assessment = assessHealth([
      { id: "storage", healthy: false, blocking: true },
      { id: "telemetry", healthy: false, blocking: false },
      { id: "config", healthy: true, blocking: true },
    ]);

    expect(assessment.state).toBe("FAILED");
    expect(assessment.blockingIds).toEqual(["storage"]);
    expect(assessment.unhealthyIds).toEqual(["storage", "telemetry"]);
  });

  it("does not mutate the input signals", () => {
    const signals: HealthSignal[] = [{ id: "storage", healthy: false, blocking: true }];
    const snapshot = signals.map((signal) => ({ ...signal }));

    assessHealth(signals);

    expect(signals).toEqual(snapshot);
  });
});
