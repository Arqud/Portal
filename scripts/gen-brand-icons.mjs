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

// --- Neutral "Client Portal" identity (no source logo) ---------------------
// Used on a multi-brand client subdomain (Arno) so the link-preview card shows a
// plain, brand-agnostic identity instead of ARQUD. Built from inline SVG — a gold
// ring mark for the icons, ring + wordmark for the OG card — on the same dark tile.
const GOLD = "#c8a96e";
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0b0b0c"/><circle cx="256" cy="256" r="150" fill="none" stroke="${GOLD}" stroke-width="20"/><circle cx="256" cy="256" r="46" fill="${GOLD}"/></svg>`;
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0b0b0c"/><circle cx="600" cy="212" r="34" fill="none" stroke="${GOLD}" stroke-width="3"/><circle cx="600" cy="212" r="6" fill="${GOLD}"/><text x="600" y="356" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="600" letter-spacing="8" fill="#f4efe6">CLIENT PORTAL</text><rect x="540" y="398" width="120" height="2" fill="${GOLD}"/><text x="600" y="452" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="7" fill="#8f8880">LEADS &amp; CAMPAIGN DASHBOARD</text></svg>`;

const neutralDir = `${OUT}/neutral`;
await mkdir(neutralDir, { recursive: true });
for (const size of [32, 192, 512]) {
  await sharp(Buffer.from(iconSvg)).resize(size, size).png().toFile(`${neutralDir}/icon-${size}.png`);
}
await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(`${neutralDir}/apple-touch-icon.png`);
await sharp(Buffer.from(ogSvg)).png().toFile(`${neutralDir}/og.png`);
console.log("generated", "neutral");
