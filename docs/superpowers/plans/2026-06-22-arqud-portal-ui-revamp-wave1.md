# ARQUD Portal UI Revamp — Wave 1 (Foundation + Client Portal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the ARQUD client portal in the approved "elevated dark-luxury" design system — a shared component library + the six client-facing pages — with zero changes to data or business logic.

**Architecture:** Refactor the Tailwind v4 `@theme` tokens in `globals.css`, build a small focused component library in `src/components/ui/`, replace the top-nav layout with a sidebar, then re-compose each client page from those components, wiring in the existing server-fetched data unchanged.

**Tech Stack:** Next.js (App Router, this repo's pinned/non-standard build), TypeScript, Tailwind CSS v4 (CSS-first, no config file), React Server + Client Components.

**Visual contract:** Approved mockups in `arqud-portal/.superpowers/brainstorm/1918-1782077925/content/` — `dashboard-hero.html` and `leads-page.html`. Match these. Design spec: `docs/superpowers/specs/2026-06-20-arqud-portal-ui-revamp-design.md`.

## Global Constraints

- **No logic/data changes.** Presentation layer only — keep every existing query, server action, route, and prop. Wrap existing data in new components.
- **Next.js is non-standard in this repo.** Before writing/altering any component, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices (per `arqud-portal/AGENTS.md`).
- **Tailwind v4 CSS-first.** All design tokens live in the `@theme` block of `src/app/globals.css`. There is NO `tailwind.config.ts` — do not create one.
- **Brand:** gold-on-black dark luxury. Keep the serif display font for headings/stat numbers, sans for body.
- **Ship path:** GitHub → Vercel (auto-deploy). Commit only; do not touch Vercel directly.
- **Do not commit iCloud junk** (`* 2.tsx`, `*(1).ts`, `globals 2.css`, etc.). Add `.superpowers/` to `.gitignore`.
- **Commit cadence:** one commit per task, conventional-commit messages.

---

## File Structure

**Tokens / base:**
- Modify: `src/app/globals.css` — `@theme` tokens + base utility classes

**New component library** (`src/components/ui/`):
- `Button.tsx` — primary / outline / ghost button
- `Pill.tsx` — brand / status / branch / neutral badge
- `Card.tsx` — gradient panel container with optional title/caption
- `KpiCard.tsx` — stat card with gold top-edge + trend
- `Field.tsx` — Input / Select / Textarea wrappers
- `Tabs.tsx` — pill tab group (controlled)
- `FilterPill.tsx` — single toggle filter pill
- `DataTable.tsx` — header + row primitives (`Table`, `Th`, `Tr`, `Td`, `Avatar`)
- `PageHeader.tsx` — serif title + count + actions slot
- `Sidebar.tsx` — client/admin variant nav with active state + user block
- `AreaChart.tsx` — lightweight SVG gold area chart
- `index.ts` — re-exports

**Layout:**
- Modify: `src/app/client/layout.tsx` — swap `TopNav` → `Sidebar` (client variant) + responsive shell

**Client pages (re-compose only):**
- Modify: `src/app/client/dashboard/page.tsx`
- Modify: `src/app/client/leads/page.tsx` + `src/app/client/leads/LeadsClient.tsx`
- Modify: `src/app/client/campaigns/page.tsx`
- Modify: `src/app/client/invoices/page.tsx`
- Modify: `src/app/client/reports/page.tsx`
- Modify: `src/app/client/documents/page.tsx`

**Housekeeping:**
- Modify: `.gitignore`
- Delete: iCloud duplicate files

**Verification per task** (this repo's "test cycle" — UI work, no unit-test harness assumed):
1. `npx tsc --noEmit` → expect no new errors
2. `npm run build` (or `npm run lint` if present) → expect success
3. `npm run dev` → open the affected page → eyeball against the mockup
4. Commit

> Confirm exact scripts in `package.json` before first run.

---

## Task 1: Design tokens + base utilities

**Files:**
- Modify: `src/app/globals.css` (the `@theme` block + base layer)

**Interfaces:**
- Produces: CSS custom properties consumed by every component as Tailwind color/radius/shadow utilities (e.g. `bg-arqud-panel`, `text-arqud-bone`, `rounded-card`, `border-arqud-line`).

- [ ] **Step 1: Read the Tailwind v4 + Next CSS guidance**

Read `node_modules/next/dist/docs/` for any CSS/app-router notes. Confirm Tailwind v4 `@theme` usage in the existing `globals.css`.

- [ ] **Step 2: Replace the `@theme` token block**

In `src/app/globals.css`, update the `@theme` block to:

```css
@theme {
  --color-arqud-bg: #07080b;
  --color-arqud-bg-2: #0a0c11;
  --color-arqud-panel: #10141d;
  --color-arqud-panel-2: #141925;
  --color-arqud-line: #1d2433;
  --color-arqud-line-2: #262f42;

  --color-arqud-gold: #c8a96e;
  --color-arqud-gold-soft: #e3cc97;
  --color-arqud-gold-dim: #9a8058;

  --color-arqud-bone: #f2ecdf;
  --color-arqud-bone-dim: #b9b6ac;
  --color-arqud-muted: #737a8c;

  --color-arqud-green: #5ad19a;   /* success / new */
  --color-arqud-amber: #f0c674;   /* contacted */
  --color-arqud-blue: #6fa0f0;    /* Sparkling brand */

  --font-display: var(--font-display-loaded), Georgia, serif;
  --font-body: var(--font-body-loaded), system-ui, sans-serif;

  --radius-card: 14px;
  --radius-control: 10px;

  --shadow-card: 0 10px 40px rgba(0,0,0,0.5);
  --shadow-gold: 0 8px 22px rgba(200,169,110,0.28);
}
```

- [ ] **Step 3: Update base layer**

Set `html, body` background to `var(--color-arqud-bg)`, body text to `var(--color-arqud-bone)`. Keep the grain overlay, smooth scroll, gold `:focus-visible` ring. Update headings to `font-family: var(--font-display); color: var(--color-arqud-gold);`. Add helper utilities:

```css
.panel-gradient { background: linear-gradient(160deg, var(--color-arqud-panel-2), color-mix(in srgb, var(--color-arqud-bg) 70%, transparent)); }
.gold-topedge::before { content:''; position:absolute; inset:0 0 auto 0; height:1px; background:linear-gradient(90deg,transparent,rgba(200,169,110,.5),transparent); }
.stat-number { font-family: var(--font-display); font-style: italic; color: var(--color-arqud-gold); line-height:1; }
```

- [ ] **Step 4: Verify**

Run: `npm run build` → Expected: success, no CSS errors.
Run: `npm run dev`, open any page → background/colors reflect the new tokens (corners still old until components land — that's fine).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor(ui): elevated dark-luxury design tokens"
```

---

## Task 2: Button + Pill primitives

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Pill.tsx`
- Create: `src/components/ui/index.ts`

**Interfaces:**
- Produces:
  - `Button({ variant?: "primary"|"outline"|"ghost", size?: "sm"|"md", asChild?: boolean, ...buttonProps })`
  - `Pill({ tone: "spark"|"wash"|"new"|"contacted"|"converted"|"branch"|"neutral", children })`

- [ ] **Step 1: Write `Button.tsx`**

```tsx
import { cn } from "@/lib/cn"; // create a tiny classnames helper if absent
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
};

const base = "inline-flex items-center gap-2 font-semibold tracking-wide rounded-control transition-all disabled:opacity-50";
const sizes = { sm: "text-[11px] px-3.5 py-2", md: "text-xs px-[18px] py-[11px]" };
const variants = {
  primary: "text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft shadow-[0_8px_22px_rgba(200,169,110,0.28)] hover:-translate-y-px",
  outline: "text-arqud-gold-soft border border-arqud-gold/40 hover:border-arqud-gold/70 hover:bg-arqud-gold/5",
  ghost:   "text-arqud-muted hover:text-arqud-bone",
};

export function Button({ variant = "primary", size = "md", className, ...props }: Props) {
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}
```

If `@/lib/cn` doesn't exist, create it:

```tsx
// src/lib/cn.ts
export function cn(...c: Array<string | false | null | undefined>) { return c.filter(Boolean).join(" "); }
```

- [ ] **Step 2: Write `Pill.tsx`**

```tsx
import { cn } from "@/lib/cn";

const tones: Record<string, string> = {
  spark:     "text-arqud-blue bg-arqud-blue/10 border-arqud-blue/30",
  wash:      "text-arqud-gold-soft bg-arqud-gold/10 border-arqud-gold/30",
  new:       "text-arqud-green bg-arqud-green/10 border-arqud-green/30",
  contacted: "text-arqud-amber bg-arqud-amber/10 border-arqud-amber/30",
  converted: "text-arqud-green bg-arqud-green/10 border-arqud-green/30",
  branch:    "text-arqud-bone-dim bg-white/5 border-arqud-line-2",
  neutral:   "text-arqud-muted bg-white/5 border-arqud-line-2",
};

export function Pill({ tone, children }: { tone: keyof typeof tones | string; children: React.ReactNode }) {
  return <span className={cn("inline-block text-[9.5px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border", tones[tone] ?? tones.neutral)}>{children}</span>;
}
```

- [ ] **Step 3: Export from `index.ts`**

```tsx
export { Button } from "./Button";
export { Pill } from "./Pill";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → Expected: no errors.
Temporarily render `<Button>Test</Button>` and each `<Pill>` on the dashboard, `npm run dev`, confirm gold gradient button + pills match mockup, then remove the temp render.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Pill.tsx src/components/ui/index.ts src/lib/cn.ts
git commit -m "feat(ui): Button and Pill primitives"
```

---

## Task 3: Card + KpiCard

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/KpiCard.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces:
  - `Card({ title?, caption?, className?, children })`
  - `KpiCard({ label, value, trend?: { dir: "up"|"down", text: string } })`

- [ ] **Step 1: Write `Card.tsx`**

```tsx
import { cn } from "@/lib/cn";
export function Card({ title, caption, className, children }: { title?: string; caption?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("panel-gradient border border-arqud-line rounded-card p-[18px] shadow-[var(--shadow-card)]", className)}>
      {title && <h4 className="font-display text-arqud-bone text-[15px] font-medium m-0">{title}</h4>}
      {caption && <p className="text-[11px] text-arqud-muted mb-3.5 mt-0.5">{caption}</p>}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write `KpiCard.tsx`**

```tsx
import { cn } from "@/lib/cn";
export function KpiCard({ label, value, trend }: { label: string; value: string; trend?: { dir: "up" | "down"; text: string } }) {
  return (
    <div className="relative overflow-hidden panel-gradient border border-arqud-line rounded-card p-[18px] gold-topedge">
      <div className="text-[10px] tracking-[0.14em] uppercase text-arqud-muted">{label}</div>
      <div className="stat-number text-[34px] my-3">{value}</div>
      {trend && <div className={cn("text-[11px] inline-flex items-center gap-1", trend.dir === "up" ? "text-arqud-green" : "text-arqud-amber")}>{trend.dir === "up" ? "▲" : "▼"} {trend.text}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Export, verify, commit**

Add both to `index.ts`. Run `npx tsc --noEmit` (no errors). Commit:

```bash
git add src/components/ui/Card.tsx src/components/ui/KpiCard.tsx src/components/ui/index.ts
git commit -m "feat(ui): Card and KpiCard"
```

---

## Task 4: Field (Input / Select / Textarea)

**Files:**
- Create: `src/components/ui/Field.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces: `Input`, `Select`, `Textarea` — thin styled wrappers over native elements, forwarding all native props + `className`.

- [ ] **Step 1: Write `Field.tsx`**

```tsx
import { cn } from "@/lib/cn";
const ctl = "bg-arqud-panel border border-arqud-line-2 rounded-control text-arqud-bone text-sm px-3.5 py-2.5 placeholder:text-arqud-muted focus:outline-none focus:ring-1 focus:ring-arqud-gold/40 transition";
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={cn(ctl, p.className)} />; }
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} className={cn(ctl, p.className)} />; }
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={cn(ctl, p.className)} />; }
```

- [ ] **Step 2: Export, verify (`npx tsc --noEmit`), commit**

```bash
git add src/components/ui/Field.tsx src/components/ui/index.ts
git commit -m "feat(ui): Field inputs (Input/Select/Textarea)"
```

---

## Task 5: Tabs + FilterPill

**Files:**
- Create: `src/components/ui/Tabs.tsx`
- Create: `src/components/ui/FilterPill.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces:
  - `Tabs({ tabs: string[], value: string, onChange: (t: string) => void })`
  - `FilterPill({ active: boolean, onClick: () => void, children })`

- [ ] **Step 1: Write `Tabs.tsx`** (client component)

```tsx
"use client";
import { cn } from "@/lib/cn";
export function Tabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={cn("text-xs px-[18px] py-2.5 rounded-full border transition",
            value === t ? "text-arqud-bg bg-gradient-to-r from-arqud-gold to-arqud-gold-soft font-bold border-transparent" : "text-arqud-muted border-arqud-line-2 hover:text-arqud-bone")}>
          {t}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `FilterPill.tsx`** (client component)

```tsx
"use client";
import { cn } from "@/lib/cn";
export function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("text-[10.5px] rounded-full px-3 py-1.5 border transition",
        active ? "text-arqud-gold-soft border-arqud-gold/45 bg-arqud-gold/10" : "text-arqud-bone-dim border-arqud-line-2 hover:text-arqud-bone")}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Export, verify, commit**

```bash
git add src/components/ui/Tabs.tsx src/components/ui/FilterPill.tsx src/components/ui/index.ts
git commit -m "feat(ui): Tabs and FilterPill"
```

---

## Task 6: DataTable primitives

**Files:**
- Create: `src/components/ui/DataTable.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces: `Table`, `THead`, `Tr`, `Th`, `Td`, `Avatar({ initials })` — composable table primitives styled per mockup (uppercase muted header, top-bordered hover rows).

- [ ] **Step 1: Write `DataTable.tsx`**

```tsx
import { cn } from "@/lib/cn";
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("panel-gradient border border-arqud-line rounded-card px-4 py-1.5", className)}>{children}</div>;
}
export function Tr({ children, header, className }: { children: React.ReactNode; header?: boolean; className?: string }) {
  return <div className={cn("flex items-center gap-2.5 py-3", header ? "text-[9.5px] tracking-[0.13em] uppercase text-arqud-muted" : "border-t border-arqud-line/60 text-[12.5px] text-arqud-bone-dim hover:bg-arqud-gold/[0.025]", className)}>{children}</div>;
}
export function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("min-w-0", className)}>{children}</div>; }
export function Avatar({ initials }: { initials: string }) {
  return <span className="w-[26px] h-[26px] rounded-full bg-arqud-line text-arqud-bone-dim flex items-center justify-center text-[10px] font-semibold shrink-0">{initials}</span>;
}
```

> Note: rows use flex + per-column flex-basis classes set by the consuming page (column widths differ per page). Header and body rows must use the same width classes.

- [ ] **Step 2: Export, verify (`npx tsc --noEmit`), commit**

```bash
git add src/components/ui/DataTable.tsx src/components/ui/index.ts
git commit -m "feat(ui): DataTable primitives"
```

---

## Task 7: Sidebar + client layout swap

**Files:**
- Create: `src/components/ui/Sidebar.tsx`
- Modify: `src/app/client/layout.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: `verifySession`, `getClientCompany` (already used in `client/layout.tsx`) — unchanged.
- Produces: `Sidebar({ variant: "client"|"admin", brandName, user: { name, label } })` — renders nav + user block; highlights active route via `usePathname`.

