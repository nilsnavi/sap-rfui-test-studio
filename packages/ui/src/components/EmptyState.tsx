import type { ReactNode } from "react";

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  /** Primary call to action supplied by the caller. */
  readonly action?: ReactNode;
  /** Short technical note rendered in mono: sprint or feature reference, for example. */
  readonly note?: string;
}

/** Neutral "nothing here yet" panel — not an error and not a spinner. */
export function EmptyState({ title, description, action, note }: EmptyStateProps): ReactNode {
  return (
    <div className="ui-empty-state" role="region" aria-label={title}>
      <div className="ui-empty-state__marker" aria-hidden="true" />
      <h3 className="ui-empty-state__title">{title}</h3>
      {description ? <p className="ui-empty-state__description">{description}</p> : null}
      {note ? <p className="ui-empty-state__note">{note}</p> : null}
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </div>
  );
}
