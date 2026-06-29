# ARQUD Portal Phase 0 — Theme System + Command Center Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a switchable light/dark theme (default dark) and a premium "Command Center" admin home built from existing data, as the foundation for the daily-driver roadmap.

**Architecture:** Tailwind v4 color tokens become theme-aware CSS variables overridden under `[data-theme="light"]`; the theme is applied server-side from a cookie (no flash) and toggled by a single client island that persists to a cookie + `profiles.theme`. The admin landing (`/admin/overview`) is recomposed into a Command Center of tiles fed by pure, unit-tested aggregation helpers over the existing Supabase tables.

**Tech Stack:** Next 16 (App Router, RSC), React 19, Tailwind v4 (CSS-first, no config), Supabase (admin client), vitest + @testing-library, @react-pdf (untouched), Vercel.

## Global Constraints
- Next 16.2.6 / React 19.2.4 / Tailwind v4 CSS-first — **no `tailwind.config.ts`**; tokens live in `src/app/globals.css` `@theme`.
- **Default theme = dark.** Only a user who toggles gets light. Clients/Arno stay dark untouched.
- **No business-logic, money-math, query, route, or data-model changes** — the ONLY schema change is an additive `profiles.theme text default 'dark'` column.
- Data fetching in **server components**; the only client island added is `ThemeToggle` (avoid RSC event-handler crashes).
- Reuse `@/components/ui`; new files have one clear responsibility; theme-aware via tokens only (no hard-coded chrome colors).
- Verify every task with `npx tsc --noEmit` + `npm run build`; pure helpers also get `npm test`. Commit per task. Ship to `main`.
- Light palette (verbatim): surface `#F5F4F0`, panel `#FFFFFF`, panel-2 `#FBFAF7`, line `#ECE8E0`, line-2 `#F2EFE9`, ink `#16140F`, body `#56524A`, muted `#9A948A`, gold `#B0883F`, gold-soft `#CBA968`, gold-bg `#F4ECD9`, pos `#3E9D73`, info `#4F7BC4`, warn `#C9743E`. Dark values unchanged.

---

### Task 1: Theme token engine (light overrides)

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: a `[data-theme="light"]` CSS block overriding the `--color-arqud-*` custom properties; dark remains the default when no/`dark` attribute is set. Utility class names are unchanged, so all components re-skin automatically.

- [ ] **Step 1:** Read `src/app/globals.css`. The `@theme` block defines `--color-arqud-*` for dark. Tailwind emits these as CSS variables on `:root`, so they can be overridden by a later selector.

- [ ] **Step 2:** Append a light-theme override block at the end of `globals.css` (after the existing rules):

```css
/* ---- Light theme overrides (dark is the default) ---- */
[data-theme="light"] {
  --color-arqud-bg: #F5F4F0;
  --color-arqud-bg-2: #FBFAF7;
  --color-arqud-panel: #FFFFFF;
  --color-arqud-panel-2: #FBFAF7;
  --color-arqud-line: #ECE8E0;
  --color-arqud-line-2: #F2EFE9;

  --color-arqud-gold: #B0883F;
  --color-arqud-gold-soft: #CBA968;
  --color-arqud-gold-dim: #9A7B3F;

  --color-arqud-bone: #16140F;       /* primary text -> ink */
  --color-arqud-bone-dim: #56524A;   /* secondary text */
  --color-arqud-muted: #9A948A;

  --color-arqud-green: #3E9D73;
  --color-arqud-amber: #C9743E;
  --color-arqud-blue: #4F7BC4;

  /* legacy aliases used by older files */
  --color-arqud-black: #FFFFFF;
  --color-arqud-night: #F5F4F0;
  --color-arqud-ink: #FBFAF7;
  --color-arqud-gold-glow: rgba(176,136,63,0.10);

  --shadow-card: 0 1px 2px rgba(20,16,10,.04), 0 12px 34px rgba(20,16,10,.06);
}
[data-theme="light"] body { background-color: var(--color-arqud-bg); color: var(--color-arqud-bone); }
[data-theme="light"] body::before { opacity: 0; } /* drop the dark film-grain overlay on light */
```

- [ ] **Step 3:** Verify dark is untouched: `npm run build` → success. Then `npm run dev`, load `/login` (no theme attr yet) — must look exactly as before (dark).