- [ ] **Step 1: Read current layout + nav**

Read `src/app/client/layout.tsx` and `src/components/TopNav.tsx` to reuse the existing `CLIENT_NAV` items (Dashboard, Leads, Campaigns, Invoices, Reports, Documents) and session props. Do not change session logic.

- [ ] **Step 2: Write `Sidebar.tsx`** (client component)

Build per `dashboard-hero.html`: 228px column, serif `ARQUD` wordmark, nav items (icon box + label), active item = gold gradient fill with dark text, user block pinned bottom with `Avatar`. Use `usePathname()` and `pathname.startsWith(href)` for active state. Include the same `CLIENT_NAV` / `ADMIN_NAV` arrays (move them here from `TopNav.tsx`). Add a mobile drawer toggle (hidden ≥`md`).

- [ ] **Step 3: Swap the layout**

In `src/app/client/layout.tsx`, replace `<TopNav variant="client" .../>` with a flex shell: `<Sidebar variant="client" .../>` + `<main className="flex-1 min-w-0">{children}</main>`. Keep `verifySession`/`getClientCompany` calls identical.

- [ ] **Step 4: Verify**

Run: `npm run dev`, log into a client portal route → sidebar shows all 6 items, active item highlighted, **Leads link present**, content renders right of the sidebar, mobile drawer toggles.
Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Sidebar.tsx src/app/client/layout.tsx src/components/ui/index.ts
git commit -m "feat(ui): sidebar nav + client layout shell"
```

---

## Task 8: PageHeader + AreaChart

**Files:**
- Create: `src/components/ui/PageHeader.tsx`
- Create: `src/components/ui/AreaChart.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces:
  - `PageHeader({ title, count?: string, children? })` — serif title + optional count + right-aligned actions slot.
  - `AreaChart({ points: number[], className? })` — SVG gold area chart, auto-scales `points` to the viewbox.

