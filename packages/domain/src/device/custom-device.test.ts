import { describe, expect, it } from "vitest";

import { getDeviceProfile } from "./device-registry";
import {
  DEFAULT_CUSTOM_LANDSCAPE,
  DEFAULT_CUSTOM_PORTRAIT,
  SCREEN_SIZE_LIMITS,
  customDeviceIdFor,
  deriveOrientation,
  validateScreenDimensions,
  withCustomScreenSize,
} from "./custom-device";

describe("custom device rules", () => {
  it("keeps the legacy defaults 320×480 portrait and 800×480 landscape", () => {
    expect(DEFAULT_CUSTOM_PORTRAIT).toEqual({ width: 320, height: 480 });
    expect(DEFAULT_CUSTOM_LANDSCAPE).toEqual({ width: 800, height: 480 });
  });

  it("applies the single orientation rule width >= height → landscape (legacy updateDeviceInfo)", () => {
    expect(deriveOrientation(244, 400)).toBe("portrait");
    expect(deriveOrientation(800, 480)).toBe("landscape");
    expect(deriveOrientation(480, 480)).toBe("landscape"); // square is landscape by the same rule
    expect(deriveOrientation(479, 480)).toBe("portrait");
  });

  it("accepts the legacy input range 180..1200 × 200..1400 without blocking real SAP resolutions", () => {
    expect(SCREEN_SIZE_LIMITS).toEqual({
      minWidth: 180,
      maxWidth: 1200,
      minHeight: 200,
      maxHeight: 1400,
    });

    // ZRFUI_HOR 800×480, ZRFUI_RT40 244×400 and extremes of the legacy inputs:
    expect(validateScreenDimensions(800, 480).ok).toBe(true);
    expect(validateScreenDimensions(244, 400).ok).toBe(true);
    expect(validateScreenDimensions(180, 200).ok).toBe(true);
    expect(validateScreenDimensions(1200, 1400).ok).toBe(true);
  });

  it("rejects sizes outside the limits and non-integer values as VALIDATION_ERROR", () => {
    const tooWide = validateScreenDimensions(1201, 480);
    expect(tooWide.ok).toBe(false);
    if (!tooWide.ok) {
      expect(tooWide.error.code).toBe("VALIDATION_ERROR");
    }

    expect(validateScreenDimensions(179, 480).ok).toBe(false);
    expect(validateScreenDimensions(800, 1401).ok).toBe(false);
    expect(validateScreenDimensions(800.5, 480).ok).toBe(false);
    expect(validateScreenDimensions(Number.NaN, 480).ok).toBe(false);
  });

  it("routes dimensions to the matching custom id (legacy markCustomSize)", () => {
    expect(customDeviceIdFor({ width: 640, height: 480 })).toBe("custom-landscape");
    expect(customDeviceIdFor({ width: 320, height: 480 })).toBe("custom-portrait");
    expect(customDeviceIdFor({ width: 480, height: 480 })).toBe("custom-landscape");
  });

  it("rewrites only id, model, display name and screen when customizing a profile", () => {
    const base = getDeviceProfile("custom-portrait");
    const customized = withCustomScreenSize(base!, { width: 900, height: 500 });

    expect(customized.id).toBe("custom-landscape");
    expect(customized.displayName).toBe("Свой размер горизонтальный");
    expect(customized.screen).toEqual({ width: 900, height: 500, orientation: "landscape" });
    expect(customized.visualProfileId).toBe(base!.visualProfileId);
    expect(customized.capabilities).toEqual(base!.capabilities);
    // The registry profile itself must not be mutated.
    expect(base!.screen.width).toBe(320);
  });
});
