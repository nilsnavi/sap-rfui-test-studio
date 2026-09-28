import { DevicesFeature } from "../features/devices/components/DevicesFeature";

/** Device Emulator screen (Sprint M1, PROMPT-002): profiles, shell and screen. */
export function EmulatorScreen() {
  return (
    <section className="screen" aria-labelledby="emulator-title">
      <header className="screen__header">
        <h2 id="emulator-title" className="screen__title">
          Эмулятор RFUI
        </h2>
        <p className="screen__subtitle">
          Выберите модель ТСД или задайте произвольный размер экрана. Подключение к SAP будет
          добавлено в спринте M2.
        </p>
      </header>
      <DevicesFeature />
    </section>
  );
}