Run: `(cd . && npm run build) 2>&1 | tail -4`
Expected: build success, exit 0.

- [ ] **Step 4:** Commit.

```bash
git add src/app/globals.css
git commit -m "feat(theme): light-theme token overrides (dark stays default)"
```

---

### Task 2: `profiles.theme` column + `setTheme` server action

**Files:**
- Create: `supabase/migrations/20260629_add_profiles_theme.sql`
- Create: `src/app/actions/theme.ts`

**Interfaces:**
- Produces: `setTheme(theme: "light" | "dark"): Promise<void>` — sets the `theme` cookie and best-effort updates `profiles.theme` for the signed-in user.

- [ ] **Step 1:** Create the migration file:

```sql
-- 20260629_add_profiles_theme.sql
alter table public.profiles
  add column if not exists theme text not null default 'dark';
```

- [ ] **Step 2:** Apply it to the live DB. If the Supabase CLI is linked, run `supabase db push`; otherwise run the SQL in the Supabase dashboard SQL editor. Confirm the column exists (Table editor → profiles → `theme`).

- [ ] **Step 3:** Create `src/app/actions/theme.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function setTheme(theme: "light" | "dark") {
  const safe = theme === "light" ? "light" : "dark";
  const jar = await cookies();
  jar.set("theme", safe, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  // Best-effort cross-device persistence; never throw to the client.
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createSupabaseAdminClient();
      await admin.from("profiles").update({ theme: safe }).eq("id", user.id);
    }
  } catch {
    /* cookie already set; ignore persistence failure */
  }
}
```

- [ ] **Step 4:** Verify: `npx tsc --noEmit` → no errors.

- [ ] **Step 5:** Commit.

```bash
git add supabase/migrations/20260629_add_profiles_theme.sql src/app/actions/theme.ts
git commit -m "feat(theme): profiles.theme column + setTheme server action"
```

---

### Task 3: Apply theme server-side in root layout (no flash)

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: the `theme` cookie.
- Produces: `<html data-theme="...">` rendered on the server.

- [ ] **Step 1:** Read `src/app/layout.tsx` (it sets `<html lang="en" className={...fonts}>`).

- [ ] **Step 2:** Make `RootLayout` async and read the cookie; default `"dark"`:

