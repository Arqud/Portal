# ARQUD Portal — Branding & Link-Preview Polish (noindex)

**Date:** 2026-07-08
**Status:** Design — awaiting review
**Repo:** `C:/dev/arqud-portal` (Arqud/Portal)

## Problem

The portal (`arqudportal.co.za` + subdomains like `arno.`) looks unbranded: a blank/globe favicon, generic tab titles, and bare link-preview cards when a URL is shared. Root metadata is only `title` + `description` — there is no favicon, app icons, Open Graph, Twitter card, `robots` directive, or `metadataBase`, and there is no `public/` assets folder. This reads as amateur next to the product itself.

## Goal

Make every human-facing surface look branded — **favicon, tab title, and share card** — with the brand chosen by **who is logged in**. Keep search engines out (the portal is private and auth-gated).

## Decisions (locked during brainstorming)

- **Scope:** brand the private portal. Do **not** pursue public search ranking. Apply a global **noindex**.
- **Brand signal:** by **logged-in user** (not host/subdomain). Chosen over host-based because the branded subdomains (`wewash.` / `sparkling.`) don't exist yet (need Vercel + DNS) and `arno.` serves both brands.
- **Brand resolution:**
  - Admin (Morne) → **ARQUD**
  - Brand-scoped staff (`profiles.brand`) → **We Wash** / **Sparkling**
  - Arno (Sparkling Investment Group owner, `brand` null) → **Sparkling**
  - Logged out (login page, shared-link previews) → **ARQUD** default
- **Assets:** We Wash + Sparkling logos exist as PNG ("Generic", non-co-branded) in `…/Claude Workspace/Arno Marketing Materiaal/` (`5.1 Logo WWC Generic.png`, `5.1 Logo Sparkling Generic.png`). **ARQUD logo will be provided by Morne.**
- **Link previews:** ARQUD default only. True per-brand preview cards need branded subdomains → parked.

## Architecture

### Brand resolution
- `src/lib/brand/brand-meta.ts` — `type Brand = 'arqud' | 'wewash' | 'sparkling'` and `BRANDS: Record<Brand, BrandMeta>` where
  `BrandMeta = { key, name, tagline, iconDir, themeColor, ogImage }`.
- `resolveBrandForSession(profile)` → `Brand`, applying the rules above. Reuses the session/profile already fetched by the client layout for lead brand-scoping (`getBrand` in `src/lib/leads/brand.ts` maps `profiles.brand`; extend for admin → arqud and Arno → sparkling).

### Metadata hook points (Next.js App Router)
- **Root `src/app/layout.tsx`** — ARQUD defaults for the whole app:
  - `metadataBase: new URL('https://arqudportal.co.za')`
  - `title: { default: 'ARQUD Portal', template: '%s · ARQUD' }`
  - `description`, and `robots: { index: false, follow: false, googleBot: { index: false, follow: false } }`
  - `icons` (ARQUD set), `openGraph` (ARQUD card), `twitter: { card: 'summary_large_image' }`, theme-color = ARQUD gold.
- **`src/app/admin/layout.tsx`** — admin is always ARQUD → inherits root defaults. No brand override needed.
- **`src/app/client/layout.tsx`** — add `generateMetadata()`:
  - read session → profile (already done here for brand-scoping)
  - `const brand = resolveBrandForSession(profile); const meta = BRANDS[brand];`
  - return `{ title: { default: meta.name, template: \`%s · ${meta.name}\` }, icons: meta.icons, openGraph: { ...meta card }, other: { 'theme-color': meta.themeColor } }`
  - `robots` (noindex) inherited from root — do not re-enable indexing.
- **`src/app/login/page.tsx`** — inherits root ARQUD default. No change.

### Assets
- `public/brand/<brand>/` for each of `arqud | wewash | sparkling`:
  - `favicon.ico` (multi-res), `icon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180), `og.png` (1200×630 dark-luxury card).
- Generated from source logos by a one-off, committed script `scripts/gen-brand-icons.mjs` (uses `sharp`), or pre-generated and committed. Source logos copied into `assets/brand-src/` (WWC + Sparkling PNGs; ARQUD from Morne). Generated files are committed so the build has no asset-gen dependency.
- `public/robots.txt`: `User-agent: *` / `Disallow: /`.

### Behaviour — who sees what
| Who | Favicon / title / theme |
|---|---|
| Morne (admin) | ARQUD |
| We Wash staff (`info@wewash.co.za`) | We Wash |
| Sparkling staff (`admin@sparklingauto.co.za`) | Sparkling |
| Arno (owner) | Sparkling |
| Logged out (login, link previews) | ARQUD |

## Testing / verification
- Log in as each of the four accounts → tab favicon + title + theme-color match the expected brand; favicon updates on client-side navigation.
- View-source the login page and an authenticated page → `<meta name="robots" content="noindex, nofollow">` present; all icon `<link>`s resolve 200; OG/Twitter tags present with absolute URLs (via `metadataBase`).
- Share the login URL in WhatsApp/Slack → ARQUD card renders (title, description, image).
- No regression: `tsc --noEmit` clean, existing tests green, `next build` succeeds.

## Dependencies / open items
- **ARQUD logo** from Morne (SVG or hi-res transparent PNG).
- Confirm the found We Wash / Sparkling PNGs are transparent and ≥512px; if not, extract vector art from the `5.2 CI …` brand-guide PDFs.
- iCloud source files may be "online-only" placeholders → ensure downloaded locally before the build copies them.

## Out of scope (future)
- Branded subdomains (`wewash.` / `sparkling.`) + true per-brand link-preview cards (need Vercel + DNS).
- Public-page SEO / ranking for `/wewash`, `/sparkling`.
- Full white-label theming (colours/fonts) beyond icons, titles, and theme-color.

## Execution note
Per the standing directive, implementation will run **subagent-driven**: the plan (via `writing-plans`) will be split into independent tasks (brand-meta module + resolver; root metadata + robots; client `generateMetadata`; icon/OG asset generation) and dispatched to subagents, with the main thread integrating and verifying.
