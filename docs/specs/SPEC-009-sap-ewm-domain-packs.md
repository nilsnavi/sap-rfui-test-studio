# SPEC-009 — SAP RFUI Test Studio: SAP EWM Domain Packs & Workflow Library

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-008

## 1. Цель

Сделать систему специализированной под SAP EWM/RFUI.

Domain Pack содержит:
- business entities;
- RFUI screens/signatures;
- semantic fields;
- domain actions;
- domain assertions;
- workflows;
- test data schemas;
- SAP message patterns;
- localization.

## 2. Domain Pack

```ts
interface DomainPack {
  id: string;
  name: string;
  version: string;
  domain: string;
  entities: DomainEntityDefinition[];
  screens: ScreenDefinition[];
  actions: DomainActionDefinition[];
  assertions: DomainAssertionDefinition[];
  workflows: WorkflowTemplate[];
  dataSchemas: TestDataSchema[];
  messagePatterns: SapMessagePattern[];
}
```

Первый pack: `sap-ewm-rfui`.

## 3. Entities

Минимум:
- HU;
- TU;
- BIN;
- PRODUCT;
- DELIVERY;
- WAREHOUSE;
- RESOURCE;
- QUEUE;
- DOOR;
- YARD;
- VEHICLE;
- TRAILER.

## 4. Semantic Screens

```ts
interface ScreenDefinition {
  id: string;
  name: string;
  requiredTexts?: string[];
  optionalTexts?: string[];
  fields?: ScreenFieldDefinition[];
  controls?: ScreenControlDefinition[];
  messagePatterns?: string[];
}
```

Использовать semantic names вместо generated IDs.

## 5. Domain Actions

Пример:
```yaml
action: scanHU
params:
  value: ${hu}
```

Компилируется в generic ScenarioAction.

Domain action не должен знать UI implementation.

Device-specific mapping допускается.

## 6. Domain Assertions

Пример:
```yaml
assertion: huAccepted
```

Компилируется в generic assertions.

## 7. Domain Scenario

```yaml
name: Move HU
domainPack: sap-ewm-rfui

steps:
  - do: scanHU
    value: ${hu}
  - do: confirm
  - expect: huMoveScreen
  - do: scanDestinationBin
    value: ${destinationBin}
  - do: confirm
  - expect: movementCompleted
```

## 8. Domain Compiler

```text
Domain Scenario
↓
Domain Compiler
↓
Generic Scenario
↓
Scenario Runner
```

## 9. Workflow Packs

Минимум:
- HU;
- TU;
- Picking;
- Putaway;
- Replenishment;
- Goods Receipt;
- Goods Issue;
- Yard.

## 10. Test Data Schemas

Поддержать semantic types и states:
- AVAILABLE;
- RESERVED;
- PROCESSED;
- INVALID;
- UNKNOWN.

Validation:
- required;
- type;
- regex;
- length;
- enum;
- custom validator.

## 11. Message Patterns / Localization

Поддержать RU/EN и несколько patterns.

Screen detection возвращает confidence/evidence.

Ambiguous match → `SCREEN_AMBIGUOUS`.

## 12. Teach Screen

Inspector может создать DRAFT Screen Definition.

Review пользователем обязателен.

Built-in pack нельзя менять напрямую.

## 13. Custom Packs

`project-custom extends sap-ewm-rfui`.

Custom pack может override:
- screens;
- mappings;
- messages.

## 14. Versioning

Pack pinning:
```yaml
domainPack:
  id: sap-ewm-rfui
  version: 1.0.0
```

Upgrade требует explicit diff/validation.

## 15. Storage

```text
domain-packs/
  sap-ewm-rfui/
    manifest.yaml
    entities/
    screens/
    actions/
    assertions/
    workflows/
    schemas/
    messages/
```

## 16. AI / Recorder

AI может использовать Domain vocabulary.

Recorder enrichment должен быть deterministic там, где semantic mapping однозначен.

## 17. Acceptance Criteria

- Domain framework работает.
- SAP EWM pack создан.
- Entities/screens/actions/assertions/workflows работают.
- Semantic field mapping работает.
- Ambiguous screens обрабатываются.
- Device mappings работают.
- Test Data schemas/messages/localization работают.
- Custom pack inheritance работает.
- Built-in immutable.
- Version pinning/upgrade работают.
- Workflow Library и Recorder enrichment работают.

## 18. Definition of Done

Domain Packs, EWM vocabulary, semantic screen/action layer, workflows, data schemas, localization, customization/versioning и tests работают.
