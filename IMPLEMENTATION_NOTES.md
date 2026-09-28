# IMPLEMENTATION NOTES — PROMPT-001 (repository bootstrap)

Branch: `feature/bootstrap` · Version: `0.1.0` · Executor: AI pair (Qoder) · Date: 2026-09-28
State: **uncommitted working tree, left for review on purpose** (see § "Deviations", item 1).

---

## 1. Verification — commands actually executed

| Command                             | Result           | Evidence                                                                                                    |
| ----------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm install`                      | **PASS**         | `Scope: all 6 workspace projects`, lockfile up to date                                                      |
| `pnpm check:architecture`           | **PASS**         | `Architecture guard passed — 5 layers, dependency direction preserved.`                                     |
| `pnpm typecheck`                    | **PASS**         | `tsc -p tsconfig.json` → `Done` in domain, ports, ui, application, desktop (0 errors)                       |
| `pnpm lint`                         | **PASS**         | `eslint .` → 0 errors, 0 warnings (after the two fixes in § 3)                                              |
| `pnpm test`                         | **PASS**         | 9 files / **56 tests** green: domain 14, application 19, ui 12, ports 7, desktop 4                          |
| `pnpm build`                        | **PASS**         | `vite v6.4.3 building for production`: `dist/index.html` 0.42 kB, CSS 9.59 kB, JS 217.51 kB (64.96 kB gzip) |
| `pnpm desktop:build`                | **PASS**         | `Finished release profile [optimized] target(s) in 6m 39s`, **no Rust warnings**, 2 bundles                 |
| `pnpm format:check` / `pnpm format` | **PASS**         | Prettier applied to `ts,tsx,css,json,md,yaml,yml`; re-verified afterwards                                   |
| `pnpm dev`, `pnpm desktop:dev`      | **NOT VERIFIED** | Long-running interactive processes were not started in this session                                         |
| GitHub Actions runs                 | **NOT VERIFIED** | No commit/push was made, so `.github/workflows/*` have never executed                                       |

### 1.1 Released binary was smoke-tested

`apps/desktop/src-tauri/target/release/sap-rfui-test-studio.exe` (3.0 MiB) was started, stayed alive
10 s (window rendered, no crash) and was closed through its main window:

```text
RUNNING pid=24092
CLOSED-NORMALLY exit=0
```

This satisfies PROMPT-001 § 13 (`start · render React · close normally · build · version 0.1.0`).

### 1.2 Bundles produced by `pnpm desktop:build`

```text
apps/desktop/src-tauri/target/release/bundle/msi/SAP RFUI Test Studio_0.1.0_x64_en-US.msi    1.57 MiB
apps/desktop/src-tauri/target/release/bundle/nsis/SAP RFUI Test Studio_0.1.0_x64-setup.exe    1.11 MiB
```

## 2. MSVC / Windows SDK — the anticipated blocker did NOT happen

Pre-flight check suggested the build might fail: `where.exe cl` and `where.exe link.exe` both return
"could not find files" (no developer command prompt was active).

The build nevertheless succeeded, because the Rust `x86_64-pc-windows-msvc` toolchain does not need
MSVC on `PATH`: it locates the compiler through `vswhere`/registry (`find-msvc-tools`,
`windows_x86_64_msvc`). What was found on this machine:

```text
rustc 1.98.1 (48a229cea 2026-09-01) · cargo 1.98.1 · host x86_64-pc-windows-msvc
Visual Studio 2019 BuildTools  →  VC\Tools\MSVC\14.29.30133
Windows SDK                      →  10.0.14393.0 … 10.0.19041.0
Node v22.16.0 · pnpm 12.6.0
```

**Conclusion: no workaround, no stack change, no `windows-gnu` fallback was applied.** The MSVC
requirement in the README ("MSVC Build Tools + Windows SDK") is confirmed as sufficient but not
requiring an activated shell environment.

## 3. Problems met and fixed during execution

1. **`ERR_PNPM_IGNORED_BUILDS` (esbuild postinstall blocked by pnpm ≥ 10).**
   Fixed in `pnpm-workspace.yaml` with an explicit allow-list rather than `onlyBuiltDependencies`,
   which pnpm 12 ignores here:
   ```yaml
   allowBuilds:
     esbuild: true
   ```
2. **Two Vite copies in the dependency tree (`vite@5.4.x` pulled by `vitest@2.1.8` next to the app's
   `vite@6.4.3`).** `apps/desktop/vite.config.ts` failed to type-check (`PluginOption` from two
   different Vite majors). Fixed by moving Vitest to `^3.2.4` (resolved `3.2.7`) in all six
   manifests, which is the release that pairs with Vite 6 — one Vite version, error gone.
3. **4 UI tests failing with "Found multiple elements with the role …".** With `globals: false`,
   @testing-library/react cannot register its automatic cleanup, so renders leaked between tests in
   one file. Fixed with `setupFiles` + `src/test/setup.ts` (`afterEach(cleanup)`) in `packages/ui`
   and `apps/desktop`.
4. **Desktop test "restores persisted settings on the next launch" failed.** The fixture wrote
   `sap-rfui:app.settings.v1`, but only `WebStorageAdapter` adds the namespace; `InMemoryStorageAdapter`
   stores raw keys. Fixed the fixture to write `STORAGE_KEYS.appSettings` — the logical key, which is
   the port contract.
5. **`react-refresh/only-export-components` warnings** in `state/store-context.tsx` (provider + hooks
   in one file). Split into `state/store-context.ts` (context + hooks) and
   `state/WorkspaceStoreProvider.tsx` (component only); Fast Refresh works again, lint is silent.
6. **`noUncheckedIndexedAccess`**: `this.sinks[entry.level](…)` in the console telemetry adapter was
   rejected; now resolved through a `?? this.sinks.info` fallback.
7. **Domain value-object subclassing**: `ApplicationVersion` had a `private constructor`, which made
   the invalid-constant fallback in `product.ts` impossible; changed to `protected`.
8. **`pnpm format` restyled 18 frozen documents** (`.ai/prompts/*`, `docs/specs/*`, `docs/spikes/*`)
   on its first run — pure Prettier markdown polish, but out of PROMPT-001 scope. Reverted with
   `git restore` and added those paths (plus the accepted ADR-001) to `.prettierignore`, so the
   authored specifications stay byte-identical. `README.md` is the only tracked file intentionally
   modified; `reference/sap_rfui_emulator.html` and `reference/README.md` are untouched.

## 4. Deliberate decisions inside the PROMPT-001 scope

- **Source-only workspace packages.** `main`/`types`/`exports` point at `./src/index.ts`; only
  `@sap-rfui/desktop` owns a `build` script. Consequence: `pnpm -r typecheck`/`test` need no build
  ordering, and `pnpm build` is exactly one Vite production build.
- **Errors as `Result`, not exceptions.** `AppErrorCode` extends the § 17 minimum
  (`UNKNOWN`, `CONFIGURATION_ERROR`) with `STORAGE_ERROR` and `VALIDATION_ERROR`, because storage
  probing and Zod parsing needed distinct categories from the start.
- **Zod lives in Application** (`settings/app-settings.ts`), keeping Domain dependency-free; the
  schema is `.strict()`, so unknown/padded keys (e.g. credentials) cannot reach persisted state.
- **Telemetry is a port + logger abstraction** with level filtering, scope nesting and secret
  redaction (`[REDACTED]`); no component calls `console` directly, which is what § 18 asks for.
- **Adapters are constructed only in `src/app/composition/container.ts`**; the architecture guard
  additionally rejects `adapters/` imports anywhere else in `apps/desktop/src` (tests exempt).
- **Store lifetime is per-composition**: the Zustand store is built by a factory and injected via
  React context, so shell tests can mount the whole app with fake ports and no module singletons.
- **Icons are generated, not committed art**: `scripts/generate-app-icons.mjs` deterministically
  produces PNG/ICO assets from the design tokens; replace with a real brand asset under SPEC-014.

## 5. Deviations from PROMPT-001 (explicit)

1. **§ 27 "one logical commit" not done.** The user instruction overrides it: no commit, no push.
   Everything is left in the working tree for review.
2. **§ 21 second path skipped.** `docs/architecture/adr/ADR-001-modular-architecture.md` was not
   created; the prompt allows reusing the existing ADR, and ADR-001 already lives at
   `docs/architecture/ADR-001-modular-architecture.md`. A duplicate would create two sources of
   truth. `docs/architecture/architecture-baseline.md` links to it.
3. **PROMPT-002 device profiles were not started** — `reference/sap_rfui_emulator.html` and
   `reference/README.md` are untouched (`git status` shows no modification); the emulator screen is an
   explicit M1 placeholder.

## 6. Scope compliance

Not implemented, as required: SAP integration, SAP WebView host, scanner input, session recorder,
replay, assertions, AI assistant, Test IT, Regression Manager, reports/visual regression. Nothing in
`packages/*` references SAP, ITS, WebSocket transport or recording concepts.

## 7. Known limitations to carry into later milestones

- Persistence uses `localStorage` through `StoragePort`; when unavailable the shell falls back to an
  in-memory store and the health probe reports `DEGRADED`. Native persistence arrives with SPEC-007.
- `FileStoragePort` is declared without an adapter — no M0 feature writes files yet (SPEC-004).
- Telemetry terminates in the webview console; a file/OTLP sink is SPEC-012.
- The release binary and its `target/` tree are local only; CI desktop packaging is a separate
  workflow that has never run here.
- CSP is declared in `tauri.conf.json`; in `tauri dev` Tauri does not apply it (`devCsp` unset), so
  Vite HMR works while production builds are locked to `default-src 'self'`.
- Product version `0.1.0` is duplicated in four manifests (`package.json`,
  `apps/desktop/package.json`, `PRODUCT_VERSION_TEXT`, `Cargo.toml`/`tauri.conf.json`); a release
  automation task should own this (SPEC-015).

## 8. Next step

PROMPT-002 (device profiles + RFUI screen model) on `feature/device-emulator`, after this bootstrap
has been reviewed and merged. Extension points are listed in
`docs/architecture/architecture-baseline.md` § 5.

## 9. UI localization follow-up (same branch, after § 1–8)

Follow-up task on `feature/bootstrap`: make the user-facing interface Russian. The rule is now
frozen as decision 7 in `docs/architecture/architecture-baseline.md`.

- Translated to Russian: three screens (`Dashboard`, `EmulatorScreen`, `SettingsScreen`), the shell
  (`AppShell` navigation, `aria-label`s, status tooltip, footer), the startup states in `App.tsx`
  (loading, failed, retry, `ErrorBoundary` title), the default copy of `packages/ui` components
  (`Загрузка`, `Сбой интерфейса`, `Повторить`, `Неизвестная ошибка`), `index.html` `lang="ru"`, the
  fatal `#root` message in `main.tsx`, and the user-visible strings in `tauri.conf.json` (window
  title, bundle short/long description).
- Kept in English on purpose (technical identifiers, per the rule): package and file names,
  `StoragePort`/`TelemetryPort`, error codes (`UNKNOWN`, `CONFIGURATION_ERROR`), internal enum
  values (`OK | DEGRADED | FAILED`, `development`, `defaults | stored`, `comfortable`,
  `app.settings.v1`, `Custom`), technology names (Tauri, WebView, SQLite, Test IT, AI), sprint/spec
  references, CLI commands, code comments and telemetry log messages.
- No i18n framework, no key catalog, no runtime language switching: literals stay where they were,
  only their language changed. Architecture, layering and business logic are untouched.
- Presentation-only change: the topbar build badge now renders
  `${app.version} · ${CHANNEL_LABELS[app.channel]}` instead of `AppInfoDto.buildLabel`, because the
  English "development build" wording is produced in `packages/application`, which the task scoped
  out. `buildLabel` itself is left as is.
- Remaining English that can reach a user, all outside the declared scope and flagged for a
  follow-up decision: `AppError.message` texts created in `packages/application`
  (e.g. `Unable to read application settings from storage`) shown on the startup-failure screen
  (that screen now frames them with a Russian heading and the Russian-labeled error code), and the
  Rust-side diagnostics in `src-tauri/src/lib.rs`/`main.rs`, which appear only in a native panic.
- Tests updated for the new copy: `apps/desktop/src/app/shell.test.tsx` (dashboard texts, Russian
  nav buttons, failure heading) and `packages/ui/src/components/states.test.tsx` (default loading
  label); one new regression test `falls back to Russian default copy, the product UI language` in
  `error-boundary.test.tsx` — 57 tests total, up from 56.
- Verification after the change: `pnpm typecheck`, `pnpm lint` (0 errors / 0 warnings), `pnpm test`,
  `pnpm build`, `pnpm check:architecture`, `pnpm format:check` — all green. `pnpm desktop:build` was
  re-run because `tauri.conf.json` is embedded at compile time: `Finished release profile in 2m 33s`,
  MSI 1.57 MiB + NSIS 1.11 MiB, WiX/NSIS accepted the Cyrillic bundle text; the rebuilt binary
  started with the window title `SAP RFUI Test Studio — версия для разработчиков` and closed
  normally (exit code 0).
- `docs/specs`, `.ai/prompts` and `docs/spikes` were not modified.
- Two hygiene fixes came out of the verification runs: the residual hard-break/whitespace restyle of
  `docs/architecture/ADR-001-modular-architecture.md` left in the working tree by the pre-ignore
  `pnpm format` run of § 3.8 was reverted with `git restore` (the file now matches `HEAD` exactly),
  and `.kilo` was added to `.prettierignore` because `pnpm format` was otherwise about to rewrite a
  second checkout of the repository living under `.kilo/worktrees/`.
