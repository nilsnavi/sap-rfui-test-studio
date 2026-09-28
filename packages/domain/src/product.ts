import { ApplicationVersion } from "./version";
import { unwrapOr } from "./result";

/** Product identity constants shared by every layer above the Domain. */
export const PRODUCT_NAME = "SAP RFUI Test Studio";

/** Foundation release. Device profiles, SAP integration and automation follow later. */
export const PRODUCT_VERSION_TEXT = "0.1.0";

export type ReleaseChannel = "development" | "beta" | "stable";

export function productVersion(): ApplicationVersion {
  return unwrapOr(ApplicationVersion.parse(PRODUCT_VERSION_TEXT), new ApplicationVersionFallback());
}

/**
 * Only reachable if `PRODUCT_VERSION_TEXT` is edited into an invalid value.
 * Falls back to 0.0.0 so no layer ever crashes on startup because of a constant.
 */
class ApplicationVersionFallback extends ApplicationVersion {
  constructor() {
    super(0, 0, 0);
  }
}

export function minimumSupportedVersion(): ApplicationVersion {
  return unwrapOr(
    ApplicationVersion.create({ major: 0, minor: 1, patch: 0 }),
    new ApplicationVersionFallback(),
  );
}
