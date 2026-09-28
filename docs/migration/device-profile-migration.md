# Device Profiles Migration — PROMPT-002

Перенос Device Emulator из legacy-реализации
`reference/sap_rfui_emulator.html` в модульную архитектуру проекта
(UI → Application → Domain → Ports ↑ Adapters).

Legacy-файл использовался **только как reference implementation и данные**.
Файл `reference/sap_rfui_emulator.html` не изменялся
(`git diff -- reference/sap_rfui_emulator.html` пустой).

## Источник значений

Все числовые geometry-значения извлечены из функции `applyScreenSize()` и
CSS photo-блока legacy-HTML. В домене они воспроизведены формулами один-к-одному
(см. `packages/domain/src/device/device-registry.ts`), а не «на глаз».

Ключевые legacy-константы:

- `DEVICE_PRESETS`: `rt40` 244×400 vertical, `u2` 800×480 horizontal,
  `wt6000` 800×480 horizontal, `custom_vertical` 320×480, `custom_horizontal` 800×480.
- Перевод миллиметров в пиксели: `96 / 25.4` (DPI 96).
- Photo-scale оболочки: RT40 `500 / 488`, WT6000 `900 / 594`, U2 рендер на ширину 900.
- Нейтральная CSS-оболочка (`else`-ветка): terminal `max(390, w+72) × max(760, h+315)`,
  bezel left 24 / top 60, padding 12 → экран в (36, 72); keypad top = `h + 104`.
- Лимиты custom-размера из legacy-инпутов: ширина 180–1200, высота 200–1400.
- Правило ориентации: `width >= height → горизонтальная`.

## Таблица миграции профилей

Значения geometry округлены до 2 знаков для читаемости; в коде хранятся точные
выражения. Координаты экрана — относительно левого-верхнего угла оболочки.

### Urovo RT40

| Поле             | Значение                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Legacy source    | `DEVICE_PRESETS.rt40` + photo-ветка `applyScreenSize()` (body 488×1348)                            |
| Profile ID       | `urovo-rt40`                                                                                       |
| Resolution       | 244 × 400                                                                                          |
| Orientation      | вертикальная (portrait)                                                                            |
| Geometry         | shell 500 × 1381.15; screen X 83.06, Y 124.61, W 333.88, H 560.20; kind `photo`                    |
| Notes            | Photo-оболочка `rt40-photo`; уменьшения 7 мм (ширина) / 9 мм (высота), +1 дюйм возвращён по ширине |
| Migration status | Geometry parity подтверждена; full visual parity не заявляется                                     |

### Urovo U2

| Поле             | Значение                                                                        |
| ---------------- | ------------------------------------------------------------------------------- |
| Legacy source    | `DEVICE_PRESETS.u2` + photo-ветка (image 1280×987, рендер на 900)               |
| Profile ID       | `urovo-u2`                                                                      |
| Resolution       | 800 × 480                                                                       |
| Orientation      | горизонтальная (landscape)                                                      |
| Geometry         | shell 900 × 693.98; screen X 151.09, Y 176.27, W 562.67, H 335.12; kind `photo` |
| Notes            | Photo-оболочка `u2-photo`; уменьшения 26 мм (ширина) / 17 мм (высота)           |
| Migration status | Geometry parity подтверждена; full visual parity не заявляется                  |

### Zebra WT6000

| Поле             | Значение                                                                             |
| ---------------- | ------------------------------------------------------------------------------------ |
| Legacy source    | `DEVICE_PRESETS.wt6000` + photo-ветка (body 594×430 в image 1200×800, рендер на 900) |
| Profile ID       | `zebra-wt6000`                                                                       |
| Resolution       | 800 × 480                                                                            |
| Orientation      | горизонтальная (landscape)                                                           |
| Geometry         | shell 900 × 651.52; screen X 224.16, Y 206.74, W 454.71, H 262.27; kind `photo`      |
| Notes            | Photo-оболочка `wt6000-photo`; scale `900 / 594`; уменьшения 20 мм / 18 мм           |
| Migration status | Geometry parity подтверждена; full visual parity не заявляется                       |

### Custom Portrait

| Поле             | Значение                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Legacy source    | `DEVICE_PRESETS.custom_vertical` + нейтральная `else`-ветка `applyScreenSize()`                                     |
| Profile ID       | `custom-portrait`                                                                                                   |
| Resolution       | 320 × 480 (базовая; может быть изменена пользователем)                                                              |
| Orientation      | вертикальная (portrait)                                                                                             |
| Geometry         | shell 392 × 795; screen X 36, Y 72, W 320, H 480; keypadTop 584; cornerRadius 38; kind `neutral`                    |
| Notes            | Нейтральная CSS-оболочка; визуальный keypad (5 колонок, gap 10, клавиша 43px). Возможности сканера/клавиатуры — нет |
| Migration status | Geometry parity подтверждена                                                                                        |

