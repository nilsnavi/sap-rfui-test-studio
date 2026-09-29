import { EmptyState } from "@sap-rfui/ui";

import { SpikePanel } from "../features/spike/spike-panel";
import { useWorkspace } from "../state/store-context";

/**
 * SPIKE-001 screen: P0 architecture gate for a controlled SAP RFUI runtime.
 *
 * Temporary by design — it disappears once the production SAP integration of
 * SPEC-001 replaces the spike adapter. The screen owns no SAP logic; it only
 * presents the `SapPort` handed over by the composition root.
 */
export function SapSpikeScreen() {
  const sap = useWorkspace((state) => state.sap);

  return (
    <section className="screen" aria-labelledby="spike-title">
      <header className="screen__header">
        <h2 id="spike-title" className="screen__title">
          SPIKE-001 · управляемый WebView для SAP RFUI
        </h2>
        <p className="screen__subtitle">
          Эксперименты EXP-001 … EXP-011 · Path A (Tauri WebView) · только non-production окружение
          EWD / EWT
        </p>
      </header>

      {sap === null ? (
        <div className="grid">
          <article className="panel">
            <EmptyState
              title="Контролируемый SAP runtime недоступен"
              description="Порт SapPort подключается только внутри оболочки Tauri, где есть управляемое WebView-окно. Запустите приложение командой pnpm desktop:dev (tauri dev) — в обычном браузере эксперименты выполнить нельзя."
              note="SPIKE-001 §8 · ADR-001, правила 1 и 7"
            />
          </article>
        </div>
      ) : (
        <SpikePanel port={sap} />
      )}
    </section>
  );
}
