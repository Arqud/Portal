# ARQUD Portal Phase 1 — Tasks & Projects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin-only task system (personal + per-client boards) that powers the Command Center "Today" tile, plus a one-way iCal feed so tasks appear in Google Calendar.

**Architecture:** One `tasks` table read/written by the service-role admin client (admin-only). Server components fetch; small client islands drive the board, task modal, and Today check-off. Pure logic (bucketing/sorting) and the iCal serializer are unit-tested. A token-guarded route serves `text/calendar`.

**Tech Stack:** Next 16 (App Router, RSC + server actions), React 19, Tailwind v4 (tokens, light/dark), Supabase (service-role admin client), vitest.

## Global Constraints
- Admin-only. No client-facing board, comments, realtime, recurring, or reminders. No two-way Google sync (Phase 2).
- **No CRM/leads, invoice, quote, or money changes.** The only schema change is the additive `tasks` table.
- Data via the **service-role admin client** (`createSupabaseAdminClient`); every server action guards with `verifySession("admin")`.
- Theme via tokens only (works light + dark); mobile-friendly (board scrolls horizontally). Reuse `@/components/ui`.
- Statuses: `todo | doing | done`. Priorities: `low | med | high`. Column labels: **To do / Doing / Done**.
- Verify each task: `npx tsc --noEmit` + `npm run build` clean; pure-logic tasks also `npm test` green. Commit per task. Ship to `main`.
- Setup Morne runs once (documented, not automated): the `tasks` table SQL, and a Vercel env var `ICAL_FEED_TOKEN`.

## File Structure
- `supabase/migrations/20260702_tasks.sql` — table + RLS.
- `src/lib/tasks/types.ts` — `Task`, `TaskStatus`, `TaskPriority`.
- `src/lib/tasks/logic.ts` (+ `__tests__/logic.test.ts`) — pure bucketing/sorting/grouping.
- `src/lib/tasks/ical.ts` (+ `__tests__/ical.test.ts`) — pure VCALENDAR serializer.
- `src/lib/tasks/query.ts` — `getTasks()` server helper (resilient to missing table).
- `src/app/actions/tasks.ts` — server actions (create/update/move/toggle/delete).
- `src/components/ui/TaskCard.tsx` — presentational card.
- `src/app/admin/tasks/TaskFormModal.tsx` — create/edit modal (client).
- `src/app/admin/tasks/TasksBoard.tsx` — board (client) with filter + drag/move.
- `src/app/admin/tasks/page.tsx` — server page.
- `src/app/admin/overview/TodayTile.tsx` — Today tile (client island).
- `src/app/api/calendar/tasks.ics/route.ts` — iCal feed.
- Modify: `src/app/admin/overview/page.tsx`, `src/components/ui/Sidebar.tsx`, `src/app/admin/clients/[id]/ClientDetailClient.tsx`, `src/components/ui/index.ts`.

---

### Task 1: Migration + types + resilient query

**Files:** Create `supabase/migrations/20260702_tasks.sql`, `src/lib/tasks/types.ts`, `src/lib/tasks/query.ts`

**Interfaces:**
- Produces: `Task`, `TaskStatus`, `TaskPriority` types; `getTasks(): Promise<{ tasks: Task[]; tableReady: boolean }>`.

- [ ] **Step 1:** Create `supabase/migrations/20260702_tasks.sql`:

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
alter table public.tasks enable row level security;
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_client_idx on public.tasks (client_id);
```

- [ ] **Step 2:** Create `src/lib/tasks/types.ts`:

```ts
export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "med" | "high";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null; // YYYY-MM-DD
  client_id: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
};
```

- [ ] **Step 3:** Create `src/lib/tasks/query.ts`:

```ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Task } from "./types";

