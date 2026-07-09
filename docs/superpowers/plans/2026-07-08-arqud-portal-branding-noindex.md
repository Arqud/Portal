# ARQUD Portal Branding + noindex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the portal a per-logged-in-user brand identity (favicon, tab title, theme-color, share card) across ARQUD / We Wash / Sparkling, and keep the whole private portal out of search engines.

**Architecture:** A pure `brand-meta` module maps a signed-in profile to one of three brand identities. The root layout ships ARQUD defaults + a global `noindex`. The client layout adds `generateMetadata`/`generateViewport` that resolve the brand from the session and swap the icons/title/theme-color. Per-brand icon + OG assets are generated once from the source logos and committed to `public/brand/<brand>/`.

**Tech Stack:** Next.js App Router (`Metadata`/`Viewport` exports), TypeScript, Vitest, `sharp` (dev-only, icon generation).

## Global Constraints

- Framework: Next.js App Router — brand-by-user via `generateMetadata`, not host.
- Whole portal is `noindex, nofollow` (private, auth-gated). No task may enable indexing.
- Brand resolution (verbatim): admin → `arqud`; `profiles.brand` "We Wash" → `wewash`; "Sparkling" → `sparkling`; client with no brand (Arno / Sparkling Investment Group) → `sparkling`; logged-out → `arqud` (root default).
- `metadataBase` = `https://arqudportal.co.za` (so OG/icon URLs resolve absolutely).
- Brand display names: ARQUD → "ARQUD Portal"; We Wash → "We Wash Cars"; Sparkling → "Sparkling Auto Care Centres".
- Source logos: We Wash `…/Arno Marketing Materiaal/5.1 Logo WWC Generic.png`; Sparkling `…/Arno Marketing Materiaal/5.1 Logo Sparkling Generic.png`; ARQUD `C:/dev/arqud-portal/assets/brand-src/arqud-logo.png` (provided by Morne; black wordmark → invert to white for dark surfaces).
- Do not touch existing tests; keep `tsc --noEmit` and `next build` green.

---

### Task 1: Brand metadata module + resolver

**Files:**
- Create: `src/lib/brand/brand-meta.ts`
- Test: `src/lib/brand/__tests__/brand-meta.test.ts`

**Interfaces:**
- Produces: `type Brand = "arqud" | "wewash" | "sparkling"`; `BRANDS: Record<Brand, BrandMeta>` where `BrandMeta = { key: Brand; name: string; tagline: string; themeColor: string; iconDir: string }`; `resolveBrand(input: { role?: string | null; brand?: string | null }): Brand`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/brand/__tests__/brand-meta.test.ts
import { describe, it, expect } from "vitest";
import { resolveBrand, BRANDS } from "../brand-meta";

