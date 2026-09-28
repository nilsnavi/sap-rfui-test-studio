# SPEC-004 — SAP RFUI Test Studio: Test Reports & Visual Regression

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-003

## 1. Цель

Создать отчётность и regression comparison:
- failed step;
- expected/actual;
- screenshots;
- baseline;
- visual diff;
- text/control diff;
- performance comparison;
- run-to-run comparison.

## 2. Baseline

Baseline привязан минимум к:
- Scenario;
- Environment;
- Device.

RT40 baseline нельзя автоматически сравнивать с U2.

## 3. Visual Diff

```ts
interface VisualDiffResult {
  changed: boolean;
  differenceRatio: number;
  changedPixels?: number;
  boundingBoxes?: DiffRegion[];
  diffImage?: string;
}
```

Поддержать threshold и ignore regions.

## 4. Visual ≠ Functional

Допустимо:

```text
Functional: PASS
Visual: CHANGED
```

Policy решает, является ли visual difference failure.

## 5. Text / Control Diff

Сравнивать:
- texts;
- fields;
- buttons;
- labels;
- enabled state;
- visible state.

## 6. Performance

Сохранять duration steps и total duration.

Performance warning по default не меняет functional status.

## 7. Evidence Package

Экспорт:
- HTML;
- JSON;
- ZIP.

ZIP:
```text
report.json
scenario.yaml
screenshots/
diff/
logs.txt
```

Secrets должны быть masked.

## 8. Architecture

Visual engine — adapter через `VisualComparisonPort`.

## 9. Acceptance Criteria

- Reports показывают PASS/FAIL.
- Failure evidence есть.
- Baseline и history работают.
- Visual/text/control/performance diff работают.
- Run comparison работает.
- Export HTML/JSON/ZIP работает.
- Sensitive data отсутствуют в export.

## 10. Definition of Done

Reports, Baseline, Visual Regression, Performance, Evidence Export и tests работают.
