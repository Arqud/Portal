# ARQUD Portal — UI Revamp Design Spec

> Date: 2026-06-20 · Author: Morne + Claude
> Scope: visual/UI revamp of the ARQUD client portal (`arqud-portal`, Next.js + Tailwind v4).
> Approved direction: **elevate the existing dark-luxury (gold-on-black) identity** — modernize execution, do NOT change brand or rebuild from zero.
> Approved mockups live in `arqud-portal/.superpowers/brainstorm/1918-1782077925/content/` (dashboard-hero.html, leads-page.html).

---

## 1. Goal & problem

The portal is functional and on-brand but the *execution* reads dated and messy:
- Buttons don't look clickable (tiny 11px uppercase text links; proper button styles barely used)
- Low contrast + tiny letter-spaced text → hard to scan
- Razor-sharp 2px corners + thin borders → cold/dated
- Inconsistent — several pages never received styling

**This is a refinement + consistency project, not a rebuild.** Keep gold-on-black; execute it like a modern premium product (Linear/Vercel-grade dark dashboards).

**Explicitly out of scope:** no backend/data/logic changes, no new features, no change to the Meta/leads pipeline. UI layer only.

---

## 2. Design principles

1. **Premium, not busy** — generous spacing, calm hierarchy, restrained gold.
2. **Obvious affordances** — buttons look like buttons; clickable things look clickable.
3. **Consistency** — one component library, used everywhere. No bespoke per-page styling.
4. **Brand-true** — serif display headings + gold accents stay; refine, don't replace.

---

## 3. Design tokens (refactor `src/app/globals.css` `@theme`)

**Colors (keep palette, extend):**
- Backgrounds: `--bg #07080b`, `--bg-2 #0a0c11`
- Panels: `--panel #10141d`, `--panel-2 #141925` (cards use a 160° gradient between them)
- Lines: `--line #1d2433`, `--line-2 #262f42`
- Gold: `--gold #c8a96e`, `--gold-soft #e3cc97`, `--gold-dim #9a8058`; primary button = `linear-gradient(90deg, gold, gold-soft)`
- Text: `--bone #f2ecdf`, `--bone-dim #b9b6ac`, `--muted #737a8c`
- Semantic: success/new `--green #5ad19a`; contacted `--amber #f0c674`; Sparkling brand `--blue #6fa0f0`; We Wash brand = gold

**Radius:** cards `14px`, buttons/inputs `10px`, pills `999px` (up from the current flat 2px).

**Shadows / depth:** card `0 10px 40px rgba(0,0,0,.5)`; primary button `0 8px 22px rgba(200,169,110,.28)`; KPI cards get a gold top-edge: `::before` 1px `linear-gradient(90deg,transparent,rgba(200,169,110,.5),transparent)`.

**Typography:** display = existing serif (Georgia fallback) for headings + big numbers (serif italic gold for KPI/stat numbers); body = Inter/system sans. Raise body contrast to `--bone`/`--bone-dim` (retire the very-low-contrast greys for primary text).

**Spacing:** page padding ~26–28px; card padding 14–18px; grid gaps 12–14px.

Retain: grain overlay, smooth scroll, gold focus ring, skeleton loaders (restyle to new tokens).

---

## 4. Component library (build once in `src/components/ui/`)

Each is a small, focused React component using the tokens above:

