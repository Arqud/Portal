# ARQUD Portal Phase 2 — Calendar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (executed inline this
> session by the author immediately after writing). Steps use checkbox syntax.

**Goal:** `/admin/calendar` + upgraded Today tile showing Google Calendar (via secret .ics URL
pasted in portal Settings), task due dates, and unpaid invoice due dates.

**Architecture:** `app_settings` KV table stores the secret URL; server components fetch the .ics
(15-min cache), pure tested modules parse (`ics.ts`) and expand recurrence (`expand.ts`, `rrule`
lib); month grid + agenda are RSC with searchParams navigation; TodayTile gets an `events` prop.

**Tech Stack:** Next 16 RSC + server actions, Supabase service-role, `rrule`, vitest, Tailwind v4 tokens.

## Global Constraints
- Admin-only; read-only toward Google; no CRM/invoice/money-logic changes; only additive schema
  (`app_settings`). Resilient to missing table/setting (no crashes). Theme tokens; mobile-friendly.
- Gates per task: `npx tsc --noEmit`; pure modules `npm test`; final `npm run build`; commit per task; push at end.

### Task 1: app_settings migration + getSetting + saveSetting
**Files:** Create `supabase/migrations/20260702_app_settings.sql`, `src/lib/settings/query.ts`, `src/app/actions/settings.ts`
**Interfaces:** `getSetting(key: string): Promise<string | null>`; `saveSetting(key: string, value: string): Promise<void>` ("use server", `verifySession("admin")`, upsert, revalidates `/admin/settings`, `/admin/calendar`, `/admin/overview`).
- [ ] SQL: `create table if not exists public.app_settings (key text primary key, value text not null, updated_at timestamptz not null default now()); alter table public.app_settings enable row level security;`
- [ ] `getSetting`: admin client select by key, `.maybeSingle()`; any error → `null`.
- [ ] `saveSetting`: upsert `{ key, value, updated_at: new Date().toISOString() }`.
- [ ] tsc clean → commit `feat(settings): app_settings store + actions`.

### Task 2: ICS parser (TDD)
**Files:** Create `src/lib/calendar/ics.ts`, `src/lib/calendar/__tests__/ics.test.ts`
**Interfaces:** `type IcsEvent = { uid: string; summary: string; start: Date; end: Date | null; allDay: boolean; rrule: string | null; exdates: string[] }`; `parseICS(text: string): IcsEvent[]`; internal `unfold`, `unescapeText`, `parseIcsDate`.
- [ ] Tests: unfolding (`SUMMARY:Long\r\n  line` → joined), escaped text (`\,` `\;` `\\n`), all-day `DTSTART;VALUE=DATE:20260706`, UTC `DTSTART:20260702T040000Z`, naive local `TZID=Africa/Johannesburg:20260702T060000`, RRULE captured raw, EXDATE collected, `STATUS:CANCELLED` skipped.
- [ ] Implement: unfold `/\r?\n[ \t]/g→""`; split VEVENT blocks; per line split name/params/value at first `:` (params after `;`); dates: 8-digit → local midnight allDay; `...Z` → `Date.UTC`; else local components. Run tests → PASS → commit `feat(calendar): ics parser + tests`.

### Task 3: Occurrence expansion (TDD)
**Files:** Create `src/lib/calendar/expand.ts`, `src/lib/calendar/__tests__/expand.test.ts`
**Interfaces:** `type Occurrence = { uid: string; summary: string; start: Date; end: Date; allDay: boolean }`; `expandOccurrences(events: IcsEvent[], winStart: Date, winEnd: Date): Occurrence[]` (sorted by start).
- [ ] Tests: single event inside window; event outside excluded; `FREQ=DAILY;COUNT=5` from a dtstart → correct number of occurrences inside a sub-window with duration preserved; EXDATE removes its occurrence; all-day default 1-day end.
- [ ] Implement with `rrule`: `new RRule({ ...RRule.parseString(ev.rrule), dtstart: ev.start })`, `.between(winStart, winEnd, true)`, filter exdate time-values; duration = `end−start` (all-day fallback 24h, timed fallback 0). Non-recurring: include when `start < winEnd && effEnd > winStart`. Run tests → PASS → commit `feat(calendar): recurrence expansion + tests`.

### Task 4: Settings Integrations card
**Files:** Create `src/app/admin/settings/IntegrationsCard.tsx` (client); Modify `src/app/admin/settings/page.tsx` (fetch `getSetting("google_calendar_ics_url")`, render card), or SettingsClient wrapper as fits existing structure.
**Interfaces:** `IntegrationsCard({ initialUrl }: { initialUrl: string | null })` — input + Save via `saveSetting`, saved/error inline states, note about the one-time SQL if save fails.
- [ ] Read existing settings page structure first; insert card following its patterns. tsc + build → commit `feat(settings): Google Calendar integration card`.

### Task 5: /admin/calendar page + sidebar
**Files:** Create `src/app/admin/calendar/page.tsx`; Modify `src/components/ui/Sidebar.tsx` (Calendar soon→live)
**Interfaces:** server page; searchParams `{ m?: string; d?: string }`.
- [ ] Data: `verifySession("admin")`; month from `m` (default now); grid = Monday-start, 42 cells; parallel: tasks (via `getTasks()`), invoices (`due_date` window, status pending/overdue), setting URL → fetch `.ics` `{ next: { revalidate: 900 } }` → `parseICS` → `expandOccurrences(gridStart, gridEnd)`; failures → empty + `feedError` flag.
- [ ] Render: header `Calendar · <Month Year>` + prev/Today/next links (`?m=`); legend; grid (chips: ≤3 = events by time (blue `bg-arqud-blue/12 text-arqud-blue`), tasks gold, invoices amber; `+N more` links `?m=..&d=..`); today ring on current date; dim other-month cells; agenda panel for selected `d` (default today): timed events sorted, then tasks, then invoices; empty + no-URL prompts. Layout `grid lg:grid-cols-[1fr_320px]`, grid wrapper `overflow-x-auto` with `min-w-[680px]`.
- [ ] Sidebar: remove `soon: true` from Calendar. tsc + build → commit `feat(calendar): month view + agenda, sidebar live`.

### Task 6: Today tile events + ship
**Files:** Modify `src/app/admin/overview/TodayTile.tsx` (+`events?: { time: string; title: string }[]` rendered above tasks with divider), `src/app/admin/overview/page.tsx` (fetch URL/ics, expand for today, map `HH:MM–HH:MM`/`All day`).
- [ ] tsc + `npm test` (all green) + `npm run build`; commit `feat(calendar): Google events on Today tile`; `git push origin main`.
- [ ] Handoff to Morne: `app_settings` SQL + Google secret-address paste steps.

## Self-Review (completed)
Spec coverage: storage+actions (T1), parser (T2), recurrence (T3), Settings card (T4), calendar
page+sidebar (T5), Today tile+ship (T6) — all spec sections mapped. No placeholders (logic fully
specified; wiring tasks name exact files/props). Type consistency: `IcsEvent` (T2) → T3; `Occurrence`
(T3) → T5/T6; `getSetting`/`saveSetting` (T1) → T4/T5/T6.
