/**
 * Storage keys owned by the Application layer.
 *
 * Adapters must not invent their own key names: every persisted value is written
 * through a key declared here, so migrations stay discoverable.
 */
export const STORAGE_KEYS = {
  /** Serialized `AppSettings` (schema versioned). */
  appSettings: "app.settings.v1",
  /** Ephemeral write/read probe used by the startup health check. */
  healthProbe: "diagnostics.storage.probe",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