- [ ] **Step 1: Write `PageHeader.tsx`**

```tsx
export function PageHeader({ title, count, children }: { title: string; count?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h1 className="font-display text-arqud-bone text-[26px] m-0">{title}{count && <small className="text-arqud-muted text-xs font-body ml-2.5">{count}</small>}</h1>
      <div className="flex gap-2.5 items-center">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Write `AreaChart.tsx`**

Generate an SVG `path` from `points` (normalize to a 460×150 viewBox), gold stroke `#c8a96e` width 2.5, area fill via a `linearGradient` from `rgba(200,169,110,.45)` to transparent, end-point dot. Match `dashboard-hero.html`.

- [ ] **Step 3: Export, verify (`npx tsc --noEmit`), commit**

```bash
git add src/components/ui/PageHeader.tsx src/components/ui/AreaChart.tsx src/components/ui/index.ts
git commit -m "feat(ui): PageHeader and AreaChart"
```

---

## Task 9: Dashboard page

**Files:**
- Modify: `src/app/client/dashboard/page.tsx`

**Interfaces:**
- Consumes: existing dashboard data queries (keep as-is); `KpiCard`, `Card`, `AreaChart`, `Pill`, `PageHeader`, `Button` from `@/components/ui`.

- [ ] **Step 1: Read the current page** to learn the data already fetched (`src/app/client/dashboard/page.tsx`). Reuse those values — do not add/remove queries.