- **Button** — variants: `primary` (gold gradient, dark text, depth), `outline` (gold border + gold text), `ghost` (muted→bone on hover); sizes `sm`/`md`; optional leading icon.
- **Sidebar** (replaces top-nav `TopNav`) — 228px; serif ARQUD wordmark; nav items with icon + label; **active = gold gradient fill, dark text, soft shadow**; user block pinned bottom; collapsible/drawer on mobile. Variants `client` and `admin` (same component, different nav items).
- **PageHeader** — serif title + optional count + right-aligned actions (search/buttons).
- **KpiCard** — glass gradient panel, gold top-edge, uppercase muted label, serif-italic gold number, optional trend (green ▲ / amber ▼).
- **Card** — gradient panel, serif heading + caption, body slot.
- **DataTable** — uppercase muted header row, top-bordered rows, hover tint, avatar "dot" (initials), responsive collapse.
- **Pill / Badge** — `brand` (Sparkling=blue, We Wash=gold), `status` (new=green, contacted=amber, converted=gold), `branch` (neutral).
- **Tabs** — pill tabs, active = gold gradient (used for brand tabs).
- **FilterPill** — outline, active = gold-tinted (used for branch filters).
- **Input / Select / Textarea** — panel bg, `--line-2` border, radius 10, gold focus ring.
- **Chart** — lightweight gold area/line chart style (SVG) for "leads over time".

---

## 5. Navigation

- Replace the current top `TopNav` with the **Sidebar** for **both** client and admin layouts (`src/app/client/layout.tsx`, `src/app/admin/layout.tsx`).
- Client nav: Dashboard · Leads · Campaigns · Invoices · Reports · Documents.
- Admin nav: Overview · Clients · Campaigns · Finances · Files · Settings.
- Ensure the **Leads** link is present (it exists in code but never deployed).
- Mobile: sidebar collapses to a drawer toggled by a header button.

---

## 6. Page-by-page application

**Wave 1 — Client portal (priority):**
- **Dashboard** — greeting; KPI row (Total Leads / Contacted / Converted / Cost-per-Lead); "Leads this month" area chart; "Latest leads" panel. (per dashboard-hero.html)
- **Leads** — title + count; Export CSV; brand tabs (All/Sparkling/We Wash); **per-special performance cards** (live leads + conversion per campaign name); branch filter pills; DataTable with branch/brand/status pills + WhatsApp action. (per leads-page.html)
- **Campaigns** — restyle the "coming soon" empty state; when data exists, campaign cards + KPI row.
- **Invoices** — DataTable of invoices with status pills (paid/pending/overdue) + download-PDF action.
- **Reports** — list/cards of shared reports.
- **Documents** — category-grouped document grid.

**Wave 2 — Admin:**
- Overview, Clients (list + detail incl. Leads tab), Finances (invoices/quotes/transactions tabs), Files, Settings.
- **Login** page restyle to match.

Every page consumes only the shared components — no page-local styling.

---

## 7. Technical approach

1. Refactor `globals.css` `@theme` tokens + base utilities to the new system.
2. Build the `src/components/ui/` library (section 4).
3. Swap layouts to the Sidebar; roll components across pages, Wave 1 then Wave 2.
4. No data/logic changes — wrap existing data with new presentation only.
5. **Next.js:** this repo's Next is non-standard — read `node_modules/next/dist/docs/` before writing components (per `arqud-portal/AGENTS.md`). Tailwind v4 CSS-first (no `tailwind.config.ts`).
6. Ship via the normal GitHub → Vercel flow.

---

## 8. Housekeeping (do before committing)

- Remove the iCloud sync "junk" duplicate files polluting the repo (e.g. `*\ 2.tsx`, `*(1).ts`, `globals 2.css`) — do not commit them.
- Add `.superpowers/` to `arqud-portal/.gitignore` (visual-companion artifacts).

---

## 9. Success criteria

- Every Wave-1 client page uses the shared component system; zero bespoke per-page styles.
- Buttons are unmistakably clickable; contrast and spacing pass a quick visual review.
- Consistent sidebar navigation across client + admin.
- No functional regressions (all existing data, links, and actions still work).
- Morne's gut check: "looks premium, easy to navigate" — the original complaint resolved.

---

## 10. Rollout order (for the build plan)

1. Tokens (`globals.css`) + component library
2. Sidebar + client layout
3. Client pages: Dashboard → Leads → Campaigns → Invoices → Reports → Documents
4. Admin layout + admin pages + Login
5. Housekeeping cleanup + verify + ship
