# SAP RFUI Test Studio

Стартовый репозиторий проекта SAP RFUI Test Studio.

## Документация

- `docs/specs/` — SPEC-001...SPEC-015
- `docs/architecture/` — ADR-001
- `docs/spikes/` — SPIKE-001
- `.ai/prompts/` — PROMPT-001 и PROMPT-002
- `reference/` — исходный `sap_rfui_emulator.html` будет добавлен отдельно

## Порядок реализации

1. Зафиксировать документацию в `main`.
2. Создать `feature/bootstrap`.
3. Выполнить PROMPT-001.
4. Merge в `main`.
5. Создать `feature/device-emulator`.
6. Выполнить PROMPT-002.
7. Merge в `main`.
8. Создать `spike/sap-rfui-webview`.
9. Выполнить SPIKE-001.
10. Только после успешного Spike начинать Scanner/Keyboard runtime, Recorder и Replay.
