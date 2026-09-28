# ADR-001 — Modular Architecture Baseline

**Status:** Accepted  
**Project:** SAP RFUI Test Studio  
**Decision type:** Architecture Baseline  
**Applies from:** MVP / 0.1.0  
**Change policy:** Changes require a separate ADR

## 1. Context

SAP RFUI Test Studio развивается из рабочего `sap_rfui_emulator.html` в полноценный desktop-продукт для ручного и автоматизированного тестирования SAP EWM RFUI.

Прототип объединяет UI, configuration и runtime logic в одном HTML/JavaScript файле. Такой подход полезен для первоначальной проверки идеи, но не подходит для развития функций:

- Device Emulator;
- Scanner;
- Session Recorder;
- Replay;
- Assertions;
- Reports;
- Test IT integration;
- AI QA Assistant;
- Remote Runner;
- Regression;
- SAP EWM Domain Packs.

Необходимо зафиксировать архитектурный baseline до начала масштабной реализации.

## 2. Decision

Принять модульную архитектуру со следующим направлением зависимостей:

```text
UI
↓
Application Layer
↓
Domain/Core
↓
Ports
↑
Adapters
↓
SAP / Storage / OS / AI / External Systems
```

Основной технологический baseline:

- React;
- TypeScript;
- Vite;
- Tauri;
- Zustand;
- Zod;
- SQLite;
- Vitest;
- Playwright на более позднем этапе.

## 3. Layer Responsibilities

### UI

Содержит:

- screens;
- components;
- user interaction;
- rendering;
- presentation state.

UI не должен напрямую:

- управлять SAP DOM;
- обращаться к SQLite;
- обращаться к filesystem;
- вызывать AI provider;
- знать внутренние детали Test IT API.

### Application Layer

Содержит:

- use cases;
- orchestration;
- workflow coordination;
- authorization decisions;
- coordination между Domain и Ports.

Примеры:

```text
SelectDeviceUseCase
RunScenarioUseCase
StartRecordingUseCase
PublishRunResultUseCase
```

### Domain / Core

Содержит только domain concepts:

- Scenario;
- Session;
- Test Run;
- Device Profile;
- Assertions;
- Delivery;
- Routing;
- Coverage;
- Failure Cluster;
- Domain Pack.

Domain не зависит от:

- React;
- Tauri;
- Browser API;
- SQLite;
- filesystem;
- network libraries.

### Ports

Ports описывают контракты внешних зависимостей.

Примеры:

```text
SapPort
ScannerPort
KeyboardPort
StoragePort
FileStoragePort
ScreenshotPort
TestManagementPort
AiProviderPort
CredentialVaultPort
TelemetryPort
```

### Adapters

Adapters реализуют Ports для конкретных технологий:

- SAP WebView / browser adapter;
- SQLite;
- filesystem;
- Test IT;
- AI provider;
- OS credential storage;
- screenshot engine;
- remote runner transport.

## 4. Critical Architecture Rules

### Rule 1 — UI не управляет SAP напрямую

Запрещено:

```text
React Component
↓
SAP DOM mutation
```

Правильно:

```text
React Component
↓
Application Service
↓
SapPort
↓
SAP Adapter
```

### Rule 2 — Replay не управляет SAP DOM напрямую

Правильно:

```text
ReplayEngine
↓
ActionDispatcher
↓
SapPort / ScannerPort / KeyboardPort
↓
SAP Adapter
```

### Rule 3 — Manual и Automated execution используют один runtime path

Scanner button и Replay action `scan` должны использовать один Scanner service.

Physical Enter и Replay Enter должны использовать один Keyboard service.

### Rule 4 — Recorder работает через Application Event Bus

Recorder не должен подписываться напрямую на implementation details React components.

Он записывает intent-level events:

```text
SCAN HU
PRESS ENTER
CLICK "Перемещение"
```

а не raw DOM event sequence.

### Rule 5 — Scenario является pure domain model

Scenario не должен содержать:

- React components;
- Tauri objects;
- WebView references;
- SQLite records;
- provider-specific DTOs.

### Rule 6 — Assertion Engine работает с normalized SAP state

```text
SAP Adapter
↓
SapScreenState
↓
Assertion Engine
```

