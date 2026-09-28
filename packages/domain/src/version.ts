import type { Result } from "./result";
import { err, ok } from "./result";
import { configurationError } from "./errors";

/**
 * `ApplicationVersion` — immutable value object for the product version.
 *
 * Pure domain concept: no Node, browser or Tauri APIs are involved.
 * Used by about/status surfaces and, later, by migration and packaging checks.
 */
export interface ApplicationVersionParts {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  /** Optional pre-release marker, e.g. `alpha`, `beta.2`, `rc1`. */
  readonly label?: string;
}

const VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?$/;

const LABEL_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.-]*$/;

export class ApplicationVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly label: string | undefined;

  /** `protected`: instances are created through `create`/`parse` so validation always runs. */
  protected constructor(major: number, minor: number, patch: number, label?: string) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.label = label;
  }

  static create(parts: ApplicationVersionParts): Result<ApplicationVersion> {
    if (!isNonNegativeInteger(parts.major) || !isNonNegativeInteger(parts.minor)) {
      return err(configurationError("Version major/minor must be non-negative integers"));
    }
    if (!isNonNegativeInteger(parts.patch)) {
      return err(configurationError("Version patch must be a non-negative integer"));
    }
    if (parts.label !== undefined && !LABEL_PATTERN.test(parts.label)) {
      return err(
        configurationError(`Invalid version label "${parts.label}"`, {
          expected: "alphanumeric marker, optionally separated by dots or hyphens",
        }),
      );
    }

    const value = new ApplicationVersion(parts.major, parts.minor, parts.patch, parts.label);
    return ok(value);
  }

  /** Parse a `major.minor.patch[-label]` string. */
  static parse(text: string): Result<ApplicationVersion> {
    const match = VERSION_PATTERN.exec(text.trim());
    if (match === null) {
      return err(configurationError(`Cannot parse application version "${text}"`));
    }

    const [, major, minor, patch, label] = match;
    if (major === undefined || minor === undefined || patch === undefined) {
      return err(configurationError(`Cannot parse application version "${text}"`));
    }

    return ApplicationVersion.create({
      major: Number.parseInt(major, 10),
      minor: Number.parseInt(minor, 10),
      patch: Number.parseInt(patch, 10),
      ...(label === undefined ? {} : { label }),
    });
  }

  get isPrerelease(): boolean {
    return this.label !== undefined;
  }

  toString(): string {
    const core = `${this.major}.${this.minor}.${this.patch}`;
    return this.label === undefined ? core : `${core}-${this.label}`;
  }

  /** Returns negative if this version is older, positive if newer, 0 when equal. */
  compareTo(other: ApplicationVersion): number {
    const coreDelta =
      this.major - other.major || this.minor - other.minor || this.patch - other.patch;
    if (coreDelta !== 0) {
      return coreDelta;
    }
    // A release without a label is newer than its pre-release counterpart.
    if (this.label === undefined && other.label === undefined) {
      return 0;
    }
    if (this.label === undefined) {
      return 1;
    }
    if (other.label === undefined) {
      return -1;
    }
    return this.label.localeCompare(other.label);
  }

  equals(other: ApplicationVersion): boolean {
    return this.compareTo(other) === 0;
  }

  isAtLeast(other: ApplicationVersion): boolean {
    return this.compareTo(other) >= 0;
  }
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value) && value >= 0;
}
