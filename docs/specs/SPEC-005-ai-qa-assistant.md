# SPEC-005 — SAP RFUI Test Studio: AI QA Assistant & Test Case Generator

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-004

## 1. Цель

AI используется поверх детерминированных QA artifacts для:
- Test Case generation;
- Expected Results;
- Preconditions/Postconditions;
- negative test candidates;
- missing assertion suggestions;
- failure analysis;
- run comparison;
- bug drafts.

AI не выполняет SAP actions напрямую.

## 2. Architecture

```text
Session / Scenario / Report
↓
AI Context Builder
↓
AI Provider
↓
Structured Result
↓
User Review
↓
Accepted Artifact
```

## 3. Safety / Grounding

Не передавать:
- passwords;
- cookies;
- auth headers;
- SAP tokens;
- credentials;
- лишний raw DOM.

Разделять:
- Observed;
- Suggested;
- Inferred.

Unsupported facts не выдавать как подтверждённые.

## 4. Structured Output

```ts
interface GeneratedTestCase {
  title: string;
  preconditions: string[];
  steps: GeneratedTestStep[];
  postconditions: string[];
  sourceRefs: SourceReference[];
}
```

Каждый generated step должен ссылаться на source IDs.

## 5. AI Artifact lifecycle

- Draft;
- Reviewed;
- Accepted;
- Rejected.

AI не изменяет Scenario/Assertions автоматически.

## 6. Functions

- Generate Test Case;
- Generate Expected Results;
- Suggest Assertions;
- Generate Negative Tests;
- Analyze Failure;
- Compare Runs;
- Draft Bug.

## 7. Validation

Structured output валидируется Zod.

Invalid source refs → `AI_OUTPUT_INVALID`.

Technical retries ограничены.

## 8. Privacy Mode

External AI ON/OFF.

Без AI:
- Emulator;
- Recorder;
- Replay;
- Assertions;
- Reports

должны продолжать работать.

## 9. Acceptance Criteria

- AI Test Case Draft создаётся.
- Source references есть.
- Expected Results и assertion suggestions работают.
- Negative tests = candidates.
- Failure Analysis разделяет facts/hypotheses.
- Bug Draft работает.
- Schema validation, versioning, accept/reject работают.
- Secrets не передаются provider.
- AI disabled mode работает.

## 10. Definition of Done

Provider abstraction, Context Builder, sanitization, structured generation, traceability, versioning, privacy mode и tests работают.
