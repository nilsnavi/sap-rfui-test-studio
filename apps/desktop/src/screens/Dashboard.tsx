import type { HealthAssessment, HealthState } from "@sap-rfui/domain";
import type { AppInfoDto, AppSettings } from "@sap-rfui/application";
import { StatusBadge } from "@sap-rfui/ui";
import type { StatusTone } from "@sap-rfui/ui";

function toneForHealth(state: HealthState): StatusTone {
  switch (state) {
    case "OK":
      return "success";
    case "DEGRADED":
      return "warning";
    case "FAILED":
      return "danger";
  }
}

export interface DashboardProps {
  readonly app: AppInfoDto;
  readonly health: HealthAssessment;
  readonly settings: AppSettings;
  readonly settingsSource: "defaults" | "stored";
  readonly startedAt: string;
}

/** Foundation dashboard: identity, layer map and subsystem health. */
export function Dashboard({ app, health, settings, settingsSource, startedAt }: DashboardProps) {
  return (
    <section className="screen" aria-labelledby="dashboard-title">
      <header className="screen__header">
        <h2 id="dashboard-title" className="screen__title">
          {app.productName}
        </h2>
        <p className="screen__subtitle">
          {app.channel === "development"
            ? "Сборка для разработчиков"
            : `Канал сборки: ${app.channel}`}
        </p>
      </header>

      <div className="callout">
        <StatusBadge label="Архитектурный фундамент готов" tone={toneForHealth(health.state)} />
        <p className="callout__text">
          Инициализация репозитория выполнена: оболочка Tauri, слоистая архитектура, порты и набор
          фундаментальных тестов на месте.
        </p>
      </div>

      <div className="grid">
        <article className="panel">
          <h3 className="panel__title">Подсистемы</h3>
          <ul className="metric-list">
            <li>
              <StatusBadge label="хранилище" tone={signalTone(health, "storage")} mono />
              <span className="metric-list__value">StoragePort</span>
            </li>
            <li>
              <StatusBadge label="телеметрия" tone={signalTone(health, "telemetry")} mono />
              <span className="metric-list__value">TelemetryPort</span>
            </li>
            <li>
              <StatusBadge label="версия" tone={signalTone(health, "version")} mono />
              <span className="metric-list__value">{app.version}</span>
            </li>
          </ul>
          <p className="panel__footnote">
            проверено сигналов: {health.checkedCount} · проблемных: {health.unhealthyIds.length}
          </p>
        </article>

        <article className="panel">
          <h3 className="panel__title">Направление зависимостей</h3>
          <ol className="layer-map">
            <li>UI — @sap-rfui/ui, экраны</li>
            <li>Application — @sap-rfui/application</li>
            <li>Domain — @sap-rfui/domain</li>
            <li>Ports — @sap-rfui/ports</li>
            <li>Adapters — apps/desktop/src/adapters</li>
          </ol>
          <p className="panel__footnote">Контролируется скриптом scripts/check-architecture.mjs</p>
        </article>

        <article className="panel">
          <h3 className="panel__title">Локальные настройки</h3>
          <dl className="kv">
            <div>
              <dt>Источник</dt>
              <dd>{settingsSource}</dd>
            </div>
            <div>
              <dt>Телеметрия</dt>
              <dd>{settings.telemetryEnabled ? settings.telemetryLevel : "отключена"}</dd>
            </div>
            <div>
              <dt>Плотность интерфейса</dt>
              <dd>{settings.uiDensity}</dd>
            </div>
            <div>
              <dt>Запущено в</dt>
              <dd>{startedAt}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h3 className="panel__title">Ещё не реализовано</h3>
          <ul className="pending-list">
            <li>Подключение к SAP и WebView (спринт M2)</li>
            <li>Эмуляция клавиатуры и сканера (спринт M3)</li>
            <li>Управление тестовыми данными на SQLite (спринт M4)</li>
            <li>Recorder, воспроизведение, проверки, AI, Test IT (после MVP)</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function signalTone(health: HealthAssessment, id: string): StatusTone {
  if (health.blockingIds.includes(id)) {
    return "danger";
  }
  return health.unhealthyIds.includes(id) ? "warning" : "success";
}
