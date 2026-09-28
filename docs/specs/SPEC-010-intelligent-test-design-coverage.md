# SPEC-010 — SAP RFUI Test Studio: Intelligent Test Design & Coverage

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-009

## 1. Цель

Оценивать не только количество тестов, но реальную полноту покрытия.

Dimensions:
- Requirement;
- Workflow;
- Screen;
- Action;
- Entity;
- Negative;
- Environment;
- Device;
- Data;
- Execution.

## 2. Coverage Model

```ts
interface CoverageModel {
  projectId: string;
  dimensions: CoverageDimensionResult[];
  generatedAt: string;
}
```

Coverage statuses:
- covered;
- partial;
- uncovered;
- not-applicable.

## 3. Design vs Execution Coverage

Scenario может существовать, но не запускаться.

Разделять:
- Design Coverage;
- Execution Coverage.

## 4. Workflow / Screen / Action / Entity Coverage

Inventory берётся из Domain Packs.

Каждый covered item должен иметь traceability к Test Case/Scenario/Run.

## 5. Negative Coverage

Примеры:
- invalid HU;
- unknown BIN;
- already processed;
- empty scan;
- boundary;
- incompatible state.

Negative coverage показывает:
- Test Exists;
- Executed;
- Result.

## 6. Data Coverage

Классы:
- valid;
- invalid;
- boundary;
- reusable;
- consumed;
- warehouse variants;
- state variants.

## 7. Requirements

Sources:
- Test IT;
- Jira;
- Manual;
- Imported spec.

Traceability:
```text
Requirement
↓
Test Case
↓
Scenario
↓
Run
```

## 8. Partial / Stale Coverage

Critical policy может требовать:
- happy path;
- negative;
- assertions;
- recent execution.

Stale threshold configurable.

## 9. Assertion Coverage

Scenario без проверки результата считается Partial automation coverage.

## 10. Test Gaps

Примеры:
- critical workflow without negative;
- screen never tested;
- scenario never run on U2;
- requirement without executable Scenario;
- significant action without assertion.

## 11. Risk Model

Inputs:
- criticality;
- recent changes;
- historical failures;
- coverage gaps;
- stale execution;
- complexity;
- device/environment variance.

Calculation deterministic/configurable.

## 12. Risk-Based Regression

Показывать:
- selected;
- excluded;
- reason.

Ничего не исключать silently.

## 13. Change Impact

```text
Changed Screen
↓
Domain Action
↓
Scenarios
↓
Regression Packs
↓
Test Cases
```

Direct и indirect impact различать.

## 14. Test Candidates

Sources:
- Gap;
- Workflow;
- Requirement;
- Failure;
- Change Impact.

Candidate требует QA review.

Перед созданием выполнять duplicate detection.

## 15. Coverage Snapshots

Сохранять snapshot на Release.

Позволяет:
- compare releases;
- detect coverage regression;
- объяснить снижение coverage при появлении новых requirements/screens.

## 16. Deterministic vs AI

Deterministic:
- calculation;
- graph;
- gaps;
- risk;
- impact;
- staleness.

AI-assisted:
- explanation;
- wording;
- interpretation;
- design suggestions.

## 17. Acceptance Criteria

- Все coverage dimensions работают.
- Design/Execution разделены.
- Assertion/Stale coverage работают.
- Gap Detection работает.
- Risk Model и risk-based selection работают.
- Impact Analysis работает.
- Test Candidates + duplicate warning работают.
- Snapshots/release comparison работают.
- Covered items имеют evidence.

## 18. Definition of Done

Coverage Engine, Gap Detector, Risk Model, Impact Graph, Candidates, Snapshots и tests работают.