- [ ] **Step 2: Re-compose** the markup per `dashboard-hero.html`: greeting header (`PageHeader` or serif greeting) + `+ New Lead` `Button`; a 4-up `KpiCard` grid (Total Leads / Contacted / Converted / Cost-per-Lead) fed by existing data (use real values where available, omit cards with no backing data rather than fabricate); a `Card` with `AreaChart` ("Leads this month"); a `Card` "Latest leads" list with `Avatar` + brand `Pill` + status `Pill`. Use `grid` + the new tokens.

- [ ] **Step 3: Verify** — `npm run dev` → dashboard matches mockup, all data correct; `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/client/dashboard/page.tsx
git commit -m "feat(ui): redesign client dashboard"
```

---

## Task 10: Leads page

**Files:**
- Modify: `src/app/client/leads/page.tsx`
- Modify: `src/app/client/leads/LeadsClient.tsx`

**Interfaces:**
- Consumes: existing leads query + `getBrand()` logic in `LeadsClient.tsx` (keep), plus `PageHeader`, `Tabs`, `FilterPill`, `Card`, `Table/Tr/Td/Avatar`, `Pill`, `Button`.

- [ ] **Step 1: Read** `src/app/client/leads/page.tsx` and `LeadsClient.tsx`. Preserve all data, the `getBrand()` brand-derivation, the brand/branch filter state, and the WhatsApp action.

