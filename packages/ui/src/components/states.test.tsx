import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState, LoadingState, StatusBadge } from "../index";

describe("StatusBadge", () => {
  it("renders the label and exposes the tone for styling and tests", () => {
    const { container } = render(<StatusBadge label="Ready" tone="success" />);

    expect(container.textContent).toContain("Ready");
    const badge = container.querySelector<HTMLElement>(".ui-status-badge");
    expect(badge?.getAttribute("data-tone")).toBe("success");
    expect(badge?.className).toContain("ui-status-badge--success");
  });

  it("defaults to a neutral, non-pending badge", () => {
    const { container } = render(<StatusBadge label="Disconnected" />);

    const badge = container.querySelector<HTMLElement>(".ui-status-badge");
    expect(badge?.getAttribute("data-tone")).toBe("neutral");
    expect(badge?.getAttribute("data-pending")).toBe("false");
  });

  it("marks pending states and mono rendering for technical values", () => {
    const { container } = render(<StatusBadge label="0.1.0" tone="info" pending mono />);

    const badge = container.querySelector<HTMLElement>(".ui-status-badge");
    expect(badge?.getAttribute("data-pending")).toBe("true");
    expect(badge?.className).toContain("ui-status-badge--pending");
    expect(badge?.className).toContain("ui-status-badge--mono");
  });
});

describe("LoadingState", () => {
  it("is announced as a live status region", () => {
    render(<LoadingState label="Restoring workspace" detail="app.settings.v1" />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("Restoring workspace");
    expect(status.textContent).toContain("app.settings.v1");
  });

  it("renders a fallback label when none is provided", () => {
    render(<LoadingState />);

    // The product UI language is Russian (architecture baseline).
    expect(screen.getByRole("status").textContent).toContain("Загрузка");
  });
});

describe("EmptyState", () => {
  it("renders title, description, note and action", () => {
    render(
      <EmptyState
        title="RFUI Emulator"
        description="Device emulator will be implemented in Sprint M1."
        note="SPEC-001"
        action={<button type="button">Open docs</button>}
      />,
    );

    expect(screen.getByRole("region", { name: "RFUI Emulator" })).toBeDefined();
    expect(screen.getByText("Device emulator will be implemented in Sprint M1.")).toBeDefined();
    expect(screen.getByText("SPEC-001")).toBeDefined();
    expect(screen.getByRole("button", { name: "Open docs" })).toBeDefined();
  });

  it("renders only the title when nothing else is supplied", () => {
    render(<EmptyState title="No sessions yet" />);

    expect(screen.getByRole("region", { name: "No sessions yet" })).toBeDefined();
    expect(screen.queryByText("SPEC-001")).toBeNull();
  });
});