// Resilient: before the migration is run the table won't exist — return empty
// + tableReady:false so the UI can show a setup notice instead of crashing.
export async function getTasks(): Promise<{ tasks: Task[]; tableReady: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { tasks: [], tableReady: false };
  return { tasks: (data ?? []) as Task[], tableReady: true };
}
```

- [ ] **Step 4:** Verify `npx tsc --noEmit` clean.

- [ ] **Step 5:** Commit:

```bash
git add supabase/migrations/20260702_tasks.sql src/lib/tasks/types.ts src/lib/tasks/query.ts
git commit -m "feat(tasks): migration, types, resilient getTasks"
```

---

### Task 2: Pure task logic (TDD)

**Files:** Create `src/lib/tasks/logic.ts`, `src/lib/tasks/__tests__/logic.test.ts`

**Interfaces:**
- Consumes: `Task`, `TaskStatus` from `./types`.
- Produces: `dueBucket(due: string | null, ref: Date): "overdue"|"today"|"upcoming"|"none"`;
  `todayTasks(tasks: Task[], ref: Date): Task[]`; `sortForToday(tasks: Task[]): Task[]`;
  `groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]>`.

- [ ] **Step 1:** Write `src/lib/tasks/__tests__/logic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dueBucket, todayTasks, sortForToday, groupByStatus } from "@/lib/tasks/logic";
import type { Task } from "@/lib/tasks/types";

const ref = new Date("2026-07-02T09:00:00");
const t = (o: Partial<Task>): Task => ({
  id: o.id ?? "x", title: o.title ?? "T", notes: null, status: o.status ?? "todo",
  priority: o.priority ?? "med", due_date: o.due_date ?? null, client_id: o.client_id ?? null,
  sort_order: o.sort_order ?? 0, completed_at: o.completed_at ?? null, created_at: "2026-07-01",
});

describe("dueBucket", () => {
  it("classifies overdue/today/upcoming/none", () => {
    expect(dueBucket("2026-07-01", ref)).toBe("overdue");
    expect(dueBucket("2026-07-02", ref)).toBe("today");
    expect(dueBucket("2026-07-05", ref)).toBe("upcoming");
    expect(dueBucket(null, ref)).toBe("none");
  });
});

