import { z } from "zod";

import type { DeviceGeometry, DeviceProfile, Result } from "@sap-rfui/domain";
import {
  configurationError,
  err,
  geometryForProfile,
  getDeviceEntry,
  ok,
  SCREEN_SIZE_LIMITS,
  validateScreenDimensions,
  withCustomScreenSize,
} from "@sap-rfui/domain";

/**
 * SelectDeviceUseCase (PROMPT-002 §8–§12, ADR-001 §3).
 *
 * Resolves the requested device from the Domain registry and applies custom
 * dimensions when the target is one of the two custom profiles. Validation uses
 * Zod here — the configuration boundary of the application (the Domain keeps
 * pure invariants). Switching devices is a pure call: no reload, no IO, no
 * ports involved, so the UI can switch on every change.
 */

export const customScreenSizeSchema = z.object({
  width: z.number().int().min(SCREEN_SIZE_LIMITS.minWidth).max(SCREEN_SIZE_LIMITS.maxWidth),
  height: z.number().int().min(SCREEN_SIZE_LIMITS.minHeight).max(SCREEN_SIZE_LIMITS.maxHeight),
});

export type CustomScreenSize = z.infer<typeof customScreenSizeSchema>;

export interface SelectDeviceRequest {
  readonly deviceId: string;
  /**
   * Effective custom screen size. Only consulted for the `custom-*` profiles;
   * hardware profiles always use their factory resolution.
   */
  readonly customSize?: CustomScreenSize;
}

export interface DeviceSelection {
  readonly profile: DeviceProfile;
  readonly geometry: DeviceGeometry;
}

const CUSTOM_PREFIX = "custom-";

export function selectDevice(request: SelectDeviceRequest): Result<DeviceSelection> {
  const entry = getDeviceEntry(request.deviceId);

  if (entry === null) {
    return err(configurationError(`Unknown device profile id: ${request.deviceId}`));
  }

  const isCustom = request.deviceId.startsWith(CUSTOM_PREFIX);

  if (!isCustom) {
    return ok({ profile: entry.profile, geometry: entry.geometry });
  }

  // Zod rejects structurally invalid payloads; the Domain validator then owns
  // the semantic rules (orientation routing) on the sanitized numbers.
  const parsed = customScreenSizeSchema.safeParse(request.customSize);
  if (!parsed.success) {
    // No custom payload at all → the registry default size for this profile.
    if (request.customSize === undefined) {
      return ok({ profile: entry.profile, geometry: entry.geometry });
    }
    return err(
      configurationError(
        `Invalid custom screen size: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      ),
    );
  }

  const dimensions = validateScreenDimensions(parsed.data.width, parsed.data.height);
  if (!dimensions.ok) {
    return err(dimensions.error);
  }

  const profile = withCustomScreenSize(entry.profile, dimensions.value);
  // The orientation rule may route 900×500 to `custom-landscape`; the Domain
  // resolver returns the neutral shell rebuilt for the effective screen size.
  return ok({ profile, geometry: geometryForProfile(profile) });
}
