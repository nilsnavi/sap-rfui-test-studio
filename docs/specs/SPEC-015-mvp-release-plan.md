# SPEC-015 — SAP RFUI Test Studio: MVP & Product Release Plan

**Status:** ACCEPTED FOR IMPLEMENTATION  
**Priority:** P0  
**Purpose:** Реальный план перехода от `sap_rfui_emulator.html` к продукту  
**Architecture baseline:** ADR-001

## 1. Главная цель

Не реализовывать SPEC-001...014 одновременно.

```text
CURRENT HTML
↓
MVP
↓
BETA
↓
v1.0
↓
v1.5
↓
ENTERPRISE
```

Каждый этап должен давать usable product.

## 2. Reference Prototype

`sap_rfui_emulator.html` используется как reference для:
- device geometry;
- screen dimensions;
- environments;
- services;
- auto-service mapping;
- device shell;
- scaling.

Монолитную HTML/CSS/JS архитектуру не переносить.

## 3. MVP

Scope:
- Desktop app;
- SAP environments;
- RFUI services;
- Device profiles;
- SAP viewer;
- device keys;
- scanner;
- test data;
- settings;
- diagnostics;
- logs.

Не входят:
- AI;
- Test IT;
- Replay;
- Regression;
- Remote Runner;
- RBAC;
- Coverage;
- Triage;
- Cloud.

## 4. MVP Sprints

### M0 Repository Foundation
- React/TS/Vite/Tauri;
- domain/application/ports/ui;
- strict TS;
- lint/tests/build;
- ADR-001.

### M1 Device Emulator
- RT40 244×400;
- U2 800×480;
- WT6000 800×480;
- Custom;
- exact geometry migration.

### M2 SAP Connection
- environment/service config;
- auto-service;
- open/reload/focus/fullscreen;
- diagnostics;
- critical WebView spike.

### M3 Keyboard + Scanner
- ENT/ESC/F1-F3/0-9/UP/DOWN/SCAN;
- physical mapping;
- real injection into SAP runtime.

### M4 Test Data + Settings
- datasets;
- SCAN/COPY/EDIT;
- SQLite;
- restore last config.

### M5 Diagnostics + Packaging
- Check SAP/WebView/Storage/Config;
- Event Log;
- secret masking;
- Setup.exe;
- Portable build if feasible.

## 5. MVP Definition of Done

- Desktop installs.
- RT40/U2/WT6000 work.
- SAP opens.
- Keyboard/Scanner work.
- Test Data/settings work.
- Diagnostics work.
- Installer works.

## 6. Beta

Scope:
- Recorder;
- Scenario Model;
- Session Library;
- Screenshots;
- Scenario Export.

Sprints:
- B1 Event Bus + Recorder;
- B2 Timeline + Screenshots;
- B3 Session Editor;
- B4 Session → Scenario.

## 7. v1.0

Scope:
- Replay;
- condition-based waits;
- Assertions;
- Reports;
- Failure Screenshots;
- Run History;
- Mock RFUI.

Sprints:
- R1 Scenario Runner;
- R2 Wait Strategy;
- R3 Assertion Engine;
- R4 Reports;
- R5 Hardening.

## 8. v1.5

Scope:
- Regression;
- Matrix;
- Visual Regression;
- Test IT;
- SAP EWM Domain Pack;
- AI QA Assistant.

Recommended order:
1. Regression Manager;
2. Visual Regression;
3. Test IT minimal;
4. Domain Pack;
5. AI.

AI не участвует в execution.

## 9. Enterprise 2.0

Только после доказанной полезности v1.x:
- Remote Runner;
- CI;
- Coverage;
- Failure Intelligence;
- Observability;
- RBAC;
- Security;
- Central Management.

## 10. Не делать сейчас

Не начинать MVP с:
- microservices;
- Kubernetes;
- cloud backend;
- central identity;
- multi-tenant SaaS;
- distributed queue;
- AI orchestration;
- graph DB.

## 11. Storage / CI

MVP runtime source of truth:
- SQLite.

Portable:
- YAML.

CI minimum:
- TypeScript;
- Lint;
- Unit Tests;
- Build.

После v1.0:
- E2E;
- Architecture Guards;
- Package Tests.

## 12. Test Strategy

- Unit;
- Integration;
- Mock RFUI E2E;
- Real SAP Manual Smoke.

Production SAP не использовать в automatic CI.

## 13. Version Plan

```text
0.1.0 Desktop shell
0.2.0 Devices
0.3.0 SAP integration
0.4.0 Scanner + Keyboard
0.5.0 Test Data
0.6.0 Packaged MVP
0.7.0 Recorder
0.8.0 Scenario Draft
0.9.0 Replay
1.0.0 Automation release
1.2 Regression
1.3 Visual Regression
1.4 Test IT
1.5 AI + SAP Domain
2.0 Enterprise
```

## 14. Critical Risks

1. SAP WebView integration.
2. Synthetic input/scanner events.
3. Screen introspection.

## 15. SPIKE-001 — SAP RFUI Controlled WebView

До Recorder/Replay/Assertions доказать:
- SAP opens;
- login works;
- cookies persist;
- active field accessible;
- scanner injection works;
- Enter works;
- screen text readable;
- screenshot possible.

Если PASS → продолжать.

Если FAIL → создать ADR-002 и изменить только SAP transport layer.

## 16. Recommended First Implementation Order

1. Repository.
2. Tauri shell.
3. RT40.
4. U2.
5. WT6000.
6. SAP config.
7. WebView proof.
8. Login proof.
9. Keyboard proof.
10. Scanner proof.
11. Test Data.
12. Settings.
13. Package EXE.
14. Recorder.

## 17. Acceptance Flows

### MVP
```text
Launch
↓
Select EWT
↓
Select RT40
↓
Open RFUI
↓
Login
↓
Select HU
↓
SCAN
↓
ENTER
↓
SAP next screen
```

### v1.0
```text
RECORD
↓
Perform HU workflow
↓
STOP
↓
Create Scenario
↓
RUN
↓
Assertions
↓
Report PASS
```

## 18. Product Boundary

- before v1.0: Local SAP RFUI QA Tool;
- v1.0: SAP RFUI Automation Tool;
- v1.5: SAP RFUI QA Platform;
- 2.0: Enterprise SAP RFUI Test Platform.

## 19. Главный Gate

До подтверждения controlled SAP runtime не начинать:
- Recorder;
- Replay;
- Assertions;
- AI.

## 20. Definition of Done

Release scopes, gates, milestones и implementation order приняты как baseline разработки.