```tsx
import { cookies } from "next/headers";
// ...
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en" data-theme={theme} className={`${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3:** Verify: `npm run build` success. `npm run dev`: with no cookie the app is dark; manually set cookie `document.cookie="theme=light"` in devtools and reload → app turns light with zero flash.

- [ ] **Step 4:** Commit.

```bash
git add src/app/layout.tsx
git commit -m "feat(theme): server-render data-theme from cookie (no flash)"
```

---

### Task 4: ThemeToggle client island

**Files:**
- Create: `src/components/ui/ThemeToggle.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: `setTheme` from `@/app/actions/theme`.
- Produces: `<ThemeToggle />` — a sun/moon button that flips `document.documentElement.dataset.theme`, writes the cookie + localStorage, and calls `setTheme`.

- [ ] **Step 1:** Create `src/components/ui/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { setTheme } from "@/app/actions/theme";

export function ThemeToggle() {
  const [theme, setLocal] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const cur = (document.documentElement.dataset.theme as "light" | "dark") || "dark";
    setLocal(cur);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    try { localStorage.setItem("theme", next); } catch {}
    setLocal(next);
    void setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-control border border-arqud-line text-arqud-gold transition-colors hover:bg-arqud-gold/10"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
```

- [ ] **Step 2:** Export it in `src/components/ui/index.ts`: add `export { ThemeToggle } from "./ThemeToggle";`

- [ ] **Step 3:** Verify: `npx tsc --noEmit` clean. (Wired into the sidebar in Task 5.)

- [ ] **Step 4:** Commit.

```bash
git add src/components/ui/ThemeToggle.tsx src/components/ui/index.ts
git commit -m "feat(theme): ThemeToggle client island"
```

---

### Task 5: Sidebar IA refresh + toggle placement

**Files:**
- Modify: `src/components/ui/Sidebar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`.
- Produces: grouped admin nav (Workspace / Run the business) with disabled "Soon" items for Tasks, Calendar, Proposals; `ThemeToggle` beside the user block. Client nav unchanged.

- [ ] **Step 1:** Read `src/components/ui/Sidebar.tsx`. It has `ADMIN_NAV` / `CLIENT_NAV` and renders `navList`.

- [ ] **Step 2:** Replace `ADMIN_NAV` with two groups and a "soon" flag, keeping existing hrefs and adding the new sections as disabled:

```tsx
const ADMIN_GROUPS = [
  { heading: "Workspace", items: [
    { label: "Home", href: "/admin/overview" },
    { label: "Clients", href: "/admin/clients" },
    { label: "Campaigns", href: "/admin/campaigns" },
  ]},
  { heading: "Run the business", items: [
    { label: "Tasks", href: "/admin/tasks", soon: true },
    { label: "Calendar", href: "/admin/calendar", soon: true },
    { label: "Proposals", href: "/admin/proposals", soon: true },
    { label: "Finances", href: "/admin/finances" },
    { label: "Files", href: "/admin/files" },
  ]},
] as const;
```

- [ ] **Step 3:** For the admin variant, render each group's heading (reuse the existing `Menu` label styling) and items. A `soon` item renders as a non-link `div` with the same padding, reduced opacity, and a small "Soon" pill (`bg-arqud-gold/10 text-arqud-gold`), and is not clickable. Active detection stays `pathname.startsWith(href)`. The client variant keeps `CLIENT_NAV` exactly as-is.

- [ ] **Step 4:** Add `<ThemeToggle />` in the bottom user row (left of the avatar block): wrap the existing user `div` and the toggle in a flex container with `justify-between`.

- [ ] **Step 5:** Verify: `npm run build` success; `npm run dev` → admin sidebar shows groups + Soon items + toggle; clicking the toggle flips the whole app light/dark and persists across reload. Client portal sidebar unchanged and dark.

- [ ] **Step 6:** Commit.

```bash
git add src/components/ui/Sidebar.tsx
git commit -m "feat(ui): grouped admin sidebar + theme toggle"
```

---

### Task 6: Presentational SVG primitives + StatCard + TeaserTile

**Files:**
- Create: `src/components/ui/Sparkline.tsx`, `src/components/ui/Donut.tsx`, `src/components/ui/ProgressTrack.tsx`, `src/components/ui/StatCard.tsx`, `src/components/ui/TeaserTile.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces:
  - `Sparkline({ points: number[], tone?: "pos" | "neg" })` → small inline SVG line.
  - `Donut({ pct: number, label?: string })` → ring with centered % + label.
  - `ProgressTrack({ pct: number })` → gold fill bar.
  - `StatCard({ label, value, trend?, trendTone?, points? })` → KPI card (label, big italic gold serif value, trend text, optional `Sparkline`).
  - `TeaserTile({ title, note })` → "Coming soon" placeholder card.

- [ ] **Step 1:** Create `Sparkline.tsx`:

```tsx
export function Sparkline({ points, tone = "pos" }: { points: number[]; tone?: "pos" | "neg" }) {
  const w = 74, h = 26, max = Math.max(...points, 1), min = Math.min(...points, 0);
  const span = max - min || 1;
  const path = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * (h - 4) - 2}`).join(" ");
  const stroke = tone === "pos" ? "var(--color-arqud-green)" : "var(--color-arqud-amber)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2:** Create `Donut.tsx`:

```tsx
export function Donut({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width="92" height="92" viewBox="0 0 42 42" aria-hidden>
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-arqud-line-2)" strokeWidth="6" />
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-arqud-gold)" strokeWidth="6"
        strokeDasharray={`${clamped} 100`} strokeDashoffset="25" strokeLinecap="round" />
      <text x="21" y="20" textAnchor="middle" fontSize="8" fontFamily="Georgia" fontStyle="italic" fill="var(--color-arqud-gold)">{Math.round(clamped)}%</text>
      {label && <text x="21" y="27" textAnchor="middle" fontSize="3.4" fill="var(--color-arqud-muted)">{label}</text>}
    </svg>
  );
}
```

- [ ] **Step 3:** Create `ProgressTrack.tsx`:

```tsx
export function ProgressTrack({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-[7px] w-full overflow-hidden rounded-[5px] bg-arqud-bg-2">
      <div className="h-full rounded-[5px] bg-gradient-to-r from-arqud-gold to-arqud-gold-soft" style={{ width: `${clamped}%` }} />
    </div>
  );
}
```

- [ ] **Step 4:** Create `StatCard.tsx` (uses `Card` + `Sparkline`):

```tsx
import { Sparkline } from "./Sparkline";

export function StatCard({ label, value, trend, trendTone = "pos", points }:
  { label: string; value: string; trend?: string; trendTone?: "pos" | "neg"; points?: number[] }) {
  return (
    <div className="rounded-card border border-arqud-line panel-gradient p-[18px] shadow-[var(--shadow-card)]">
      <div className="text-[9.5px] uppercase tracking-[0.13em] text-arqud-muted">{label}</div>
      <div className="stat-number mt-[9px] text-[25px]">{value}</div>
      {(trend || points) && (
        <div className="mt-[11px] flex items-center justify-between">
          {trend && <span className={`text-[10.5px] font-semibold ${trendTone === "pos" ? "text-arqud-green" : "text-arqud-amber"}`}>{trend}</span>}
          {points && <Sparkline points={points} tone={trendTone} />}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5:** Create `TeaserTile.tsx`:

```tsx
export function TeaserTile({ title, note }: { title: string; note: string }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-dashed border-arqud-line p-5 panel-gradient">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[17px] text-arqud-bone">{title}</h3>
        <span className="rounded-full bg-arqud-gold/10 px-2.5 py-0.5 text-[10px] font-semibold text-arqud-gold">Soon</span>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-arqud-muted">{note}</p>
    </div>
  );
}
```

- [ ] **Step 6:** Export all five in `src/components/ui/index.ts`.

- [ ] **Step 7:** Verify: `npx tsc --noEmit` clean; `npm run build` success.

- [ ] **Step 8:** Commit.

```bash
git add src/components/ui/Sparkline.tsx src/components/ui/Donut.tsx src/components/ui/ProgressTrack.tsx src/components/ui/StatCard.tsx src/components/ui/TeaserTile.tsx src/components/ui/index.ts
git commit -m "feat(ui): dashboard SVG primitives, StatCard, TeaserTile"
```

---

### Task 7: Command Center metrics helpers (pure, unit-tested)

**Files:**
- Create: `src/lib/dashboard/metrics.ts`
- Test: `src/lib/dashboard/__tests__/metrics.test.ts`

**Interfaces:**
- Produces (all pure, no I/O):
  - `type InvoiceLite = { amount: number; status: string; issue_date: string; paid_at?: string | null }`
  - `type TxLite = { amount: number; date: string }`
  - `type QuoteLite = { quote_number: string; total: number; status: string; client_label?: string }`
  - `type LeadLite = { created_at: string }`
  - `outstandingTotal(invoices: InvoiceLite[]): number` — sum of `pending`+`overdue`.
  - `collectedInMonth(invoices: InvoiceLite[], ref: Date): number` — sum of `paid` whose `paid_at` is in ref's month.
  - `invoicedInMonth(invoices: InvoiceLite[], ref: Date): number`
  - `revenueByMonth(invoices: InvoiceLite[], ref: Date, months: number): { label: string; invoiced: number; collected: number }[]`
  - `cashflow(tx: TxLite[], ref: Date): { income: number; expenses: number; net: number; marginPct: number }`
  - `pipeline(quotes: QuoteLite[]): { open: number; deals: { quote_number: string; total: number; status: string; client_label?: string }[] }` — open = total of non-rejected; deals sorted by total desc, first 4.
  - `leadStats(leads: LeadLite[], ref: Date): { month: number; week: number }`

- [ ] **Step 1:** Write the failing test `src/lib/dashboard/__tests__/metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { outstandingTotal, collectedInMonth, revenueByMonth, cashflow, pipeline, leadStats } from "@/lib/dashboard/metrics";

