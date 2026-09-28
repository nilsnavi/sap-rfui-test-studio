/**
 * Uniform scaling helpers (PROMPT-002 §11).
 *
 * Every scale factor here is a single number applied to both axes, so the
 * device aspect ratio is always preserved. Independent X/Y stretching is
 * structurally impossible with these functions.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Fit `content` into `available` with one uniform factor:
 * `min(available.width / content.width, available.height / content.height)`.
 *
 * An unmeasured viewport (zero or negative side, e.g. before the first
 * ResizeObserver callback) returns `1` so the shell renders at native size.
 * The result is capped at `1`: the emulator shrinks to fit but never upscales
 * a device beyond its authored shell geometry.
 */
export function computeFitScale(available: Size, content: Size): number {
  if (content.width <= 0 || content.height <= 0) {
    return 1;
  }
  if (available.width <= 0 || available.height <= 0) {
    return 1;
  }
  return Math.min(available.width / content.width, available.height / content.height, 1);
}

/**
 * Uniform factor that maps a logical screen resolution into the physical
 * screen rectangle of the shell. The legacy tool scaled X and Y independently
 * (`scale(w/w, h/h)`); the new renderer keeps one factor and centers the
 * content, which preserves the RFUI aspect ratio (PROMPT-002 §11, §17).
 */
export function computeScreenContentScale(screen: Size, visualArea: Size): number {
  return Math.min(visualArea.width / screen.width, visualArea.height / screen.height);
}
