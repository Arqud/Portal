# ARQUD Portal — Phase 0: Theme System + Command Center Home — Design

> Created 29 June 2026. First slice of the "million-dollar daily driver" upgrade.
> North star: a personal **Command Center** that runs the whole agency on one screen and
> replaces tools Morne pays for. This spec covers **Phase 0 only**.

## Background & Goal

The portal already does clients, CRM/leads, invoices, quotes, finances/transactions,
campaigns, reports, files — on a dark-luxury (gold-on-black) theme. Morne wants:

1. A **total visual upgrade** to a premium light/white look (tested on his admin side first),
   with the existing dark theme kept and switchable.
2. The admin landing to become a **Command Center** — a personal dashboard surfacing
   revenue, money owed, today's agenda, sales pipeline, campaign leads, cashflow, live
   leads, and clients — loaded with his real business data.

**Phase 0 delivers the foundation + the wow:** the theme engine and the Command Center
Home built on data that already exists. Tiles that need future phases (Today/Tasks,
Calendar, Proposals) appear as elegant teasers and light up in Phases 1-3.

## North Star (reference, not all built in Phase 0)

Approved mockup: `Desktop/ARQUD Command Center.html`. Roadmap after Phase 0:
Phase 1 Tasks & Projects · Phase 2 Scheduling & Time · Phase 3 Proposals & e-Sign ·
Phase 4 Money & Expenses. Each is its own spec → plan → build.

## Scope (Phase 0)

**In scope**
- Theme engine: light + dark, switchable, persisted, no flash-of-wrong-theme.
- Light ("white luxury") palette + design-language polish (spacing, shadows, type, tables, states).
- Theme toggle (sun/moon) in the sidebar; **default dark for everyone** so clients/Arno are untouched.
- Command Center Home at the admin landing, composed from existing tables only.
- Sidebar IA refresh: existing destinations + "soon" entries for Tasks / Calendar / Proposals (disabled).
- Apply the theme cleanly across **all** admin pages and the client portal (client defaults dark).

**Out of scope (later phases)**
- Any Tasks, Calendar, Proposals, Expenses **logic or storage** (those tiles are teasers in Phase 0).
- No changes to existing business logic, money math, queries, routes, or data model
  (other than one additive `profiles.theme` column).

## Architecture

### 1. Theme engine (semantic CSS variables)
- `globals.css` currently hard-codes colors in the Tailwind v4 `@theme` block. Convert each
  color token to reference a CSS custom property, e.g. `--color-arqud-bg: var(--bg)`.
- Define the actual values twice:
  - `:root` / `[data-theme="dark"]` → the current dark values (unchanged look).
  - `[data-theme="light"]` → the new light palette (below).
- Because every component already uses the same utility names (`bg-arqud-bg`,
  `text-arqud-bone`, `border-arqud-line`, etc.), the whole app re-skins by swapping
  `data-theme` — no per-component rewrites for color.
- **Semantic aliases:** introduce intent-named tokens so light/dark both read correctly:
  `surface` (page bg), `panel` (cards), `panel-2`, `line`, `ink` (primary text),
  `body-text`, `muted`, `gold`, `gold-soft`, `gold-bg`, plus data colors `pos` (green),
  `info` (blue), `warn`/`neg` (terracotta). Existing tokens (`arqud-bg`, `arqud-bone`,
  `arqud-muted`, …) map onto these so current classes keep working.

### 2. Light palette (values)
```
surface  #F5F4F0   panel #FFFFFF   panel-2 #FBFAF7
line     #ECE8E0   line-2 #F2EFE9
ink      #16140F   body  #56524A   muted #9A948A
gold     #B0883F   gold-soft #CBA968   gold-bg #F4ECD9
pos      #3E9D73 (bg #E7F4ED)   info #4F7BC4 (bg #E9EFFA)   warn #C9743E (bg #FBEDE3)
shadow   0 1px 2px rgba(20,16,10,.04), 0 12px 34px rgba(20,16,10,.06)
```
Dark theme keeps existing values. Document-style surfaces that are intentionally light
regardless of theme (invoice/quote PDF preview, the white invoice document) are left as-is.

### 3. Theme application & persistence (no flash)
- **Source of truth for SSR:** a `theme` cookie read in the root `layout.tsx` (server
  component) → renders `<html data-theme={cookieTheme ?? "dark"}>`. No client flash.