const ref = new Date("2026-06-15T00:00:00");

describe("outstandingTotal", () => {
  it("sums pending and overdue only", () => {
    expect(outstandingTotal([
      { amount: 100, status: "pending", issue_date: "2026-06-01" },
      { amount: 50, status: "overdue", issue_date: "2026-05-01" },
      { amount: 999, status: "paid", issue_date: "2026-06-01" },
      { amount: 7, status: "draft", issue_date: "2026-06-01" },
    ])).toBe(150);
  });
});

describe("collectedInMonth", () => {
  it("sums paid invoices paid in the ref month", () => {
    expect(collectedInMonth([
      { amount: 200, status: "paid", issue_date: "2026-04-01", paid_at: "2026-06-03" },
      { amount: 80, status: "paid", issue_date: "2026-06-01", paid_at: "2026-05-30" },
      { amount: 10, status: "pending", issue_date: "2026-06-01" },
    ], ref)).toBe(200);
  });
});

describe("revenueByMonth", () => {
  it("returns N months ending at ref with labels", () => {
    const r = revenueByMonth([{ amount: 300, status: "paid", issue_date: "2026-06-10", paid_at: "2026-06-10" }], ref, 3);
    expect(r).toHaveLength(3);
    expect(r[2].label).toBe("Jun");
    expect(r[2].invoiced).toBe(300);
    expect(r[2].collected).toBe(300);
  });
});

