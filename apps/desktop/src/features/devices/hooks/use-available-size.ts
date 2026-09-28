import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { Size } from "@sap-rfui/domain";

/**
 * Viewport measurement driven by ResizeObserver (PROMPT-002 §11 — no polling).
 *
 * Environments without ResizeObserver (jsdom in unit tests) fall back to one
 * synchronous `getBoundingClientRect` read; an unmeasured viewport yields
 * `0 × 0`, which `computeFitScale` treats as "render at native size".
 */
export function useAvailableSize<T extends HTMLElement>(): [RefObject<T>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }

    if (typeof ResizeObserver === "undefined") {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) {
        return;
      }
      // contentRect excludes padding and border, so the stage's 32 px
      // viewport padding is already out of the measured area.
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, size];
}