- [ ] **Step 2: Re-compose `LeadsClient.tsx`** per `leads-page.html`: `PageHeader` ("Leads", count) + Export CSV `Button(outline)`; brand `Tabs` (All/Sparkling/We Wash) bound to existing brand filter state; a **per-special performance card row** — derive cards by grouping leads on `meta_campaign_name` (count + conversion %), styled like `Card`/`KpiCard`; branch `FilterPill` row bound to existing branch filter; the leads `Table` with columns Date / Name(`Avatar`) / Branch(`Pill branch`) / Brand(`Pill spark|wash`) / Status(`Pill`) / WhatsApp action. Keep identical filtering behavior.

- [ ] **Step 3: Verify** — `npm run dev` → tabs filter, branch pills filter, per-special cards compute correctly, WhatsApp link works; `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/client/leads/page.tsx src/app/client/leads/LeadsClient.tsx
git commit -m "feat(ui): redesign client leads CRM"
```

---

## Task 11: Campaigns page

**Files:**
- Modify: `src/app/client/campaigns/page.tsx`

- [ ] **Step 1: Read** the current page (note the "Live data coming soon" empty state + KPI placeholders).

- [ ] **Step 2: Re-compose** — `PageHeader` ("Campaigns"); restyle the empty state inside a `Card` (serif heading, muted copy) and the KPI row as `KpiCard`s showing `—` when no data. When campaign data exists later, the same `KpiCard`/`Card` grid renders it — no placeholder logic beyond what already exists.

