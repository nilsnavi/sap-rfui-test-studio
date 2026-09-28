import { useState } from "react";

import { useStore } from "zustand";

import { EmptyState } from "@sap-rfui/ui";

import { createDeviceStore, resolveSelection } from "../state/device-store";
import { CustomSizeForm } from "./CustomSizeForm";
import { DeviceInfoPanel } from "./DeviceInfoPanel";
import { DeviceSelector } from "./DeviceSelector";
import { DeviceStage } from "./DeviceStage";
import { RfuiPlaceholder } from "./RfuiPlaceholder";

import "../devices.css";

/**
 * Device Emulator feature root (PROMPT-002): selector + info + custom sizes on
 * the left, the shared emulator renderer on the right. The store is created
 * per mount, so tests can render the feature in isolation.
 */
export function DevicesFeature() {
  const [store] = useState(() => createDeviceStore());
  const selectedDeviceId = useStore(store, (state) => state.selectedDeviceId);
  const customSize = useStore(store, (state) => state.customSize);

  const selection = resolveSelection({ selectedDeviceId, customSize });

  if (selection === null) {
    return (
      <EmptyState
        title="Профиль устройства не найден"
        description="Реестр устройств не содержит запрошенный профиль. Проверьте идентификатор устройства."
      />
    );
  }

  return (
    <div className="devices">
      <aside className="devices__controls panel">
        <h3 className="panel__title">Модель ТСД и размер экрана</h3>
        <DeviceSelector store={store} />
        <DeviceInfoPanel selection={selection} />
        <CustomSizeForm store={store} />
      </aside>

      <div className="devices__stage">
        <DeviceStage selection={selection}>
          <RfuiPlaceholder
            width={selection.profile.screen.width}
            height={selection.profile.screen.height}
          />
        </DeviceStage>
      </div>
    </div>
  );
}