describe("cashflow", () => {
  it("splits signed amounts into income/expenses and computes margin", () => {
    const c = cashflow([
      { amount: 1000, date: "2026-06-02" },
      { amount: -300, date: "2026-06-05" },
      { amount: 50, date: "2026-05-01" },
    ], ref);
    expect(c.income).toBe(1000);
    expect(c.expenses).toBe(300);
    expect(c.net).toBe(700);
    expect(c.marginPct).toBe(70);
  });
});

describe("pipeline", () => {
  it("totals non-rejected quotes and returns top deals", () => {
    const p = pipeline([
      { quote_number: "Q1", total: 100, status: "sent" },
      { quote_number: "Q2", total: 900, status: "accepted" },
      { quote_number: "Q3", total: 5, status: "rejected" },
    ]);
    expect(p.open).toBe(1000);
    expect(p.deals[0].quote_number).toBe("Q2");
  });
});

describe("leadStats", () => {
  it("counts leads in month and last 7 days", () => {
    const s = leadStats([
      { created_at: "2026-06-14T10:00:00" },
      { created_at: "2026-06-01T10:00:00" },
      { created_at: "2026-05-30T10:00:00" },
    ], ref);
    expect(s.month).toBe(2);
    expect(s.week).toBe(1);
  });
});
```

- [ ] **Step 2:** Run it and confirm it fails (module not found).

Run: `npm test -- src/lib/dashboard`
Expected: FAIL ("Cannot find module '@/lib/dashboard/metrics'").

- [ ] **Step 3:** Implement `src/lib/dashboard/metrics.ts`:

```ts
export type InvoiceLite = { amount: number; status: string; issue_date: string; paid_at?: string | null };
export type TxLite = { amount: number; date: string };
export type QuoteLite = { quote_number: string; total: number; status: string; client_label?: string };
export type LeadLite = { created_at: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ym = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const parse = (s?: string | null) => (s ? new Date(s.length <= 10 ? s + "T00:00:00" : s) : null);

export function outstandingTotal(invoices: InvoiceLite[]): number {
  return invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
}

export function collectedInMonth(invoices: InvoiceLite[], ref: Date): number {
  return invoices.filter((i) => {
    const p = parse(i.paid_at);
    return i.status === "paid" && p && ym(p) === ym(ref);
  }).reduce((s, i) => s + i.amount, 0);
}

export function invoicedInMonth(invoices: InvoiceLite[], ref: Date): number {
  return invoices.filter((i) => { const d = parse(i.issue_date); return d && ym(d) === ym(ref); }).reduce((s, i) => s + i.amount, 0);
}

export function revenueByMonth(invoices: InvoiceLite[], ref: Date, months: number) {
  const out: { label: string; invoiced: number; collected: number }[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - k, 1);
    const bucket = ym(d);
    const invoiced = invoices.filter((i) => { const x = parse(i.issue_date); return x && ym(x) === bucket; }).reduce((s, i) => s + i.amount, 0);
    const collected = invoices.filter((i) => { const x = parse(i.paid_at); return i.status === "paid" && x && ym(x) === bucket; }).reduce((s, i) => s + i.amount, 0);
    out.push({ label: MONTHS[d.getMonth()], invoiced, collected });
  }
  return out;
}

