import type { StoragePort, StorageValue } from "@sap-rfui/ports";

/**
 * StoragePort backed by the webview `Storage` API (available both in `vite dev`
 * and inside the Tauri window).
 *
 * Sprint M4 replaces this with the SQLite adapter behind the same port; product
 * code above the port must not change.
 */
export class WebStorageAdapter implements StoragePort {
  private readonly backend: Storage;
  private readonly prefix: string;

  constructor(backend: Storage, namespace = "sap-rfui") {
    this.backend = backend;
    this.prefix = `${namespace}:`;
  }

  private qualify(key: string): string {
    return `${this.prefix}${key}`;
  }

  async read(key: string): Promise<StorageValue | null> {
    return this.backend.getItem(this.qualify(key));
  }

  async write(key: string, value: StorageValue): Promise<void> {
    this.backend.setItem(this.qualify(key), value);
  }

  async remove(key: string): Promise<void> {
    this.backend.removeItem(this.qualify(key));
  }
}

/**
 * Non-persistent fallback used when the platform gives no usable storage
 * (private mode, disabled cookies, headless test host). Startup keeps working and
 * the health probe reports the degraded state instead of crashing the shell.
 */
export class InMemoryStorageAdapter implements StoragePort {
  private readonly records = new Map<string, StorageValue>();

  async read(key: string): Promise<StorageValue | null> {
    return this.records.get(key) ?? null;
  }

  async write(key: string, value: StorageValue): Promise<void> {
    this.records.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.records.delete(key);
  }
}
