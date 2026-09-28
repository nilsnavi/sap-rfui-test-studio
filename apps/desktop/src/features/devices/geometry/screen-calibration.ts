/**
 * Per-device photo-shell screen calibration (presentation layer only).
 *
 * Every photo-based terminal has its own display window inside the shell
 * picture, so a single shared inset cannot position the ScreenOverlay
 * correctly for all of them. This registry stores, per `visualProfileId`:
 *
 *  - `frame`  — which rectangle of the source PNG is the device body and how
 *               it maps onto the drawn shell rect (the legacy reference used
 *               negative image offsets + clip-path for this; the naive
 *               "stretch the whole PNG over the shell" port was wrong).
 *  - `screen` — the screen overlay rect normalised to the drawn shell
 *               (0..1 fractions of shell width/height) plus its corner radius.
 *
 * How the numbers were obtained: the extracted PNGs were measured pixel by
 * pixel (device body bounding box and blue display-glass bounding box), and
 * the legacy crop offsets were cross-checked against the photo-mode CSS of
 * `reference/sap_rfui_emulator.html` (`.rt40-photo`, `.wt6000-photo`). The
 * screen fractions reproduce the legacy bezel-formula rect, which sits inside
 * the measured glass window with a visible bezel margin on every side.
 *
 * Nothing here touches the Domain: physical `DeviceGeometry`, the legacy
 * migration formulas and the logical screen resolutions stay authoritative —
 * this file only describes how the shell is *drawn*.
 */

export interface DeviceScreenCalibration {
  /** Left edge of the screen glass, fraction (0..1) of the drawn shell width. */
  readonly left: number;
  /** Top edge of the screen glass, fraction (0..1) of the drawn shell height. */
  readonly top: number;
  /** Width of the screen glass, fraction (0..1) of the drawn shell width. */
  readonly width: number;
  /** Height of the screen glass, fraction (0..1) of the drawn shell height. */
  readonly height: number;
  /** Corner radius of the glass in unscaled shell px. */
  readonly borderRadius: number;
}

/**
 * Region of the source PNG that represents the device body. The image is
 * drawn at `shellWidth / cropWidth` scale, offset by `-cropX/-cropY`, and the
 * shell clips the rest — exactly the legacy negative-offset + clip-path CSS.
 */
export interface ShellPhotoFrame {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly cropX: number;
  readonly cropY: number;
  readonly cropWidth: number;
  readonly cropHeight: number;
}

export interface PhotoShellCalibration {
  readonly screen: DeviceScreenCalibration;
  readonly frame: ShellPhotoFrame;
}

/**
 * Calibration for the three photo shells. Keys are `visualProfileId` values
 * from the Domain registry — components never branch on device ids.
 * Custom devices use the neutral CSS shell and need no entry.
 */
export const SCREEN_CALIBRATIONS: Readonly<Record<string, PhotoShellCalibration>> = {
  // PNG 2048 × 1405; body 488 × 1348 at (752, 28) — legacy `.rt40-photo`
  // offsets. Measured glass window: 347 × 577 px at (70, 106) inside the body.
  "rt40-photo": {
    screen: { left: 0.1661, top: 0.0902, width: 0.6678, height: 0.4056, borderRadius: 8 },
    frame: {
      imageWidth: 2048,
      imageHeight: 1405,
      cropX: 752,
      cropY: 28,
      cropWidth: 488,
      cropHeight: 1348,
    },
  },
  // PNG 1536 × 1024; the legacy CSS stretched the full picture over the shell
  // (`inset: 0; object-fit: fill`), so the crop is the whole image. Measured
  // glass window: 1057 × 715 px at (224, 216).
  "u2-photo": {
    screen: { left: 0.1679, top: 0.254, width: 0.6252, height: 0.4829, borderRadius: 6 },
    frame: {
      imageWidth: 1536,
      imageHeight: 1024,
      cropX: 0,
      cropY: 0,
      cropWidth: 1536,
      cropHeight: 1024,
    },
  },
  // PNG 1200 × 800; body 594 × 430 at (327, 185) — legacy `.wt6000-photo`
  // offsets. The display panel (incl. printed bezel) is 490 × 277 px at
  // (45, 83) inside the body; the P1–P3 hardware buttons start at body y ≈ 380.
  "wt6000-photo": {
    screen: { left: 0.2491, top: 0.3173, width: 0.5052, height: 0.4026, borderRadius: 6 },
    frame: {
      imageWidth: 1200,
      imageHeight: 800,
      cropX: 327,
      cropY: 185,
      cropWidth: 594,
      cropHeight: 430,
    },
  },
};

export function calibrationFor(visualProfileId: string | undefined): PhotoShellCalibration | null {
  if (visualProfileId === undefined) {
    return null;
  }
  return SCREEN_CALIBRATIONS[visualProfileId] ?? null;
}
