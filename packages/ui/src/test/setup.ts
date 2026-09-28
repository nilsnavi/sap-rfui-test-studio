import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Vitest runs with `globals: false`, so @testing-library/react cannot register
 * its automatic cleanup hook; without this every render would leak into the
 * next test in the same file.
 */
afterEach(() => {
  cleanup();
});