- **Toggle component** (`ThemeToggle`, client): on click, sets `document.documentElement
  .dataset.theme`, writes the `theme` cookie + `localStorage`, and calls a server action
  `setTheme(theme)` that saves to `profiles.theme` for cross-device default.
- **Default = dark.** Only a user who toggles gets light. Clients/Arno stay dark untouched.
- Additive migration: `alter table profiles add column theme text default 'dark'`.
  Layout prefers cookie (instant), falls back to profile, then `'dark'`.

### 4. Command Center Home
- Route: the Command Center **replaces the content of the existing `/admin/overview`
  page** (same route — no new paths, no broken links). The sidebar's first item is
  renamed **Home** and points to `/admin/overview`.
- **Server component** fetches existing tables in parallel (clients, invoices, quotes,
  campaigns, leads, transactions) — same admin Supabase client already in use.
- Tiles and their data source:
  | Tile | Source (existing) | Phase 0 state |
  |---|---|---|
  | KPI strip (Revenue, Outstanding, Leads, Clients, Net Profit) | invoices, leads, transactions | live |
  | Revenue chart | invoices/transactions by month | live (reuse `AreaChart`) |
  | Cashflow / margin | transactions (income vs expense) | live |
  | Campaign Leads | campaigns | live |
  | Live Leads | leads | live |
  | Clients | clients (+ outstanding from invoices) | live |
  | Sales Pipeline | quotes (draft/sent/accepted ≈ pipeline) | live (from quotes) |
  | Today / Agenda | — | **teaser** (Phase 1/2) |
- Sparklines/donut/progress are small presentational SVG components (no data libs).

### 5. Component library additions (`src/components/ui/`)
- `ThemeToggle.tsx` — sun/moon switch (client).
- `Sparkline.tsx`, `Donut.tsx`, `ProgressTrack.tsx` — tiny SVG presentational pieces.
- `StatCard.tsx` — KPI with label, value, trend, optional sparkline (light/dark aware).
- `TeaserTile.tsx` — elegant "Coming in Phase X" placeholder for not-yet-built tiles.
- Reuse existing `AreaChart`, `Card`, `Pill`, `Table`, `Avatar`, `Sidebar`, `PageHeader`.
- Each new piece: one clear purpose, theme-aware via tokens, independently understandable.

### 6. Sidebar IA
- `Sidebar` gains grouped sections: **Workspace** (Home, Clients, Leads, Campaigns) and
  **Run the business** (Tasks, Calendar, Proposals, Finances, Files). Tasks/Calendar/
  Proposals render as disabled "Soon" items in Phase 0. Add the `ThemeToggle` near the user block.

## Error / edge handling
- No cookie / no profile theme → default `dark` (clients unaffected).
- Empty data (no transactions/quotes) → tiles show graceful empty states, never crash.
- `setTheme` server action failure → DOM + cookie still update (optimistic); profile sync best-effort.
- Server components only for data; the single client island is the toggle (avoids RSC event-handler pitfalls).

## Testing / verification
- `npx tsc --noEmit` clean; `npm run build` clean.
- Manually verify **every admin page** in light AND dark; confirm client portal still defaults dark.
- Confirm no existing query, action, route, or money calculation changed.
- Ship to `main` (Vercel) for Morne to flip the toggle and live in it on his admin.

## File structure
- Modify: `src/app/globals.css` (token engine + light palette), `src/app/layout.tsx`
  (SSR `data-theme`), `src/components/ui/Sidebar.tsx` (IA + toggle), `src/components/ui/index.ts`.
- Add: `src/components/ui/ThemeToggle.tsx`, `Sparkline.tsx`, `Donut.tsx`, `ProgressTrack.tsx`,
  `StatCard.tsx`, `TeaserTile.tsx`; `src/app/admin/(command center) page` + its tile components;
  `src/app/actions/theme.ts` (setTheme server action); a Supabase migration adding `profiles.theme`.
- Touch as needed: admin pages for any dark-baked color cleanups surfaced during the theme audit.

## Out of scope (explicit)
No new business features, no external integrations, no client-portal redesign beyond inheriting
the theme. Those are Phases 1-4.