- [ ] **Step 3: Verify (`npm run dev` + `npx tsc --noEmit`), commit**

```bash
git add src/app/client/campaigns/page.tsx
git commit -m "feat(ui): redesign client campaigns"
```

---

## Task 12: Invoices page

**Files:**
- Modify: `src/app/client/invoices/page.tsx`

- [ ] **Step 1: Read** the current page to learn the invoice fields/query (keep query).

- [ ] **Step 2: Re-compose** — `PageHeader` ("Invoices", count); a `Table` of invoices: Invoice # / Issue date / Due date / Amount / Status(`Pill` paid=converted-green, pending=contacted-amber, overdue=red-tone neutral variant) / Download action (keep existing PDF link/handler).

- [ ] **Step 3: Verify, commit**

```bash
git add src/app/client/invoices/page.tsx
git commit -m "feat(ui): redesign client invoices"
```

---

## Task 13: Reports page

**Files:**
- Modify: `src/app/client/reports/page.tsx`

- [ ] **Step 1: Read** current page + data.
- [ ] **Step 2: Re-compose** — `PageHeader` ("Reports"); render reports as a `Card` grid or `Table` (match data shape) with name/date/download. Keep existing empty state, restyled.
- [ ] **Step 3: Verify, commit**

```bash
git add src/app/client/reports/page.tsx
git commit -m "feat(ui): redesign client reports"
```

---

## Task 14: Documents page

**Files:**
- Modify: `src/app/client/documents/page.tsx`

- [ ] **Step 1: Read** current page (it already groups by category: contracts, brand_assets, ad_creatives, reports, other).
- [ ] **Step 2: Re-compose** — `PageHeader` ("Documents"); per-category sections with a `Card` grid of document tiles (icon + name + download). Keep the existing category order + empty state, restyled.
- [ ] **Step 3: Verify, commit**

```bash
git add src/app/client/documents/page.tsx
git commit -m "feat(ui): redesign client documents"
```

---

## Task 15: Housekeeping — repo cleanup + gitignore

**Files:**
- Modify: `.gitignore`
- Delete: iCloud duplicate files

- [ ] **Step 1: Add to `.gitignore`**

Append:
```
.superpowers/
```

- [ ] **Step 2: List the iCloud junk** (do not delete blindly — confirm each is a duplicate, not a real file):

Run: `git status --short` and identify untracked/duplicate artifacts like `* 2.tsx`, `*(1).ts/tsx`, `globals 2.css`, `globals(1).css`, `page 2.tsx`. Cross-check each has a real non-suffixed counterpart.

- [ ] **Step 3: Remove confirmed duplicates**

Delete only the confirmed duplicate files (e.g. `rm "src/components/TopNav 2.tsx"` …). Leave `src/middleware.ts` and any real files intact.

- [ ] **Step 4: Verify build still green**

Run: `npm run build` → Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: ignore .superpowers, remove iCloud duplicate files"
```

---

## Task 16: Full verification + ship

- [ ] **Step 1: Typecheck + build** — `npx tsc --noEmit` and `npm run build` both clean.
- [ ] **Step 2: Visual walkthrough** — `npm run dev`, click through all 6 client pages: sidebar nav works, every page uses the new components, buttons obviously clickable, no broken data, mobile drawer works.
- [ ] **Step 3: Regression check** — confirm every pre-existing action still works (WhatsApp links, CSV export, invoice download, filters).
- [ ] **Step 4: Push** (only on Morne's go) — `git push` to the branch; Vercel auto-deploys a preview. Review the preview URL before promoting.

---

## Out of scope (future plans)
- **Wave 2:** admin layout + admin pages (Overview, Clients, Finances, Files, Settings) + Login restyle — separate plan.
- No backend, data-model, or Meta/leads-pipeline changes.
