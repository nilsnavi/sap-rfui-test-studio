# Architecture Baseline — Foundation Build (M0)

Status: **accepted** · Applies to: `0.1.0` · Source of truth for rules: [ADR-001](ADR-001-modular-architecture.md)

This document freezes what PROMPT-001 actually put into the repository, so that later
specs (SPEC-001 … SPEC-015) extend a known shape instead of re-deciding the layout.

## 1. Layering

```text
UI  →  Application  →  Domain  →  Ports  ↑  Adapters
```

| Layer         | Workspace package       | May depend on               | Must never know about                   |
| ------------- | ----------------------- | --------------------------- | --------------------------------------- |
| Domain        | `@sap-rfui/domain`      | nothing (pure TypeScript)   | React, Tauri, Zod, Zustand, SQLite, DOM |
| Ports         | `@sap-rfui/ports`       | Domain                      | concrete IO, frameworks                 |
| Application   | `@sap-rfui/application` | Domain, Ports               | React, Tauri, storage drivers, UI       |
| Reusable UI   | `@sap-rfui/ui`          | nothing product-specific    | Domain, Application, Ports, Tauri       |
| Desktop shell | `@sap-rfui/desktop`     | all of the above + adapters | — (it is the composition root)          |

`packages/ui` is intentionally a leaf: it ships design tokens and presentational components
only, so a future web runner (SPEC-008) can reuse it without pulling the product model in.

## 2. Module inventory

### `packages/domain`

- `errors.ts` — `AppErrorCode = UNKNOWN | CONFIGURATION_ERROR | STORAGE_ERROR | VALIDATION_ERROR`,
  `AppError`, `AppFailure`, `toAppError()` normalizing foreign throwables;
- `result.ts` — `Result<T> = { ok: true; value } | { ok: false; error: AppError }`, `ok`, `err`,
  `isOk`, `isErr`, `unwrapOr`, `fromThrowable`;
- `version.ts` — `ApplicationVersion` value object (`parse`, `create`, `compareTo`, `isAtLeast`,
  `isPrerelease`); invalid input yields `CONFIGURATION_ERROR`, never an exception;
- `health.ts` — `assessHealth(signals)` → `OK | DEGRADED | FAILED` from blocking/non-blocking signals;
- `product.ts` — `PRODUCT_NAME`, `PRODUCT_VERSION_TEXT = "0.1.0"`, `ReleaseChannel`,
  `productVersion()`, `minimumSupportedVersion()`.

### `packages/ports`

- `StoragePort` — async `read`/`write`/`remove`/`clear` over string keys;
- `FileStoragePort` — path/stat/read/write contract reserved for report and artefact export
  (SPEC-004); no implementation is wired in M0;
- `TelemetryPort` — single `emit(entry)` sink;
- `logger.ts` — `createTelemetryLogger(port, options)`: level filtering, scope nesting
  (`sap-rfui.application.startup.storage`), and redaction of credential-shaped keys to
  `[REDACTED]`. Application code depends on the logger, never on `console`.

### `packages/application`

- `storage-keys.ts` — `STORAGE_KEYS` registry; every persisted key is versioned
  (`app.settings.v1`);
- `settings/app-settings.ts` — Zod schema, `.strict()` so unknown keys are rejected, defaults,
  `SETTINGS_SCHEMA_VERSION = 1`, parse/serialize helpers returning `Result`;
- `settings/settings-service.ts` — `loadAppSettings` (defaults / stored / corrupted-with-recovery)
  and `saveAppSettings` (validate before write);
- `queries/app-info.ts` — `getAppInfo(channel)` DTO for identity rendering;
- `use-cases/initialize-workspace.ts` — startup orchestration returning a
  `WorkspaceStartupReport` with a `HealthAssessment`;
- `testing/fake-ports.ts` — in-memory storage and recording telemetry fakes; this is what makes
  the Application layer testable without SAP, Tauri or SQLite (ADR-001 Rule 15).

### `packages/ui`

`tokens.css` (dark/technical palette, spacing, typography), `components.css`, and four
components: `LoadingState`, `EmptyState`, `StatusBadge`, `ErrorBoundary`.

### `apps/desktop`

