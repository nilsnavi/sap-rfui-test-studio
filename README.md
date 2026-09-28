# SAP RFUI Test Studio

Modular desktop workbench for testing **SAP RFUI** (Radio Frequency / ITS mobile) screens:
emulated device shell, scanner input, session recording, replay, assertions, reports and
AI-assisted test design — with a strict hexagonal architecture that keeps the SAP-specific
runtime at the edge of the system.

---

## Current Status

**Foundation build `0.1.0` (PROMPT-001) — architecture skeleton only.**

Implemented:

- pnpm workspace with `apps/desktop` and the four `packages/` layers;
- TypeScript `strict` everywhere, ESLint 9 + Prettier, Vitest;
- Domain primitives (`ApplicationVersion`, health assessment, normalized error model, `Result`);
- Ports (`StoragePort`, `FileStoragePort`, `TelemetryPort`) and the telemetry abstraction;
- Application services: settings load/save through Zod, app-info query, workspace initialization;
- Reusable UI kit (design tokens + `LoadingState`, `EmptyState`, `StatusBadge`, `ErrorBoundary`);
- Desktop shell: composition root, web adapters, three screens, Zustand store;
- Tauri v2 shell that starts, renders React and closes;
- Architecture guard script and CI.

**Not implemented yet** (deliberately out of PROMPT-001 scope):

- SAP integration and the SAP RFUI WebView host (SPIKE-001, later sprints);
- Device emulator and device profiles (PROMPT-002 / M1);
- Scanner input, keyboard handling;
- Session recorder, replay, assertions;
- Reports, visual regression, AI assistant, Test IT integration, Regression Manager;
- Persistent native storage (SQLite/Tauri FS) — settings currently persist through the web
  storage adapter only.

The Emulator screen is a placeholder that states this explicitly.

## Architecture

Dependency direction (see [ADR-001](docs/architecture/ADR-001-modular-architecture.md) and
[architecture baseline](docs/architecture/architecture-baseline.md)):

```text
UI (packages/ui, apps/desktop screens)
  ↓
Application (packages/application — services, use cases)
  ↓
Domain (packages/domain — pure entities, value objects, errors)
  ↓
Ports (packages/ports — interfaces only)
  ↑
Adapters (apps/desktop/src/adapters, wired in apps/desktop/src/app/composition)
```

Rules that the CI guard enforces:

- Domain imports nothing above it — no React, Tauri, Zod, Zustand, SQLite, browser globals;
- Ports stay interface-only;
- Application reaches storage and logging exclusively through ports;
- Concrete adapters are instantiated only inside the composition root;
- Failures cross layer boundaries as `Result`, not as thrown exceptions.

## Requirements

- Node.js ≥ 20 (developed against 22.x);
- pnpm ≥ 10 (`packageManager` is pinned in `package.json`);
- For the native desktop build only: Rust toolchain with the `x86_64-pc-windows-msvc` host,
  MSVC C++ Build Tools and the Windows SDK (WebView2 is used as the webview runtime).

## Installation

```bash
pnpm install
```

Workspace packages are consumed as TypeScript sources, so no per-package build step is
required before `typecheck`, `test` or `dev`.

## Development

```bash
pnpm dev              # Vite dev server for the desktop front end (http://127.0.0.1:5173)
pnpm desktop:dev      # Tauri window + Vite dev server (needs the Rust/MSVC toolchain)
pnpm typecheck        # tsc --noEmit across all workspaces
pnpm lint             # ESLint flat config
pnpm format           # Prettier write
pnpm check:architecture  # dependency-direction guard
pnpm verify           # guard + typecheck + lint + test + build
```

Copy `.env.example` to `.env` only if a local override is needed; `.env*` is never committed.

## Tests

```bash
pnpm test             # Vitest across all workspaces
```

Coverage at the foundation level:

| Package       | What is tested                                                             |
| ------------- | -------------------------------------------------------------------------- |
| `domain`      | `ApplicationVersion` parse/compare/prerelease, health assessment           |
| `ports`       | telemetry level filtering, scope nesting, secret redaction                 |
| `application` | settings load/save against fake ports, recovery, storage failures          |
| `ui`          | reusable state components, `ErrorBoundary`                                 |
| `desktop`     | shell smoke tests: dashboard render, navigation, startup failure, settings |

## Desktop Build

```bash
pnpm build            # tsc + vite build for apps/desktop
pnpm desktop:build    # tauri build → apps/desktop/src-tauri/target/release/bundle
```

`desktop:build` requires the MSVC toolchain; if the linker is missing the Rust compile step
fails and nothing is produced. The front-end build (`pnpm build`) is independent of it.

## Project Structure

```text
apps/
  desktop/                React app + Tauri shell (composition root, adapters, screens)
    src/app/composition/  the only place wiring concrete adapters
    src/adapters/         WebStorageAdapter, ConsoleTelemetryAdapter
    src/screens/          Dashboard, Emulator, Settings
    src/state/            Zustand store + React context
    src-tauri/            Tauri v2 Rust shell (window host, no business logic)
packages/
  domain/                 pure model: errors, Result, version, health, product
  ports/                  StoragePort, FileStoragePort, TelemetryPort, telemetry logger
  application/            settings service, app-info query, workspace use case, fakes
  ui/                     design tokens + reusable components
docs/
  architecture/           ADR-001, architecture-baseline.md
  specs/                  SPEC-001 … SPEC-015
  spikes/                 SPIKE-001
reference/                legacy sap_rfui_emulator.html — reference only, never a runtime
                          dependency
scripts/                  check-architecture.mjs, generate-app-icons.mjs
.github/workflows/        CI (quality gates) + desktop packaging
.ai/prompts/              PROMPT-001, PROMPT-002
```

## Roadmap

1. **M0 — Foundation** (this build): architecture, screens, ports, guard, CI.
2. **M1 — Device emulator** (PROMPT-002): device profiles, RFUI screen model, scanner and
   keyboard input inside the emulated shell.
3. **SPIKE-001** — controlled WebView hosting of a real SAP RFUI screen; gates everything below.
4. **M2+** — session recorder, replay, assertions, reports and visual regression,
   AI QA assistant, Test IT integration, Regression Manager, remote runner/CI.

Merge order stays strict: documentation on `main` → `feature/bootstrap` → `feature/device-emulator`
→ `spike/sap-rfui-webview`, and only after a successful spike do Scanner/Keyboard runtime,
Recorder and Replay begin.
