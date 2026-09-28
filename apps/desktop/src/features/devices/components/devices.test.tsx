import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DevicesFeature } from "./DevicesFeature";

/**
 * PROMPT-002 §17 (UI): the selector lists every device, switching updates the
 * resolution, the mandated baselines are shown and custom sizes apply.
 */

function resolution() {
  return screen.getByTestId("device-resolution").textContent;
}

function optionLabels(): string[] {
  return Array.from(screen.getByLabelText("Выберите модель").querySelectorAll("option")).map(
    (option) => option.textContent ?? "",
  );
}

describe("DevicesFeature (device selector, info, emulator)", () => {
  it("renders all five devices in the selector", () => {
    render(<DevicesFeature />);

    const labels = optionLabels();
    expect(labels).toHaveLength(5);
    expect(labels.some((l) => l.includes("Urovo RT40"))).toBe(true);
    expect(labels.some((l) => l.includes("Urovo U2"))).toBe(true);
    expect(labels.some((l) => l.includes("Zebra WT6000"))).toBe(true);
    expect(labels.some((l) => l.includes("Свой размер вертикальный"))).toBe(true);
    expect(labels.some((l) => l.includes("Свой размер горизонтальный"))).toBe(true);
  });

  it("starts with RT40 at 244 × 400 portrait and a neutral RFUI placeholder", () => {
    render(<DevicesFeature />);

    expect(resolution()).toBe("244 × 400");
    expect(screen.getByTestId("device-orientation").textContent).toBe("вертикальная");
    expect(screen.getByTestId("rfui-placeholder").textContent).toContain("RFUI");
    expect(screen.getByRole("img", { name: "Эмулятор устройства: Urovo RT40" })).toBeDefined();
  });

  it("shows scanner and keyboard capabilities of the selected model", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    expect(screen.getByTestId("device-info").textContent).toContain("есть");

    // Custom profile declares no hardware capabilities.
    await user.selectOptions(screen.getByLabelText("Выберите модель"), "custom-portrait");
    expect(screen.getByTestId("device-info").textContent).toContain("нет");
  });

  it("switches to U2 and WT6000 (800 × 480, landscape) without a reload", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    const select = screen.getByLabelText("Выберите модель");

    await user.selectOptions(select, "urovo-u2");
    expect(resolution()).toBe("800 × 480");
    expect(screen.getByTestId("device-orientation").textContent).toBe("горизонтальная");

    await user.selectOptions(select, "zebra-wt6000");
    expect(resolution()).toBe("800 × 480");
    expect(screen.getByRole("img", { name: "Эмулятор устройства: Zebra WT6000" })).toBeDefined();
  });

  it("renders the keypad visual only for the neutral custom shell", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    expect(screen.queryByText("SCAN")).toBeNull(); // photo shells hide the keypad, like legacy

    await user.selectOptions(screen.getByLabelText("Выберите модель"), "custom-portrait");
    expect(screen.getByText("SCAN")).toBeDefined();
    expect(screen.getByText("ENT")).toBeDefined();
    expect(resolution()).toBe("320 × 480");
  });

  it("applies a custom resolution and routes it to the matching custom profile", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    await user.clear(screen.getByLabelText("Ширина"));
    await user.type(screen.getByLabelText("Ширина"), "640");
    await user.clear(screen.getByLabelText("Высота"));
    await user.type(screen.getByLabelText("Высота"), "480");
    await user.click(screen.getByRole("button", { name: "Применить" }));

    expect(resolution()).toBe("640 × 480");
    expect(screen.getByTestId("device-orientation").textContent).toBe("горизонтальная");
    expect((screen.getByLabelText("Выберите модель") as HTMLSelectElement).value).toBe(
      "custom-landscape",
    );
  });

  it("keeps the previous device and shows Russian validation text for a bad custom size", async () => {
    const user = userEvent.setup();
    render(<DevicesFeature />);

    await user.clear(screen.getByLabelText("Ширина"));
    await user.type(screen.getByLabelText("Ширина"), "50");
    await user.click(screen.getByRole("button", { name: "Применить" }));

    expect(screen.getByTestId("custom-size-error")).toBeDefined();
    expect(resolution()).toBe("244 × 400"); // unchanged
  });
});
