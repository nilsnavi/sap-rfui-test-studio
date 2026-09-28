/**
 * Normalized application/domain error model (ADR-001 Rule 14).
 *
 * Raw library exceptions must not leak out of the Domain and Application
 * layers: everything thrown or returned across layer boundaries is normalized
 * into an `AppError`.
 */

export type AppErrorCode = "UNKNOWN" | "CONFIGURATION_ERROR" | "STORAGE_ERROR" | "VALIDATION_ERROR";

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

/** Throw-friendly `AppError` implementation. Keeps `Error` semantics for call stacks. */
export class AppFailure extends Error implements AppError {
  readonly code: AppErrorCode;
  readonly cause: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AppFailure";
    this.code = code;
    this.cause = cause;
  }
}

export function createAppError(code: AppErrorCode, message: string, cause?: unknown): AppError {
  return cause === undefined
    ? { code, message }
    : {
        code,
        message,
        cause,
      };
}

export function configurationError(message: string, cause?: unknown): AppFailure {
  return new AppFailure("CONFIGURATION_ERROR", message, cause);
}

export function validationError(message: string, cause?: unknown): AppFailure {
  return new AppFailure("VALIDATION_ERROR", message, cause);
}

export function unknownError(message: string, cause?: unknown): AppFailure {
  return new AppFailure("UNKNOWN", message, cause);
}

/** Structural check so plain object errors and thrown failures are recognized alike. */
export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<AppError>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    isAppErrorCode(candidate.code)
  );
}

function isAppErrorCode(value: string): value is AppErrorCode {
  return (
    value === "UNKNOWN" ||
    value === "CONFIGURATION_ERROR" ||
    value === "STORAGE_ERROR" ||
    value === "VALIDATION_ERROR"
  );
}

/** Normalize an arbitrary thrown value into `AppFailure` without losing the original cause. */
export function toAppError(cause: unknown, fallbackMessage: string): AppFailure {
  if (cause instanceof AppFailure) {
    return cause;
  }
  if (isAppError(cause)) {
    return new AppFailure(cause.code, cause.message, cause.cause);
  }
  if (cause instanceof Error) {
    return new AppFailure("UNKNOWN", `${fallbackMessage}: ${cause.message}`, cause);
  }
  return new AppFailure("UNKNOWN", fallbackMessage, cause);
}