- `src/app/composition/container.ts` — the **only** module constructing adapters; exposes a
  narrow `AppContainer` (`initialize`, `persistSettings`, `reportRenderError`, `telemetry`,
  `storage`, `appInfo`, `channel`);
- `src/adapters/` — `WebStorageAdapter` (+ `InMemoryStorageAdapter` fallback, key namespace
  `sap-rfui:`), `ConsoleTelemetryAdapter`;
- `src/state/` — Zustand store created by a factory and provided through React context, so no
  module-level singleton survives into tests;
- `src/screens/` — `Dashboard`, `EmulatorScreen` (explicit M1 placeholder), `SettingsScreen`;
- `src-tauri/` — Tauri v2 Rust shell: window declaration, capability set `core:default` only,
  no custom commands in M0.

## 3. Cross-cutting decisions

1. **Errors as values.** `Result` is the only failure channel crossing layer boundaries;
   thrown exceptions are normalized at the edge by `toAppError`.
2. **Storage behind a port.** Screens and services receive `StoragePort`; the concrete
   persistence mechanism (web storage now, Tauri FS/SQLite later per SPEC-007) is a
   composition-root detail.
3. **Telemetry behind a port.** Components take an injected logger; secrets are redacted in the
   abstraction so no adapter can leak them by accident.
4. **Configuration boundary.** Zod lives in Application; Domain keeps pure invariants. The
   settings schema is strict, which structurally blocks credential smuggling into persisted state.
5. **Source-only workspace packages.** Packages publish `./src/index.ts`; only the desktop app
   has a build step. Typecheck and tests therefore need no build ordering.
6. **Reference is not a dependency.** `reference/sap_rfui_emulator.html` is read-only legacy
   material for M1; nothing imports it and no code reads it at runtime.
7. **Основной язык пользовательского интерфейса — русский.** Every user-facing string in
   `apps/desktop` and `packages/ui` — screen copy, navigation, statuses, hints, onboarding and
   error text shown to the user — is written in Russian. English remains acceptable for
   technical identifiers only: file names, API and package names, error codes (`UNKNOWN`,
   `CONFIGURATION_ERROR`), CLI commands, technology names (`Tauri`, `SQLite`, `WebView`) and
   internal enum values (`OK | DEGRADED | FAILED`, `development`, `comfortable`, `app.settings.v1`).
   In M0 the copy is plain literals: no i18n framework is introduced, and adding one is out of
   scope until a real second locale is required. Telemetry messages and code comments stay
   English because they are developer-facing diagnostics, not UI.

## 4. Guard

`scripts/check-architecture.mjs` (run by `pnpm check:architecture`, wired into CI) asserts:

- forbidden module imports per scope (`react`, `@tauri-apps/*`, `zustand`, `zod`, `*sqlite*`,
  upward `@sap-rfui/*` references);
- forbidden platform globals in Domain/Ports/Application
  (`window`, `document`, `localStorage`, `navigator`, `fetch`, `console`, `XMLHttpRequest`);
- adapter imports only from `src/app/composition/` or `src/adapters/` (test files exempt).

It is a plain Node script on purpose: ADR-001 §6 asks for a guard, not for a dependency-graph
framework.

## 5. Extension points for the next milestones

| Next step                  | Where it plugs in                                                           |
| -------------------------- | --------------------------------------------------------------------------- |
| PROMPT-002 device emulator | new `Screen`/`DeviceProfile` types in Domain; `EmulatorScreen` renders them |
| Scanner/keyboard input     | desktop adapter implementing an input port; no Domain import of Tauri       |
| SAP WebView host           | adapter behind a port, decided by SPIKE-001; stays out of Domain            |
| Recorder / replay          | Application services over `FileStoragePort` + `StoragePort`                 |
| Reports                    | Application + `FileStoragePort` adapter (SPEC-004)                          |
| Native persistence         | replace `WebStorageAdapter` in the composition root only                    |

## 6. Known deviations from the ideal

- `FileStoragePort` is declared but unimplemented: no M0 feature needs files yet.
- The desktop fallback storage is volatile when `localStorage` is unavailable; acceptable for a
  foundation build, tracked for SPEC-007.
- Telemetry ends in the browser console; a file/OTLP sink belongs to SPEC-012.
