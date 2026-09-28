import { createContext, useContext } from "react";

import { useStore } from "zustand";

import type { WorkspaceState, WorkspaceStore } from "./workspace-store";

/**
 * Store identity is kept in a hook-only module while the JSX provider lives in
 * `WorkspaceStoreProvider.tsx`; splitting them keeps React Fast Refresh working.
 */
export const StoreContext = createContext<WorkspaceStore | null>(null);

/** Escape hatch for callbacks that need the full store (actions, tests). */
export function useWorkspaceStore(): WorkspaceStore {
  const store = useContext(StoreContext);
  if (store === null) {
    throw new Error("useWorkspaceStore must be used inside <WorkspaceStoreProvider>");
  }
  return store;
}

/** Selector-based access so components re-render only on the slices they read. */
export function useWorkspace<T>(selector: (state: WorkspaceState) => T): T {
  const store = useWorkspaceStore();
  return useStore(store, selector);
}
