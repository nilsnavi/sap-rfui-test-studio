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
          Настройки
        </h2>
        <p className="screen__subtitle">
          Восстановлено из локальной конфигурации · <code>app.settings.v1</code>
        </p>
      </header>

      <div className="grid">
        <article className="panel">
          <h3 className="panel__title">Текущие значения</h3>
          <dl className="kv">
            <div>
              <dt>Версия схемы</dt>
              <dd>{settings.schemaVersion}</dd>
            </div>
            <div>
              <dt>Телеметрия</dt>
              <dd>
                <StatusBadge
                  label={settings.telemetryEnabled ? settings.telemetryLevel : "отключена"}
                  tone={settings.telemetryEnabled ? "info" : "neutral"}
                  mono
                />
              </dd>
            </div>
            <div>
              <dt>Плотность интерфейса</dt>
              <dd>{settings.uiDensity}</dd>
            </div>
            <div>
              <dt>Загружено из</dt>
              <dd>{source}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <EmptyState
            title="Редактор настроек не входит в базовую сборку"
            description="Правка настроек, окружения SAP и управление тестовыми данными появятся в спринте M4. Значения выше проверяются прикладным слоем и сохраняются через StoragePort."
            note="SPEC-001 §12 · ADR-001, правило 13"
          />
        </article>
      </div>
    </section>
  );
}
