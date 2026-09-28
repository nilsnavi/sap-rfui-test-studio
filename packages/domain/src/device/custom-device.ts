import type { DeviceOrientation, DeviceProfile } from "./device-profile";
import { validationError } from "../errors";
import type { Result } from "../result";
import { err, ok } from "../result";

/**
 * Custom screen sizes (PROMPT-002 §12).
 *
 * Limits are migrated verbatim from `reference/sap_rfui_emulator.html`:
 * width input `min="180" max="1200"`, height input `min="200" max="1400"` —
 * wide enough for every real SAP RFUI resolution used in the legacy tool.
 */
export const SCREEN_SIZE_LIMITS = {
  minWidth: 180,
  maxWidth: 1200,
  minHeight: 200,
  maxHeight: 1400,
} as const;

/** Legacy defaults: `custom_vertical: 320 × 480`, `custom_horizontal: 800 × 480`. */
export const DEFAULT_CUSTOM_PORTRAIT = { width: 320, height: 480 } as const;
export const DEFAULT_CUSTOM_LANDSCAPE = { width: 800, height: 480 } as const;

/**
 * The single orientation rule (PROMPT-002 §12), taken from legacy
 * `updateDeviceInfo()` / `markCustomSize()`: `width >= height → landscape`.
 * A square viewport is therefore treated as landscape, consistently everywhere.
 */
export function deriveOrientation(width: number, height: number): DeviceOrientation {
  return width >= height ? "landscape" : "portrait";
}

export interface ScreenDimensions {
  readonly width: number;
  readonly height: number;
}

/** Validate user-provided custom dimensions as integers inside the legacy limits. */
export function validateScreenDimensions(width: number, height: number): Result<ScreenDimensions> {
  const problems: string[] = [];

  if (!Number.isInteger(width)) {
    problems.push(`width must be an integer, got ${width}`);
  }
  if (!Number.isInteger(height)) {
    problems.push(`height must be an integer, got ${height}`);
  }
  if (
    Number.isInteger(width) &&
    (width < SCREEN_SIZE_LIMITS.minWidth || width > SCREEN_SIZE_LIMITS.maxWidth)
  ) {
    problems.push(
      `width ${width} is outside ${SCREEN_SIZE_LIMITS.minWidth}..${SCREEN_SIZE_LIMITS.maxWidth}`,
    );
  }
  if (
    Number.isInteger(height) &&
    (height < SCREEN_SIZE_LIMITS.minHeight || height > SCREEN_SIZE_LIMITS.maxHeight)
  ) {
    problems.push(
      `height ${height} is outside ${SCREEN_SIZE_LIMITS.minHeight}..${SCREEN_SIZE_LIMITS.maxHeight}`,
    );
  }

  if (problems.length > 0) {
    return err(validationError(`Invalid custom screen size: ${problems.join("; ")}`));
  }
  return ok({ width, height });
}

/** Custom profile id implied by the dimensions (legacy `markCustomSize()` behaviour). */
export function customDeviceIdFor(
  dimensions: ScreenDimensions,
): "custom-portrait" | "custom-landscape" {
  return deriveOrientation(dimensions.width, dimensions.height) === "landscape"
    ? "custom-landscape"
    : "custom-portrait";
}

/**
 * Apply validated custom dimensions to a custom profile: the screen size and
 * its derived orientation change, everything else (id rule, capabilities,
 * visual shell) stays as the registry defines it.
 */
export function withCustomScreenSize(
  profile: DeviceProfile,
  dimensions: ScreenDimensions,
): DeviceProfile {
  const id = customDeviceIdFor(dimensions);
  return {
    ...profile,
    id,
    model: id === "custom-landscape" ? "Custom Landscape" : "Custom Portrait",
    displayName:
      id === "custom-landscape" ? "Свой размер горизонтальный" : "Свой размер вертикальный",
    screen: {
      width: dimensions.width,
      height: dimensions.height,
      orientation: deriveOrientation(dimensions.width, dimensions.height),
    },
  };
}
