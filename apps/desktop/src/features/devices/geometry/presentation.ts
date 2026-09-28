import type { DeviceGeometry, Size } from "@sap-rfui/domain";
import { computeFitScale } from "@sap-rfui/domain";

import { type ShellPhotoFrame, calibrationFor } from "./screen-calibration";

/**
 * Presentation geometry (visual layout only).
 *
 * Physical `DeviceGeometry` from the Domain layer stays authoritative and is
 * never mutated here: these helpers describe how the shell is *drawn* inside
 * the UI (fit into the stage, embed the screen overlay into the device glass).
 * Logical screen resolution (244 × 400, 800 × 480, …) is untouched by any
 * number in this file — see docs/migration/device-profile-migration.md for
 * the authoritative legacy parity values.
 */

export interface PresentationGeometry {
  readonly shellWidth: number;
  readonly shellHeight: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly shellKind: DeviceGeometry["shellKind"];
  readonly cornerRadius?: number;
  readonly bezelPadding?: number;
  readonly keypadTop?: number;
  /** Glass corner radius for photo overlays (from the calibration registry). */
  readonly screenBorderRadius?: number;
  /**
   * Source-PNG crop mapping for photo shells (see screen-calibration.ts).
   * Undefined means "the picture fills the shell rect as-is".
   */
  readonly photoFrame?: ShellPhotoFrame;
}

/**
 * Physical geometry → presentation geometry.
 *
 * Photo shells are positioned from the per-device calibration registry:
 * every device has its own display window inside the shell picture, so the
 * overlay rect is `shell × calibration` fractions — never one shared inset.
 * The neutral shell keeps an identity projection of the physical rect.
 * `visualProfileId` comes from the (already resolved) DeviceProfile; custom
 * devices have no calibration entry and fall back to the physical rect.
 */
export function toPresentationGeometry(
  geometry: DeviceGeometry,
  visualProfileId?: string,
): PresentationGeometry {
  const shell = {
    shellWidth: geometry.shellWidth,
    shellHeight: geometry.shellHeight,
    shellKind: geometry.shellKind,
    cornerRadius: geometry.cornerRadius,
    bezelPadding: geometry.bezelPadding,
    keypadTop: geometry.keypadTop,
  } as const;

  if (geometry.shellKind === "photo") {
    const calibration = calibrationFor(visualProfileId);
    if (calibration === null) {
      return {
        ...shell,
        screenX: geometry.screenX,
        screenY: geometry.screenY,
        screenWidth: geometry.screenWidth,
        screenHeight: geometry.screenHeight,
      };
    }
    const { screen, frame } = calibration;
    return {
      ...shell,
      screenX: geometry.shellWidth * screen.left,
      screenY: geometry.shellHeight * screen.top,
      screenWidth: geometry.shellWidth * screen.width,
      screenHeight: geometry.shellHeight * screen.height,
      screenBorderRadius: screen.borderRadius,
      photoFrame: frame,
    };
  }

  return {
    ...shell,
    screenX: geometry.screenX,
    screenY: geometry.screenY,
    screenWidth: geometry.screenWidth,
    screenHeight: geometry.screenHeight,
  };
}

/**
 * Uniform presentation scale: one number for both axes, capped at 1, never
 * `scaleX/scaleY` pairs. It shrinks the shell to fit the stage but keeps the
 * physical aspect ratio; the logical screen resolution is unaffected.
 */
export function computePresentationScale(
  available: Size,
  presentation: PresentationGeometry,
): number {
  return computeFitScale(available, {
    width: presentation.shellWidth,
    height: presentation.shellHeight,
  });
}
