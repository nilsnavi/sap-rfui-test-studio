/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  /** Dev server URL used by the Tauri shell (see .env.example). */
  readonly VITE_DEV_SERVER_URL?: string;
  /** Optional version override for diagnostics. */
  readonly VITE_APP_VERSION?: string;
  /** Telemetry threshold: debug | info | warn | error. */
  readonly VITE_LOG_LEVEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
