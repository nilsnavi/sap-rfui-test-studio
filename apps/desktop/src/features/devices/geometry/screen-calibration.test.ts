import { describe, expect, it } from "vitest";

import { DEVICE_ENTRIES, computeScreenContentScale, getDeviceEntry } from "@sap-rfui/domain";

import { toPresentationGeometry } from "./presentation";
import { SCREEN_CALIBRATIONS, calibrationFor } from "./screen-calibration";

/**
 * Unit checks for the per-device screen calibration registry (presentation
 * layer). The glass windows below were measured pixel by pixel on the
 * extracted shell PNGs (device-body crop first, then the blue display glass
 * bounding box) and are recorded in docs/migration/device-profile-migration.md
 * — they are the visual acceptance bounds the calibrated rect must respect.
 */

const photoEntries = DEVICE_ENTRIES.filter((entry) => entry.geometry.shellKind === "photo");

/** Measured display-glass windows as fractions of the drawn shell rect. */
const MEASURED_GLASS: Readonly<
  Record<string, { left: number; top: number; right: number; bottom: number }>
> = {
  // RT40: glass 347 × 577 px at (70, 106) inside the 488 × 1348 body crop.
  "rt40-photo": { left: 70 / 488, top: 106 / 1348, right: 417 / 488, bottom: 683 / 1348 },
  // U2: glass 1057 × 715 px at (224, 216) inside the 1536 × 1024 picture.
  "u2-photo": { left: 224 / 1536, top: 216 / 1024, right: 1281 / 1536, bottom: 931 / 1024 },
  // WT6000: display panel 490 × 277 px at (45, 83) inside the 594 × 430 body
  // crop; the P1–P3 hardware buttons start at body y ≈ 380.
  "wt6000-photo": { left: 45 / 594, top: 83 / 430, right: 535 / 594, bottom: 360 / 430 },
};

describe("screen calibration registry", () => {
  it("has a calibration for every photo-based device", () => {
    expect(photoEntries.length).toBe(3);
    for (const entry of photoEntries) {
      expect(calibrationFor(entry.profile.visualProfileId)).not.toBeNull();
    }
  });

  it("stores normalized values in 0..1 that fit inside the shell", () => {
    for (const calibration of Object.values(SCREEN_CALIBRATIONS)) {
      const { left, top, width, height, borderRadius } = calibration.screen;
      for (const value of [left, top, width, height]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(left + width).toBeLessThanOrEqual(1);
      expect(top + height).toBeLessThanOrEqual(1);
      expect(borderRadius).toBeGreaterThan(0);
    }
  });

  it("projects a screen rect inside the shell bounds for every photo device", () => {
    for (const entry of photoEntries) {
      const p = toPresentationGeometry(entry.geometry, entry.profile.visualProfileId);
      expect(p.screenX).toBeGreaterThanOrEqual(0);
      expect(p.screenY).toBeGreaterThanOrEqual(0);
      expect(p.screenX + p.screenWidth).toBeLessThan(p.shellWidth);
      expect(p.screenY + p.screenHeight).toBeLessThan(p.shellHeight);
    }
  });

  it("keeps the calibrated rect inside the measured display glass", () => {
    for (const entry of photoEntries) {
      const glass = MEASURED_GLASS[entry.profile.visualProfileId ?? ""];
      expect(glass).toBeDefined();
      const { left, top, width, height } = calibrationFor(entry.profile.visualProfileId)!.screen;
      expect(left).toBeGreaterThanOrEqual(glass!.left);
      expect(top).toBeGreaterThanOrEqual(glass!.top);
      expect(left + width).toBeLessThanOrEqual(glass!.right);
      expect(top + height).toBeLessThanOrEqual(glass!.bottom);
    }
  });

  it("contains the logical content with a uniform scale (no aspect distortion)", () => {
    for (const entry of photoEntries) {
      const p = toPresentationGeometry(entry.geometry, entry.profile.visualProfileId);
      const logical = { width: entry.profile.screen.width, height: entry.profile.screen.height };
      const scale = computeScreenContentScale(logical, {
        width: p.screenWidth,
        height: p.screenHeight,
      });
      const contentWidth = logical.width * scale;
      const contentHeight = logical.height * scale;
      // One factor on both axes → the logical aspect ratio is preserved …
      expect(contentWidth / contentHeight).toBeCloseTo(logical.width / logical.height, 6);
      // … and the content fits inside the calibrated glass area.
      expect(contentWidth).toBeLessThanOrEqual(p.screenWidth + 1e-6);
      expect(contentHeight).toBeLessThanOrEqual(p.screenHeight + 1e-6);
    }
  });

  it("does not require a calibration entry for custom (neutral) devices", () => {
    const custom = getDeviceEntry("custom-portrait")!;
    expect(calibrationFor(custom.profile.visualProfileId)).toBeNull();
    const p = toPresentationGeometry(custom.geometry, custom.profile.visualProfileId);
    expect(p.screenX).toBe(custom.geometry.screenX);
    expect(p.screenY).toBe(custom.geometry.screenY);
    expect(p.screenWidth).toBe(custom.geometry.screenWidth);
    expect(p.screenHeight).toBe(custom.geometry.screenHeight);
    expect(p.photoFrame).toBeUndefined();
  });

  it("leaves the authoritative domain geometry untouched (legacy parity)", () => {
    // Values recorded from reference/sap_rfui_emulator.html formulas at
    // implementation time — see docs/migration/device-profile-migration.md.
    const rt40 = getDeviceEntry("urovo-rt40")!.geometry;
    expect(rt40.shellWidth).toBeCloseTo(500, 6);
    expect(rt40.shellHeight).toBeCloseTo(1381.15, 1);
    expect(rt40.screenX).toBeCloseTo(83.06, 1);
    expect(rt40.screenY).toBeCloseTo(124.61, 1);
    expect(rt40.screenWidth).toBeCloseTo(333.88, 1);
    expect(rt40.screenHeight).toBeCloseTo(560.2, 1);

    const u2 = getDeviceEntry("urovo-u2")!.geometry;
    expect(u2.shellHeight).toBeCloseTo(693.98, 1);
    expect(u2.screenX).toBeCloseTo(151.09, 1);
    expect(u2.screenY).toBeCloseTo(176.27, 1);
    expect(u2.screenWidth).toBeCloseTo(562.67, 1);
    expect(u2.screenHeight).toBeCloseTo(335.12, 1);

    const wt6000 = getDeviceEntry("zebra-wt6000")!.geometry;
    expect(wt6000.shellHeight).toBeCloseTo(651.52, 1);
    expect(wt6000.screenX).toBeCloseTo(224.16, 1);
    expect(wt6000.screenY).toBeCloseTo(206.74, 1);
    expect(wt6000.screenWidth).toBeCloseTo(454.71, 1);
    expect(wt6000.screenHeight).toBeCloseTo(262.27, 1);
  });
});
