import type { AppSettings } from "@sap-rfui/application";
import { EmptyState, StatusBadge } from "@sap-rfui/ui";

export interface SettingsScreenProps {
  readonly settings: AppSettings;
  readonly source: "defaults" | "stored";
}

/**
 * Minimal placeholder for the foundation release.
 * A full settings editor and test data management land in Sprint M4 (SPEC-001 §12).
 */
export function SettingsScreen({ settings, source }: SettingsScreenProps) {
  return (
    <section className="screen" aria-labelledby="settings-title">
      <header className="screen__header">
        <h2 id="settings-title" className="screen__title">
          Settings
        </h2>
        <p className="screen__subtitle">
          Restored from local configuration · <code>app.settings.v1</code>
        </p>
      </header>

      <div className="grid">
        <article className="panel">
          <h3 className="panel__title">Current values</h3>
          <dl className="kv">
            <div>
              <dt>Schema version</dt>
              <dd>{settings.schemaVersion}</dd>
            </div>
            <div>
              <dt>Telemetry</dt>
              <dd>
                <StatusBadge
                  label={settings.telemetryEnabled ? settings.telemetryLevel : "disabled"}
                  tone={settings.telemetryEnabled ? "info" : "neutral"}
                  mono
                />
              </dd>
            </div>
            <div>
              <dt>UI density</dt>
              <dd>{settings.uiDensity}</dd>
            </div>
            <div>
              <dt>Loaded from</dt>
              <dd>{source}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <EmptyState
            title="Settings editor is not part of the foundation build"
            description="Editing, SAP environments and test data management are implemented in Sprint M4. Values above are validated by the application layer and persisted through StoragePort."
            note="SPEC-001 §12 · ADR-001 Rule 13"
          />
        </article>
      </div>
    </section>
  );
}
