# PROMPT-001 — Repository Bootstrap + Tauri + React Architecture

Ты работаешь над новым проектом:

**SAP RFUI Test Studio**

Цель текущего этапа — создать production-quality фундамент проекта.

## 1. Контекст

Существует reference prototype:

```text
sap_rfui_emulator.html
```

Он используется как reference implementation для будущей миграции device geometry, SAP environments/services и UI behavior.

На текущем этапе его бизнес-логику переносить не нужно.

Если файл доступен, сохранить:

```text
reference/sap_rfui_emulator.html
```

без функционального рефакторинга.

## 2. Главная задача

Создай новый проект:

```text
sap-rfui-test-studio
```

на базе:

- React;
- TypeScript;
- Vite;
- Tauri.

После завершения должен существовать первый запускаемый desktop build.

## 3. Scope

Не реализовывать:

- SAP WebView integration;
- Scanner;
- Recorder;
- Replay;
- Assertions;
- AI;
- Test IT;
- Regression;
- Remote Runner;
- RBAC;
- Cloud backend.

Текущий этап:

```text
FOUNDATION ONLY
```

## 4. Architecture Baseline

Соблюдать ADR-001:

```text
UI
↓
Application
↓
Domain
↓
Ports
↑
Adapters
```

Запрещено:

```text
Domain → React
Domain → Tauri
Domain → SQLite
Domain → Browser API
```

## 5. Recommended Repository Structure

```text
sap-rfui-test-studio/

apps/
  desktop/
    src/
    src-tauri/

packages/
  domain/
  application/
  ports/
  ui/

reference/

docs/
  architecture/

scripts/

.github/
```

Допускается минимальная корректировка структуры, если это технически обосновано, но архитектурные слои должны остаться физически разделёнными.

## 6. Responsibilities

### packages/domain

Только:

- entities;
- value objects;
- domain types;
- domain errors;
- pure domain services.

### packages/application

- application services;
- use cases;
- orchestration.

Зависит только от Domain/Ports.

### packages/ports

Минимальные interfaces:

- StoragePort;
- FileStoragePort;
- TelemetryPort.

Не создавать десятки placeholder ports.

### packages/ui

Reusable React UI components без product business logic.

### apps/desktop

- Tauri shell;
- React app;
- composition root;
- adapters;
- routing/screens.

## 7. Composition Root

Concrete adapters подключать централизованно.

Не создавать implementations внутри React components.

## 8. TypeScript

Включить:

```json
{
  "strict": true
}
```

Не отключать checks.

`any` — только при объективной необходимости.

## 9. Package Manager

Использовать pnpm workspace.

Создать:

```text
pnpm-workspace.yaml
```

Root commands:

```text
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Desktop:

```text
pnpm desktop:dev
pnpm desktop:build
```

или эквивалент.

## 10. First UI

Минимальные screens:

- Dashboard;
- Emulator;
- Settings.

Dashboard показывает:

```text
SAP RFUI Test Studio
Development Build
Architecture foundation ready
```

Emulator:

```text
RFUI Emulator
Device emulator will be implemented in Sprint M1.
```

Settings — minimal placeholder.

## 11. State / Validation

Подключить:

- Zustand;
- Zod.

Не создавать заранее множество stores/schemas.

## 12. UI Foundation

Визуальный стиль:

- dark;
- technical;
- industrial;
- enterprise;
- high information density.

Использовать design tokens.

Не разбрасывать arbitrary hex values по components.

Создать базовые reusable components:

- LoadingState;
- EmptyState;
- StatusBadge;
- ErrorBoundary.

## 13. Tauri

Application должна:

- start;
- render React;
- close normally;
- build.

Version:

```text
0.1.0
```

Application name:

```text
SAP RFUI Test Studio
```

## 14. Testing

Использовать Vitest.

Минимум:

- реальный Domain test;
- Application test с fake port;
- UI smoke/component test, если infrastructure разумно позволяет.

Не создавать `expect(true).toBe(true)`.

## 15. Architecture Guard

Простой automated guard должен проверять:

- Domain не импортирует React;
- Domain не импортирует Tauri;
- Domain не импортирует SQLite;
- Application не импортирует Desktop UI.

Не добавлять ради этого тяжёлый framework.

## 16. Lint / Format

Настроить:

- ESLint;
- Prettier или эквивалент.

Не использовать continue-on-error для quality gates.

## 17. Error Model

Создать минимальный normalized error model:

```ts
type AppErrorCode =
  | "UNKNOWN"
  | "CONFIGURATION_ERROR";

interface AppError {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
}
```

## 18. Logging

Создать лёгкий Telemetry abstraction.

React components не должны стать местом hardcoded logging behavior.

## 19. Security Baseline

Запрещено помещать в source:

- real passwords;
- tokens;
- SAP credentials;
- production secrets.

Создать `.env.example`.

`.gitignore` должен исключать:

- node_modules;
- dist;
- target;
- .env;
- .env.*;
- logs;
- temporary/IDE/OS local state.

Но сохранить `.env.example`.

## 20. README

Создать README:

- What is SAP RFUI Test Studio;
- Current Status;
- Architecture;
- Requirements;
- Installation;
- Development;
- Tests;
- Desktop Build;
- Project Structure;
- Roadmap.

Current status явно указывает, что SAP integration/device/scanner/recorder/replay пока не реализованы.

## 21. Architecture Docs

Создать:

```text
docs/architecture/architecture-baseline.md
docs/architecture/adr/ADR-001-modular-architecture.md
```

или использовать существующий ADR-001, если уже положен в repo.

## 22. Reference

Если legacy HTML доступен:

```text
reference/sap_rfui_emulator.html
reference/README.md
```

Reference file не используется как runtime dependency.

## 23. CI

Минимальный GitHub Actions:

- typecheck;
- lint;
- test;
- frontend build.

Desktop packaging можно вынести отдельно, если platform setup усложняет bootstrap.

## 24. Do Not Add Yet

Не подключать без необходимости:

- Playwright;
- OpenAI SDK;
- Test IT SDK;
- PostgreSQL;
- Redis;
- Docker;
- Electron;
- microservice framework.

Использовать Tauri.

## 25. Verification

Реально выполнить:

```text
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Если environment позволяет:

```text
pnpm desktop:build
```

Не заявлять PASS без запуска.

Невыполненное помечать `NOT VERIFIED`.

## 26. Final Report

Показать:

- Implemented;
- Architecture;
- Verification;
- Files;
- Known Limitations;
- project tree;
- `git status --short`;
- Next Step: PROMPT-002.

## 27. Commit

Если разрешено:

```text
feat: создать архитектурный фундамент SAP RFUI Test Studio
```

Один логический commit.

## 28. Acceptance Criteria

- Tauri + React + TypeScript project создан.
- Desktop запускается.
- Version 0.1.0.
- Dashboard/Emulator/Settings есть.
- Domain/Application/Ports разделены.
- TypeScript strict.
- Tests/Lint/Build проходят.
- Architecture guard существует.
- README/ADR/env/gitignore готовы.
- SAP functionality намеренно не реализована.

## 29. Definition of Done

Результат:

```text
SAP RFUI Test Studio 0.1.0
```

с запускаемым desktop shell и архитектурным фундаментом.

Следующий этап:

```text
PROMPT-002 — Device Profiles Migration
```
