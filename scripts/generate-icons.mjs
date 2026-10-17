// Generates the PNG icons referenced by the web app manifest.
// Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

// 4x4 supersampling gives clean edges without a graphics dependency.
const SS = 4;

// Isometric box mark in 0..1 coordinates.
const TOP = [[0.5, 0.2], [0.78, 0.35], [0.5, 0.5], [0.22, 0.35]];
const LEFT = [[0.22, 0.35], [0.5, 0.5], [0.5, 0.8], [0.22, 0.65]];
const RIGHT = [[0.78, 0.35], [0.5, 0.5], [0.5, 0.8], [0.78, 0.65]];
const TOP_RGB = [224, 236, 255];
const LEFT_RGB = [96, 165, 250];
const RIGHT_RGB = [59, 130, 246];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function insideRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function render(size, { rounded, scale }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = SS * SS;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;
          if (rounded && !insideRoundedSquare(u, v, 0.22)) continue;

          // Vertical background gradient: #16294a -> #080b12.
          let color = [lerp(22, 8, v), lerp(41, 11, v), lerp(74, 18, v), 255];

          const cu = (u - 0.5) / scale + 0.5;
          const cv = (v - 0.5) / scale + 0.5;
          if (insidePolygon(cu, cv, TOP)) color = [...TOP_RGB, 255];
          else if (insidePolygon(cu, cv, LEFT)) color = [...LEFT_RGB, 255];
          else if (insidePolygon(cu, cv, RIGHT)) color = [...RIGHT_RGB, 255];

          const a = color[3] / 255;
          r += color[0] * a;
          g += color[1] * a;
          b += color[2] * a;
          alpha += a;
        }
      }

      const offset = (py * size + px) * 4;
      if (alpha > 0) {
        rgba[offset] = Math.round(r / alpha);
        rgba[offset + 1] = Math.round(g / alpha);
        rgba[offset + 2] = Math.round(b / alpha);
        rgba[offset + 3] = Math.round((alpha / samples) * 255);
      }
    }
  }

  return rgba;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
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

const targets = [
  { file: "icon-192.png", size: 192, rounded: true, scale: 0.92 },
  { file: "icon-512.png", size: 512, rounded: true, scale: 0.92 },
  { file: "icon-maskable-512.png", size: 512, rounded: false, scale: 0.72 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, scale: 0.92 },
];

mkdirSync(outDir, { recursive: true });
for (const target of targets) {
  const png = encodePng(
    target.size,
    target.size,
    render(target.size, target),
  );
  writeFileSync(join(outDir, target.file), png);
  console.log(`wrote public/icons/${target.file} (${png.length} bytes)`);
}
