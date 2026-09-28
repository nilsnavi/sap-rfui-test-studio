import { describe, expect, it } from "vitest";

import { computeFitScale, computeScreenContentScale } from "./scaling";

/** PROMPT-002 §17 (resize): the aspect ratio must survive every viewport. */
describe("computeFitScale", () => {
  const shell = { width: 900, height: 694 };

  it("uses one uniform factor — width and height scale identically", () => {
    const scale = computeFitScale({ width: 450, height: 347 }, shell);
    expect(scale).toBeCloseTo(0.5, 6);

    const rendered = { width: shell.width * scale, height: shell.height * scale };
    expect(rendered.width / rendered.height).toBeCloseTo(shell.width / shell.height, 6);
  });

  it("picks the limiting axis like min(availableWidth/shellWidth, availableHeight/shellHeight)", () => {
    // Wide but short viewport: height limits the fit.
    expect(computeFitScale({ width: 2000, height: 347 }, shell)).toBeCloseTo(0.5, 6);
    // Tall but narrow viewport: width limits the fit.
    expect(computeFitScale({ width: 450, height: 2000 }, shell)).toBeCloseTo(0.5, 6);
  });

  it("never upscales beyond the authored shell size and fits small viewports by shrinking", () => {
    expect(computeFitScale({ width: 4000, height: 4000 }, shell)).toBe(1);
    const shrunk = computeFitScale({ width: 100, height: 100 }, shell);
    expect(shrunk).toBeLessThan(1);
    expect(100 / shrunk).toBeGreaterThanOrEqual(100); // rendered shell stays inside viewport
  });

  it("returns native scale for an unmeasured viewport (first paint, jsdom, zero-size container)", () => {
    expect(computeFitScale({ width: 0, height: 0 }, shell)).toBe(1);
    expect(computeFitScale({ width: 500, height: 0 }, shell)).toBe(1);
  });
});

describe("computeScreenContentScale", () => {
  it("maps the logical resolution into the visual screen area uniformly", () => {
    // RT40-like: 244×400 logical into a 334×560 visual area → width-limited (1.3688…).
    const scale = computeScreenContentScale(
      { width: 244, height: 400 },
      { width: 334, height: 560 },
    );
    expect(scale).toBeCloseTo(Math.min(334 / 244, 560 / 400), 10);
    expect(scale).toBeCloseTo(334 / 244, 10);
  });

  it("preserves content aspect ratio", () => {
    const screen = { width: 800, height: 480 };
    const area = { width: 563, height: 335 };
    const scale = computeScreenContentScale(screen, area);
    expect((screen.width * scale) / (screen.height * scale)).toBeCloseTo(
      screen.width / screen.height,
      10,
    );
  });
});