describe("resolveBrand", () => {
  it("admin -> arqud", () => {
    expect(resolveBrand({ role: "admin", brand: null })).toBe("arqud");
  });
  it("We Wash staff -> wewash", () => {
    expect(resolveBrand({ role: "client", brand: "We Wash" })).toBe("wewash");
  });
  it("Sparkling staff -> sparkling", () => {
    expect(resolveBrand({ role: "client", brand: "Sparkling" })).toBe("sparkling");
  });
  it("client with no brand (Arno) -> sparkling", () => {
    expect(resolveBrand({ role: "client", brand: null })).toBe("sparkling");
  });
  it("every brand has a complete meta entry", () => {
    for (const b of ["arqud", "wewash", "sparkling"] as const) {
      const m = BRANDS[b];
      expect(m.name).toBeTruthy();
      expect(m.iconDir).toMatch(/^\/brand\//);
      expect(m.themeColor).toMatch(/^#/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/dev/arqud-portal && npx vitest run src/lib/brand/__tests__/brand-meta.test.ts`
Expected: FAIL — cannot find module `../brand-meta`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/brand/brand-meta.ts
export type Brand = "arqud" | "wewash" | "sparkling";

export interface BrandMeta {
  key: Brand;
  name: string;
  tagline: string;
  themeColor: string;
  iconDir: string; // absolute public path, e.g. "/brand/arqud"
}

export const BRANDS: Record<Brand, BrandMeta> = {
  arqud: { key: "arqud", name: "ARQUD Portal", tagline: "Agency command center", themeColor: "#0b0b0c", iconDir: "/brand/arqud" },
  wewash: { key: "wewash", name: "We Wash Cars", tagline: "Premium mobile valet", themeColor: "#0b0b0c", iconDir: "/brand/wewash" },
  sparkling: { key: "sparkling", name: "Sparkling Auto Care Centres", tagline: "Premium auto detailing", themeColor: "#0b0b0c", iconDir: "/brand/sparkling" },
};

// admin -> ARQUD; brand-scoped staff -> their brand; a client with no brand
// (Arno / Sparkling Investment Group) -> Sparkling. Called only for signed-in
// users; logged-out surfaces use the ARQUD root default.
export function resolveBrand(input: { role?: string | null; brand?: string | null }): Brand {
  if (input.role === "admin") return "arqud";
  const b = (input.brand ?? "").toLowerCase();
  if (b.includes("we wash") || b.includes("wewash")) return "wewash";
  if (b.includes("sparkling")) return "sparkling";
  return "sparkling"; // Arno: client, no brand
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/brand/__tests__/brand-meta.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/brand/brand-meta.ts src/lib/brand/__tests__/brand-meta.test.ts
git commit -m "feat(brand): brand-meta map + resolveBrand"
```

---

### Task 2: Generate + commit per-brand icon and OG assets

**Files:**
- Create: `assets/brand-src/README.md` (documents the 3 source logos + how to regen)
- Create: `scripts/gen-brand-icons.mjs`
- Create (generated, committed): `public/brand/{arqud,wewash,sparkling}/{icon-32.png,icon-192.png,icon-512.png,apple-touch-icon.png,og.png}`
- Create: `public/robots.txt`
- Modify: `package.json` (add `sharp` devDependency + `gen:icons` script)

**Interfaces:**
- Produces: static asset files at the paths `BRANDS[b].iconDir` reference (`/brand/<brand>/icon-32.png`, `/icon-192.png`, `/icon-512.png`, `/apple-touch-icon.png`, `/og.png`).

**Prerequisite:** the three source logos exist locally (ARQUD file provided by Morne at `assets/brand-src/arqud-logo.png`; copy the We Wash + Sparkling PNGs from `…/Arno Marketing Materiaal/` into `assets/brand-src/` as `wewash-logo.png` / `sparkling-logo.png`). If an iCloud file is online-only, open it once so it downloads.

- [ ] **Step 1: Add sharp + copy source logos**

```bash
cd /c/dev/arqud-portal
npm i -D sharp
mkdir -p assets/brand-src public/brand/arqud public/brand/wewash public/brand/sparkling
cp "/c/Users/morne/iCloudDrive/Claude Workspace/Arno Marketing Materiaal/5.1 Logo WWC Generic.png" assets/brand-src/wewash-logo.png
cp "/c/Users/morne/iCloudDrive/Claude Workspace/Arno Marketing Materiaal/5.1 Logo Sparkling Generic.png" assets/brand-src/sparkling-logo.png
# arqud-logo.png must already be in assets/brand-src/ (from Morne)
```

- [ ] **Step 2: Write the generation script**

```js
// scripts/gen-brand-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const DARK = { r: 11, g: 11, b: 12, alpha: 1 }; // #0b0b0c luxury background
const OUT = "public/brand";

// invert=true for logos that are black on transparent/white (ARQUD) so the
// mark shows on the dark tiles/card.
const BRANDS = [
  { key: "arqud", src: "assets/brand-src/arqud-logo.png", invert: true },
  { key: "wewash", src: "assets/brand-src/wewash-logo.png", invert: false },
  { key: "sparkling", src: "assets/brand-src/sparkling-logo.png", invert: false },
];

async function markOnDark(src, invert, size, pad) {
  // Trim whitespace, optionally invert to white, fit inside a padded dark square.
  let logo = sharp(src).trim();
  if (invert) logo = logo.negate({ alpha: false });
  const inner = size - pad * 2;
  const resized = await logo.resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([{ input: resized, gravity: "center" }])
    .png();
}

async function ogCard(src, invert) {
  const w = 1200, h = 630;
  let logo = sharp(src).trim();
  if (invert) logo = logo.negate({ alpha: false });
  const resized = await logo.resize(760, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 4, background: DARK } })
    .composite([{ input: resized, gravity: "center" }])
    .png();
}

for (const { key, src, invert } of BRANDS) {
  const dir = `${OUT}/${key}`;
  await mkdir(dir, { recursive: true });
  await (await markOnDark(src, invert, 32, 4)).toFile(`${dir}/icon-32.png`);
  await (await markOnDark(src, invert, 192, 20)).toFile(`${dir}/icon-192.png`);
  await (await markOnDark(src, invert, 512, 56)).toFile(`${dir}/icon-512.png`);
  await (await markOnDark(src, invert, 180, 18)).toFile(`${dir}/apple-touch-icon.png`);
  await (await ogCard(src, invert)).toFile(`${dir}/og.png`);
  console.log("generated", key);
}
```

- [ ] **Step 3: Add the npm script + create robots.txt**

Add to `package.json` `"scripts"`: `"gen:icons": "node scripts/gen-brand-icons.mjs"`.

```txt
// public/robots.txt
User-agent: *
Disallow: /
```

- [ ] **Step 4: Generate and eyeball the assets**

Run: `npm run gen:icons`
Expected: prints `generated arqud`, `generated wewash`, `generated sparkling`; 15 PNGs written under `public/brand/`. Open `public/brand/arqud/icon-512.png` and `og.png` and confirm the mark is visible (white ARQUD on dark; the two brand logos legible). If a source logo is low-res or clipped, re-crop the source and re-run before committing.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-brand-icons.mjs public/brand public/robots.txt package.json package-lock.json assets/brand-src/README.md
git commit -m "feat(brand): generate per-brand icon + OG assets, add robots.txt"
```

---

### Task 3: Root metadata — ARQUD defaults + global noindex

**Files:**
- Modify: `src/app/layout.tsx:20-23` (the existing `metadata` export)

**Interfaces:**
- Consumes: assets from Task 2 (`/brand/arqud/*`).

- [ ] **Step 1: Replace the metadata export + add viewport**

Replace the current `export const metadata` block with:

```ts
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://arqudportal.co.za"),
  title: { default: "ARQUD Portal", template: "%s · ARQUD" },
  description: "Agency dashboard and client portal for ARQUD (PTY) LTD.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/brand/arqud/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/arqud/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/arqud/apple-touch-icon.png",
  },
  openGraph: {
    title: "ARQUD Portal",
    description: "Agency dashboard and client portal.",
    url: "https://arqudportal.co.za",
    siteName: "ARQUD",
    images: ["/brand/arqud/og.png"],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ARQUD Portal", description: "Agency dashboard and client portal.", images: ["/brand/arqud/og.png"] },
};

export const viewport: Viewport = { themeColor: "#0b0b0c" };
```

(The existing `import type { Metadata } from "next";` at line 1 becomes `import type { Metadata, Viewport } from "next";`.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Verify noindex + icons render**

Run: `npm run build && npm start` (or `npm run dev`), then:
`curl -s http://localhost:3000/login | grep -Eo '<meta name="robots"[^>]*>'`
Expected: `<meta name="robots" content="noindex, nofollow">`. Also confirm `curl -s http://localhost:3000/brand/arqud/icon-32.png -o /dev/null -w "%{http_code}"` → `200`.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(brand): ARQUD root metadata, OG, and global noindex"
```

---

### Task 4: Client layout — per-user brand metadata

**Files:**
- Modify: `src/app/client/layout.tsx` (add `generateMetadata` + `generateViewport`)

**Interfaces:**
- Consumes: `resolveBrand`, `BRANDS` (Task 1); assets (Task 2); `verifySession("client")` → `{ profile: { role?, brand, ... } }`.

- [ ] **Step 1: Add the metadata exports**

Add these exports to `src/app/client/layout.tsx` (keep the existing default layout component):

```ts
import type { Metadata, Viewport } from "next";
import { BRANDS, resolveBrand } from "@/lib/brand/brand-meta";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await verifySession("client");
  const m = BRANDS[resolveBrand({ role: profile.role, brand: profile.brand })];
  return {
    title: { default: m.name, template: `%s · ${m.name}` },
    icons: {
      icon: [
        { url: `${m.iconDir}/icon-32.png`, sizes: "32x32", type: "image/png" },
        { url: `${m.iconDir}/icon-192.png`, sizes: "192x192", type: "image/png" },
      ],
      apple: `${m.iconDir}/apple-touch-icon.png`,
    },
    openGraph: { title: m.name, siteName: m.name, images: [`${m.iconDir}/og.png`], type: "website" },
    twitter: { card: "summary_large_image", title: m.name, images: [`${m.iconDir}/og.png`] },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { profile } = await verifySession("client");
  const m = BRANDS[resolveBrand({ role: profile.role, brand: profile.brand })];
  return { themeColor: m.themeColor };
}
```

Note: do NOT set `robots` here — the root `noindex` is inherited and must stay. If `profile` has no `role` field, `resolveBrand` treats it as a client and still resolves correctly (staff by brand, Arno → sparkling).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (If `profile.role` is not a typed field, use `(profile as { role?: string }).role`.)

- [ ] **Step 3: Verify per-user branding**

Run the app. Log in as each account and check the browser tab + view-source:
- `info@wewash.co.za` → title "… · We Wash Cars", favicon = We Wash, `<meta name="theme-color">` present.
- `admin@sparklingauto.co.za` → "… · Sparkling Auto Care Centres", Sparkling favicon.
- Arno → Sparkling identity.
- Admin (Morne) at `/admin` → ARQUD (root default). Login page → ARQUD.
Confirm `<meta name="robots" content="noindex, nofollow">` is still present on client pages.

- [ ] **Step 4: Commit**

```bash
git add src/app/client/layout.tsx
git commit -m "feat(brand): per-logged-in-user brand metadata on client portal"
```

---

### Task 5: Full verification + regression gate

**Files:** none (integration check).

- [ ] **Step 1: Test + typecheck + build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all tests pass (existing + Task 1's 5 new), tsc exit 0, build succeeds.

- [ ] **Step 2: Manual brand matrix**

Confirm the behaviour table from the spec end-to-end (admin=ARQUD, We Wash staff=We Wash, Sparkling staff + Arno=Sparkling, login/logged-out=ARQUD), favicon updates on client-side navigation between client pages, and `robots.txt` serves `Disallow: /` at `/robots.txt`.

- [ ] **Step 3: Open PR**

```bash
git push -u origin portal-branding-noindex
gh pr create --title "Portal branding + global noindex (per-logged-in-user identity)" --body "Implements docs/superpowers/specs/2026-07-08-arqud-portal-branding-noindex-design.md — favicon/title/theme/share-card by logged-in brand (ARQUD/We Wash/Sparkling), whole portal noindex. Assets generated + committed."
```

## Self-Review

- **Spec coverage:** brand resolution (Task 1) ✓; favicon + app icons per brand (Task 2 + 4) ✓; tab titles (Task 3 + 4 title templates) ✓; link-preview card ARQUD default + per-brand OG (Task 3 + 4) ✓; noindex global (Task 3 metadata + Task 2 robots.txt) ✓; metadataBase (Task 3) ✓; behaviour table (Task 4 Step 3) ✓; verification (Task 5) ✓. No spec requirement is unmapped.
- **Placeholders:** none — every code step carries full code; asset step has a working sharp script.
- **Type consistency:** `Brand`, `BrandMeta`, `BRANDS`, `resolveBrand`, `iconDir` used identically in Tasks 1/3/4. Asset paths (`/brand/<brand>/icon-32.png` etc.) match between Task 2 output and Task 3/4 references.

**Open dependency:** Task 2 needs the ARQUD logo file at `assets/brand-src/arqud-logo.png` and the We Wash/Sparkling PNGs downloaded from iCloud. Tasks 1, 3, 4 code can proceed before the assets land; Task 2 (and the icon-serving parts of the Task 3/4 verification) need them.
