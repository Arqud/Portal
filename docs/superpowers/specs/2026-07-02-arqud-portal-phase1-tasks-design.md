# ARQUD Portal — Phase 1: Tasks & Projects — Design

> Created 2 July 2026. Phase 1 of the daily-driver roadmap (after Phase 0: theme + Command Center).
> Delivers a personal + per-client task system that powers the Command Center "Today" tile,
> plus a one-way link so tasks appear in Google Calendar.

## Background & Goal

Phase 0 shipped the theme + Command Center, with a **"Today" teaser** tile and a **Tasks (Soon)**
sidebar item. Phase 1 makes those real: a task system Morne opens every morning, and per-client
project tracking — admin-only. Morne lives in Google Calendar, so tasks also flow there (one-way).

## Decisions (from brainstorming)

- **Shape:** both personal tasks AND per-client boards, via **one shared `tasks` table** (a task with
  no client = personal; a task with a `client_id` = shows on that client's board).
- **Visibility:** **admin-only.** No client-facing board, no comments, no realtime (all deferred).
- **Google Calendar:** **one-way now** — a private iCal subscribe URL exposes tasks-with-due-dates so
  they appear in Google Calendar. Full two-way OAuth sync is Phase 2.

## Data model

New table `tasks` (admin-only; the app's service-role client reads/writes it):
```sql
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  priority text not null default 'med' check (priority in ('low','med','high')),
  due_date date,
  client_id uuid references public.clients(id) on delete set null,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;  -- no policies: service role only (admin-only)
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_client_idx on public.tasks (client_id);
```
**Setup step (Morne runs once):** the SQL above in Supabase → SQL Editor. Plus one Vercel env var
`ICAL_FEED_TOKEN` (a random secret) to guard the calendar feed URL.

## Views

1. **Command Center "Today" tile** (replace the teaser in `/admin/overview`):
   tasks that are **overdue or due today** (any client + personal), sorted overdue-first then priority,
   each with a **one-tap check-off** and a quick **"+ Add"** (title + optional due). Empty state:
   "Nothing due today — you're clear."

2. **`/admin/tasks`** — the hub: a **board** with **To do / Doing / Done** columns and a **client
   filter** (All / Personal / one chip per active client). Cards show title, client tag pill, due
   badge (Today = gold, Overdue = amber), priority dot. **New Task** button opens the task modal.
   Move a card between columns via native HTML5 drag-and-drop (**no new dependency**), with a
   click-to-move menu as the accessible fallback.

3. **Client detail → new "Tasks" tab** (`ClientDetailClient.tsx`): the same board filtered to that
   client, so per-account project tracking lives on the client page.

## Interactions & data flow

- Server actions in `src/app/actions/tasks.ts`: `createTask`, `updateTask`, `moveTask(id, status)`,
  `toggleComplete(id)`, `deleteTask(id)`. Each `revalidatePath` the affected routes. `moveTask`/
  `toggleComplete` set/clear `completed_at` when status becomes/leaves `done`.
- Server components fetch tasks (service-role admin client) for each view; **client islands** only for
  the interactive bits: the board (`TasksBoard`), the task modal (`TaskFormModal`), and the Today
  tile check-off (`TodayTile`). Matches Phase 0's RSC-first pattern; themed via tokens (light/dark);
  mobile: board columns scroll horizontally, stack-friendly.

## Google Calendar feed (one-way)

- Route `GET /api/calendar/tasks.ics?token=<ICAL_FEED_TOKEN>`:
  - 401 if token missing/incorrect.
  - Returns `text/calendar` (VCALENDAR) with one all-day `VEVENT` per task **that has a `due_date`**:
    `SUMMARY` = `title` (prefixed with client name when tagged), `DTSTART;VALUE=DATE` = due_date,
    `STATUS` (`CONFIRMED`, or `COMPLETED` when done), `UID` = task id + domain, `DESCRIPTION` = priority/status.
  - Proper iCal escaping (commas, semicolons, newlines) and CRLF line endings.
- Morne subscribes once in Google Calendar → "Other calendars" → "From URL" → paste the feed URL.
  Google polls it periodically; tasks then appear in his calendar. One-way (portal → Google).

## Error / edge handling

- No tasks / empty column → graceful empty states, never crash.
- `client_id` of a deleted client → `on delete set null` (task becomes personal, never orphaned).
- Feed with no due-dated tasks → valid empty VCALENDAR.
- Server-action failures surface an inline error; optimistic UI reverts.
- Before the migration runs, the app must not crash: task queries are wrapped so a missing table
  yields an empty list + a one-time "Run the tasks setup SQL" notice on `/admin/tasks` (no white screen).

## Testing

- Pure logic in `src/lib/tasks/logic.ts` (unit-tested, vitest): `dueBucket(task, ref)` →
  `overdue|today|upcoming|none`; `sortForToday(tasks)`; `groupByStatus(tasks)`.
- Pure serializer in `src/lib/tasks/ical.ts` (unit-tested): `toICS(tasks, domain)` — escaping, DATE
  format, CRLF, COMPLETED status, empty case.
- Per task: `npx tsc --noEmit` + `npm run build` clean; `npm test` green.

## File structure

- Add: `supabase/migrations/20260702_tasks.sql`; `src/lib/tasks/types.ts`, `logic.ts`, `ical.ts`
  (+ `__tests__`); `src/app/actions/tasks.ts`; `src/app/admin/tasks/page.tsx`, `TasksBoard.tsx`,
  `TaskFormModal.tsx`; `src/components/ui/TaskCard.tsx`; `src/app/api/calendar/tasks.ics/route.ts`;
  `src/app/admin/overview/TodayTile.tsx`.
- Modify: `src/app/admin/overview/page.tsx` (Today teaser → `TodayTile`), `src/components/ui/Sidebar.tsx`
  (Tasks: drop "Soon", add count), `src/app/admin/clients/[id]/ClientDetailClient.tsx` (+ Tasks tab),
  `src/components/ui/index.ts`.

## Out of scope (later)

Client-facing boards, comments/collaboration, realtime, recurring tasks, reminders/notifications,
and **two-way Google Calendar sync (Phase 2)**. No changes to CRM/leads, invoices, or money logic.
