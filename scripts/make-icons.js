// Generates the Sonar app icons (sonar rings) as PNG files without any dependencies.
// Run: node scripts/make-icons.js
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ACCENT = [46, 230, 197];
const BG = [7, 9, 13];

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * `scale` shrinks the artwork (adaptive-icon foregrounds need a safe zone);
 * `bg` is null for a transparent background; `color` overrides the ring colour.
 */
function render(size, { scale, bg, color }) {
  const buf = Buffer.alloc(size * size * 4);
  const rings = [
    { r: 0.14, w: 0.036, a: 1.0 },
    { r: 0.25, w: 0.036, a: 0.62 },
    { r: 0.36, w: 0.036, a: 0.3 },
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - size / 2) / (size * scale);
      const dy = (y + 0.5 - size / 2) / (size * scale);
      const r = Math.hypot(dx, dy);
      let alpha = clamp01((0.06 - r) * size * scale + 0.5); // centre dot
      for (const ring of rings) {
        const edge = (ring.w / 2 - Math.abs(r - ring.r)) * size * scale;
        alpha = Math.max(alpha, clamp01(edge + 0.5) * ring.a);
      }
      const i = (y * size + x) * 4;
      const fg = color ?? ACCENT;
      if (bg) {
        for (let c = 0; c < 3; c++) buf[i + c] = Math.round(bg[c] * (1 - alpha) + fg[c] * alpha);
        buf[i + 3] = 255;
      } else {
        buf[i] = fg[0];
        buf[i + 1] = fg[1];
        buf[i + 2] = fg[2];
        buf[i + 3] = Math.round(alpha * 255);
      }
    }
  }
  return png(size, buf);
}

function solid(size, color) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = color[0];
    buf[i + 1] = color[1];
    buf[i + 2] = color[2];
    buf[i + 3] = 255;
  }
  return png(size, buf);
}

const out = path.join(__dirname, '..', 'assets');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), render(1024, { scale: 1.05, bg: BG }));
fs.writeFileSync(path.join(out, 'android-icon-foreground.png'), render(1024, { scale: 0.8 }));
fs.writeFileSync(path.join(out, 'android-icon-background.png'), solid(1024, BG));
fs.writeFileSync(path.join(out, 'android-icon-monochrome.png'), render(1024, { scale: 0.8, color: [255, 255, 255] }));
fs.writeFileSync(path.join(out, 'favicon.png'), render(48, { scale: 1.05, bg: BG }));
console.log('icons written to', out);
