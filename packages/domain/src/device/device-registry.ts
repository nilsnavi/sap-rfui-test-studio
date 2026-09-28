import type { DeviceGeometry, DeviceProfile } from "./device-profile";
import {
  DEFAULT_CUSTOM_LANDSCAPE,
  DEFAULT_CUSTOM_PORTRAIT,
  deriveOrientation,
} from "./custom-device";

/**
 * Device registry (PROMPT-002 §8): one source of truth for the five baseline
 * profiles. Stable ids are the primary keys — display names are Russian UI
 * copy and never used for lookups. Default device: `urovo-rt40`.
 *
 * Geometry constants are not eyeballed: every expression below reproduces a
 * formula from `reference/sap_rfui_emulator.html` (`applyScreenSize()` and the
 * photo-mode CSS), see docs/migration/device-profile-migration.md.
 */

const DPI_96 = 96 / 25.4; // legacy conversions of millimetre reductions to px

export interface DeviceEntry {
  readonly profile: DeviceProfile;
  readonly geometry: DeviceGeometry;
}

/* ------------------------------------------------------------------ Urovo RT40 */

/** Legacy RT40 photo: body 488 × 1348 px, rendered at shell width 500 px. */
const RT40_PHOTO_SCALE = 500 / 488;
const RT40_WIDTH_REDUCTION = 7 * DPI_96; // legacy: −7 mm total on width
const RT40_HEIGHT_REDUCTION = 9 * DPI_96; // legacy: −9 mm total on height
const RT40_EXTRA_SCREEN_WIDTH = 96 / 25.4; // legacy: +1 inch recovered on width

const rt40Geometry: DeviceGeometry = {
  shellWidth: 500,
  shellHeight: 1348 * RT40_PHOTO_SCALE,
  screenX: 70 * RT40_PHOTO_SCALE - RT40_EXTRA_SCREEN_WIDTH / 2 + RT40_WIDTH_REDUCTION / 2,
  screenY: 106 * RT40_PHOTO_SCALE - 1 + RT40_HEIGHT_REDUCTION / 2,
  screenWidth: 348 * RT40_PHOTO_SCALE + RT40_EXTRA_SCREEN_WIDTH - RT40_WIDTH_REDUCTION,
  screenHeight: 578 * RT40_PHOTO_SCALE + 2 - RT40_HEIGHT_REDUCTION,
  shellKind: "photo",
};

/* ------------------------------------------------------------------- Urovo U2 */

/** Legacy U2 photo: 1280 × 987 px, rendered at shell width 900 px. */
const U2_SHELL_WIDTH = 900;
const U2_SHELL_HEIGHT = (U2_SHELL_WIDTH * 987) / 1280;
const U2_WIDTH_REDUCTION = 26 * DPI_96; // legacy: −26 mm total on width
const U2_HEIGHT_REDUCTION = 17 * DPI_96; // legacy: −17 mm total on height

const u2Geometry: DeviceGeometry = {
  shellWidth: U2_SHELL_WIDTH,
  shellHeight: U2_SHELL_HEIGHT,
  screenX: (U2_SHELL_WIDTH * 145) / 1280 + U2_WIDTH_REDUCTION / 2,
  screenY: (U2_SHELL_HEIGHT * 205) / 987 + U2_HEIGHT_REDUCTION / 2,
  screenWidth: (U2_SHELL_WIDTH * 940) / 1280 - U2_WIDTH_REDUCTION,
  screenHeight: (U2_SHELL_HEIGHT * 568) / 987 - U2_HEIGHT_REDUCTION,
  shellKind: "photo",
};

/* -------------------------------------------------------------- Zebra WT6000 */

/** Legacy WT6000 photo: body 594 × 430 px inside a 1200 × 800 image, at width 900 px. */
const WT6000_PHOTO_SCALE = 900 / 594;
const WT6000_WIDTH_REDUCTION = 20 * DPI_96; // legacy: −20 mm total on width
const WT6000_HEIGHT_REDUCTION = 18 * DPI_96; // legacy: −18 mm total on height

const wt6000Geometry: DeviceGeometry = {
  shellWidth: 900,
  shellHeight: 430 * WT6000_PHOTO_SCALE,
  screenX: 123 * WT6000_PHOTO_SCALE + WT6000_WIDTH_REDUCTION / 2,
  screenY: 114 * WT6000_PHOTO_SCALE + WT6000_HEIGHT_REDUCTION / 2,
  screenWidth: 350 * WT6000_PHOTO_SCALE - WT6000_WIDTH_REDUCTION,
  screenHeight: 218 * WT6000_PHOTO_SCALE - WT6000_HEIGHT_REDUCTION,
  shellKind: "photo",
};

/* ------------------------------------------------------------- Neutral shell */

