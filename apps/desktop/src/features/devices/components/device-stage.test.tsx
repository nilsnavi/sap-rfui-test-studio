import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDeviceEntry } from "@sap-rfui/domain";

import { DevicesFeature } from "./DevicesFeature";

/**
 * Presentation-layer UI checks: the physical geometry stays authoritative,
 * the presentation scale is uniform (≤ 1) and shared by the shell and the
 * screen overlay, resize recomputes it, and the logical resolution label
 * never changes with visual scaling. No SAP behaviour appears anywhere.
 */

interface ObserverRecord {
  callback: (entries: unknown[], observer: unknown) => void;
  trigger(width: number, height: number): void;
}

let observers: ObserverRecord[] = [];

class ResizeObserverStub {
  private readonly record: ObserverRecord;

  constructor(callback: (entries: unknown[], observer: unknown) => void) {
    this.record = {
      callback,
      trigger: (width: number, height: number) => {
        const entry = { contentRect: { width, height } };
        callback([entry], this);
      },
    };
    observers.push(this.record);
  }

  observe(): void {
    // The stub delivers sizes only through `trigger`.
  }

  unobserve(): void {
    // no-op
  }

  disconnect(): void {
    // no-op
  }
}

function fireResize(width: number, height: number): void {
  const latest = observers.at(-1);
  if (latest === undefined) {
    throw new Error("ResizeObserver was never constructed");
  }
  act(() => {
    latest.trigger(width, height);
  });
}

