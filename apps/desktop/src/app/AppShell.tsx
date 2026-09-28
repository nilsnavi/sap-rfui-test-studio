import type { ReleaseChannel } from "@sap-rfui/domain";
import { StatusBadge } from "@sap-rfui/ui";
import type { StatusTone } from "@sap-rfui/ui";

import { Dashboard } from "../screens/Dashboard";
import { EmulatorScreen } from "../screens/EmulatorScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useWorkspace, useWorkspaceStore } from "../state/store-context";
import type { ScreenId } from "../state/workspace-store";

const NAVIGATION: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: "dashboard", label: "Панель" },
  { id: "emulator", label: "Эмулятор" },
  { id: "settings", label: "Настройки" },
];

const HEALTH_TONE: Record<"OK" | "DEGRADED" | "FAILED", StatusTone> = {
  OK: "success",
  DEGRADED: "warning",
  FAILED: "danger",
};

/** Release channel is a technical value; only its visible rendering is localized. */
const CHANNEL_LABELS: Record<ReleaseChannel, string> = {
  development: "версия разработки",
  beta: "бета-версия",
  stable: "стабильная версия",
};

export function AppShell() {
  const store = useWorkspaceStore();
  const activeScreen = useWorkspace((state) => state.activeScreen);
  const report = useWorkspace((state) => state.report);

  if (report === null) {
    // The shell renders only with a startup report; App.tsx handles other states.
    return null;
  }

  const { app, health, settings } = report;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__identity">
          <span className="topbar__name">{app.productName}</span>
          <StatusBadge label={`${app.version} · ${CHANNEL_LABELS[app.channel]}`} tone="info" mono />
        </div>
        <nav className="topbar__nav" aria-label="Основная навигация">
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                item.id === activeScreen ? "topbar__link topbar__link--active" : "topbar__link"
              }
              aria-current={item.id === activeScreen ? "page" : undefined}
              onClick={() => store.getState().navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="topbar__status">
          <StatusBadge
            label={health.state}
            tone={HEALTH_TONE[health.state]}
            title="Состояние подсистем"
          />
        </div>
      </header>

      <main className="content">
        {activeScreen === "dashboard" ? (
          <Dashboard
            app={app}
            health={health}
            settings={settings.settings}
            settingsSource={settings.source}
            startedAt={report.startedAt}
          />
        ) : null}
        {activeScreen === "emulator" ? <EmulatorScreen /> : null}
        {activeScreen === "settings" ? (
          <SettingsScreen settings={settings.settings} source={settings.source} />
        ) : null}
      </main>

      <footer className="statusbar">
        <span>Спринт M1 · эмулятор устройств</span>
        <span className="statusbar__sep" aria-hidden="true">
          ·
        </span>
        <span>Далее: SPIKE-001 — управляемый WebView для SAP RFUI</span>
      </footer>
    </div>
  );
}
