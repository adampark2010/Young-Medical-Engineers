/**
 * Derives the small brand assets from the untouched originals in
 * src/brand/originals and writes them to public/brand (plus /favicon.ico).
 *
 * Nothing is redrawn. Every output is a crop, mask, resize or composite of
 * the original PNGs:
 *   - favicon-16/32/48.png, favicon.ico, apple-touch-icon.png, icon-192/512.png
 *       the navy Y and red M cropped from logo-mark.png (colour-masked so no
 *       cross or gear fragments remain), on an opaque paper square. Tested as
 *       the only crop that stays legible at 16px. No cross at any size, so the
 *       icon can never read as the Red Cross emblem.
 *   - og.png (1200x630): the full lockup on paper with a hairline and a short
 *       red rule. No text is rendered, so no copy is invented here.
 *
 * Run: npm run brand
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'src/brand/originals';
const OUT = 'public/brand';
const PAPER = { r: 246, g: 245, b: 243, alpha: 1 };
const HAIRLINE = { r: 201, g: 200, b: 199, alpha: 1 };
const RED = { r: 178, g: 71, b: 64, alpha: 1 };

// Sampled logo colours (exact) used for masking.
const NAVY = [61, 83, 122];
const LOGO_RED = [178, 71, 64];
const TOL = 14; // tight: the coral cross outline differs from the red M by 28 in the red channel

const near = (r, g, b, [tr, tg, tb]) =>
  Math.abs(r - tr) <= TOL && Math.abs(g - tg) <= TOL && Math.abs(b - tb) <= TOL;

async function ymInitials() {
  const { data, info } = await sharp(path.join(SRC, 'logo-mark.png'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;
      const keep = near(data[i], data[i + 1], data[i + 2], NAVY) || near(data[i], data[i + 1], data[i + 2], LOGO_RED);
      if (!keep) {
        data[i + 3] = 0;
        continue;
      }
      if (a >= 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const crop = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const png = await sharp(data, { raw: { width, height, channels: 4 } }).extract(crop).png().toBuffer();
  return { png, crop };
}

async function squareIcon(lettersPng, size, fill = 0.82) {
  const inner = Math.round(size * fill);
  const letters = await sharp(lettersPng).resize({ width: inner, kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  const m = await sharp(letters).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: letters, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ICO container holding PNG-encoded images (supported by every current browser).
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = [];
  for (const { size, buf } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt8(0, 2);
    d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(buf.length, 8);
    d.writeUInt32LE(offset, 12);
    dirs.push(d);
    offset += buf.length;
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.buf)]);
}

async function ogImage() {
  const W = 1200, H = 630, LEFT = 80, LOGO_W = 760;
  const logo = await sharp(path.join(SRC, 'logo-full.png'))
    .resize({ width: LOGO_W, kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const m = await sharp(logo).metadata();
  const logoTop = Math.round((H - m.height) / 2) - 40;
  const ruleY = logoTop + m.height + 56;
  const hairline = await sharp({ create: { width: W - LEFT * 2, height: 1, channels: 4, background: HAIRLINE } }).png().toBuffer();
  const redRule = await sharp({ create: { width: 48, height: 2, channels: 4, background: RED } }).png().toBuffer();
  return sharp({ create: { width: W, height: H, channels: 4, background: PAPER } })
    .composite([
      { input: logo, left: LEFT, top: logoTop },
      { input: hairline, left: LEFT, top: ruleY },
      { input: redRule, left: LEFT, top: ruleY + 24 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir(OUT, { recursive: true });
const { png: letters, crop } = await ymInitials();
console.log(`YM initials cropped from logo-mark.png at x=${crop.left} y=${crop.top} ${crop.width}x${crop.height}`);

const sizes = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'favicon-48.png': 48, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
const icoEntries = [];
for (const [file, size] of Object.entries(sizes)) {
  const buf = await squareIcon(letters, size, size <= 48 ? 0.84 : 0.72);
  await writeFile(path.join(OUT, file), buf);
  if (size <= 48) icoEntries.push({ size, buf });
  console.log(`wrote ${file} (${buf.length} bytes)`);
}
await writeFile('public/favicon.ico', ico(icoEntries));
console.log('wrote public/favicon.ico (16, 32, 48)');

const og = await ogImage();
await writeFile(path.join(OUT, 'og.png'), og);
console.log(`wrote og.png (${og.length} bytes)`);