### Custom Landscape

| Поле             | Значение                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Legacy source    | `DEVICE_PRESETS.custom_horizontal` + нейтральная `else`-ветка                                    |
| Profile ID       | `custom-landscape`                                                                               |
| Resolution       | 800 × 480 (базовая; может быть изменена пользователем)                                           |
| Orientation      | горизонтальная (landscape)                                                                       |
| Geometry         | shell 872 × 795; screen X 36, Y 72, W 800, H 480; keypadTop 584; cornerRadius 38; kind `neutral` |
| Notes            | Нейтральная CSS-оболочка; тот же визуальный keypad, что и Custom Portrait                        |
| Migration status | Geometry parity подтверждена                                                                     |

## Assets

Три photo-оболочки извлечены дословно из legacy base64 `<img>`-payload
(PROMPT-002 §15 — «если legacy содержит assets — использовать их») и сохранены как
статические PNG в `apps/desktop/src/features/devices/assets/`:

- `urovo-rt40-shell.png`
- `urovo-u2-shell.png`
- `zebra-wt6000-shell.png`

Оригинал `reference/sap_rfui_emulator.html` не изменялся.

## Калибровка экранов photo-shell (presentation layer)

Physical `DeviceGeometry` (таблицы выше) остаётся authoritative; calibration
описывает только **отрисовку** и живёт в
`apps/desktop/src/features/devices/geometry/screen-calibration.ts`. У каждого
photo-устройства своё дисплейное окно на снимке, поэтому общий inset не
используется — экран позиционируется нормализованными долями корпуса
(0..1 от нарисованного shell rect). PNG-ассеты измерены попиксельно
(tight bounding box корпуса и синего стекла), crop-смещения сверены с legacy
CSS `.rt40-photo` / `.wt6000-photo` (негативные offset + clip-path):

| Профиль        | PNG (px)    | Корпус на снимке (crop) | Измеренное стекло (в корпусе) | Calibration screen (left/top/width/height, radius) |
| -------------- | ----------- | ----------------------- | ----------------------------- | -------------------------------------------------- |
| `rt40-photo`   | 2048 × 1405 | 488 × 1348 при (752,28) | 347 × 577 при (70,106)        | 0.1661 / 0.0902 / 0.6678 / 0.4056, r 8 px          |
| `u2-photo`     | 1536 × 1024 | весь кадр               | 1057 × 715 при (224,216)      | 0.1679 / 0.2540 / 0.6252 / 0.4829, r 6 px          |
| `wt6000-photo` | 1200 × 800  | 594 × 430 при (327,185) | панель 490 × 277 при (45,83)  | 0.2491 / 0.3173 / 0.5052 / 0.4026, r 6 px          |

Calibration-прямоугольники лежат внутри измеренных стёкол (поля по всем
сторонам), поэтому overlay выглядит встроенным в стекло; для WT6000 нижняя
аппаратная полоса кнопок P1–P3 (в корпусе y ≈ 380/430) overlay не пересекается.
Custom-профили (`neutral`) calibration не требуют — нейтральная оболочка
использует physical rect напрямую. Логическое содержимое экрана (244 × 400,
800 × 480) вписывается в calibrated area равномерным `contain`-масштабом и
центрируется.

## Отклонения от legacy (documented deviations)

1. **Равномерное масштабирование.** Legacy использовал фиксированный
   `.app { zoom: .68 }` и неоднородный `scale(x, y)` для photo-кадров.
   PROMPT-002 §11 требует uniform scaling: реализовано
   `computeFitScale = min(availW/shellW, availH/shellH, 1)` (кап 1) и
   равномерный `computeScreenContentScale` для содержимого экрана. Пропорции
   сохраняются, но визуальный размер отличается от legacy `zoom .68`.
2. **Responsive resize.** Legacy обновлял размер по окну; здесь —
   `ResizeObserver` на viewport (с jsdom-фолбэком), без polling.
3. **Правило квадратного экрана.** `width >= height → landscape`, поэтому
   квадратный custom-размер относится к горизонтальной ориентации (как в legacy
   `updateDeviceInfo`).
4. **Хранение состояния.** Legacy сохранял выбор в `localStorage`
   (`urovoDeviceModel` и т. п.). PROMPT-002 не требует персистентности — выбор
   устройства живёт только в Zustand-сторе фичи и не персистится.

## Область вне PROMPT-002

Не реализованы и не затрагиваны: SAP connection / URL / WebView, scanner
injection, keyboard injection, recorder, replay, assertions, AI, Test IT,
regression. На `DeviceScreen` используется только нейтральный RFUI placeholder
(без имитации SAP-поведения). Клавиатура (keypad) — визуально, без ввода.
