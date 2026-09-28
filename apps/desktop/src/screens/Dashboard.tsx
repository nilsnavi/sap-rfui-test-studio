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
          {app.channel === "development" ? "Development Build" : `Build channel: ${app.channel}`}
        </p>
      </header>

      <div className="callout">
        <StatusBadge label="Architecture foundation ready" tone={toneForHealth(health.state)} />
        <p className="callout__text">
          Repository bootstrap is complete: Tauri shell, layered architecture, ports and the
          foundation test suite are in place.
        </p>
      </div>

      <div className="grid">
        <article className="panel">
          <h3 className="panel__title">Subsystems</h3>
          <ul className="metric-list">
            <li>
              <StatusBadge label="storage" tone={signalTone(health, "storage")} mono />
              <span className="metric-list__value">StoragePort</span>
            </li>
            <li>
              <StatusBadge label="telemetry" tone={signalTone(health, "telemetry")} mono />
              <span className="metric-list__value">TelemetryPort</span>
            </li>
            <li>
              <StatusBadge label="version" tone={signalTone(health, "version")} mono />
              <span className="metric-list__value">{app.version}</span>
            </li>
          </ul>
          <p className="panel__footnote">
            {health.checkedCount} signals checked · {health.unhealthyIds.length} unhealthy
          </p>
        </article>

        <article className="panel">
          <h3 className="panel__title">Dependency direction</h3>
          <ol className="layer-map">
            <li>UI — @sap-rfui/ui, screens</li>
            <li>Application — @sap-rfui/application</li>
            <li>Domain — @sap-rfui/domain</li>
            <li>Ports — @sap-rfui/ports</li>
            <li>Adapters — apps/desktop/src/adapters</li>
          </ol>
          <p className="panel__footnote">Enforced by scripts/check-architecture.mjs</p>
        </article>

        <article className="panel">
          <h3 className="panel__title">Local settings</h3>
          <dl className="kv">
            <div>
              <dt>Source</dt>
              <dd>{settingsSource}</dd>
            </div>
            <div>
              <dt>Telemetry</dt>
              <dd>{settings.telemetryEnabled ? settings.telemetryLevel : "disabled"}</dd>
            </div>
            <div>
              <dt>Density</dt>
              <dd>{settings.uiDensity}</dd>
            </div>
            <div>
              <dt>Started at</dt>
              <dd>{startedAt}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h3 className="panel__title">Not implemented yet</h3>
          <ul className="pending-list">
            <li>SAP connection and WebView (Sprint M2)</li>
            <li>Device profiles and emulator shell (Sprint M1)</li>
            <li>Keyboard and scanner emulation (Sprint M3)</li>
            <li>Test data management on SQLite (Sprint M4)</li>
            <li>Recorder, replay, assertions, AI, Test IT (post-MVP)</li>
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
