/**
 * Neutral RFUI placeholder inside the device screen (PROMPT-002 §4, §10).
 *
 * It renders nothing SAP-like on purpose: no login form, no menu, no fake
 * screen flow. A later sprint replaces this child with `SapViewer` without
 * touching the emulator geometry.
 */
export function RfuiPlaceholder({
  width,
  height,
}: {
  readonly width: number;
  readonly height: number;
}) {
  return (
    <div className="rfui-placeholder" data-testid="rfui-placeholder">
      <div className="rfui-placeholder__title">RFUI</div>
      <div className="rfui-placeholder__size">
        {width} × {height}
      </div>
      <div className="rfui-placeholder__note">
        Подключение SAP будет добавлено на следующем этапе.
      </div>
    </div>
  );
}
