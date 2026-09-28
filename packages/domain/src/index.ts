export type { AppError, AppErrorCode } from "./errors";
export {
  AppFailure,
  configurationError,
  createAppError,
  isAppError,
  toAppError,
  unknownError,
  validationError,
} from "./errors";

export type { Result } from "./result";
export { err, fromThrowable, isErr, isOk, ok, unwrapOr } from "./result";

export type { ApplicationVersionParts } from "./version";
export { ApplicationVersion } from "./version";

export type { HealthAssessment, HealthSignal, HealthState } from "./health";
export { assessHealth, isHealthy } from "./health";

export type {
  DeviceCapabilities,
  DeviceGeometry,
  DeviceOrientation,
  DeviceProfile,
  DeviceScreenSize,
} from "./device/device-profile";

export type { DeviceEntry } from "./device/device-registry";
export {
  DEFAULT_DEVICE_ID,
  DEVICE_ENTRIES,
  geometryForProfile,
  getDeviceEntry,
  getDeviceProfile,
  listDeviceProfiles,
  neutralShellGeometry,
} from "./device/device-registry";

export type { ScreenDimensions } from "./device/custom-device";
export {
  DEFAULT_CUSTOM_LANDSCAPE,
  DEFAULT_CUSTOM_PORTRAIT,
  SCREEN_SIZE_LIMITS,
  customDeviceIdFor,
  deriveOrientation,
  validateScreenDimensions,
  withCustomScreenSize,
} from "./device/custom-device";

export type { Size } from "./device/scaling";
export { computeFitScale, computeScreenContentScale } from "./device/scaling";

export type { ReleaseChannel } from "./product";
export {
  PRODUCT_NAME,
  PRODUCT_VERSION_TEXT,
  minimumSupportedVersion,
  productVersion,
} from "./product";
