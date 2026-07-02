# ARQUD Portal — Phase 2: Calendar (Scheduling) — Design

> Created 2 July 2026. Phase 2 of the daily-driver roadmap. Approved direction: **Google secret
> address (one paste)** — read Google Calendar into the portal; no Google Cloud setup. Mockup
> approved (Desktop/ARQUD Calendar.html).

## Goal
A live `/admin/calendar` and an upgraded Today tile: Morne's real Google schedule, task due dates,
and invoice due dates on one screen. Read-only toward Google. Admin-only.

## Decisions
- **Google link:** the calendar's private "Secret address in iCal format" URL, pasted **into the
  portal's Settings page** (never Vercel). Stored in a new `app_settings` key-value table.
- **Recurrence matters** (Morne's routine is recurring events) → use the battle-tested `rrule`
  package to expand occurrences; custom parsing only for the iCal container format.
- **Deferred:** creating/editing Google events from the portal (Phase 2b, needs Google Cloud),
  bookings, time tracking, client-facing calendar.

## Data
`app_settings (key text primary key, value text not null, updated_at timestamptz default now())`,
RLS enabled, service-role only. Setting key: `google_calendar_ics_url`.
Resilient reads: missing table/row → null → friendly prompts, never a crash (same pattern as tasks).

## Modules
- `src/lib/settings/query.ts` — `getSetting(key): Promise<string | null>` (resilient).
- `src/app/actions/settings.ts` — `saveSetting(key, value)` server action (admin-guarded, upsert).
- `src/lib/calendar/ics.ts` — pure: unfold folded lines, parse VEVENTs → `IcsEvent { uid, summary,
  start, end, allDay, rrule, exdates }`; unescape text; skip STATUS:CANCELLED. Date forms:
  `VALUE=DATE` (all-day), `...Z` (UTC), naive local. Unit-tested.
- `src/lib/calendar/expand.ts` — pure: `expandOccurrences(events, winStart, winEnd)` →
  `Occurrence { uid, summary, start, end, allDay }`; non-recurring overlap check; RRULE via
  `rrule` (dtstart + parsed options, `between(win)`, EXDATE filtered, duration preserved). Tested.
- Google fetch server-side with `next: { revalidate: 900 }` (15-min cache).

## Views
- **`/admin/calendar`** (server component; nav via searchParams `m=YYYY-MM`, `d=YYYY-MM-DD` links):
  Monday-start 6-row month grid; per-day chips (max 3 + "+N more"): Google events (blue, time),
  tasks due & not done (gold), unpaid invoice due dates (amber). Right/below: agenda panel for the
  selected day (defaults to today) listing events by time + tasks + invoices. Legend + prev/Today/
  next links. Mobile: grid scrolls horizontally, agenda stacks below. No URL saved → friendly
  "paste your Google secret address in Settings" prompt (calendar still shows tasks/invoices).
- **Today tile upgrade:** `TodayTile` gains optional `events: { time, title }[]` rendered above the
  task list with a divider; overview page computes today's occurrences.
- **Settings → Integrations card:** field to paste/update the secret address (shows saved state).
- **Sidebar:** Calendar goes live (Proposals stays "Soon").

## Errors
Fetch failure/invalid ics → treat as no events + subtle inline notice on the calendar page.
`app_settings` missing → Integrations card shows the one-time SQL notice. Nothing throws to users.

## Testing / ship
vitest for ics + expand (unfold, escaping, all-day, UTC, RRULE daily/weekly with COUNT/UNTIL,
EXDATE, window overlap). `tsc` + full `npm test` + `npm run build` gates. Ship to main.
Morne's one-time setup: run the `app_settings` SQL; paste the Google secret address in Settings.

## Out of scope
No CRM/leads, invoice, quote, or money-logic changes. No writes to Google.
