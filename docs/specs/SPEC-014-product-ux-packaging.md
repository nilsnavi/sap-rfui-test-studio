# SPEC-014 — SAP RFUI Test Studio: Product UX, Onboarding & Release Packaging

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-013

## 1. Цель

Превратить техническую платформу в понятный desktop-продукт:
- first-run onboarding;
- project wizard;
- SAP setup wizard;
- device preview;
- keyboard-first UX;
- accessibility;
- demo workspace;
- installer;
- portable build;
- updater;
- documentation;
- crash recovery.

## 2. First Run

Welcome:
- CREATE PROJECT;
- IMPORT PROJECT;
- OPEN DEMO.

Wizard:
1. Project;
2. SAP Environment;
3. Device;
4. Test Data;
5. Verify Connection;
6. Finish.

## 3. SAP Connection UX

Fields:
- Name;
- Base URL;
- Client;
- Default Service.

TEST CONNECTION проверяет host/http/RFUI/WebView.

Ошибки показывать как:
- What happened;
- likely reason;
- what to check;
- technical details collapsed.

## 4. Device Wizard

Карточки:
- Urovo RT40;
- Urovo U2;
- Zebra WT6000;
- Custom.

Показывать:
- shell;
- resolution;
- orientation;
- recommended service.

## 5. Main Navigation

```text
Dashboard
Emulator
Recorder
Scenarios
Regression
Test Runs
Test Design
Triage
Test IT
Test Data
Domain Packs
System
```

Navigation role/context-aware.

## 6. Dashboard

Показывать:
- SAP status;
- Last Regression;
- Open Failure Clusters;
- Coverage;
- Recent Sessions;
- Runners.

Quick Actions:
- START MANUAL TEST;
- RECORD SESSION;
- RUN SCENARIO;
- RUN REGRESSION.

## 7. Emulator UX

Focus Mode скрывает лишние панели и оставляет:
- Device;
- SAP;
- Scanner;
- Recorder.

## 8. Keyboard-first

Shortcuts:
- Ctrl+R Recorder;
- Ctrl+Shift+S Scanner;
- Ctrl+Enter Run Scenario;
- Ctrl+D Diagnostics;
- Ctrl+K Command Palette.

## 9. Search / Empty States

Global Search:
- Scenarios;
- Test Cases;
- Sessions;
- Runs;
- Test Data;
- Defects.

Empty state всегда предлагает следующий action.

## 10. Scenario Editor

Modes:
- Visual;
- YAML;
- Read-only Preview.

Visual ↔ YAML lossless для supported schema.

## 11. Regression UX

Matrix — основная visualization.

Статусы не только цветом:
- ✓ PASS;
- ✕ FAIL;
- — N/A;
- ! BLOCKED.

## 12. Accessibility

- keyboard navigation;
- visible focus;
- screen-reader labels;
- contrast;
- no color-only states;
- 100/125/150% scale.

## 13. Demo Workspace

Mock RFUI, без реального SAP.

Содержит:
- sample devices;
- HU;
- scenarios;
- regression;
- failure;
- report.

Guided Tour:
1. Emulator;
2. Scan;
3. Record;
4. Stop;
5. Scenario;
6. Run;
7. Report.

## 14. Expert Mode

Показывает technical IDs, selectors, raw scenario, debug/adapters.

Normal Mode скрывает внутреннюю сложность.

## 15. Packaging

Primary: Windows.

Artifacts:
- Setup.exe;
- Portable ZIP;
- Runner CLI;
- Mock RFUI;
- Demo Workspace;
- Offline Docs;
- Licenses;
- Release Notes.

Default install scope — Current User, без admin rights, если возможно.

## 16. Update / Crash

Update UI:
- UPDATE;
- LATER;
- VIEW CHANGES.

Crash recovery:
- Restore last session;
- Open diagnostics;
- Start normally.

Никакой автоматической отправки crash data без policy.

## 17. Performance UX

Target:
- 1000+ scenarios;
- 10000+ runs.

Использовать virtualization/lazy loading/search index.

## 18. Release Validation

Проверить:
- clean install;
- first run;
- demo;
- SAP setup;
- runner CLI;
- uninstall;
- upgrade N-1 → Current.

Uninstall не удаляет workspace без подтверждения.

## 19. Acceptance Criteria

- Onboarding/wizards работают.
- Error UX понятен.
- Dashboard/Focus/Shortcuts/Command Palette работают.
- Empty states работают.
- Visual/YAML editor работает.
- Accessibility baseline выполнен.
- Demo/Tour/Offline Docs работают.
- Installer/Portable/Update/Crash Recovery работают.
- Large workspace responsive.
- Upgrade сохраняет data.

## 20. Definition of Done

UX, onboarding, accessibility, demo, packaging, installer, updater, crash recovery, upgrade flow и UX E2E готовы.
