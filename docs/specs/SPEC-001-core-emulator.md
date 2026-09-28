# SPEC-001 — SAP RFUI Test Studio: Core Emulator

**Status:** Draft for Implementation  
**Priority:** P0  
**Product:** SAP RFUI Test Studio  
**Module:** Core Emulator  
**Target:** Desktop-first  
**Technology:** React + TypeScript + Vite + Tauri  
**Storage:** Local SQLite + local configuration  
**Source prototype:** `sap_rfui_emulator.html`

## 1. Цель

Создать первую промышленно пригодную версию SAP RFUI Test Studio — инструмента для тестирования SAP EWM RFUI без обязательного использования физического ТСД.

Приложение должно позволять:
- открывать SAP RFUI;
- выбирать SAP environment;
- выбирать RFUI service;
- эмулировать реальные модели ТСД;
- переключать разрешения экранов;
- использовать экран SAP внутри оболочки устройства;
- эмулировать физические кнопки ТСД;
- эмулировать сканирование штрихкодов;
- управлять тестовыми данными;
- сохранять пользовательские настройки;
- диагностировать проблемы подключения SAP.

SPEC-001 не включает полноценную автоматизацию тестов, AI, Replay и Test IT integration.

## 2. Scope

### Входит
1. Desktop shell.
2. SAP Environment selector.
3. SAP Service selector.
4. Device selector.
5. Device profiles.
6. Custom screen sizes.
7. RFUI WebView.
8. Device keyboard.
9. Physical keyboard mapping.
10. Barcode scanner emulator.
11. Test Data Manager.
12. Local settings.
13. Connection diagnostics.
14. Error states.
15. Basic logging.
16. Migration RT40/U2/WT6000 profiles.

### Не входит
- Recorder;
- Replay;
- automated scenarios;
- Assertions;
- visual regression;
- AI;
- Test IT integration;
- Jira;
- cloud sync;
- team accounts;
- CI/CD execution.

## 3. Device Profiles

Обязательные профили:
- Urovo RT40 — 244×400, portrait;
- Urovo U2 — 800×480, landscape;
- Zebra WT6000 — 800×480, landscape;
- Custom Portrait — default 320×480;
- Custom Landscape — default 800×480.

```ts
interface DeviceProfile {
  id: string;
  manufacturer: string;
  model: string;
  displayName: string;
  screen: {
    width: number;
    height: number;
    orientation: "portrait" | "landscape";
  };
  capabilities: {
    scanner: boolean;
    keyboard: boolean;
    functionKeys: boolean;
  };
  defaultSapService?: string;
  visualProfile?: string;
}
```

Device geometry хранить отдельно от profile.

```ts
interface DeviceGeometry {
  shellWidth: number;
  shellHeight: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
}
```

## 4. SAP Environment / Service

Поддержать:
- EWD;
- EWT;
- EWP;
- Manual.

```ts
interface SapEnvironment {
  id: string;
  name: string;
  client?: string;
  baseUrl?: string;
  services: SapService[];
}
```

Примеры services:
- ZRFUI;
- ZRFUI_HOR;
- ZRFUI_RT40;
- ZRF_H_800_480.

## 5. SAP Viewer

Поддержать:
- open;
- reload;
- focus;
- fullscreen;
- open externally.

Статусы:
- DISCONNECTED;
- CONNECTING;
- CONNECTED;
- LOADING;
- READY;
- ERROR.

Архитектура не должна зависеть исключительно от cross-origin iframe.

## 6. Keyboard

Минимум:
- ENT;
- ESC;
- F1/F2/F3;
- 0–9;
- FN;
- SCAN;
- Arrow Up/Down.

Default mapping:
- Enter → ENTER;
- Escape → ESCAPE;
- F1/F2/F3;
- ArrowUp/ArrowDown;
- F8 → SCAN.

## 7. Scanner

Типы:
- HU;
- TU;
- Delivery;
- Material;
- Bin;
- SSCC;
- Barcode;
- Custom.

При SCAN:
1. определить active SAP input;
2. вставить значение;
3. сгенерировать необходимые input/change events;
4. при auto-submit отправить Enter;
5. записать Event Log.

## 8. Test Data

Dataset actions:
- SCAN;
- COPY;
- EDIT;
- CREATE;
- RENAME;
- DELETE;
- DUPLICATE;
- EXPORT;
- IMPORT.

Основной persistent storage — SQLite.

Не сохранять passwords/tokens/cookies.

## 9. Architecture

```text
UI
↓
Application Layer
↓
Core Services
↓
Ports
↓
Adapters
```

Использовать Zustand для feature state и Zod для validation.

## 10. Acceptance Criteria

- Environment/Service selectors работают.
- RT40/U2/WT6000/Custom работают.
- SAP корректно отображается внутри bounds устройства.
- Keyboard/Scanner реально воздействуют на SAP runtime.
- Test Data сохраняется.
- Settings восстанавливаются.
- Diagnostics/Error states работают.
- Sensitive values не сохраняются и не логируются.

## 11. Definition of Done

React/Tauri app работает, device profiles мигрированы, SAP viewer/keyboard/scanner/test data/settings/diagnostics готовы, unit/integration/E2E smoke проходят, legacy HTML используется только как reference.
