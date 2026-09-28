import { useStore } from "zustand";

import { listDeviceProfiles } from "@sap-rfui/domain";

import type { DeviceStore } from "../state/device-store";

/**
 * Device selector (PROMPT-002 §9): lists every registry profile by stable id,
 * switches without a reload. Option captions follow the legacy select:
 * name — resolution — orientation in Russian.
 */
export function DeviceSelector({ store }: { readonly store: DeviceStore }) {
  const selectedDeviceId = useStore(store, (state) => state.selectedDeviceId);
  const select = useStore(store, (state) => state.select);

  return (
    <div className="devices-field">
      <label className="devices-field__label" htmlFor="device-model-select">
        Выберите модель
      </label>
      <select
        id="device-model-select"
        className="devices-field__control"
        value={selectedDeviceId}
        onChange={(event) => select(event.target.value)}
      >
        {listDeviceProfiles().map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.displayName} — {profile.screen.width} × {profile.screen.height} —{" "}
            {profile.screen.orientation === "portrait" ? "вертикальная" : "горизонтальная"}
          </option>
        ))}
      </select>
    </div>
  );
}