/**
 * Legacy neutral CSS shell used for the custom profiles (`applyScreenSize()`
 * else-branch): terminal 390×760 minimums, bezel at left 24 / top 60 with 12 px
 * padding, keypad block starting at screenHeight + 104.
 */
export function neutralShellGeometry(width: number, height: number): DeviceGeometry {
  return {
    shellWidth: Math.max(390, width + 72),
    shellHeight: Math.max(760, height + 315),
    screenX: 24 + 12,
    screenY: 60 + 12,
    screenWidth: width,
    screenHeight: height,
    cornerRadius: 38,
    shellKind: "neutral",
    bezelPadding: 12,
    keypadTop: height + 104,
  };
}

/* ------------------------------------------------------------------ Profiles */

const rt40Profile: DeviceProfile = {
  id: "urovo-rt40",
  manufacturer: "Urovo",
  model: "RT40",
  displayName: "Urovo RT40",
  screen: { width: 244, height: 400, orientation: "portrait" },
  capabilities: { scanner: true, keyboard: true, functionKeys: true },
  visualProfileId: "rt40-photo",
};

const u2Profile: DeviceProfile = {
  id: "urovo-u2",
  manufacturer: "Urovo",
  model: "U2",
  displayName: "Urovo U2",
  screen: { width: 800, height: 480, orientation: "landscape" },
  capabilities: { scanner: true, keyboard: true, functionKeys: true },
  visualProfileId: "u2-photo",
};

const wt6000Profile: DeviceProfile = {
  id: "zebra-wt6000",
  manufacturer: "Zebra",
  model: "WT6000",
  displayName: "Zebra WT6000",
  screen: { width: 800, height: 480, orientation: "landscape" },
  capabilities: { scanner: true, keyboard: true, functionKeys: true },
  visualProfileId: "wt6000-photo",
};

const customPortraitProfile: DeviceProfile = {
  id: "custom-portrait",
  model: "Custom Portrait",
  displayName: "Свой размер вертикальный",
  screen: {
    width: DEFAULT_CUSTOM_PORTRAIT.width,
    height: DEFAULT_CUSTOM_PORTRAIT.height,
    orientation: deriveOrientation(DEFAULT_CUSTOM_PORTRAIT.width, DEFAULT_CUSTOM_PORTRAIT.height),
  },
  capabilities: { scanner: false, keyboard: false, functionKeys: false },
  visualProfileId: "neutral",
};

const customLandscapeProfile: DeviceProfile = {
  id: "custom-landscape",
  model: "Custom Landscape",
  displayName: "Свой размер горизонтальный",
  screen: {
    width: DEFAULT_CUSTOM_LANDSCAPE.width,
    height: DEFAULT_CUSTOM_LANDSCAPE.height,
    orientation: deriveOrientation(DEFAULT_CUSTOM_LANDSCAPE.width, DEFAULT_CUSTOM_LANDSCAPE.height),
  },
  capabilities: { scanner: false, keyboard: false, functionKeys: false },
  visualProfileId: "neutral",
};

/** The five required profiles in selector order (PROMPT-002 §3). */
export const DEVICE_ENTRIES: readonly DeviceEntry[] = [
  { profile: rt40Profile, geometry: rt40Geometry },
  { profile: u2Profile, geometry: u2Geometry },
  { profile: wt6000Profile, geometry: wt6000Geometry },
  {
    profile: customPortraitProfile,
    geometry: neutralShellGeometry(
      customPortraitProfile.screen.width,
      customPortraitProfile.screen.height,
    ),
  },
  {
    profile: customLandscapeProfile,
    geometry: neutralShellGeometry(
      customLandscapeProfile.screen.width,
      customLandscapeProfile.screen.height,
    ),
  },
];

export const DEFAULT_DEVICE_ID = "urovo-rt40";

export function listDeviceProfiles(): readonly DeviceProfile[] {
  return DEVICE_ENTRIES.map((entry) => entry.profile);
}

export function getDeviceEntry(id: string): DeviceEntry | null {
  return DEVICE_ENTRIES.find((entry) => entry.profile.id === id) ?? null;
}

export function getDeviceProfile(id: string): DeviceProfile | null {
  return getDeviceEntry(id)?.profile ?? null;
}

/**
 * Resolve the geometry for any (possibly customized) profile. Photo shells are
 * fixed by the device; the neutral shell follows the effective screen size.
 */
export function geometryForProfile(profile: DeviceProfile): DeviceGeometry {
  if (profile.visualProfileId === "neutral") {
    return neutralShellGeometry(profile.screen.width, profile.screen.height);
  }
  return (
    getDeviceEntry(profile.id)?.geometry ??
    neutralShellGeometry(profile.screen.width, profile.screen.height)
  );
}