Assertion Engine не должен знать WebView/DOM implementation details.

### Rule 7 — Только SAP Adapter знает детали SAP runtime

SAP Adapter может знать:

- DOM;
- frames;
- WebView;
- navigation;
- browser bridge;
- selectors.

Core не должен знать эти детали.

### Rule 8 — Condition-based synchronization

Fixed sleeps не являются основным механизмом синхронизации.

Использовать:

```text
expected event
↓
screen/DOM state
↓
stabilization
↓
timeout
```

### Rule 9 — Retry policy

Business assertion failures не retry-ятся автоматически.

Допустим только ограниченный technical retry для transient failures.

### Rule 10 — Device separation

Каждое устройство имеет собственный profile/adapter/geometry.

Device Profile и Device Geometry — разные concepts.

### Rule 11 — SAP configuration externalized

SAP URLs, environments и services не должны быть разбросаны по UI source code.

### Rule 12 — Secrets

Не хранить в project DB, YAML, logs или exports:

- passwords;
- tokens;
- cookies;
- authorization headers.

### Rule 13 — Storage через Ports

SQLite используется только через StoragePort.

Filesystem используется только через FileStoragePort.

Screenshots — через ScreenshotPort.

### Rule 14 — Normalized Error Model

Application должна использовать собственные application/domain errors вместо распространения raw library exceptions.

### Rule 15 — Core must be testable without SAP

Domain/Application tests должны выполняться с fake adapters без:

- SAP;
- Tauri;
- WebView;
- SQLite;
- external AI.

### Rule 16 — Mock RFUI mandatory

Automated CI должен использовать Mock RFUI.

Production SAP не является частью automatic CI baseline.

## 5. Repository Direction

Recommended structure:

```text
sap-rfui-test-studio/

apps/
  desktop/

packages/
  domain/
  application/
  ports/
  ui/

docs/
  architecture/
  specs/
  spikes/

.ai/
  prompts/

reference/
  sap_rfui_emulator.html
```

Точная структура может эволюционировать, но dependency boundaries менять без ADR нельзя.

## 6. Architecture Guards

CI должен проверять минимум:

- Domain не импортирует React.
- Domain не импортирует Tauri.
- Domain не импортирует SQLite.
- Domain не импортирует Browser API.
- Application не импортирует Desktop UI.
- UI не импортирует infrastructure implementations в обход composition root.

## 7. Composition Root

Concrete adapters подключаются централизованно.

Рекомендуемое место:

```text
apps/desktop/src/app/composition/
```

или эквивалент.

React components не должны самостоятельно создавать infrastructure clients.

## 8. Source of Truth

На первом этапе:

```text
SQLite = runtime source of truth
YAML = portable representation
```

Не использовать одновременно SQLite и Git как независимые authoritative sources.

## 9. AI Boundary

AI:

- не управляет SAP execution;
- не меняет Scenario автоматически;
- не определяет единолично PASS/FAIL;
- не является обязательным для Core.

## 10. External Systems

Test IT, AI provider, Jira, external secret stores и другие системы подключаются только через Ports/Adapters.

## 11. Consequences

Плюсы:

- тестируемость;
- замена SAP transport layer без переписывания Core;
- возможность отдельного Runner;
- возможность future enterprise deployment;
- контролируемые зависимости;
- упрощённая эволюция архитектуры.

Минусы:

- больше initial structure;
- требуется discipline при feature development;
- нельзя быстро «вызвать API прямо из компонента».

Эти издержки считаются приемлемыми.

## 12. Architecture Change Policy

Любое изменение следующих правил требует отдельного ADR:

- dependency direction;
- source of truth;
- SAP interaction model;
- Scenario execution path;
- security boundary;
- Runner architecture;
- persistence model.

Feature PR не должен молча изменять архитектурный baseline.

## 13. Acceptance

ADR-001 считается соблюдённым, если:

- слои физически разделены;
- architecture guards проходят;
- Core тестируется без SAP/Tauri;
- manual/replay paths используют общие services;
- external integrations подключены через ports;
- secrets не проходят через обычную persistence model.

## 14. Status

**ACCEPTED / FROZEN FOR IMPLEMENTATION**
