import type { ReactNode } from "react";

import type { DeviceSelection } from "@sap-rfui/application";

import { DeviceViewport } from "./DeviceViewport";

export interface DeviceStageProps {
  readonly selection: DeviceSelection;
  readonly children: ReactNode;
}

/**
 * Presentation-only stage for the device emulator: a calm canvas panel with
 * ≥ 32 px padding where the device is centered on both axes and refits
 * smoothly on window resize. It carries no device knowledge beyond the
 * selection it passes down to the viewport.
 */
export function DeviceStage({ selection, children }: DeviceStageProps) {
  return (
    <div className="device-stage" data-testid="device-stage">
      <DeviceViewport selection={selection}>{children}</DeviceViewport>
    </div>
  );
}
