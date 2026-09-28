import { create } from "zustand";

import type { WorkspaceStartupReport } from "@sap-rfui/application";
import type { AppError } from "@sap-rfui/domain";

import type { AppContainer } from "../app/composition/container";

export type ScreenId = "dashboard" | "emulator" | "settings";

export type WorkspaceStatus = "initializing" | "ready" | "failed";

export interface WorkspaceState {
  readonly status: WorkspaceStatus;
  readonly report: WorkspaceStartupReport | null;
  readonly error: AppError | null;
  readonly activeScreen: ScreenId;
  /** Runs the startup use case exactly once per store lifetime. */
  initialize: () => Promise<void>;
  navigate: (screen: ScreenId) => void;
}

/**
 * Feature state for the desktop shell.
 *
 * The store never talks to storage, telemetry adapters or Tauri directly: it only
 * calls the injected composition root. Screens read it through selectors.
 */
export function createWorkspaceStore(container: AppContainer) {
  let initialized = false;

  return create<WorkspaceState>()((set, get) => ({
    status: "initializing",
    report: null,
    error: null,
    activeScreen: "dashboard",

    async initialize() {
      if (initialized) {
        return;
      }
      initialized = true;
      set({ status: "initializing", error: null });

      const result = await container.initialize();

      if (result.ok) {
        set({ status: "ready", report: result.value });
      } else {
        initialized = false;
        set({ status: "failed", error: result.error });
      }
    },

    navigate(screen) {
      if (get().activeScreen === screen) {
        return;
      }
      container.telemetry.debug("Screen navigation", { screen });
      set({ activeScreen: screen });
    },
  }));
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
