import { create } from "zustand";

import type { CustomScreenSize, DeviceSelection } from "@sap-rfui/application";
import { selectDevice } from "@sap-rfui/application";
import type { AppError } from "@sap-rfui/domain";
import { DEFAULT_DEVICE_ID, getDeviceProfile } from "@sap-rfui/domain";

/**
 * Minimal device feature state (PROMPT-002 §16): only the selected device id
 * and the editable custom size live here. Registry profiles are never stored —
 * they are resolved through the SelectDeviceUseCase on every render.
 */
export interface DeviceState {
  readonly selectedDeviceId: string;
  /** Last applied custom resolution; `null` means "registry default". */
  readonly customSize: CustomScreenSize | null;
  /** Raw text of the width/height inputs so the user can type freely. */
  readonly widthInput: string;
  readonly heightInput: string;
  /** Validation failure of the last apply attempt, shown by the custom form. */
  readonly error: AppError | null;

  select: (deviceId: string) => void;
  changeWidthInput: (value: string) => void;
  changeHeightInput: (value: string) => void;
  applyCustomSize: () => void;
}

const CUSTOM_PREFIX = "custom-";

/** The custom id the orientation rule gives these dimensions. */
function resolveId(_preferredId: string, size: CustomScreenSize): string {
  const result = selectDevice({ deviceId: "custom-portrait", customSize: size });
  return result.ok ? result.value.profile.id : _preferredId;
}

function inputsFor(deviceId: string, customSize: CustomScreenSize | null): [string, string] {
  const profile = getDeviceProfile(deviceId);
  if (profile === null) {
    return ["", ""];
  }
  if (deviceId.startsWith(CUSTOM_PREFIX) && customSize !== null) {
    return [String(customSize.width), String(customSize.height)];
  }
  return [String(profile.screen.width), String(profile.screen.height)];
}

/** Resolve the effective profile + geometry for the current state (never null on valid ids). */
export function resolveSelection(state: {
  selectedDeviceId: string;
  customSize: CustomScreenSize | null;
}): DeviceSelection | null {
  const result = selectDevice({
    deviceId: state.selectedDeviceId,
    customSize: state.customSize ?? undefined,
  });
  return result.ok ? result.value : null;
}

export function createDeviceStore() {
  return create<DeviceState>()((set, get) => {
    const defaults = getDeviceProfile(DEFAULT_DEVICE_ID)!;
    return {
      selectedDeviceId: DEFAULT_DEVICE_ID,
      customSize: null,
      widthInput: String(defaults.screen.width),
      heightInput: String(defaults.screen.height),
      error: null,

      select(deviceId) {
        const profile = getDeviceProfile(deviceId);
        if (profile === null) {
          return;
        }
        const stored = get().customSize;
        // Keep the applied custom size only when it matches the orientation of
        // the picked custom profile; otherwise the profile starts at its
        // registry default, exactly like the legacy `applyDevicePreset`.
        const customSize =
          deviceId.startsWith(CUSTOM_PREFIX) &&
          stored !== null &&
          selectDevice({ deviceId, customSize: stored }).ok &&
          resolveId(deviceId, stored) === deviceId
            ? stored
            : null;
        const [widthInput, heightInput] = inputsFor(deviceId, customSize);
        set({ selectedDeviceId: deviceId, customSize, widthInput, heightInput, error: null });
      },

      changeWidthInput(value) {
        set({ widthInput: value });
      },

      changeHeightInput(value) {
        set({ heightInput: value });
      },

      applyCustomSize() {
        const { widthInput, heightInput } = get();
        const result = selectDevice({
          // Any manually applied size switches to the custom profile that the
          // single orientation rule selects (legacy `markCustomSize`).
          deviceId: "custom-portrait",
          customSize: {
            width: Number.parseInt(widthInput, 10),
            height: Number.parseInt(heightInput, 10),
          },
        });

        if (!result.ok) {
          set({ error: result.error });
          return;
        }

        set({
          selectedDeviceId: result.value.profile.id,
          customSize: {
            width: result.value.profile.screen.width,
            height: result.value.profile.screen.height,
          },
          error: null,
        });
      },
    };
  });
}

export type DeviceStore = ReturnType<typeof createDeviceStore>;
