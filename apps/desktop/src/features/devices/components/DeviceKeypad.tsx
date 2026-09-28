/**
 * Physical keypad — visual only (PROMPT-002 §13).
 *
 * Key set and colors migrate from the legacy `.keypad` block
 * (ENT/F1/F2/F3/ESC, 0–9, FN, SCAN, arrows). No handlers, no SAP event
 * injection: real keyboard/scanner emulation arrives with M3 behind ports.
 */
const KEYS: ReadonlyArray<{ label: string; className?: string }> = [
  { label: "ENT", className: "device-keypad__key--enter" },
  { label: "F1" },
  { label: "F2" },
  { label: "F3" },
  { label: "ESC", className: "device-keypad__key--esc" },

  { label: "1" },
  { label: "2" },
  { label: "3" },
  { label: "4" },
  { label: "5" },

  { label: "6" },
  { label: "7" },
  { label: "8" },
  { label: "9" },
  { label: "0" },

  { label: "FN", className: "device-keypad__key--fn" },
  { label: "SCAN", className: "device-keypad__key--scan" },
  { label: "▼" },
  { label: "▲" },
];

export function DeviceKeypad() {
  return (
    <div className="device-keypad" aria-hidden="true">
      {KEYS.map((key) => (
        <div
          key={key.label}
          className={key.className ? `device-keypad__key ${key.className}` : "device-keypad__key"}
        >
          {key.label}
        </div>
      ))}
    </div>
  );
}
