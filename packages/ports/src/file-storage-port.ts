/**
 * FileStoragePort — contract for portable file artifacts (YAML exports, reports,
 * screenshots). Filesystem access is allowed only through this port
 * (ADR-001 Rule 13).
 */
export type FilePath = string;

export interface FileStat {
  readonly path: FilePath;
  readonly sizeBytes: number;
}

export interface FileStoragePort {
  exists(path: FilePath): Promise<boolean>;
  readText(path: FilePath): Promise<string>;
  writeText(path: FilePath, contents: string): Promise<FileStat>;
  readBytes(path: FilePath): Promise<Uint8Array>;
  writeBytes(path: FilePath, contents: Uint8Array): Promise<FileStat>;
  /** Idempotent removal: a missing file is not an error. */
  remove(path: FilePath): Promise<void>;
}