function scaleOf(element: HTMLElement): number {
  const raw = element.dataset["presentationScale"];
  expect(raw).toBeDefined();
  return Number(raw);
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("device stage presentation", () => {
  it("keeps the physical shell rect authoritative and places the overlay on its calibrated glass", () => {
    render(<DevicesFeature />);

    const physical = getDeviceEntry("urovo-rt40")!.geometry;
    const shell = screen.getByTestId("device-shell");
    const overlay = screen.getByTestId("device-screen");

    // The shell is drawn at the untouched physical legacy rect …
    expect(Number.parseFloat(shell.style.width)).toBeCloseTo(physical.shellWidth, 6);
    expect(Number.parseFloat(shell.style.height)).toBeCloseTo(physical.shellHeight, 6);

    // … while the overlay comes from the per-device calibration fractions
    // (rt40-photo: left 0.1661, top 0.0902, width 0.6678, height 0.4056).
    expect(Number.parseFloat(overlay.style.left)).toBeCloseTo(physical.shellWidth * 0.1661, 4);
    expect(Number.parseFloat(overlay.style.top)).toBeCloseTo(physical.shellHeight * 0.0902, 4);
    expect(Number.parseFloat(overlay.style.width)).toBeCloseTo(physical.shellWidth * 0.6678, 4);
    expect(Number.parseFloat(overlay.style.height)).toBeCloseTo(physical.shellHeight * 0.4056, 4);
    expect(Number.parseFloat(overlay.style.borderRadius)).toBe(8);

    // The overlay never reaches the shell edges: side bezels stay visible.
    const left = Number.parseFloat(overlay.style.left);
    const right = left + Number.parseFloat(overlay.style.width);
    expect(left).toBeGreaterThan(physical.shellWidth * 0.1);
    expect(right).toBeLessThan(physical.shellWidth * 0.9);
  });

  it("draws the RT40 photo cropped to the calibrated body frame inside the shell", () => {
    render(<DevicesFeature />);

    const physical = getDeviceEntry("urovo-rt40")!.geometry;
    const photo = document.querySelector<HTMLImageElement>(".device-shell__photo")!;
    const scaleX = physical.shellWidth / 488;
    const scaleY = physical.shellHeight / 1348;
    // The 2048 × 1405 source is oversized and negatively offset; the shell
    // clips everything outside the 488 × 1348 body crop (legacy clip-path).
    expect(Number.parseFloat(photo.style.width)).toBeCloseTo(2048 * scaleX, 4);
    expect(Number.parseFloat(photo.style.height)).toBeCloseTo(1405 * scaleY, 4);
    expect(Number.parseFloat(photo.style.left)).toBeCloseTo(-752 * scaleX, 4);
    expect(Number.parseFloat(photo.style.top)).toBeCloseTo(-28 * scaleY, 4);
  });

  it("keeps the WT6000 overlay inside the display zone, clear of the hardware buttons", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    await user.selectOptions(screen.getByLabelText("Выберите модель"), "zebra-wt6000");

    const physical = getDeviceEntry("zebra-wt6000")!.geometry;
    const overlay = screen.getByTestId("device-screen");
    const top = Number.parseFloat(overlay.style.top);
    const bottom = top + Number.parseFloat(overlay.style.height);
    // Measured display panel ends at 360/430 of the body; the P1–P3 buttons
    // start lower — the overlay must stay above the button band.
    expect(bottom).toBeLessThan(physical.shellHeight * 0.83);
    const left = Number.parseFloat(overlay.style.left);
    expect(left).toBeGreaterThan(0);
    expect(left + Number.parseFloat(overlay.style.width)).toBeLessThan(physical.shellWidth);
  });

  it("fits the logical content into the calibrated area with one uniform scale", () => {
    render(<DevicesFeature />);

    const content = screen.getByTestId("device-screen-content");
    // A single `scale(k)` factor (never independent scaleX/scaleY) …
    expect(content.style.transform).toMatch(/^scale\(([0-9.]+)\)$/);
    // … applied to the untouched logical resolution box.
    expect(Number.parseFloat(content.style.width)).toBe(244);
    expect(Number.parseFloat(content.style.height)).toBe(400);
  });

  it("scales the overlay with the same uniform factor as the shell", () => {
    render(<DevicesFeature />);

    fireResize(300, 700);

    const shell = screen.getByTestId("device-shell");
    const overlay = screen.getByTestId("device-screen");
    const shellScale = scaleOf(shell);
    const overlayScale = scaleOf(overlay);

    expect(overlayScale).toBe(shellScale);
    expect(shellScale).toBeGreaterThan(0);
    expect(shellScale).toBeLessThanOrEqual(1);
    // Uniform fit: the tall RT40 is limited by the 700 px height.
    const physical = getDeviceEntry("urovo-rt40")!.geometry;
    expect(shellScale).toBeCloseTo(700 / physical.shellHeight, 6);
  });

  it("never upscales beyond 1 on a huge stage and recomputes on resize", () => {
    render(<DevicesFeature />);

    fireResize(5000, 5000);
    expect(scaleOf(screen.getByTestId("device-shell"))).toBe(1);

    fireResize(250, 600);
    const shrunk = scaleOf(screen.getByTestId("device-shell"));
    expect(shrunk).toBeLessThan(1);
    expect(shrunk).toBeCloseTo(600 / getDeviceEntry("urovo-rt40")!.geometry.shellHeight, 6);
  });

  it("keeps the logical resolution labels intact after visual scaling", () => {
    render(<DevicesFeature />);

    expect(screen.getByTestId("device-resolution").textContent).toBe("244 × 400");

    fireResize(320, 640);

    expect(screen.getByTestId("device-resolution").textContent).toBe("244 × 400");
    expect(screen.getByTestId("device-screen-label").textContent).toBe("244 × 400");
    const content = screen.getByTestId("device-screen-content");
    expect(Number.parseFloat(content.style.width)).toBe(244);
    expect(Number.parseFloat(content.style.height)).toBe(400);
  });

  it("presents the neutral custom shell and refits it on resize", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    await user.selectOptions(screen.getByLabelText("Выберите модель"), "custom-portrait");
    fireResize(400, 600);

    const shell = screen.getByTestId("device-shell");
    expect(shell.className).toContain("device-shell--neutral");
    expect(shell.className).not.toContain("device-shell--photo");
    expect(screen.getByText("SCAN")).toBeDefined();
    expect(scaleOf(shell)).toBeCloseTo(600 / 795, 6); // neutral shell is 392 × 795
  });

  it("shows the neutral RFUI placeholder without any SAP behaviour", () => {
    render(<DevicesFeature />);

    expect(screen.getByTestId("rfui-placeholder").textContent).toContain("RFUI");
    expect(screen.getByTestId("rfui-placeholder").textContent).toContain(
      "Подключение SAP будет добавлено на следующем этапе.",
    );
    // No fake SAP UI: no inputs, links or session copy inside the screen.
    const placeholder = screen.getByTestId("rfui-placeholder");
    expect(placeholder.querySelector("input, a, button")).toBeNull();
    expect(screen.queryByText(/https?:\/\//)).toBeNull();
  });
});