export function cashflow(tx: TxLite[], ref: Date) {
  const inMonth = tx.filter((t) => { const d = parse(t.date); return d && ym(d) === ym(ref); });
  const income = inMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = inMonth.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const marginPct = income > 0 ? Math.round((net / income) * 100) : 0;
  return { income, expenses, net, marginPct };
}

export function pipeline(quotes: QuoteLite[]) {
  const live = quotes.filter((q) => q.status !== "rejected");
  const open = live.reduce((s, q) => s + q.total, 0);
  const deals = [...live].sort((a, b) => b.total - a.total).slice(0, 4);
  return { open, deals };
}

export function leadStats(leads: LeadLite[], ref: Date) {
  const month = leads.filter((l) => { const d = parse(l.created_at); return d && ym(d) === ym(ref); }).length;
  const weekAgo = new Date(ref); weekAgo.setDate(weekAgo.getDate() - 7);
  const week = leads.filter((l) => { const d = parse(l.created_at); return d && d >= weekAgo && d <= ref; }).length;
  return { month, week };
}
```

- [ ] **Step 4:** Run tests; confirm pass.

Run: `npm test -- src/lib/dashboard`
Expected: PASS (6 suites).

- [ ] **Step 5:** Commit.

```bash
git add src/lib/dashboard/metrics.ts src/lib/dashboard/__tests__/metrics.test.ts
git commit -m "feat(dashboard): pure metrics helpers + tests"
```

---

### Task 8: Command Center page (recompose `/admin/overview`)

**Files:**
- Modify: `src/app/admin/overview/page.tsx`
- Create: `src/app/admin/overview/CommandTiles.tsx` (presentational tiles that need no client state stay in the page; this file holds any tile markup that's verbose, imported by the page — all server components)

**Interfaces:**
- Consumes: helpers from `@/lib/dashboard/metrics`; `StatCard`, `AreaChart`, `Donut`, `ProgressTrack`, `Card`, `Pill`, `Table`/`Tr`/`Td`, `Avatar`, `TeaserTile`, `PageHeader` from `@/components/ui`.
- Produces: the Command Center home at `/admin/overview`.

- [ ] **Step 1:** Read the current `src/app/admin/overview/page.tsx` and `src/components/ui/AreaChart.tsx` (to match its prop shape). Preserve the existing Supabase queries; ADD parallel fetches for `quotes` (`quote_number,total,status,client_id`) and `transactions` (`amount,date`). Keep the admin client + `verifySession("admin")`.

- [ ] **Step 2:** Build the data layer at the top of the page component using the Task 7 helpers:

```tsx
const now = new Date();
const fmt = (n: number) => `R ${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
const revenue = revenueByMonth(invoices, now, 7);
const collected = collectedInMonth(invoices, now);
const outstanding = outstandingTotal(invoices);
const cash = cashflow(transactions, now);
const pipe = pipeline(quotes.map(q => ({ quote_number: q.quote_number, total: q.total, status: q.status, client_label: clientName(q.client_id) })));
const leadsM = leadStats(leads, now);
const activeClients = clients.filter(c => c.status === "active").length;
```

