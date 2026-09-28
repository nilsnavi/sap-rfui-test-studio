import type { AppError } from "./errors";
import { toAppError } from "./errors";

/**
 * Explicit success/failure carrier used by Domain and Application layers.
 * Avoids leaking raw exceptions through pure logic and keeps failures testable.
 */
export type Result<T, E extends AppError = AppError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E extends AppError>(
  result: Result<T, E>,
): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E extends AppError>(
  result: Result<T, E>,
): result is { ok: false; error: E } {
  return !result.ok;
}

export function unwrapOr<T, E extends AppError>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

/** Run a fallible pure function and normalize any thrown value into a `Result`. */
export function fromThrowable<T>(run: () => T, fallbackMessage: string): Result<T> {
  try {
    return ok(run());
  } catch (cause) {
    return err(toAppError(cause, fallbackMessage));
  }
}
