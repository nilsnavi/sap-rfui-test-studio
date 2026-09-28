/**
 * StoragePort — contract for keyed value persistence (ADR-001 Rule 13).
 *
 * The runtime source of truth (SQLite in MVP) is reached only through this port.
 * Upper layers must not know which engine or driver is used.
 */
export type StorageValue = string;

export interface StoragePort {
  /** Returns the stored value or `null` when the key is absent. */
  read(key: string): Promise<StorageValue | null>;
  /** Creates or replaces the value for `key`. */
  write(key: string, value: StorageValue): Promise<void>;
  /** Idempotent removal: a missing key is not an error. */
  remove(key: string): Promise<void>;
}
