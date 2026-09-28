import type { ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusBadgeProps {
  readonly label: string;
  readonly tone?: StatusTone;
  /** Render a pulsing dot: used for in-progress states (connecting, loading). */
  readonly pending?: boolean;
  /** Monospace rendering for technical values such as screen codes or versions. */
  readonly mono?: boolean;
  readonly title?: string;
}

/**
 * Compact status indicator. Purely presentational: the caller decides how a
 * domain status maps onto a tone.
 */
export function StatusBadge({
  label,
  tone = "neutral",
  pending = false,
  mono = false,
  title,
}: StatusBadgeProps): ReactNode {
  return (
    <span
      className={[
        "ui-status-badge",
        `ui-status-badge--${tone}`,
        pending ? "ui-status-badge--pending" : "",
        mono ? "ui-status-badge--mono" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
      data-tone={tone}
      data-pending={pending ? "true" : "false"}
    >
      <span className="ui-status-badge__dot" aria-hidden="true" />
      <span className="ui-status-badge__label">{label}</span>
    </span>
  );
}
