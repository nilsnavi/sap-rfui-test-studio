import type { ReleaseChannel } from "@sap-rfui/domain";
import { PRODUCT_NAME, PRODUCT_VERSION_TEXT, productVersion } from "@sap-rfui/domain";

/**
 * Identity snapshot exposed to presentation surfaces (Dashboard, Settings).
 * Presentation must not hardcode product constants; it renders this DTO.
 */
export interface AppInfoDto {
  readonly productName: string;
  readonly version: string;
  readonly channel: ReleaseChannel;
  readonly prerelease: boolean;
  /** Human-readable build tag, e.g. `0.1.0 (development build)`. */
  readonly buildLabel: string;
}

export function getAppInfo(channel: ReleaseChannel): AppInfoDto {
  const version = productVersion();

  return {
    productName: PRODUCT_NAME,
    version: PRODUCT_VERSION_TEXT,
    channel,
    prerelease: version.isPrerelease,
    buildLabel:
      channel === "development"
        ? `${PRODUCT_VERSION_TEXT} (development build)`
        : `${PRODUCT_VERSION_TEXT} (${channel})`,
  };
}