- [ ] **Step 3:** Recompose the JSX to the Command Center layout, matching the approved mockup `Desktop/ARQUD Command Center.html`:
  - `PageHeader` greeting row: `title="Good evening, Morne"` (or time-based), subtitle with today's date + counts. (Keep it simple — no new client component.)
  - **KPI strip** (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5`): five `StatCard`s — Revenue·month (`fmt(collected)`, sparkline from `revenue.map(r=>r.collected)`), Outstanding (`fmt(outstanding)`), New Leads (`leadsM.month`, sparkline), Active Clients, Net Profit (`fmt(cash.net)`, trend `${cash.marginPct}% margin`).
  - **Row 1** (`grid lg:grid-cols-[1.9fr_1fr] gap-4`): a `Card` "Revenue" wrapping the existing `AreaChart` fed by `revenue` (map to the chart's expected prop shape), and a `TeaserTile` "Today" (note: "Your daily agenda and tasks land here in the next update.").
  - **Row 2** (`grid lg:grid-cols-3 gap-4`): Sales Pipeline `Card` (list `pipe.deals` with `Pill` status + `fmt(total)`, header `${fmt(pipe.open)} open`); Campaign Leads `Card` (map `campaigns` → name + leads + `ProgressTrack` + spend/CPL/reach line); Cashflow `Card` (`Donut pct={cash.marginPct} label="MARGIN"` + income/expenses/net legend).
  - **Row 3** (`grid lg:grid-cols-[1.5fr_1fr] gap-4`): Live Leads `Card` (`Table` of recent `leads` — name, branch, brand `Pill` via existing `getBrand`, status `Pill`, relative time) and Clients `Card` (list with `Avatar`, name, sub, outstanding from invoices).
  - Use existing `getBrand`/`STATUS_TONE` from `src/lib/leads/brand.ts` for brand/status pills (do not duplicate).
  - Empty states: if `transactions`/`quotes`/`leads` empty, render the tile with a muted "No data yet" line instead of crashing.
  - Page wrapper: `min-h-screen px-4 sm:px-8 py-8 sm:py-10 space-y-4 animate-fade-up` (mobile-safe, matches Task-9 conventions).

- [ ] **Step 4:** Verify: `npx tsc --noEmit` clean; `npm run build` success. `npm run dev` → `/admin/overview` shows the Command Center with real data in **both** themes (toggle and re-check). No console errors.

- [ ] **Step 5:** Commit.

```bash
git add src/app/admin/overview/page.tsx src/app/admin/overview/CommandTiles.tsx
git commit -m "feat(dashboard): Command Center home on existing data"
```

---

### Task 9: Theme audit across all pages

**Files:**
- Modify (as needed): any file under `src/app/admin/**` and `src/app/client/**` that hard-codes a color which breaks on light.

**Interfaces:** none (visual correctness pass).

- [ ] **Step 1:** Find hard-coded colors that won't adapt: search for literal Tailwind palette colors and raw hex used for chrome (not the intentionally-light invoice/quote documents).

Run: `grep -rnE "text-(white|black|red-[0-9]|green-[0-9])|bg-(white|black)|#[0-9a-fA-F]{6}" src/app/admin src/app/client | grep -v invoice-pdf | grep -v quote-pdf`

- [ ] **Step 2:** For each genuine chrome hit, swap to a semantic token: `text-white`→`text-arqud-bone`, `bg-black/..`→`bg-arqud-bg/..`, status `text-green-400/red-400`→`text-arqud-green/text-arqud-amber`. Leave the invoice/quote PDF components and the white invoice-document modal untouched (intentionally light always).

- [ ] **Step 3:** Verify in `npm run dev`: walk every admin page (Overview, Clients, Client detail, Finances + modals, Campaigns, Files, Settings) and the login/auth pages in **light** and **dark** — text legible, borders visible, no white-on-white or black-on-black. Confirm the **client portal still defaults dark** (no cookie as a fresh client).

- [ ] **Step 4:** `npx tsc --noEmit` + `npm run build` clean.

- [ ] **Step 5:** Commit.

```bash
git add -A
git commit -m "fix(theme): light-mode color audit across admin + client pages"
```

---

### Task 10: Final verification + ship

- [ ] **Step 1:** `npm test` (all green), `npx tsc --noEmit` (clean), `npm run build` (success).
- [ ] **Step 2:** `npm run dev` final walkthrough: default dark for a no-cookie session; toggle → light persists across reload and (re-login on another browser profile) via `profiles.theme`; Command Center renders real data; client portal dark.
- [ ] **Step 3:** Push to main.

```bash
git push origin main
```

- [ ] **Step 4:** Tell Morne: live on his admin — flip the sun/moon in the sidebar to switch to the white Command Center; dark remains default for Arno/clients.

## Self-Review (completed)
- **Spec coverage:** theme engine (T1), persistence + no-flash (T2,T3), toggle (T4), IA + Soon items (T5), primitives (T6), metrics (T7), Command Center on existing data + pipeline-from-quotes + teasers (T8), cross-page light audit + client-stays-dark (T9), ship (T10). All spec sections mapped.
- **Placeholders:** none — full code for tokens, action, layout, toggle, primitives, metrics + tests; T8/T9 are composition/audit tasks with explicit element lists and the approved mockup as the visual contract.
- **Type consistency:** `setTheme(theme)` (T2) consumed in T4; metrics signatures (T7) consumed in T8; `Sparkline/Donut/ProgressTrack/StatCard/TeaserTile` props (T6) consumed in T8.
