import { describe, expect, it } from "vitest";

import { getDeviceEntry } from "@sap-rfui/domain";
import type { DeviceGeometry } from "@sap-rfui/domain";

import { computePresentationScale, toPresentationGeometry } from "./presentation";

const rt40 = getDeviceEntry("urovo-rt40")!.geometry;
const customPortrait = getDeviceEntry("custom-portrait")!.geometry;

describe("toPresentationGeometry (physical geometry stays authoritative)", () => {
  it("never changes the shell rect for any device", () => {
    const p = toPresentationGeometry(rt40, "rt40-photo");
    expect(p.shellWidth).toBe(rt40.shellWidth);
    expect(p.shellHeight).toBe(rt40.shellHeight);
    expect(p.shellKind).toBe(rt40.shellKind);
  });

  it("leaves the neutral custom shell rect identical to the physical geometry", () => {
    const p = toPresentationGeometry(customPortrait, "neutral");
    expect(p.screenX).toBe(customPortrait.screenX);
    expect(p.screenY).toBe(customPortrait.screenY);
    expect(p.screenWidth).toBe(customPortrait.screenWidth);
    expect(p.screenHeight).toBe(customPortrait.screenHeight);
    expect(p.photoFrame).toBeUndefined();
    expect(p.screenBorderRadius).toBeUndefined();
  });

  it("projects the photo screen rect from the per-device calibration", () => {
    const p = toPresentationGeometry(rt40, "rt40-photo");
    // rt40-photo calibration: left 0.1661, top 0.0902, width 0.6678, height 0.4056
    expect(p.screenX).toBeCloseTo(rt40.shellWidth * 0.1661, 6);
    expect(p.screenY).toBeCloseTo(rt40.shellHeight * 0.0902, 6);
    expect(p.screenWidth).toBeCloseTo(rt40.shellWidth * 0.6678, 6);
    expect(p.screenHeight).toBeCloseTo(rt40.shellHeight * 0.4056, 6);
    expect(p.screenBorderRadius).toBe(8);
    // The calibrated rect stays strictly inside the drawn shell.
    expect(p.screenX + p.screenWidth).toBeLessThan(p.shellWidth);
    expect(p.screenY + p.screenHeight).toBeLessThan(p.shellHeight);
  });

  it("falls back to the physical rect for a photo device without calibration", () => {
    const p = toPresentationGeometry(rt40, "some-future-photo");
    expect(p.screenX).toBe(rt40.screenX);
    expect(p.screenWidth).toBe(rt40.screenWidth);
    expect(p.photoFrame).toBeUndefined();
  });

  it("does not mutate the source DeviceGeometry", () => {
    const snapshot: DeviceGeometry = { ...rt40 };
    toPresentationGeometry(rt40, "rt40-photo");
    expect(rt40).toEqual(snapshot);
  });
});

describe("computePresentationScale (uniform, capped)", () => {
  const presentation = toPresentationGeometry(rt40, "rt40-photo");

  it("is a single uniform factor capped at 1 even in a huge viewport", () => {
    const scale = computePresentationScale({ width: 4000, height: 4000 }, presentation);
    expect(scale).toBe(1);
  });

  it("shrinks to fit the limiting axis while keeping one factor for both", () => {
    const available = { width: 800, height: 800 };
    const scale = computePresentationScale(available, presentation);
    const expected = Math.min(800 / presentation.shellWidth, 800 / presentation.shellHeight, 1);
    expect(scale).toBeCloseTo(expected, 10);
    expect(scale).toBeLessThanOrEqual(1);
    // Height is the tight axis for a tall portrait terminal.
    expect(scale).toBeCloseTo(800 / presentation.shellHeight, 10);
  });

  it("recomputs to a different value when the window is resized", () => {
    const wide = computePresentationScale({ width: 1200, height: 1000 }, presentation);
    const narrow = computePresentationScale({ width: 400, height: 500 }, presentation);
    expect(wide).toBeGreaterThan(narrow);
    expect(narrow).toBeLessThanOrEqual(1);
  });

  it("renders at native size before the viewport is measured", () => {
    expect(computePresentationScale({ width: 0, height: 0 }, presentation)).toBe(1);
  });
});
