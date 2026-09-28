import type { ReactNode } from "react";

import { StoreContext } from "./store-context";
import type { WorkspaceStore } from "./workspace-store";

/** Binds a per-composition store instance to the React tree below the app root. */
export function WorkspaceStoreProvider({
  store,
  children,
}: {
  readonly store: WorkspaceStore;
  readonly children: ReactNode;
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
