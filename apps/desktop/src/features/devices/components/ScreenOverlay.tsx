import type { ReactNode } from "react";

import { computeScreenContentScale } from "@sap-rfui/domain";

import type { PresentationGeometry } from "../geometry/presentation";
import { screenFrameStyle } from "../geometry/shell-styles";
import { DeviceScreen } from "./DeviceScreen";

export interface ScreenOverlayProps {
  readonly presentation: PresentationGeometry;
  /** Uniform stage scale shared with the shell (both live under one transform). */
  readonly presentationScale: number;
  /** Logical RFUI resolution width (profile.screen.width). */
  readonly screenWidth: number;
  /** Logical RFUI resolution height (profile.screen.height). */
  readonly screenHeight: number;
  readonly children: ReactNode;
}

/**
 * The physical glass of the device inside the shell.
 *
 * Positioned by the per-device presentation geometry — for photo shells the
 * rect comes from the screen calibration registry (each device has its own
 * display window inside the shell picture), so the overlay reads as embedded
 * in the glass instead of a rectangle pasted over the photo. Clipped to its
 * rounded bezel (`overflow: hidden`), so the screen background never spills
 * over the shell. The content scale is uniform (`contain`), so the RFUI
 * aspect ratio and the logical resolution label never change.
 */
export function ScreenOverlay({
  presentation,
  presentationScale,
  screenWidth,
  screenHeight,
  children,
}: ScreenOverlayProps) {
  const contentScale = computeScreenContentScale(
    { width: screenWidth, height: screenHeight },
    { width: presentation.screenWidth, height: presentation.screenHeight },
  );
  const contentWidth = screenWidth * contentScale;
  const contentHeight = screenHeight * contentScale;

  return (
    <div
      className={`device-screen device-screen--${presentation.shellKind}`}
      style={screenFrameStyle(presentation)}
      data-testid="device-screen"
      data-presentation-scale={presentationScale}
      aria-label={`Экран устройства ${screenWidth} × ${screenHeight}`}
    >
      <DeviceScreen
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        contentScale={contentScale}
        left={(presentation.screenWidth - contentWidth) / 2}
        top={(presentation.screenHeight - contentHeight) / 2}
      >
        {children}
      </DeviceScreen>
      <div className="device-screen__label" data-testid="device-screen-label">
        {screenWidth} × {screenHeight}
      </div>
    </div>
  );
}
