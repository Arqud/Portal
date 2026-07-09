// Generate per-brand favicon / app-icon / OG assets from the source logos.
// Run: node scripts/gen-brand-icons.mjs
//
// Each brand logo is trimmed, (optionally) inverted so it reads on a dark
// tile, and fit onto a #0b0b0c luxury background:
//   - square tiles for favicon / app icons (icon-32/192/512, apple-touch-icon)
//   - a 1200x630 dark card for the social/link-preview image (og.png)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const DARK = { r: 11, g: 11, b: 12, alpha: 1 }; // #0b0b0c
const OUT = "public/brand";

const BRANDS = [
  { key: "arqud", src: "assets/brand-src/arqud-logo.jpg", invert: true },   // black wordmark on white
  { key: "wewash", src: "assets/brand-src/wewash-logo.png", invert: false }, // gold/silver on transparent
  { key: "sparkling", src: "assets/brand-src/sparkling-logo.png", invert: false }, // blue/grey on transparent
];

async function prepared(src, invert) {
  if (invert) {
    // Black wordmark on an imperfect white JPEG background. Threshold to a clean
    // binary, then negate → white glyphs on PURE black. Composited with 'screen'
    // the pure-black area leaves the tile untouched (no grey box), only the
    // letters show.
    return sharp(src).trim({ threshold: 30 }).threshold(150).negate().png().toBuffer();
  }
  // Colored logo already on a transparent background — keep as-is.
  return sharp(src).trim({ threshold: 10 }).png().toBuffer();
}

async function squareTile(buf, size, pad) {
  const inner = size - pad * 2;
  const resized = await sharp(buf)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([{ input: resized, gravity: "center", blend: "screen" }])
    .png();
}

async function ogCard(buf) {
  const w = 1200, h = 630;
  const resized = await sharp(buf)
    .resize(920, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: w, height: h, channels: 4, background: DARK } })
    .composite([{ input: resized, gravity: "center", blend: "screen" }])
    .png();
}

for (const { key, src, invert } of BRANDS) {
  const dir = `${OUT}/${key}`;
  await mkdir(dir, { recursive: true });
  const buf = await prepared(src, invert);
  await (await squareTile(buf, 32, 3)).toFile(`${dir}/icon-32.png`);
  await (await squareTile(buf, 192, 22)).toFile(`${dir}/icon-192.png`);
  await (await squareTile(buf, 512, 60)).toFile(`${dir}/icon-512.png`);
  await (await squareTile(buf, 180, 20)).toFile(`${dir}/apple-touch-icon.png`);
  await (await ogCard(buf)).toFile(`${dir}/og.png`);
  console.log("generated", key);
}
