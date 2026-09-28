import { describe, expect, it } from "vitest";

import { selectDevice } from "./select-device";

describe("selectDevice use case", () => {
  it("resolves the RT40 hardware profile with its fixed photo geometry", () => {
    const result = selectDevice({ deviceId: "urovo-rt40" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.screen).toEqual({
      width: 244,
      height: 400,
      orientation: "portrait",
    });
    expect(result.value.geometry.shellKind).toBe("photo");
    expect(result.value.geometry.shellWidth).toBe(500);
  });

  it("fails with CONFIGURATION_ERROR for an unknown device id", () => {
    const result = selectDevice({ deviceId: "urovo-rt-41" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CONFIGURATION_ERROR");
  });

  it("keeps hardware profiles on factory resolution even when a custom size is passed", () => {
    const result = selectDevice({
      deviceId: "zebra-wt6000",
      customSize: { width: 640, height: 480 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.screen.width).toBe(800);
  });

  it("applies validated custom dimensions and rebuilds the neutral shell around them", () => {
    const result = selectDevice({
      deviceId: "custom-portrait",
      customSize: { width: 360, height: 640 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.id).toBe("custom-portrait");
    expect(result.value.profile.screen).toEqual({
      width: 360,
      height: 640,
      orientation: "portrait",
    });
    expect(result.value.geometry.shellWidth).toBe(432);
    expect(result.value.geometry.screenHeight).toBe(640);
    expect(result.value.geometry.keypadTop).toBe(744);
  });

  it("routes landscape dimensions to custom-landscape (single orientation rule)", () => {
    const result = selectDevice({
      deviceId: "custom-portrait",
      customSize: { width: 900, height: 500 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.id).toBe("custom-landscape");
    expect(result.value.profile.screen.orientation).toBe("landscape");
  });

  it("falls back to the registry default size when no custom payload is given", () => {
    const result = selectDevice({ deviceId: "custom-landscape" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.screen.width).toBe(800);
    expect(result.value.profile.screen.height).toBe(480);
  });

  it("rejects out-of-limit and non-integer custom sizes", () => {
    expect(
      selectDevice({ deviceId: "custom-portrait", customSize: { width: 100, height: 480 } }).ok,
    ).toBe(false);
    expect(
      selectDevice({ deviceId: "custom-portrait", customSize: { width: 320.5, height: 480 } }).ok,
    ).toBe(false);
    expect(
      selectDevice({ deviceId: "custom-portrait", customSize: { width: Number.NaN, height: 480 } })
        .ok,
    ).toBe(false);
  });

  it("accepts the legacy resolutions used by real SAP RFUI services", () => {
    // ZRFUI_RT40 · ZRFUI_HOR · ZRF_H_800_480 from the reference tool.
    for (const size of [
      { width: 244, height: 400 },
      { width: 800, height: 480 },
      { width: 320, height: 480 },
      { width: 480, height: 320 },
    ]) {
      expect(selectDevice({ deviceId: "custom-portrait", customSize: size }).ok).toBe(true);
    }
  });
});
