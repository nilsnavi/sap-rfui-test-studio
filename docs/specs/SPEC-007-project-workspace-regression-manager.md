# SPEC-007 — SAP RFUI Test Studio: Project Workspace & Regression Manager

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-006

## 1. Цель

Создать полноценный QA workspace:
- Projects;
- Test Suites;
- Regression Packs;
- Scenario Groups;
- Environment × Device × Scenario matrix;
- bulk execution;
- release verification;
- coverage;
- execution queues;
- test data reservation.

## 2. Project Model

```text
Project
├── Test Suites
├── Regression Packs
├── Environments
├── Devices
├── Test Data Sets
├── Test Runs
└── Releases
```

## 3. Test Suites

Примеры:
- RFUI — Picking;
- Putaway;
- Replenishment;
- Goods Receipt;
- Goods Issue;
- Yard Management.

Scenario groups:
- Happy Path;
- Negative;
- Boundary;
- Smoke;
- Regression;
- Critical.

## 4. Regression Pack

```ts
interface RegressionPack {
  id: string;
  projectId: string;
  name: string;
  scenarioIds: string[];
  executionConfig: RegressionExecutionConfig;
}
```

## 5. Matrix

Главная модель:

```text
Scenario × Environment × Device
```

Cell statuses:
- pending;
- running;
- passed;
- failed;
- skipped;
- not-applicable.

## 6. Compatibility

Scenario может задавать:
- supportedDevices;
- supportedEnvironments;
- unsupported combinations.

Unsupported → N/A, не FAIL.

## 7. Preflight

Перед RUN проверить:
- environment config;
- service;
- dataset;
- supported device;
- variables;
- scenario validity;
- baseline requirement.

Результат:
- Ready;
- N/A;
- Blocked.

## 8. Execution Queue

Первая версия:
`concurrency = 1`.

Controls:
- PAUSE QUEUE;
- STOP;
- RE-RUN FAILED;
- RUN SELECTED.

Re-run создаёт новый MatrixRun и не изменяет историю.

## 9. Release

Release status:
- NOT_STARTED;
- IN_PROGRESS;
- TESTED;
- TESTED_WITH_ISSUES.

Не вводить автоматическое `READY_FOR_PROD`.

## 10. Coverage

Разделять:
- Test Case Coverage;
- Automation Coverage;
- Execution Coverage.

## 11. Dependencies

Scenario dependencies допустимы, но должны использоваться ограниченно.

Prerequisite FAIL → dependent Scenario = `BLOCKED_BY_DEPENDENCY`.

## 12. Test Data Isolation

Strategies:
- STATIC;
- PER_RUN;
- MANUAL;
- EXTERNAL.

Statuses:
- AVAILABLE;
- RESERVED;
- CONSUMED;
- INVALID.

```ts
interface TestDataReservationPort {
  reserve(request: DataReservationRequest): Promise<ReservedTestData>;
  release(reservationId: string): Promise<void>;
}
```

## 13. Export / Git-friendly representation

Project export:
- metadata;
- scenarios;
- suites;
- regression packs;
- config templates;

без credentials.

Runtime source of truth первой версии — SQLite.

YAML — portable representation.

## 14. Architecture

```text
Regression Pack
↓
Matrix Builder
↓
Preflight Validator
↓
Execution Planner
↓
Queue
↓
Scenario Runner
↓
Test Runs
↓
Aggregation
↓
Regression Report
```

## 15. Acceptance Criteria

- Projects/Suites/Packs работают.
- Matrix строится.
- N/A/Blocked корректны.
- Preflight и Queue работают.
- Retry Failed создаёт новый run.
- Releases работают.
- Coverage metrics разделены.
- Dependencies работают.
- Test Data Reservation работает.
- History сохраняется.
- Export/import работает.

## 16. Definition of Done

Project Workspace, Matrix, Queue, Regression Dashboard, Releases, Coverage, Dependencies, Test Data Reservation и tests работают.
