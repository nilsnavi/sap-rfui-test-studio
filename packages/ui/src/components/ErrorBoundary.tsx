import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** Heading shown when a descendant throws. */
  readonly title?: string;
  readonly retryLabel?: string;
  /**
   * Reporting hook. Components must not hardcode a logging sink — the composition
   * root injects the telemetry-backed handler (PROMPT-001 §18).
   */
  readonly onError?: (error: Error, info: ErrorBoundaryInfo) => void;
  /** Custom fallback renderer; receives the reset callback. */
  readonly fallback?: (error: Error, reset: () => void) => ReactNode;
}

export interface ErrorBoundaryInfo {
  readonly componentStack: string;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

/**
 * Containment boundary for a subtree. Keeps a rendering failure from taking down
 * the whole shell and normalizes the thrown value into an `Error`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, { componentStack: info.componentStack ?? "" });
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    const title = this.props.title ?? "Interface failure";
    const retryLabel = this.props.retryLabel ?? "Retry";

    return (
      <div className="ui-error-boundary" role="alert">
        <h3 className="ui-error-boundary__title">{title}</h3>
        <p className="ui-error-boundary__message">{error.message || "Unknown error"}</p>
        <pre className="ui-error-boundary__stack">{error.stack ?? ""}</pre>
        <div className="ui-error-boundary__actions">
          <button type="button" className="ui-button" onClick={this.reset}>
            {retryLabel}
          </button>
        </div>
      </div>
    );
  }
}
