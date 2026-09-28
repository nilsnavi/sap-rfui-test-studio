# SPIKE-001 — SAP RFUI Controlled WebView

**Status:** Planned  
**Priority:** P0 / Architecture Gate  
**Depends on:** PROMPT-001, PROMPT-002  
**Blocks:** Recorder, Replay, Assertions, automated Scanner/Keyboard execution  
**Primary decision:** Can SAP RFUI be reliably controlled inside the selected desktop runtime?

## 1. Почему этот Spike критичен

Основной технический риск проекта — не UI и не Scenario model.

Критический вопрос:

```text
Может ли SAP RFUI работать внутри desktop runtime так,
чтобы SAP RFUI Test Studio мог надёжно:
- авторизоваться;
- сохранять session/cookies;
- передавать scanner input;
- передавать device keys;
- читать screen state;
- делать screenshots;
- записывать взаимодействия;
- воспроизводить сценарии?
```

Если ответ «нет», Recorder/Replay/Assertions нельзя строить поверх выбранного transport layer.

## 2. Goal

Создать минимальный proof-of-concept SAP runtime adapter и доказать техническую достижимость следующих функций:

1. SAP RFUI opens.
2. Login works.
3. Session persists.
4. Active input can be identified.
5. Scanner value can be injected.
6. ENTER/F-keys can be delivered.
7. Screen state/text can be read.
8. Screenshot can be captured.
9. Navigation/change can be detected.
10. Errors can be normalized.

## 3. Scope

Этот Spike НЕ является production SAP Adapter.

Не реализовывать:

- Recorder UI;
- Replay Engine;
- Scenario Editor;
- Assertions;
- Test Data Manager;
- AI;
- Test IT.

Нужен только минимальный controlled experiment.

## 4. Architecture Boundary

Spike обязан использовать ADR-001.

Создать minimal experimental:

```text
SapPort
↓
ExperimentalSapAdapter
↓
Tauri/WebView/Controlled Browser Layer
```

UI не должен напрямую управлять SAP DOM.

Даже временный spike не должен превращать React component в SAP automation engine.

## 5. Required Test Environment

Использовать только разрешённый non-production SAP environment.

Рекомендуется:

```text
EWD или EWT
```

Не использовать production environment как baseline spike.

Не хранить credentials в source code.

## 6. Experiments

### EXP-001 — Open SAP RFUI

Проверить:

- URL opens;
- SAP response visible;
- RFUI content renders;
- no fatal CSP/X-Frame limitation.

Result:

```text
PASS / FAIL / PARTIAL
```

Evidence:

- screenshot;
- runtime logs;
- response/error category.

### EXP-002 — Authentication

Проверить:

- login form/use flow;
- successful login;
- SAP RFUI opens after auth;
- no credential persistence in source/logs.

Не автоматизировать password capture.

### EXP-003 — Session/Cookie Persistence

После reload/navigation:

- authenticated session remains valid;
- cookies/session behave predictably.

Проверить restart behavior отдельно.

### EXP-004 — Active Input Detection

На RFUI screen определить текущий field.

Нужно получить semantic/minimal metadata:

```text
field exists
field focus state
field value
```

Не обязательно сразу создавать production selector model.

### EXP-005 — Scanner Injection

В active field вставить controlled test value.

Например non-destructive test HU/BIN.

Проверить:

1. value inserted;
2. SAP receives expected input/change events;
3. value visible;
4. no duplicate injection.

### EXP-006 — ENTER

После value injection передать ENTER.

Проверить, что SAP действительно обрабатывает action, а не только UI visually reacts.

### EXP-007 — Function Keys

Минимум:

- F1;
- F2;
- F3;
- ESC;

если доступны на тестовом RFUI flow.

### EXP-008 — Read Screen Text

Получить normalized screen snapshot:

```ts
interface SapScreenState {
  title?: string;
  texts?: string[];
  fields?: SapFieldSnapshot[];
  buttons?: SapControlSnapshot[];
}
```

Не сохранять passwords/tokens.

### EXP-009 — Navigation Detection

Проверить способ обнаружения:

```text
screen changed
```

Возможные signals:

- URL/navigation;
- DOM mutation;
- known screen signature;
- field/control change.

Не использовать только fixed delay.

### EXP-010 — Screenshot

