# SPEC-012 — SAP RFUI Test Studio: Observability, Health & Operations

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-011

## 1. Цель

Обеспечить стабильную эксплуатацию:
- health checks;
- SAP connectivity;
- runner monitoring;
- queue health;
- storage health;
- integrations;
- structured logs;
- telemetry;
- diagnostics;
- backup/restore;
- maintenance;
- operational dashboard.

## 2. Health Model

```ts
interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  components: ComponentHealth[];
  checkedAt: string;
}
```

Проверять:
- Application;
- SQLite;
- Filesystem;
- Workspace;
- SAP;
- WebView;
- Screenshot Engine;
- Runner;
- Queue;
- Test IT;
- AI Provider;
- Remote Runner Service.

## 3. Health Semantics

External integration outage не должна автоматически делать всё приложение unhealthy.

Например:
Test IT unavailable + Core works → Application DEGRADED.

## 4. SAP Health

Read-only checks:
- DNS/hostname;
- HTTPS reachability;
- HTTP response;
- RFUI service;
- WebView navigation.

Errors:
- SAP_HOST_UNREACHABLE;
- SAP_HTTP_ERROR;
- SAP_AUTH_REQUIRED;
- SAP_SERVICE_UNAVAILABLE;
- SAP_WEBVIEW_ERROR;
- SAP_CERTIFICATE_ERROR.

## 5. Runner Health

Показывать:
- status;
- version;
- uptime;
- current job;
- last heartbeat;
- disk available;
- workspace state.

Heartbeat thresholds configurable.

## 6. Queue Health

Показывать:
- queued;
- running;
- blocked;
- oldest job age;
- failed assignments.

Stuck job detection → warning, не auto-cancel без policy.

## 7. Storage Health

Проверять:
- SQLite availability/integrity;
- writable filesystem;
- free disk;
- artifact dirs.

Low disk threshold configurable.

## 8. Metrics

Минимум:
- runs_total;
- runs_passed;
- runs_failed;
- runs_cancelled;
- scenario_duration;
- step_duration;
- assertion_failures;
- sap_errors;
- queue_depth;
- runner_online/offline;
- artifact_upload_failures;
- testit_errors.

Не использовать HU/User IDs как metric labels.

## 9. Structured Logs

Разделить:
- application;
- execution;
- integration;
- audit;
- diagnostics.

Обязательна sanitization:
- password;
- cookies;
- tokens;
- auth headers;
- sensitive fields.

## 10. Correlation IDs

Каждый Run/Job/Remote execution имеет correlation ID.

## 11. Diagnostics Center

Checks:
- SAP;
- Database;
- Storage;
- Runner;
- Test IT;
- AI;
- Workspace.

Desktop и CLI `doctor` используют общий diagnostics core.

## 12. Diagnostics Bundle

Содержит:
- app/runner version;
- OS;
- health snapshot;
- sanitized config;
- recent logs;
- DB metadata;
- integrations;
- diagnostics results.

Не содержит secrets/raw sensitive test data.

## 13. Backup / Restore

Backup:
- SQLite;
- settings;
- projects;
- scenarios;
- domain packs;
- test data metadata;
- integration metadata without secrets.

Artifacts optional.

Restore:
- validate archive;
- preview;
- confirmation;
- pre-restore safety backup, если возможно.

## 14. DB Migrations

Только versioned migrations.

Destructive migration → backup.

## 15. Maintenance / Cleanup

Показывать:
- DB size;
- artifacts size;
- screenshots;
- old runs;
- pending uploads;
- disk.

Cleanup не удаляет:
- baselines;
- pending uploads;
- protected evidence.

## 16. Operational Alerts

Categories:
- Runner Offline;
- SAP Unreachable;
- Disk Low;
- Queue Delayed;
- Integration Failed;
- Pending Uploads;
- DB Error.

Alerts dedupe и auto-resolve после восстановления.

## 17. Dashboard

Показывать:
- SAP health;
- runners;
- queue;
- disk;
- pending uploads;
- last 24h runs;
- functional failures;
- infrastructure failures.

Functional failure отделять от infrastructure failure.

## 18. Acceptance Criteria

- Health subsystem работает.
- Component statuses корректны.
- SAP/Runner/Queue/Storage checks работают.
- Structured logs + sanitization работают.
- Correlation IDs работают.
- Diagnostics/Bundle работают.
- Backup/Restore/Migrations работают.
- Cleanup policies и protections работают.
- Alerts dedupe/auto-resolve работают.
- Operational Dashboard работает.
- Functional vs infrastructure failures разделены.

## 19. Definition of Done

Observability, Diagnostics, Telemetry, Backup/Restore, Maintenance, Alerts и Operations Dashboard работают и покрыты тестами.
