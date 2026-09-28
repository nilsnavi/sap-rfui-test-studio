import { EmptyState } from "@sap-rfui/ui";

/** Placeholder for Sprint M1 (SPEC-001 device profiles and emulator shell). */
export function EmulatorScreen() {
  return (
    <section className="screen" aria-labelledby="emulator-title">
      <header className="screen__header">
        <h2 id="emulator-title" className="screen__title">
          Эмулятор RFUI
        </h2>
      </header>
      <EmptyState
        title="Эмулятор RFUI"
        description="Эмулятор устройства будет реализован в спринте M1."
        note="SPEC-001 · профили устройств: Urovo RT40 244×400, Urovo U2 800×480, Zebra WT6000 800×480, Custom"
      />
    </section>
  );
}
