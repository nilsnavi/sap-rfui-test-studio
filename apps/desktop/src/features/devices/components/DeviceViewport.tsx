import type { ReactNode } from "react";

import type { DeviceSelection } from "@sap-rfui/application";

import { useAvailableSize } from "../hooks/use-available-size";
import { computePresentationScale, toPresentationGeometry } from "../geometry/presentation";
import { DeviceShell } from "./DeviceShell";

export interface DeviceViewportProps {
  readonly selection: DeviceSelection;
  readonly children: ReactNode;
}

/**
 * Measures the free stage area and fits the device into it with one uniform
 * scale: `min(availW / shellW, availH / shellH, 1)`. The scale is applied to
 * the whole shell (photo or CSS furniture) and to the ScreenOverlay through
 * the same transform, so proportions never change and the overlay can never
 * drift from its shell. Logical resolutions are untouched by this component.
 */
export function DeviceViewport({ selection, children }: DeviceViewportProps) {
  const [viewportRef, available] = useAvailableSize<HTMLDivElement>();

  const presentation = toPresentationGeometry(
    selection.geometry,
    selection.profile.visualProfileId,
  );
  const presentationScale = computePresentationScale(available, presentation);

  return (
    <div className="device-viewport" ref={viewportRef} data-testid="device-viewport">
      <div
        className="device-viewport__sizer"
        style={{
          width: presentation.shellWidth * presentationScale,
          height: presentation.shellHeight * presentationScale,
        }}
      >
        <DeviceShell
          profile={selection.profile}
          presentation={presentation}
          presentationScale={presentationScale}
        >
          {children}
        </DeviceShell>
      </div>
    </div>
  );
}
