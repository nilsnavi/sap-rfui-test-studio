# SPEC-008 — SAP RFUI Test Studio: Remote Runner & CI Integration

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-007

## 1. Цель

Отделить execution runtime от Desktop UI.

Поддержать:
- CLI;
- headless/local runner;
- remote runner;
- CI;
- schedules;
- remote jobs;
- artifacts;
- centralized result collection.

## 2. Executables

- `sap-rfui-test-studio`
- `sap-rfui-runner`
- `sap-rfui-runner-agent`

## 3. CLI

```bash
sap-rfui-runner run   --scenario move-hu   --environment EWT   --device rt40
```

```bash
sap-rfui-runner regression   --pack rfui-critical   --environment EWT
```

Commands:
- run;
- regression;
- validate;
- list;
- version;
- doctor.

## 4. Exit Codes

- 0 PASS;
- 1 TEST FAILURE;
- 2 CONFIGURATION ERROR;
- 3 RUNNER ERROR;
- 4 CONNECTION ERROR;
- 5 CANCELLED.

Business failure и runner/infrastructure failure не смешивать.

## 5. Artifacts

```text
artifacts/
  run-001/
    result.json
    report.html
    screenshots/
    logs/
    evidence.zip
```

## 6. Workspace

```text
workspace/
  scenarios/
  regression/
  devices/
  environments/
  datasets/
  screens/
```

Runner поддерживает validation и dry-run.

## 7. Remote Runner

Agent:
- получает Job;
- загружает immutable snapshot;
- запускает Scenario;
- сохраняет artifacts;
- возвращает Result;
- очищает temp context.

Agent не редактирует Scenarios/Test Cases.

## 8. Runner Registry

Сохранять:
- Runner ID;
- Host/OS;
- Capabilities;
- Status;
- heartbeat.

Statuses:
- ONLINE;
- BUSY;
- OFFLINE;
- ERROR;
- DISABLED.

## 9. Jobs

States:
- QUEUED;
- ASSIGNED;
- RUNNING;
- PASSED;
- FAILED;
- ERROR;
- CANCELLED.

Initial assignment: first available compatible runner.

## 10. CI Contract

```text
CLI + exit code + artifacts
```

Generic flow:
```text
Checkout
↓
Validate Workspace
↓
Run Regression
↓
Collect Artifacts
↓
Publish Result
```

## 11. Safety Policies

Default allowed environments:
- EWD;
- EWT.

Production запрещён по default policy.

Scenario может иметь:
```yaml
risk:
  destructive: true
```

Destructive guard обязателен.

## 12. Test Data Reservation

Remote execution использует reservation API.

Один mutable HU не должен одновременно попасть двум Jobs.

## 13. Snapshot / Traceability

Run хранит:
- workspace hash;
- scenario hash;
- runner version;
- runner ID;
- environment;
- device;
- schema version.

Snapshot immutable.

## 14. Offline Recovery

При потере central connection:
- test execution продолжается;
- artifacts сохраняются;
- status = pending-upload.

Upload recovery не запускает Scenario повторно.

## 15. Scheduler

Scheduler создаёт Jobs, Runner выполняет Jobs.

При нескольких runners возможен parallel execution.

## 16. Doctor

Проверять:
- runtime;
- WebView;
- workspace;
- filesystem;
- SAP connectivity;
- screenshots;
- configuration.

## 17. Logging / Security

Structured logs:
- ERROR;
- WARN;
- INFO;
- DEBUG;
- TRACE.

Runner communication authenticated.

Secrets не входят в repo/logs/artifacts.

## 18. Acceptance Criteria

- CLI run/regression работают.
- Exit codes корректны.
- JSON output/artifacts работают.
- Validate/Dry Run работают.
- Desktop и CLI используют один ScenarioRunner.
- Environment/destructive guard работает.
- Snapshots/hashes сохраняются.
- Remote Job lifecycle работает.
- Upload failure не меняет Test Result.
- Offline recovery работает.
- Scheduler/Multi-runner architecture работают.
- Doctor работает.
- Secrets защищены.

## 19. Definition of Done

Local/Remote Runner, CLI, CI contract, snapshots, policies, Job lifecycle, artifact publishing, recovery, scheduling, diagnostics и tests работают.
