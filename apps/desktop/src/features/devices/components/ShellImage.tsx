import type { CSSProperties } from "react";

export interface ShellImageProps {
  /** Resolved shell photo for the profile's `visualProfileId`. */
  readonly src: string;
  /**
   * Calibration frame placement (see geometry/screen-calibration.ts): sizes
   * and offsets the picture so only the device body shows in the shell rect.
   */
  readonly frameStyle?: CSSProperties;
}

/**
 * The legacy device photograph used as a photo shell (PROMPT-002 §15).
 * Purely decorative — the ScreenOverlay renders the interactive area on top.
 */
export function ShellImage({ src, frameStyle }: ShellImageProps) {
  return (
    <img className="device-shell__photo" src={src} style={frameStyle} alt="" aria-hidden="true" />
  );
}
