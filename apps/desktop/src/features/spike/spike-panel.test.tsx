/**
 * UI boundary tests for the SPIKE-001 panel.
 *
 * The panel must (a) drive everything through `SapPort` — no DOM/keyboard/cookie
 * access of its own — and (b) refuse to invent results when the runtime is not
 * configured. A fake port proves both.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SapPort } from "@sap-rfui/ports";

import { SpikePanel } from "./spike-panel";

function fakePort(overrides: Partial<Record<keyof SapPort, unknown>> = {}): SapPort {
  const unimplemented = vi.fn(async (): Promise<unknown> => null);
  const port = {
    open: vi.fn(async (): Promise<unknown> => ({ ok: true, value: undefined })),
    isAvailable: vi.fn(async (): Promise<unknown> => ({ ok: true, value: true })),
    close: vi.fn(async (): Promise<unknown> => ({ ok: true, value: true })),
    reload: vi.fn(async (): Promise<unknown> => ({ ok: true, value: undefined })),
    installNavigationWatch: vi.fn(async (): Promise<unknown> => ({ ok: true, value: undefined })),
    getSessionState: unimplemented,
    getActiveField: unimplemented,
    injectText: unimplemented,
    sendKey: unimplemented,
    readScreenState: unimplemented,
    captureScreenshot: unimplemented,
    waitForScreenChange: unimplemented,
    probe: unimplemented,
    readRuntimeInfo: unimplemented,
    readNavigationWatch: unimplemented,
    ...overrides,
  };
  return port as unknown as SapPort;
}

describe("SpikePanel (SPIKE-001 UI boundary)", () => {
  it("lists every experiment of the spike plan", () => {
    render(<SpikePanel port={fakePort()} />);

    expect(screen.getByText("Open SAP RFUI")).toBeDefined();
    expect(screen.getByText("Error handling normalization")).toBeDefined();
    expect(screen.getAllByRole("button", { name: /^EXP-\d{3}$/ })).toHaveLength(11);
  });

  it("does not call the runtime while no SAP URL is configured", async () => {
    const open = vi.fn();
    const port = fakePort({ open });
    const user = userEvent.setup();

    render(<SpikePanel port={port} />);
    await user.click(screen.getByRole("button", { name: "Открыть SAP RFUI" }));

    await waitFor(() => expect(screen.getAllByText(/URL не задан/i).length).toBeGreaterThan(0));
    expect(open).not.toHaveBeenCalled();
  });

  it("opens the controlled runtime through SapPort when a URL is given", async () => {
    const open = vi.fn(async (_url: string, _options?: unknown): Promise<unknown> => ({
      ok: true,
      value: undefined,
    }));
    const readRuntimeInfo = vi.fn(async (): Promise<unknown> => ({
      ok: true,
      value: {
        url: "https://sap.example/sap/bc/bsp/sap/rfui/start.htm",
        origin: "https://sap.example",
        title: "RFUI",
        readyState: "complete",
        frameCount: 1,
        frames: [],
        userAgent: "WebView2",
        hasRfuiMarkers: true,
        cspMeta: null,
        domReadable: true,
        domWritable: true,
      },
    }));
    const port = fakePort({ open, readRuntimeInfo });
    const user = userEvent.setup();

    render(<SpikePanel port={port} />);
    await user.type(
      screen.getByLabelText(/URL SAP RFUI/i),
      "https://sap.example/sap/bc/bsp/sap/rfui/start.htm",
    );
    await user.click(screen.getByRole("button", { name: "Открыть SAP RFUI" }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0]?.[1]).toMatchObject({ persistentSession: true });
    expect(await screen.findByText(/runtime: origin=https:\/\/sap\.example/)).toBeDefined();
  });

  it("surfaces a normalized adapter failure instead of throwing", async () => {
    const readScreenState = vi.fn(async (): Promise<unknown> => ({
      ok: false,
      error: { category: "webview-timeout", message: "no eval callback" },
    }));
    const user = userEvent.setup();

    render(<SpikePanel port={fakePort({ readScreenState })} />);
    await user.click(screen.getByRole("button", { name: "Читать состояние экрана" }));

    expect(await screen.findByText(/screen → webview-timeout/)).toBeDefined();
  });
});
