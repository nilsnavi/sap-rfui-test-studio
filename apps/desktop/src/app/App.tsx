import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import { ErrorBoundary, LoadingState, StatusBadge } from "@sap-rfui/ui";

import { AppShell } from "./AppShell";
import type { AppContainer } from "./composition/container";
import { useWorkspace, useWorkspaceStore } from "../state/store-context";
import { WorkspaceStoreProvider } from "../state/WorkspaceStoreProvider";
import { createWorkspaceStore } from "../state/workspace-store";

export interface AppProps {
  readonly container: AppContainer;
}

/** Root: owns the store lifetime and exposes one error containment boundary. */
export function App({ container }: AppProps) {
  const store = useMemo(() => createWorkspaceStore(container), [container]);

  return (
    <WorkspaceStoreProvider store={store}>
      <WorkspaceGate container={container} />
    </WorkspaceStoreProvider>
  );
}

function WorkspaceGate({ container }: AppProps): ReactNode {
  const store = useWorkspaceStore();
  const status = useWorkspace((state) => state.status);
  const error = useWorkspace((state) => state.error);

  useEffect(() => {
    void store.getState().initialize();
  }, [store]);

  if (status === "initializing") {
    return (
      <LoadingState
        label="Инициализация SAP RFUI Test Studio"
        detail="подготовка адаптеров · загрузка настроек · проверка подсистем"
      />
    );
  }

  if (status === "failed") {
    return (
      <section className="screen" aria-labelledby="startup-failed-title">
        <header className="screen__header">
          <h2 id="startup-failed-title" className="screen__title">
            Не удалось инициализировать базовый слой
          </h2>
        </header>
        <div className="callout callout--danger" role="alert">
          <StatusBadge label={error?.code ?? "UNKNOWN"} tone="danger" mono />
          <p className="callout__text">{error?.message ?? "Неизвестная ошибка запуска"}</p>
          <button
            type="button"
            className="ui-button"
            onClick={() => void store.getState().initialize()}
          >
            Повторить инициализацию
          </button>
        </div>
      </section>
    );
  }

  return (
    <ErrorBoundary title="Сбой интерфейса" onError={container.reportRenderError}>
      <AppShell />
    </ErrorBoundary>
  );
}
