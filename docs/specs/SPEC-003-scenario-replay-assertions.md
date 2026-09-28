# SPEC-003 — SAP RFUI Test Studio: Scenario Replay & Assertions

**Priority:** P0  
**Depends on:** SPEC-001, SPEC-002

## 1. Цель

Преобразовать Recorded Session в executable Scenario и автоматически воспроизводить его с Assertions.

```text
Recorded Session
↓
Normalize
↓
Scenario
↓
Replay Engine
↓
SAP RFUI
↓
Assertion Engine
↓
PASS / FAIL
```

## 2. Scenario

```ts
interface Scenario {
  id: string;
  name: string;
  environmentId: string;
  serviceId: string;
  deviceId: string;
  testDataSetId?: string;
  variables: Record<string, string>;
  steps: ScenarioStep[];
}
```

## 3. Actions

Поддержать:
- scan;
- keypress;
- click;
- input;
- wait;
- reload.

Использовать stable locator strategy:
1. stable id;
2. name;
3. role + accessible name;
4. label;
5. visible text;
6. selector fallback.

## 4. Variables

```yaml
variables:
  hu: "800000123456789"
  targetBin: "A01-02-01"
```

## 5. Wait Strategy

Запрещено полагаться на `sleep(5000)` как основной механизм.

```text
Action
↓
Expected event/condition
↓
SAP stabilization
↓
Assertion
```

## 6. Assertions

- expectText;
- expectNotText;
- expectField;
- expectValue;
- expectButton;
- expectEnabled;
- expectDisabled;
- expectVisible;
- expectNotVisible;
- expectUrl;
- expectScreen.

## 7. Screen Signature

Semantic screen определяется комбинацией texts/fields/buttons.

Ambiguous screen не должен выбираться случайно.

## 8. Run Result

Разделять:
- passed;
- failed;
- cancelled;
- error.

Error categories:
- timeout;
- element-not-found;
- assertion;
- navigation;
- sap-error;
- runner-error.

Failure screenshot обязателен.

## 9. Debug

Поддержать:
- NEXT;
- CONTINUE;
- STOP;
- RUN FROM STEP.

## 10. Retry

Business assertion retries = 0.

Technical retry допустим только для transient technical failure и должен отображаться в evidence.

## 11. Architecture

Manual и Replay используют один runtime path:

```text
ReplayEngine
↓
ActionDispatcher
↓
Scanner/Keyboard/SAP Adapter
↓
SAP
```

## 12. Acceptance Criteria

- Session → Scenario.
- Replay actions работают.
- Condition-based waits работают.
- Assertions работают.
- PASS/FAIL корректны.
- Failure evidence сохраняется.
- Run History, Debug, Run From Step работают.
- Variables/Test Data binding работают.

## 13. Definition of Done

Scenario Runner, Step Executor, Assertion Engine, wait strategy, run history/evidence и tests работают.