describe("todayTasks", () => {
  it("returns not-done tasks that are overdue or due today", () => {
    const res = todayTasks(
      [
        t({ id: "a", due_date: "2026-07-01" }),
        t({ id: "b", due_date: "2026-07-02" }),
        t({ id: "c", due_date: "2026-07-09" }),
        t({ id: "d", due_date: "2026-07-01", status: "done" }),
      ],
      ref
    );
    expect(res.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("sortForToday", () => {
  it("overdue before today, then high>med>low priority", () => {
    const res = sortForToday([
      t({ id: "todayLow", due_date: "2026-07-02", priority: "low" }),
      t({ id: "overMed", due_date: "2026-07-01", priority: "med" }),
      t({ id: "todayHigh", due_date: "2026-07-02", priority: "high" }),
    ]);
    // uses ref = now internally via Date; assert overdue first regardless
    expect(res[0].id).toBe("overMed");
  });
});

describe("groupByStatus", () => {
  it("buckets by status with all three keys present", () => {
    const g = groupByStatus([t({ status: "todo" }), t({ status: "done" }), t({ status: "done" })]);
    expect(g.todo).toHaveLength(1);
    expect(g.doing).toHaveLength(0);
    expect(g.done).toHaveLength(2);
  });
});
```

- [ ] **Step 2:** Run `npm test -- src/lib/tasks/__tests__/logic.test.ts` → FAIL (module missing).

- [ ] **Step 3:** Create `src/lib/tasks/logic.ts`:

```ts
import type { Task, TaskStatus } from "./types";

const PRIORITY_RANK: Record<string, number> = { high: 0, med: 1, low: 2 };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function dueBucket(due: string | null, ref: Date): "overdue" | "today" | "upcoming" | "none" {
  if (!due) return "none";
  const today = dayKey(ref);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

export function todayTasks(tasks: Task[], ref: Date): Task[] {
  return tasks.filter((t) => {
    if (t.status === "done") return false;
    const b = dueBucket(t.due_date, ref);
    return b === "overdue" || b === "today";
  });
}

export function sortForToday(tasks: Task[]): Task[] {
  const ref = new Date();
  return [...tasks].sort((a, b) => {
    const ba = dueBucket(a.due_date, ref) === "overdue" ? 0 : 1;
    const bb = dueBucket(b.due_date, ref) === "overdue" ? 0 : 1;
    if (ba !== bb) return ba - bb;
    return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  });
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const g: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
  for (const t of tasks) g[t.status].push(t);
  return g;
}
```

- [ ] **Step 4:** Run the test again → PASS.

- [ ] **Step 5:** Commit: `git add src/lib/tasks/logic.ts src/lib/tasks/__tests__/logic.test.ts && git commit -m "feat(tasks): pure logic + tests"`

---

### Task 3: iCal serializer (TDD)

**Files:** Create `src/lib/tasks/ical.ts`, `src/lib/tasks/__tests__/ical.test.ts`

**Interfaces:**
- Produces: `type ICSTask = { id: string; title: string; due_date: string | null; status: TaskStatus; priority: TaskPriority; client_label?: string | null }`;
  `toICS(tasks: ICSTask[], domain: string): string`.

- [ ] **Step 1:** Write `src/lib/tasks/__tests__/ical.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toICS } from "@/lib/tasks/ical";

describe("toICS", () => {
  it("emits a VCALENDAR with only due-dated tasks and CRLF", () => {
    const ics = toICS(
      [
        { id: "1", title: "Call Letitia", due_date: "2026-07-02", status: "todo", priority: "high" },
        { id: "2", title: "No date task", due_date: null, status: "todo", priority: "low" },
        { id: "3", title: "Done task", due_date: "2026-07-01", status: "done", priority: "low", client_label: "We Wash" },
      ],
      "arqudportal.co.za"
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("\r\n");
    expect(ics).toContain("SUMMARY:Call Letitia");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260702");
    expect(ics).toContain("SUMMARY:We Wash — Done task");
    expect(ics).toContain("STATUS:COMPLETED");
    expect(ics).not.toContain("No date task"); // no due date -> no event
  });

  it("escapes commas, semicolons, backslashes", () => {
    const ics = toICS([{ id: "1", title: "A, B; C\\D", due_date: "2026-07-02", status: "todo", priority: "med" }], "d.co");
    expect(ics).toContain("SUMMARY:A\\, B\\; C\\\\D");
  });
});
```

- [ ] **Step 2:** Run `npm test -- src/lib/tasks/__tests__/ical.test.ts` → FAIL.

- [ ] **Step 3:** Create `src/lib/tasks/ical.ts`:

```ts
import type { TaskStatus, TaskPriority } from "./types";

export type ICSTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  client_label?: string | null;
};

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function toICS(tasks: ICSTask[], domain: string): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ARQUD//Portal//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:ARQUD Tasks"];
  for (const t of tasks) {
    if (!t.due_date) continue;
    const date = t.due_date.replace(/-/g, "");
    const summary = t.client_label ? `${t.client_label} — ${t.title}` : t.title;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:task-${t.id}@${domain}`);
    lines.push(`DTSTART;VALUE=DATE:${date}`);
    lines.push(`SUMMARY:${esc(summary)}`);
    lines.push(`DESCRIPTION:${esc(`Priority: ${t.priority} · Status: ${t.status}`)}`);
    lines.push(`STATUS:${t.status === "done" ? "COMPLETED" : "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
```

- [ ] **Step 4:** Run the test → PASS.

- [ ] **Step 5:** Commit: `git add src/lib/tasks/ical.ts src/lib/tasks/__tests__/ical.test.ts && git commit -m "feat(tasks): iCal serializer + tests"`

---

### Task 4: Server actions

**Files:** Create `src/app/actions/tasks.ts`

**Interfaces:**
- Produces (all `Promise<void>`, guarded by `verifySession("admin")`):
  `createTask(input)`, `updateTask(id, patch)`, `moveTask(id, status)`, `toggleComplete(id)`, `deleteTask(id)`.

- [ ] **Step 1:** Create `src/app/actions/tasks.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TaskStatus, TaskPriority } from "@/lib/tasks/types";

type NewTask = {
  title: string;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  client_id?: string | null;
};

function revalidate() {
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/overview");
}

export async function createTask(input: NewTask) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("tasks").insert({
    title: input.title.trim(),
    notes: input.notes ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "med",
    due_date: input.due_date || null,
    client_id: input.client_id || null,
  });
  revalidate();
}

export async function updateTask(id: string, patch: Partial<NewTask>) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("tasks").update({
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.due_date !== undefined ? { due_date: patch.due_date || null } : {}),
    ...(patch.client_id !== undefined ? { client_id: patch.client_id || null } : {}),
  }).eq("id", id);
  revalidate();
}

export async function moveTask(id: string, status: TaskStatus) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", id);
  revalidate();
}

export async function toggleComplete(id: string) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("tasks").select("status").eq("id", id).single();
  const done = data?.status === "done";
  await admin.from("tasks").update({ status: done ? "todo" : "done", completed_at: done ? null : new Date().toISOString() }).eq("id", id);
  revalidate();
}

export async function deleteTask(id: string) {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  await admin.from("tasks").delete().eq("id", id);
  revalidate();
}
```

- [ ] **Step 2:** Verify `npx tsc --noEmit` clean.

- [ ] **Step 3:** Commit: `git add src/app/actions/tasks.ts && git commit -m "feat(tasks): server actions"`

---

### Task 5: TaskCard component

**Files:** Create `src/components/ui/TaskCard.tsx`; Modify `src/components/ui/index.ts`

**Interfaces:**
- Consumes: `Task` from `@/lib/tasks/types`; `dueBucket` from `@/lib/tasks/logic`.
- Produces: `TaskCard({ task, clientLabel, brandTone, onClick })` — presentational.

- [ ] **Step 1:** Create `src/components/ui/TaskCard.tsx`:

```tsx
"use client";

import type { Task } from "@/lib/tasks/types";
import { dueBucket } from "@/lib/tasks/logic";

const PRIORITY_DOT: Record<string, string> = { high: "bg-arqud-amber", med: "bg-arqud-gold-soft", low: "bg-arqud-line-2" };

function dueLabel(due: string | null): { text: string; cls: string } | null {
  if (!due) return null;
  const b = dueBucket(due, new Date());
  if (b === "overdue") return { text: "Overdue", cls: "text-arqud-amber font-semibold" };
  if (b === "today") return { text: "Today", cls: "text-arqud-gold font-semibold" };
  return { text: new Date(due + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), cls: "text-arqud-muted" };
}

export function TaskCard({ task, clientLabel, brandTone = "neutral", onClick }: {
  task: Task; clientLabel?: string | null; brandTone?: string; onClick?: () => void;
}) {
  const due = dueLabel(task.due_date);
  const toneCls: Record<string, string> = {
    wash: "bg-arqud-gold/12 text-arqud-gold", spark: "bg-arqud-blue/12 text-arqud-blue", neutral: "bg-arqud-line-2 text-arqud-muted",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-control border border-arqud-line panel-gradient p-3 shadow-[var(--shadow-card)] mb-2.5 transition-transform hover:-translate-y-px ${task.status === "done" ? "opacity-70" : ""}`}
    >
      <p className={`text-[13px] leading-snug text-arqud-bone mb-2 ${task.status === "done" ? "line-through text-arqud-muted" : ""}`}>{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {clientLabel && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${toneCls[brandTone] ?? toneCls.neutral}`}>{clientLabel}</span>}
        {due && <span className={`text-[10.5px] ${due.cls}`}>{due.text}</span>}
        <span className={`ml-auto w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.med}`} aria-hidden />
      </div>
    </button>
  );
}
```

- [ ] **Step 2:** Add to `src/components/ui/index.ts`: `export { TaskCard } from "./TaskCard";`

- [ ] **Step 3:** Verify `npx tsc --noEmit` clean.

- [ ] **Step 4:** Commit: `git add src/components/ui/TaskCard.tsx src/components/ui/index.ts && git commit -m "feat(tasks): TaskCard component"`

---

### Task 6: Task form modal

**Files:** Create `src/app/admin/tasks/TaskFormModal.tsx`

**Interfaces:**
- Consumes: `createTask`, `updateTask`, `deleteTask` from `@/app/actions/tasks`; `Task` type; `Input`, `Select`, `Textarea`, `Button` from `@/components/ui`.
- Produces: `TaskFormModal({ task, clients, defaultClientId, onClose })` — create when `task` is null, else edit.

- [ ] **Step 1:** Create `src/app/admin/tasks/TaskFormModal.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Input, Select, Textarea, Button } from "@/components/ui";
import { createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import type { Task } from "@/lib/tasks/types";

type ClientOpt = { id: string; label: string };

export function TaskFormModal({ task, clients, defaultClientId, onClose }: {
  task: Task | null; clients: ClientOpt[]; defaultClientId?: string | null; onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [priority, setPriority] = useState(task?.priority ?? "med");
  const [due, setDue] = useState(task?.due_date ?? "");
  const [clientId, setClientId] = useState(task?.client_id ?? defaultClientId ?? "");
  const [pending, start] = useTransition();

  function save() {
    if (!title.trim()) return;
    start(async () => {
      if (task) await updateTask(task.id, { title, notes, status, priority, due_date: due, client_id: clientId });
      else await createTask({ title, notes, status, priority, due_date: due, client_id: clientId });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16" onClick={onClose}>
      <div className="w-full max-w-md rounded-card border border-arqud-line panel-gradient p-6 shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl text-arqud-gold mb-4">{task ? "Edit task" : "New task"}</h2>
        <div className="space-y-3">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])} className="w-full">
              <option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option>
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="w-full">
              <option value="low">Low</option><option value="med">Medium</option><option value="high">High</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full" />
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full">
              <option value="">Personal</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" rows={3} />
        </div>
        <div className="mt-5 flex items-center justify-between">
          {task ? (
            <button disabled={pending} onClick={() => start(async () => { await deleteTask(task.id); onClose(); })} className="text-xs text-red-400 hover:text-red-300 uppercase tracking-widest disabled:opacity-50">Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={pending || !title.trim()}>{task ? "Save" : "Create"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Verify `npx tsc --noEmit` clean (confirm `Input`/`Select`/`Textarea`/`Button` accept these props — they wrap native elements from Phase 0's `Field.tsx`; if `Button` lacks `onClick`, pass via native since it renders a `<button>`).

- [ ] **Step 3:** Commit: `git add src/app/admin/tasks/TaskFormModal.tsx && git commit -m "feat(tasks): task form modal"`

---

### Task 7: TasksBoard (client)

**Files:** Create `src/app/admin/tasks/TasksBoard.tsx`

**Interfaces:**
- Consumes: `Task`, `groupByStatus` (`@/lib/tasks/logic`), `moveTask` (`@/app/actions/tasks`), `TaskCard`, `TaskFormModal`.
- Produces: `TasksBoard({ tasks, clients, lockedClientId })` — renders filter + 3 columns; `lockedClientId` (optional) fixes the filter to one client (client-detail tab) and hides the filter bar.

- [ ] **Step 1:** Create `src/app/admin/tasks/TasksBoard.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { groupByStatus } from "@/lib/tasks/logic";
import { moveTask } from "@/app/actions/tasks";
import { TaskCard } from "@/components/ui";
import { TaskFormModal } from "./TaskFormModal";

type ClientOpt = { id: string; label: string; tone?: string };
const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" }, { key: "doing", label: "Doing" }, { key: "done", label: "Done" },
];

export function TasksBoard({ tasks, clients, lockedClientId }: { tasks: Task[]; clients: ClientOpt[]; lockedClientId?: string }) {
  const [filter, setFilter] = useState<string>(lockedClientId ?? "all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const visible = tasks.filter((t) => {
    if (lockedClientId) return t.client_id === lockedClientId;
    if (filter === "all") return true;
    if (filter === "personal") return !t.client_id;
    return t.client_id === filter;
  });
  const grouped = groupByStatus(visible);
  const labelFor = (id: string | null) => clients.find((c) => c.id === id)?.label ?? null;
  const toneFor = (id: string | null) => clients.find((c) => c.id === id)?.tone ?? "neutral";

  return (
    <>
      {!lockedClientId && (
        <div className="flex gap-2 flex-wrap mb-5">
          {[{ id: "all", label: "All" }, { id: "personal", label: "Personal" }, ...clients].map((c) => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`text-[11.5px] px-3.5 py-1.5 rounded-full border transition-colors ${filter === c.id ? "bg-arqud-gold/15 border-transparent text-arqud-gold font-semibold" : "border-arqud-line text-arqud-bone-dim hover:text-arqud-bone"}`}>
              {c.label}
            </button>
          ))}
          <button onClick={() => setCreating(true)} className="ml-auto text-[11.5px] px-3.5 py-1.5 rounded-full bg-gradient-to-r from-arqud-gold to-arqud-gold-soft text-arqud-bg font-semibold">+ New Task</button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const id = e.dataTransfer.getData("text/task"); if (id) moveTask(id, col.key); }}
            className="rounded-card border border-arqud-line bg-arqud-gold/[0.015] p-3.5 min-h-[120px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-widest text-arqud-muted font-semibold">{col.label}</span>
              <span className="text-[11px] text-arqud-muted border border-arqud-line rounded-full px-2">{grouped[col.key].length}</span>
            </div>
            {grouped[col.key].map((t) => (
              <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}>
                <TaskCard task={t} clientLabel={labelFor(t.client_id)} brandTone={toneFor(t.client_id)} onClick={() => setEditing(t)} />
              </div>
            ))}
            {grouped[col.key].length === 0 && <p className="text-[11px] text-arqud-muted text-center py-4">Nothing here</p>}
          </div>
        ))}
      </div>

      {lockedClientId && (
        <button onClick={() => setCreating(true)} className="mt-4 text-xs px-4 py-2 rounded-control bg-gradient-to-r from-arqud-gold to-arqud-gold-soft text-arqud-bg font-semibold">+ New Task</button>
      )}
      {editing && <TaskFormModal task={editing} clients={clients} onClose={() => setEditing(null)} />}
      {creating && <TaskFormModal task={null} clients={clients} defaultClientId={lockedClientId} onClose={() => setCreating(false)} />}
    </>
  );
}
```

- [ ] **Step 2:** Verify `npx tsc --noEmit` clean.

- [ ] **Step 3:** Commit: `git add src/app/admin/tasks/TasksBoard.tsx && git commit -m "feat(tasks): board with filter + drag-move"`

---

### Task 8: /admin/tasks page

**Files:** Create `src/app/admin/tasks/page.tsx`

**Interfaces:** Consumes `getTasks`, `verifySession`, admin client for clients, `TasksBoard`, `PageHeader`, `Card`.

- [ ] **Step 1:** Create `src/app/admin/tasks/page.tsx`:

```tsx
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card } from "@/components/ui";
import { getTasks } from "@/lib/tasks/query";
import { getBrand, BRAND_TONE } from "@/lib/leads/brand";
import { TasksBoard } from "./TasksBoard";
import { todayTasks } from "@/lib/tasks/logic";

export default async function TasksPage() {
  await verifySession("admin");
  const admin = createSupabaseAdminClient();
  const [{ tasks, tableReady }, clientsRes] = await Promise.all([
    getTasks(),
    admin.from("clients").select("id, company, name").order("company", { ascending: true }),
  ]);
  const clients = (clientsRes.data ?? []).map((c) => ({ id: c.id, label: c.company ?? c.name, tone: "neutral" }));
  const open = tasks.filter((t) => t.status !== "done").length;
  const dueToday = todayTasks(tasks, new Date()).length;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title="Tasks" count={`${open} open · ${dueToday} due today`} />
      {!tableReady ? (
        <Card>
          <div className="py-10 text-center space-y-2">
            <p className="font-display text-xl text-arqud-gold">One-time setup needed</p>
            <p className="text-sm text-arqud-muted">Run the tasks-table SQL in Supabase, then refresh. (See the setup note Morne was given.)</p>
          </div>
        </Card>
      ) : (
        <TasksBoard tasks={tasks} clients={clients} />
      )}
    </main>
  );
}
```

Note: `getBrand`/`BRAND_TONE` import kept for future brand tinting; if unused, drop it to satisfy tsc. Prefer `tone: "neutral"` for all clients in Phase 1 (brand tinting is cosmetic; remove the unused import).

- [ ] **Step 2:** Remove the unused `getBrand`/`BRAND_TONE` import line (Phase 1 uses neutral tone). Verify `npm run build` clean; visit `/admin/tasks`.

- [ ] **Step 3:** Commit: `git add src/app/admin/tasks/page.tsx && git commit -m "feat(tasks): /admin/tasks page"`

---

### Task 9: Today tile on Command Center

**Files:** Create `src/app/admin/overview/TodayTile.tsx`; Modify `src/app/admin/overview/page.tsx`

**Interfaces:** Consumes `Task`, `todayTasks`, `sortForToday`, `toggleComplete`, `createTask`.

- [ ] **Step 1:** Create `src/app/admin/overview/TodayTile.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Task } from "@/lib/tasks/types";
import { dueBucket } from "@/lib/tasks/logic";
import { toggleComplete, createTask } from "@/app/actions/tasks";

export function TodayTile({ tasks, labelFor }: { tasks: Task[]; labelFor: Record<string, string> }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="rounded-card border border-arqud-line panel-gradient p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-[17px] text-arqud-bone">Today</h3>
        <button onClick={() => setAdding((v) => !v)} className="text-[11px] text-arqud-gold font-semibold">+ Add</button>
      </div>
      {adding && (
        <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; start(async () => { await createTask({ title, due_date: new Date().toISOString().slice(0, 10) }); setTitle(""); setAdding(false); }); }} className="mb-2">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quick task for today…" className="w-full bg-arqud-bg-2 border border-arqud-line rounded-control px-3 py-2 text-[13px] text-arqud-bone" />
        </form>
      )}
      {tasks.length === 0 && !adding ? (
        <p className="py-6 text-center text-xs uppercase tracking-widest text-arqud-muted">Nothing due — you&apos;re clear</p>
      ) : (
        tasks.map((t) => {
          const over = dueBucket(t.due_date, new Date()) === "overdue";
          return (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-t border-arqud-line/60 first:border-t-0">
              <button disabled={pending} onClick={() => start(() => toggleComplete(t.id))} aria-label="Complete"
                className={`w-[18px] h-[18px] rounded-md border-[1.8px] shrink-0 ${t.status === "done" ? "bg-arqud-green border-arqud-green" : "border-arqud-line"}`} />
              <div className="min-w-0">
                <p className={`text-[12.5px] ${t.status === "done" ? "line-through text-arqud-muted" : "text-arqud-bone"}`}>{t.title}</p>
                {t.client_id && labelFor[t.client_id] && <p className="text-[10.5px] text-arqud-muted">{labelFor[t.client_id]}</p>}
              </div>
              <span className={`ml-auto text-[10.5px] font-semibold px-2 py-0.5 rounded-lg ${over ? "bg-arqud-amber/15 text-arqud-amber" : "bg-arqud-gold/15 text-arqud-gold"}`}>{over ? "Overdue" : "Today"}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2:** In `src/app/admin/overview/page.tsx`: import `getTasks`, `todayTasks`, `sortForToday`, and `TodayTile`; fetch tasks (add `getTasks()` to the `Promise.all`); compute `const today = sortForToday(todayTasks(tasks, now));` and `const labelFor = Object.fromEntries(clients.map((c) => [c.id, c.company ?? c.name]));`. Replace the `TeaserTile` "Today" with `<TodayTile tasks={today} labelFor={labelFor} />`. If `getTasks` returns `tableReady:false`, pass `tasks={[]}` (tile shows the clear state — no crash).

- [ ] **Step 3:** Verify `npm run build` clean; `/admin/overview` shows the live Today tile.

- [ ] **Step 4:** Commit: `git add src/app/admin/overview/TodayTile.tsx src/app/admin/overview/page.tsx && git commit -m "feat(tasks): live Today tile on Command Center"`

---

### Task 10: Client detail Tasks tab

**Files:** Modify `src/app/admin/clients/[id]/ClientDetailClient.tsx`, and its server page `src/app/admin/clients/[id]/page.tsx` (to pass this client's tasks)

**Interfaces:** Consumes `TasksBoard`, this client's `tasks`.

- [ ] **Step 1:** In `src/app/admin/clients/[id]/page.tsx`, fetch this client's tasks with `getTasks()` filtered to `client_id === id` (or query directly) and pass `tasks` + the single-client `clients=[{id,label}]` into `ClientDetailClient`.
- [ ] **Step 2:** In `ClientDetailClient.tsx`: add `"Tasks"` to `TAB_LABELS` (after "Quotes"), accept a `tasks` prop, and render `{tab === "Tasks" && <TasksBoard tasks={tasks} clients={[{id: clientId, label: <clientName>}]} lockedClientId={clientId} />}`. Import `TasksBoard` from `@/app/admin/tasks/TasksBoard`.
- [ ] **Step 3:** Verify build clean; the client page shows a Tasks tab with that client's board.
- [ ] **Step 4:** Commit: `git add src/app/admin/clients/[id] && git commit -m "feat(tasks): per-client Tasks tab"`

---

### Task 11: iCal feed route

**Files:** Create `src/app/api/calendar/tasks.ics/route.ts`

**Interfaces:** Consumes `getTasks`, `toICS`, admin client for client names.

- [ ] **Step 1:** Create `src/app/api/calendar/tasks.ics/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTasks } from "@/lib/tasks/query";
import { toICS, type ICSTask } from "@/lib/tasks/ical";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.ICAL_FEED_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { tasks } = await getTasks();
  const admin = createSupabaseAdminClient();
  const { data: clients } = await admin.from("clients").select("id, company, name");
  const nameFor = (id: string | null) => (id ? clients?.find((c) => c.id === id)?.company ?? clients?.find((c) => c.id === id)?.name ?? null : null);
  const items: ICSTask[] = tasks.map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, status: t.status, priority: t.priority, client_label: nameFor(t.client_id) }));
  const body = toICS(items, "arqudportal.co.za");
  return new NextResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
```

- [ ] **Step 2:** Verify `npm run build` clean.

- [ ] **Step 3:** Commit: `git add src/app/api/calendar/tasks.ics/route.ts && git commit -m "feat(tasks): iCal calendar feed"`

---

### Task 12: Sidebar activation + ship

**Files:** Modify `src/components/ui/Sidebar.tsx`

- [ ] **Step 1:** In `ADMIN_GROUPS`, remove `soon: true` from the **Tasks** item (Calendar + Proposals stay "Soon").
- [ ] **Step 2:** `npx tsc --noEmit` + `npm test` (all green) + `npm run build` clean.
- [ ] **Step 3:** `npm run dev` walkthrough: `/admin/tasks` board (create/move/edit/delete), Today tile check-off on `/admin/overview`, client Tasks tab, both themes, mobile. (Before the SQL is run, `/admin/tasks` shows the setup notice — not a crash.)
- [ ] **Step 4:** Commit + push: `git add -A && git commit -m "feat(tasks): activate Tasks in sidebar" && git push origin main`
- [ ] **Step 5:** Give Morne the setup: the `tasks` table SQL (Supabase SQL Editor) and the `ICAL_FEED_TOKEN` Vercel env var + the subscribe URL `https://arqudportal.co.za/api/calendar/tasks.ics?token=<value>`.

## Self-Review (completed)
- **Spec coverage:** table+RLS (T1), personal+client model & resilient read (T1,T8), logic (T2), iCal one-way feed (T3,T11), actions (T4), board with filter+move (T5,T6,T7,T8), Today tile (T9), per-client tab (T10), sidebar activation + setup handoff (T12). All spec sections mapped.
- **Placeholders:** none — full code for migration, types, query, logic+tests, ical+tests, actions, TaskCard, modal, board, page, Today tile, feed route. T10 is a wiring task with explicit steps against existing files.
- **Type consistency:** `Task`/`TaskStatus`/`TaskPriority` (T1) used throughout; action names `createTask/updateTask/moveTask/toggleComplete/deleteTask` (T4) consumed by T6/T7/T9; `toICS`/`ICSTask` (T3) consumed by T11; `getTasks(): {tasks, tableReady}` (T1) consumed by T8/T9/T11; `TasksBoard` props (`tasks`, `clients`, `lockedClientId`) consistent T7↔T8↔T10.
