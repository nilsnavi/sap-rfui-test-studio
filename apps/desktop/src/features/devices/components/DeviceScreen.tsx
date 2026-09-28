import type { CSSProperties, ReactNode } from "react";

export interface DeviceScreenProps {
  /** Logical RFUI resolution width — the box is always this wide. */
  readonly screenWidth: number;
  /** Logical RFUI resolution height — the box is always this tall. */
  readonly screenHeight: number;
  /** Uniform factor that maps the logical box into the physical glass. */
  readonly contentScale: number;
  readonly left: number;
  readonly top: number;
  readonly children: ReactNode;
}

/**
 * The RFUI surface at its logical resolution (PROMPT-002 §10).
 *
 * The box keeps the profile resolution (e.g. 244 × 400) no matter how the
 * shell is fitted into the window: one uniform `contentScale` maps it into
 * the physical glass and centering absorbs the leftover bezel. Today the
 * child is the neutral placeholder, later a `SapViewer` — nothing here
 * changes for that.
 */
export function DeviceScreen({
  screenWidth,
  screenHeight,
  contentScale,
  left,
  top,
  children,
}: DeviceScreenProps) {
  const style: CSSProperties = {
    width: screenWidth,
    height: screenHeight,
    transform: `scale(${contentScale})`,
    transformOrigin: "top left",
    left,
    top,
  };

  return (
    <div className="device-screen__content" style={style} data-testid="device-screen-content">
      {children}
    </div>
  );
}
