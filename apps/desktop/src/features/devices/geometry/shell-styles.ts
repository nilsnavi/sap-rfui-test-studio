import type { CSSProperties } from "react";

import type { PresentationGeometry } from "./presentation";

/**
 * Geometry → CSS conversions (PROMPT-002 §6, §10). These are the only place
 * where presentation geometry numbers touch layout; components stay
 * device-agnostic (no `if (device === "rt40")` branches in the renderer).
 *
 * The input is `PresentationGeometry` — a strictly visual projection of the
 * authoritative domain `DeviceGeometry` (see geometry/presentation.ts).
 */

export function shellStyle(geometry: PresentationGeometry): CSSProperties {
  return {
    width: geometry.shellWidth,
    height: geometry.shellHeight,
  };
}

/** Neutral CSS shell: legacy `.terminal` proportions — radius 38/50, dark gradient. */
export function neutralShellStyle(geometry: PresentationGeometry): CSSProperties {
  return {
    ...shellStyle(geometry),
    borderRadius: `${geometry.cornerRadius ?? 38}px ${geometry.cornerRadius ?? 38}px 50px 50px`,
  };
}

/** Screen rectangle inside the shell (legacy `.screen-bezel` position/size). */
export function screenFrameStyle(geometry: PresentationGeometry): CSSProperties {
  return {
    position: "absolute",
    left: geometry.screenX,
    top: geometry.screenY,
    width: geometry.screenWidth,
    height: geometry.screenHeight,
    ...(geometry.screenBorderRadius !== undefined
      ? { borderRadius: geometry.screenBorderRadius }
      : {}),
  };
}

/**
 * Photo placement inside the shell rect from the calibration frame: the
 * source picture is drawn at shell scale and offset so that only the device
 * body crop is visible (the legacy negative-offset + clip-path CSS, ported
 * to an overflow-clipped shell). A full-image frame (U2) degenerates to the
 * plain shell-sized picture; no frame at all returns `{}` (CSS `inset: 0`).
 */
export function shellImageFrameStyle(geometry: PresentationGeometry): CSSProperties {
  const frame = geometry.photoFrame;
  if (frame === undefined) {
    return {};
  }
  const scaleX = geometry.shellWidth / frame.cropWidth;
  const scaleY = geometry.shellHeight / frame.cropHeight;
  return {
    left: -frame.cropX * scaleX,
    top: -frame.cropY * scaleY,
    width: frame.imageWidth * scaleX,
    height: frame.imageHeight * scaleY,
  };
}
