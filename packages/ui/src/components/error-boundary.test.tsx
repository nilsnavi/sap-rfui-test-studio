import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { ErrorBoundary } from "../index";
import type { ErrorBoundaryInfo } from "../index";

let shouldThrow = false;

function Probe(): ReactNode {
  if (shouldThrow) {
    throw new Error("RFUI panel render failed");
  }
  return <p>RFUI panel content</p>;
}

beforeEach(() => {
  shouldThrow = false;
  // React reports caught render errors through console.error by design.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children while nothing throws", () => {
    render(
      <ErrorBoundary>
        <Probe />
      </ErrorBoundary>,
    );

    expect(screen.getByText("RFUI panel content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("catches a descendant failure and shows a contained fallback", () => {
    shouldThrow = true;

    render(
      <ErrorBoundary title="Interface failure" retryLabel="Re-render">
        <Probe />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Interface failure");
    expect(alert.textContent).toContain("RFUI panel render failed");
    expect(screen.getByRole("button", { name: "Re-render" })).toBeDefined();
  });

  it("reports the error through the injected handler instead of a hardcoded sink", () => {
    const reported: Array<[string, ErrorBoundaryInfo]> = [];
    shouldThrow = true;

    render(
      <ErrorBoundary
        onError={(error, info) => {
          reported.push([error.message, info]);
        }}
      >
        <Probe />
      </ErrorBoundary>,
    );

    expect(reported).toHaveLength(1);
    expect(reported[0]?.[0]).toBe("RFUI panel render failed");
    expect(typeof reported[0]?.[1].componentStack).toBe("string");
  });

  it("recovers after retry when the underlying condition is cleared", async () => {
    const user = userEvent.setup();
    shouldThrow = true;

    render(
      <ErrorBoundary retryLabel="Re-render">
        <Probe />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeDefined();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Re-render" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("RFUI panel content")).toBeDefined();
  });

  it("supports a custom fallback renderer", () => {
    shouldThrow = true;

    render(
      <ErrorBoundary
        fallback={(error, reset) => <button onClick={reset}>reset: {error.message}</button>}
      >
        <Probe />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button").textContent).toContain("reset: RFUI panel render failed");
  });
});
