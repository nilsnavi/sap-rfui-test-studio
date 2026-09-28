import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@sap-rfui/application";
import type { TelemetryPort } from "@sap-rfui/ports";

import { InMemoryStorageAdapter } from "../adapters/web-storage-adapter";
import { App } from "./App";
import { createContainer } from "./composition/container";

/** Silent telemetry + ephemeral storage: the shell is exercised, the console is not. */
function createTestContainer(storage = new InMemoryStorageAdapter()) {
  const port: TelemetryPort = { emit: () => undefined };
  return createContainer({ telemetryPort: port, storage });
}

describe("Desktop shell (smoke)", () => {
  it("renders the foundation dashboard after workspace initialization", async () => {
    const { container } = render(<App container={createTestContainer()} />);

    expect(await screen.findByRole("heading", { name: "SAP RFUI Test Studio" })).toBeDefined();
    expect(container.textContent).toContain("Development Build");
    expect(container.textContent).toContain("Architecture foundation ready");
    expect(container.textContent).toContain("StoragePort");
  });

  it("navigates between Dashboard, Emulator and Settings", async () => {
    const user = userEvent.setup();
    render(<App container={createTestContainer()} />);

    await screen.findByRole("heading", { name: "SAP RFUI Test Studio" });

    await user.click(screen.getByRole("button", { name: "Emulator" }));
    expect(
      await screen.findByText("Device emulator will be implemented in Sprint M1."),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(
      await screen.findByText("Settings editor is not part of the foundation build"),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.getByRole("heading", { name: "SAP RFUI Test Studio" })).toBeDefined();
  });

  it("surfaces a startup failure instead of a blank window", async () => {
    const failingStorage = new InMemoryStorageAdapter();
    vi.spyOn(failingStorage, "read").mockRejectedValueOnce(new Error("database is locked"));

    const { container } = render(<App container={createTestContainer(failingStorage)} />);

    expect(
      await screen.findByRole("heading", { name: "Foundation initialization failed" }),
    ).toBeDefined();
    expect(container.textContent).toContain("database is locked");
  });

  it("restores persisted settings on the next launch", async () => {
    const storage = new InMemoryStorageAdapter();
    // InMemoryStorageAdapter stores raw keys; only WebStorageAdapter adds the
    // `sap-rfui:` namespace, so the fixture writes the logical storage key.
    await storage.write(
      STORAGE_KEYS.appSettings,
      JSON.stringify({
        schemaVersion: 1,
        telemetryEnabled: true,
        telemetryLevel: "error",
        uiDensity: "comfortable",
      }),
    );
    const user = userEvent.setup();

    render(<App container={createTestContainer(storage)} />);

    await screen.findByRole("heading", { name: "SAP RFUI Test Studio" });
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByText("error")).toBeDefined();
    expect(screen.getByText("comfortable")).toBeDefined();
    expect(screen.getByText("stored")).toBeDefined();
  });
});
