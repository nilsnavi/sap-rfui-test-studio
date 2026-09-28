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

export type { ReleaseChannel } from "./product";
export {
  PRODUCT_NAME,
  PRODUCT_VERSION_TEXT,
  minimumSupportedVersion,
  productVersion,
} from "./product";
