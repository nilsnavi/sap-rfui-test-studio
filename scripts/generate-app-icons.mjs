#!/usr/bin/env node
/**
 * Placeholder application icon generator (foundation release).
 *
 * `tauri build` requires real image assets (PNG + Windows .ico). Rather than
 * committing binaries nobody can reproduce, this script derives them from a
 * deterministic drawing routine. Replace with a designed asset once branding
 * exists (SPEC-014).
 *
 * Usage: pnpm icons:generate
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "apps", "desktop", "src-tauri", "icons");

const PALETTE = {
  canvas: [11, 14, 19, 255], // --surface-canvas
  panel: [18, 22, 30, 255], // --surface-raised
  accent: [77, 125, 221, 255], // --accent-default
  scan: [47, 158, 111, 255], // --status-success
  void: [0, 0, 0, 0],
};

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const sizes = [32, 128, 256];
  const pngs = new Map();

  for (const size of sizes) {
    pngs.set(size, encodePng(size, drawIcon(size)));
  }

  writeFileSync(join(OUT_DIR, "32x32.png"), pngs.get(32));
  writeFileSync(join(OUT_DIR, "128x128.png"), pngs.get(128));
  writeFileSync(join(OUT_DIR, "256x256.png"), pngs.get(256));
  writeFileSync(join(OUT_DIR, "icon.png"), pngs.get(256));
  writeFileSync(join(OUT_DIR, "icon.ico"), encodeIco([pngs.get(32), pngs.get(256)]));
  // Square variants referenced by some Linux/Windows bundles.
  writeFileSync(join(OUT_DIR, "Square30x30Logo.png"), pngs.get(32));
  writeFileSync(join(OUT_DIR, "Square150x150Logo.png"), pngs.get(256));

  process.stdout.write(`Generated ${sizes.length} icon sizes in ${OUT_DIR.replace(ROOT, ".")}\n`);
}

/** Paint the placeholder mark: a handheld terminal outline with a scan line. */
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const pad = Math.max(1, Math.round(size * 0.16));
  const bodyLeft = pad;
  const bodyRight = size - 1 - pad;
  const bodyTop = Math.round(size * 0.1);
  const bodyBottom = size - 1 - Math.round(size * 0.1);
  const stroke = Math.max(1, Math.round(size * 0.05));
  const screenInset = Math.round(size * 0.09);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = PALETTE.void;

      const insideBody =
        x >= bodyLeft && x <= bodyRight && y >= bodyTop && y <= bodyBottom;
      const onBodyFrame =
        insideBody &&
        (x < bodyLeft + stroke ||
          x > bodyRight - stroke ||
          y < bodyTop + stroke ||
          y > bodyBottom - stroke);

      if (insideBody) {
        color = PALETTE.panel;
      }

      const insideScreen =
        x >= bodyLeft + screenInset &&
        x <= bodyRight - screenInset &&
        y >= bodyTop + screenInset &&
        y <= bodyBottom - screenInset;

      if (insideScreen) {
        color = PALETTE.canvas;
        // RFUI field lines.
        const lineThickness = Math.max(1, Math.round(size * 0.02));
        const firstLine = Math.round(size * 0.34);
        const secondLine = Math.round(size * 0.48);
        if (
          (y >= firstLine && y < firstLine + lineThickness) ||
          (y >= secondLine && y < secondLine + lineThickness)
        ) {
          color = PALETTE.accent;
        }
      }

      if (onBodyFrame) {
        color = PALETTE.accent;
      }

      // Scan bar under the screen — the "scanner" hint.
      const scanTop = Math.round(size * 0.66);
      const scanHeight = Math.max(1, Math.round(size * 0.04));
      if (
        insideBody &&
        y >= scanTop &&
        y < scanTop + scanHeight &&
        x >= bodyLeft + screenInset &&
        x <= bodyRight - screenInset
      ) {
        color = PALETTE.scan;
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }

  return pixels;
}

/* ------------------------------- PNG encoding ------------------------------- */

const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(size, rgba) {
  // Raw scanlines: each row is prefixed with a filter-type byte (0 = None).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------- ICO encoding ------------------------------- */

/** .NET-style container: one ICONDIR followed by PNG-compressed entries. */
function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  const entrySize = 16;
  let offset = header.length + entrySize * pngs.length;

  const entries = pngs.map((png) => {
    const entry = Buffer.alloc(entrySize);
    const size = decodePngSize(png);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}

function decodePngSize(png) {
  return png.readUInt32BE(16);
}

main();
