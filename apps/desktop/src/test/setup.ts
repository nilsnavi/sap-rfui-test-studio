import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Vitest runs with `globals: false`, so @testing-library/react cannot register
 * its automatic cleanup hook; shell tests mount the whole app tree and would
 * otherwise leak into the next test.
 */
afterEach(() => {
  cleanup();
});