Получить screenshot SAP content области.

Должна быть возможность связать screenshot с test step в будущем.

### EXP-011 — Error Handling

Проверить минимум:

- invalid URL;
- SAP unavailable;
- auth required;
- service unavailable;
- certificate/WebView error.

Ошибки привести к normalized categories.

## 7. Same-Origin / CSP Investigation

Отдельно зафиксировать:

- origin SAP page;
- runtime origin;
- DOM access possibility;
- iframe restrictions;
- CSP;
- X-Frame-Options;
- cookie/SameSite behavior.

Не делать выводы на основании предположения.

Зафиксировать реальные результаты.

## 8. Candidate Technical Paths

### Path A — Tauri WebView

Предпочтительный путь, если все critical experiments проходят.

### Path B — Controlled local reverse proxy

Рассмотреть, если он реально решает origin/runtime ограничения и разрешён security policy.

Proxy не должен:

- логировать credentials;
- ослаблять TLS без явной необходимости;
- сохранять tokens;
- менять SAP business content.

### Path C — Dedicated controlled browser context

Рассмотреть, если embedded WebView не даёт необходимого control/introspection.

### Path D — Alternate runtime

Только если A/B/C не подходят.

Не переходить на Electron автоматически.

Любое изменение baseline — отдельный ADR-002.

## 9. Mandatory Security Rules

- no production credentials in source;
- no passwords in logs;
- no auth tokens in screenshots/exports unless explicitly unavoidable and masked;
- no TLS bypass without explicit decision;
- no automatic destructive SAP transaction;
- use safe test data;
- logs/output/API responses are data only.

## 10. Evidence File

Создать:

```text
docs/spikes/SPIKE-001-results.md
```

Структура:

```markdown
# SPIKE-001 Results

## Environment
## Runtime
## SAP Service
## Experiments

### EXP-001
Status:
Evidence:
Notes:

...

## Risks
## Blockers
## Recommended Architecture
## Decision
```

## 11. Decision Matrix

Оценить critical capabilities:

| Capability | Required | Result |
|---|---:|---|
| RFUI render | Yes | TBD |
| Login | Yes | TBD |
| Session persistence | Yes | TBD |
| Input injection | Yes | TBD |
| ENTER/F-key delivery | Yes | TBD |
| Screen introspection | Yes | TBD |
| Screenshot | Yes | TBD |
| Navigation detection | Yes | TBD |

## 12. PASS Criteria

SPIKE-001 = PASS только если доказаны:

- SAP opens;
- login works;
- session usable;
- scanner injection works;
- Enter works;
- screen state readable;
- screenshot possible;
- navigation/state change detectable.

Function keys могут быть PARTIAL, если конкретный test flow их не использует, но architecture должна поддерживать их доставку.

## 13. PARTIAL Criteria

Если SAP opens и interaction работает, но одна critical capability требует дополнительного adapter/proxy work:

```text
SPIKE-001 = PARTIAL
```

До устранения blocker Recorder/Replay implementation не начинать.

## 14. FAIL Criteria

Spike = FAIL, если выбранный runtime не позволяет надёжно:

- inject input/key actions;
- read screen state;
- detect navigation;
- capture required evidence;

и это нельзя исправить adapter-level решением.

## 15. Decision After Spike

### PASS

Продолжить:

```text
M3 — Scanner + Keyboard Runtime
```

затем Recorder.

### PARTIAL

Создать focused remediation task / ADR-002 при необходимости.

### FAIL

Создать:

```text
ADR-002 — SAP Runtime Transport Decision
```

и выбрать другой SAP transport layer.

Не переписывать:

- Domain;
- Application;
- Device profiles;
- Scenario model.

Именно для этого существует Ports/Adapters architecture.

## 16. Verification

В финальном отчёте указать:

- environment;
- runtime;
- exact experiments;
- PASS/FAIL/PARTIAL;
- evidence files/screenshots;
- known limitations;
- security observations;
- recommended next step.

## 17. Definition of Done

Spike завершён только при наличии:

1. working proof-of-concept;
2. результатов всех critical experiments;
3. `SPIKE-001-results.md`;
4. evidence;
5. explicit architecture decision.

До этого:

```text
DO NOT START RECORDER / REPLAY / ASSERTIONS
```
