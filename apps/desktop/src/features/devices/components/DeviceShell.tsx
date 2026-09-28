import type { ReactNode } from "react";

import type { DeviceProfile } from "@sap-rfui/domain";

import type { PresentationGeometry } from "../geometry/presentation";
import { neutralShellStyle, shellImageFrameStyle, shellStyle } from "../geometry/shell-styles";
import { shellPhotoFor } from "../profiles/shell-assets";
import { DeviceKeypad } from "./DeviceKeypad";
import { ScreenOverlay } from "./ScreenOverlay";
import { ShellImage } from "./ShellImage";

export interface DeviceShellProps {
  readonly profile: DeviceProfile;
  readonly presentation: PresentationGeometry;
  /**
   * Uniform presentation scale (≤ 1, same factor on both axes). The whole
   * shell — photo or CSS furniture and the ScreenOverlay — lives under one
   * `transform`, so the overlay can never drift from the shell it belongs to.
   */
  readonly presentationScale: number;
  readonly children: ReactNode;
}

/**
 * Device shell renderer (PROMPT-002 §10, §14): one component for every
 * profile, driven only by DeviceProfile + presentation geometry data — there
 * is no per-device branching. Photo shells show the legacy terminal picture;
 * the neutral shell keeps the simple clean CSS frame with the visual keypad.
 */
export function DeviceShell({
  profile,
  presentation,
  presentationScale,
  children,
}: DeviceShellProps) {
  const photo = presentation.shellKind === "photo" ? shellPhotoFor(profile.visualProfileId) : null;

  const shellStyleValue =
    photo !== null ? shellStyle(presentation) : neutralShellStyle(presentation);

  return (
    <div
      className={
        photo !== null ? "device-shell device-shell--photo" : "device-shell device-shell--neutral"
      }
      style={{
        ...shellStyleValue,
        transform: `scale(${presentationScale})`,
        transformOrigin: "0 0",
      }}
      role="img"
      aria-label={`Эмулятор устройства: ${profile.displayName}`}
      data-testid="device-shell"
      data-presentation-scale={presentationScale}
    >
      {photo !== null ? (
        <ShellImage src={photo} frameStyle={shellImageFrameStyle(presentation)} />
      ) : (
        <>
          <div className="device-shell__speaker" aria-hidden="true" />
          {presentation.bezelPadding !== undefined ? (
            <div
              className="device-shell__bezel"
              aria-hidden="true"
              style={{
                left: presentation.screenX - presentation.bezelPadding,
                top: presentation.screenY - presentation.bezelPadding,
                width: presentation.screenWidth + presentation.bezelPadding * 2,
                height: presentation.screenHeight + presentation.bezelPadding * 2,
              }}
            />
          ) : null}
          {presentation.keypadTop !== undefined ? (
            <div
              className="device-shell__keypad-slot"
              style={{ top: presentation.keypadTop }}
              aria-hidden="true"
            >
              <DeviceKeypad />
            </div>
          ) : null}
          <div className="device-shell__grip" aria-hidden="true" />
        </>
      )}

      <ScreenOverlay
        presentation={presentation}
        presentationScale={presentationScale}
        screenWidth={profile.screen.width}
        screenHeight={profile.screen.height}
      >
        {children}
      </ScreenOverlay>
    </div>
  );
}
