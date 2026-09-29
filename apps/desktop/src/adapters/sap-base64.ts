/**
 * Binary/base64 helpers for the SPIKE-001 adapter boundary.
 *
 * Script sources travel to the Rust host as standard-base64 utf-8, which keeps
 * the injection channel free of quoting/escaping issues with the SAP page
 * content. Dependency-free so the same code runs in the Tauri webview and in
 * jsdom unit tests.
 */

export function utf8EncodeBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

const MAX_SOURCE_BYTES = 60_000;

/** Standard base64 (RFC 4648) of a byte sequence, chunked to avoid arg limits. */
export function bytesToBase64Standard(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Encodes an adapter-authored script; guards the native command payload size. */
export function encodeScriptSource(source: string): string {
  const bytes = utf8EncodeBytes(source);
  if (bytes.length > MAX_SOURCE_BYTES) {
    throw new Error(`script source too large: ${bytes.length} bytes`);
  }
  return bytesToBase64Standard(bytes);
}
