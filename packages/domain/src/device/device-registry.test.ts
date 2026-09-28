import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEVICE_ID,
  DEVICE_ENTRIES,
  geometryForProfile,
  getDeviceEntry,
  getDeviceProfile,
  listDeviceProfiles,
  neutralShellGeometry,
} from "./device-registry";

/** PROMPT-002 §17: required profiles exist, ids are unique, dimensions are correct. */
describe("device registry", () => {
  it("contains exactly the five required profiles with stable ids", () => {
    expect(DEVICE_ENTRIES.map((entry) => entry.profile.id)).toEqual([
      "urovo-rt40",
      "urovo-u2",
      "zebra-wt6000",
      "custom-portrait",
      "custom-landscape",
    ]);
  });

  it("keeps ids unique", () => {
    const ids = DEVICE_ENTRIES.map((entry) => entry.profile.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries the mandated screen baseline", () => {
    const screenOf = (id: string) => getDeviceProfile(id)?.screen;

    expect(screenOf("urovo-rt40")).toEqual({ width: 244, height: 400, orientation: "portrait" });
    expect(screenOf("urovo-u2")).toEqual({ width: 800, height: 480, orientation: "landscape" });
    expect(screenOf("zebra-wt6000")).toEqual({ width: 800, height: 480, orientation: "landscape" });
    expect(screenOf("custom-portrait")).toEqual({
      width: 320,
      height: 480,
      orientation: "portrait",
    });
    expect(screenOf("custom-landscape")).toEqual({
      width: 800,
      height: 480,
      orientation: "landscape",
    });
  });

  it("defaults to urovo-rt40 and resolves entries by id only", () => {
    expect(DEFAULT_DEVICE_ID).toBe("urovo-rt40");
    expect(getDeviceEntry(DEFAULT_DEVICE_ID)?.profile.displayName).toBe("Urovo RT40");
    expect(getDeviceEntry("Urovo RT40")).toBeNull();
    expect(getDeviceEntry("unknown-device")).toBeNull();
  });

  it("exposes display names as UI copy, all profiles listed in selector order", () => {
    const names = listDeviceProfiles().map((profile) => profile.displayName);
    expect(names).toContain("Свой размер вертикальный");
    expect(names).toContain("Свой размер горизонтальный");
    expect(names[0]).toBe("Urovo RT40");
  });

  it("declares scanner/keyboard capabilities for real terminals and none for custom shells", () => {
    expect(getDeviceProfile("urovo-rt40")?.capabilities).toEqual({
      scanner: true,
      keyboard: true,
      functionKeys: true,
    });
    expect(getDeviceProfile("custom-portrait")?.capabilities).toEqual({
      scanner: false,
      keyboard: false,
      functionKeys: false,
    });
  });
});

/** PROMPT-002 §17: screen rect must stay inside the shell. */
describe("device geometry", () => {
  it.each(DEVICE_ENTRIES.map((entry) => [entry.profile.id, entry] as const))(
    "%s: screen rectangle fits inside the shell",
    (_id, entry) => {
      const g = entry.geometry;
      expect(g.screenX + g.screenWidth).toBeLessThanOrEqual(g.shellWidth);
      expect(g.screenY + g.screenHeight).toBeLessThanOrEqual(g.shellHeight);
      expect(g.screenX).toBeGreaterThanOrEqual(0);
      expect(g.screenY).toBeGreaterThanOrEqual(0);
    },
  );

  it("migrates the legacy RT40 photo shell numbers (500 × 1348·500/488, screen 70×106 offset)", () => {
    const g = getDeviceEntry("urovo-rt40")?.geometry;
    const photoScale = 500 / 488;
    expect(g?.shellWidth).toBe(500);
    expect(g?.shellHeight).toBeCloseTo(1348 * photoScale, 6);
    expect(g?.shellKind).toBe("photo");
    // Screen area is inset from the raw photo rectangle by the mm reductions.
    expect(g && g.screenX).toBeGreaterThan(70 * photoScale - 20);
    expect(g && g.screenX).toBeLessThan(70 * photoScale + 20);
  });

  it("migrates the legacy U2 and WT6000 shells at width 900", () => {
    expect(getDeviceEntry("urovo-u2")?.geometry.shellWidth).toBe(900);
    expect(getDeviceEntry("urovo-u2")?.geometry.shellHeight).toBeCloseTo((900 * 987) / 1280, 6);
    expect(getDeviceEntry("zebra-wt6000")?.geometry.shellWidth).toBe(900);
    expect(getDeviceEntry("zebra-wt6000")?.geometry.shellHeight).toBeCloseTo((430 * 900) / 594, 6);
  });

  it("uses the legacy neutral CSS shell for custom profiles", () => {
    const g = getDeviceEntry("custom-portrait")?.geometry;
    expect(g).toEqual(neutralShellGeometry(320, 480));
    expect(g?.shellWidth).toBe(392);
    expect(g?.shellHeight).toBe(795);
    expect(g?.screenX).toBe(36);
    expect(g?.screenY).toBe(72);
    expect(g?.keypadTop).toBe(584);
  });

  it("neutral shell keeps the legacy minimums 390 × 760 for tiny screens", () => {
    const g = neutralShellGeometry(180, 200);
    expect(g.shellWidth).toBe(390);
    expect(g.shellHeight).toBe(760);
    expect(g.screenX + g.screenWidth).toBeLessThanOrEqual(g.shellWidth);
    expect(g.screenY + g.screenHeight).toBeLessThanOrEqual(g.shellHeight);
  });

  it("geometryForProfile follows custom sizes and keeps photo shells fixed", () => {
    const portrait = getDeviceProfile("custom-portrait");
    const resized = geometryForProfile({
      ...portrait!,
      screen: { width: 640, height: 480, orientation: "landscape" },
    });
    expect(resized.screenWidth).toBe(640);
    expect(resized.shellWidth).toBe(712);

    const rt40 = getDeviceProfile("urovo-rt40");
    expect(geometryForProfile(rt40!)).toEqual(getDeviceEntry("urovo-rt40")?.geometry);
  });
});
