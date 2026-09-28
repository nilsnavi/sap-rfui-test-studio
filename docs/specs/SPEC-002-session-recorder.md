# SPEC-002 — SAP RFUI Test Studio: Session Recorder

**Priority:** P0  
**Depends on:** SPEC-001

## 1. Цель

Записывать действия пользователя при работе с SAP RFUI:
- scan;
- keypress;
- click;
- input;
- navigation;
- timestamps;
- SAP screen state;
- screenshots;
- expected results;
- comments;
- test data refs.

Результат — воспроизводимая `TestSession`.

## 2. Recorder States

```ts
type RecorderState =
  | "idle"
  | "recording"
  | "paused"
  | "stopped"
  | "saving"
  | "error";
```

## 3. TestSession

```ts
interface TestSession {
  id: string;
  name: string;
  environmentId: string;
  serviceId: string;
  deviceId: string;
  testDataSetId?: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: "recording" | "completed" | "aborted" | "error";
  steps: RecordedStep[];
}
```

## 4. RecordedStep

```ts
interface RecordedStep {
  id: string;
  order: number;
  timestamp: string;
  offsetMs: number;
  actionType: RecordedActionType;
  action: RecordedAction;
  screenshotBefore?: ScreenshotRef;
  screenshotAfter?: ScreenshotRef;
  sapStateBefore?: SapScreenState;
  sapStateAfter?: SapScreenState;
  expectedResult?: string;
  comment?: string;
  testDataRefs?: string[];
}
```

Action types:
- scan;
- keypress;
- click;
- input;
- navigation;
- wait;
- custom.

## 5. Intent Recording

Recorder пишет не сырой DOM event stream, а intent.

Плохо:
```text
focus
mousedown
mouseup
click
keydown
keyup
```

Хорошо:
```text
CLICK "Перемещение"
SCAN HU
PRESS ENTER
```

Input должен агрегироваться debounce-механизмом.

## 6. Screenshots

Default: AFTER only.

Снимать после:
- SCAN;
- ENTER;
- F-key;
- significant click;
- navigation;
- error.

## 7. Timeline & Editor

Поддержать:
- timeline;
- rename;
- expected result;
- QA comment;
- delete step;
- merge step;
- export JSON/YAML.

## 8. Event Bus

Recorder подписывается на:
- scanner.scan;
- keyboard.press;
- sap.click;
- sap.input;
- sap.navigate;
- sap.error;
- device.change;
- service.change.

Не должен напрямую зависеть от React components.

## 9. Crash Recovery

- autosave;
- interrupted session recovery;
- sensitive fields redacted.

## 10. Acceptance Criteria

- RECORD/STOP/PAUSE/RESUME работают.
- Scan/keyboard/click/input/navigation фиксируются.
- Input агрегируется.
- Screenshots связаны со steps.
- Session сохраняется.
- Editor и exports работают.
- Secrets не записываются.
- Crash recovery работает.

## 11. Definition of Done

Recorder, Timeline, screenshots, Session Library, editing, JSON/YAML export, autosave/crash recovery и tests работают.
