# PROMPT-002 — Device Profiles Migration

Ты работаешь в проекте:

```text
sap-rfui-test-studio
```

Предыдущий этап:

```text
PROMPT-001 — Repository Bootstrap + Tauri + React Architecture
```

должен быть завершён.

## 1. Цель

Перенести Device Emulator из legacy:

```text
reference/sap_rfui_emulator.html
```

в новую модульную архитектуру.

После Sprint пользователь должен переключаться между:

- Urovo RT40;
- Urovo U2;
- Zebra WT6000;
- Custom Portrait;
- Custom Landscape.

SAP integration на этом этапе не реализовывать.

## 2. Source Reference

`reference/sap_rfui_emulator.html` является source reference для:

- dimensions;
- orientation;
- shell proportions;
- screen offsets;
- geometry;
- scaling;
- visual layout.

Не изменять geometry «на глаз».

Сначала извлечь фактические значения из legacy implementation.

## 3. Required Device Baseline

### Urovo RT40

```text
Screen: 244 × 400
Orientation: portrait
```

### Urovo U2

```text
Screen: 800 × 480
Orientation: landscape
```

### Zebra WT6000

```text
Screen: 800 × 480
Orientation: landscape
```

### Custom Portrait

```text
Default: 320 × 480
```

### Custom Landscape

```text
Default: 800 × 480
```

## 4. Scope Boundary

Не реализовывать:

- SAP environment;
- SAP service;
- SAP WebView;
- SAP URL;
- Scanner injection;
- Keyboard injection;
- Recorder;
- Replay.

Внутри экрана устройства использовать neutral RFUI placeholder.

## 5. Domain Model

Создать чистые models:

```ts
type DeviceOrientation =
  | "portrait"
  | "landscape";

interface DeviceCapabilities {
  scanner: boolean;
  keyboard: boolean;
  functionKeys: boolean;
}

interface DeviceScreen {
  width: number;
  height: number;
  orientation: DeviceOrientation;
}

interface DeviceProfile {
  id: string;
  manufacturer?: string;
  model: string;
  displayName: string;
  screen: DeviceScreen;
  capabilities: DeviceCapabilities;
  visualProfileId?: string;
  recommendedSapService?: string;
}
```

## 6. Geometry Separation

Обязательное правило:

```text
DeviceProfile ≠ DeviceGeometry
```

Geometry:

```ts
interface DeviceGeometry {
  shellWidth: number;
  shellHeight: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  cornerRadius?: number;
}
```

Если legacy требует дополнительных named properties — добавить их явно.

## 7. Recommended Structure

```text
packages/domain/src/device/

apps/desktop/src/features/devices/
  components/
  profiles/
  geometry/
```

Придерживаться существующей архитектуры из PROMPT-001.

## 8. Device Registry

Создать единый registry.

Stable IDs:

```text
urovo-rt40
urovo-u2
zebra-wt6000
custom-portrait
custom-landscape
```

Display Name не использовать как primary key.

Default device: `urovo-rt40`.

## 9. Device Selector / Info

Emulator page должен показывать:

- Device selector;
- Model;
- Screen resolution;
- Orientation;
- Scanner capability;
- Keyboard capability.

Переключение device не должно требовать reload.

## 10. Device Shell / Screen

DeviceScreen — отдельный component.

Пример:

```tsx
<DeviceEmulator device={device}>
  <RfuiPlaceholder />
</DeviceEmulator>
```

Позже child заменяется на:

```tsx
<SapViewer />
```

без изменения geometry.

## 11. Scaling

Использовать uniform scale:

```ts
scale = Math.min(
  availableWidth / shellWidth,
  availableHeight / shellHeight
);
```

или эквивалент existing algorithm.

Нельзя независимо растягивать X/Y.

Использовать ResizeObserver вместо polling.

## 12. Custom Devices

Custom width/height editable.

Validation должна быть разумной и не запрещать реальные SAP resolutions.

Orientation можно определять автоматически либо хранить явно, но правило должно быть единым и покрытым tests.

## 13. Physical Keyboard Visual

Если legacy содержит keypad — перенести визуальную часть.

Keys пока `visual only`.

Никакой SAP event injection.

Можно отображать:

- ENT;
- F1/F2/F3;
- ESC;
- 0–9;
- FN;
- SCAN;
- arrows.

## 14. Shared Renderer

Основной renderer не должен быть набором:

```tsx
if (device === "rt40") ...
if (device === "u2") ...
```

Device-specific geometry/assets задаются profile/adapter data.

## 15. Assets

Если legacy содержит assets — использовать их.

Если assets отсутствуют, не скачивать случайные изображения из интернета.

Использовать neutral CSS shell.

## 16. State

Минимальный Zustand device state допустим:

```ts
interface DeviceState {
  selectedDeviceId: string;
}
```

Profiles не хранить внутри store.

Не добавлять SQLite специально ради persistence, если settings layer ещё не готов.

## 17. Tests

### Registry

Проверить:

- required profiles exist;
- IDs unique;
- dimensions correct.

### Geometry

Проверить:

```text
screenX + screenWidth <= shellWidth
screenY + screenHeight <= shellHeight
```

если model выражен этим способом.

### UI

Проверить:

- selector renders all devices;
- switching updates resolution;
- RT40 = 244×400;
- U2/WT6000 = 800×480;
- custom changes apply.

### Resize

Aspect ratio сохраняется.

## 18. Architecture Guard

Существующие architecture guards должны продолжать проходить.

Не ослаблять их.

Device feature не должен импортировать SAP environment/service runtime.

## 19. Migration Evidence

Создать:

```text
docs/migration/device-profile-migration.md
```

Для каждого device указать:

- Legacy source;
- Profile ID;
- Resolution;
- Orientation;
- Geometry;
- Notes;
- Migration status.

Не заявлять full visual parity, если проверена только geometry parity.

## 20. Legacy File Protection

`reference/sap_rfui_emulator.html` не изменять.

Проверить:

```text
git diff -- reference/sap_rfui_emulator.html
```

Expected: no changes.

## 21. Verification

Реально выполнить:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Если возможно:

```text
pnpm desktop:build
```

Провести manual check:

- RT40;
- U2;
- WT6000;
- Custom Portrait;
- Custom Landscape;
- resize window.

## 22. Final Report

Показать:

- Implemented;
- Legacy Values;
- Architecture;
- Verification;
- Parity Table;
- Known Limitations;
- `git status --short`;
- Next Step: SPIKE-001.

## 23. Commit

Если разрешено:

```text
feat: перенести профили устройств RFUI emulator
```

Один логический commit.

## 24. Acceptance Criteria

- RT40/U2/WT6000/Custom profiles готовы.
- Geometry отделена от Profile.
- Shared DeviceEmulator.
- DeviceScreen независим от shell.
- Resize/aspect ratio работают.
- Custom resolution работает.
- Legacy file не изменён.
- Migration document создан.
- Tests/build/guards проходят.
- SAP functionality не добавлена.

## 25. Definition of Done

Результат:

```text
SAP RFUI Test Studio 0.2.0
```

с рабочим Device Emulator.

Следующий обязательный этап:

```text
SPIKE-001 — SAP RFUI Controlled WebView
```

До PASS SPIKE-001 не начинать Recorder/Replay/Assertions.
