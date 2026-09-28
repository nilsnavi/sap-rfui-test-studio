# SPEC-006 — SAP RFUI Test Studio: Test IT Integration

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-005  
**Architecture rule:** Test IT is an external adapter, not part of Core Domain.

## 1. Цель

Интегрировать SAP RFUI Test Studio с Test IT:
- search/open Test Cases;
- import Test Case;
- link Test Case ↔ Scenario;
- create Scenario Draft from Test Case;
- create Test Case from Session/AI Draft;
- publish Run Results;
- upload screenshots/evidence;
- sync;
- traceability.

## 2. Lifecycle

```text
Test IT Test Case
↓
Import
↓
Local Test Case
↓
Scenario
↓
Replay
↓
Assertions
↓
Test Run
↓
Report/Evidence
↓
Publish Result
↓
Test IT
```

## 3. Port

```ts
interface TestManagementPort {
  findTestCases(query: TestCaseQuery): Promise<ExternalTestCaseSummary[]>;
  getTestCase(externalId: string): Promise<ExternalTestCase>;
  createTestCase(testCase: TestCase): Promise<ExternalArtifactRef>;
  updateTestCase(externalId: string, testCase: TestCase): Promise<void>;
  publishRunResult(request: PublishRunResultRequest): Promise<ExternalRunRef>;
  uploadAttachment(request: UploadAttachmentRequest): Promise<ExternalAttachmentRef>;
}
```

Test IT DTO не должен распространяться по Core.

## 4. Credentials

Base URL / Project / Auth method конфигурируются в integration settings.

Secret хранится только в protected credential storage.

Не хранить token в SQLite, logs или exports.

## 5. Import

Import создаёт локальный Test Case.

Test Case не становится executable Scenario автоматически.

Причина: Test Case описывает intent, а Scenario требует concrete executable actions, waits, assertions и bindings.

## 6. Linking

Один Test Case может иметь несколько Scenarios:
- RT40;
- U2;
- WT6000;
- negative variants.

Поддержать step mapping и coverage.

## 7. Scenario Draft

Из Test Case можно создать Draft.

Statuses:
- DRAFT;
- READY;
- VALIDATED.

До READY проверять:
- environment;
- device;
- variables;
- executable actions;
- assertions;
- locators/semantic targets.

## 8. Publish Local Test Case

Перед созданием/обновлением в Test IT показывать preview/diff.

Silent publication запрещена.

## 9. Sync

Если local и remote изменились:
- detect conflict;
- show diff;
- KEEP LOCAL;
- KEEP TEST IT;
- CANCEL.

Silent overwrite запрещён.

## 10. Publish Run Result

Preview должен показывать:
- Test Case;
- Scenario;
- PASS/FAIL;
- failed step;
- duration;
- selected attachments.

Default attachment policy:
- failed-step screenshots;
- final report.

## 11. Traceability

```text
Test IT
↓
Local Test Case
↓
Scenario
↓
Session
↓
Run
↓
Report
```

## 12. Offline Mode

Если Test IT недоступен:
- Emulator/Recorder/Replay продолжают работать;
- publish можно сохранить pending;
- retry не должен выполняться silently без policy.

## 13. Errors

- TESTIT_AUTH_ERROR;
- TESTIT_NETWORK_ERROR;
- TESTIT_NOT_FOUND;
- TESTIT_CONFLICT;
- TESTIT_VALIDATION_ERROR;
- TESTIT_ATTACHMENT_ERROR;
- TESTIT_RATE_LIMIT.

## 14. Adapter Structure

```text
integrations/
  testit/
    client/
    mappers/
    auth/
    test-cases/
    test-runs/
    attachments/
    errors/
```

## 15. Testing

Unit:
- DTO mapping;
- status mapping;
- step mapping;
- sync state;
- conflict detection;
- traceability;
- attachment policy;
- error normalization.

Contract tests использовать через fake HTTP server/sanitized fixtures.

Production Test IT не использовать в обычном CI.

## 16. Acceptance Criteria

- Connection Test работает.
- Search/Open/Import работают.
- Import не создаёт Scenario автоматически.
- Linking, multiple scenarios и mapping работают.
- Scenario Draft validation работает.
- Publish Test Case/Run Result работает только после preview.
- Conflict handling работает.
- Attachments и traceability работают.
- Offline mode работает.
- Integration failure не ломает Core.
- Audit работает.
- Secrets защищены.

## 17. Definition of Done

Test IT adapter, secure credentials, import/link/mapping/publish/sync/conflicts/attachments/traceability/offline/audit и tests работают.
