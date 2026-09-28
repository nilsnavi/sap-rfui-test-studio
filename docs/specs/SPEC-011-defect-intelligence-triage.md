# SPEC-011 — SAP RFUI Test Studio: Defect Intelligence & Failure Triage

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-010

## 1. Цель

Автоматизировать triage regression failures:
- failure classification;
- fingerprinting;
- clustering;
- duplicate detection;
- known issues;
- flaky detection;
- test data vs environment vs automation vs product defect;
- first seen / last known good;
- change correlation;
- defect candidate;
- evidence package.

## 2. Pipeline

```text
Test Runs
↓
Failure Extractor
↓
Failure Normalizer
↓
Fingerprint Engine
↓
Cluster Engine
↓
Known Issue Matcher
↓
Flaky Detector
↓
Triage Engine
↓
Defect Candidates
```

## 3. Failure Categories

- assertion;
- sap-error;
- timeout;
- navigation;
- element-not-found;
- test-data;
- environment;
- runner;
- visual;
- unknown.

## 4. Normalization

Dynamic values должны заменяться semantic placeholders.

Пример:
`HU 800000001234567 not found`
→
`HU <HU> not found`

## 5. Fingerprint

Fingerprint учитывает:
- category;
- semantic screen;
- semantic action;
- normalized message;
- assertion signature.

Должен быть стабильным при изменении HU/BIN/timestamp/user/session ID.

## 6. Failure Cluster

Cluster хранит:
- fingerprint;
- failure IDs;
- scenario IDs;
- environments;
- devices;
- first seen;
- last seen;
- occurrence count;
- classification.

Cross-scenario/device/environment clustering обязателен.

## 7. Triage Classification

- probable-product-defect;
- probable-test-data;
- probable-environment;
- probable-automation;
- known-issue;
- flaky;
- needs-analysis.

`probable-*` — гипотеза, а не подтверждённый root cause.

## 8. Rule Engine

Сначала deterministic evidence:
- одинаковая ошибка на многих сценариях;
- разные devices;
- один environment;
- common dataset;
- SAP availability;
- selector/screen mismatch;
- history.

AI не меняет classification silently.

## 9. Known Issues

Known Issue содержит:
- fingerprint patterns;
- external defect ID;
- status;
- workaround.

Known Issue не превращает FAILED run в PASS.

## 10. Flaky Detection

Анализировать повторные runs одинакового scenario/config/data class.

Flaky threshold configurable.

Retries должны отображаться в evidence:
- Attempt 1 FAIL;
- Attempt 2 PASS.

## 11. Last Known Good

Определять:
- lastKnownGoodRun;
- firstKnownFailure;
- regression window.

Связывать с Change Impact из SPEC-010.

Correlation ≠ causation.

## 12. Triage Dashboard

Показывать:
- failed tests;
- unique clusters;
- known issues;
- probable defects;
- data issues;
- environment issues;
- flaky scenarios.

## 13. Defect Candidate

Содержит:
- title;
- summary;
- environments;
- devices;
- affected scenarios;
- steps to reproduce;
- expected;
- actual;
- evidence refs.

Statuses:
- draft;
- reviewed;
- published;
- rejected.

## 14. Defect Integration

Через `DefectManagementPort`.

Архитектурно поддержать:
- Jira;
- Test IT defects;
- Manual;
- Other.

Publication требует explicit confirmation.

## 15. Duplicate Check

Перед publish:
- Known Issues;
- external defect links;
- open Defect Candidates.

Показывать possible duplicate.

## 16. Fix Verification

Для fixed defect собрать verification pack.

Результат:
- PASS;
- FAIL;
- PARTIAL.

Regression of Known Issue определяется, но внешняя задача не reopen-ится автоматически.

## 17. Manual Triage

QA может:
- override classification;
- split cluster;
- merge clusters;
- ignore with reason.

История действий сохраняется в audit.

## 18. AI Role

AI может:
- предложить cluster name;
- сформировать summary;
- объяснить hypotheses;
- подготовить bug draft;
- предложить minimal reproduction.

Только на основании grounded evidence.

## 19. Acceptance Criteria

- FailureRecord создаётся.
- Normalization/Fingerprint стабильны.
- Clustering работает cross-scenario/device/environment.
- Known Issue matching работает.
- FAIL не превращается в PASS.
- Flaky detection работает.
- LKG/Regression Window работают.
- Change correlation работает.
- Classification имеет evidence.
- Manual override + audit работают.
- Defect Candidate/Evidence Package работают.
- Duplicate warning работает.
- Merge/Split работают.
- Fix Verification работает.
- Regression of Known Issue определяется.

## 20. Definition of Done

Failure Intelligence, Triage Dashboard, Known Issues, Flaky Analysis, Defect Candidates, evidence, audit и tests работают.
