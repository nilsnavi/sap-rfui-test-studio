import { EmptyState } from "@sap-rfui/ui";

/** Placeholder for Sprint M1 (SPEC-001 device profiles and emulator shell). */
export function EmulatorScreen() {
  return (
    <section className="screen" aria-labelledby="emulator-title">
      <header className="screen__header">
        <h2 id="emulator-title" className="screen__title">
          RFUI Emulator
        </h2>
      </header>
      <EmptyState
        title="RFUI Emulator"
        description="Device emulator will be implemented in Sprint M1."
        note="SPEC-001 · device profiles: Urovo RT40 244×400, Urovo U2 800×480, Zebra WT6000 800×480, Custom"
      />
    </section>
  );
}
