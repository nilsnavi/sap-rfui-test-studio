import { useStore } from "zustand";

import { SCREEN_SIZE_LIMITS } from "@sap-rfui/domain";

import type { DeviceStore } from "../state/device-store";

/**
 * Custom resolution editor (PROMPT-002 §12). Editable width/height with the
 * legacy limits; applying a size routes to the matching custom profile via the
 * SelectDeviceUseCase. Failure text is Russian; the raw `AppError` stays
 * available as a technical hint only.
 */
export function CustomSizeForm({ store }: { readonly store: DeviceStore }) {
  const widthInput = useStore(store, (state) => state.widthInput);
  const heightInput = useStore(store, (state) => state.heightInput);
  const error = useStore(store, (state) => state.error);
  const changeWidthInput = useStore(store, (state) => state.changeWidthInput);
  const changeHeightInput = useStore(store, (state) => state.changeHeightInput);
  const applyCustomSize = useStore(store, (state) => state.applyCustomSize);

  return (
    <div className="devices-custom">
      <div className="devices-custom__title">Свой размер экрана, px</div>
      <div className="devices-custom__row">
        <div className="devices-field">
          <label className="devices-field__label" htmlFor="device-width-input">
            Ширина
          </label>
          <input
            id="device-width-input"
            className="devices-field__control"
            type="number"
            inputMode="numeric"
            min={SCREEN_SIZE_LIMITS.minWidth}
            max={SCREEN_SIZE_LIMITS.maxWidth}
            value={widthInput}
            onChange={(event) => changeWidthInput(event.target.value)}
          />
        </div>
        <div className="devices-field">
          <label className="devices-field__label" htmlFor="device-height-input">
            Высота
          </label>
          <input
            id="device-height-input"
            className="devices-field__control"
            type="number"
            inputMode="numeric"
            min={SCREEN_SIZE_LIMITS.minHeight}
            max={SCREEN_SIZE_LIMITS.maxHeight}
            value={heightInput}
            onChange={(event) => changeHeightInput(event.target.value)}
          />
        </div>
        <button type="button" className="ui-button" onClick={applyCustomSize}>
          Применить
        </button>
      </div>
      {error !== null ? (
        <p className="devices-custom__error" role="alert" data-testid="custom-size-error">
          Проверьте размер экрана: ширина — целое число от {SCREEN_SIZE_LIMITS.minWidth} до{" "}
          {SCREEN_SIZE_LIMITS.maxWidth}, высота — целое число от {SCREEN_SIZE_LIMITS.minHeight} до{" "}
          {SCREEN_SIZE_LIMITS.maxHeight}.
        </p>
      ) : (
        <p className="devices-custom__hint">
          Произвольный размер переключает эмулятор на профиль «Свой размер» с той же оболочкой.
        </p>
      )}
    </div>
  );
}
