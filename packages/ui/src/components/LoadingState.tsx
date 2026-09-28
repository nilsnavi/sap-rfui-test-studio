import type { ReactNode } from "react";

export interface LoadingStateProps {
  readonly label?: string;
  /** Secondary line: current operation detail, e.g. `Restoring workspace settings`. */
  readonly detail?: string;
  /** Compact variant fits inside panels and table cells. */
  readonly compact?: boolean;
}

/** Accessible busy indicator. Timing and orchestration stay outside the UI layer. */
export function LoadingState({
  label = "Loading",
  detail,
  compact = false,
}: LoadingStateProps): ReactNode {
  return (
    <div
      className={["ui-loading-state", compact ? "ui-loading-state--compact" : ""]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className="ui-loading-state__spinner" aria-hidden="true" />
      <div className="ui-loading-state__text">
        <span className="ui-loading-state__label">{label}</span>
        {detail ? <span className="ui-loading-state__detail">{detail}</span> : null}
      </div>
    </div>
  );
}
