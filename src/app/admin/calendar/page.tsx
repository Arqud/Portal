import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card } from "@/components/ui";
import { getSetting } from "@/lib/settings/query";
import { parseICS } from "@/lib/calendar/ics";
import { expandOccurrences, type Occurrence } from "@/lib/calendar/expand";
import { getTasks } from "@/lib/tasks/query";
import type { Task } from "@/lib/tasks/types";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

type InvoiceDue = { invoice_number: string; due_date: string; client_id: string };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  await verifySession("admin");
  const params = await searchParams;
  const now = new Date();

  // Month being viewed
  const mMatch = /^(\d{4})-(\d{2})$/.exec(params.m ?? "");
  const year = mMatch ? Number(mMatch[1]) : now.getFullYear();
  const month = mMatch ? Number(mMatch[2]) - 1 : now.getMonth();
  const first = new Date(year, month, 1);

  // Monday-start 42-cell grid
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 42);

  // Selected day (agenda): ?d= if valid, else today when in view, else the 1st
  const dSel = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.d ?? "");
  const selected = dSel
    ? new Date(Number(dSel[1]), Number(dSel[2]) - 1, Number(dSel[3]))
    : now.getFullYear() === year && now.getMonth() === month
      ? now
      : first;
  const selectedKey = key(selected);

  const admin = createSupabaseAdminClient();
  const [{ tasks }, invoicesRes, clientsRes, icsUrl] = await Promise.all([
    getTasks(),
    admin
      .from("invoices")
      .select("invoice_number, due_date, client_id")
      .in("status", ["pending", "overdue"])
      .gte("due_date", key(gridStart))
      .lt("due_date", key(gridEnd)),
    admin.from("clients").select("id, company, name"),
    getSetting("google_calendar_ics_url"),
  ]);
  const invoices = (invoicesRes.data ?? []) as InvoiceDue[];
  const clients = clientsRes.data ?? [];
  const clientLabel = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.company ?? clients.find((c) => c.id === id)?.name ?? null : null;

  // Google events (best-effort; failures degrade to empty + notice)
  let occurrences: Occurrence[] = [];
  let feedError = false;
  if (icsUrl) {
    try {
      const res = await fetch(icsUrl, { next: { revalidate: 900 } });
      if (!res.ok) throw new Error(String(res.status));
      occurrences = expandOccurrences(parseICS(await res.text()), gridStart, gridEnd);
    } catch {
      feedError = true;
    }
  }

  // Index by day
  const evByDay = new Map<string, Occurrence[]>();
  for (const o of occurrences) {
    const k = key(o.start);
    evByDay.set(k, [...(evByDay.get(k) ?? []), o]);
  }
  const tasksByDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.due_date || t.status === "done") continue;
    tasksByDay.set(t.due_date, [...(tasksByDay.get(t.due_date) ?? []), t]);
  }
  const invByDay = new Map<string, InvoiceDue[]>();
  for (const i of invoices) {
    invByDay.set(i.due_date, [...(invByDay.get(i.due_date) ?? []), i]);
  }

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const monthLabel = first.toLocaleString("en-ZA", { month: "long", year: "numeric" });
  const mParam = (y: number, mo: number) => `${y}-${String(mo + 1).padStart(2, "0")}`;
  const prev = mParam(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  const next = mParam(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  const todayKey = key(now);

  const selEvents = evByDay.get(selectedKey) ?? [];
  const selTasks = tasksByDay.get(selectedKey) ?? [];
  const selInv = invByDay.get(selectedKey) ?? [];

  const navBtn = "flex h-9 min-w-9 items-center justify-center rounded-control border border-arqud-line px-2 text-[13px] text-arqud-bone-dim hover:text-arqud-gold transition-colors";

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 sm:py-10 animate-fade-up">
      <PageHeader title="Calendar" count={monthLabel}>
        <Link href={`/admin/calendar?m=${prev}`} className={navBtn} aria-label="Previous month">‹</Link>
        <Link href="/admin/calendar" className={`${navBtn} font-semibold text-arqud-gold`}>Today</Link>
        <Link href={`/admin/calendar?m=${next}`} className={navBtn} aria-label="Next month">›</Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-arqud-muted">
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-[3px] bg-arqud-blue align-middle" />Google Calendar</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-[3px] bg-arqud-gold align-middle" />Tasks due</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-[3px] bg-arqud-amber align-middle" />Invoices due</span>
        {icsUrl && !feedError && <span className="sm:ml-auto">Synced from Google · refreshes every 15 min</span>}
        {feedError && <span className="sm:ml-auto text-arqud-amber">Couldn&apos;t reach your Google feed — check the address in Settings</span>}
        {!icsUrl && (
          <span className="sm:ml-auto">
            <Link href="/admin/settings" className="text-arqud-gold hover:underline">Connect Google Calendar in Settings →</Link>
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Month grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[680px] overflow-hidden rounded-card border border-arqud-line panel-gradient shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-7 border-b border-arqud-line">
              {DOW.map((d) => (
                <span key={d} className="py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-arqud-muted">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const k = key(d);
                const inMonth = d.getMonth() === month;
                const evs = evByDay.get(k) ?? [];
                const tks = tasksByDay.get(k) ?? [];
                const inv = invByDay.get(k) ?? [];
                const chips: { cls: string; label: string }[] = [
                  ...evs.map((e) => ({ cls: "bg-arqud-blue/12 text-arqud-blue", label: e.allDay ? e.summary : `${hhmm(e.start)} ${e.summary}` })),
                  ...tks.map((t) => ({ cls: "bg-arqud-gold/15 text-arqud-gold font-semibold", label: t.title })),
                  ...inv.map((x) => ({ cls: "bg-arqud-amber/15 text-arqud-amber font-semibold", label: `${x.invoice_number} due` })),
                ];
                const extra = chips.length - 3;
                return (
                  <Link
                    key={i}
                    href={`/admin/calendar?m=${mParam(year, month)}&d=${k}`}
                    className={`min-h-[96px] border-b border-r border-arqud-line/50 p-1.5 transition-colors hover:bg-arqud-gold/[0.03] ${k === selectedKey ? "bg-arqud-gold/[0.05]" : ""}`}
                  >
                    <span
                      className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-semibold ${
                        k === todayKey ? "bg-gradient-to-br from-arqud-gold to-arqud-gold-soft text-arqud-bg" : inMonth ? "text-arqud-bone-dim" : "text-arqud-muted/40"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {chips.slice(0, 3).map((c, j) => (
                      <span key={j} className={`mb-0.5 block truncate rounded-md px-1.5 py-0.5 text-[9px] ${c.cls}`}>{c.label}</span>
                    ))}
                    {extra > 0 && <span className="pl-1 text-[9px] text-arqud-muted">+{extra} more</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Day agenda */}
        <Card title={selected.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}>
          <p className="-mt-1 mb-3 text-[11px] text-arqud-muted">
            {selEvents.length} event{selEvents.length === 1 ? "" : "s"} · {selTasks.length} task{selTasks.length === 1 ? "" : "s"} due
            {selInv.length > 0 ? ` · ${selInv.length} invoice${selInv.length === 1 ? "" : "s"} due` : ""}
          </p>
          {selEvents.length === 0 && selTasks.length === 0 && selInv.length === 0 ? (
            <p className="py-8 text-center text-xs uppercase tracking-widest text-arqud-muted">Nothing scheduled</p>
          ) : (
            <div>
              {selEvents.map((e, i) => (
                <div key={`e${i}`} className="flex gap-3 border-t border-arqud-line/60 py-2.5 first:border-t-0">
                  <span className="w-1 shrink-0 rounded-full bg-arqud-blue" />
                  <span className="w-[86px] shrink-0 pt-0.5 text-[10.5px] text-arqud-muted">{e.allDay ? "All day" : `${hhmm(e.start)}–${hhmm(e.end)}`}</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-arqud-bone">{e.summary}</p>
                    <p className="text-[10px] text-arqud-muted">Google Calendar</p>
                  </div>
                </div>
              ))}
              {selTasks.map((t) => (
                <div key={t.id} className="flex gap-3 border-t border-arqud-line/60 py-2.5 first:border-t-0">
                  <span className="w-1 shrink-0 rounded-full bg-arqud-gold" />
                  <span className="w-[86px] shrink-0 pt-0.5 text-[10.5px] text-arqud-muted">—</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-arqud-bone">{t.title}</p>
                    <p className="text-[10px] text-arqud-muted">Task{clientLabel(t.client_id) ? ` · ${clientLabel(t.client_id)}` : ""} · {t.priority}</p>
                  </div>
                </div>
              ))}
              {selInv.map((x) => (
                <div key={x.invoice_number} className="flex gap-3 border-t border-arqud-line/60 py-2.5 first:border-t-0">
                  <span className="w-1 shrink-0 rounded-full bg-arqud-amber" />
                  <span className="w-[86px] shrink-0 pt-0.5 text-[10.5px] text-arqud-muted">—</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-arqud-bone">{x.invoice_number} payment due</p>
                    <p className="text-[10px] text-arqud-muted">Invoice{clientLabel(x.client_id) ? ` · ${clientLabel(x.client_id)}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
